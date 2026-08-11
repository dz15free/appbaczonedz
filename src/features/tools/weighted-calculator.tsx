"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  W_DOMAINS, computeWeighted, gradeError, type WDomain, type WResult,
} from "@/features/tools/weighted";

/* ════════════════════════════════════════════════════════════
   حاسبة المعدّل الموزون

   **المعادلات كما هي في أداتك** — لم يُغيَّر رقم واحد (3500/3500 مطابقة
   بالتنفيذ). المُحسَّن هو الإدخال والعرض وحدهما.

   90% من الزوّار على الهاتف: لوحة أرقام عشرية، حقول 44px، خطّ 16px
   يمنع تكبير iOS التلقائي عند التركيز.
════════════════════════════════════════════════════════════ */

export function WeightedCalculator() {
  const [domain, setDomain] = useState<WDomain>(W_DOMAINS[0]);
  const [bac, setBac] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [result, setResult] = useState<WResult | null>(null);
  const [showErr, setShowErr] = useState(false);
  const resRef = useRef<HTMLDivElement>(null);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = { bac: gradeError(bac) };
    for (const f of domain.fields) e[f.id] = gradeError(vals[f.id] ?? "");
    return e;
  }, [bac, vals, domain]);

  function pick(d: WDomain) {
    setDomain(d);
    setVals({});
    setResult(null);
    setShowErr(false);
  }

  function set(id: string, v: string) {
    const clean = v.replace(/[^\d.,]/g, "").slice(0, 5);
    setVals((s) => ({ ...s, [id]: clean }));
    setResult(null);
  }

  function run() {
    setShowErr(true);
    const r = computeWeighted(domain, bac, vals);
    setResult(r);
    if (r) setTimeout(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  return (
    <div className="bz-calc">
      <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">اختر ميدان التخصّص</p>
      <div className="bz-hide-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 sm:flex-wrap">
        {W_DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => pick(d)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-[12px] font-bold transition ${
              domain.id === d.id ? "text-white" : "border-[var(--bz-line)] text-[var(--bz-ink-2)]"
            }`}
            style={domain.id === d.id ? { background: d.color, borderColor: d.color } : undefined}
          >
            {d.title}
          </button>
        ))}
      </div>

      <p className="mb-3 rounded-xl bg-[var(--bz-canvas)] p-3 text-[12.5px] leading-[1.9] text-[var(--bz-ink-2)]">
        {domain.desc}
        <br />
        <span className="mt-1 inline-block font-bold" style={{ color: domain.color }}>
          {domain.formulaText}
        </span>
      </p>

      <div className="bz-calc-grid">
        <label className={`bz-calc-row ${showErr && errors.bac ? "is-bad" : ""} ${bac && !errors.bac ? "is-ok" : ""}`}>
          <span className="bz-calc-name">
            معدّل البكالوريا
            <span className="bz-calc-opt" style={{ color: domain.color }}>يُحسب مرّتين في المعادلة</span>
          </span>
          <span className="bz-calc-coef" style={{ color: domain.color }}>×2</span>
          <input
            value={bac}
            onChange={(e) => { setBac(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5)); setResult(null); }}
            inputMode="decimal"
            placeholder="0–20"
            aria-label="معدل البكالوريا"
            className="bz-calc-input"
          />
          {showErr && errors.bac && <span className="bz-calc-err">{errors.bac}</span>}
        </label>

        {domain.fields.map((f) => {
          const bad = showErr && errors[f.id];
          const ok = (vals[f.id] ?? "") && !errors[f.id];
          return (
            <label key={f.id} className={`bz-calc-row ${bad ? "is-bad" : ""} ${ok ? "is-ok" : ""}`}>
              <span className="bz-calc-name">{f.label}</span>
              <span className="bz-calc-coef" style={{ color: domain.color }}>×1</span>
              <input
                value={vals[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
                inputMode="decimal"
                placeholder="0–20"
                aria-label={f.label}
                className="bz-calc-input"
              />
              {bad && <span className="bz-calc-err">{errors[f.id]}</span>}
            </label>
          );
        })}
      </div>

      {domain.fields.length === 0 && (
        <p className="mt-3 rounded-xl bg-[var(--bz-blue-050)] p-3 text-[12px] leading-relaxed text-[var(--bz-blue-700)]">
          هذا الميدان لا يعتمد الترجيح: معدّلك الموزون هو معدّل بكالوريتك نفسه.
        </p>
      )}

      <div className="bz-calc-actions">
        <button onClick={run} className="bz-calc-go" style={{ background: domain.color }}>
          احسب المعدّل الموزون
        </button>
        <button
          onClick={() => { setBac(""); setVals({}); setResult(null); setShowErr(false); }}
          className="bz-calc-reset"
        >
          تفريغ
        </button>
      </div>

      {showErr && !result && (
        <p className="bz-calc-hint">أكمل الحقول بقيم بين 0 و20.</p>
      )}

      {result && (
        <div ref={resRef} className="bz-calc-result" style={{ borderColor: `${domain.color}44` }}>
          <span className="bz-calc-res-label">معدّلك الموزون</span>
          <span className="bz-calc-res-num" style={{ color: domain.color }}>
            {result.weighted.toFixed(2)}
          </span>

          <div className="bz-calc-detail">
            <div><span>معدّل البكالوريا</span><b>{result.bac.toFixed(2)}</b></div>
            <div>
              <span>الفرق</span>
              <b style={{ color: result.delta >= 0 ? "var(--bz-green)" : "var(--bz-amber)" }}>
                {result.delta >= 0 ? "+" : ""}{result.delta.toFixed(2)}
              </b>
            </div>
          </div>

          {/* الفرق يُفسَّر لا يُعرض رقماً وحسب */}
          <p className="bz-calc-formula">
            {result.delta > 0.05
              ? "الترجيح في صالحك: علامتك في مادّة التخصّص أعلى من معدّلك العامّ."
              : result.delta < -0.05
                ? "الترجيح ليس في صالحك هنا: علامة التخصّص أقلّ من معدّلك العامّ."
                : "الترجيح لم يُغيّر شيئاً يُذكر في هذا الميدان."}
          </p>

          <div className="bz-calc-next">
            <p className="bz-calc-next-t">وماذا بعد؟</p>
            <Link href="/specialties" className="bz-calc-next-a">
              تعرّف على التخصّصات الجامعية ومعدّلات قبولها
            </Link>
            <Link href="/calculate" className="bz-calc-next-a">
              احسب معدّل بكالوريتك أوّلاً إن لم تكن تعرفه
            </Link>
          </div>

          <p className="bz-calc-note">
            المعدّل الموزون يُستعمل في ترتيب الرغبات لبعض الميادين. النتيجة الرسمية
            تصدر عن الجهات المعنيّة، وهذه أداة تقدير وفق الصيغ المعتمدة.
          </p>
        </div>
      )}
    </div>
  );
}
