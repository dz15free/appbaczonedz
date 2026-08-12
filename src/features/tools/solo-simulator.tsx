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
  faExpand,
  faFileCircleCheck,
  faGraduationCap,
  faLightbulb,
  faPlay,
  faRotateLeft,
  faShieldHalved,
  faStop,
  faTriangleExclamation,
  faVolumeHigh,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { SPECIALTY_KEYS, specialty, subjectsOf, examPool, type SimExam, type SimSubject } from "@/features/rooms/exam-sim/exam-data";
import { bellEnd, bellStart, primeAudio, useExamGuard, integrityReport } from "@/features/rooms/exam-sim/exam-guard";

 type Phase = "setup" | "running" | "done";
const MIN_LEFT_WARN = 300;

function formatTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pledge, setPledge] = useState({ focus: false, honesty: false });
  const [guardOpts, setGuardOpts] = useState({ fs: true, ac: true, sfx: true });
  const stageRef = useRef<HTMLElement | null>(null);
  const rang = useRef(false);

  const spec = useMemo(() => specialty(specKey), [specKey]);
  const subjects = useMemo(() => subjectsOf(specKey), [specKey]);
  const subject: SimSubject | undefined = subjects[subjectIdx];
  const pool = useMemo(() => examPool(subject), [subject]);
  const exam: SimExam | undefined = pool[examIdx];
  const minutes = exam?.duration ?? subject?.duration ?? 120;
  const totalSeconds = minutes * 60;
  const progress = phase === "running" ? Math.max(0, Math.min(100, (left / totalSeconds) * 100)) : 0;
  const guard = useExamGuard({
    active: phase === "running",
    opts: guardOpts,
    secondsLeft: left,
    stageRef,
  });
  const report = integrityReport(guard.violations, guardOpts.ac);
  const timeSpent = startedAt && finishedAt ? formatTime(Math.max(0, Math.floor((finishedAt - startedAt) / 1000))) : "—";
  const canStart = pledge.focus && pledge.honesty;

  useEffect(() => {
    if (phase !== "running" || !endsAt) return;
    const tick = () => {
      const remaining = Math.round((endsAt - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !rang.current) {
        rang.current = true;
        setFinishedAt(Date.now());
        setIsTimeUp(true);
        try { if (guardOpts.sfx) bellEnd(); } catch { /* الصوت مساعد فقط */ }
        setPhase("done");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, endsAt, guardOpts.sfx]);

  useEffect(() => {
    if (phase !== "running") return;
    const onLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

  function start() {
    if (!exam || !canStart) return;
    try { primeAudio(); if (guardOpts.sfx) bellStart(); } catch { /* غير حرج */ }
    rang.current = false;
    setShowSolution(false);
    setIsTimeUp(false);
    setConfirmOpen(false);
    const now = Date.now();
    setStartedAt(now);
    setFinishedAt(null);
    setEndsAt(now + minutes * 60_000);
    setLeft(totalSeconds);
    setPhase("running");
  }

  function requestFinish() {
    if (phase === "running") setConfirmOpen(true);
  }

  function completeExam(auto = false) {
    rang.current = true;
    setConfirmOpen(false);
    setFinishedAt(Date.now());
    setIsTimeUp(auto);
    setPhase("done");
  }

  function reset() {
    setPhase("setup");
    setEndsAt(null);
    setStartedAt(null);
    setFinishedAt(null);
    setLeft(0);
    setIsTimeUp(false);
    setShowSolution(false);
    setConfirmOpen(false);
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bz-ink-3)]">قاعة امتحان افتراضية</p>
            <h2 className="font-display text-lg font-extrabold text-[var(--bz-ink)]">عش تجربة امتحان حقيقية</h2>
          </div>
        </div>

        <div className="bz-sim-section">
          <div className="mb-2 flex items-center gap-2"><span className="bz-sim-section-no">01</span><p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر شعبتك</p></div>
          <div className="bz-sim-specs">
            {SPECIALTY_KEYS.map((key) => {
              const item = specialty(key);
              if (!item) return null;
              const selected = key === specKey;
              return (
                <button key={key} onClick={() => { setSpecKey(key); setSubjectIdx(0); setExamIdx(0); }} className={`bz-sim-spec ${selected ? "is-selected" : ""}`} style={selected ? { background: item.color, borderColor: item.color } : undefined} aria-pressed={selected}>
                  <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5" />{item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bz-sim-section">
          <div className="mb-2 flex items-center gap-2"><span className="bz-sim-section-no">02</span><p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر المادة</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((item, index) => {
              const selected = index === subjectIdx;
              return (
                <button key={item.name} onClick={() => { setSubjectIdx(index); setExamIdx(0); }} className={`bz-sim-subject ${selected ? "is-selected" : ""}`} style={selected ? { borderColor: spec?.color, background: `${spec?.color}10` } : undefined} aria-pressed={selected}>
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
            <div className="mb-2 flex items-center gap-2"><span className="bz-sim-section-no">03</span><p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر الموضوع</p></div>
            <div className="space-y-2">
              {pool.map((item, index) => {
                const selected = index === examIdx;
                return <button key={`${item.label}-${index}`} onClick={() => setExamIdx(index)} className={`bz-sim-exam-option ${selected ? "is-selected" : ""}`} style={selected ? { borderColor: spec?.color, background: `${spec?.color}10` } : undefined} aria-pressed={selected}>
                  <span className="min-w-0 flex-1 text-start"><span className="block truncate text-[12.5px] font-extrabold">{item.label}</span><span className="mt-1 block text-[10.5px] text-[var(--bz-ink-3)]">{item.source === "nafi" ? "موضوع إضافي من بنك المحاكاة" : "موضوع امتحان متاح للمحاكاة"}</span></span>
                  {item.solutionUrl && <span className="bz-sim-solution-tag">مع الحلّ</span>}
                  {selected && <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 shrink-0" style={{ color: spec?.color }} />}
                </button>;
              })}
            </div>
          </div>
        )}

        <div className="bz-sim-brief" style={{ borderColor: `${spec?.color ?? "#2350D9"}44` }}>
          <div className="flex items-start gap-3"><span className="bz-sim-brief-icon" style={{ color: spec?.color, background: `${spec?.color ?? "#2350D9"}12` }}><FontAwesomeIcon icon={faClock} className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[12.5px] font-extrabold text-[var(--bz-ink)]">{subject?.name}</p><p className="mt-1 text-[12px] leading-relaxed text-[var(--bz-ink-2)]">المدة الرسمية: <strong>{Math.floor(minutes / 60)} ساعات {minutes % 60 ? `و${minutes % 60} دقيقة` : ""}</strong>. يبدأ المؤقت عند الضغط على زر البدء.</p></div></div>
        </div>

        <div className="bz-sim-pledge">
          <div className="flex items-center gap-2"><FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-amber-500" /><p className="text-[13px] font-extrabold text-[var(--bz-ink)]">تعهد قاعة الامتحان</p></div>
          <label><input type="checkbox" checked={pledge.focus} onChange={(e) => setPledge((v) => ({ ...v, focus: e.target.checked }))} /><span>سأحافظ على تركيزي ولن أفتح تبويباً آخر أثناء المحاكاة.</span></label>
          <label><input type="checkbox" checked={pledge.honesty} onChange={(e) => setPledge((v) => ({ ...v, honesty: e.target.checked }))} /><span>أفهم أن تقرير النزاهة للتدريب فقط، وسأتعامل مع الموضوع كاختبار حقيقي.</span></label>
          <div className="bz-sim-options">
            <label><input type="checkbox" checked={guardOpts.fs} onChange={(e) => setGuardOpts((v) => ({ ...v, fs: e.target.checked }))} /><FontAwesomeIcon icon={faExpand} className="h-3 w-3" />ملء الشاشة</label>
            <label><input type="checkbox" checked={guardOpts.ac} onChange={(e) => setGuardOpts((v) => ({ ...v, ac: e.target.checked }))} /><FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />المراقبة</label>
            <label><input type="checkbox" checked={guardOpts.sfx} onChange={(e) => setGuardOpts((v) => ({ ...v, sfx: e.target.checked }))} /><FontAwesomeIcon icon={faVolumeHigh} className="h-3 w-3" />الأصوات</label>
          </div>
        </div>

        <div className="bz-calc-actions"><button onClick={start} disabled={!canStart} className="bz-calc-go disabled:cursor-not-allowed disabled:opacity-40" style={{ background: spec?.color ?? "#2350D9" }}><FontAwesomeIcon icon={faPlay} className="me-2 h-3.5 w-3.5" /> ابدأ الامتحان</button></div>
      </section>
    );
  }

  const urgent = left <= MIN_LEFT_WARN && left > 0;
  return (
    <section ref={stageRef} className="bz-sim-stage" aria-label={phase === "running" ? "محاكاة الامتحان الجارية" : "نتيجة محاكاة الامتحان"}>
      <div className={`bz-sim-bar ${urgent ? "is-urgent" : ""} ${phase === "done" ? "is-done" : ""}`}>
        <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-extrabold">{subject?.name}</p><p className="mt-0.5 truncate text-[10.5px] text-[var(--bz-ink-3)]">{exam?.label}</p></div>
        <div className="bz-sim-clock-wrap"><FontAwesomeIcon icon={phase === "done" ? faCheck : urgent ? faTriangleExclamation : faClock} className="h-3.5 w-3.5" /><span className="bz-sim-clock">{phase === "done" ? (isTimeUp ? "انتهى الوقت" : "تم التسليم") : formatTime(left)}</span></div>
      </div>
      {phase === "running" && <div className="bz-sim-progress" aria-label={`تبقى ${Math.round(progress)} بالمئة من الوقت`}><span style={{ width: `${progress}%`, background: urgent ? "#dc2626" : spec?.color }} /></div>}

      <div className="bz-sim-exam-meta"><span><FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" /> {guardOpts.ac ? `المراقبة مفعلة · ${guard.violations} مخالفات` : "المراقبة معطلة"}</span><span>{phase === "running" ? "الامتحان جارٍ" : "جلسة منتهية"}</span></div>
      <div className="bz-sim-frame"><iframe src={phase === "done" && showSolution && exam?.solutionUrl ? exam.solutionUrl : exam?.examUrl} title={showSolution ? "ورقة الحل" : "ورقة الامتحان"} loading="lazy" allow="autoplay; fullscreen" /></div>

      {phase === "running" ? (
        <div className="bz-sim-actions">
          <button onClick={requestFinish} className="bz-sim-btn is-end"><FontAwesomeIcon icon={faStop} className="me-2 h-3.5 w-3.5" />أنهيت — أظهر الحلّ</button>
          {exam?.examUrl && <a id="exam-download-btn" href={exam.examUrl} target="_blank" rel="noopener noreferrer" onClick={() => guard.grace()} className="bz-sim-btn"><FontAwesomeIcon icon={faArrowUpRightFromSquare} className="me-2 h-3.5 w-3.5" />فتح الموضوع منفرداً</a>}
        </div>
      ) : (
        <>
          <div className={`bz-sim-result ${report.tone === "bad" ? "is-bad" : "is-ok"}`}><FontAwesomeIcon icon={report.tone === "bad" ? faTriangleExclamation : faShieldHalved} className="h-4 w-4" /><span>{report.text}</span></div>
          <div className="bz-sim-done"><p className="flex items-center gap-2 text-[13px] font-extrabold"><FontAwesomeIcon icon={faLightbulb} className="h-4 w-4 text-amber-500" />ملخص الجلسة</p><p className="mt-2 text-[12.5px] leading-relaxed text-[var(--bz-ink-2)]">استغرقت في الحل: <strong>{timeSpent}</strong>. {isTimeUp ? "انتهى الوقت الرسمي تلقائياً." : "أنهيت المحاكاة قبل انتهاء الوقت."}</p><ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--bz-ink-2)]"><li>سجّل نوع الخطأ لا العلامة فقط: نسيان قانون، خطأ حسابي، أم سوء فهم للسؤال.</li><li>أعد حلّ ما أخطأت فيه بعد يومين حتى تقيس التثبيت لا الذاكرة القصيرة.</li></ul></div>
          <div className="bz-sim-actions">{exam?.solutionUrl && <button onClick={() => setShowSolution((value) => !value)} className="bz-sim-btn is-sol"><FontAwesomeIcon icon={faEye} className="me-2 h-3.5 w-3.5" />{showSolution ? "عد إلى الموضوع" : "أظهر ورقة الحلّ"}</button>}<button onClick={reset} className="bz-sim-btn"><FontAwesomeIcon icon={faRotateLeft} className="me-2 h-3.5 w-3.5" />امتحان آخر</button></div>
          <Link href="/tools" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--bz-blue)]">بقية أدوات المراجعة <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
        </>
      )}

      {guard.alarmOpen && phase === "running" && <div className="bz-sim-alarm" role="alertdialog" aria-modal="true"><div className="bz-sim-alarm-card"><span className="bz-sim-alarm-icon"><FontAwesomeIcon icon={faTriangleExclamation} className="h-8 w-8" /></span><h3>غادرت قاعة الامتحان</h3><p>سُجّلت مخالفة: {guard.lastReason || "مغادرة الشاشة"}. عد إلى الجلسة واستأنف بهدوء.</p><p className="bz-sim-alarm-count">المخالفة رقم {guard.violations}</p><button onClick={guard.resume}>العودة إلى الامتحان</button></div></div>}
      {confirmOpen && <div className="bz-sim-confirm" role="dialog" aria-modal="true"><div className="bz-sim-confirm-card"><FontAwesomeIcon icon={faTriangleExclamation} className="h-7 w-7 text-amber-500" /><h3>تأكيد تسليم الامتحان</h3><p>هل أنت متأكد أنك تريد إنهاء المحاكاة الآن؟ ستظهر ورقة الحل إذا كانت متاحة.</p><div className="bz-sim-confirm-actions"><button onClick={() => setConfirmOpen(false)} className="bz-sim-btn">تراجع</button><button onClick={() => completeExam(false)} className="bz-sim-btn is-end">نعم، إنهاء</button></div></div></div>}
    </section>
  );
}
