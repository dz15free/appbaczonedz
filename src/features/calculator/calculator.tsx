"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalculator,
  faCheck,
  faCircleExclamation,
  faLightbulb,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  calculate,
  gradeError,
  type Branch,
  type CalcResult,
} from "@/features/calculator/branches";

function resultMessage(result: CalcResult) {
  if (result.passed) {
    return result.average >= 16
      ? "أداء قوي. واصل بنفس النسق وراجع المواد ذات المعامل الأعلى."
      : "ألف مبروك، أنت ناجح. استمر في تحسين المواد التي تحتاج دعماً إضافياً.";
  }
  return "لم تصل إلى معدل النجاح بعد. لا تتوقف؛ حدّد المواد ذات المعامل الأعلى وابدأ منها.";
}

export function Calculator({ branch }: { branch: Branch }) {
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showErr, setShowErr] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const required = branch.subjects.filter((s) => !s.optional);
  const filled = required.filter((s) => (grades[s.name] ?? "").trim() !== "").length;
  const progress = Math.round((filled / Math.max(1, required.length)) * 100);

  const errors = useMemo(() => {
    const next: Record<string, string | null> = {};
    for (const subject of branch.subjects) {
      next[subject.name] = gradeError(grades[subject.name] ?? "", subject.optional);
    }
    return next;
  }, [grades, branch]);

  function setGrade(name: string, value: string) {
    const clean = value.replace(/[^\d.,]/g, "").slice(0, 5);
    setGrades((current) => ({ ...current, [name]: clean }));
    setResult(null);
  }

  function run() {
    setShowErr(true);
    const next = calculate(branch, grades);
    setResult(next);

    if (next) {
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        resultRef.current?.focus({ preventScroll: true });
      }, 60);
      return;
    }

    const firstInvalid = branch.subjects.findIndex((subject) => {
      const value = grades[subject.name] ?? "";
      return Boolean(errors[subject.name]) && !(subject.optional && value === "");
    });
    if (firstInvalid >= 0) refs.current[firstInvalid]?.focus();
  }

  function reset() {
    setGrades({});
    setTouched({});
    setResult(null);
    setShowErr(false);
    refs.current[0]?.focus();
  }

  return (
    <section className="bz-calc" aria-label={`حاسبة معدل شعبة ${branch.short}`}>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
          style={{ background: branch.color }}
          aria-hidden
        >
          <FontAwesomeIcon icon={faCalculator} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bz-ink-3)]">
            إدخال العلامات
          </p>
          <h2 className="truncate font-display text-base font-extrabold text-[var(--bz-ink)] sm:text-lg">
            احسب معدّلك في {branch.short}
          </h2>
        </div>
      </div>

      <div className="bz-calc-progress" aria-label={`تم إدخال ${progress}% من العلامات المطلوبة`}>
        <span style={{ width: `${progress}%`, background: branch.color }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--bz-ink-3)]">
        <span>{progress === 0 ? "ابدأ بإدخال علاماتك" : `أكملت ${progress}% من الإدخال`}</span>
        <span>{filled > 0 ? "يمكنك تعديل أي علامة قبل الحساب" : "القيم بين 0 و20"}</span>
      </div>

      <div className="bz-calc-grid mt-4">
        {branch.subjects.map((subject, index) => {
          const value = grades[subject.name] ?? "";
          const error = errors[subject.name];
          const invalid = Boolean(error) && (showErr || touched[subject.name]) && !(subject.optional && value === "");
          const valid = value !== "" && !error;

          return (
            <label
              key={subject.name}
              className={`bz-calc-row ${invalid ? "is-bad" : ""} ${valid ? "is-ok" : ""}`}
            >
              <span className="bz-calc-name">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate">{subject.name}</span>
                  {valid && (
                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3 shrink-0 text-emerald-600" aria-label="علامة صالحة" />
                  )}
                </span>
                {subject.optional && <span className="bz-calc-opt">اختيارية — تحسب كبونص</span>}
              </span>
              <span className="bz-calc-coef" style={{ color: branch.color }}>×{subject.coef}</span>
              <input
                ref={(element) => { refs.current[index] = element; }}
                value={value}
                onChange={(event) => setGrade(subject.name, event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, [subject.name]: true }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") refs.current[index + 1]?.focus();
                }}
                inputMode="decimal"
                enterKeyHint={index === branch.subjects.length - 1 ? "done" : "next"}
                placeholder="0–20"
                aria-label={`علامة ${subject.name}`}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${branch.slug}-${index}-error` : undefined}
                className="bz-calc-input"
              />
              {invalid && (
                <span id={`${branch.slug}-${index}-error`} className="bz-calc-err">
                  <FontAwesomeIcon icon={faCircleExclamation} className="me-1 h-3 w-3" />
                  {error}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="bz-calc-actions">
        <button onClick={run} className="bz-calc-go" style={{ background: branch.color }}>
          <FontAwesomeIcon icon={faCalculator} className="me-2 h-4 w-4" />
          احسب النتيجة
        </button>
        <button onClick={reset} className="bz-calc-reset" aria-label="تفريغ العلامات">
          <FontAwesomeIcon icon={faRotateLeft} className="me-1.5 h-3.5 w-3.5" />
          تفريغ
        </button>
      </div>

      {showErr && !result && (
        <p className="bz-calc-hint" role="alert">
          <FontAwesomeIcon icon={faCircleExclamation} className="me-1.5 h-3.5 w-3.5" />
          أكمل العلامات المطلوبة بقيم بين 0 و20. يمكن ترك المادة الاختيارية فارغة.
        </p>
      )}

      {result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          className={`bz-calc-result ${result.passed ? "is-pass" : "is-fail"}`}
          style={{ borderColor: `${branch.color}55` }}
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 text-[12px] font-extrabold text-[var(--bz-ink-3)]">
            <span className={`grid h-7 w-7 place-items-center rounded-full ${result.passed ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
              <FontAwesomeIcon icon={result.passed ? faCheck : faLightbulb} className="h-3.5 w-3.5" />
            </span>
            نتيجتك في {branch.short}
          </div>
          <span className="bz-calc-res-num" style={{ color: branch.color }}>
            {result.average.toFixed(2)}
            <small>/20</small>
          </span>
          <span className={`bz-calc-res-tag ${result.passed ? "is-pass" : "is-fail"}`}>
            {result.passed ? `ناجح — ${result.mention}` : "دون معدل النجاح"}
          </span>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-[1.9] text-[var(--bz-ink-2)]">
            {resultMessage(result)}
          </p>

          <div className="bz-calc-detail">
            <div><span>مجموع النقاط</span><b>{result.totalPoints.toFixed(2)}</b></div>
            <div><span>المعاملات المحتسبة</span><b>{result.totalCoef}</b></div>
            {result.bonus > 0 && (
              <div><span>نقاط البونص</span><b style={{ color: branch.color }}>+{result.bonus.toFixed(2)}</b></div>
            )}
          </div>

          <p className="bz-calc-formula">
            مجموع النقاط ÷ المعاملات المحتسبة = <b>{result.average.toFixed(2)}</b>
          </p>

          <div className="bz-calc-next">
            <p className="bz-calc-next-t">خطوتك التالية</p>
            <a href="https://www.baczonedz.com/p/2026.html" target="_blank" rel="noreferrer" className="bz-calc-next-a">
              احسب معدّلك الموزون للتوجيه الجامعي <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" />
            </a>
            <Link href="/specialties" className="bz-calc-next-a">
              تعرّف على التخصّصات الجامعية ومعدّلات قبولها <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" />
            </Link>
          </div>

          <p className="bz-calc-note">
            هذه النتيجة تقديرية وفق المعاملات الموجودة في الصفحة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.
          </p>
        </div>
      )}
    </section>
  );
}
