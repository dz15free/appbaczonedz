"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PLAN_BRANCHES, WEEK_DAYS, getBranch, cellOptions,
} from "@/features/tools/planner-data";

/* ════════════════════════════════════════════════════════════
   مولّد جدول المراجعة

   **نفس منطق أداتك**: أربع خطوات — الشعبة ← الأيّام ← الفترات ←
   الشبكة التفاعلية. والمواد والنصائح منقولة حرفياً.

   ولماذا يملأ الطالب الشبكة بنفسه بدل توليد آلي: **الجدول الذي يضعه
   صاحبه يُنفَّذ، والجدول الذي يُفرَض عليه يُهمَل**. دورنا أن نُظهر
   المعاملات ونُسهّل الملء، لا أن نقرّر عنه.

   ولا حفظ في قاعدة البيانات: يعمل بلا تسجيل، والطالب يطبعه أو يصوّره.
════════════════════════════════════════════════════════════ */

type Slot = { from: string; to: string };

const DEFAULT_SLOTS: Slot[] = [
  { from: "16:00", to: "17:30" },
  { from: "18:00", to: "19:30" },
];

export function StudyPlanner() {
  const [step, setStep] = useState(1);
  const [branch, setBranch] = useState("");
  const [days, setDays] = useState<string[]>([...WEEK_DAYS].slice(0, 6));
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [grid, setGrid] = useState<Record<string, string>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const b = useMemo(() => getBranch(branch), [branch]);
  const options = useMemo(() => (branch ? cellOptions(branch) : []), [branch]);
  const color = b?.color ?? "#2350D9";

  const filled = Object.values(grid).filter(Boolean).length;
  const total = days.length * slots.length;

  function toggleDay(d: string) {
    setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));
  }

  function setSlot(i: number, patch: Partial<Slot>) {
    setSlots((v) => v.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function go(n: number) {
    if (n === 2 && !branch) return;
    if (n === 3 && (days.length === 0 || slots.length === 0)) return;
    setStep(n);
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <div ref={gridRef} className="bz-calc">
      {/* شريط الخطوات */}
      <div className="bz-plan-steps">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`bz-plan-dot ${step >= n ? "is-on" : ""}`}
            style={step >= n ? { background: color, borderColor: color } : undefined}>
            {n}
          </span>
        ))}
        <span className="bz-plan-line"><span style={{ width: `${((step - 1) / 2) * 100}%`, background: color }} /></span>
      </div>

      {/* ── 1) الشعبة ── */}
      {step === 1 && (
        <>
          <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">اختر شعبتك</p>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_BRANCHES.map((x) => (
              <button
                key={x.name}
                onClick={() => { setBranch(x.name); setGrid({}); }}
                className={`rounded-xl border px-3 py-3 text-[13px] font-bold transition ${
                  branch === x.name ? "text-white" : "border-[var(--bz-line)] text-[var(--bz-ink-2)]"
                }`}
                style={branch === x.name ? { background: x.color, borderColor: x.color } : undefined}
              >
                {x.name}
              </button>
            ))}
          </div>
          <div className="bz-calc-actions">
            <button onClick={() => go(2)} disabled={!branch} className="bz-calc-go disabled:opacity-40"
              style={{ background: color }}>
              التالي
            </button>
          </div>
        </>
      )}

      {/* ── 2) الأيّام والفترات ── */}
      {step === 2 && (
        <>
          <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">أيّام المراجعة</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {WEEK_DAYS.map((d) => (
              <button key={d} onClick={() => toggleDay(d)}
                className={`rounded-lg border px-3 py-2 text-[12.5px] font-bold transition ${
                  days.includes(d) ? "text-white" : "border-[var(--bz-line)] text-[var(--bz-ink-3)]"
                }`}
                style={days.includes(d) ? { background: color, borderColor: color } : undefined}>
                {d}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">فتراتك اليومية</p>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" value={s.from} onChange={(e) => setSlot(i, { from: e.target.value })}
                  aria-label="من" className="bz-plan-time" />
                <span className="text-[var(--bz-ink-3)]">←</span>
                <input type="time" value={s.to} onChange={(e) => setSlot(i, { to: e.target.value })}
                  aria-label="إلى" className="bz-plan-time" />
                {slots.length > 1 && (
                  <button onClick={() => setSlots((v) => v.filter((_, j) => j !== i))}
                    aria-label="حذف الفترة" className="px-1 text-[var(--bz-ink-3)] hover:text-[var(--bz-red)]">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setSlots((v) => [...v, { from: "20:00", to: "21:00" }])}
            className="mt-2 text-[12px] font-bold" style={{ color }}>
            + أضف فترة
          </button>

          <div className="bz-calc-actions">
            <button onClick={() => setStep(1)} className="bz-calc-reset">رجوع</button>
            <button onClick={() => go(3)} disabled={!days.length || !slots.length}
              className="bz-calc-go disabled:opacity-40" style={{ background: color }}>
              أنشئ الجدول
            </button>
          </div>
        </>
      )}

      {/* ── 3) الشبكة ── */}
      {step === 3 && (
        <>
          {b?.tip && (
            <div className="bz-plan-tip" style={{ borderColor: `${color}44`, background: `${color}0F` }}>
              <p className="text-[12px] font-extrabold" style={{ color }}>نصيحة لشعبة {b.name}</p>
              <p className="mt-1 text-[12.5px] leading-[1.9] text-[var(--bz-ink-2)]">{b.tip}</p>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-bold text-[var(--bz-ink-3)]">
              املأ خاناتك — {filled} من {total}
            </p>
            <button onClick={() => setGrid({})} className="text-[11.5px] font-bold text-[var(--bz-ink-3)]">
              تفريغ
            </button>
          </div>

          <div className="bz-plan-scroll">
            <table className="bz-plan-grid">
              <thead>
                <tr>
                  <th>الفترة</th>
                  {days.map((d) => <th key={d}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, si) => (
                  <tr key={si}>
                    <th className="bz-plan-time-cell">{s.from}<br />{s.to}</th>
                    {days.map((d) => {
                      const key = `${d}|${si}`;
                      const val = grid[key] ?? "";
                      return (
                        <td key={key}>
                          <select
                            value={val}
                            onChange={(e) => setGrid((g) => ({ ...g, [key]: e.target.value }))}
                            aria-label={`${d} ${s.from}`}
                            className="bz-plan-cell"
                            style={val ? { color, fontWeight: 800 } : undefined}
                          >
                            <option value="">—</option>
                            {options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bz-calc-actions">
            <button onClick={() => setStep(2)} className="bz-calc-reset">رجوع</button>
            <button onClick={() => window.print()} className="bz-calc-go" style={{ background: color }}>
              اطبع جدولي
            </button>
          </div>

          <div className="bz-calc-next">
            <p className="bz-calc-next-t">وماذا بعد؟</p>
            <Link href="/tools/planner" className="bz-calc-next-a">مخطّط البكالوريا للطباعة — تصميم جاهز</Link>
            <Link href="/blog/بناء-برنامج-مراجعة-البكالوريا" className="bz-calc-next-a">
              اقرأ: كيف تبني برنامجاً يناسب شعبتك ووقتك فعلاً
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
