
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faCompress,
  faExpand,
  faMinus,
  faPlus,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import {
  SPECIALTY_KEYS,
  SOURCE_LABEL,
  examPool,
  specialty,
  subjectsOf,
  toPreviewUrl,
  type SimExam,
  type SimSubject,
} from "@/features/rooms/exam-sim/exam-data";
import {
  bellEnd,
  bellStart,
  integrityReport,
  isFullscreen,
  primeAudio,
  toggleFullscreen,
  useExamGuard,
} from "@/features/rooms/exam-sim/exam-guard";

type Phase = "setup" | "lobby" | "running" | "done";
type SetupStep = 1 | 2 | 3;
type ChoiceMode = "list" | "random" | "custom";
type GuardOptions = { fs: boolean; ac: boolean; sfx: boolean };

const MINUTES_WARNING = 300;
const SETUP_STEPS = ["الشعبة", "المادة", "الموضوع", "الاستعداد"];

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} دقيقة`;
  return rest ? `${hours} ساعات و${rest} دقيقة` : `${hours} ساعات`;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return hours ? `${two(hours)}:${two(minutes)}:${two(rest)}` : `${two(minutes)}:${two(rest)}`;
}

function sourceName(source?: string): string {
  if (!source) return "موضوع أساسي";
  return SOURCE_LABEL[source] ?? source;
}

function getInitialSubject(key: string): SimSubject | undefined {
  return subjectsOf(key)[0];
}

function subjectMark(name: string): string {
  return name.trim().slice(0, 1) || "م";
}

export function SoloSimulator() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>("list");
  const [specKey, setSpecKey] = useState(SPECIALTY_KEYS[0] ?? "");
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [examIdx, setExamIdx] = useState(0);
  const [customExam, setCustomExam] = useState<SimExam | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customSolutionUrl, setCustomSolutionUrl] = useState("");
  const [customError, setCustomError] = useState("");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leftExam, setLeftExam] = useState(false);
  const [pledge, setPledge] = useState({ phone: false, focus: false });
  const [guardOptions, setGuardOptions] = useState<GuardOptions>({ fs: true, ac: true, sfx: true });
  const [fullScreen, setFullScreen] = useState(false);
  const [paperZoom, setPaperZoom] = useState(1);
  const [randomizing, setRandomizing] = useState(false);
  const rang = useRef(false);
  const randomTimerRef = useRef<number | undefined>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => specialty(specKey), [specKey]);
  const subjects = useMemo(() => subjectsOf(specKey), [specKey]);
  const subject = subjects[subjectIdx] ?? getInitialSubject(specKey);
  const pool = useMemo(() => examPool(subject), [subject]);
  const selectedExam = customExam ?? pool[examIdx] ?? pool[0];
  const examMinutes = selectedExam?.duration ?? subject?.duration ?? 120;
  const setupProgress = phase === "setup" ? setupStep : 4;
  const guard = useExamGuard({
    active: phase === "running",
    opts: guardOptions,
    secondsLeft: left,
    stageRef,
  });

  useEffect(() => {
    if (phase !== "running" || !endsAt) return;

    const tick = () => {
      const remaining = Math.round((endsAt - Date.now()) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0 && !rang.current) {
        rang.current = true;
        try { bellEnd(); } catch { /* الصوت تحسين اختياري */ }
        setPhase("done");
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, phase]);

  useEffect(() => {
    if (phase !== "running") setFullScreen(false);
    return () => {
      if (randomTimerRef.current !== undefined) window.clearTimeout(randomTimerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const syncFullscreenState = () => setFullScreen(isFullscreen());
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [phase]);

  useEffect(() => {
    document.documentElement.classList.toggle("bz-exam-mode", phase === "running");
    return () => document.documentElement.classList.remove("bz-exam-mode");
  }, [phase]);

  function moveSetupStep(next: SetupStep) {
    setSetupStep(next);
    window.setTimeout(() => document.getElementById("bz-exam-setup")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function resetSelection(nextSpecKey: string) {
    setRandomizing(false);
    setSpecKey(nextSpecKey);
    setSubjectIdx(0);
    setExamIdx(0);
    setChoiceMode("list");
    setCustomExam(null);
    setCustomError("");
    moveSetupStep(2);
  }

  function chooseSubject(index: number) {
    setRandomizing(false);
    setSubjectIdx(index);
    setExamIdx(0);
    setChoiceMode("list");
    setCustomExam(null);
    setCustomError("");
    moveSetupStep(3);
  }

  function openLobby() {
    if (!selectedExam) return;
    setConfirmFinish(false);
    setConfirmLeave(false);
    setLeftExam(false);
    setPledge({ phone: false, focus: false });
    setPhase("lobby");
  }

  function beginExam(exam: SimExam | undefined) {
    if (!exam) return;
    try {
      primeAudio();
      if (guardOptions.sfx) bellStart();
    } catch { /* بعض المتصفحات تمنع الصوت حتى تفاعل إضافي */ }
    rang.current = false;
    setShowSolution(false);
    setLeftExam(false);
    setPaperZoom(1);
    const duration = exam.duration ?? subject?.duration ?? 120;
    const finishAt = Date.now() + duration * 60_000;
    setEndsAt(finishAt);
    setLeft(duration * 60);
    setPhase("running");
  }

  function chooseRandom() {
    if (!pool.length || randomizing) return;
    const next = Math.floor(Math.random() * pool.length);
    const nextExam = pool[next];
    setExamIdx(next);
    setCustomExam(null);
    setChoiceMode("random");
    setCustomError("");
    setRandomizing(true);
    randomTimerRef.current = window.setTimeout(() => {
      randomTimerRef.current = undefined;
      setRandomizing(false);
      setPledge({ phone: true, focus: true });
      beginExam(nextExam);
    }, 460);
  }

  function useCustomLink() {
    setCustomError("");
    try {
      const parsed = new URL(customUrl.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
      const solution = customSolutionUrl.trim() ? new URL(customSolutionUrl.trim()) : null;
      if (solution && !/^https?:$/.test(solution.protocol)) throw new Error("solution");
      const nextExam: SimExam = {
        label: "موضوع مخصّص",
        source: "custom",
        examUrl: toPreviewUrl(parsed.toString()),
        solutionUrl: solution ? toPreviewUrl(solution.toString()) : null,
        duration: subject?.duration ?? 120,
      };
      setCustomExam(nextExam);
      setChoiceMode("custom");
      setCustomError("");
    } catch {
      setCustomError("أدخل رابطًا صحيحًا يبدأ بـ https:// أو http://.");
    }
  }

  function startExam() {
    if (!selectedExam || !pledge.phone || !pledge.focus) return;
    beginExam(selectedExam);
  }

  function finishExam(timeUp = false) {
    setConfirmFinish(false);
    setConfirmLeave(false);
    setLeftExam(false);
    rang.current = true;
    if (timeUp) {
      try { bellEnd(); } catch { /* الصوت تحسين اختياري */ }
    }
    setPhase("done");
  }

  function leaveExam() {
    setConfirmLeave(false);
    setConfirmFinish(false);
    setLeftExam(true);
    setShowSolution(false);
    rang.current = true;
    setPhase("done");
  }

  function reset() {
    if (randomTimerRef.current !== undefined) window.clearTimeout(randomTimerRef.current);
    randomTimerRef.current = undefined;
    setRandomizing(false);
    setPhase("setup");
    setSetupStep(1);
    setEndsAt(null);
    setLeft(0);
    setShowSolution(false);
    setConfirmFinish(false);
    setConfirmLeave(false);
    setLeftExam(false);
    setPaperZoom(1);
    rang.current = false;
  }

  async function toggleStageFullscreen() {
    await toggleFullscreen(stageRef.current);
    setFullScreen(isFullscreen());
  }

  function renderProgress() {
    return (
      <div className="bz-vbr-progress" aria-label="مراحل دخول القاعة">
        {SETUP_STEPS.map((label, index) => (
          <span key={label} className={index < setupProgress ? "is-current" : ""}>
            <b>{index + 1}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    );
  }

  function renderTopicChoice() {
    if (choiceMode === "custom") {
      return customExam ? (
        <div className="bz-vbr-custom-selected">
          <span className="bz-vbr-state-mark">✓</span>
          <div><b>تم اعتماد رابط الموضوع</b><small>{formatDuration(examMinutes)} · {customExam.solutionUrl ? "الحل النموذجي مرفق" : "الحل النموذجي اختياري"}</small></div>
          <button type="button" className="bz-exam-secondary" onClick={() => { setCustomExam(null); setCustomUrl(""); setCustomSolutionUrl(""); }}>تعديل الرابط</button>
        </div>
      ) : (
        <div className="bz-vbr-custom-form">
          <div className="bz-vbr-field-intro"><span>03</span><div><b>أضف موضوعك من Google Drive</b><small>يُستعمل الرابط داخل قاعة الامتحان، ولا نحتاج إلى رفع الملف.</small></div></div>
          <label>رابط الموضوع <input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} type="url" dir="ltr" placeholder="https://drive.google.com/..." /></label>
          <label>رابط الحل <span className="bz-vbr-optional">اختياري</span><input value={customSolutionUrl} onChange={(event) => setCustomSolutionUrl(event.target.value)} type="url" dir="ltr" placeholder="يمكن تركه فارغاً" /></label>
          {customError && <p className="bz-exam-error" role="alert">{customError}</p>}
          <button type="button" className="bz-exam-primary" onClick={useCustomLink}>اعتماد الرابط والمتابعة</button>
        </div>
      );
    }

    if (choiceMode === "random") {
      return (
        <div className={`bz-vbr-random-card ${randomizing ? "is-loading" : "is-ready"}`} role="status" aria-live="polite">
          <span className="bz-vbr-random-mark">{randomizing ? "…" : "✓"}</span>
          <div className="bz-vbr-random-copy"><span className="bz-vbr-eyebrow">{randomizing ? "جارٍ تجهيز موضوعك..." : "تم اختيار الموضوع"}</span><b>{randomizing ? "نختار موضوعاً صالحاً من المكتبة" : selectedExam?.label ?? "موضوع جاهز"}</b><p>{spec?.label} · {subject?.name} · {formatDuration(examMinutes)} · {sourceName(selectedExam?.source)}</p></div>
        </div>
      );
    }

    return (
      <div className="bz-vbr-topic-list">
        {pool.length ? pool.map((item, index) => (
          <button key={`${item.label}-${index}`} type="button" className={`bz-vbr-topic ${index === examIdx && !customExam ? "is-selected" : ""}`} onClick={() => { setExamIdx(index); setChoiceMode("list"); setCustomExam(null); }}>
            <span className="bz-vbr-topic-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 text-start"><b>{item.label}</b><small>{item.duration ? formatDuration(item.duration) : "مدة المادة"} · {sourceName(item.source)}</small></span>
            {item.solutionUrl ? <span className="bz-exam-solution-pill">مع الحل</span> : <span className="bz-vbr-no-solution">بدون حل</span>}
          </button>
        )) : <p className="bz-exam-empty">لا يوجد موضوع متاح لهذه المادة حاليًا.</p>}
      </div>
    );
  }

  function renderStagedSetup() {
    return (
      <section id="bz-exam-setup" className="bz-exam-tool bz-vbr-shell" aria-labelledby="simulator-setup-title">
        <div className="bz-vbr-setup-hero">
          <div className="bz-vbr-hero-mark" aria-hidden="true"><strong>BZ</strong><span>01</span></div>
          <div className="bz-vbr-setup-copy"><span className="bz-vbr-eyebrow">Virtual Bac Room · محاكاة فردية</span><h2 id="simulator-setup-title">ادخل القاعة وأثبت مستواك</h2><p>اختر مسارك وموضوعك، ثمّ حلّ كما في البكالوريا بوقت حقيقي وورقة واضحة أمامك.</p></div>
          <div className="bz-vbr-status-pill"><span className="bz-vbr-status-dot" /> لم يبدأ الامتحان</div>
        </div>
        {renderProgress()}

        {setupStep === 1 && <div className="bz-vbr-panel bz-vbr-step-panel">
          <div className="bz-vbr-panel-heading"><span>01</span><div><small>قبل أن تبدأ</small><h3>اختر شعبتك</h3><p>نجهّز لك المواد والمواضيع الموجودة فعلياً لمسارك.</p></div></div>
          <div className="bz-vbr-specialties">
            {SPECIALTY_KEYS.map((key) => {
              const item = specialty(key);
              if (!item) return null;
              return <button key={key} type="button" className="bz-vbr-specialty-card" onClick={() => resetSelection(key)} style={{ "--card-accent": item.color } as React.CSSProperties}>
                <span className="bz-vbr-card-icon" style={{ background: `${item.color}18`, color: item.color }}>{subjectMark(item.label)}</span>
                <span className="min-w-0"><b>{item.label}</b><small>{item.subjects.length} مواد · اختيار المسار</small></span><span className="bz-vbr-card-arrow">←</span>
              </button>;
            })}
          </div>
          <div className="bz-vbr-method-note"><span>i</span><p>هذه المحاكاة مجانية ولا تحتاج إلى حساب. جهّز ورقة وقلم قبل دخول القاعة.</p></div>
        </div>}

        {setupStep === 2 && <div className="bz-vbr-panel bz-vbr-step-panel">
          <div className="bz-vbr-context"><span>الشعبة المختارة</span><b>{spec?.label}</b><button type="button" className="bz-exam-link-button" onClick={() => moveSetupStep(1)}>تغيير الشعبة</button></div>
          <div className="bz-vbr-panel-heading"><span>02</span><div><small>مسارك واضح، بقيت المادة</small><h3>اختر المادة</h3><p>كل مادة مرتبطة بمدتها الرسمية والمواضيع المتاحة لها.</p></div></div>
          <div className="bz-vbr-subject-grid">
            {subjects.map((item, index) => <button key={`${item.name}-${index}`} type="button" className="bz-vbr-subject-card" onClick={() => chooseSubject(index)}>
              <span className="bz-vbr-card-icon">{subjectMark(item.name)}</span><span className="min-w-0"><b>{item.name}</b><small>{formatDuration(item.duration)}{item.schedule ? ` · ${item.schedule}` : ""}</small></span><span className="bz-vbr-card-arrow">←</span>
            </button>)}
          </div>
        </div>}

        {setupStep === 3 && <div className="bz-vbr-panel bz-vbr-step-panel">
          <div className="bz-vbr-context"><span>{spec?.label}</span><b>{subject?.name}</b><button type="button" className="bz-exam-link-button" onClick={() => moveSetupStep(2)}>تغيير المادة</button></div>
          <div className="bz-vbr-panel-heading"><span>03</span><div><small>موضوع حقيقي، قرارك الأخير</small><h3>اختر طريقة الامتحان</h3><p>من مكتبة BacZone، باختيار عشوائي، أو برابط Google Drive / ملف الموضوع.</p></div></div>
          <div className="bz-vbr-mode-tabs" role="tablist" aria-label="طريقة اختيار الموضوع">
            <button type="button" className={choiceMode === "list" ? "is-active" : ""} onClick={() => { setChoiceMode("list"); setCustomExam(null); }} role="tab" aria-selected={choiceMode === "list"}><b>01</b> من مكتبة BacZone</button>
            <button type="button" className={choiceMode === "random" ? "is-active" : ""} onClick={chooseRandom} role="tab" aria-selected={choiceMode === "random"}><b>02</b> موضوع عشوائي</button>
            <button type="button" className={choiceMode === "custom" && !customExam ? "is-active" : ""} onClick={() => { setChoiceMode("custom"); setCustomExam(null); setCustomError(""); }} role="tab" aria-selected={choiceMode === "custom" && !customExam}><b>03</b> رابط Google Drive</button>
          </div>
          <div className="bz-vbr-topic-stage">{renderTopicChoice()}</div>
          <div className="bz-vbr-selection-summary"><span className="bz-vbr-selection-mark">✓</span><div><small>موضوعك الحالي</small><b>{selectedExam?.label ?? "اختر موضوعًا"}</b><p>{formatDuration(examMinutes)} · {selectedExam?.solutionUrl ? "الحل متوفر بعد النهاية" : "الحل اختياري"}</p></div>{choiceMode === "random" ? <span className="bz-vbr-auto-status">{randomizing ? "جارٍ الانتقال إلى القاعة..." : "تم اختيار الموضوع"}</span> : <button type="button" className="bz-exam-primary" onClick={openLobby} disabled={!selectedExam}>جاهز؟ مراجعة التعليمات</button>}</div>
        </div>}
      </section>
    );
  }

  if (phase === "setup") return renderStagedSetup();

  if (phase === "lobby") {
    return <section className="bz-exam-lobby bz-vbr-lobby" aria-labelledby="exam-lobby-title">
      <div className="bz-vbr-lobby-top"><div className="bz-vbr-hero-mark"><strong>BZ</strong><span>02</span></div><span className="bz-vbr-status-pill"><span className="bz-vbr-status-dot" /> لم يبدأ الامتحان</span></div>
      <p className="bz-vbr-eyebrow">الخطوة الأخيرة قبل دخول القاعة</p><h2 id="exam-lobby-title">جاهز؟ {subject?.name} — {selectedExam?.label}</h2><p className="bz-exam-lobby-subtitle">{spec?.label} · {formatDuration(examMinutes)} · {sourceName(selectedExam?.source)}</p>
      <div className="bz-vbr-lobby-ticket"><div><span>المادة</span><b>{subject?.name}</b></div><div><span>الشعبة</span><b>{spec?.label}</b></div><div><span>الموضوع</span><b>{selectedExam?.label}</b></div><div><span>المدة</span><b>{formatDuration(examMinutes)}</b></div></div>
      <div className="bz-exam-instructions"><div className="bz-vbr-instruction-heading"><span>!</span><div><h3>تذكير قبل البداية</h3><p>جهّز مكانك كقاعة حقيقية. عند الدخول يبدأ المؤقت ولا يتوقف.</p></div></div><div className="bz-exam-options"><label><input type="checkbox" checked={pledge.phone} onChange={(event) => setPledge((value) => ({ ...value, phone: event.target.checked }))} /><span>أبعد هاتفي وأحلّ كما في القاعة الحقيقية.</span></label><label><input type="checkbox" checked={pledge.focus} onChange={(event) => setPledge((value) => ({ ...value, focus: event.target.checked }))} /><span>لن أفتح نافذة أخرى أو أبحث عن إجابة أثناء الوقت.</span></label></div><div className="bz-exam-switches"><label><input type="checkbox" checked={guardOptions.fs} onChange={(event) => setGuardOptions((value) => ({ ...value, fs: event.target.checked }))} /> ملء الشاشة</label><label><input type="checkbox" checked={guardOptions.ac} onChange={(event) => setGuardOptions((value) => ({ ...value, ac: event.target.checked }))} /> تنبيه مغادرة القاعة</label><label><input type="checkbox" checked={guardOptions.sfx} onChange={(event) => setGuardOptions((value) => ({ ...value, sfx: event.target.checked }))} /> الجرس والتنبيهات</label></div></div>
      <div className="bz-exam-lobby-actions"><button type="button" className="bz-exam-secondary" onClick={() => setPhase("setup")}>تغيير الموضوع</button><button type="button" className="bz-exam-primary" onClick={startExam} disabled={!pledge.phone || !pledge.focus}>دخول قاعة الامتحان</button></div>
    </section>;
  }

  const urgent = left > 0 && left <= MINUTES_WARNING;
  const report = integrityReport(guard.violations, guardOptions.ac);

  if (phase === "done") {
    const timedOut = !leftExam && left <= 0;
    const resultReport = leftExam
      ? { tone: "bad" as const, text: "غادرت قاعة الامتحان قبل التسليم؛ لم نعرض الحل ولم نعد الجلسة الحالية." }
      : report;
    const canShowSolution = !leftExam;
    return <section className="bz-exam-result bz-vbr-result" aria-labelledby="exam-result-title">
      <div className={`bz-vbr-result-mark ${timedOut || leftExam ? "is-timeout" : ""}`}>{timedOut || leftExam ? "!" : "✓"}</div><span className={`bz-vbr-result-state ${timedOut || leftExam ? "is-timeout" : ""}`}>{leftExam ? "غادرت الجلسة" : timedOut ? "انتهى الوقت" : "تم التسليم"}</span><p className="bz-vbr-eyebrow">انتهت جلسة المحاكاة</p><h2 id="exam-result-title">{leftExam ? "غادرت الامتحان" : timedOut ? "انتهى وقت الامتحان" : "تم تسليم الامتحان"}</h2><p className="bz-exam-result-copy">{leftExam ? "تم إنهاء الحالة الحالية كما طلبت. يمكنك بدء محاكاة جديدة متى شئت." : timedOut ? "أغلقنا الجلسة في وقتها. خذ نفسًا، ثم راجع الموضوع بهدوء." : "أنهيت الموضوع قبل نهاية الوقت. الآن تبدأ أهم مرحلة: تحليل أخطائك."}</p>
      <div className={`bz-exam-integrity ${resultReport.tone}`}><b>{resultReport.tone === "ok" ? "حالة الجلسة" : "تنبيه الجلسة"}</b><span>{resultReport.text}</span></div>
      {canShowSolution && showSolution && selectedExam?.solutionUrl && <div className="bz-exam-paper bz-exam-solution-paper"><iframe src={selectedExam.solutionUrl} title="ورقة الحل النموذجي" loading="lazy" /></div>}
      {canShowSolution && showSolution && !selectedExam?.solutionUrl && <div className="bz-exam-solution-unavailable" role="status">لم يتم إرفاق حل لهذا الموضوع.</div>}
      <div className="bz-exam-result-actions">{canShowSolution && <button type="button" className="bz-exam-primary" onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}</button>}<button type="button" className="bz-exam-secondary" onClick={reset}>{leftExam ? "بدء محاكاة جديدة" : "اختيار موضوع آخر"}</button><Link href="/tools" className="bz-exam-link">كل أدوات المراجعة</Link></div>
    </section>;
  }

  const zoomIn = () => setPaperZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))));
  const zoomOut = () => setPaperZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))));
  const fitPaper = () => setPaperZoom(1);

  return <section ref={stageRef} className={`bz-exam-running bz-vbr-running ${urgent ? "is-urgent" : ""}`} aria-labelledby="running-exam-title">
    <header className="bz-vbr-running-header">
      <div className="bz-vbr-running-brand"><span className="bz-vbr-running-mark">BZ</span><div><b>BacZone</b><small>غرفة الامتحان الافتراضية</small></div></div>
      <div className="bz-vbr-running-context"><small>{spec?.label} · {subject?.name}</small><h2 id="running-exam-title">{selectedExam?.label}</h2></div>
      <div className={`bz-exam-running-status ${urgent ? "is-urgent-status" : ""}`} role="status"><span className="bz-exam-live-dot" /> {urgent ? "تبقى أقل من 5 دقائق" : "الامتحان جارٍ"}</div>
      <div className="bz-exam-clock" aria-live="polite"><small>الوقت المتبقي</small><strong>{formatClock(left)}</strong></div>
      <nav className="bz-vbr-top-action-bar" aria-label="إجراءات الامتحان">
        <button type="button" className="bz-exam-action bz-exam-action-leave" onClick={() => setConfirmLeave(true)}><FontAwesomeIcon icon={faArrowRightFromBracket} /> مغادرة</button>
        <button type="button" className="bz-exam-action bz-exam-action-zoom-out" onClick={zoomOut} aria-label="تصغير العرض"><FontAwesomeIcon icon={faMinus} /> تصغير</button>
        <button type="button" className="bz-exam-action bz-exam-action-zoom-in" onClick={zoomIn} aria-label="تكبير العرض"><FontAwesomeIcon icon={faPlus} /> تكبير</button>
        <button type="button" className="bz-exam-action bz-exam-action-fullscreen" onClick={() => void toggleStageFullscreen()}><FontAwesomeIcon icon={fullScreen ? faCompress : faExpand} /> {fullScreen ? "خروج من الشاشة" : "ملء الشاشة"}</button>
        {selectedExam?.examUrl && <a className="bz-exam-action bz-exam-action-external" href={selectedExam.examUrl} target="_blank" rel="noreferrer" onClick={() => guard.grace()}><FontAwesomeIcon icon={faUpRightFromSquare} /> فتح الموضوع</a>}
        <button type="button" className="bz-exam-action bz-exam-action-submit" onClick={() => setConfirmFinish(true)}>تسليم الامتحان</button>
      </nav>
    </header>
    <div className="bz-vbr-running-grid">
      <div className="bz-exam-paper">
        <div className="bz-vbr-paper-toolbar"><span>ورقة الموضوع</span><div><button type="button" onClick={zoomIn} aria-label="تكبير العرض" title="تكبير العرض"><FontAwesomeIcon icon={faPlus} /></button><output>{Math.round(paperZoom * 100)}%</output><button type="button" onClick={zoomOut} aria-label="تصغير العرض" title="تصغير العرض"><FontAwesomeIcon icon={faMinus} /></button><button type="button" onClick={fitPaper} aria-label="ملاءمة العرض" title="ملاءمة العرض">ملاءمة العرض</button></div></div>
        <div className="bz-vbr-paper-viewport"><div className="bz-vbr-paper-canvas" style={{ transform: `scale(${paperZoom})`, width: `${100 / paperZoom}%` }}><iframe src={selectedExam?.examUrl} title="ورقة الامتحان" loading="eager" allow="autoplay" /></div></div>
      </div>
      <aside className="bz-exam-control-panel"><div className="bz-vbr-side-heading"><span>حالة الامتحان</span><b>الامتحان جارٍ</b></div><div className="bz-exam-timer-bar"><span style={{ width: `${Math.max(0, Math.min(100, (left / (examMinutes * 60)) * 100))}%` }} /></div><div className="bz-exam-side-row"><span>الشعبة</span><b>{spec?.label}</b></div><div className="bz-exam-side-row"><span>المادة</span><b>{subject?.name}</b></div><div className="bz-exam-side-row"><span>الموضوع</span><b>{selectedExam?.label}</b></div><div className="bz-exam-guard-chip"><span>✓</span>{guardOptions.ac ? `${guard.violations ? `محاولات مغادرة: ${guard.violations}` : "المراقبة مفعّلة"}` : "التنبيه معطّل"}</div>
      </aside>
    </div>
    {confirmFinish && <div className="bz-exam-confirm" role="dialog" aria-modal="true" aria-labelledby="finish-title"><div><span className="bz-vbr-dialog-kicker">آخر تأكيد</span><h3 id="finish-title">هل أنت متأكد من تسليم الامتحان؟</h3><p>بعد التسليم ستنتقل إلى حالة النتيجة، ويمكنك إظهار الحل إذا كان مرفقاً بالموضوع.</p><div><button type="button" className="bz-exam-secondary" onClick={() => setConfirmFinish(false)}>متابعة الامتحان</button><button type="button" className="bz-exam-danger" onClick={() => finishExam(false)}>تسليم الامتحان</button></div></div></div>}
    {confirmLeave && <div className="bz-exam-confirm bz-exam-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div><span className="bz-vbr-dialog-kicker">خروج من القاعة</span><h3 id="leave-title">هل تريد مغادرة الامتحان؟</h3><p>مغادرة الامتحان تنهي الحالة الحالية، ولن تعود إلى هذا المؤقت أو الموضوع من هذه الجلسة.</p><div><button type="button" className="bz-exam-secondary" onClick={() => setConfirmLeave(false)}>متابعة الامتحان</button><button type="button" className="bz-exam-danger" onClick={leaveExam}>مغادرة الامتحان</button></div></div></div>}
    {guard.alarmOpen && <div className="bz-exam-alarm" role="alertdialog" aria-modal="true"><div><span>!</span><h3>عد إلى قاعة الامتحان</h3><p>تم رصد: {guard.lastReason}. أغلق النوافذ الأخرى وأكمل من ورقتك.</p><button type="button" className="bz-exam-primary" onClick={guard.resume}>العودة إلى الامتحان</button></div></div>}
  </section>;
}
