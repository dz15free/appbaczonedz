"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCalendarDays,
  faCheck,
  faClock,
  faLightbulb,
  faPlus,
  faPrint,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { PLAN_BRANCHES, WEEK_DAYS, getBranch, cellOptions } from "@/features/tools/planner-data";

type Slot = { from: string; to: string };

const DEFAULT_SLOTS: Slot[] = [
  { from: "16:00", to: "17:30" },
  { from: "18:00", to: "19:30" },
];

const STEPS = [
  { n: 1, label: "الشعبة", icon: faCalendarDays },
  { n: 2, label: "الأيام والفترات", icon: faClock },
  { n: 3, label: "الجدول", icon: faCheck },
];

export function StudyPlanner() {
  const [step, setStep] = useState(1);
  const [branch, setBranch] = useState("");
  const [days, setDays] = useState<string[]>([...WEEK_DAYS].slice(0, 6));
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [grid, setGrid] = useState<Record<string, string>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const selectedBranch = useMemo(() => getBranch(branch), [branch]);
  const options = useMemo(() => (branch ? cellOptions(branch) : []), [branch]);
  const color = selectedBranch?.color ?? "#2350D9";
  const filled = Object.values(grid).filter(Boolean).length;
  const total = days.length * slots.length;

  function toggleDay(day: string) {
    setDays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day]);
  }

  function setSlot(index: number, patch: Partial<Slot>) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot));
  }

  function go(nextStep: number) {
    if (nextStep === 2 && !branch) return;
    if (nextStep === 3 && (days.length === 0 || slots.length === 0)) return;
    setStep(nextStep);
    window.setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <section ref={gridRef} className="bz-calc bz-planner-shell" aria-label="أداة إنشاء برنامج المراجعة">
      <div className="bz-planner-heading">
        <span className="bz-planner-heading-icon" style={{ background: color }} aria-hidden>
          <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bz-ink-3)]">أداة تنظيم المراجعة</p>
          <h2 className="font-display text-lg font-extrabold text-[var(--bz-ink)]">أنشئ جدولاً يناسب أسبوعك</h2>
        </div>
      </div>

      <ol className="bz-plan-steps" aria-label="خطوات إنشاء الجدول">
        <span className="bz-plan-line" aria-hidden><span style={{ width: `${((step - 1) / 2) * 100}%`, background: color }} /></span>
        {STEPS.map((item) => (
          <li key={item.n} className={`bz-plan-step ${step >= item.n ? "is-on" : ""}`}>
            <span className="bz-plan-dot" style={step >= item.n ? { background: color, borderColor: color } : undefined}>
              <FontAwesomeIcon icon={item.icon} className="h-3 w-3" />
            </span>
            <span className="bz-plan-step-label">{item.label}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="bz-plan-panel">
          <div className="mb-3">
            <p className="text-sm font-extrabold text-[var(--bz-ink)]">اختر شعبتك</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--bz-ink-3)]">سنقترح المواد الأساسية الخاصة بشعبتك داخل الجدول.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_BRANCHES.map((item) => {
              const selected = branch === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => { setBranch(item.name); setGrid({}); }}
                  className={`bz-plan-branch ${selected ? "is-selected" : ""}`}
                  style={selected ? { borderColor: item.color, background: `${item.color}12` } : undefined}
                  aria-pressed={selected}
                >
                  <span className="bz-plan-branch-mark" style={{ background: item.color }} />
                  <span className="min-w-0 text-start">
                    <span className="block truncate text-[13px] font-extrabold">{item.name}</span>
                    <span className="mt-1 block truncate text-[11px] text-[var(--bz-ink-3)]">{item.subjects.slice(0, 3).join(" · ")}</span>
                  </span>
                  {selected && <FontAwesomeIcon icon={faCheck} className="ms-auto h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />}
                </button>
              );
            })}
          </div>
          <div className="bz-calc-actions">
            <button onClick={() => go(2)} disabled={!branch} className="bz-calc-go disabled:opacity-40" style={{ background: color }}>
              التالي <FontAwesomeIcon icon={faArrowLeft} className="ms-2 h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bz-plan-panel">
          <div className="mb-4">
            <p className="text-sm font-extrabold text-[var(--bz-ink)]">حدّد إيقاع أسبوعك</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--bz-ink-3)]">اختر الأيام التي تستطيع الالتزام بها، ثم أضف فتراتك الواقعية.</p>
          </div>

          <p className="mb-2 text-[11.5px] font-extrabold text-[var(--bz-ink-3)]">أيام المراجعة</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {WEEK_DAYS.map((day) => {
              const selected = days.includes(day);
              return (
                <button key={day} onClick={() => toggleDay(day)}
                  className={`bz-plan-day ${selected ? "is-selected" : ""}`}
                  style={selected ? { background: color, borderColor: color } : undefined}
                  aria-pressed={selected}>
                  {selected && <FontAwesomeIcon icon={faCheck} className="me-1.5 h-2.5 w-2.5" />}
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11.5px] font-extrabold text-[var(--bz-ink-3)]">فتراتك اليومية</p>
            <span className="text-[11px] font-bold text-[var(--bz-ink-3)]">{slots.length} فترات</span>
          </div>
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div key={index} className="bz-plan-slot">
                <span className="bz-plan-slot-index">{String(index + 1).padStart(2, "0")}</span>
                <input type="time" value={slot.from} onChange={(event) => setSlot(index, { from: event.target.value })} aria-label={`بداية الفترة ${index + 1}`} className="bz-plan-time" />
                <span className="text-xs font-bold text-[var(--bz-ink-3)]">إلى</span>
                <input type="time" value={slot.to} onChange={(event) => setSlot(index, { to: event.target.value })} aria-label={`نهاية الفترة ${index + 1}`} className="bz-plan-time" />
                {slots.length > 1 && (
                  <button onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))} aria-label={`حذف الفترة ${index + 1}`} className="bz-plan-delete">
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setSlots((current) => [...current, { from: "20:00", to: "21:00" }])} className="bz-plan-add" style={{ color }}>
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> أضف فترة جديدة
          </button>

          <div className="bz-calc-actions">
            <button onClick={() => setStep(1)} className="bz-calc-reset"><FontAwesomeIcon icon={faArrowRight} className="me-1.5 h-3.5 w-3.5" />رجوع</button>
            <button onClick={() => go(3)} disabled={!days.length || !slots.length} className="bz-calc-go disabled:opacity-40" style={{ background: color }}>
              أنشئ الجدول <FontAwesomeIcon icon={faArrowLeft} className="ms-2 h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bz-plan-panel">
          {selectedBranch?.tip && (
            <div className="bz-plan-tip" style={{ borderColor: `${color}44`, background: `${color}0F` }}>
              <p className="flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color }}>
                <FontAwesomeIcon icon={faLightbulb} className="h-3.5 w-3.5" /> نصيحة لشعبة {selectedBranch.name}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.9] text-[var(--bz-ink-2)]">{selectedBranch.tip}</p>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-[var(--bz-ink)]">جدول {selectedBranch?.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--bz-ink-3)]">{filled} من {total} خانات مملوءة</p>
            </div>
            <button onClick={() => setGrid({})} className="bz-plan-clear"><FontAwesomeIcon icon={faRotateLeft} className="me-1 h-3 w-3" />تفريغ الخانات</button>
          </div>

          <div className="bz-plan-scroll">
            <table className="bz-plan-grid">
              <caption className="sr-only">جدول المراجعة الأسبوعي لشعبة {selectedBranch?.name}</caption>
              <thead>
                <tr>
                  <th scope="col">الفترة</th>
                  {days.map((day) => <th scope="col" key={day}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, slotIndex) => (
                  <tr key={slotIndex}>
                    <th scope="row" className="bz-plan-time-cell">{slot.from}<span>—</span>{slot.to}</th>
                    {days.map((day) => {
                      const key = `${day}|${slotIndex}`;
                      const value = grid[key] ?? "";
                      return (
                        <td key={key}>
                          <select
                            value={value}
                            onChange={(event) => setGrid((current) => ({ ...current, [key]: event.target.value }))}
                            aria-label={`${day} ${slot.from}`}
                            className={`bz-plan-cell ${value ? "is-filled" : ""}`}
                            style={value ? { color, fontWeight: 800 } : undefined}
                          >
                            <option value="">اختر</option>
                            {options.map((option, optionIndex) => <option key={`${option}-${optionIndex}`} value={option}>{option}</option>)}
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
            <button onClick={() => setStep(2)} className="bz-calc-reset"><FontAwesomeIcon icon={faArrowRight} className="me-1.5 h-3.5 w-3.5" />تعديل الإعدادات</button>
            <button onClick={() => window.print()} className="bz-calc-go" style={{ background: color }}><FontAwesomeIcon icon={faPrint} className="me-2 h-3.5 w-3.5" />اطبع جدولي</button>
          </div>

          <div className="bz-calc-next">
            <p className="bz-calc-next-t">أدوات تساعدك على الاستمرار</p>
            <Link href="/tools/planner" className="bz-calc-next-a">مخطّط البكالوريا للطباعة <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></Link>
            <Link href="/blog/بناء-برنامج-مراجعة-البكالوريا" className="bz-calc-next-a">اقرأ: كيف تبني برنامجاً يناسب شعبتك ووقتك <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></Link>
          </div>
        </div>
      )}
    </section>
  );
}
