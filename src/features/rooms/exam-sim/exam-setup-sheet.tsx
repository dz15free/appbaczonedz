"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft, faShuffle, faLink, faListUl, faGraduationCap,
  faClock, faPlay, faArrowRight, faCircleInfo, faShieldHalved,
  faVolumeHigh, faExpand, faCheck, faSpinner, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  examData, SPECIALTY_KEYS, examPool, formatSimDuration, toPreviewUrl,
  SOURCE_LABEL, type SimExam, type SimSubject,
} from "@/features/rooms/exam-sim/exam-data";
import { startExam, type ExamGuardOpts } from "@/features/rooms/exam-sim/exam-session";
import { primeAudio } from "@/features/rooms/exam-sim/exam-guard";

/* ════════════════════════════════════════════════════════════
   إعداد المحاكاة — للأستاذ

   الخطوات هي خطوات المحاكي نفسها بالترتيب نفسه: شعبة ← مادّة ← مصدر
   الموضوع (مكتبة · عشوائي · رابط مخصّص) ← مراجعة وبدء. الأستاذ الذي
   جرّب المحاكي يجد ما اعتاده، ولا قائمة مواد ولا شُعب جديدة.

   وما أُضيف للغرفة وحدها: المدّة قابلة للتعديل قبل البدء (الأصل مدّة
   المادّة الرسمية)، وخيار قبول التسليم المتأخّر — لأنّ الحصّة ليست
   قاعة رسمية، وقد ينقطع إنترنت طالب.
════════════════════════════════════════════════════════════ */

type Step = "spec" | "subject" | "source" | "list" | "custom" | "review";

export function ExamSetupSheet({
  roomId, open, onClose, teacherUid,
}: {
  roomId: string;
  open: boolean;
  onClose: () => void;
  teacherUid: string;
}) {
  const [step, setStep] = useState<Step>("spec");
  const [specKey, setSpecKey] = useState<string>("");
  const [subject, setSubject] = useState<SimSubject | null>(null);
  const [exam, setExam] = useState<SimExam | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customSol, setCustomSol] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [duration, setDuration] = useState(0);
  const [guard, setGuard] = useState<ExamGuardOpts>({ fs: true, ac: true, sfx: true });
  const [allowLate, setAllowLate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pool = useMemo(() => examPool(subject), [subject]);

  function reset() {
    setStep("spec"); setSpecKey(""); setSubject(null); setExam(null);
    setCustomUrl(""); setCustomSol(""); setCustomLabel(""); setDuration(0); setErr("");
  }

  function pickSpec(key: string) {
    setSpecKey(key);
    setSubject(null);
    setStep("subject");
  }

  function pickSubject(s: SimSubject) {
    setSubject(s);
    setDuration(s.duration);
    setStep("source");
  }

  function pickExam(e: SimExam) {
    setExam(e);
    setDuration(e.duration || subject?.duration || 60);
    setStep("review");
  }

  function pickRandom() {
    if (!pool.length) { setErr("لا توجد مواضيع متاحة لهذه المادّة حالياً."); return; }
    const e = pool[Math.floor(Math.random() * pool.length)];
    pickExam(e);
  }

  function useCustom() {
    const u = customUrl.trim();
    if (!u) { setErr("أدخل رابط الموضوع."); return; }
    if (!/^https?:\/\//i.test(u)) { setErr("استعمل رابطاً كاملاً يبدأ بـ https://"); return; }
    setErr("");
    setExam({
      label: customLabel.trim() || "موضوع مخصّص",
      source: "custom",
      examUrl: toPreviewUrl(u),
      solutionUrl: customSol.trim() ? toPreviewUrl(customSol) : null,
      duration: subject?.duration ?? 120,
    });
    setDuration(subject?.duration ?? 120);
    setStep("review");
  }

  async function begin() {
    if (!exam || !subject || !specKey || busy) return;
    setBusy(true);
    setErr("");
    try {
      primeAudio();   // تفعيل الصوت داخل نقرة المستخدم — تقيّده المتصفّحات
      await startExam(roomId, {
        specialtyKey: specKey,
        specialtyLabel: examData[specKey]?.label ?? specKey,
        subjectName: subject.name,
        examLabel: exam.label,
        examUrl: exam.examUrl,
        solutionUrl: exam.solutionUrl ?? null,
        source: exam.source ?? "main",
        durationMin: duration,
        guard,
        allowLate,
        createdBy: teacherUid,
      });
      reset();
      onClose();
    } catch {
      setErr("تعذّر بدء المحاكاة — تحقّق من اتصالك ومن صلاحياتك على الغرفة.");
    } finally { setBusy(false); }
  }

  const back: Record<Step, Step | null> = {
    spec: null, subject: "spec", source: "subject",
    list: "source", custom: "source", review: "source",
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="🎓 محاكاة البكالوريا" maxHeight="90vh">
      <div className="pb-3">
        {/* شريط المسار */}
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
          {back[step] && (
            <button
              onClick={() => { setErr(""); setStep(back[step] as Step); }}
              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-text-muted transition hover:border-primary hover:text-primary"
            >
              <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" /> رجوع
            </button>
          )}
          <span className="truncate">
            {examData[specKey]?.label ?? "اختر الشعبة"}
            {subject ? ` · ${subject.name}` : ""}
            {exam ? ` · ${exam.label}` : ""}
          </span>
        </div>

        {err && (
          <p className="mb-2.5 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] font-bold text-danger">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" /> {err}
          </p>
        )}

        {/* ══ الشعبة ══ */}
        {step === "spec" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SPECIALTY_KEYS.map((k) => {
              const sp = examData[k];
              return (
                <button
                  key={k}
                  onClick={() => pickSpec(k)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-right transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: sp.color }}
                    >
                      <FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-extrabold text-text-primary">{sp.label}</span>
                      <span className="block text-[11px] text-text-muted">{sp.subjects.length} مواد</span>
                    </span>
                  </span>
                  <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 shrink-0 text-text-muted" />
                </button>
              );
            })}
          </div>
        )}

        {/* ══ المادّة ══ */}
        {step === "subject" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(examData[specKey]?.subjects ?? []).map((s) => (
              <button
                key={s.name}
                onClick={() => pickSubject(s)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-right transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-extrabold text-text-primary">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                    <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" />
                    {formatSimDuration(s.duration)}
                    <span className="mx-1 opacity-40">·</span>
                    {examPool(s).length} موضوعاً
                  </span>
                </span>
                <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 shrink-0 text-text-muted" />
              </button>
            ))}
          </div>
        )}

        {/* ══ مصدر الموضوع ══ */}
        {step === "source" && (
          <div className="space-y-2.5">
            <SourceCard
              icon={faListUl}
              title="اختر من مكتبة المواضيع"
              hint={`${pool.length} موضوعاً متاحاً لهذه المادّة`}
              onClick={() => { setErr(""); setStep("list"); }}
              disabled={pool.length === 0}
            />
            <SourceCard
              icon={faShuffle}
              title="موضوع عشوائي"
              hint="اترك الاختيار للحظّ — كما في المحاكي"
              onClick={pickRandom}
              disabled={pool.length === 0}
            />
            <SourceCard
              icon={faLink}
              title="رابط مخصّص"
              hint="موضوعك أنت من Google Drive أو رابط PDF"
              onClick={() => { setErr(""); setStep("custom"); }}
            />
          </div>
        )}

        {/* ══ قائمة المواضيع ══ */}
        {step === "list" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pool.map((e, i) => (
              <button
                key={`${e.label}-${i}`}
                onClick={() => pickExam(e)}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 text-right transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                    {SOURCE_LABEL[e.source ?? ""] ?? "إضافي"}
                  </span>
                  <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 text-text-muted" />
                </span>
                <span className="text-[13px] font-extrabold leading-snug text-text-primary">{e.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ══ رابط مخصّص ══ */}
        {step === "custom" && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-extrabold text-text-primary">اسم الموضوع</span>
              <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="مثال: اختبار الفصل الثاني" maxLength={120}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[13.5px] outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-extrabold text-text-primary">رابط الموضوع *</span>
              <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} dir="ltr"
                placeholder="https://drive.google.com/file/d/…/view"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-extrabold text-text-primary">رابط التصحيح (اختياري)</span>
              <input value={customSol} onChange={(e) => setCustomSol(e.target.value)} dir="ltr"
                placeholder="https://drive.google.com/file/d/…/view"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs outline-none focus:border-primary" />
            </label>
            <p className="flex items-start gap-1.5 rounded-xl bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              اجعل صلاحية ملفّ Drive «أي شخص لديه الرابط — مُشاهِد»، وإلّا رأى الطلبة صفحة طلب إذن
              بدل الموضوع.
            </p>
            <button onClick={useCustom}
              className="w-full rounded-2xl bg-gradient-primary py-3 text-[13.5px] font-extrabold text-white">
              متابعة
            </button>
          </div>
        )}

        {/* ══ المراجعة والبدء ══ */}
        {step === "review" && exam && subject && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-3.5">
              <p className="text-[11px] font-bold text-text-muted">الموضوع المختار</p>
              <p className="mt-0.5 text-[14px] font-extrabold text-text-primary">{exam.label}</p>
              <p className="mt-1 text-[11.5px] text-text-muted">
                {examData[specKey]?.label} · {subject.name}
                {exam.solutionUrl ? " · التصحيح متوفّر" : ""}
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-[12px] font-extrabold text-text-primary">مدّة الامتحان (دقيقة)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={600} inputMode="numeric"
                  value={duration || ""}
                  onChange={(e) => setDuration(Number(e.target.value) || 0)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[13.5px] outline-none focus:border-primary"
                />
                <span className="shrink-0 rounded-xl bg-primary/10 px-3 py-2.5 text-[12px] font-extrabold text-primary">
                  {formatSimDuration(duration)}
                </span>
              </div>
              <span className="mt-1 block text-[11px] text-text-muted">
                المدّة الرسمية لهذه المادّة {formatSimDuration(subject.duration)} — عدّلها إن أردت حصّة أقصر.
              </span>
            </label>

            <div className="space-y-2 rounded-2xl border border-border bg-background p-3">
              <p className="text-[12px] font-extrabold text-text-primary">إعدادات قاعة الامتحان</p>
              <GuardToggle icon={faExpand} label="فرض ملء الشاشة"
                hint="يُغلق كل ما حول الامتحان على جهاز الطالب"
                on={guard.fs} onToggle={() => setGuard((g) => ({ ...g, fs: !g.fs }))} />
              <GuardToggle icon={faShieldHalved} label="رصد مغادرة الشاشة"
                hint="يُسجَّل عدد محاولات الخروج مع ورقة الطالب"
                on={guard.ac} onToggle={() => setGuard((g) => ({ ...g, ac: !g.ac }))} />
              <GuardToggle icon={faVolumeHigh} label="أجواء القاعة الصوتية"
                hint="جرس البداية وتكّة آخر خمس دقائق"
                on={guard.sfx} onToggle={() => setGuard((g) => ({ ...g, sfx: !g.sfx }))} />
              <GuardToggle icon={faClock} label="قبول التسليم المتأخّر"
                hint="يُسمح بالتسليم بعد انتهاء الوقت ويُعلَّم كمتأخّر"
                on={allowLate} onToggle={() => setAllowLate((v) => !v)} />
            </div>

            <p className="flex items-start gap-1.5 rounded-xl bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              عند البدء تنتقل الغرفة إلى وضع الامتحان: تُغلق الدردشة ويرى الطلبة قاعة الامتحان.
              أدوات الغرفة كلّها تعود كما هي عند إنهاء المحاكاة.
            </p>

            <button
              onClick={begin}
              disabled={busy || !duration}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-[14px] font-extrabold text-white shadow-glow transition disabled:opacity-50"
            >
              <FontAwesomeIcon icon={busy ? faSpinner : faPlay} className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              {busy ? "جارٍ بدء المحاكاة…" : "بدء الامتحان"}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function SourceCard({
  icon, title, hint, onClick, disabled,
}: {
  icon: typeof faListUl; title: string; hint: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-right transition hover:border-primary hover:bg-primary/5 active:scale-[0.99] disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-surface"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-extrabold text-text-primary">{title}</span>
          <span className="block truncate text-[11px] text-text-muted">{hint}</span>
        </span>
      </span>
      <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 shrink-0 text-text-muted" />
    </button>
  );
}

function GuardToggle({
  icon, label, hint, on, onToggle,
}: {
  icon: typeof faExpand; label: string; hint: string; on: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-right transition hover:border-primary/40"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? "bg-primary/10 text-primary" : "bg-border text-text-muted"}`}>
        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-extrabold text-text-primary">{label}</span>
        <span className="block text-[10.5px] leading-snug text-text-muted">{hint}</span>
      </span>
      <span className={`grid h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${on ? "bg-primary" : "bg-border"}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform ${on ? "-translate-x-5" : "translate-x-0"}`}>
          {on && <FontAwesomeIcon icon={faCheck} className="h-2 w-2 text-primary" />}
        </span>
      </span>
    </button>
  );
}
