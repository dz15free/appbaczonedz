// مدير غرفة الصوت — Cloudflare Realtime SFU + تنسيق عبر RTDB
import { ref, onValue, set, remove, update, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { newSession, pushTracks, renegotiate } from "@/lib/realtime/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VoiceParticipant {
  uid: string;
  name: string;
  sessionId?: string;
  trackName?: string;
  muted?: boolean;
  kicked?: boolean;
}

const STUN = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] };

export class VoiceManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private sessionId = "";
  /* 🐛 كان `Set<string>` من الـuid وحده. ومن غادر ثمّ عاد يحمل
     **sessionId جديداً** بينما uid ما زال في المجموعة — فلا يُشترك
     فيه أحد ثانيةً و**لا يسمعه أحد إلى نهاية الحصّة**. المفتاح الآن
     هو الجلسة لا الشخص، فالعودة اشتراكٌ جديد كما يجب. */
  private subscribed = new Map<string, string>(); // uid → sessionId
  private midToUid = new Map<string, string>();
  private remoteStreams = new Map<string, MediaStream>();
  private chain: Promise<void> = Promise.resolve();
  private unsub?: () => void;

  onRemoteStream?: (uid: string, stream: MediaStream) => void;
  onParticipants?: (list: VoiceParticipant[]) => void;
  onMyMuteChange?: (muted: boolean) => void;
  onLeave?: () => void;
  onConnectionLost?: (state: string) => void;

  constructor(
    private roomId: string,
    private uid: string,
    private name: string,
    private isOwner: boolean
  ) {}

  private voicePath() {
    return `roomLive/${this.roomId}/voice`;
  }

  async join() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.sessionId = await newSession();

    this.pc = new RTCPeerConnection(STUN);
    /* 🐛 لم يكن أحد يراقب حالة الاتصال. فإن سقط ICE — وهو شائع على
       شبكات الجوّال الجزائرية خلف NAT — يموت الصوت بلا أيّ أثر:
       الأسماء باقية في القائمة والمؤشّرات ساكنة، والمستخدم يحسب أنّ
       الجميع صامتون. الآن يُبلَّغ الأعلى فيقرّر ما يعرضه. */
    this.pc.onconnectionstatechange = () => {
      const st = this.pc?.connectionState;
      if (st === "failed" || st === "disconnected") {
        this.onConnectionLost?.(st);
      }
    };
    this.pc.ontrack = (e) => {
      const mid = e.transceiver?.mid ?? "";
      const uid = this.midToUid.get(mid);
      if (!uid) return;
      let stream = this.remoteStreams.get(uid);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(uid, stream);
      }
      stream.addTrack(e.track);
      this.onRemoteStream?.(uid, stream);
    };

    // نشر الميكروفون (sendonly)
    const track = this.localStream.getAudioTracks()[0];
    const tr = this.pc.addTransceiver(track, { direction: "sendonly" });
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    const trackName = `mic-${this.uid}`;
    const res = await pushTracks(this.sessionId, {
      sessionDescription: { type: "offer", sdp: offer.sdp },
      tracks: [{ location: "local", mid: tr.mid, trackName }],
    });
    await this.pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));

    // افتراضياً: مايك المالك مفتوح، والمنضمّون بلا إذن حتى يمنحه
    const initialMuted = !this.isOwner;
    this.ownerMuted = initialMuted;
    this.applyMicState();

    // أعلن وجودي في RTDB + حذف تلقائي عند قطع الاتصال
    const myRef = ref(rtdb, `${this.voicePath()}/${this.uid}`);
    /* التسجيل قبل الإعلان لا بعده: بينهما نافذة إن انقطع فيها الاتصال
       بقي المستخدم معروضاً في الغرفة إلى الأبد — «شبحٌ» يظنّه الأستاذ
       حاضراً وينتظر صوته. */
    await onDisconnect(myRef).remove();
    await set(myRef, { name: this.name, sessionId: this.sessionId, trackName, muted: initialMuted });

    // راقب المشاركين واشترك في الجدد
    this.unsub = onValue(ref(rtdb, this.voicePath()), (snap) => {
      const val = (snap.val() as Record<string, VoiceParticipant>) ?? {};
      const list = Object.entries(val).map(([id, v]) => ({ ...v, uid: id }));
      this.onParticipants?.(list);

      const me = val[this.uid];
      if (me?.kicked) {
        this.leave();
        return;
      }
      // حالة الكتم يتحكّم بها المالك (وتُطبَّق فوراً على ميكروفوني)
      if (me) {
        this.ownerMuted = !!me.muted;
        this.applyMicState();
        this.onMyMuteChange?.(this.ownerMuted);
      }

      for (const p of list) {
        if (p.uid === this.uid || !p.sessionId || !p.trackName) continue;
        if (this.subscribed.get(p.uid) === p.sessionId) continue;
        this.subscribed.set(p.uid, p.sessionId);
        this.remoteStreams.delete(p.uid);  // الجلسة الجديدة مسارٌ جديد
        this.subscribeTo(p);
      }

      /* من غادر يُنسى، فلا يمنع اسمُه اشتراكاً لاحقاً */
      const present = new Set(list.map((p) => p.uid));
      for (const uid of Array.from(this.subscribed.keys())) {
        if (!present.has(uid)) this.subscribed.delete(uid);
      }
    });
  }

  private subscribeTo(p: VoiceParticipant) {
    this.chain = this.chain
      .then(async () => {
        if (!this.pc) return;
        const res = await pushTracks(this.sessionId, {
          tracks: [{ location: "remote", sessionId: p.sessionId, trackName: p.trackName }],
        });
        if (Array.isArray(res.tracks)) {
          for (const t of res.tracks) if (t.mid) this.midToUid.set(t.mid, p.uid);
        }
        if (res.requiresImmediateRenegotiation && res.sessionDescription) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await renegotiate(this.sessionId, { type: "answer", sdp: answer.sdp });
        }
      })
      .catch((e) => console.error("[BacZone voice] خطأ الاشتراك:", e));
  }

  getLocalStream() {
    return this.localStream;
  }

  // أوامر المالك
  ownerToggleMute(uid: string, muted: boolean) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), { muted });
  }
  ownerKick(uid: string) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), { kicked: true });
  }

  /* ════════════════════════════════════════════════════════
     الكتم الذاتي — ولماذا لم يعد يُكتب في RTDB

     🐛 مصيدة كاملة: `selfMute` كانت تكتب `muted: true` في العقدة
     نفسها التي يتحكّم بها المالك. والواجهة تُعطّل زرّ الطالب حين
     `muted` (لأنّ الفتح بيد المعلّم). فمن أغلق ميكروفونه لحظةً
     **لم يستطع فتحه أبداً** — ولا المعلّم يدري أنّه يحتاج إذناً،
     لأنّه أعطاه الإذن أصلاً.

     الآن حقلان لا حقل: `muted` في RTDB هو **الإذن** ويملكه المالك
     وحده، و`selfOff` محلّي في الجهاز يملكه صاحبه. والميكروفون يعمل
     إذا اجتمع الاثنان. فيغلق الطالب ميكروفونه ويفتحه متى شاء ما دام
     الإذن قائماً، ويبقى الإذن بيد المعلّم كما صُمّم.
     ════════════════════════════════════════════════════════ */
  private selfOff = false;
  private ownerMuted = false;

  /** يغلق الطالب ميكروفونه أو يفتحه — محلّياً، بلا مساس بإذن المعلّم */
  setSelfOff(off: boolean) {
    this.selfOff = off;
    this.applyMicState();
  }
  isSelfOff() { return this.selfOff; }

  private applyMicState() {
    const on = !this.ownerMuted && !this.selfOff;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
  }

  async leave() {
    this.unsub?.();
    try {
      await remove(ref(rtdb, `${this.voicePath()}/${this.uid}`));
    } catch {}
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStreams.clear();
    this.subscribed.clear();
    this.onLeave?.();
  }
}

/* ════════════════════════════════════════════════════════════
   مراقب مستوى الصوت — سياق صوتيّ واحد للصفحة كلّها

   🐛 عطبان في النسخة السابقة:

   ١) `new AudioContext()` لكل متحدّث. وSafari يحدّ عدد السياقات
      المتزامنة (أربعة تقريباً) ثمّ **يرمي**. فمع خمسة مشاركين ينهار
      المؤشّر — وقد يُسقط معه الانضمام كلّه لأنّ النداء داخل `join`.

   ٢) السياق يُنشأ في حالة `suspended` على iOS حتى تُستأنف داخل
      إيماءة مستخدم. ولم تكن `resume()` تُنادى إطلاقاً، فما عمل
      مؤشّر «يتحدّث الآن» على iPhone يوماً: أسماء ساكنة بلا أيّ دليل
      على أنّ الصوت حيّ.

   سياق واحد مشترك، يُستأنف عند أوّل استعمال (والانضمام إيماءة
   مستخدم فينجح)، ولا يُغلق ما دام أحدٌ يستعمله.
   ════════════════════════════════════════════════════════════ */
let sharedCtx: AudioContext | null = null;
let ctxUsers = 0;

function getSharedCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AC();
  /* الاستئناف لا يضرّ إن كان يعمل، ويُنقذ iOS إن كان معلّقاً */
  if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

export function monitorLevel(stream: MediaStream, cb: (speaking: boolean) => void): () => void {
  const ctx = getSharedCtx();
  if (!ctx) return () => {};
  ctxUsers++;

  let src: MediaStreamAudioSourceNode;
  try {
    src = ctx.createMediaStreamSource(stream);
  } catch {
    /* مسار بلا صوت أو سياق معطوب: المؤشّر زينة، وسقوطه لا يجوز أن
       يُسقط الانضمام. */
    ctxUsers--;
    return () => {};
  }

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let last = false;
  const tick = () => {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const speaking = sum / data.length > 12;
    if (speaking !== last) {
      last = speaking;
      cb(speaking);
    }
    raf = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    try { src.disconnect(); analyser.disconnect(); } catch { /* ignore */ }
    ctxUsers--;
    /* لا نُغلق ما دام غيرنا يستعمله — والإغلاق المبكّر كان يُصمت
       بقيّة المؤشّرات في الصفحة. */
    if (ctxUsers <= 0) {
      ctxUsers = 0;
      sharedCtx?.close().catch(() => {});
      sharedCtx = null;
    }
  };
}
