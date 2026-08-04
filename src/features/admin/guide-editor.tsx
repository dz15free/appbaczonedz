"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SPEC_FIELDS } from "@/features/guide/spec-index";
import {
  listenGuide, saveSpec, clearSpec, addSpec, changePermalink,
  normalizePermalink, linkOf, type SpecFull,
} from "@/features/guide/guide-store";

/* ════════════════════════════════════════════════════════════
   محرّر دليل التخصّصات

   الفهرس في الشيفرة يحمل الأسماء فقط؛ **الشرح تكتبه هنا**، فيظهر
   للزوّار فوراً بلا إعادة نشر.

   التخصّص لا يُنشر حتى تُكتب مقدّمته: صفحة فارغة في Google أسوأ من
   عدم وجودها — تُفهرَس ثم تُصنَّف محتوىً ضعيفاً.
════════════════════════════════════════════════════════════ */

const FIELDS_UI: { key: keyof SpecFull; label: string; rows: number; hint?: string }[] = [
  { key: "excerpt",   label: "وصف قصير (يظهر في البطاقة وفي Google)", rows: 2,
    hint: "سطران على الأكثر — هذا ما يقرؤه الطالب في نتيجة البحث." },
  { key: "intro",     label: "ما هو هذا التخصّص؟", rows: 5, hint: "مطلوب للنشر." },
  { key: "study",     label: "نظام الدراسة ومدّتها", rows: 4 },
  { key: "admission", label: "القبول والمعدّلات", rows: 4 },
  { key: "subjects",  label: "المواد التي تدرسها", rows: 4 },
  { key: "careers",   label: "أين تعمل بعد التخرّج", rows: 4 },
  { key: "pros",      label: "ما يجذب إليه", rows: 3 },
  { key: "cons",      label: "ما يجب معرفته قبل الاختيار", rows: 3 },
  { key: "verdict",   label: "الخلاصة", rows: 3 },
];

export function GuideEditor() {
  const [rows, setRows] = useState<SpecFull[]>([]);
  const [sel, setSel] = useState<string>("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [link, setLink] = useState("");
  const [q, setQ] = useState("");
  const [field, setField] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const unsub = listenGuide(setRows);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const current = useMemo(() => rows.find((r) => r.slug === sel) ?? null, [rows, sel]);

  // نملأ المسودّة عند اختيار تخصّص، ولا نمسح ما يكتبه أثناء الكتابة
  useEffect(() => {
    if (!current) { setDraft({}); setLink(""); return; }
    const d: Record<string, string> = {
      title: current.title ?? "",
      fr: current.fr ?? "",
      field: current.field ?? "",
    };
    for (const f of FIELDS_UI) {
      const v = current[f.key];
      d[String(f.key)] = typeof v === "string" ? v : "";
    }
    setDraft(d);
    setLink(linkOf(current));
  }, [sel, current?.updatedAt]);   // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (field && r.field !== field) return false;
      if (!t) return true;
      return `${r.ar} ${r.fr} ${r.slug}`.toLowerCase().includes(t);
    });
  }, [rows, q, field]);

  const done = rows.filter((r) => r.published).length;

  async function save() {
    if (!current) return;
    setBusy(true);
    try {
      await saveSpec(current.slug, draft as Record<string, string>);
      setMsg({ kind: "ok", text: "حُفظ." });
    } catch {
      setMsg({ kind: "err", text: "تعذّر الحفظ — راجع صلاحيات قاعدة البيانات." });
    } finally { setBusy(false); }
  }

  async function savePermalink() {
    if (!current) return;
    const next = normalizePermalink(link);
    if (!next) { setMsg({ kind: "err", text: "رابط غير صالح." }); return; }
    if (next === linkOf(current)) return;
    const ok = confirm(
      `تغيير الرابط إلى «${next}»؟\n\n` +
      "الرابط القديم سيبقى يعمل، لكنّ ترتيب الصفحة في Google قد يتأثّر مؤقّتاً.",
    );
    if (!ok) return;
    setBusy(true);
    await changePermalink(current.slug, next);
    setBusy(false);
    setMsg({ kind: "ok", text: `الرابط الآن /specialties/${next}` });
  }

  async function createNew() {
    const name = newName.trim();
    if (!name) return;
    const key = normalizePermalink(name) || `spec-${Date.now().toString(36)}`;
    await addSpec(key, { title: name, field: field || SPEC_FIELDS[0], draft: true });
    setNewName("");
    setSel(key);
    setMsg({ kind: "ok", text: "أُنشئ — اكتب المقدّمة لينشر." });
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <Icon name="book" size={18} className="text-[var(--bz-blue)]" />
        <h2 className="font-display text-lg font-extrabold">دليل التخصّصات</h2>
        <span className="rounded-md bg-[var(--bz-canvas)] px-2 py-0.5 font-mono text-[11px] text-text-muted">
          {done} منشور / {rows.length}
        </span>
        <a href="/specialties" target="_blank" rel="noreferrer"
          className="ms-auto text-[11px] font-bold text-[var(--bz-blue)] hover:underline">
          عرض الصفحة ↗
        </a>
      </header>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          msg.kind === "ok"
            ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
            : "bg-[var(--bz-red-050)] text-[var(--bz-red)]"}`}>
          {msg.text}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        {/* القائمة */}
        <div className="space-y-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search"
            placeholder="ابحث عن تخصّص…"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-[var(--bz-blue)]" />
          <select value={field} onChange={(e) => setField(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none">
            <option value="">كل المجالات</option>
            {SPEC_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
            {list.map((r) => (
              <button key={r.slug} onClick={() => setSel(r.slug)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-xs transition ${
                  sel === r.slug ? "bg-[var(--bz-blue-050)] font-extrabold text-[var(--bz-blue-700)]"
                                 : "hover:bg-[var(--bz-canvas)]"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  r.published ? "bg-[var(--bz-green)]" : "bg-[var(--bz-line-2)]"}`} />
                <span className="min-w-0 flex-1 truncate">{r.ar}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-border p-2">
            <p className="mb-1.5 text-[11px] font-bold text-text-muted">تخصّص غير موجود في القائمة؟</p>
            <div className="flex gap-1.5">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم التخصّص"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none" />
              <button onClick={createNew}
                className="shrink-0 rounded-lg bg-[var(--bz-blue)] px-3 text-xs font-bold text-white">
                أضف
              </button>
            </div>
          </div>
        </div>

        {/* المحرّر */}
        {!current ? (
          <p className="grid place-items-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
            اختر تخصّصاً من القائمة لتحرير موضوعه.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <span className="text-sm font-extrabold">{current.ar}</span>
              <span className={`ms-auto rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                current.published
                  ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
                  : "bg-[var(--bz-canvas)] text-text-muted"}`}>
                {current.published ? "منشور" : "غير منشور"}
              </span>
              <button
                onClick={async () => {
                  await saveSpec(current.slug, { draft: current.published });
                  setMsg({ kind: "ok", text: current.published ? "أُخفي المقال." : "نُشر المقال." });
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-text-muted hover:text-primary">
                {current.published ? "إخفاء" : "نشر"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`مسح محتوى «${current.ar}»؟ يبقى الاسم في القائمة.`)) return;
                  await clearSpec(current.slug);
                  setMsg({ kind: "ok", text: "مُسح المحتوى." });
                }}
                className="text-text-muted hover:text-[var(--bz-red)]" aria-label="مسح المحتوى">
                <Icon name="trash" size={15} />
              </button>
            </div>

            {/* العنوان والمجال — لم يكن هناك أي سبيل لتعديلهما */}
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-text-muted">عنوان المقال</label>
                <input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder={current.ar}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-bold outline-none focus:border-[var(--bz-blue)]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-text-muted">الاسم الفرنسي/المختصر</label>
                <input value={draft.fr ?? ""} onChange={(e) => setDraft({ ...draft, fr: e.target.value })}
                  dir="ltr" placeholder={current.fr}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-[var(--bz-blue)]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-text-muted">المجال</label>
                <input value={draft.field ?? ""} onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                  list="bz-spec-fields" placeholder={current.field}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-[var(--bz-blue)]" />
                <datalist id="bz-spec-fields">
                  {SPEC_FIELDS.map((f) => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>

            {/* الرابط */}
            <div className="rounded-xl border border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] p-3">
              <label className="mb-1 block text-[11px] font-extrabold text-[var(--bz-blue-700)]">
                الرابط (permalink)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-text-muted" dir="ltr">/specialties/</span>
                <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-xs outline-none focus:border-[var(--bz-blue)]" />
                <button onClick={savePermalink} disabled={busy}
                  className="shrink-0 rounded-lg bg-[var(--bz-blue)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  حفظ الرابط
                </button>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-muted">
                لاتيني صغير بلا مسافات. الروابط القديمة تبقى تعمل بعد التغيير، لكن
                ترتيب الصفحة في Google قد يتأثّر مؤقّتاً — فلا تُغيّره بلا سبب.
              </p>
              {(current.aliases?.length ?? 0) > 0 && (
                <p className="mt-1 font-mono text-[10px] text-text-muted" dir="ltr">
                  aliases: {current.aliases?.join(" · ")}
                </p>
              )}
            </div>

            {FIELDS_UI.map((f) => (
              <div key={String(f.key)}>
                <label className="mb-1 block text-[11.5px] font-bold text-text-primary">
                  {f.label}
                  {f.hint && <span className="ms-1 font-normal text-text-muted">— {f.hint}</span>}
                </label>
                <textarea
                  value={draft[String(f.key)] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [String(f.key)]: e.target.value })}
                  rows={f.rows}
                  dir="auto"
                  placeholder="اكتب هنا… ابدأ السطر بـ • لقائمة نقطية"
                  className="w-full resize-y rounded-lg border border-border bg-surface p-2.5 text-[13px] leading-relaxed outline-none focus:border-[var(--bz-blue)]"
                />
              </div>
            ))}

            <div className="sticky bottom-2 flex gap-2 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <button onClick={save} disabled={busy}
                className="flex-1 rounded-lg bg-[var(--bz-blue)] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "..." : "حفظ الموضوع"}
              </button>
              <a href={`/specialties/${linkOf(current)}`} target="_blank" rel="noreferrer"
                className="grid place-items-center rounded-lg border border-border px-4 text-sm font-bold text-text-muted">
                معاينة
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
