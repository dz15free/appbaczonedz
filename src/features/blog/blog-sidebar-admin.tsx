import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faFloppyDisk, faPlus, faTrash, faToggleOn, faToggleOff, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import {
  saveSetting,
  useSiteSettings,
  type BlogSidebarBlock,
  type BlogSidebarSettings,
} from "@/features/settings/use-site-settings";

const emptyBlock = (): BlogSidebarBlock => ({
  id: `sidebar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: "native",
  title: "",
  html: "",
  css: "",
  javascript: "",
  content: "",
  href: "",
  imageUrl: "",
  active: true,
  order: 0,
  placement: "both",
});

export function BlogSidebarAdmin() {
  const { settings, loaded } = useSiteSettings();
  const [draft, setDraft] = useState<BlogSidebarSettings>(() => settings.blogSidebar ?? { enabled: false, blocks: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setDraft(settings.blogSidebar ?? { enabled: false, blocks: [] });
  }, [loaded, settings.blogSidebar]);
  const [message, setMessage] = useState("");

  const blocks = useMemo(() => [...draft.blocks].sort((a, b) => a.order - b.order), [draft.blocks]);
  const patch = (id: string, next: Partial<BlogSidebarBlock>) => setDraft((current) => ({
    ...current,
    blocks: current.blocks.map((block) => block.id === id ? { ...block, ...next } : block),
  }));
  const add = () => setDraft((current) => ({
    ...current,
    enabled: true,
    blocks: [...current.blocks, { ...emptyBlock(), order: current.blocks.length }],
  }));
  const remove = (id: string) => setDraft((current) => ({
    ...current,
    blocks: current.blocks.filter((block) => block.id !== id).map((block, index) => ({ ...block, order: index })),
  }));
  const move = (id: string, direction: -1 | 1) => setDraft((current) => {
    const ordered = [...current.blocks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((block) => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return current;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    return { ...current, blocks: ordered.map((block, order) => ({ ...block, order })) };
  });
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await saveSetting("blogSidebar", { enabled: draft.enabled, blocks: blocks.map((block, order) => ({ ...block, order })) });
      setMessage("تم حفظ Widgets Sidebar.");
    } catch {
      setMessage("تعذر حفظ Widgets Sidebar. تحقق من الصلاحيات والاتصال.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <FontAwesomeIcon icon={faCode} className="h-4 w-4 text-primary" /> Widgets Sidebar للمدونة
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-text-muted">
            أضف Widgets اختيارية شبيهة بفكرة Blogger. لا يوجد محتوى افتراضي، ويحفظ JavaScript للمراجعة أو التكامل المعتمد فقط؛ لا يُنفّذ داخل React أو Firebase.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} className="h-4 w-4 accent-primary" />
          تفعيل Sidebar
        </label>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
        JavaScript الاعتباطي لا يُحقن في الصفحة الرئيسية. HTML/CSS يُنقّى ويُحصر داخل Widget، وJavaScript — عند وجوده — يُعرض لاحقاً في iframe sandbox معزول.
      </div>

      <div className="space-y-3">
        {blocks.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-muted">لا توجد Widgets مضافة حالياً.</p> : blocks.map((block) => (
          <article key={block.id} className="rounded-xl border border-border bg-background p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <FontAwesomeIcon icon={faGripVertical} className="h-3.5 w-3.5 text-text-muted" />
              <input value={block.title ?? ""} onChange={(event) => patch(block.id, { title: event.target.value })} placeholder="عنوان اختياري" className="h-9 min-w-[180px] flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary" />
              <select value={block.type} onChange={(event) => patch(block.id, { type: event.target.value as BlogSidebarBlock["type"] })} className="h-9 rounded-lg border border-border bg-surface px-2 text-xs">
                <option value="native">HTML/CSS آمن</option><option value="text">نص</option><option value="image">صورة</option><option value="link">رابط</option><option value="cta">CTA</option>
              </select>
              <select value={block.placement} onChange={(event) => patch(block.id, { placement: event.target.value as BlogSidebarBlock["placement"] })} className="h-9 rounded-lg border border-border bg-surface px-2 text-xs">
                <option value="both">المدونة والمقال</option><option value="blog-index">قائمة المدونة</option><option value="article">صفحة المقال</option>
              </select>
              <button type="button" onClick={() => patch(block.id, { active: !block.active })} className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold ${block.active ? "bg-emerald-500/15 text-emerald-700" : "bg-border text-text-muted"}`}>
                <FontAwesomeIcon icon={block.active ? faToggleOn : faToggleOff} className="h-4 w-4" />{block.active ? "نشط" : "معطل"}
              </button>
              <button type="button" onClick={() => remove(block.id)} className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger" aria-label="حذف Widget">
                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-xs"><button type="button" onClick={() => move(block.id, -1)} className="rounded-md border border-border px-2 py-1">أعلى</button><button type="button" onClick={() => move(block.id, 1)} className="rounded-md border border-border px-2 py-1">أسفل</button></div>
            {block.type === "native" && <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold md:col-span-2">HTML<textarea value={block.html ?? ""} onChange={(event) => patch(block.id, { html: event.target.value })} rows={5} placeholder="ضع HTML الآمن هنا" className="mt-1 w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs outline-none focus:border-primary" /></label>
              <label className="text-xs font-bold">CSS اختياري<textarea value={block.css ?? ""} onChange={(event) => patch(block.id, { css: event.target.value })} rows={4} placeholder="CSS سيُحصر داخل Widget" className="mt-1 w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs outline-none focus:border-primary" /></label>
              <label className="text-xs font-bold">JavaScript محفوظ<textarea value={block.javascript ?? ""} onChange={(event) => patch(block.id, { javascript: event.target.value })} rows={4} placeholder="سيُحفظ ويُعزل قبل أي تشغيل" className="mt-1 w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs outline-none focus:border-primary" /></label>
            </div>}
            {block.type !== "native" && <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold">النص<textarea value={block.content ?? ""} onChange={(event) => patch(block.id, { content: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-surface p-3 text-xs outline-none focus:border-primary" /></label>
              <label className="text-xs font-bold">الرابط أو الصورة<input value={block.type === "image" ? block.imageUrl ?? "" : block.href ?? ""} onChange={(event) => patch(block.id, block.type === "image" ? { imageUrl: event.target.value } : { href: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary" /></label>
            </div>}
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"><FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> إضافة Widget</button>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />{saving ? "جارٍ الحفظ…" : "حفظ Widgets"}</button>
        {message && <span className="self-center text-xs font-bold text-text-muted">{message}</span>}
      </div>
    </section>
  );
}
