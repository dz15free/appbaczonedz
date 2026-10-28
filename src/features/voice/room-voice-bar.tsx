"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFullscreenHost, useFullscreenState } from "@/lib/fullscreen";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { Icon } from "@/components/ui/icon";
import { ref, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import {
  VoiceManager, monitorLevel, unlockAudio,
  type VoiceParticipant, type MicResult,
} from "@/features/voice/voice-manager";
import { RealtimeError } from "@/lib/realtime/client";

/* ════════════════════════════════════════════════════════════
   تشغيل صوت الآخرين

   🐛 v6: كان `onBlocked` دالةً جديدة في كل رسم، فيُعاد تشغيل المؤثّر
   في كل رسم — وكل إعادة تُسند `srcObject` من جديد. وإسناد `srcObject`
   يُعيد تحميل العنصر **ولو كان المسار نفسه**. ومؤشّر «يتكلّم» يُعيد
   رسم الشريط عشرات المرّات في الدقيقة، فكان صوت الأستاذ **يتقطّع**
   مع كل كلمة. الآن يُسند مرّة واحدة لكل مسار، والدالة في مرجع ثابت.
   ════════════════════════════════════════════════════════════ */
function AudioSink({ stream, onBlocked }: { stream: MediaStream; onBlocked: () => void }) {
  const el = useRef<HTMLAudioElement>(null);
  const blocked = useRef(onBlocked);
  blocked.current = onBlocked;
  useEffect(() => {
    const a = el.current;
    if (!a) return;
    if (a.srcObject !== stream) a.srcObject = stream;
    const p = a.play();
    if (p) p.catch(() => blocked.current());
  }, [stream]);
  return <audio ref={el} autoPlay playsInline data-bz-voice="" />;
}

/* ── رسائل الصوت ──
   كل عطل يقول **ما حدث وكيف يُصلَح** — لا «حدث خطأ». */
type Notice = {
  kind: "error" | "info";
  title: string;
  body: string;
  action?: { label: string; run: () => void };
};

const MIC_NOTICE: Record<Exclude<MicResult, "ok">, Omit<Notice, "action">> = {
  forbidden: { kind: "info", title: "الكلمة بيد صاحب الغرفة", body: "ارفع يدك، وحين يأذن لك يصير زرّ الميكروفون أزرق." },
  denied: { kind: "error", title: "المتصفّح منع الميكروفون", body: "اضغط على القفل بجانب عنوان الموقع ← الأذونات ← الميكروفون ← سماح، ثمّ حاول ثانيةً." },
  unsupported: { kind: "error", title: "هذا المتصفّح لا يدعم الميكروفون", body: "يبدو أنّك فتحت الرابط من فيسبوك أو إنستغرام أو مسنجر. افتحه في Chrome أو Safari لتتكلّم — الاستماع يعمل هنا." },
  "no-device": { kind: "error", title: "لم نجد ميكروفوناً", body: "صِل سمّاعة فيها ميكروفون، أو تأكّد أنّ الميكروفون مفعّل في إعدادات جهازك." },
  busy: { kind: "error", title: "الميكروفون مشغول", body: "تطبيق آخر يستعمله الآن (مكالمة أو تسجيل). أغلقه ثمّ حاول ثانيةً." },
  network: { kind: "error", title: "خادم الصوت رفض إرسال صوتك", body: "أعد المحاولة بعد لحظة. إن تكرّر، افتح «افحص الصوت» لمعرفة السبب." },
  blocked: { kind: "error", title: "شبكتك تحجب الاتصال الصوتي", body: "الاستماع قد يعمل لكنّ إرسال الصوت لم يكتمل. جرّب بيانات الهاتف بدل Wi-Fi، أو افتح «افحص الصوت»." },
};

function joinErrorNotice(e: unknown, canAdmin: boolean): Omit<Notice, "action"> {
  const code = e instanceof RealtimeError ? e.code : undefined;
  const msg = String((e as { message?: string })?.message ?? e);
  if (code === "not_configured") {
    return {
      kind: "error",
      title: "الصوت غير مُفعّل على الخادم",
      body: canAdmin
        ? "أضف CLOUDFLARE_REALTIME_APP_ID و CLOUDFLARE_REALTIME_APP_SECRET في Vercel ← Settings ← Environment Variables، ثمّ أعد النشر."
        : "صاحب المنصّة لم يُكمل إعداد الصوت بعد. الدردشة والسبورة تعملان.",
    };
  }
  if (code === "bad_credentials") {
    return {
      kind: "error",
      title: "مفاتيح الصوت غير صحيحة",
      body: canAdmin
        ? "Cloudflare رفض CLOUDFLARE_REALTIME_APP_ID أو APP_SECRET. انسخهما من جديد من لوحة Cloudflare Realtime."
        : "إعداد الصوت على الخادم فيه خطأ. أخبر صاحب المنصّة.",
    };
  }
  if (/permission|denied/i.test(msg)) {
    return {
      kind: "error",
      title: "قاعدة البيانات رفضت الدخول إلى الصوت",
      body: canAdmin ? "انشر ملف firebase-rtdb-rules.json في Firebase ← Realtime Database ← Rules." : "أعد تحميل الصفحة. إن تكرّر، أخبر صاحب الغرفة.",
    };
  }
  return { kind: "error", title: "تعذّر الاتصال بخادم الصوت", body: "تحقّق من الإنترنت. سنعيد المحاولة تلقائياً." };
}

/* ════════════════════════════════════════════════════════════
   كبسولة الصوت

   تعيش داخل شريط التحكّم (`embedded`)، وفيها ثلاثة أشياء فقط:
   الميكروفون — بحلقة تتنفّس مع **مستوى صوتك الحقيقي**، فلا يتساءل
   أحد «هل يسمعونني؟» — وحالة مكتوبة بكلمتين، وعدد من في الصوت.
   ════════════════════════════════════════════════════════════ */
export function RoomVoiceBar({
  roomId, isOwner, embedded, ownerId, voiceOpen, onToggleVoiceOpen, ready = true, canAdmin,
}: {
  roomId: string;
  isOwner: boolean;
  embedded?: boolean;
  /** يُسمع دائماً ولو لم يكن له سجلّ إذن */
  ownerId?: string;
  /** «اسمح للجميع بالكلام» — مفتاح في يد المالك */
  voiceOpen?: boolean;
  onToggleVoiceOpen?: (open: boolean) => void;
  /** ⚠️ لا اتصال قبل أن تُعرف الغرفة ودوري فيها — انظر التعليق أدناه */
  ready?: boolean;
  /** يرى تفاصيل الإعداد التقنية في رسائل الخطأ (المالك/الأدمن) */
  canAdmin?: boolean;
}) {
  const { user } = useAuth();
  const managerRef = useRef<VoiceManager | null>(null);
  const monitors = useRef<Record<string, () => void>>({});
  const micBtnRef = useRef<HTMLButtonElement>(null);
  const wantMic = useRef(false);
  const attempts = useRef(0);

  const [gen, setGen] = useState(0);            // كل زيادة = اتصال جديد
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [allowed, setAllowed] = useState(isOwner);
  const [micOn, setMicOn] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [expanded, setExpanded] = useState(false);
  useFullscreenState();

  const stopMonitor = (uid: string) => {
    monitors.current[uid]?.();
    delete monitors.current[uid];
  };

  /* حلقة الميكروفون تُحرَّك مباشرةً عبر متغيّر CSS — بلا أيّ إعادة رسم */
  const setLevel = useCallback((lvl: number) => {
    micBtnRef.current?.style.setProperty("--lvl", lvl.toFixed(3));
  }, []);

  /* ════════════════════════════════════════════════════════
     الاتصال

     🐛 v6: كان الشريط يتّصل **قبل** أن تصل بيانات الغرفة، و`isOwner`
     في أوّل رسمة `false` دائماً. فيدخل الأستاذ كتلميذ، ثمّ تصل الغرفة
     فيصير مالكاً ⇒ يُفكّ الاتصال ويُعاد. والنسخة القديمة تمسح حضورها
     **بعد** أن كتبت الجديدة حضورها — فيختفي الأستاذ من عقدة الصوت ولا
     يسمعه من يدخل بعده. الآن: لا اتصال قبل `ready`، والدور ثابت.
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!user || !ready) return;
    let cancelled = false;
    const m = new VoiceManager(roomId, user.uid, user.displayName || "تلميذ", isOwner);
    m.onParticipants = setParticipants;
    m.onPermissionChange = setAllowed;
    m.onMicChange = (on) => {
      setMicOn(on);
      if (!on) { stopMonitor(user.uid); setSpeaking((p) => ({ ...p, [user.uid]: false })); }
    };
    m.onConnected = () => { attempts.current = 0; };
    m.onConnectionLost = () => {
      if (cancelled) return;
      /* إعادة اتصال تلقائية بمهلٍ متزايدة — كان يُطلب من التلميذ
         «أعد تحميل الصفحة» فيخسر مكانه في السبورة والدردشة. */
      if (attempts.current < 3) {
        attempts.current += 1;
        setNotice({ kind: "info", title: "انقطع الصوت", body: "نعيد الاتصال الآن…" });
        setTimeout(() => setGen((g) => g + 1), 1200 * attempts.current);
      } else {
        setNotice({
          kind: "error", title: "تعذّرت إعادة الاتصال بالصوت",
          body: "الشبكة غير مستقرّة. حين تتحسّن اضغط «أعد الاتصال».",
          action: { label: "أعد الاتصال", run: () => { attempts.current = 0; setNotice(null); setGen((g) => g + 1); } },
        });
      }
    };
    m.onRemoteStream = (uid, stream) => {
      setStreams((s) => (s[uid] === stream ? s : { ...s, [uid]: stream }));
      stopMonitor(uid);
      monitors.current[uid] = monitorLevel(stream, (sp) => setSpeaking((p) => ({ ...p, [uid]: sp })));
    };
    m.onRemoteGone = (uid) => {
      stopMonitor(uid);
      setStreams((s) => { const n = { ...s }; delete n[uid]; return n; });
      setSpeaking((p) => ({ ...p, [uid]: false }));
    };

    setConnecting(true);
    setListening(false);
    m.join()
      .then(async () => {
        if (cancelled) { void m.leave(); return; }
        managerRef.current = m;
        m.ownerUid = ownerId ?? "";
        m.setVoiceOpen(!!voiceOpen);
        setListening(true);
        setNotice((n) => (n?.kind === "info" && n.title === "انقطع الصوت" ? null : n));
        /* كان ميكروفونه مفتوحاً قبل الانقطاع؟ يُعاد فتحه بلا سؤال —
           الإذن ممنوح سلفاً فلا نافذة تظهر. */
        if (wantMic.current) {
          const res = await m.enableMic();
          if (res === "ok") startSelfMonitor(m);
          else wantMic.current = false;
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[BacZone voice] تعذّر الاستماع:", e);
        const base = joinErrorNotice(e, !!canAdmin);
        const retryable = !(e instanceof RealtimeError && (e.code === "not_configured" || e.code === "bad_credentials"));
        setNotice({
          ...base,
          action: retryable ? { label: "أعد المحاولة", run: () => { setNotice(null); setGen((g) => g + 1); } } : undefined,
        });
        if (retryable && attempts.current < 3) {
          attempts.current += 1;
          setTimeout(() => { if (!cancelled) setGen((g) => g + 1); }, 2500 * attempts.current);
        }
      })
      .finally(() => { if (!cancelled) setConnecting(false); });

    return () => {
      cancelled = true;
      void m.leave();
      if (managerRef.current === m) managerRef.current = null;
      Object.values(monitors.current).forEach((stop) => stop());
      monitors.current = {};
      setStreams({});
      setMicOn(false);
      setListening(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.uid, isOwner, ready, gen]);

  useEffect(() => {
    if (managerRef.current && ownerId) managerRef.current.ownerUid = ownerId;
  }, [ownerId, listening]);

  useEffect(() => {
    managerRef.current?.setVoiceOpen(!!voiceOpen);
    if (voiceOpen) setAllowed(true);
  }, [voiceOpen, listening]);

  /* ── فكّ الصوت المحجوب بأوّل لمسة في أيّ مكان ──
     iOS وChrome يمنعان تشغيل الصوت قبل تفاعل المستخدم مع الصفحة. بدل
     زرٍّ لا يُرى، أوّل لمسة على أيّ شيء في الغرفة تفكّ الصوت كلّه. */
  useEffect(() => {
    const onGesture = () => { unlockAudio(); setAudioBlocked(false); };
    document.addEventListener("pointerdown", onGesture, { passive: true });
    document.addEventListener("keydown", onGesture);
    return () => {
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    };
  }, []);

  function startSelfMonitor(m: VoiceManager) {
    if (!user) return;
    const ls = m.getLocalStream();
    if (!ls) return;
    stopMonitor(user.uid);
    monitors.current[user.uid] = monitorLevel(
      ls,
      (sp) => setSpeaking((p) => ({ ...p, [user.uid]: sp })),
      setLevel,
    );
  }

  /* ── التحدّث ── */
  const openCheck = () => { window.open("/voice-check", "_blank", "noopener"); };

  async function toggleMic() {
    const m = managerRef.current;
    if (!m || micBusy) return;
    unlockAudio();
    if (micOn) {
      wantMic.current = false;
      await m.disableMic();
      setLevel(0);
      return;
    }
    if (!isOwner && !allowed) {
      setNotice({ ...MIC_NOTICE.forbidden });
      return;
    }
    setMicBusy(true);
    const res = await m.enableMic();
    setMicBusy(false);
    if (res !== "ok") {
      const n = MIC_NOTICE[res];
      /* الأدمن يرى السبب التقنيّ كما هو — يكفي أن يرسله ليُشخَّص العطل */
      const detail = canAdmin && (res === "network" || res === "blocked") ? m.getLastError() : "";
      setNotice({
        ...n,
        body: detail ? `${n.body}\nالتفاصيل: ${detail}` : n.body,
        action: res === "unsupported"
          ? { label: "انسخ الرابط", run: () => { void navigator.clipboard?.writeText(window.location.href).catch(() => {}); setNotice(null); } }
          : res === "network" || res === "blocked"
            ? { label: "افحص الصوت", run: openCheck }
            : res === "busy"
              ? { label: "حاول ثانيةً", run: () => { setNotice(null); void toggleMic(); } }
              : undefined,
      });
      return;
    }
    wantMic.current = true;
    setNotice(null);
    /* فتح الميكروفون جوابٌ عن رفع اليد، فتُخفض من نفسها. */
    if (user) void remove(ref(rtdb, `roomLive/${roomId}/hands/${user.uid}`)).catch(() => {});
    startSelfMonitor(m);
  }

  const speakerUid = listening
    ? participants.find((p) => speaking[p.uid] && p.micOn && p.uid !== user?.uid)?.uid ?? null
    : null;
  const speaker = speakerUid ? participants.find((p) => p.uid === speakerUid) ?? null : null;

  const canTalk = isOwner || allowed;
  /* «متوقّف» بالأحمر فقط حين يوجد عطلٌ مُعلَن فعلاً. قبل `ready` (الغرفة
     تُحمَّل) وبين محاولات إعادة الاتصال، الحالة «جارٍ الاتصال» — لا
     إنذار كاذب لثانية يُربك التلميذ عند كل دخول. */
  const state: "connecting" | "error" | "live" | "ready" | "listen" =
    connecting || !ready || (!listening && !notice) ? "connecting"
      : !listening ? "error"
        : micOn ? "live"
          : canTalk ? "ready"
            : "listen";

  const label = {
    connecting: { t: "جارٍ الاتصال", s: "بخادم الصوت…" },
    error: { t: "الصوت متوقّف", s: "اضغط للتفاصيل" },
    live: { t: "يسمعونك الآن", s: speaking[user?.uid ?? ""] ? "صوتك يصل" : "تكلّم براحتك" },
    ready: isOwner ? { t: "افتح ميكروفونك", s: "ليسمعك الصفّ" } : { t: "لك الكلمة", s: "اضغط لتتكلّم" },
    listen: { t: "تستمع للغرفة", s: "ارفع يدك لتتكلّم" },
  }[state];

  const host = typeof document !== "undefined" ? getFullscreenHost() : null;

  return (
    <div className={embedded ? "bz-vc" : "bz-vc bz-vc--standalone"} data-state={state}>
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} onBlocked={() => setAudioBlocked(true)} />
      ))}

      {/* ── الكبسولة ── */}
      <button
        ref={micBtnRef}
        type="button"
        onClick={() => {
          if (state === "error") {
            if (!notice) setGen((g) => g + 1);
            return;
          }
          void toggleMic();
        }}
        disabled={state === "connecting" || micBusy}
        className="bz-vc-mic"
        aria-pressed={micOn}
        aria-label={micOn ? "أغلق ميكروفوني" : canTalk ? "افتح ميكروفوني" : "الميكروفون — يحتاج إذن صاحب الغرفة"}
        title={micOn ? "أغلق ميكروفوني" : canTalk ? "افتح ميكروفوني" : "ارفع يدك ليأذن لك صاحب الغرفة"}
      >
        <span className="bz-vc-ring" aria-hidden="true" />
        <Icon name={micOn || canTalk ? "mic" : "micOff"} size={19} />
      </button>

      <button
        type="button"
        onClick={() => (state === "error" && notice ? setNotice({ ...notice }) : setExpanded(true))}
        className="bz-vc-status"
        aria-label={`${label.t} — من في الصوت (${participants.length})`}
      >
        <span className="bz-vc-title">{label.t}</span>
        <span className="bz-vc-sub">{label.s}</span>
      </button>

      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="bz-vc-count"
        aria-label={`من في الصوت: ${participants.length}`}
        title="من في الصوت والميكروفونات"
      >
        <Icon name="users" size={14} />
        <span>{participants.length}</span>
      </button>

      {isOwner && onToggleVoiceOpen && (
        <button
          type="button"
          onClick={() => onToggleVoiceOpen(!voiceOpen)}
          className="bz-vc-open"
          aria-pressed={!!voiceOpen}
          aria-label={voiceOpen ? "أوقف الكلام الحرّ" : "اسمح للجميع بالكلام"}
          title={voiceOpen ? "الكلام مفتوح للجميع — اضغط للعودة إلى الإذن" : "اسمح للجميع بالكلام بلا إذن"}
        >
          <Icon name="hand" size={15} />
          <span className="bz-vc-open-label">{voiceOpen ? "الكلام حرّ" : "بالإذن"}</span>
        </button>
      )}

      {/* ── من يتكلّم الآن — بطاقة عائمة صغيرة ── */}
      {speaker && !expanded && host && createPortal(
        <div className="bz-vc-pip" role="status" aria-live="polite">
          <span className="bz-vc-pip-avatar">
            <LiveAvatar uid={speaker.uid} name={speaker.name || "ط"} size="md" className="h-8 w-8" />
          </span>
          <span className="min-w-0">
            <span className="bz-vc-pip-name">{speaker.name}</span>
            <span className="bz-vc-pip-sub">يتكلّم الآن</span>
          </span>
          <span className="bz-vc-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>,
        host,
      )}

      {/* ── الرسائل ── فوق الرصيف، وداخل ملء الشاشة أيضاً */}
      {host && (notice || (audioBlocked && listening)) && createPortal(
        <div className="bz-vc-notice" data-kind={notice?.kind ?? "info"} role={notice?.kind === "error" ? "alert" : "status"}>
          <span className="bz-vc-notice-icon" aria-hidden="true">
            <Icon name={notice ? (notice.kind === "error" ? "warn" : "mic") : "play"} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <b>{notice ? notice.title : "اضغط لسماع الغرفة"}</b>
            <span>{notice ? notice.body : "المتصفّح أوقف الصوت حتى تلمس الصفحة."}</span>
          </span>
          <span className="bz-vc-notice-actions">
            {!notice && audioBlocked && (
              <button type="button" className="is-primary" onClick={() => { unlockAudio(); setAudioBlocked(false); }}>
                شغّل الصوت
              </button>
            )}
            {notice?.action && (
              <button type="button" className="is-primary" onClick={notice.action.run}>{notice.action.label}</button>
            )}
            {notice && (
              <button type="button" onClick={() => setNotice(null)} aria-label="إخفاء">
                <Icon name="close" size={14} />
              </button>
            )}
          </span>
        </div>,
        host,
      )}

      {/* ── لوحة الصوت: من في الصوت ومن يملك الكلمة ── */}
      {expanded && host && createPortal(
        <div className="bz-vc-sheet-wrap" onClick={() => setExpanded(false)}>
          <div className="bz-vc-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="الصوت">
            <div className="bz-vc-sheet-head">
              <div>
                <h3>الصوت</h3>
                <p>
                  {participants.length === 0
                    ? "لا أحد في الصوت بعد"
                    : `${participants.length} في الصوت · ${participants.filter((p) => p.micOn).length} ميكروفون مفتوح`}
                </p>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label="إغلاق" className="bz-vc-x">
                <Icon name="close" size={16} />
              </button>
            </div>
            {isOwner && (
              <p className="bz-vc-sheet-hint">
                الجميع يسمعونك. من يريد الكلام يحتاج إذنك: اضغط على زرّ الميكروفون تحت اسمه،
                أو اجعل الكلام حرّاً للجميع من زرّ «بالإذن» في الشريط.
              </p>
            )}
            <VoiceRoster
              participants={participants}
              speaking={speaking}
              isOwner={isOwner}
              myUid={user?.uid}
              ownerId={ownerId}
              onToggleMute={(uid, next) => managerRef.current?.setAllowed(uid, next)}
              onKick={(uid) => managerRef.current?.ownerKick(uid)}
            />
          </div>
        </div>,
        host,
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   قائمة من في الصوت — ثلاث حالات لا اثنتان:
   يتكلّم الآن · له الإذن ولم يفتح · لا إذن له
   ════════════════════════════════════════════════════════════ */
function VoiceRoster({
  participants, speaking, isOwner, myUid, ownerId, onToggleMute, onKick,
}: {
  participants: VoiceParticipant[];
  speaking: Record<string, boolean>;
  isOwner: boolean;
  myUid?: string;
  ownerId?: string;
  onToggleMute: (uid: string, next: boolean) => void;
  onKick: (uid: string) => void;
}) {
  if (participants.length === 0) {
    return <p className="bz-vc-empty">حين يدخل أحد الغرفة يظهر هنا.</p>;
  }
  const sorted = [...participants].sort((a, b) => {
    const rank = (p: VoiceParticipant) => (p.uid === ownerId ? 0 : p.micOn ? 1 : p.allowed ? 2 : 3);
    return rank(a) - rank(b);
  });
  return (
    <ul className="bz-vc-roster">
      {sorted.map((p) => {
        const isMe = p.uid === myUid;
        const isHost = p.uid === ownerId;
        const isAllowed = !!p.allowed || isHost;
        const isLive = !!p.micOn;
        const isSpeaking = !!speaking[p.uid] && isLive;
        return (
          <li key={p.uid} data-speaking={isSpeaking || undefined}>
            <span className="bz-vc-roster-av">
              <LiveAvatar uid={p.uid} name={p.name || "ط"} size="md" className="h-11 w-11" />
              <span
                className="bz-vc-roster-dot"
                data-s={isLive ? "live" : isAllowed ? "allowed" : "muted"}
                title={isLive ? "ميكروفونه مفتوح" : isAllowed ? "له الكلمة — لم يفتح بعد" : "يستمع فقط"}
              >
                <Icon name={isLive || isAllowed ? "mic" : "micOff"} size={10} />
              </span>
            </span>
            <span className="bz-vc-roster-name">
              {p.name || "تلميذ"}
              {isMe && <em> (أنت)</em>}
            </span>
            <span className="bz-vc-roster-role">
              {isHost ? "صاحب الغرفة" : isLive ? (isSpeaking ? "يتكلّم" : "ميكروفون مفتوح") : isAllowed ? "له الكلمة" : "يستمع"}
            </span>
            {isOwner && !isMe && !isHost && (
              <span className="bz-vc-roster-actions">
                <button
                  type="button"
                  onClick={() => onToggleMute(p.uid, !isAllowed)}
                  className={isAllowed ? "is-revoke" : "is-grant"}
                  aria-label={isAllowed ? `اسحب الكلمة من ${p.name}` : `أعطِ الكلمة لـ${p.name}`}
                >
                  <Icon name={isAllowed ? "micOff" : "mic"} size={14} />
                  {isAllowed ? "اسحب" : "أعطِ الكلمة"}
                </button>
                <button
                  type="button"
                  onClick={() => onKick(p.uid)}
                  className="is-kick"
                  aria-label={`إخراج ${p.name} من الصوت`}
                  title="إخراج من الصوت"
                >
                  <Icon name="exit" size={14} />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
