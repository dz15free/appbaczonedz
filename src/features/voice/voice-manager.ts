// مدير غرفة الصوت — Cloudflare Realtime SFU + تنسيق عبر RTDB
import { ref, onValue, set, remove, update, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { newSession, pushTracks, renegotiate } from "@/lib/realtime/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VoiceParticipant {
  uid: string;
  name: string;
  /** يُنشران فقط حين يبدأ فعلاً بالبثّ — المستمع بلا مسار */
  sessionId?: string;
  trackName?: string;
  /** الإذن — يملكه صاحب الغرفة وحده */
  allowed?: boolean;
  /** المفتاح — يملكه صاحب الجهاز: هل يبثّ الآن فعلاً */
  micOn?: boolean;
  kicked?: boolean;
}

const STUN = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] };

/* ════════════════════════════════════════════════════════════
   الصوت — الاستماع فعلٌ، والتحدّث فعلٌ آخر

   🐛 كان الفعلان زرّاً واحداً: `join()` تنادي `getUserMedia` فوراً،
   ثمّ تنشر مساراً وتكتمه. والنتائج كلّها سيّئة:

     • من أراد أن **يسمع** الدرس طُلب منه إذن الميكروفون.
     • من رفض الإذن — أو كان في مكان عامّ — لم يسمع الدرس إطلاقاً.
     • من دخل والأستاذ يتكلّم لم يسمع شيئاً حتى يضغط زرّاً لا يعرف
       أنّ عليه ضغطه.
     • وكل مستمع يدفع ثمن اتصال ثنائي الاتجاه بلا أن يبثّ حرفاً.

   الفصل الآن قاطع:

     join()        استماع فقط. لا `getUserMedia`، ولا مسار منشور،
                   ولا إذن من المتصفّح. يسمع فور دخوله.

     enableMic()   التحدّث. هنا وحده يُطلب إذن الميكروفون، وهنا
                   وحده يُنشر مسار.

   والصلاحية حالتان مستقلّتان، والميكروفون يعمل باجتماعهما:

     allowed   الإذن  — يملكه صاحب الغرفة   (RTDB)
     micOn     المفتاح — يملكه صاحب الجهاز  (قراره)

   وهذا ما يجعل «الطالب يفتح ويغلق ميكروفونه» و«المالك يتحكّم في
   ميكروفونات المنضمّين» مطلبين متوافقين لا متناقضين: لكلٍّ حالته،
   ولا يكتب أحدهما فوق الآخر.
   ════════════════════════════════════════════════════════════ */

export class VoiceManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private sender: RTCRtpSender | null = null;
  private sessionId = "";
  private trackName = "";
  private published = false;
  private subscribed = new Map<string, string>(); // uid → sessionId
  private midToUid = new Map<string, string>();
  private remoteStreams = new Map<string, MediaStream>();
  /* كل تفاوض يمرّ من هنا. التفاوضان المتزامنان (نشر الميكروفون بينما
     يشترك في وافد جديد) يُنتجان حالة «glare» تُسقط الاتصال كلّه. */
  private chain: Promise<void> = Promise.resolve();
  private unsub?: () => void;

  private allowed = false;   // إذن المالك
  private micOn = false;     // مفتاح صاحب الجهاز
  private voiceOpen = false; // «اسمح للجميع بالكلام»

  onRemoteStream?: (uid: string, stream: MediaStream) => void;
  onParticipants?: (list: VoiceParticipant[]) => void;
  onPermissionChange?: (allowed: boolean) => void;
  onMicChange?: (on: boolean) => void;
  onLeave?: () => void;
  onConnectionLost?: (state: string) => void;

  constructor(
    private roomId: string,
    private uid: string,
    private name: string,
    private isOwner: boolean
  ) {}

  private voicePath() { return `roomLive/${this.roomId}/voice`; }
  private myPath() { return `${this.voicePath()}/${this.uid}`; }

  /** هل يجوز لهذا الشخص أن يتكلّم الآن؟ */
  canSpeak() { return this.isOwner || this.allowed || this.voiceOpen; }
  isMicOn() { return this.micOn; }

  /* ════════════════════════════════════════════════════════
     الدخول — استماعٌ فقط

     لا `getUserMedia` هنا إطلاقاً. الطالب يصير مستمعاً في جلسة
     SFU يسحب مسارات الآخرين ولا يدفع مساراً. فيسمع الأستاذ في
     الثانية التي يدخل فيها، بلا زرّ ولا إذن ولا سؤال.
     ════════════════════════════════════════════════════════ */
  async join() {
    this.sessionId = await newSession();
    this.pc = new RTCPeerConnection(STUN);

    this.pc.onconnectionstatechange = () => {
      const st = this.pc?.connectionState;
      if (st === "failed" || st === "disconnected") this.onConnectionLost?.(st);
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

    const myRef = ref(rtdb, this.myPath());
    /* التسجيل قبل الإعلان: بينهما نافذة إن انقطع فيها الاتصال بقي
       المستخدم «شبحاً» في القائمة إلى الأبد. */
    await onDisconnect(myRef).remove();
    /* المالك يدخل بإذنٍ لنفسه — لا معنى لأن يستأذن نفسه.
       والمنضمّ يدخل مستمعاً: بلا `sessionId` ولا `trackName`، وهو ما
       يميّز المستمع من المتحدّث في العقدة نفسها. */
    await set(myRef, { name: this.name, allowed: this.isOwner, micOn: false });

    this.unsub = onValue(ref(rtdb, this.voicePath()), (snap) => {
      const val = (snap.val() as Record<string, VoiceParticipant>) ?? {};
      const list = Object.entries(val).map(([id, v]) => ({ ...v, uid: id }));
      this.onParticipants?.(list);

      const me = val[this.uid];
      if (me?.kicked) { void this.leave(); return; }

      /* سحب الإذن يُغلق الميكروفون فوراً — ولا ينتظر موافقة صاحبه.
         وهذا هو معنى «المالك يتحكّم»: قراره نافذ لا اقتراح. */
      const nowAllowed = this.isOwner || !!me?.allowed;
      if (nowAllowed !== this.allowed) {
        this.allowed = nowAllowed;
        this.onPermissionChange?.(nowAllowed);
        if (!nowAllowed && this.micOn) void this.disableMic();
      }

      for (const p of list) {
        if (p.uid === this.uid) continue;
        /* المستمعون بلا مسار — ولا نشترك في صامت. ولا نشترك فيمن لا
           إذن له: العميل يطبّق الصلاحية عند الاستقبال أيضاً، فلا
           يكفي عميلاً معدَّلاً أن يبثّ ليُسمَع. */
        if (!p.sessionId || !p.trackName) continue;
        if (!(p.allowed || this.voiceOpen || p.uid === this.ownerUid)) continue;
        if (this.subscribed.get(p.uid) === p.sessionId) continue;
        this.subscribed.set(p.uid, p.sessionId);
        this.remoteStreams.delete(p.uid);   // جلسة جديدة ⇒ مسار جديد
        this.subscribeTo(p);
      }

      const present = new Set(list.map((p) => p.uid));
      for (const uid of Array.from(this.subscribed.keys())) {
        if (!present.has(uid)) this.subscribed.delete(uid);
      }
    });
  }

  /** uid صاحب الغرفة — يُضبط من الأعلى ليُسمع دائماً */
  ownerUid = "";

  /** «اسمح للجميع بالكلام» — يُمرَّر من الأعلى عند تغيّره */
  setVoiceOpen(open: boolean) {
    const was = this.canSpeak();
    this.voiceOpen = open;
    if (was !== this.canSpeak()) this.onPermissionChange?.(this.canSpeak());
    if (!this.canSpeak() && this.micOn) void this.disableMic();
  }

  /* ════════════════════════════════════════════════════════
     فتح الميكروفون — هنا وحده يُطلب إذن المتصفّح

     ⚠️ حدٌّ لا يتجاوزه أيّ كود: **لا يستطيع موقعٌ تشغيل ميكروفون
     مستخدمٍ لم يمنح متصفّحه الإذن.** فحين يمنح الأستاذ الكلمة لطالب
     لم يسبق أن سمح للموقع، لا يُفتح شيء من نفسه — تلزم ضغطة واحدة
     منه. ولذلك تُطلب الأذونات عند **رفع اليد**: الطالب حينها متطوّع
     للكلام فالطلب متوقّع، ويصير الفتح فورياً حين يأذن الأستاذ.
     ════════════════════════════════════════════════════════ */
  async enableMic(): Promise<"ok" | "denied" | "forbidden"> {
    if (!this.canSpeak()) return "forbidden";
    if (!this.pc) return "forbidden";

    try {
      if (!this.localStream || this.localStream.getAudioTracks().length === 0) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      }
    } catch {
      return "denied";
    }

    const track = this.localStream.getAudioTracks()[0];
    if (!track) return "denied";
    track.enabled = true;

    if (this.published && this.sender) {
      /* المسار منشور من قبل: استبدالٌ بلا تفاوض. التفاوض في كل مرّة
         يُحدث انقطاعاً مسموعاً عند الجميع لأجل ضغطة زرّ. */
      await this.sender.replaceTrack(track);
    } else {
      await this.negotiatePublish(track);
    }

    this.micOn = true;
    this.onMicChange?.(true);
    await update(ref(rtdb, this.myPath()), {
      micOn: true,
      sessionId: this.sessionId,
      trackName: this.trackName,
    });
    return "ok";
  }

  private negotiatePublish(track: MediaStreamTrack) {
    this.chain = this.chain.then(async () => {
      if (!this.pc) return;
      const tr = this.pc.addTransceiver(track, { direction: "sendonly" });
      this.sender = tr.sender;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.trackName = `mic-${this.uid}-${Date.now()}`;
      const res = await pushTracks(this.sessionId, {
        sessionDescription: { type: "offer", sdp: offer.sdp },
        tracks: [{ location: "local", mid: tr.mid, trackName: this.trackName }],
      });
      await this.pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
      this.published = true;
    }).catch((e) => console.error("[BacZone voice] فشل نشر الميكروفون:", e));
    return this.chain;
  }

  /** يغلق الطالب ميكروفونه — ويُطفئ مؤشّر النظام معه */
  async disableMic() {
    this.micOn = false;
    this.onMicChange?.(false);
    try { await this.sender?.replaceTrack(null); } catch { /* ignore */ }
    /* إيقاف المسار لا تعطيله: `enabled = false` يُبقي ضوء الميكروفون
       مضاءً في شريط النظام، فيظنّ الطالب أنّنا نسمعه ونحن لا نسمع.
       الثقة أهمّ من تفادي `getUserMedia` ثانيةً. */
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    await update(ref(rtdb, this.myPath()), { micOn: false });
  }

  // ── أوامر المالك ──
  /** يمنح الإذن أو يسحبه. السحب يُغلق ميكروفون صاحبه فوراً عنده. */
  setAllowed(uid: string, allowed: boolean) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), allowed ? { allowed: true } : { allowed: false, micOn: false });
  }
  ownerKick(uid: string) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), { kicked: true });
  }

  getLocalStream() { return this.localStream; }

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

  async leave() {
    this.unsub?.();
    try { await remove(ref(rtdb, this.myPath())); } catch { /* ignore */ }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.sender = null;
    this.published = false;
    this.micOn = false;
    this.remoteStreams.clear();
    this.subscribed.clear();
    this.midToUid.clear();
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
