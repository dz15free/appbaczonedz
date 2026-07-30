"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { LESSONS, STREAMS } from "@/features/study/curriculum";
import {
  listenCustomLessons, mergeLessons, addLesson, addLessonsBulk,
  deleteLesson, listenHiddenSubjects, isSubjectHidden, setSubjectHidden,
  deleteSubjectLessons, type CustomLesson,
} from "@/features/study/curriculum-store";

/* ════════════════════════════════════════════════════════════
   محرّر المنهج — لوحة الإدارة

   ملفّ المناهج يغطّي جزءاً فقط. هنا تُكمل الناقص فيظهر فوراً لكل
   الطلاب بلا إعادة نشر للموقع.

   **اللصق الجماعي هو الطريق الأساسي، لا الإدخال درساً درساً.**
   الناقص مئات الدروس؛ إدخالها يدوياً عمل أيام. حقل اللصق يقبل نفس
   صيغة الملفّ الذي أرسلتَه، فتنسخ منه وتلصق.
════════════════════════════════════════════════════════════ */

const EMPTY = { title: "", unit: "", subject: "", stream: STREAMS[0] ?? "", order: 1, trimester: 1 };

export function CurriculumEditor() {
  const [custom, setCustom] = useState<CustomLesson[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState(STREAMS[0] ?? "");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = listenHiddenSubjects(setHidden);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  useEffect(() => {
    const unsub = listenCustomLessons(setCustom);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const all = useMemo(() => mergeLessons(custom), [custom]);

  /* تقرير التغطية: يُظهر أين النقص فعلاً بدل التخمين */
  const coverage = useMemo(() => {
    const map = new Map<string, { subjects: Set<string>; count: number }>();
    for (const l of all) {
      const e = map.get(l.stream) ?? { subjects: new Set<string>(), count: 0 };
      e.subjects.add(l.subject);
      e.count++;
      map.set(l.stream, e);
    }
    return [...map.entries()].map(([s, e]) => ({
      stream: s, subjects: e.subjects.size, count: e.count,
    })).sort((a, b) => b.count - a.count);
  }, [all]);

  const rowsOfStream = useMemo(
    () => custom.filter((l) => l.stream === stream),
    [custom, stream],
  );

  async function submitOne() {
    if (!form.title.trim() || !form.subject.trim()) {
      setMsg({ kind: "err", text: "العنوان والمادّة مطلوبان." });
      return;
    }
    setBusy(true);
    try {
      await addLesson(form);
      setForm({ ...EMPTY, stream: form.stream, subject: form.subject, unit: form.unit,
                order: Number(form.order) + 1, trimester: form.trimester });
      setMsg({ kind: "ok", text: "أُضيف الدرس." });
    } catch {
      setMsg({ kind: "err", text: "تعذّرت الإضافة — راجع صلاحيات قاعدة البيانات." });
    } finally { setBusy(false); }
  }

  async function submitBulk() {
    setBusy(true);
    try {
      /* الملفّ الذي أرسلتَه كان **عدّة مصفوفات متلاصقة** لا مستنداً
         واحداً، فـ JSON.parse يفشل عليه. نقرأ مستنداً مستنداً. */
      const text = bulk.trim();
      if (!text) { setMsg({ kind: "err", text: "الصق المحتوى أولاً." }); return; }
      const rows: Record<string, unknown>[] = [];
      let i = 0;
      while (i < text.length) {
        while (i < text.length && /\s/.test(text[i] ?? "")) i++;
        if (i >= text.length) break;
        const rest = text.slice(i);
        let parsed: unknown;
        let consumed = rest.length;
        for (let end = rest.length; end > 0; end--) {
          try { parsed = JSON.parse(rest.slice(0, end)); consumed = end; break; } catch { /* نضيّق */ }
        }
        if (parsed === undefined) break;
        if (Array.isArray(parsed)) rows.push(...(parsed as Record<string, unknown>[]));
        else rows.push(parsed as Record<string, unknown>);
        i += consumed;
      }
      const clean = rows
        .filter((r) => r && typeof r === "object")
        .map((r) => ({
          id: typeof r.id === "string" ? r.id : undefined,
          title: String(r.title ?? ""),
          unit: String(r.unit ?? "عامّ"),
          subject: String(r.subject ?? ""),
          stream: String(r.stream ?? ""),
          order: Number(r.order ?? 1),
          trimester: Number(r.trimester ?? 1),
        }))
        // نستبعد التربية البدنية والتشكيلية كما اتّفقنا
        .filter((r) => !/بدنية|تشكيلية|رياضة بدنية/.test(r.subject));
      if (!clean.length) { setMsg({ kind: "err", text: "لم أجد دروساً صالحة في المُلصَق." }); return; }
      const n = await addLessonsBulk(clean);
      setBulk("");
      setMsg({ kind: "ok", text: `أُضيف ${n} درساً.` });
    } catch {
      setMsg({ kind: "err", text: "صيغة غير مفهومة — ألصق JSON كما في ملفّ المناهج." });
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Icon name="book" size={18} className="text-[var(--bz-blue)]" />
        <h2 className="font-display text-lg font-extrabold">منهج الثالثة ثانوي</h2>
        <span className="rounded-md bg-[var(--bz-canvas)] px-2 py-0.5 font-mono text-[11px] text-text-muted">
          {LESSONS.length} ثابت + {custom.length} مُضاف = {all.length}
        </span>
      </header>

      {/* تقرير التغطية — يُظهر أين النقص فعلاً */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bz-canvas)] text-[11px] text-text-muted">
            <tr><th className="p-2 text-right">الشعبة</th><th className="p-2">المواد</th><th className="p-2">الدروس</th></tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.stream} className="border-t border-border">
                <td className="p-2 font-semibold">{c.stream}</td>
                <td className="p-2 text-center">{c.subjects}</td>
                <td className="p-2 text-center">
                  <span className={c.count < 40 ? "font-bold text-[var(--bz-red)]" : ""}>{c.count}</span>
                  {c.count < 40 && <span className="ms-1 text-[10px] text-[var(--bz-red)]">ناقصة</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          msg.kind === "ok"
            ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
            : "bg-[var(--bz-red-050)] text-[var(--bz-red)]"}`}>
          {msg.text}
        </p>
      )}

      {/* اللصق الجماعي — الطريق الأساسي */}
      <div className="rounded-xl border border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] p-3">
        <h3 className="mb-1 text-sm font-extrabold text-[var(--bz-blue-700)]">لصق دفعة كاملة</h3>
        <p className="mb-2 text-[11.5px] leading-relaxed text-text-muted">
          الصق محتوى ملفّ المناهج كما هو. يقبل عدّة مصفوفات متلاصقة، ويستبعد
          التربية البدنية والتشكيلية تلقائياً. الحقول:
          <span className="font-mono"> title · unit · subject · stream · order · trimester</span>
        </p>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={5}
          dir="ltr"
          placeholder='[{"title":"...","unit":"...","subject":"...","stream":"...","order":1,"trimester":1}]'
          className="w-full rounded-lg border border-border bg-surface p-2 font-mono text-[11px] outline-none focus:border-[var(--bz-blue)]"
        />
        <button
          onClick={submitBulk}
          disabled={busy}
          className="mt-2 rounded-lg bg-[var(--bz-blue)] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "..." : "أضف الدفعة"}
        </button>
      </div>

      {/* درس واحد */}
      <div className="rounded-xl border border-border p-3">
        <h3 className="mb-2 text-sm font-extrabold">إضافة درس واحد</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان الدرس" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="الوحدة" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="المادّة" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
          <input value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}
            list="bz-streams" placeholder="الشعبة" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
          <datalist id="bz-streams">{STREAMS.map((s) => <option key={s} value={s} />)}</datalist>
          <input type="number" min={1} value={form.trimester}
            onChange={(e) => setForm({ ...form, trimester: Number(e.target.value) })}
            placeholder="الفصل" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
          <input type="number" min={1} value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            placeholder="الترتيب" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
        </div>
        <button onClick={submitOne} disabled={busy}
          className="mt-2 rounded-lg border border-[var(--bz-blue)] px-3 py-1.5 text-sm font-bold text-[var(--bz-blue)] disabled:opacity-50">
          أضف
        </button>
      </div>

      {/* المواد — إظهار وإخفاء وحذف */}
      <div className="rounded-xl border border-border p-3">
        <h3 className="mb-2 text-sm font-extrabold">مواد الشعبة الحالية</h3>
        <p className="mb-2 text-[11px] leading-relaxed text-text-muted">
          الإخفاء يُزيل المادّة من <b>تتبّع الدراسة</b> و<b>بطاقات المراجعة</b> معاً،
          وهو <b>قابل للتراجع</b> ولا يُتلف تقدّم الطلاب. أمّا الحذف فيمسّ
          الدروس المُضافة يدوياً فقط — الثابتة في الشيفرة تُخفى ولا تُحذف.
        </p>
        <div className="space-y-1">
          {[...new Set(mergeLessons(custom).filter((l) => l.stream === stream).map((l) => l.subject))]
            .map((sub) => {
              const off = isSubjectHidden(hidden, stream, sub);
              const own = custom.filter((l) => l.stream === stream && l.subject === sub).length;
              return (
                <div key={sub}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                    off ? "border-border bg-[var(--bz-canvas)] opacity-60" : "border-border"}`}>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {sub}{off && <span className="ms-1 text-[10px] text-text-muted">(مخفيّة)</span>}
                  </span>
                  <button onClick={() => setSubjectHidden(stream, sub, !off)}
                    className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[10.5px] font-bold text-text-muted hover:text-primary">
                    {off ? "إظهار" : "إخفاء"}
                  </button>
                  {own > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm(`حذف ${own} درساً مُضافاً من «${sub}»؟ لا رجعة.`)) return;
                        const n = await deleteSubjectLessons(custom, stream, sub);
                        setMsg({ kind: "ok", text: `حُذف ${n} درساً.` });
                      }}
                      className="shrink-0 text-text-muted hover:text-[var(--bz-red)]"
                      aria-label="حذف الدروس المُضافة">
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* المُضاف — للمراجعة والحذف */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-extrabold">الدروس المُضافة</h3>
          <select value={stream} onChange={(e) => setStream(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none">
            {[...new Set([...STREAMS, ...custom.map((c) => c.stream)])].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-[11px] text-text-muted">{rowsOfStream.length}</span>
        </div>
        {rowsOfStream.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">لا دروس مُضافة في هذه الشعبة.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {rowsOfStream.map((l) => (
              <div key={l.key} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-semibold">{l.title}</span>
                <span className="shrink-0 text-text-muted">{l.subject}</span>
                <span className="shrink-0 font-mono text-[10px] text-text-muted">ف{l.trimester}·{l.order}</span>
                <button onClick={() => l.key && deleteLesson(l.key)}
                  aria-label="حذف" className="shrink-0 text-text-muted hover:text-[var(--bz-red)]">
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
