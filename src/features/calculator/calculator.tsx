"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faAward,
  faBolt,
  faBookOpen,
  faCalculator,
  faChartLine,
  faCheck,
  faCircleCheck,
  faCircleInfo,
  faIdCard,
  faRotateLeft,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  calculate,
  gradeError,
  totalCoef,
  type Branch,
  type CalcResult,
} from "@/features/calculator/branches";

function createRegistrationNumber() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `2027${suffix}`;
}

export function Calculator({ branch }: { branch: Branch }) {
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [showErr, setShowErr] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const required = branch.subjects.filter((s) => !s.optional);
  const filled = required.filter((s) => (grades[s.name] ?? "").trim() !== "").length;
  const progress = Math.round((filled / Math.max(1, required.length)) * 100);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    for (const s of branch.subjects) {
      e[s.name] = gradeError(grades[s.name] ?? "", s.optional);
    }
    return e;
  }, [grades, branch]);

  function set(name: string, value: string) {
    const clean = value
      .replace(/[^\d.,]/g, "")
      .replace(/([.,].*)[.,]/g, "$1")
      .slice(0, 5);
    setGrades((current) => ({ ...current, [name]: clean }));
    setResult(null);
    setRegistrationNumber("");
  }

  function run() {
    setShowErr(true);
    const nextResult = calculate(branch, grades);
    setResult(nextResult);

    if (nextResult) {
      setRegistrationNumber(createRegistrationNumber());
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    } else {
      const first = branch.subjects.findIndex((s) => errors[s.name]);
      if (first >= 0) refs.current[first]?.focus();
    }
  }

  function reset() {
    setGrades({});
    setTouched({});
    setResult(null);
    setRegistrationNumber("");
    setShowErr(false);
  }

  return (
    <div className="bz-calc">
      <div className="bz-calc-head">
        <div className="bz-calc-head-icon" style={{ background: `${branch.color}15`, color: branch.color }}>
          <FontAwesomeIcon icon={faCalculator} aria-hidden="true" />
        </div>
        <div>
          <p className="bz-calc-eyebrow">حاسبة دقيقة وفورية</p>
          <h2 className="bz-calc-title">أدخل علاماتك واحسب النتيجة</h2>
          <p className="bz-calc-subtitle">علامة من 0 إلى 20، والمادة الاختيارية تُحتسب كبونص فقط.</p>
        </div>
      </div>

      <div className="bz-calc-progress-wrap">
        <div className="bz-calc-progress-meta">
          <span><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> {filled} من {required.length} مادة مكتملة</span>
          <b style={{ color: branch.color }}>{progress}%</b>
        </div>
        <div
          className="bz-calc-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="نسبة إدخال علامات المواد الإجبارية"
        >
          <span style={{ width: `${progress}%`, background: branch.color }} />
        </div>
      </div>

      <div className="bz-calc-grid">
        {branch.subjects.map((subject, index) => {
          const value = grades[subject.name] ?? "";
          const error = errors[subject.name];
          const isInvalid = Boolean(error) && (showErr || touched[subject.name]) && !(subject.optional && value === "");
          const isValid = Boolean(value) && !error;

          return (
            <label
              key={subject.name}
              className={`bz-calc-row ${isInvalid ? "is-bad" : ""} ${isValid ? "is-ok" : ""}`}
            >
              <span className="bz-calc-row-index" style={{ color: branch.color }} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="bz-calc-name">
                <span>{subject.name}</span>
                {subject.optional && <small className="bz-calc-opt">اختيارية — بونص</small>}
              </span>
              <span className="bz-calc-coef" style={{ color: branch.color }}>×{subject.coef}</span>
              <span className="bz-calc-input-wrap">
                <input
                  ref={(element) => { refs.current[index] = element; }}
                  value={value}
                  onChange={(event) => set(subject.name, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, [subject.name]: true }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") refs.current[index + 1]?.focus();
                  }}
                  inputMode="decimal"
                  enterKeyHint={index === branch.subjects.length - 1 ? "done" : "next"}
                  placeholder="0–20"
                  aria-label={`علامة ${subject.name}`}
                  aria-invalid={isInvalid || undefined}
                  dir="ltr"
                  className="bz-calc-input"
                />
                {isValid && <FontAwesomeIcon className="bz-calc-input-check" icon={faCircleCheck} aria-label="علامة صحيحة" />}
              </span>
              {isInvalid && <span className="bz-calc-err">{error}</span>}
            </label>
          );
        })}
      </div>

      <div className="bz-calc-actions">
        <button type="button" onClick={run} className="bz-calc-go" style={{ background: branch.color }}>
          <FontAwesomeIcon icon={faChartLine} aria-hidden="true" />
          احسب معدّلي الآن
          <FontAwesomeIcon className="bz-calc-go-arrow" icon={faArrowLeft} aria-hidden="true" />
        </button>
        <button type="button" onClick={reset} className="bz-calc-reset">
          <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" />
          تفريغ
        </button>
      </div>

      {showErr && !result && (
        <p className="bz-calc-hint" role="alert">
          <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
          أكمل علامات المواد الإجبارية بقيم بين 0 و20. ويمكن ترك المادة الاختيارية فارغة.
        </p>
      )}

      {result && (
        <div
          ref={resultRef}
          className={`bz-calc-result ${result.passed ? "is-pass" : "is-fail"}`}
          style={{ borderColor: `${branch.color}44`, "--result-color": branch.color } as React.CSSProperties}
          aria-live="polite"
        >
          <div className="bz-calc-result-topline">
            <span className="bz-calc-result-chip">
              <FontAwesomeIcon icon={result.passed ? faCircleCheck : faTriangleExclamation} aria-hidden="true" />
              {result.passed ? "نتيجة ناجحة" : "نتيجة تقديرية"}
            </span>
            <span className="bz-calc-result-date">بكالوريا 2027</span>
          </div>

          <div className="bz-calc-result-badge" style={{ color: branch.color }}>
            <FontAwesomeIcon icon={result.passed ? faAward : faBookOpen} aria-hidden="true" />
          </div>
          <span className="bz-calc-res-label">معدّلك في شعبة {branch.short}</span>
          <span className="bz-calc-res-num" style={{ color: branch.color }}>{result.average.toFixed(2)}</span>
          <span className="bz-calc-res-scale">من 20 نقطة</span>
          <h3 className="bz-calc-result-title">
            {result.passed ? "ألف مبروك، أنت ناجح!" : "لا تستسلم، واصل التقدم"}
          </h3>
          <p className="bz-calc-result-message">
            {result.passed
              ? `بتقدير ${result.mention} — تعبك اليوم يصنع نجاحك غدًا.`
              : "معدّلك أقل من 10 حاليًا. راجع المواد ذات المعامل الأكبر وحاول من جديد."}
          </p>

          <div className="bz-calc-registration">
            <span><FontAwesomeIcon icon={faIdCard} aria-hidden="true" /> رقم التسجيل التقديري</span>
            <b dir="ltr">{registrationNumber}</b>
            <small>رقم عشوائي للعرض فقط وليس وثيقة رسمية.</small>
          </div>

          <div className="bz-calc-detail">
            <div><span>التقدير</span><b>{result.mention}</b></div>
            <div><span>مجموع النقاط</span><b>{result.totalPoints.toFixed(2)}</b></div>
            <div><span>المعاملات</span><b>{result.totalCoef}</b></div>
            {result.bonus > 0 && (
              <div><span>نقاط البونص</span><b style={{ color: branch.color }}>+{result.bonus.toFixed(2)}</b></div>
            )}
          </div>

          <p className="bz-calc-formula">
            مجموع النقاط {result.totalPoints.toFixed(2)} ÷ {result.totalCoef} = <b>{result.average.toFixed(2)}</b>
          </p>

          <div className="bz-calc-next">
            <p className="bz-calc-next-t"><FontAwesomeIcon icon={faBolt} aria-hidden="true" /> الخطوة التالية</p>
            <a href="https://www.baczonedz.com/p/2026.html" target="_blank" rel="noreferrer" className="bz-calc-next-a">
              احسب معدّلك الموزون للتوجيه الجامعي <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
            </a>
            <Link href="/specialties" className="bz-calc-next-a">
              تعرّف على التخصّصات الجامعية ومعدّلات قبولها <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
            </Link>
          </div>

          <p className="bz-calc-note">
            <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
            هذه الحاسبة أداة تقدير وفق المعاملات المعتمدة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.
          </p>
        </div>
      )}

      <div className="bz-calc-footer-note">
        <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
        مجموع معاملات شعبة {branch.short}: <b>{totalCoef(branch)}</b>
      </div>
    </div>
  );
}
