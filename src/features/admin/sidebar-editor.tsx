"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faCode,
  faFloppyDisk,
  faPlus,
  faShieldHalved,
  faTrash,
  faToggleOff,
  faToggleOn,
} from "@fortawesome/free-solid-svg-icons";
import {
  saveSiteSettings,
  useSiteSettings,
  type SidebarPlacement,
  type SidebarWidget,
} from "@/features/settings/use-site-settings";

const PLACEMENTS: { value: SidebarPlacement; label: string }[] = [
  { value: "global", label: "Global — المقالات والأدوات والأدلّة" },
  { value: "blog", label: "Blog — صفحات المدونة" },
  { value: "tools", label: "Tools — صفحات الأدوات" },
  { value: "guides", label: "Guides — صفحات الأدلة والتخصصات" },
];

function newWidget(order: number): SidebarWidget {
  return {
    id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    html: "",
    css: "",
    js: "",
    enabled: true,
    order,
    placement: "global",
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-text-muted">{label}</span>
      {hint && <span className="mb-1.5 block text-[10.5px] leading-relaxed text-text-muted">{hint}</span>}
      {children}
    </label>
  );
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
const codeClass = "min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed outline-none focus:border-primary";

export function SidebarEditor() {
  const { settings, loaded } = useSiteSettings();
  const [enabled, setEnabled] = useState(false);
  const [widgets, setWidgets] = useState<SidebarWidget[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setEnabled(settings.sidebar?.enabled === true);
    setWidgets((settings.sidebar?.widgets ?? []).map((widget, index) => ({
      ...widget,
      html: widget.html ?? "",
      css: widget.css ?? "",
      js: widget.js ?? "",
      enabled: widget.enabled !== false,
      order: typeof widget.order === "number" ? widget.order : index,
      placement: widget.placement ?? "global",
    })));
  }, [loaded, settings.sidebar]);

  function updateWidget(id: string, patch: Partial<SidebarWidget>) {
    setWidgets((current) => current.map((widget) => widget.id === id ? { ...widget, ...patch } : widget));
  }

  function moveWidget(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    setWidgets(next.map((widget, order) => ({ ...widget, order })));
  }

  function deleteWidget(id: string) {
    if (!confirm("حذف هذا الـWidget نهائياً؟")) return;
    setWidgets((current) => current.filter((widget) => widget.id !== id).map((widget, order) => ({ ...widget, order })));
  }

  async function save() {
    setSaving(true);
    try {
      const clean = widgets.map((widget, order) => ({
        ...widget,
        title: widget.title?.trim() ?? "",
        html: widget.html ?? "",
        css: widget.css ?? "",
        js: widget.js ?? "",
        enabled: widget.enabled !== false,
        order,
        placement: widget.placement ?? "global",
      }));
      await saveSiteSettings({ sidebar: { enabled, widgets: clean } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-extrabold">Sidebar / Widget System</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted">
              أنشئ Widgets مخصّصة من HTML وCSS وJavaScript، ثم حدّد مكانها وترتيبها.
              لا تُضاف أي Widgets تلقائيًا؛ ما يظهر للزوار هو ما تحفظه هنا فقط.
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-warning/25 bg-warning/5 p-3 text-[11px] leading-relaxed text-text-muted">
          الكود المخصص يُنفّذ داخل الصفحة العامة بصلاحياتها. استخدم هذا النظام للكود الموثوق الذي تديره أنت فقط؛ الكتابة محمية بقواعد Firebase للأدمن.
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
          <span>
            <span className="block text-sm font-extrabold">Sidebar عالمي</span>
            <span className="mt-0.5 block text-[11px] text-text-muted">عند الإيقاف لا يظهر الشريط ولا تبقى مساحة فارغة.</span>
          </span>
          <button type="button" onClick={() => setEnabled((value) => !value)} aria-pressed={enabled} aria-label={enabled ? "تعطيل Sidebar" : "تفعيل Sidebar"}>
            <FontAwesomeIcon icon={enabled ? faToggleOn : faToggleOff} className={`h-8 w-8 ${enabled ? "text-secondary" : "text-text-muted"}`} />
          </button>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-extrabold">Widgets</h2>
          <p className="text-[11px] text-text-muted">{widgets.length} Widget محفوظ</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setWidgets((current) => [...current, newWidget(current.length)])}
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-xs font-extrabold text-primary hover:bg-primary/5">
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> إضافة Widget
          </button>
          <button type="button" onClick={save} disabled={saving || !loaded}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">
            <FontAwesomeIcon icon={faFloppyDisk} className="h-3 w-3" /> {saving ? "جارٍ الحفظ..." : "حفظ Sidebar"}
          </button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <FontAwesomeIcon icon={faCode} className="h-6 w-6 text-text-muted" />
          <p className="mt-2 text-sm font-bold">لا توجد Widgets بعد</p>
          <p className="mt-1 text-xs text-text-muted">اضغط «إضافة Widget» لإنشاء أول كتلة HTML مخصصة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {widgets.map((widget, index) => (
            <section key={widget.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold">{widget.title?.trim() || "Widget بلا عنوان"}</h3>
                    <p className="text-[10.5px] text-text-muted">{PLACEMENTS.find((p) => p.value === widget.placement)?.label}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => moveWidget(index, -1)} disabled={index === 0} aria-label="تحريك للأعلى" className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-primary disabled:opacity-30">
                    <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => moveWidget(index, 1)} disabled={index === widgets.length - 1} aria-label="تحريك للأسفل" className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-primary disabled:opacity-30">
                    <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => deleteWidget(widget.id)} aria-label="حذف Widget" className="grid h-8 w-8 place-items-center rounded-lg border border-danger/25 text-danger hover:bg-danger/5">
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="العنوان (اختياري)">
                  <input value={widget.title ?? ""} onChange={(e) => updateWidget(widget.id, { title: e.target.value })} placeholder="مثلاً: تابعنا" className={inputClass} />
                </Field>
                <Field label="Placement">
                  <select value={widget.placement ?? "global"} onChange={(e) => updateWidget(widget.id, { placement: e.target.value as SidebarPlacement })} className={inputClass}>
                    {PLACEMENTS.map((placement) => <option key={placement.value} value={placement.value}>{placement.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-3 space-y-3">
                <Field label="HTML" hint="يُعرض داخل Widget مباشرةً، وليس عبر iframe.">
                  <textarea value={widget.html ?? ""} onChange={(e) => updateWidget(widget.id, { html: e.target.value })} placeholder="<div>...</div>" dir="ltr" className={codeClass} />
                </Field>
                <Field label="CSS (اختياري)">
                  <textarea value={widget.css ?? ""} onChange={(e) => updateWidget(widget.id, { css: e.target.value })} placeholder=".my-widget { ... }" dir="ltr" className={codeClass} />
                </Field>
                <Field label="JavaScript (اختياري)" hint="يُنفّذ بعد إدراج Widget؛ استخدم كودًا موثوقًا ومديرًا من الأدمن فقط.">
                  <textarea value={widget.js ?? ""} onChange={(e) => updateWidget(widget.id, { js: e.target.value })} placeholder="(() => { ... })();" dir="ltr" className={codeClass} />
                </Field>
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold text-text-muted">
                <input type="checkbox" checked={widget.enabled !== false} onChange={(e) => updateWidget(widget.id, { enabled: e.target.checked })} className="h-4 w-4 accent-primary" />
                Widget مفعّل
              </label>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
