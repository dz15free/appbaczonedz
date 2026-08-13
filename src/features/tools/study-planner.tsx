"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLAN_BRANCHES, WEEK_DAYS, cellOptions, getBranch } from "@/features/tools/planner-data";

type Step = 1 | 2 | 3 | 4;
type Slot = { id: number; from: string; to: string };

const DEFAULT_SLOTS: Slot[] = [
  { id: 1, from: "16:00", to: "17:30" },
  { id: 2, from: "18:00", to: "19:30" },
];
const CUSTOM_OPTION = "__custom__";

function durationLabel(from: string, to: string): string {
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  const total = Math.max(0, toHour * 60 + toMinute - (fromHour * 60 + fromMinute));
  if (!total) return "تحقق من الوقت";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}س${minutes ? ` و${minutes}د` : ""}` : `${minutes}د`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else current = next;
  }
  if (lines.length < maxLines && current) lines.push(current);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function cellColor(value: string, color: string): { bg: string; text: string } {
  if (!value) return { bg: "#f8fafc", text: "#94a3b8" };
  if (value.includes("استراحة")) return { bg: "#fff7ed", text: "#c2410c" };
  if (value.includes("حل مواضيع")) return { bg: "#ecfdf5", text: "#047857" };
  if (value.includes("مراجعة")) return { bg: "#eef2ff", text: "#4338ca" };
  return { bg: `${color}18`, text: color };
}

export function StudyPlanner() {
  const [step, setStep] = useState<Step>(1);
  const [branch, setBranch] = useState("");
  const [days, setDays] = useState<string[]>([...WEEK_DAYS].slice(0, 6));
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [customCell, setCustomCell] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [validation, setValidation] = useState("");
  const [exporting, setExporting] = useState(false);

  const selectedBranch = useMemo(() => getBranch(branch), [branch]);
  const options = useMemo(() => (branch ? cellOptions(branch) : []), [branch]);
  const color = selectedBranch?.color ?? "#2350D9";
  const total = days.length * slots.length;
  const filled = Object.values(grid).filter(Boolean).length;

  function chooseBranch(value: string) {
    setBranch(value);
    setGrid({});
    setValidation("");
  }

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => WEEK_DAYS.indexOf(a as typeof WEEK_DAYS[number]) - WEEK_DAYS.indexOf(b as typeof WEEK_DAYS[number])));
  }

  function updateSlot(id: number, field: "from" | "to", value: string) {
    setSlots((current) => current.map((slot) => slot.id === id ? { ...slot, [field]: value } : slot));
  }

  function moveTo(next: Step) {
    setValidation("");
    if (next >= 2 && !branch) { setValidation("اختر شعبتك أولًا حتى نعرض موادها ونصيحتها."); setStep(1); return; }
    if (next >= 3 && (!days.length || !slots.length)) { setValidation("اختر يومًا واحدًا وفترة دراسية واحدة على الأقل."); setStep(2); return; }
    if (next >= 3 && slots.some((slot) => !slot.from || !slot.to || slot.from >= slot.to)) { setValidation("تحقق من أن نهاية كل فترة تأتي بعد بدايتها."); setStep(2); return; }
    setStep(next);
    window.setTimeout(() => document.getElementById("bz-study-planner-tool")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function chooseCell(cell: string, value: string) {
    if (value === CUSTOM_OPTION) {
      setCustomCell(cell);
      setCustomSubject("");
      return;
    }
    setGrid((current) => ({ ...current, [cell]: value }));
  }

  function saveCustomSubject() {
    const value = customSubject.trim();
    if (!value || !customCell) return;
    setGrid((current) => ({ ...current, [customCell]: value }));
    setCustomCell(null);
    setCustomSubject("");
  }

  function clearGrid() {
    setGrid({});
    setValidation("");
  }

  function printPlanner() {
    const cleanup = () => document.documentElement.classList.remove("bz-printing-study-plan");
    document.documentElement.classList.add("bz-printing-study-plan");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1200);
  }

  async function exportImage() {
    if (exporting || !selectedBranch || !days.length || !slots.length) return;
    setExporting(true);
    try {
      const scale = 2;
      const padding = 54;
      const timeWidth = 150;
      const dayWidth = days.length >= 6 ? 190 : 220;
      const headerHeight = 112;
      const tableHeadHeight = 68;
      const rowHeight = 94;
      const footerHeight = 58;
      const width = timeWidth + dayWidth * days.length + padding * 2;
      const height = headerHeight + tableHeadHeight + rowHeight * slots.length + footerHeight + padding * 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");
      context.scale(scale, scale);
      context.direction = "rtl";
      context.textBaseline = "middle";

      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.roundRect(0, 0, width, height, 24);
      context.fill();

      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "#0ea5e9");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, headerHeight);
      context.fillStyle = "#ffffff";
      context.textAlign = "right";
      context.font = "900 28px 'Noto Sans Arabic', 'Arial', sans-serif";
      context.fillText("برنامج مراجعتي الأسبوعي", width - padding, 42);
      context.font = "600 16px 'Noto Sans Arabic', 'Arial', sans-serif";
      context.fillStyle = "rgba(255,255,255,.82)";
      context.fillText(`${selectedBranch.name} · جدول صمّمته لنفسي`, width - padding, 80);
      context.textAlign = "left";
      context.font = "900 20px 'Arial', sans-serif";
      context.fillStyle = "rgba(255,255,255,.92)";
      context.fillText("BacZone.app", padding, 57);

      const tableX = padding;
      const tableY = headerHeight + padding;
      const tableWidth = timeWidth + dayWidth * days.length;
      context.fillStyle = "#e2e8f0";
      context.fillRect(tableX, tableY, tableWidth, tableHeadHeight + rowHeight * slots.length);
      context.fillStyle = color;
      context.fillRect(tableX, tableY, tableWidth, tableHeadHeight);
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.font = "900 17px 'Noto Sans Arabic', 'Arial', sans-serif";
      context.fillText("الفترة", tableX + timeWidth / 2, tableY + tableHeadHeight / 2);
      days.forEach((day, index) => context.fillText(day, tableX + timeWidth + dayWidth * index + dayWidth / 2, tableY + tableHeadHeight / 2));

      slots.forEach((slot, rowIndex) => {
        const y = tableY + tableHeadHeight + rowIndex * rowHeight;
        context.fillStyle = "#eff6ff";
        context.fillRect(tableX, y, timeWidth, rowHeight);
        context.fillStyle = "#1d4ed8";
        context.font = "800 16px 'Arial', sans-serif";
        context.fillText(`${slot.from} — ${slot.to}`, tableX + timeWidth / 2, y + rowHeight / 2);
        days.forEach((day, dayIndex) => {
          const x = tableX + timeWidth + dayIndex * dayWidth;
          const value = grid[`${day}|${slot.id}`] ?? "";
          const palette = cellColor(value, color);
          context.fillStyle = palette.bg;
          context.fillRect(x + 2, y + 2, dayWidth - 4, rowHeight - 4);
          context.fillStyle = palette.text;
          context.font = "800 15px 'Noto Sans Arabic', 'Arial', sans-serif";
          wrapText(context, value || "—", x + dayWidth / 2, y + rowHeight / 2 - 8, dayWidth - 24, 22, 2);
        });
      });

      context.textAlign = "right";
      context.fillStyle = "#64748b";
      context.font = "600 14px 'Noto Sans Arabic', 'Arial', sans-serif";
      context.fillText("اترك مساحة للطوارئ، وثبّت المراجعة القصيرة قبل المراجعة الطويلة.", width - padding, height - 30);
      context.textAlign = "left";
      context.fillStyle = color;
      context.font = "800 14px 'Arial', sans-serif";
      context.fillText("baczone.app", padding, height - 30);

      const link = document.createElement("a");
      link.download = `برنامج-مراجعة-${selectedBranch.name.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      window.alert("تعذّر حفظ الصورة في هذا المتصفح. جرّب الطباعة ثم اختر حفظًا مناسبًا.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section id="bz-study-planner-tool" className="bz-study-planner-tool" aria-labelledby="planner-tool-title">
      <div className="bz-study-planner-header">
        <div><p className="bz-exam-kicker">أداة بسيطة، وجدول قابل للتنفيذ</p><h2 id="planner-tool-title">صمّم برنامج مراجعتك بنفسك</h2><p>اختر شعبتك وأيامك وفتراتك، ثم املأ الجدول بما يناسب طاقتك وظروفك.</p></div>
        <span className="bz-study-brand-mark">BZ</span>
      </div>

      <div className="bz-study-steps" aria-label="مراحل إنشاء البرنامج">
        {["الشعبة", "التوقيت", "الجدول", "الجاهز للطباعة"].map((label, index) => <span key={label} className={step >= index + 1 ? "is-on" : ""}><b>{index + 1}</b>{label}</span>)}
      </div>

      {validation && <div className="bz-study-alert" role="alert">{validation}</div>}

      {step === 1 && <div className="bz-study-stage"><div className="bz-study-stage-intro"><span>01</span><div><h3>ما هي شعبتك؟</h3><p>سنضع مواد الشعبة في مقدمة اختياراتك، مع المواد المشتركة والأنشطة.</p></div></div><div className="bz-study-branches">{PLAN_BRANCHES.map((item) => <button type="button" key={item.name} onClick={() => chooseBranch(item.name)} className={branch === item.name ? "is-selected" : ""} style={branch === item.name ? { borderColor: item.color, background: `${item.color}12` } : undefined}><span style={{ color: item.color }}>{item.name.slice(0, 1)}</span><b>{item.name}</b><small>{item.subjects.length} مواد أساسية</small></button>)}</div><div className="bz-study-footer"><span>لا يتم حفظ جدولك، ويمكنك طباعته أو تنزيله بعد إنشائه.</span><button type="button" className="bz-study-primary" onClick={() => moveTo(2)} disabled={!branch}>التالي</button></div></div>}

      {step === 2 && <div className="bz-study-stage"><div className="bz-study-stage-intro"><span>02</span><div><h3>متى تراجع؟</h3><p>اختر الأيام والفترات التي تستطيع الالتزام بها فعلًا، واترك هامشًا للظروف الطارئة.</p></div></div><div className="bz-study-timing-card"><h4>أيام المراجعة</h4><div className="bz-study-days">{WEEK_DAYS.map((day) => <button type="button" key={day} className={days.includes(day) ? "is-selected" : ""} onClick={() => toggleDay(day)} style={days.includes(day) ? { background: color, borderColor: color } : undefined}>{day}</button>)}</div></div><div className="bz-study-timing-card"><div className="bz-study-card-heading"><h4>فترات الدراسة اليومية</h4><button type="button" className="bz-study-add" onClick={() => { if (slots.length < 6) setSlots((current) => [...current, { id: Date.now(), from: "20:00", to: "21:00" }]); else setValidation("يمكنك إضافة ست فترات كحد أقصى حتى يبقى البرنامج قابلًا للتنفيذ."); }}>+ إضافة فترة</button></div><div className="bz-study-slots">{slots.map((slot, index) => <div key={slot.id}><span>{index + 1}</span><label>من<input type="time" value={slot.from} onChange={(event) => updateSlot(slot.id, "from", event.target.value)} /></label><label>إلى<input type="time" value={slot.to} onChange={(event) => updateSlot(slot.id, "to", event.target.value)} /></label><small>{durationLabel(slot.from, slot.to)}</small>{slots.length > 1 && <button type="button" aria-label="حذف الفترة" onClick={() => setSlots((current) => current.filter((item) => item.id !== slot.id))}>×</button>}</div>)}</div></div><div className="bz-study-footer"><button type="button" className="bz-study-secondary" onClick={() => moveTo(1)}>رجوع</button><button type="button" className="bz-study-primary" onClick={() => moveTo(3)} disabled={!days.length || !slots.length}>بناء الجدول</button></div></div>}

      {step === 3 && <div className="bz-study-stage"><div className="bz-study-tip" style={{ borderColor: `${color}44`, background: `${color}0d` }}><span>نصيحة {selectedBranch?.name}</span><p>{selectedBranch?.tip}</p></div><div className="bz-study-table-heading"><div><h3>املأ خاناتك</h3><p>{filled} من {total} خانات ممتلئة · اضغط على أي خانة واختر نشاطًا.</p></div><button type="button" onClick={clearGrid} className="bz-study-clear">تفريغ الجدول</button></div><div className="bz-study-table-scroll"><table className="bz-study-table" id="bz-study-print-table"><thead><tr><th>الفترة</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot.id}><th><b>{slot.from}</b><small>{slot.to}</small></th>{days.map((day) => { const key = `${day}|${slot.id}`; const value = grid[key] ?? ""; return <td key={key}><select aria-label={`${day} ${slot.from}`} value={value} onChange={(event) => chooseCell(key, event.target.value)} style={value ? { color, fontWeight: 800 } : undefined}><option value="">اختر</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}<option value={CUSTOM_OPTION}>+ نشاط مخصص</option></select>{value && <span className="bz-study-cell-value">{value}</span>}</td>; })}</tr>)}</tbody></table></div><div className="bz-study-footer"><button type="button" className="bz-study-secondary" onClick={() => moveTo(2)}>رجوع</button><button type="button" className="bz-study-primary" onClick={() => moveTo(4)}>اعتماد الجدول</button></div></div>}

      {step === 4 && <div className="bz-study-stage"><div className="bz-study-success"><span>✓</span><div><h3>جدولك جاهز</h3><p>علّقه أمام مكتبك أو نزّله كصورة واضحة. لا تحتاج إلى تسجيل أو حفظ سحابي.</p></div></div><div id="bz-study-print-sheet" className="bz-study-print-sheet"><div className="bz-study-print-brand"><div><b>برنامج مراجعتي الأسبوعي</b><span>{selectedBranch?.name} · صمّمته لنفسي</span></div><strong>BacZone.app</strong></div><table className="bz-study-table bz-study-export-table"><thead><tr><th>الفترة</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot.id}><th><b>{slot.from}</b><small>{slot.to}</small></th>{days.map((day) => { const value = grid[`${day}|${slot.id}`] ?? ""; return <td key={day} style={value ? { color, background: `${color}12` } : undefined}>{value || "—"}</td>; })}</tr>)}</tbody></table><div className="bz-study-print-foot"><span>اترك مساحة للطوارئ، وثبّت المراجعة القصيرة قبل المراجعة الطويلة.</span><b>baczone.app</b></div></div><div className="bz-study-export-actions"><button type="button" className="bz-study-primary" onClick={printPlanner}>طباعة الجدول</button><button type="button" className="bz-study-secondary" onClick={exportImage} disabled={exporting}>{exporting ? "جارٍ تجهيز الصورة…" : "تحميل كصورة"}</button><button type="button" className="bz-study-secondary" onClick={() => moveTo(3)}>تعديل الجدول</button></div><div className="bz-study-next"><Link href="/tools/planner">مخطّط جاهز للطباعة</Link><Link href="/tools/pomodoro">مؤقّت التركيز</Link></div></div>}

      {customCell && <div className="bz-study-modal" role="dialog" aria-modal="true" aria-labelledby="custom-activity-title"><div><button type="button" className="bz-study-modal-close" aria-label="إغلاق" onClick={() => setCustomCell(null)}>×</button><h3 id="custom-activity-title">أضف نشاطًا مخصصًا</h3><p>مثال: حفظ، مراجعة حرة، أو متابعة درس.</p><input autoFocus value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveCustomSubject(); }} placeholder="اكتب النشاط هنا" /><div><button type="button" className="bz-study-secondary" onClick={() => setCustomCell(null)}>إلغاء</button><button type="button" className="bz-study-primary" onClick={saveCustomSubject} disabled={!customSubject.trim()}>إضافة</button></div></div></div>}
    </section>
  );
}
