"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faBookOpen,
  faCheck,
  faClock,
  faEye,
  faFileCircleCheck,
  faGraduationCap,
  faLightbulb,
  faPlay,
  faRotateLeft,
  faStop,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { SPECIALTY_KEYS, specialty, subjectsOf, examPool, type SimExam, type SimSubject } from "@/features/rooms/exam-sim/exam-data";
import { bellStart, bellEnd, primeAudio } from "@/features/rooms/exam-sim/exam-guard";

type Phase = "setup" | "running" | "done";
const MIN_LEFT_WARN = 300;

function formatTime(seconds: number): string {
  const value = Math.max(0, seconds);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${two(hours)}:${two(minutes)}:${two(secs)}` : `${two(minutes)}:${two(secs)}`;
}

export function SoloSimulator() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [specKey, setSpecKey] = useState(SPECIALTY_KEYS[0] ?? "");
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [examIdx, setExamIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const rang = useRef(false);

  const spec = useMemo(() => specialty(specKey), [specKey]);
  const subjects = useMemo(() => subjectsOf(specKey), [specKey]);
  const subject: SimSubject | undefined = subjects[subjectIdx];
  const pool = useMemo(() => examPool(subject), [subject]);
  const exam: SimExam | undefined = pool[examIdx];
  const minutes = exam?.duration ?? subject?.duration ?? 120;
  const progress = phase === "running" ? Math.max(0, Math.min(100, (left / (minutes * 60)) * 100)) : 0;

  useEffect(() => {
    if (phase !== "running" || !endsAt) return;
    const tick = () => {
      const remaining = Math.round((endsAt - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !rang.current) {
        rang.current = true;
        try { bellEnd(); } catch { /* الصوت قد يكون محظوراً */ }
        setPhase("done");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, endsAt]);

  useEffect(() => {
    if (phase !== "running") return;
    const onLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

  function start() {
    if (!exam) return;
    try { primeAudio(); bellStart(); } catch { /* غير حرج */ }
    rang.current = false;
    setShowSolution(false);
    setEndsAt(Date.now() + minutes * 60_000);
    setPhase("running");
  }

  function finish() {
    if (!window.confirm("إنهاء الامتحان الآن؟ ستظهر لك ورقة الحلّ إن كانت متاحة.")) return;
    rang.current = true;
    setPhase("done");
  }

  function reset() {
    setPhase("setup");
    setEndsAt(null);
    setLeft(0);
    setShowSolution(false);
    rang.current = false;
  }

  if (phase === "setup") {
    return (
      <section className="bz-calc bz-sim-setup" aria-label="إعداد محاكاة امتحان البكالوريا">
        <div className="bz-planner-heading">
          <span className="bz-planner-heading-icon" style={{ background: spec?.color ?? "#2350D9" }} aria-hidden>
            <FontAwesomeIcon icon={faFileCircleCheck} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bz-ink-3)]">محاكاة فردية</p>
            <h2 className="font-display text-lg font-extrabold text-[var(--bz-ink)]">جهّز جلسة امتحانك</h2>
          </div>
        </div>

        <div className="bz-sim-section">
          <div className="mb-2 flex items-center gap-2">
            <span className="bz-sim-section-no">01</span>
            <p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر شعبتك</p>
          </div>
          <div className="bz-sim-specs">
            {SPECIALTY_KEYS.map((key) => {
              const item = specialty(key);
              if (!item) return null;
              const selected = key === specKey;
              return (
                <button key={key} onClick={() => { setSpecKey(key); setSubjectIdx(0); setExamIdx(0); }}
                  className={`bz-sim-spec ${selected ? "is-selected" : ""}`}
                  style={selected ? { background: item.color, borderColor: item.color } : undefined}
                  aria-pressed={selected}>
                  <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bz-sim-section">
          <div className="mb-2 flex items-center gap-2">
            <span className="bz-sim-section-no">02</span>
            <p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر المادة</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((item, index) => {
              const selected = index === subjectIdx;
              return (
                <button key={item.name} onClick={() => { setSubjectIdx(index); setExamIdx(0); }}
                  className={`bz-sim-subject ${selected ? "is-selected" : ""}`}
                  style={selected ? { borderColor: spec?.color, background: `${spec?.color}10` } : undefined}
                  aria-pressed={selected}>
                  <span className="bz-sim-subject-icon" style={{ color: spec?.color }}><FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" /></span>
                  <span className="min-w-0 text-start"><span className="block truncate text-[12.5px] font-extrabold">{item.name}</span><span className="mt-1 block text-[11px] text-[var(--bz-ink-3)]">المدة: {Math.floor(item.duration / 60)}س {item.duration % 60 ? `${item.duration % 60}د` : ""}</span></span>
                  {selected && <FontAwesomeIcon icon={faCheck} className="ms-auto h-3.5 w-3.5 shrink-0" style={{ color: spec?.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        {pool.length > 1 && (
          <div className="bz-sim-section">
            <div className="mb-2 flex items-center gap-2">
              <span className="bz-sim-section-no">03</span>
              <p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر الموضوع</p>
            </div>
            <div className="space-y-2">
              {pool.map((item, index) => {
                const selected = index === examIdx;
                return (
                  <button key={`${item.label}-${index}`} onClick={() => setExamIdx(index)}
                    className={`bz-sim-exam-option ${selected ? "is-selected" : ""}`}
                    style={selected ? { borderColor: spec?.color, background: `${spec?.color}10` } : undefined}
                    aria-pressed={selected}>
                    <span className="min-w-0 flex-1 text-start"><span className="block truncate text-[12.5px] font-extrabold">{item.label}</span><span className="mt-1 block text-[10.5px] text-[var(--bz-ink-3)]">موضوع امتحان متاح للمحاكاة</span></span>
                    {item.solutionUrl && <span className="bz-sim-solution-tag">مع الحلّ</span>}
                    {selected && <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 shrink-0" style={{ color: spec?.color }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bz-sim-brief" style={{ borderColor: `${spec?.color ?? "#2350D9"}44` }}>
          <div className="flex items-start gap-3">
            <span className="bz-sim-brief-icon" style={{ color: spec?.color, background: `${spec?.color ?? "#2350D9"}12` }}><FontAwesomeIcon icon={faClock} className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-extrabold text-[var(--bz-ink)]">{subject?.name}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--bz-ink-2)]">المدة الرسمية: <strong>{Math.floor(minutes / 60)} ساعات {minutes % 60 ? `و${minutes % 60} دقيقة` : ""}</strong>. يبدأ المؤقت عند الضغط على زر البدء.</p>
            </div>
          </div>
        </div>

        <div className="bz-calc-actions">
          <button onClick={start} className="bz-calc-go" style={{ background: spec?.color ?? "#2350D9" }}>
            <FontAwesomeIcon icon={faPlay} className="me-2 h-3.5 w-3.5" /> ابدأ الامتحان
          </button>
        </div>
      </section>
    );
  }

  const urgent = left <= MIN_LEFT_WARN && left > 0;
  return (
    <section className="bz-sim-stage" aria-label="محاكاة الامتحان الجارية">
      <div className={`bz-sim-bar ${urgent ? "is-urgent" : ""} ${phase === "done" ? "is-done" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-extrabold">{subject?.name}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-[var(--bz-ink-3)]">{exam?.label}</p>
        </div>
        <div className="bz-sim-clock-wrap">
          <FontAwesomeIcon icon={phase === "done" ? faCheck : urgent ? faTriangleExclamation : faClock} className="h-3.5 w-3.5" />
          <span className="bz-sim-clock">{phase === "done" ? "انتهى الوقت" : formatTime(left)}</span>
        </div>
      </div>
      {phase === "running" && <div className="bz-sim-progress" aria-label={`تبقى ${Math.round(progress)} بالمئة من الوقت`}><span style={{ width: `${progress}%`, background: urgent ? "#dc2626" : spec?.color }} /></div>}

      <div className="bz-sim-frame">
        <iframe src={phase === "done" && showSolution && exam?.solutionUrl ? exam.solutionUrl : exam?.examUrl} title={showSolution ? "ورقة الحل" : "ورقة الامتحان"} loading="lazy" allow="autoplay" />
      </div>

      <div className="bz-sim-actions">
        {phase === "running" ? (
          <button onClick={finish} className="bz-sim-btn is-end"><FontAwesomeIcon icon={faStop} className="me-2 h-3.5 w-3.5" />أنهيت — أظهر الحلّ</button>
        ) : (
          <>
            {exam?.solutionUrl && <button onClick={() => setShowSolution((value) => !value)} className="bz-sim-btn is-sol"><FontAwesomeIcon icon={faEye} className="me-2 h-3.5 w-3.5" />{showSolution ? "عد إلى الموضوع" : "أظهر ورقة الحلّ"}</button>}
            <button onClick={reset} className="bz-sim-btn"><FontAwesomeIcon icon={faRotateLeft} className="me-2 h-3.5 w-3.5" />امتحان آخر</button>
          </>
        )}
      </div>

      {phase === "done" && (
        <div className="bz-sim-done">
          <p className="flex items-center gap-2 text-[13px] font-extrabold"><FontAwesomeIcon icon={faLightbulb} className="h-4 w-4 text-amber-500" />كيف تستفيد من التصحيح؟</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--bz-ink-2)]">
            <li>سجّل نوع الخطأ لا العلامة فقط: نسيان قانون، خطأ حسابي، أم سوء فهم للسؤال.</li>
            <li>أعد حلّ ما أخطأت فيه بعد يومين حتى تقيس التثبيت لا الذاكرة القصيرة.</li>
            <li>إن لم تُنهِ الموضوع في الوقت فراجع توزيع الوقت قبل مراجعة الدرس من جديد.</li>
          </ul>
          <Link href="/tools" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--bz-blue)]">بقية أدوات المراجعة <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
        </div>
      )}
    </section>
  );
}
