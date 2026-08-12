"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faFloppyDisk, faPlus, faTrash, faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import { saveSiteSettings, useSiteSettings, type BlogSidebarBlock, type BlogSidebarBlockType } from "@/features/settings/use-site-settings";

const TYPES: { value: BlogSidebarBlockType; label: string }[] = [
  { value: "text", label: "نص" },
  { value: "link", label: "رابط" },
  { value: "image", label: "صورة" },
  { value: "cta", label: "CTA" },
];

const blank = (order: number): BlogSidebarBlock => ({
  id: `sidebar-${Date.now()}-${order}`,
  type: "text",
  title: "",
  content: "",
  href: "",
  imageUrl: "",
  active: true,
  order,
});

export function BlogSidebarAdmin() {
  const { settings } = useSiteSettings();
  const [enabled, setEnabled] = useState(false);
  const [blocks, setBlocks] = useState<BlogSidebarBlock[]>([]);
  const [draft, setDraft] = useState<BlogSidebarBlock>(() => blank(0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEnabled(Boolean(settings.blogSidebar?.enabled));
    setBlocks((settings.blogSidebar?.blocks ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, [settings.blogSidebar]);

  function add() {
    if (!draft.title?.trim() && !draft.content?.trim() && draft.type !== "image") return;
    setBlocks((current) => [...current, { ...draft, id: draft.id || `sidebar-${Date.now()}`, order: current.length }]);
    setDraft(blank(blocks.length + 1));
  }

  function update(id: string, patch: Partial<BlogSidebarBlock>) {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function move(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = current.slice();
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((block, order) => ({ ...block, order }));
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await saveSiteSettings({
        blogSidebar: {
          enabled,
          blocks: blocks.map((block, order) => ({ ...block, order })),
        },
      });
      setMessage("تم حفظ Sidebar المدونة.");
    } catch {
      setMessage("تعذّر الحفظ. تحقّق من اتصالك ثم حاول مجدداً.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-text">Sidebar المدونة</p>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-text-muted">أضف نصوصاً وروابط وصوراً وCTA من دون HTML أو JavaScript خام. هذا يمنع أي Widget من كسر الصفحة أو تعريض الزائر للخطر.</p>
        </div>
        <button type="button" onClick={() => setEnabled((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-extrabold text-text">
          <FontAwesomeIcon icon={enabled ? faToggleOn : faToggleOff} className={`h-5 w-5 ${enabled ? "text-secondary" : "text-text-muted"}`} />
          {enabled ? "Sidebar مفعّل" : "Sidebar متوقف"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {blocks.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-muted">لا توجد كتل بعد. أضف أول كتلة من النموذج أدناه.</p>}
        {blocks.map((block, index) => (
          <div key={block.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">{index + 1}</span>
              <select value={block.type} onChange={(event) => update(block.id, { type: event.target.value as BlogSidebarBlockType })} className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-bold">
                {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <input value={block.title ?? ""} onChange={(event) => update(block.id, { title: event.target.value })} placeholder="عنوان اختياري" className="h-9 min-w-[170px] flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
              <button type="button" onClick={() => update(block.id, { active: block.active === false })} title={block.active === false ? "تفعيل" : "تعطيل"} className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary">
                <FontAwesomeIcon icon={block.active === false ? faToggleOff : faToggleOn} className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => move(block.id, -1)} title="تحريك لأعلى" className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary"><FontAwesomeIcon icon={faArrowUp} className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(block.id, 1)} title="تحريك لأسفل" className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary"><FontAwesomeIcon icon={faArrowDown} className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} title="حذف" className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"><FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <textarea value={block.content ?? ""} onChange={(event) => update(block.id, { content: event.target.value })} placeholder={block.type === "text" ? "النص الذي سيظهر للزائر" : "وصف قصير أو نص الزر"} rows={2} className="w-full resize-y rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-primary" />
              {block.type === "image" ? (
                <input value={block.imageUrl ?? ""} onChange={(event) => update(block.id, { imageUrl: event.target.value })} placeholder="رابط الصورة https://..." dir="ltr" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
              ) : block.type !== "text" ? (
                <input value={block.href ?? ""} onChange={(event) => update(block.id, { href: event.target.value })} placeholder="الرابط /tools أو https://..." dir="ltr" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
              ) : <span className="hidden sm:block" />}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-3">
        <p className="mb-2 text-xs font-extrabold text-text">إضافة كتلة</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as BlogSidebarBlockType }))} className="h-10 rounded-lg border border-border bg-surface px-3 text-xs font-bold">
            {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <input value={draft.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="عنوان الكتلة" className="h-10 rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary" />
          <textarea value={draft.content ?? ""} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="النص أو الوصف" rows={2} className="resize-y rounded-lg border border-border bg-surface p-2.5 text-xs outline-none focus:border-primary" />
          {draft.type === "image" ? <input value={draft.imageUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="رابط الصورة" dir="ltr" className="h-10 rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary" /> : draft.type !== "text" ? <input value={draft.href ?? ""} onChange={(event) => setDraft((current) => ({ ...current, href: event.target.value }))} placeholder="الرابط" dir="ltr" className="h-10 rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary" /> : <span />}
        </div>
        <button type="button" onClick={add} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-extrabold text-primary hover:bg-primary/10"><FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />إضافة الكتلة</button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />{saving ? "جارٍ الحفظ..." : "حفظ Sidebar"}</button>
        {message && <span className="text-xs font-bold text-primary">{message}</span>}
      </div>
    </section>
  );
}
