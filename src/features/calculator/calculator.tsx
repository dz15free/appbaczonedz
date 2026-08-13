"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faCircleCheck,
  faRotateLeft,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  calculate,
  gradeError,
  totalCoef,
  type Branch,
  type CalcResult,
} from "@/features/calculator/branches";

type CountdownState = "idle" | "ready" | "counting" | "calculating";

const READY_HOLD_MS = 850;
const COUNTDOWN_MS = 5000;
const RESULT_REVEAL_MS = 420;

export function Calculator({ branch }: { branch: Branch }) {
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [pendingResult, setPendingResult] = useState<CalcResult | null>(null);
  const [countdown, setCountdown] = useState<CountdownState>("idle");
  const [count, setCount] = useState(5);
  const [showErr, setShowErr] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownDeadlineRef = useRef<number | null>(null);

  const required = branch.subjects.filter((s) => !s.optional);
  const filled = required.filter((s) => (grades[s.name] ?? "").trim() !== "").length;
  const progress = Math.round((filled / Math.max(1, required.length)) * 100);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    for (const s of branch.subjects) e[s.name] = gradeError(grades[s.name] ?? "", s.optional);
    return e;
  }, [grades, branch]);

  useEffect(() => {
    let timer: number | undefined;
    let interval: number | undefined;

    if (countdown === "ready") {
      timer = window.setTimeout(() => {
        countdownDeadlineRef.current = Date.now() + COUNTDOWN_MS;
        setCount(5);
        setCountdown("counting");
      }, READY_HOLD_MS);
      return () => { if (timer !== undefined) window.clearTimeout(timer); };
    }

    if (countdown === "counting") {
      const deadline = countdownDeadlineRef.current ?? (Date.now() + COUNTDOWN_MS);
      countdownDeadlineRef.current = deadline;

      const syncCount = () => {
        const remaining = deadline - Date.now();
        const next = Math.max(0, Math.ceil(remaining / 1000));
        setCount((current) => (current === next ? current : next));
        if (remaining <= 0) {
          if (interval !== undefined) window.clearInterval(interval);
          setCountdown("calculating");
        }
      };

      syncCount();
      interval = window.setInterval(syncCount, 60);
      return () => { if (interval !== undefined) window.clearInterval(interval); };
    }

    if (countdown === "calculating") {
      timer = window.setTimeout(() => {
        setCountdown("idle");
        setResult(pendingResult);
        setPendingResult(null);
        window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      }, RESULT_REVEAL_MS);
      return () => { if (timer !== undefined) window.clearTimeout(timer); };
    }

    return undefined;
  }, [countdown, pendingResult]);

  function set(name: string, value: string) {
    const clean = value.replace(/[^\d.,]/g, "").slice(0, 5);
    setGrades((current) => ({ ...current, [name]: clean }));
    setResult(null);
    setPendingResult(null);
    countdownDeadlineRef.current = null;
    setCountdown("idle");
  }

  function run() {
    setShowErr(true);
    const nextResult = calculate(branch, grades);
    if (!nextResult) {
      const first = branch.subjects.findIndex((s) => errors[s.name]);
      if (first >= 0) refs.current[first]?.focus();
      return;
    }
    setResult(null);
    setPendingResult(nextResult);
    countdownDeadlineRef.current = null;
    setCount(5);
    setCountdown("ready");
  }

  function reset() {
    setGrades({});
    setTouched({});
    setResult(null);
    setPendingResult(null);
    countdownDeadlineRef.current = null;
    setCountdown("idle");
    setCount(5);
    setShowErr(false);
  }

  const isBusy = countdown !== "idle";
  const countdownCopy = countdown === "ready"
    ? "هل أنت مستعد؟"
    : countdown === "calculating"
      ? "نراجع الحساب ونجهّز نتيجتك…"
      : "نرتّب العلامات ونحسبها…";

  return (
    <section className="bz-calc-pro-shell" aria-label={`حاسبة معدل ${branch.short}`}>
      <div className="bz-calc-pro-topline">
        <div className="bz-calc-pro-progress">
          <span style={{ width: `${progress}%`, background: branch.color }} />
        </div>
        <div className="bz-calc-pro-progress-copy">
          <span><b>{filled}</b> من {required.length} مواد إجبارية</span>
          <span>{progress}% مكتمل</span>
        </div>
      </div>

      <div className="bz-calc-pro-intro">
        <div className="bz-calc-pro-icon" style={{ background: `${branch.color}16`, color: branch.color }}>
          <FontAwesomeIcon icon={faCalculator} />
        </div>
        <div>
          <p className="bz-calc-pro-eyebrow">المرحلة الثانية · أدخل علاماتك</p>
          <h2>لنحسبها مادةً مادة</h2>
          <p>اكتب علامة كل مادة بين 0 و20. المادّة الاختيارية تبقى بونصًا ويمكن تركها فارغة.</p>
        </div>
        <div className="bz-calc-pro-total" style={{ borderColor: `${branch.color}44` }}>
          <span>المعاملات</span><b style={{ color: branch.color }}>{totalCoef(branch)}</b>
        </div>
      </div>

      <div className="bz-calc-pro-subjects">
        {branch.subjects.map((subject, index) => {
          const value = grades[subject.name] ?? "";
          const error = errors[subject.name];
          const invalid = Boolean(error) && (showErr || touched[subject.name]) && !(subject.optional && value === "");
          const valid = Boolean(value) && !error;
          return (
            <label key={subject.name} className={`bz-calc-pro-subject ${invalid ? "is-invalid" : ""} ${valid ? "is-valid" : ""}`}>
              <span className="bz-calc-pro-subject-mark" style={{ background: valid ? `${branch.color}18` : "var(--bz-canvas)", color: valid ? branch.color : "var(--bz-ink-3)" }}>
                {valid ? <FontAwesomeIcon icon={faCircleCheck} /> : String(index + 1).padStart(2, "0")}
              </span>
              <span className="bz-calc-pro-subject-body">
                <span className="bz-calc-pro-subject-name">{subject.name}</span>
                <span className="bz-calc-pro-subject-meta">معامل ×{subject.coef}{subject.optional ? " · اختيارية وبونص" : " · إجبارية"}</span>
                {invalid && <span className="bz-calc-pro-error"><FontAwesomeIcon icon={faTriangleExclamation} /> {error}</span>}
              </span>
              <input
                ref={(element) => { refs.current[index] = element; }}
                value={value}
                onChange={(event) => set(subject.name, event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, [subject.name]: true }))}
                onKeyDown={(event) => { if (event.key === "Enter") refs.current[index + 1]?.focus(); }}
                inputMode="decimal"
                enterKeyHint={index === branch.subjects.length - 1 ? "done" : "next"}
                placeholder="0–20"
                aria-label={`علامة ${subject.name}`}
                aria-invalid={invalid || undefined}
                className="bz-calc-pro-input"
              />
            </label>
          );
        })}
      </div>

      <div className="bz-calc-pro-actions">
        <button type="button" onClick={run} disabled={isBusy} aria-busy={isBusy} className="bz-calc-pro-primary" style={{ background: branch.color }}>
          <FontAwesomeIcon icon={faCalculator} /> {isBusy ? "نجهّز نتيجتك…" : "احسب معدّلي"}
        </button>
        <button type="button" onClick={reset} className="bz-calc-pro-secondary"><FontAwesomeIcon icon={faRotateLeft} /> ابدأ من جديد</button>
      </div>

      {showErr && !result && !isBusy && (
        <p className="bz-calc-pro-hint">أكمل علامات المواد الإجبارية بقيم بين 0 و20. المادّة الاختيارية يمكن تركها فارغة.</p>
      )}

      {isBusy && (
        <div className={`bz-calc-countdown is-${countdown}`} role="status" aria-live="polite">
          <div className="bz-calc-countdown-orbit" style={{ borderColor: `${branch.color}55` }}>
            {countdown === "ready" ? <FontAwesomeIcon icon={faBookOpen} /> : countdown === "calculating" ? <FontAwesomeIcon icon={faCalculator} className="bz-calc-countdown-spin" /> : count}
          </div>
          <p>{countdownCopy}</p>
          <span>{countdown === "ready" ? "خذ نفسًا قصيرًا، نتيجتك على الطريق" : countdown === "calculating" ? "نحوّل علاماتك إلى صورة واضحة" : "ثانية كاملة لكل رقم"}</span>
        </div>
      )}

      {result && (
        <div ref={resultRef} className={`bz-calc-pro-result is-revealed ${result.passed ? "is-passed" : "is-below"}`} style={{ borderColor: `${branch.color}55` }}>
          <div className="bz-calc-pro-result-head">
            <span className="bz-calc-pro-result-check" style={{ background: `${branch.color}18`, color: branch.color }}><FontAwesomeIcon icon={result.passed ? faCircleCheck : faTriangleExclamation} /></span>
            <span><small>نتيجتك في</small><b>{branch.short}</b></span>
            <button type="button" onClick={reset} aria-label="إعادة الحساب"><FontAwesomeIcon icon={faRotateLeft} /></button>
          </div>
          <div className="bz-calc-pro-result-number" style={{ color: branch.color }}>{result.average.toFixed(2)}<small>/20</small></div>
          <div className="bz-calc-pro-result-status">{result.passed ? `ناجح · ${result.mention}` : "دون المعدّل"}</div>
          <p className="bz-calc-pro-result-message">{result.passed ? "هذه نقطة بداية جيدة. استخدمها لتعرف المواد التي تستحق وقتك الأكبر في برنامج المراجعة." : "لا تجعل الرقم يحكم على موسمك كله. حدّد المواد ذات المعامل الأكبر وابدأ بخطوة قابلة للإنجاز."}</p>
          <div className="bz-calc-pro-result-details">
            <div><span>مجموع النقاط</span><b>{result.totalPoints.toFixed(2)}</b></div>
            <div><span>مجموع المعاملات</span><b>{result.totalCoef}</b></div>
            {result.bonus > 0 && <div><span>نقاط البونص</span><b style={{ color: branch.color }}>+{result.bonus.toFixed(2)}</b></div>}
          </div>
          <p className="bz-calc-pro-formula">{result.totalPoints.toFixed(2)} ÷ {result.totalCoef} = <b>{result.average.toFixed(2)}</b></p>
          <div className="bz-calc-pro-next">
            <span>خطوتك التالية</span>
            <Link href="/tools/weighted-average">احسب معدّلك الموزون للتوجيه <FontAwesomeIcon icon={faArrowLeft} /></Link>
            <Link href="/specialties">اكتشف التخصصات الجامعية <FontAwesomeIcon icon={faArrowLeft} /></Link>
          </div>
          <p className="bz-calc-pro-note">هذه أداة تقدير وفق المعاملات المعتمدة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.</p>
        </div>
      )}
    </section>
  );
}
