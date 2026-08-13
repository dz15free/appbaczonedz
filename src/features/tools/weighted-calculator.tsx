"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCalculator, faCircleCheck, faRotateLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { W_DOMAINS, computeWeighted, gradeError, type WDomain, type WResult } from "@/features/tools/weighted";

type WeightedPhase = "idle" | "ready" | "counting";

export function WeightedCalculator() {
  const [domain, setDomain] = useState<WDomain>(W_DOMAINS[0]);
  const [bac, setBac] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [result, setResult] = useState<WResult | null>(null);
  const [pendingResult, setPendingResult] = useState<WResult | null>(null);
  const [phase, setPhase] = useState<WeightedPhase>("idle");
  const [count, setCount] = useState(5);
  const [showErr, setShowErr] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const countdownDeadlineRef = useRef<number | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = { bac: gradeError(bac) };
    for (const field of domain.fields) e[field.id] = gradeError(vals[field.id] ?? "");
    return e;
  }, [bac, vals, domain]);

  useEffect(() => {
    let timer: number | undefined;
    let interval: number | undefined;

    if (phase === "ready") {
      timer = window.setTimeout(() => {
        countdownDeadlineRef.current = Date.now() + 5000;
        setCount(5);
        setPhase("counting");
      }, 600);
      return () => { if (timer !== undefined) window.clearTimeout(timer); };
    }

    if (phase !== "counting") return undefined;

    const deadline = countdownDeadlineRef.current ?? (Date.now() + 5000);
    countdownDeadlineRef.current = deadline;
    const syncCount = () => {
      const remaining = deadline - Date.now();
      const next = Math.max(0, Math.ceil(remaining / 1000));
      setCount((current) => (current === next ? current : next));
      if (remaining <= 0) {
        if (interval !== undefined) window.clearInterval(interval);
        countdownDeadlineRef.current = null;
        setPhase("idle");
        setResult(pendingResult);
        setPendingResult(null);
        window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      }
    };
    syncCount();
    interval = window.setInterval(syncCount, 60);
    return () => { if (interval !== undefined) window.clearInterval(interval); };
  }, [phase, pendingResult]);

  function pick(nextDomain: WDomain) {
    setDomain(nextDomain);
    setVals({});
    setResult(null);
    setPendingResult(null);
    setPhase("idle");
    countdownDeadlineRef.current = null;
    setShowErr(false);
  }

  function clean(value: string) { return value.replace(/[^\d.,]/g, "").slice(0, 5); }

  function run() {
    setShowErr(true);
    const nextResult = computeWeighted(domain, bac, vals);
    if (!nextResult) return;
    setResult(null);
    setPendingResult(nextResult);
    countdownDeadlineRef.current = null;
    setCount(5);
    setPhase("ready");
  }

  function reset() {
    setBac("");
    setVals({});
    setResult(null);
    setPendingResult(null);
    setPhase("idle");
    countdownDeadlineRef.current = null;
    setCount(5);
    setShowErr(false);
  }

  const busy = phase !== "idle";
  const fieldsCount = domain.fields.length + 1;

  return (
    <section className="bz-weighted-pro" aria-label="حاسبة المعدل الموزون">
      <div className="bz-weighted-pro-steps">
        <span className="is-active"><b>1</b> اختر الميدان</span><i /><span className="is-active"><b>2</b> أدخل العلامات</span><i /><span><b>3</b> افهم الفرق</span>
      </div>
      <div className="bz-weighted-pro-domain-head">
        <div className="bz-weighted-pro-icon" style={{ background: `${domain.color}17`, color: domain.color }}><FontAwesomeIcon icon={faCalculator} /></div>
        <div><p>المرحلة الأولى · أين تريد أن تترشح؟</p><h2>اختر ميدان التخصّص</h2></div>
        <span>{W_DOMAINS.length} ميادين</span>
      </div>
      <div className="bz-weighted-pro-domains">
        {W_DOMAINS.map((item) => <button type="button" key={item.id} onClick={() => pick(item)} className={domain.id === item.id ? "is-selected" : ""} style={domain.id === item.id ? { borderColor: item.color, background: `${item.color}12`, color: item.color } : undefined}>{item.title}</button>)}
      </div>
      <div className="bz-weighted-pro-formula" style={{ borderColor: `${domain.color}33` }}>
        <strong>{domain.title}</strong><span>{domain.desc}</span><b style={{ color: domain.color }}>{domain.formulaText}</b>
      </div>
      <div className="bz-weighted-pro-fields">
        <label className={`bz-weighted-pro-field ${showErr && errors.bac ? "is-invalid" : ""}`}>
          <span className="bz-weighted-pro-field-index">01</span><span><b>معدّل البكالوريا</b><small>يُحسب مرتين في المعادلة · ×2</small></span>
          <input value={bac} onChange={(event) => { setBac(clean(event.target.value)); setResult(null); }} inputMode="decimal" placeholder="0–20" aria-label="معدل البكالوريا" />
          {showErr && errors.bac && <em><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.bac}</em>}
        </label>
        {domain.fields.map((field, index) => <label key={field.id} className={`bz-weighted-pro-field ${showErr && errors[field.id] ? "is-invalid" : ""}`}>
          <span className="bz-weighted-pro-field-index">{String(index + 2).padStart(2, "0")}</span><span><b>{field.label}</b><small>مادّة الترجيح · ×1</small></span>
          <input value={vals[field.id] ?? ""} onChange={(event) => { setVals((current) => ({ ...current, [field.id]: clean(event.target.value) })); setResult(null); }} inputMode="decimal" placeholder="0–20" aria-label={field.label} />
          {showErr && errors[field.id] && <em><FontAwesomeIcon icon={faTriangleExclamation} /> {errors[field.id]}</em>}
        </label>)}
      </div>
      {domain.fields.length === 0 && <div className="bz-weighted-pro-no-weight">هذا الميدان يعتمد معدل البكالوريا العام مباشرةً، بلا ترجيح إضافي.</div>}
      <div className="bz-weighted-pro-actions"><button type="button" onClick={run} disabled={busy} style={{ background: domain.color }}><FontAwesomeIcon icon={faCalculator} /> {busy ? "نجهّز النتيجة…" : "احسب المعدّل الموزون"}</button><button type="button" onClick={reset}><FontAwesomeIcon icon={faRotateLeft} /> تفريغ</button></div>
      <p className="bz-weighted-pro-count">{fieldsCount} {fieldsCount === 1 ? "حقل" : "حقول"} · علامات بين 0 و20 · بلا تسجيل</p>
      {showErr && !result && !busy && <p className="bz-weighted-pro-hint">أكمل كل الحقول بقيم بين 0 و20، ثم جرّب الحساب من جديد.</p>}
      {busy && <div className="bz-weighted-pro-countdown" role="status" aria-live="polite"><div style={{ borderColor: `${domain.color}55` }}>{phase === "ready" ? <FontAwesomeIcon icon={faCalculator} /> : count}</div><b>{phase === "ready" ? "هل أنت مستعد؟" : "نقرأ أثر الترجيح…"}</b><span>لحظة قصيرة، ثم تظهر المقارنة</span></div>}
      {result && <div ref={resultRef} className="bz-weighted-pro-result" style={{ borderColor: `${domain.color}55` }}>
        <div className="bz-weighted-pro-result-top"><span style={{ color: domain.color, background: `${domain.color}17` }}><FontAwesomeIcon icon={faCircleCheck} /></span><p><small>نتيجتك في {domain.title}</small><b>المعدل الموزون</b></p><button type="button" onClick={reset} aria-label="إعادة الحساب"><FontAwesomeIcon icon={faRotateLeft} /></button></div>
        <strong className="bz-weighted-pro-number" style={{ color: domain.color }}>{result.weighted.toFixed(2)}<small>/20</small></strong>
        <div className="bz-weighted-pro-compare"><div><small>معدّل البكالوريا</small><b>{result.bac.toFixed(2)}</b></div><div><small>أثر الترجيح</small><b style={{ color: result.delta >= 0 ? "var(--bz-green)" : "var(--bz-amber)" }}>{result.delta >= 0 ? "+" : ""}{result.delta.toFixed(2)}</b></div></div>
        <p className="bz-weighted-pro-explain">{result.delta > 0.05 ? "الترجيح في صالحك: علامة مادة التخصّص أعلى من معدّلك العام." : result.delta < -0.05 ? "الترجيح ليس في صالحك هنا: علامة التخصّص أقل من معدّلك العام." : "الترجيح لم يغيّر معدّلك تغييراً يُذكر في هذا الميدان."}</p>
        <div className="bz-weighted-pro-next"><span>وماذا بعد؟</span><Link href="/specialties">اكتشف التخصصات الجامعية <FontAwesomeIcon icon={faArrowLeft} /></Link><Link href="/calculate">احسب معدل البكالوريا <FontAwesomeIcon icon={faArrowLeft} /></Link></div>
      </div>}
    </section>
  );
}
