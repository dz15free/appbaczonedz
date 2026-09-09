"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFullscreenHost, useFullscreenState } from "@/lib/fullscreen";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LiveAvatar } from "@/components/ui/live-avatar";
import {
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faUserSlash,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { ref, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { VoiceManager, monitorLevel, type VoiceParticipant } from "@/features/voice/voice-manager";

/* ════════════════════════════════════════════════════════════
   تشغيل صوت الآخرين

   🐛 `autoPlay` وحدها لا تكفي على iOS. عنصر `<audio>` يُركَّب لحظة
   وصول مسار المتحدّث — أي **خارج أيّ إيماءة مستخدم**، وiOS يرفض
   التشغيل التلقائي هناك بصمت. فينضمّ الطالب، ويرى الجميع في القائمة،
   ولا يسمع أحداً — بلا رسالة خطأ ولا سبب ظاهر. وهذه بعينها «تجربة
   الصوت سيّئة».

   العلاج نداء `play()` صريح ورصد فشله: الإذن مُنح فعلاً عند الضغط
   على «انضمّ صوتياً»، لكنّ المتصفّح يحتاج النداء ليربط بينهما. وإن
   فشل رغم ذلك نُبلغ الأعلى ليطلب لمسةً واحدة بدل صمتٍ لا يُفسَّر.
   ════════════════════════════════════════════════════════════ */
function AudioSink({ stream, onBlocked }: { stream: MediaStream; onBlocked?: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => onBlocked?.());
  }, [stream, onBlocked]);
  return <audio ref={ref} autoPlay playsInline />;
}

/* `embedded`: الشريط يعيش الآن **داخل** شريط التحكّم بدل أن يكون
   شريطاً ثانياً أسفل الشاشة. في هذا الوضع يتخلّى عن حدّه العلوي
   وحشوته وعن لوحته الموسّعة (الحاضرون صاروا في رفّ الصفّ والرصيف)،
   ويبقى ما يهمّ: الانضمام والكتم والمغادرة — فلا يغيب الميكروفون
   عن اليد في أيّ وضع، ولا تحتاجه الصفحة بنقرة على عنصر DOM. */
export function RoomVoiceBar({
  roomId, isOwner, embedded, ownerId, voiceOpen, onToggleVoiceOpen,
}: {
  roomId: string;
  isOwner: boolean;
  embedded?: boolean;
  /** يُسمع دائماً ولو لم يكن له سجلّ إذن */
  ownerId?: string;
  /** «اسمح للجميع بالكلام» — مفتاح في يد المالك */
  voiceOpen?: boolean;
  onToggleVoiceOpen?: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const managerRef = useRef<VoiceManager | null>(null);
  const monitors = useRef<Record<string, () => void>>({});
  /* `listening` لا `joined`: الدخول إلى الصوت لم يعد فعلاً يقرّره
     المستخدم، بل حالةً تبدأ من نفسها عند دخول الغرفة. */
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [allowed, setAllowed] = useState(isOwner);
  const [micOn, setMicOn] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [connLost, setConnLost] = useState(false);
  /* إعادة الرسم عند تغيّر ملء الشاشة، فتنتقل الطبقات العائمة معه */
  useFullscreenState();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [expanded, setExpanded] = useState(false);

  /* ════════════════════════════════════════════════════════
     الاستماع يبدأ من نفسه

     🐛 كان على كل طالب أن يضغط «انضمّ صوتياً» ليسمع الدرس — وهو زرٌّ
     ينادي `getUserMedia`، أي **يطلب إذن الميكروفون ممّن يريد أن
     يسمع فقط**. ومن رفض الإذن، أو كان في مكان عامّ، لم يسمع الدرس
     إطلاقاً. ومن دخل والأستاذ يتكلّم لم يسمع شيئاً حتى يكتشف زرّاً
     لا يعرف أنّ عليه ضغطه.

     الاستماع الآن يبدأ مع دخول الغرفة بلا زرّ ولا إذن — انظر
     `voice-manager.ts`. ولا يبقى للمستخدم إلّا قرار **التحدّث**.
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const m = new VoiceManager(roomId, user.uid, user.displayName || "طالب", isOwner);
    m.ownerUid = ownerId ?? "";
    m.onParticipants = setParticipants;
    m.onPermissionChange = setAllowed;
    m.onMicChange = setMicOn;
    m.onConnectionLost = () => setConnLost(true);
    m.onRemoteStream = (uid, stream) => {
      setStreams((s) => ({ ...s, [uid]: stream }));
      monitors.current[uid]?.();
      monitors.current[uid] = monitorLevel(stream, (sp) =>
        setSpeaking((p) => ({ ...p, [uid]: sp })),
      );
    };

    setConnecting(true);
    m.join()
      .then(() => {
        if (cancelled) { void m.leave(); return; }
        managerRef.current = m;
        setListening(true);
      })
      .catch((e) => console.error("[BacZone voice] تعذّر الاستماع:", e))
      .finally(() => { if (!cancelled) setConnecting(false); });

    return () => {
      cancelled = true;
      void m.leave();
      managerRef.current = null;
      Object.values(monitors.current).forEach((stop) => stop());
      monitors.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.uid, isOwner]);

  /* «اسمح للجميع بالكلام» يصل من الأعلى ويُطبَّق فوراً */
  useEffect(() => {
    managerRef.current?.setVoiceOpen(!!voiceOpen);
    if (voiceOpen) setAllowed(true);
  }, [voiceOpen]);

  /* ── التحدّث ── */
  async function toggleMic() {
    const m = managerRef.current;
    if (!m) return;
    if (micOn) { await m.disableMic(); return; }
    const res = await m.enableMic();
    if (res === "denied") setMicDenied(true);
    else setMicDenied(false);

    /* فتح الميكروفون جوابٌ عن رفع اليد، فتُخفض من نفسها. وإبقاؤها
       مرفوعة بعد أن أُعطيت الكلمة يجعل الطابور يكذب على الأستاذ. */
    if (res === "ok" && user) {
      void remove(ref(rtdb, `roomLive/${roomId}/hands/${user.uid}`));
      const ls = m.getLocalStream();
      if (ls) {
        monitors.current[user.uid]?.();
        monitors.current[user.uid] = monitorLevel(ls, (sp) =>
          setSpeaking((p) => ({ ...p, [user.uid]: sp })),
        );
      }
    }
  }

  /* ── بطاقة الصوت العائمة (PIP) ──
     من الصورة المرجعية: بطاقة صغيرة تطفو فوق المحتوى تُظهر من يتحدّث
     الآن. بُنيت **هنا** عمداً لا كمكوّن منفصل: حالة الصوت (المشاركون،
     من يتحدّث، الاتصال) تعيش في هذا المكوّن، ومكوّن مستقلّ كان سيحتاج
     VoiceManager ثانياً — أي اتصال WebRTC ثانياً لكل طالب.

     تظهر فقط حين: انضممنا فعلاً + هناك متحدّث + اللوحة الموسّعة مغلقة
     (وإلّا كرّرنا المعلومة نفسها مرّتين على الشاشة). */
  /* ── ارتفاع الشريط يُعلَن للواجهة ──
     الزرّ العائم كان يرتفع 84 بكسل **مخمّنة**، وارتفاع هذا الشريط يتغيّر
     (منضمّ / غير منضمّ / لوحة موسّعة) فيتراكبان على الهاتف.
     الآن يقيس الشريط نفسه ويكتب ارتفاعه في متغيّر CSS، فيتبعه كل ما
     يطفو فوقه بدقّة مهما تغيّر. */
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el || embedded) return;   // مُدمَجاً: لا يُعلن ارتفاعاً، فلا شيء يطفو فوقه
    const publish = () =>
      document.documentElement.style.setProperty("--bz-voicebar-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--bz-voicebar-h");
    };
  }, [embedded]);

  const speakerUid = listening
    ? participants.find((p) => speaking[p.uid] && p.micOn)?.uid ?? null
    : null;
  const speaker = speakerUid ? participants.find((p) => p.uid === speakerUid) ?? null : null;

  return (
   <div ref={barRef} className={embedded ? "flex items-center" : "bz-voicebar border-t border-border bg-surface"}>
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} onBlocked={() => setAudioBlocked(true)} />
      ))}

      {/* الصوت محجوب ⇒ لمسة واحدة تفكّه. الصمت بلا تفسير أسوأ من
          زرٍّ إضافي. */}
      {/* اتصال الصوت سقط: يُقال صراحةً بدل صمتٍ يُفسَّر خطأً */}
      {connLost && listening && (
        <button
          onClick={() => window.location.reload()}
          className="fixed z-[10046] rounded-full bg-danger px-3 py-2 text-[11px] font-extrabold text-white shadow-lg"
          style={{ insetInlineStart: "12px", bottom: "calc(env(safe-area-inset-bottom, 0px) + 122px)" }}
        >
          انقطع الصوت — أعد الاتصال
        </button>
      )}

      {audioBlocked && listening && (
        <button
          onClick={() => {
            document.querySelectorAll("audio").forEach((a) => { void a.play().catch(() => {}); });
            setAudioBlocked(false);
          }}
          className="fixed z-[10046] rounded-full bg-[var(--bz-blue)] px-3 py-2 text-[11px] font-extrabold text-white shadow-lg"
          style={{
            insetInlineStart: "12px",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)",
          }}
        >
          🔊 اضغط لسماع الغرفة
        </button>
      )}

      {speaker && !expanded && (
        <div
          className="bz-pip pointer-events-none fixed z-[10040] flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 62px)",
            insetInlineEnd: "12px",
            background: "var(--bz-surface, #fff)",
            borderColor: "var(--bz-line)",
          }}
        >
          <span className="relative grid h-7 w-7 place-items-center">
            <LiveAvatar uid={speaker.uid} name={speaker.name || "ط"} size="md" className="h-7 w-7" />
            <span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 2px var(--bz-green)" }}
            />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[110px] truncate text-[10.5px] font-bold leading-tight text-[var(--bz-ink)]">
              {speaker.uid === user?.uid ? "أنت" : speaker.name}
            </span>
            <span className="block text-[9px] font-bold leading-tight text-[var(--bz-green)]">
              يتحدّث الآن
            </span>
          </span>
          {/* موجة صغيرة — إشارة بصرية أنّ الصوت حيّ، لا مجرّد اسم ثابت */}
          <span className="flex items-end gap-[2px]" aria-hidden="true">
            <span className="bz-wave-1 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 5 }} />
            <span className="bz-wave-2 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 10 }} />
            <span className="bz-wave-3 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 7 }} />
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          لوحة المشاركين — وأين كانت مفقودة

          🐛 **المالك لم يكن يملك أيّ وسيلة لفتح ميكروفون منضمّ.**
          والقدرة موجودة في مدير الصوت منذ البداية،
          لكنّ زرّها كان محبوساً خلف شرطين لا يتحقّقان:

            الزرّ الذي يفتح اللوحة:  `${embedded ? "hidden" : "flex"}`
            اللوحة نفسها:           `{joined && expanded && !embedded}`

          ومنذ أن صار شريط الصوت يعيش **داخل** شريط التحكّم (أي
          `embedded` دائماً) صار الشرطان كاذبين دائماً. فاختفت اللوحة
          من الواجهة كلّها بلا أن يحذفها أحد.

          والنتيجة أنّ المنضمّين يدخلون مكتومين افتراضياً (`initialMuted
          = !isOwner`) ولا سبيل إلى فتحهم — إلّا لمن رفع يده، ولأوّل
          رافعٍ فقط، من زرٍّ في رفّ الصفّ. أي أنّ **الصوت الجماعي كان
          معطّلاً عملياً**.

          اللوحة الآن تعمل في الوضعين: ورقةً سفلية فوق المحتوى حين
          يكون الشريط مُدمَجاً، وكما كانت حين لا يكون.
          ════════════════════════════════════════════════════════════ */}
      {listening && expanded && embedded && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[2147483601]"
          onClick={() => setExpanded(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-[var(--bz-ink)]">
                الصوت — {participants.length} مشارك
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-lg px-2 py-1 text-[11px] font-extrabold text-[var(--bz-ink-3)]"
              >
                إغلاق
              </button>
            </div>
            {isOwner && (
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--bz-ink-3)]">
                الجميع يسمعونك الآن. ومن يريد الكلام يحتاج إذنك — أعطِه
                من الزرّ تحت اسمه، أو افتح الكلام للجميع من زرّ المجموعة
                في الشريط.
              </p>
            )}
            <VoiceRoster
              participants={participants}
              speaking={speaking}
              isOwner={isOwner}
              myUid={user?.uid}
              onToggleMute={(uid, next) => managerRef.current?.setAllowed(uid, next)}
              onKick={(uid) => managerRef.current?.ownerKick(uid)}
            />
          </div>
        </div>,
        /* 🐛 كانت تُرسم في مكانها داخل شريط التحكّم — أي داخل الغرفة.
           وفي ملء الشاشة الحقيقي لا يُرسم إلّا ما بداخل العنصر
           الممتلئ، فتختفي لوحة الميكروفونات في وضع التركيز تحديداً:
           الوضع الذي يشرح فيه الأستاذ ويحتاج أن يُعطي الكلمة. */
        getFullscreenHost(),
      )}

      {listening && expanded && !embedded && (
        <div className="max-h-48 overflow-y-auto p-3" style={{ borderBottom: "1px solid var(--bz-border)" }}>
          <VoiceRoster
            participants={participants}
            speaking={speaking}
            isOwner={isOwner}
            myUid={user?.uid}
            onToggleMute={(uid, next) => managerRef.current?.setAllowed(uid, next)}
            onKick={(uid) => managerRef.current?.ownerKick(uid)}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          الشريط المضغوط

          🐛 كان أوّل ما فيه زرّ «انضمّ صوتياً» — وهو خلطٌ بين فعلين:
          يطلب إذن الميكروفون ممّن يريد أن يسمع فقط، ويجعل الاستماع
          قراراً بدل أن يكون الحالة الطبيعية.

          الآن: مؤشّرٌ يقول إنّك تسمع (لا زرّ — لا شيء لتفعله)، وزرّ
          ميكروفون واحد هو القرار الوحيد الباقي للمستخدم.
          ════════════════════════════════════════════════════════ */}
      <div className={embedded ? "flex items-center gap-1.5" : "flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4"}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={`من في الصوت (${participants.length})`}
          title="من في الصوت والميكروفونات"
          className={`flex items-center gap-1.5 rounded-lg font-semibold text-text-muted transition hover:bg-primary/10 ${
            embedded ? "h-9 px-2 text-[11px]" : "px-2 py-1.5 text-sm"
          }`}
        >
          {connecting ? (
            <FontAwesomeIcon icon={faPhone} className="h-3 w-3 animate-pulse" />
          ) : (
            <span className="bz-live-dot" />
          )}
          {embedded
            ? participants.length
            : connecting
              ? "جارٍ الاتصال بالصوت..."
              : `في الصوت (${participants.length})`}
        </button>

        <div className="flex items-center gap-2">
          {/* الحدّ الذي لا يتجاوزه كود: لا يُفتح ميكروفون بلا إذن من
              المتصفّح نفسه. فحين يأذن الأستاذ لمن لم يسبق أن سمح،
              نطلب منه ضغطةً واحدة بدل صمتٍ لا يُفسَّر. */}
          {!isOwner && allowed && !micOn && (
            <span className="hidden text-[11px] font-bold text-[var(--bz-green)] sm:inline">
              لك الكلمة — افتح ميكروفونك
            </span>
          )}
          {!isOwner && !allowed && (
            <span className="hidden text-[11px] sm:inline" style={{ color: "var(--bz-text-muted)" }}>
              ارفع يدك لتطلب الكلمة
            </span>
          )}

          <button
            onClick={() => void toggleMic()}
            disabled={!listening || (!isOwner && !allowed)}
            className={`grid place-items-center rounded-full transition active:scale-95 ${
              embedded ? "h-10 w-10" : "h-11 w-11"
            } ${
              micOn
                ? "bg-[var(--bz-green)] text-white"
                : allowed || isOwner
                  ? "bg-secondary/15 text-secondary"
                  : "bg-[var(--bz-canvas)] text-[var(--bz-ink-3)] opacity-70"
            }`}
            aria-label={micOn ? "أغلق ميكروفوني" : "افتح ميكروفوني"}
            title={
              !isOwner && !allowed
                ? "المعلّم يمنح الكلمة — ارفع يدك"
                : micOn
                  ? "أغلق ميكروفوني"
                  : "افتح ميكروفوني"
            }
          >
            <FontAwesomeIcon icon={micOn ? faMicrophone : faMicrophoneSlash} className="h-4 w-4" />
          </button>

          {/* مفتاح الغرفة كلّها — للمالك وحده.
              الافتراض «لا أحد يتكلّم إلّا بإذن» يناسب صفّاً من ثلاثين،
              ولا يناسب مراجعةً بين أربعة. فالقرار لصاحب الغرفة لا
              لنا: مفتاحٌ واحد يقلب القاعدة. */}
          {isOwner && onToggleVoiceOpen && (
            <button
              onClick={() => onToggleVoiceOpen(!voiceOpen)}
              className={`grid place-items-center rounded-full transition active:scale-95 ${
                embedded ? "h-10 w-10" : "h-11 w-11"
              } ${voiceOpen ? "bg-[var(--bz-amber)] text-white" : "bg-[var(--bz-canvas)] text-[var(--bz-ink-3)]"}`}
              aria-label={voiceOpen ? "أوقف الكلام الحرّ" : "اسمح للجميع بالكلام"}
              title={
                voiceOpen
                  ? "الكلام مفتوح للجميع — اضغط للعودة إلى الإذن"
                  : "اسمح للجميع بالكلام بلا إذن"
              }
            >
              <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* رفض المتصفّح الميكروفون: يُقال أين يُصلَح، لا «حدث خطأ» */}
      {micDenied && (
        <div
          role="alert"
          className="fixed inset-x-3 z-[2147483602] rounded-xl border border-danger/40 bg-surface px-3 py-2 text-[11px] font-bold leading-relaxed text-text-primary shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)" }}
        >
          المتصفّح منع الميكروفون. افتح إعدادات الموقع (أيقونة القفل بجانب
          العنوان) واسمح بالميكروفون، ثمّ حاول ثانيةً. الاستماع يعمل في
          كل الأحوال.
          <button onClick={() => setMicDenied(false)} className="mt-1.5 block text-[11px] font-extrabold text-primary">
            حسناً
          </button>
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   قائمة المشاركين وأدوات الميكروفون

   استُخرجت من داخل اللوحة إلى مكوّن واحد لأنّها تُعرض الآن في
   موضعين (ورقة سفلية في الوضع المُدمَج، ولوحة داخلية في غيره).
   ونسختان من أزرار الصلاحيات تفترقان مع أوّل تعديل — وهذا نوع من
   الازدواج تحديداً لا يُحتمل: زرٌّ يفتح ميكروفوناً في مكان ولا يفتحه
   في آخر.
   ════════════════════════════════════════════════════════════ */
function VoiceRoster({
  participants, speaking, isOwner, myUid, onToggleMute, onKick,
}: {
  participants: VoiceParticipant[];
  speaking: Record<string, boolean>;
  isOwner: boolean;
  myUid?: string;
  onToggleMute: (uid: string, next: boolean) => void;
  onKick: (uid: string) => void;
}) {
  if (participants.length === 0) {
    return (
      <p className="py-4 text-center text-[11px] font-bold text-[var(--bz-ink-3)]">
        لا أحد في الصوت بعد.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {participants.map((p) => {
        const isMe = p.uid === myUid;
        const isAllowed = !!p.allowed;
        const isLive = !!p.micOn;
        const isSpeaking = speaking[p.uid] && isLive;
        return (
          <div key={p.uid} className="flex flex-col items-center text-center">
            <div className={`relative rounded-full ${isSpeaking ? "ring-2 ring-emerald-400" : ""}`}>
              <LiveAvatar uid={p.uid} name={p.name || "ط"} size="md" className="h-12 w-12" />
              {/* ثلاث حالات لا اثنتان: يتكلّم الآن · له الإذن ولم يفتح ·
                  لا إذن له. دمجُها في «مكتوم/غير مكتوم» كان يُخفي عن
                  الأستاذ من ينتظر إذنه ومن أُذن له ولم يتكلّم بعد. */}
              <span
                className={`absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-[var(--bz-surface)] ${
                  isLive
                    ? "bg-[var(--bz-green)] text-white"
                    : isAllowed
                      ? "bg-[var(--bz-blue)] text-white"
                      : "bg-[#13151f] text-danger"
                }`}
                title={isLive ? "يتكلّم الآن" : isAllowed ? "له الإذن — لم يفتح ميكروفونه" : "لا إذن له"}
              >
                <FontAwesomeIcon icon={isLive || isAllowed ? faMicrophone : faMicrophoneSlash} className="h-2.5 w-2.5" />
              </span>
            </div>
            <span className="mt-1.5 max-w-[4.5rem] truncate text-[10px] font-medium" style={{ color: "var(--bz-text-muted)" }}>
              {p.name}{isMe && " (أنت)"}
            </span>
            {isOwner && !isMe && (
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => onToggleMute(p.uid, !isAllowed)}
                  /* 44px هدف لمس: هذا الزرّ هو الطريق الوحيد إلى
                     مشاركة الطالب بصوته، وزرٌّ 24px يصعب إصابته يعني
                     ميزةً مفقودة عملياً. */
                  className={`grid h-11 w-11 place-items-center rounded-lg transition ${
                    isAllowed ? "bg-secondary/15 text-secondary" : "bg-[var(--bz-blue)] text-white"
                  }`}
                  aria-label={isAllowed ? `اسحب الإذن من ${p.name}` : `أعطِ الكلمة لـ${p.name}`}
                  title={isAllowed ? "اسحب الإذن" : "أعطِ الكلمة"}
                >
                  <FontAwesomeIcon icon={isAllowed ? faMicrophoneSlash : faMicrophone} className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onKick(p.uid)}
                  className="grid h-11 w-11 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`إخراج ${p.name} من الصوت`}
                  title="إخراج من الصوت"
                >
                  <FontAwesomeIcon icon={faUserSlash} className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
