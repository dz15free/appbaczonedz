// مدير غرفة الصوت — Cloudflare Realtime SFU + تنسيق عبر RTDB
import {
  ref, onValue, update, onDisconnect, runTransaction, type DatabaseReference,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { newSession, pushTracks, renegotiate, getIceServers, RealtimeError } from "@/lib/realtime/client";


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
  /** معرّف هذا الاتصال تحديداً — يمنع نسخةً قديمة من مسح حضور نسخة أحدث */
  cid?: string;
}

/** نتيجة محاولة فتح الميكروفون — كل حالة لها رسالة مختلفة في الواجهة */
export type MicResult =
  | "ok"
  | "forbidden"    // لا إذن من صاحب الغرفة
  | "denied"       // المتصفّح رفض الإذن
  | "unsupported"  // متصفّح داخلي (فيسبوك/إنستغرام) أو صفحة غير آمنة
  | "no-device"    // لا ميكروفون في الجهاز
  | "busy"         // تطبيق آخر يستعمل الميكروفون
  | "network";     // تعذّر الوصول إلى خادم الصوت

/* ════════════════════════════════════════════════════════════
   v7 — لماذا كان الميكروفون «لا يعمل»

   الصوت كان ينهار بصمت في خمسة مواضع متسلسلة، يكفي أيٌّ منها:

   ١) **الإعلان قبل الجاهزية.** يكتب المتحدّث `trackName` في القاعدة
      فور ردّ Cloudflare، قبل أن يكتمل اتصاله بالخادم. فيطلب
      المستمعون مساراً لم يصل بعد ⇒ يفشل الطلب.

   ٢) **لا إعادة محاولة.** كان المستمع يُعلِّم المتحدّث «مشتركاً» *قبل*
      الطلب. ففشلٌ واحد (وهو مضمون بسبب ١) = صمتٌ دائم حتى إعادة
      تحميل الصفحة.

   ٣) **أخطاء مبتلعة.** فشل النشر يُكتب في `console` ثمّ يُكمل الكود:
      الزرّ أخضر و«الميكروفون مفتوح» ولا أحد يسمع. ثمّ إنّ Cloudflare
      يُرجع أخطاء المسارات **بحالة 200** داخل الجسم، ولم تكن تُفحص.

   ٤) **انقطاع الشبكة يمحو الحضور.** `onDisconnect().remove()` يعمل عند
      أوّل تذبذب في شبكة الهاتف، ولا شيء يُعيد كتابة الحضور بعد عودة
      الاتصال ⇒ المتحدّث يختفي من القاعدة فلا يسمعه من يدخل بعده.

   ٥) **عقدة تفاوض عالقة.** إن فشل تفاوضٌ في منتصفه بقي الاتصال في
      حالة `have-remote-offer`، فتفشل كل محاولة بعده إلى الأبد.

   وكلّها مُعالَجة أدناه بالترتيب نفسه.
   ════════════════════════════════════════════════════════════ */

const FALLBACK_ICE: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];
const RETRY_DELAYS = [800, 1600, 3200, 6000, 10000, 15000];
const CONNECT_TIMEOUT = 12000;

function newCid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export class VoiceManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private sender: RTCRtpSender | null = null;
  private sessionId = "";
  private trackName = "";
  private published = false;
  private destroyed = false;
  private readonly cid = newCid();

  /** uid → «sessionId/trackName» — يُكتب **بعد** نجاح الاشتراك فقط */
  private subscribed = new Map<string, string>();
  private pending = new Set<string>();
  private retries = new Map<string, number>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private midToUid = new Map<string, string>();
  /** مسارات وصلت قبل أن نعرف صاحبها — تُسلَّم حين يُعرف */
  private orphanTracks = new Map<string, MediaStreamTrack>();
  private remoteStreams = new Map<string, MediaStream>();

  /* كل تفاوض يمرّ من هنا. التفاوضان المتزامنان (نشر الميكروفون بينما
     يشترك في وافد جديد) يُنتجان حالة «glare» تُسقط الاتصال كلّه. */
  private chain: Promise<void> = Promise.resolve();
  private unsubVoice?: () => void;
  private unsubConn?: () => void;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  private lastSnapshot: Record<string, VoiceParticipant> = {};

  private allowed = false;   // إذن المالك
  private micOn = false;     // مفتاح صاحب الجهاز
  private voiceOpen = false; // «اسمح للجميع بالكلام»
  private _ownerUid = "";

  onRemoteStream?: (uid: string, stream: MediaStream) => void;
  onRemoteGone?: (uid: string) => void;
  onParticipants?: (list: VoiceParticipant[]) => void;
  onPermissionChange?: (allowed: boolean) => void;
  onMicChange?: (on: boolean) => void;
  onLeave?: () => void;
  onConnectionLost?: (state: string) => void;
  onConnected?: () => void;

  constructor(
    private roomId: string,
    private uid: string,
    private name: string,
    private isOwner: boolean,
  ) {}

  private voicePath() { return `roomLive/${this.roomId}/voice`; }
  private myRef(): DatabaseReference { return ref(rtdb, `${this.voicePath()}/${this.uid}`); }

  /** هل يجوز لهذا الشخص أن يتكلّم الآن؟ */
  canSpeak() { return this.isOwner || this.allowed || this.voiceOpen; }
  isMicOn() { return this.micOn; }
  getLocalStream() { return this.localStream; }

  /** صاحب الغرفة يُسمع دائماً. تغييره يُعيد فحص الاشتراكات فوراً —
      كان يُضبط فقط ولا يُعاد الفحص حتى أوّل تغيير في القاعدة. */
  set ownerUid(v: string) {
    if (v === this._ownerUid) return;
    this._ownerUid = v;
    this.reconcile();
  }
  get ownerUid() { return this._ownerUid; }

  /* ════════════════════════════════════════════════════════
     الدخول — استماعٌ فقط، بلا `getUserMedia` ولا إذن متصفّح
     ════════════════════════════════════════════════════════ */
  async join() {
    this.sessionId = await newSession();
    if (this.destroyed) return;

    const iceServers = await getIceServers().catch(() => FALLBACK_ICE);
    if (this.destroyed) return;

    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });

    this.pc.onconnectionstatechange = () => {
      const st = this.pc?.connectionState;
      if (st === "connected") {
        if (this.disconnectTimer) { clearTimeout(this.disconnectTimer); this.disconnectTimer = undefined; }
        this.onConnected?.();
      } else if (st === "failed") {
        this.onConnectionLost?.(st);
      } else if (st === "disconnected") {
        /* «disconnected» عابرٌ غالباً على شبكة الهاتف ويعود من نفسه.
           نُبلغ فقط إن دام: إعلان الانقطاع عند كل تذبذب يُزعج بلا فائدة. */
        if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
        this.disconnectTimer = setTimeout(() => {
          if (this.pc?.connectionState === "disconnected") this.onConnectionLost?.("disconnected");
        }, 6000);
      }
    };

    this.pc.ontrack = (e) => {
      const mid = e.transceiver?.mid ?? "";
      const uid = this.midToUid.get(mid);
      if (!uid) { if (mid) this.orphanTracks.set(mid, e.track); return; }
      this.deliverTrack(uid, e.track);
    };

    await this.writePresence();
    if (this.destroyed) return;

    /* ── (٤) عودة الاتصال تُعيد الحضور ──
       `.info/connected` يتحوّل إلى true عند كل اتصال (الأوّل وكل عودة).
       نُعيد عندها تسجيل `onDisconnect` وكتابة الحضور كاملاً — بما فيه
       مسار البثّ إن كان الميكروفون مفتوحاً — فلا يختفي المتحدّث بعد
       تذبذب الشبكة. */
    let first = true;
    this.unsubConn = onValue(ref(rtdb, ".info/connected"), (snap) => {
      if (snap.val() !== true) return;
      if (first) { first = false; return; }      // الأوّل كُتب للتوّ أعلاه
      void this.writePresence().catch(() => {});
    });

    this.unsubVoice = onValue(ref(rtdb, this.voicePath()), (snap) => {
      const val = (snap.val() as Record<string, VoiceParticipant>) ?? {};
      this.lastSnapshot = val;
      const list = Object.entries(val).map(([id, v]) => ({ ...v, uid: id }));
      this.onParticipants?.(list);

      const me = val[this.uid];
      if (me?.kicked) { void this.leave(); return; }

      /* سحب الإذن يُغلق الميكروفون فوراً — ولا ينتظر موافقة صاحبه. */
      const nowAllowed = this.isOwner || !!me?.allowed;
      if (nowAllowed !== this.allowed) {
        const before = this.canSpeak();
        this.allowed = nowAllowed;
        if (before !== this.canSpeak()) this.onPermissionChange?.(this.canSpeak());
        if (!this.canSpeak() && this.micOn) void this.disableMic();
      }

      this.reconcile();
    });
  }

  /** الحضور كاملاً. لا يكتب `allowed` لغير المالك: القاعدة تحصر تغييره
      في المالك والمشرفين، وغيابه يعني «لا إذن» كما تعنيه `false`. */
  private async writePresence() {
    const myRef = this.myRef();
    /* التسجيل قبل الإعلان: بينهما نافذة إن انقطع فيها الاتصال بقي
       المستخدم «شبحاً» في القائمة إلى الأبد. */
    await onDisconnect(myRef).remove();
    const presence: Record<string, unknown> = { name: this.name, micOn: this.micOn, cid: this.cid };
    if (this.isOwner) presence.allowed = true;
    if (this.published && this.trackName) {
      presence.sessionId = this.sessionId;
      presence.trackName = this.trackName;
    }
    /* `update` لا `set`: إن منحه المالك الإذن قبل أن يكتمل دخوله فإنّ
       `set` كانت ستمحو `allowed: true` التي كتبها المالك. */
    await update(myRef, presence);
  }

  /** «اسمح للجميع بالكلام» — يُمرَّر من الأعلى عند تغيّره */
  setVoiceOpen(open: boolean) {
    if (open === this.voiceOpen) return;
    const was = this.canSpeak();
    this.voiceOpen = open;
    if (was !== this.canSpeak()) this.onPermissionChange?.(this.canSpeak());
    if (!this.canSpeak() && this.micOn) void this.disableMic();
    this.reconcile();
  }

  /* ════════════════════════════════════════════════════════
     المطابقة: من يجب أن أسمعه الآن؟
     تُستدعى عند كل تغيّر في القاعدة أو في الإذن أو بعد فشلٍ مؤجَّل.
     ════════════════════════════════════════════════════════ */
  private reconcile() {
    if (!this.pc || this.destroyed) return;
    const val = this.lastSnapshot;

    for (const [uid, p] of Object.entries(val)) {
      if (uid === this.uid) continue;
      if (!p.sessionId || !p.trackName) continue;
      /* لا نشترك فيمن لا إذن له: العميل يطبّق الصلاحية عند الاستقبال
         أيضاً، فلا يكفي عميلاً معدَّلاً أن يبثّ ليُسمَع. */
      if (!(p.allowed || this.voiceOpen || uid === this._ownerUid)) continue;
      const key = `${p.sessionId}/${p.trackName}`;
      if (this.subscribed.get(uid) === key) continue;
      if (this.pending.has(uid) || this.retryTimers.has(uid)) continue;
      if (this.subscribed.has(uid)) this.dropRemote(uid);   // جلسة جديدة ⇒ مسار جديد
      this.subscribeTo(uid, { ...p, uid }, key);
    }

    for (const uid of Array.from(this.subscribed.keys())) {
      if (!val[uid]?.sessionId) this.dropRemote(uid);
    }
  }

  private dropRemote(uid: string) {
    this.subscribed.delete(uid);
    this.retries.delete(uid);
    const t = this.retryTimers.get(uid);
    if (t) { clearTimeout(t); this.retryTimers.delete(uid); }
    if (this.remoteStreams.delete(uid)) this.onRemoteGone?.(uid);
  }

  private deliverTrack(uid: string, track: MediaStreamTrack) {
    let stream = this.remoteStreams.get(uid);
    if (!stream) {
      stream = new MediaStream();
      this.remoteStreams.set(uid, stream);
    }
    if (!stream.getTracks().includes(track)) stream.addTrack(track);
    this.onRemoteStream?.(uid, stream);
  }

  /* ── (٥) أيّ تفاوض فشل في منتصفه يُعاد إلى الحالة المستقرّة ── */
  private async rollback() {
    const pc = this.pc;
    if (!pc || pc.signalingState === "stable" || pc.signalingState === "closed") return;
    try { await pc.setLocalDescription({ type: "rollback" }); } catch { /* ignore */ }
  }

  private subscribeTo(uid: string, p: VoiceParticipant, key: string) {
    this.pending.add(uid);
    this.chain = this.chain
      .then(async () => {
        const pc = this.pc;
        if (!pc || this.destroyed) return;
        const res = await pushTracks(this.sessionId, {
          tracks: [{ location: "remote", sessionId: p.sessionId, trackName: p.trackName }],
        });
        if (Array.isArray(res.tracks)) {
          for (const t of res.tracks) {
            if (!t.mid) continue;
            this.midToUid.set(t.mid, uid);
            const orphan = this.orphanTracks.get(t.mid);
            if (orphan) { this.orphanTracks.delete(t.mid); this.deliverTrack(uid, orphan); }
          }
        }
        if (res.requiresImmediateRenegotiation && res.sessionDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await renegotiate(this.sessionId, { type: "answer", sdp: answer.sdp });
        }
        this.subscribed.set(uid, key);
        this.retries.delete(uid);
      })
      /* ── (٢) الفشل لا يعني الاستسلام ──
         أشهر سبب: المتحدّث أعلن مساره قبل أن يصل إلى الخادم بلحظات.
         نُعيد المحاولة بمهلٍ متزايدة، فيسمعه المستمع خلال ثانية أو
         اثنتين بدل ألّا يسمعه أبداً. */
      .catch(async (e) => {
        console.warn("[BacZone voice] تعذّر الاشتراك، ستُعاد المحاولة:", e);
        await this.rollback();
        const n = this.retries.get(uid) ?? 0;
        if (n < RETRY_DELAYS.length && !this.destroyed) {
          this.retries.set(uid, n + 1);
          this.retryTimers.set(uid, setTimeout(() => {
            this.retryTimers.delete(uid);
            this.reconcile();
          }, RETRY_DELAYS[n]));
        }
      })
      .finally(() => { this.pending.delete(uid); });
  }

  /* ════════════════════════════════════════════════════════
     فتح الميكروفون — هنا وحده يُطلب إذن المتصفّح
     ════════════════════════════════════════════════════════ */
  async enableMic(): Promise<MicResult> {
    if (!this.canSpeak()) return "forbidden";
    if (!this.pc) return "network";

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      /* متصفّح فيسبوك وإنستغرام ومسنجر الداخلي لا يدعم الميكروفون
         إطلاقاً — وهو الطريق الأشهر الذي يصل منه التلاميذ إلى الروابط. */
      return "unsupported";
    }

    try {
      if (!this.localStream || this.localStream.getAudioTracks().length === 0) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      }
    } catch (e) {
      const n = (e as { name?: string })?.name ?? "";
      if (n === "NotFoundError" || n === "OverconstrainedError" || n === "DevicesNotFoundError") return "no-device";
      if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") return "busy";
      return "denied";
    }

    const track = this.localStream.getAudioTracks()[0];
    if (!track) return "no-device";
    track.enabled = true;

    try {
      if (this.published && this.sender) {
        /* المسار منشور من قبل: استبدالٌ بلا تفاوض. التفاوض في كل مرّة
           يُحدث انقطاعاً مسموعاً عند الجميع لأجل ضغطة زرّ. */
        await this.sender.replaceTrack(track);
      } else {
        await this.publish(track);           // (٣) يرمي عند الفشل — لا يبتلع
      }
      /* ── (١) لا إعلان قبل الجاهزية ── */
      await this.waitConnected();
    } catch (e) {
      console.error("[BacZone voice] فشل نشر الميكروفون:", e);
      this.localStream?.getTracks().forEach((t) => t.stop());
      this.localStream = null;
      return "network";
    }

    if (this.destroyed) return "network";
    this.micOn = true;
    this.onMicChange?.(true);
    try {
      await update(this.myRef(), {
        micOn: true,
        sessionId: this.sessionId,
        trackName: this.trackName,
      });
    } catch (e) {
      console.error("[BacZone voice] تعذّر إعلان المسار:", e);
    }
    return "ok";
  }

  private publish(track: MediaStreamTrack): Promise<void> {
    const run = this.chain.then(async () => {
      const pc = this.pc;
      if (!pc) throw new Error("no peer connection");
      const tr = pc.addTransceiver(track, { direction: "sendonly" });
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const name = `mic-${this.uid}-${Date.now()}`;
        const res = await pushTracks(this.sessionId, {
          sessionDescription: { type: "offer", sdp: offer.sdp },
          tracks: [{ location: "local", mid: tr.mid, trackName: name }],
        });
        if (!res.sessionDescription) throw new RealtimeError("no answer from SFU");
        await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
        this.sender = tr.sender;
        this.trackName = name;
        this.published = true;
      } catch (e) {
        await this.rollback();
        try { tr.stop(); } catch { /* ignore */ }
        throw e;
      }
    });
    /* السلسلة نفسها لا تحمل الخطأ — وإلّا توقّفت كل الاشتراكات بعده —
       لكنّ المُنادي يستلمه كاملاً. */
    this.chain = run.catch(() => {});
    return run;
  }

  /** ينتظر اكتمال الاتصال بالخادم — الصوت لا يمرّ قبله */
  private waitConnected(): Promise<void> {
    const pc = this.pc;
    if (!pc) return Promise.reject(new Error("no pc"));
    const ok = () => pc.connectionState === "connected"
      || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed";
    if (ok()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error("connect timeout")); }, CONNECT_TIMEOUT);
      const check = () => {
        if (ok()) { cleanup(); resolve(); }
        else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          cleanup(); reject(new Error(`connection ${pc.connectionState}`));
        }
      };
      const cleanup = () => {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", check);
        pc.removeEventListener("iceconnectionstatechange", check);
      };
      pc.addEventListener("connectionstatechange", check);
      pc.addEventListener("iceconnectionstatechange", check);
    });
  }

  /** يغلق التلميذ ميكروفونه — ويُطفئ مؤشّر النظام معه */
  async disableMic() {
    this.micOn = false;
    this.onMicChange?.(false);
    try { await this.sender?.replaceTrack(null); } catch { /* ignore */ }
    /* إيقاف المسار لا تعطيله: `enabled = false` يُبقي ضوء الميكروفون
       مضاءً في شريط النظام، فيظنّ التلميذ أنّنا نسمعه ونحن لا نسمع. */
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    try { await update(this.myRef(), { micOn: false }); } catch { /* ignore */ }
  }

  // ── أوامر المالك ──
  /** يمنح الإذن أو يسحبه. السحب يُغلق ميكروفون صاحبه فوراً عنده. */
  setAllowed(uid: string, allowed: boolean) {
    if (!this.isOwner) return;
    void update(ref(rtdb, `${this.voicePath()}/${uid}`), allowed ? { allowed: true } : { allowed: false, micOn: false })
      .catch((e) => console.error("[BacZone voice] تعذّر تغيير الإذن:", e));
  }
  ownerKick(uid: string) {
    if (!this.isOwner) return;
    void update(ref(rtdb, `${this.voicePath()}/${uid}`), { kicked: true })
      .catch((e) => console.error("[BacZone voice] تعذّر الإخراج:", e));
  }

  async leave() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.retryTimers.forEach((t) => clearTimeout(t));
    this.retryTimers.clear();

    /* لا نمسح إلّا حضورنا **نحن**: إن كانت نسخةٌ أحدث (إعادة اتصال،
       أو تبويب آخر) قد كتبت فوقه، فمسحه يُخفيها عن الصفّ كلّه.
       ويجري قبل إلغاء المستمع لأنّ المعاملة تبدأ من النسخة المحلّية. */
    try {
      await runTransaction(this.myRef(), (cur: VoiceParticipant | null) =>
        cur && cur.cid === this.cid ? null : undefined,
      );
    } catch { /* ignore */ }

    this.unsubVoice?.();
    this.unsubConn?.();
    this.localStream?.getTracks().forEach((t) => t.stop());
    try { this.pc?.close(); } catch { /* ignore */ }
    this.pc = null;
    this.localStream = null;
    this.sender = null;
    this.published = false;
    this.micOn = false;
    this.remoteStreams.clear();
    this.subscribed.clear();
    this.pending.clear();
    this.midToUid.clear();
    this.orphanTracks.clear();
    this.onLeave?.();
  }
}

/* ════════════════════════════════════════════════════════════
   سياق صوتيّ واحد للصفحة كلّها

   Safari يحدّ عدد السياقات المتزامنة (أربعة تقريباً) ثمّ **يرمي**،
   والسياق يُنشأ معلّقاً على iOS حتى يُستأنف داخل إيماءة مستخدم.
   ════════════════════════════════════════════════════════════ */
let sharedCtx: AudioContext | null = null;
let ctxUsers = 0;

function getSharedCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AC();
  if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

/** يُستدعى من أيّ إيماءة مستخدم: يفكّ الصوت المحجوب في iOS وChrome معاً */
export function unlockAudio() {
  const ctx = getSharedCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLAudioElement>("audio[data-bz-voice]").forEach((a) => {
    if (a.paused) void a.play().catch(() => {});
  });
}

/**
 * يراقب مستوى الصوت.
 * `cb` يُستدعى فقط حين تتغيّر حالة «يتكلّم» (فلا يُغرق React بإعادة الرسم)،
 * و`onLevel` يُستدعى كل إطار بقيمة 0..1 — لتحريك حلقة الميكروفون مباشرةً
 * عبر متغيّر CSS بلا أيّ إعادة رسم.
 */
export function monitorLevel(
  stream: MediaStream,
  cb: (speaking: boolean) => void,
  onLevel?: (level: number) => void,
): () => void {
  const ctx = getSharedCtx();
  if (!ctx) return () => {};
  ctxUsers++;

  let src: MediaStreamAudioSourceNode;
  try {
    src = ctx.createMediaStreamSource(stream);
  } catch {
    ctxUsers--;
    return () => {};
  }

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let last = false;
  let smooth = 0;
  let quietFrames = 0;
  const tick = () => {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;
    smooth = smooth * 0.7 + Math.min(1, avg / 60) * 0.3;
    onLevel?.(smooth);
    /* تأخير قصير قبل «توقّف عن الكلام»: بلا هذا يرمش المؤشّر بين
       الكلمات فيبدو الصوت متقطّعاً وهو ليس كذلك. */
    const loud = avg > 12;
    quietFrames = loud ? 0 : quietFrames + 1;
    const speaking = loud || (last && quietFrames < 18);
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
    onLevel?.(0);
    ctxUsers--;
    if (ctxUsers <= 0) {
      ctxUsers = 0;
      sharedCtx?.close().catch(() => {});
      sharedCtx = null;
    }
  };
}

