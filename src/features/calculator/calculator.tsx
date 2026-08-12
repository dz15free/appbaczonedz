"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  calculate, gradeError, totalCoef, type Branch, type CalcResult,
} from "@/features/calculator/branches";

/* ════════════════════════════════════════════════════════════
   الحاسبة

   **منطق الحساب لم يُمسّ** — مُختبَر ضدّ الأصل: 2800/2800 تطابق.
   المُحسَّن هو الإدخال وحده: لوحة أرقام عشرية على الهاتف، تحقّق فوري،
   انتقال تلقائي، ونتيجة تُفسَّر لا تُعرض رقماً وحسب.

   90% من الزوّار على الهاتف — فالتصميم يبدأ من الهاتف لا يُقلَّص إليه.
════════════════════════════════════════════════════════════ */

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
    const e: Record<string, string | null> = {};
    for (const s of branch.subjects) {
      e[s.name] = gradeError(grades[s.name] ?? "", s.optional);
    }
    return e;
  }, [grades, branch]);

  function set(name: string, v: string) {
    // نقبل الفاصلة العربية والإنجليزية، ونمنع ما ليس رقماً
    const clean = v.replace(/[^\d.,]/g, "").slice(0, 5);
    setGrades((g) => ({ ...g, [name]: clean }));
    setResult(null);
  }

  function run() {
    setShowErr(true);
    const r = calculate(branch, grades);
    setResult(r);
    if (r) {
      // ننتقل إلى النتيجة: على الهاتف تكون أسفل الشاشة
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    } else {
      const first = branch.subjects.findIndex((s) => errors[s.name]);
      if (first >= 0) refs.current[first]?.focus();
    }
  }

  function reset() {
    setGrades({});
    setTouched({});
    setResult(null);
    setShowErr(false);
  }

  return (
    <div className="bz-calc">
      {/* شريط التقدّم — الطالب يرى كم بقي */}
      <div className="bz-calc-progress" aria-hidden>
        <span style={{ width: `${progress}%`, background: branch.color }} />
      </div>
      <p className="bz-calc-count">
        {filled} من {required.length} مادّة
      </p>

      <div className="bz-calc-grid">
        {branch.subjects.map((s, i) => {
          const v = grades[s.name] ?? "";
          const err = errors[s.name];
          const bad = Boolean(err) && (showErr || touched[s.name]) && !(s.optional && v === "");
          return (
            <label key={s.name} className={`bz-calc-row ${bad ? "is-bad" : ""} ${v && !err ? "is-ok" : ""}`}>
              <span className="bz-calc-name">
                {s.name}
                {s.optional && <span className="bz-calc-opt">اختيارية — بونص</span>}
              </span>
              <span className="bz-calc-coef" style={{ color: branch.color }}>×{s.coef}</span>
              <input
                ref={(el) => { refs.current[i] = el; }}
                value={v}
                onChange={(e) => set(s.name, e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, [s.name]: true }))}
                onKeyDown={(e) => { if (e.key === "Enter") refs.current[i + 1]?.focus(); }}
                /* لوحة الأرقام العشرية على الهاتف: كتابة العلامة بلوحة
                   الحروف الكاملة أبطأ بكثير وأكثر خطأً. */
                inputMode="decimal"
                enterKeyHint={i === branch.subjects.length - 1 ? "done" : "next"}
                placeholder="0–20"
                aria-label={`علامة ${s.name}`}
                aria-invalid={bad || undefined}
                className="bz-calc-input"
              />
              {bad && <span className="bz-calc-err">{err}</span>}
            </label>
          );
        })}
      </div>

      <div className="bz-calc-actions">
        <button onClick={run} className="bz-calc-go" style={{ background: branch.color }}>
          احسب معدّلي
        </button>
        <button onClick={reset} className="bz-calc-reset">تفريغ</button>
      </div>

      {showErr && !result && (
        <p className="bz-calc-hint">
          أكمل علامات المواد الإجبارية بقيم بين 0 و20. المادّة الاختيارية يمكن تركها فارغة.
        </p>
      )}

      {result && (
        <div ref={resultRef} className="bz-calc-result" style={{ borderColor: `${branch.color}44` }}>
          <span className="bz-calc-res-label">معدّلك في {branch.short}</span>
          <span className="bz-calc-res-num" style={{ color: branch.color }}>
            {result.average.toFixed(2)}
          </span>
          <span className={`bz-calc-res-tag ${result.passed ? "is-pass" : "is-fail"}`}>
            {result.passed ? `ناجح — ${result.mention}` : "دون المعدّل"}
          </span>

          <div className="bz-calc-detail">
            <div><span>مجموع النقاط</span><b>{result.totalPoints.toFixed(2)}</b></div>
            <div><span>مجموع المعاملات</span><b>{result.totalCoef}</b></div>
            {result.bonus > 0 && (
              <div><span>نقاط البونص</span><b style={{ color: branch.color }}>+{result.bonus.toFixed(2)}</b></div>
            )}
          </div>

          <p className="bz-calc-formula">
            {result.totalPoints.toFixed(2)} ÷ {result.totalCoef} = <b>{result.average.toFixed(2)}</b>
          </p>

          {/* الخطوة التالية: من عرف معدّله يسأل «وماذا الآن؟» */}
          <div className="bz-calc-next">
            <p className="bz-calc-next-t">وماذا بعد؟</p>
            <a href="https://www.baczonedz.com/p/2026.html" target="_blank" rel="noreferrer" className="bz-calc-next-a">
              احسب معدّلك الموزون للتوجيه الجامعي
            </a>
            <Link href="/specialties" className="bz-calc-next-a">
              تعرّف على التخصّصات الجامعية ومعدّلات قبولها
            </Link>
          </div>

          <p className="bz-calc-note">
            هذه الحاسبة أداة تقدير وفق المعاملات المعتمدة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.
          </p>
        </div>
      )}

      <p className="bz-calc-total">
        مجموع معاملات {branch.short}: <b>{totalCoef(branch)}</b>
      </p>
    </div>
  );
}
