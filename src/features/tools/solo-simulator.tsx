"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  const [pledge, setPledge] = useState({ phone: false, focus: false });
  const [guardOptions, setGuardOptions] = useState<GuardOptions>({ fs: true, ac: true, sfx: true });
  const [fullScreen, setFullScreen] = useState(false);
  const rang = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => specialty(specKey), [specKey]);
  const subjects = useMemo(() => subjectsOf(specKey), [specKey]);
  const subject = subjects[subjectIdx] ?? getInitialSubject(specKey);
  const pool = useMemo(() => examPool(subject), [subject]);
  const selectedExam = customExam ?? pool[examIdx] ?? pool[0];
  const examMinutes = selectedExam?.duration ?? subject?.duration ?? 120;
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
    if (phase !== "running") return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") setFullScreen(false);
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
    setSpecKey(nextSpecKey);
    setSubjectIdx(0);
    setExamIdx(0);
    setChoiceMode("list");
    setCustomExam(null);
    setCustomError("");
    moveSetupStep(2);
  }

  function chooseSubject(index: number) {
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
    setPledge({ phone: false, focus: false });
    setPhase("lobby");
  }

  function chooseRandom() {
    if (!pool.length) return;
    const next = Math.floor(Math.random() * pool.length);
    setExamIdx(next);
    setCustomExam(null);
    setChoiceMode("random");
    setCustomError("");
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
    try {
      primeAudio();
      if (guardOptions.sfx) bellStart();
    } catch { /* بعض المتصفحات تمنع الصوت حتى تفاعل إضافي */ }
    rang.current = false;
    setShowSolution(false);
    const finishAt = Date.now() + examMinutes * 60_000;
    setEndsAt(finishAt);
    setLeft(examMinutes * 60);
    setPhase("running");
  }

  function finishExam(timeUp = false) {
    setConfirmFinish(false);
    rang.current = true;
    if (timeUp) {
      try { bellEnd(); } catch { /* الصوت تحسين اختياري */ }
    }
    setPhase("done");
  }

  function reset() {
    setPhase("setup");
    setSetupStep(1);
    setEndsAt(null);
    setLeft(0);
    setShowSolution(false);
    setConfirmFinish(false);
    rang.current = false;
  }

  async function toggleStageFullscreen() {
    await toggleFullscreen(stageRef.current);
    setFullScreen(isFullscreen());
  }

  function renderStagedSetup() {
    return (
      <section id="bz-exam-setup" className="bz-exam-tool" aria-labelledby="simulator-setup-title">
        <div className="bz-exam-setup-head">
          <div>
            <p className="bz-exam-kicker">قاعة هادئة، وقت حقيقي، تصحيح بعد النهاية</p>
            <h2 id="simulator-setup-title">حضّر محاكاتك قبل دخول القاعة</h2>
            <p>ثلاث خطوات قصيرة تفصلك عن تجربة امتحان حقيقية، دون إعادة تحميل الصفحة.</p>
          </div>
          <span className="bz-exam-free-badge">لا يحتاج إلى تسجيل</span>
        </div>

        <div className="bz-exam-progress" aria-label="خطوات الإعداد">
          {["الشعبة", "المادة", "الموضوع", "الاستعداد"].map((label, index) => (
            <span key={label} className={index < setupStep ? "is-current" : ""}><b>{index + 1}</b>{label}</span>
          ))}
        </div>

        {setupStep === 1 && <div className="bz-exam-section bz-exam-step-panel">
          <div className="bz-exam-section-title"><span>01</span><div><h3>اختر شعبتك</h3><p>سنجهّز لك المواد والمواضيع المناسبة لمسارك.</p></div></div>
          <div className="bz-exam-specialties">
            {SPECIALTY_KEYS.map((key) => {
              const item = specialty(key);
              if (!item) return null;
              return (
                <button key={key} type="button" className="bz-exam-specialty" onClick={() => resetSelection(key)} style={{ borderColor: `${item.color}44` }}>
                  <span className="bz-exam-specialty-icon" style={{ background: `${item.color}18`, color: item.color }}>{item.label.slice(0, 1)}</span>
                  <span>{item.label}</span>
                  <small>{item.subjects.length} مواد · اضغط للمتابعة</small>
                </button>
              );
            })}
          </div>
        </div>}

        {setupStep === 2 && <div className="bz-exam-section bz-exam-step-panel">
          <div className="bz-exam-step-context"><span>الشعبة المختارة</span><b>{spec?.label}</b><button type="button" className="bz-exam-link-button" onClick={() => moveSetupStep(1)}>تغيير الشعبة</button></div>
          <div className="bz-exam-section-title"><span>02</span><div><h3>اختر المادة</h3><p>اختر المادة التي تريد قياس مستواك فيها بالمدة الرسمية.</p></div></div>
          <div className="bz-exam-subjects">
            {subjects.map((item, index) => (
              <button key={`${item.name}-${index}`} type="button" className="bz-exam-subject" onClick={() => chooseSubject(index)}>
                <span className="bz-exam-subject-mark">{index + 1}</span>
                <span className="min-w-0"><b>{item.name}</b><small>{formatDuration(item.duration)} · اضغط للمتابعة</small></span>
              </button>
            ))}
          </div>
        </div>}

        {setupStep === 3 && <div className="bz-exam-section bz-exam-step-panel">
          <div className="bz-exam-step-context"><span>{spec?.label}</span><b>{subject?.name}</b><button type="button" className="bz-exam-link-button" onClick={() => moveSetupStep(2)}>تغيير المادة</button></div>
          <div className="bz-exam-section-title"><span>03</span><div><h3>اختر موضوع الامتحان</h3><p>من مكتبة المواضيع، أو اختر موضوعًا عشوائيًا، أو أضف رابط Google Drive/PDF.</p></div></div>
          <div className="bz-exam-mode-tabs" role="tablist" aria-label="مصدر الموضوع">
            <button type="button" className={choiceMode === "list" ? "is-active" : ""} onClick={() => { setChoiceMode("list"); setCustomExam(null); }} role="tab" aria-selected={choiceMode === "list"}>من المكتبة</button>
            <button type="button" className={choiceMode === "random" ? "is-active" : ""} onClick={chooseRandom} role="tab" aria-selected={choiceMode === "random"}>اختر موضوعًا عشوائيًا</button>
            <button type="button" className={choiceMode === "custom" && !customExam ? "is-active" : ""} onClick={() => { setChoiceMode("custom"); setCustomExam(null); setCustomError(""); }} role="tab" aria-selected={choiceMode === "custom" && !customExam}>رابط Google Drive/PDF</button>
          </div>
          {choiceMode === "custom" ? (
            customExam ? (
              <div className="bz-exam-custom-selected"><b>تم اعتماد رابط الموضوع</b><span>المدة: {formatDuration(examMinutes)} · {customExam.solutionUrl ? "الحل النموذجي مرفق" : "الحل النموذجي اختياري"}</span><button type="button" className="bz-exam-secondary" onClick={() => { setCustomExam(null); setCustomUrl(""); setCustomSolutionUrl(""); }}>تعديل الرابط</button></div>
            ) : (
              <div className="bz-exam-custom-form">
                <label>رابط الموضوع <input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} type="url" dir="ltr" placeholder="https://drive.google.com/..." /></label>
                <label>رابط الحل النموذجي <input value={customSolutionUrl} onChange={(event) => setCustomSolutionUrl(event.target.value)} type="url" dir="ltr" placeholder="اختياري" /></label>
                {customError && <p className="bz-exam-error" role="alert">{customError}</p>}
                <button type="button" className="bz-exam-primary" onClick={useCustomLink}>اعتماد الرابط والمتابعة</button>
              </div>
            )
          ) : (
            <div className="bz-exam-topic-list">
              {pool.length ? pool.map((item, index) => (
                <button key={`${item.label}-${index}`} type="button" className={`bz-exam-topic ${index === examIdx && !customExam ? "is-selected" : ""}`} onClick={() => { setExamIdx(index); setChoiceMode("list"); setCustomExam(null); }}>
                  <span className="bz-exam-topic-source">{sourceName(item.source)}</span>
                  <span className="min-w-0 flex-1 text-start"><b>{item.label}</b><small>{item.duration ? formatDuration(item.duration) : "مدة المادة"}</small></span>
                  {item.solutionUrl && <span className="bz-exam-solution-pill">مع الحل</span>}
                </button>
              )) : <p className="bz-exam-empty">لا يوجد موضوع متاح لهذه المادة حاليًا.</p>}
            </div>
          )}
          <div className="bz-exam-selection-summary">
            <span className="bz-exam-summary-icon">✓</span>
            <div><b>{selectedExam?.label ?? "اختر موضوعًا"}</b><p>{formatDuration(examMinutes)} · {selectedExam?.solutionUrl ? "الحل متوفر بعد النهاية" : "الحل اختياري"}</p></div>
            <button type="button" className="bz-exam-primary" onClick={openLobby} disabled={!selectedExam}>مراجعة التعليمات</button>
          </div>
        </div>}
      </section>
    );
  }

  if (phase === "setup") return renderStagedSetup();

  if (phase === "lobby") {
    return (
      <section className="bz-exam-lobby" aria-labelledby="exam-lobby-title">
        <div className="bz-exam-lobby-mark">BZ</div>
        <p className="bz-exam-kicker">الخطوة الأخيرة قبل دخول القاعة</p>
        <h2 id="exam-lobby-title">{subject?.name} — {selectedExam?.label}</h2>
        <p className="bz-exam-lobby-subtitle">{spec?.label} · {formatDuration(examMinutes)} · {sourceName(selectedExam?.source)}</p>
        <div className="bz-exam-meta-grid">
          <div><span>المادة</span><b>{subject?.name}</b></div>
          <div><span>الشعبة</span><b>{spec?.label}</b></div>
          <div><span>المدة</span><b>{formatDuration(examMinutes)}</b></div>
          <div><span>المصدر</span><b>{sourceName(selectedExam?.source)}</b></div>
        </div>
        <div className="bz-exam-instructions">
          <h3>تذكير قبل البداية</h3>
          <p>جهّز ورقة وقلمًا، أغلق مصادر المساعدة، ولا توقف المؤقت. ستظهر ورقة الحل بعد إنهاء المحاكاة أو انتهاء الوقت إذا كانت متاحة.</p>
          <div className="bz-exam-options">
            <label><input type="checkbox" checked={pledge.phone} onChange={(event) => setPledge((value) => ({ ...value, phone: event.target.checked }))} /><span>أبعد هاتفي وأحلّ كما في القاعة الحقيقية.</span></label>
            <label><input type="checkbox" checked={pledge.focus} onChange={(event) => setPledge((value) => ({ ...value, focus: event.target.checked }))} /><span>لن أفتح نافذة أخرى أو أبحث عن إجابة أثناء الوقت.</span></label>
          </div>
          <div className="bz-exam-switches">
            <label><input type="checkbox" checked={guardOptions.fs} onChange={(event) => setGuardOptions((value) => ({ ...value, fs: event.target.checked }))} /> ملء الشاشة</label>
            <label><input type="checkbox" checked={guardOptions.ac} onChange={(event) => setGuardOptions((value) => ({ ...value, ac: event.target.checked }))} /> تنبيه مغادرة القاعة</label>
            <label><input type="checkbox" checked={guardOptions.sfx} onChange={(event) => setGuardOptions((value) => ({ ...value, sfx: event.target.checked }))} /> الجرس والتنبيهات</label>
          </div>
        </div>
        <div className="bz-exam-lobby-actions">
          <button type="button" className="bz-exam-secondary" onClick={() => setPhase("setup")}>تغيير الموضوع</button>
          <button type="button" className="bz-exam-primary" onClick={startExam} disabled={!pledge.phone || !pledge.focus}>ابدأ الامتحان</button>
        </div>
      </section>
    );
  }

  const urgent = left > 0 && left <= MINUTES_WARNING;
  const report = integrityReport(guard.violations, guardOptions.ac);

  if (phase === "done") {
    return (
      <section className="bz-exam-result" aria-labelledby="exam-result-title">
        <div className="bz-exam-result-icon">{left <= 0 ? "!" : "✓"}</div>
        <p className="bz-exam-kicker">انتهت جلسة المحاكاة</p>
        <h2 id="exam-result-title">{left <= 0 ? "انتهى وقت الامتحان" : "أحسنت، أنهيت المحاكاة"}</h2>
        <p className="bz-exam-result-copy">{left <= 0 ? "أغلقنا الجلسة في وقتها. خذ نفسًا، ثم راجع الموضوع بهدوء." : "أنهيت الموضوع قبل نهاية الوقت. الآن تبدأ أهم مرحلة: تحليل أخطائك."}</p>
        <div className={`bz-exam-integrity ${report.tone}`}><b>{report.tone === "ok" ? "حالة الجلسة" : "تنبيه الجلسة"}</b><span>{report.text}</span></div>
        {showSolution && selectedExam?.solutionUrl && (
          <div className="bz-exam-paper bz-exam-solution-paper"><iframe src={selectedExam.solutionUrl} title="ورقة الحل النموذجي" loading="lazy" /></div>
        )}
        {showSolution && !selectedExam?.solutionUrl && <div className="bz-exam-solution-unavailable" role="status">الحل النموذجي غير متوفر لهذا الموضوع حاليًا.</div>}
        <div className="bz-exam-result-actions">
          <button type="button" className="bz-exam-primary" onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}</button>
          <button type="button" className="bz-exam-secondary" onClick={reset}>اختيار موضوع آخر</button>
          <Link href="/tools" className="bz-exam-link">كل أدوات المراجعة</Link>
        </div>
      </section>
    );
  }

  return (
    <section ref={stageRef} className={`bz-exam-running ${urgent ? "is-urgent" : ""}`} aria-labelledby="running-exam-title">
      <header className="bz-exam-running-header">
        <div className="min-w-0"><p>غرفة الامتحان · {spec?.label}</p><h2 id="running-exam-title">{subject?.name} · {selectedExam?.label}</h2></div>
        <div className={`bz-exam-running-status ${urgent ? "is-urgent-status" : ""}`} role="status"><span className="bz-exam-live-dot" /> {urgent ? "تبقى أقل من 5 دقائق" : "الامتحان جارٍ"}</div>
        <div className="bz-exam-clock" aria-live="polite"><small>الوقت المتبقي</small><strong>{formatClock(left)}</strong></div>
      </header>
      <div className="bz-exam-running-grid">
        <div className="bz-exam-paper"><iframe src={selectedExam?.examUrl} title="ورقة الامتحان" loading="eager" allow="autoplay" /></div>
        <aside className="bz-exam-control-panel">
          <div className="bz-exam-timer-bar"><span style={{ width: `${Math.max(0, Math.min(100, (left / (examMinutes * 60)) * 100))}%` }} /></div>
          <div className="bz-exam-side-row"><span>الشعبة</span><b>{spec?.label}</b></div>
          <div className="bz-exam-side-row"><span>المادة</span><b>{subject?.name}</b></div>
          <div className="bz-exam-side-row"><span>المدة</span><b>{formatDuration(examMinutes)}</b></div>
          <div className="bz-exam-guard-chip"><span>✓</span>{guardOptions.ac ? `${guard.violations ? `محاولات مغادرة: ${guard.violations}` : "المراقبة مفعّلة"}` : "التنبيه معطّل"}</div>
          <div className="bz-exam-control-actions">
            <button type="button" className="bz-exam-secondary" onClick={() => void toggleStageFullscreen()}>{fullScreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}</button>
            {selectedExam?.examUrl && <a className="bz-exam-secondary" href={selectedExam.examUrl} target="_blank" rel="noreferrer" onClick={() => guard.grace()}>فتح الموضوع في نافذة جديدة</a>}
            <button type="button" className="bz-exam-danger" onClick={() => setConfirmFinish(true)}>تسليم الورقة</button>
          </div>
        </aside>
      </div>
      {confirmFinish && <div className="bz-exam-confirm" role="dialog" aria-modal="true" aria-labelledby="finish-title"><div><h3 id="finish-title">هل تريد إنهاء المحاكاة؟</h3><p>ستنتقل إلى شاشة النتيجة، ويمكنك عرض الحل النموذجي إذا كان متاحًا.</p><div><button type="button" className="bz-exam-secondary" onClick={() => setConfirmFinish(false)}>متابعة الحل</button><button type="button" className="bz-exam-danger" onClick={() => finishExam(false)}>نعم، أنهِ الآن</button></div></div></div>}
      {guard.alarmOpen && <div className="bz-exam-alarm" role="alertdialog" aria-modal="true"><div><span>!</span><h3>عد إلى قاعة الامتحان</h3><p>تم رصد: {guard.lastReason}. أغلق النوافذ الأخرى وأكمل من ورقتك.</p><button type="button" className="bz-exam-primary" onClick={guard.resume}>العودة إلى الامتحان</button></div></div>}
    </section>
  );
}
