"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  useNavLinks, saveNavLink, deleteNavLink, newNavId, type NavLink,
} from "@/features/admin/nav-store";
import {
  EDITABLE_PAGES, useAllOverrides, savePageOverride, resetPageOverride,
} from "@/features/admin/page-overrides";

/* ════════════════════════════════════════════════════════════
   لوحة: القائمة + الصفحات

   قسمان في تبويب واحد لأنّهما يجيبان سؤالاً واحداً: «ماذا يرى الزائر
   وأين يجده؟».
════════════════════════════════════════════════════════════ */

const ICONS = ["book", "poll", "file", "target", "check", "timer", "users", "home", "graduation", "calendar"];

export function SiteEditor() {
  const links = useNavLinks(true);
  const overrides = useAllOverrides();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [draft, setDraft] = useState<NavLink | null>(null);
  const [pageKey, setPageKey] = useState(EDITABLE_PAGES[0]?.key ?? "");
  const [pd, setPd] = useState<{ title: string; description: string; html: string; enabled: boolean; disabled: boolean } | null>(null);

  const page = useMemo(() => EDITABLE_PAGES.find((p) => p.key === pageKey), [pageKey]);
  const cur = overrides[pageKey] ?? {};

  function flash(ok: boolean, t: string) {
    setMsg({ ok, t });
    setTimeout(() => setMsg(null), 3000);
  }

  function loadPage(k: string) {
    setPageKey(k);
    const o = overrides[k] ?? {};
    setPd({
      title: o.title ?? "", description: o.description ?? "", html: o.html ?? "",
      enabled: Boolean(o.enabled), disabled: Boolean(o.disabled),
    });
  }

  const pdv = pd ?? {
    title: cur.title ?? "", description: cur.description ?? "", html: cur.html ?? "",
    enabled: Boolean(cur.enabled), disabled: Boolean(cur.disabled),
  };

  return (
    <section className="space-y-5">
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          msg.ok ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
                 : "bg-[var(--bz-red-050)] text-[var(--bz-red)]"}`}>
          {msg.t}
        </p>
      )}

      {/* ══ القائمة ══ */}
      <div className="rounded-2xl border border-border p-4">
        <div className="mb-1 flex items-center gap-2">
          <Icon name="grid" size={17} className="text-[var(--bz-blue)]" />
          <h2 className="font-display text-base font-extrabold">قائمة الموقع</h2>
          <span className="ms-auto font-mono text-[11px] text-text-muted">{links.length} رابطاً</span>
        </div>
        <p className="mb-3 text-[11.5px] leading-relaxed text-text-muted">
          هذه القائمة تُعرض في <b>الحاسوب والهاتف معاً من مصدر واحد</b> — فلا يمكن
          أن يختلفا. الرقم يحدّد الترتيب (الأصغر أوّلاً)، والرابط الذي يبدأ
          بـ<span className="font-mono">https</span> يُفتح في تبويب جديد تلقائياً.
        </p>

        <div className="space-y-1.5">
          {links.map((l) => (
            <div key={l.id} className={`rounded-xl border p-2.5 ${l.hidden ? "border-border bg-[var(--bz-canvas)] opacity-60" : "border-border"}`}>
              {draft?.id === l.id ? (
                <div className="space-y-2">
                  <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    placeholder="الاسم الظاهر"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-bold outline-none focus:border-[var(--bz-blue)]" />
                  <input value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                    dir="ltr" placeholder="/calculate أو https://…"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 font-mono text-xs outline-none focus:border-[var(--bz-blue)]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={draft.icon ?? ""} onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none">
                      <option value="">أيقونة…</option>
                      {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input type="number" value={draft.order}
                      onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none" />
                    <label className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                      <input type="checkbox" checked={Boolean(draft.hidden)}
                        onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })} />
                      مخفيّ
                    </label>
                    <button onClick={async () => {
                      if (!draft.label.trim() || !draft.href.trim()) { flash(false, "الاسم والرابط مطلوبان."); return; }
                      await saveNavLink(draft); setDraft(null); flash(true, "حُفظ الرابط.");
                    }} className="ms-auto rounded-lg bg-[var(--bz-blue)] px-3 py-1.5 text-xs font-bold text-white">حفظ</button>
                    <button onClick={() => setDraft(null)} className="text-xs font-bold text-text-muted">إلغاء</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] text-text-muted">{l.order}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {l.label}
                    {l.hidden && <span className="ms-1 text-[10px] text-text-muted">(مخفيّ)</span>}
                  </span>
                  <span className="hidden max-w-[180px] truncate font-mono text-[10px] text-text-muted sm:block" dir="ltr">{l.href}</span>
                  <button onClick={() => setDraft({ ...l })} className="text-text-muted hover:text-primary" aria-label="تعديل">
                    <Icon name="pen" size={13} />
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`حذف «${l.label}» من القائمة؟`)) return;
                    await deleteNavLink(l.id); flash(true, "حُذف الرابط.");
                  }} className="text-text-muted hover:text-[var(--bz-red)]" aria-label="حذف">
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setDraft({ id: newNavId(`link-${Date.now()}`), label: "", href: "", order: 999 })}
          className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--bz-blue)]"
        >
          <Icon name="plus" size={13} /> أضف رابطاً جديداً
        </button>
      </div>

      {/* ══ الصفحات ══ */}
      <div className="rounded-2xl border border-border p-4">
        <div className="mb-1 flex items-center gap-2">
          <Icon name="file" size={17} className="text-[var(--bz-blue)]" />
          <h2 className="font-display text-base font-extrabold">تعديل الصفحات</h2>
        </div>
        <p className="mb-3 text-[11.5px] leading-relaxed text-text-muted">
          يمكنك تغيير <b>العنوان والوصف</b> وحدهما، أو استبدال محتوى الصفحة
          بـ<b>HTML تكتبه أنت</b>. ما دام «تفعيل HTML» مطفأً يبقى المحتوى الأصلي
          كما هو — فالتجربة آمنة.
        </p>

        <select value={pageKey} onChange={(e) => loadPage(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-[var(--bz-blue)]">
          {EDITABLE_PAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>

        {page && (
          <a href={page.path} target="_blank" rel="noreferrer"
            className="mb-3 inline-block font-mono text-[11px] text-[var(--bz-blue)] hover:underline" dir="ltr">
            {page.path} ↗
          </a>
        )}

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-text-muted">عنوان الصفحة</label>
            <input value={pdv.title} onChange={(e) => setPd({ ...pdv, title: e.target.value })}
              placeholder="اتركه فارغاً للإبقاء على العنوان الأصلي"
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-bold outline-none focus:border-[var(--bz-blue)]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-text-muted">وصف الصفحة (يظهر في Google)</label>
            <textarea value={pdv.description} onChange={(e) => setPd({ ...pdv, description: e.target.value })}
              rows={2} placeholder="سطران على الأكثر"
              className="w-full resize-y rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-[var(--bz-blue)]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-text-muted">محتوى HTML</label>
            <textarea value={pdv.html} onChange={(e) => setPd({ ...pdv, html: e.target.value })}
              rows={12} dir="ltr" spellCheck={false}
              placeholder="<h2>عنوان</h2>&#10;<p>فقرة…</p>"
              className="w-full resize-y rounded-lg border border-border bg-surface p-2.5 font-mono text-[11.5px] leading-relaxed outline-none focus:border-[var(--bz-blue)]" />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-2.5">
            <label className="flex items-center gap-1.5 text-xs font-bold">
              <input type="checkbox" checked={pdv.enabled}
                onChange={(e) => setPd({ ...pdv, enabled: e.target.checked })} />
              تفعيل HTML (يحلّ محلّ المحتوى الأصلي)
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--bz-red)]">
              <input type="checkbox" checked={pdv.disabled}
                onChange={(e) => setPd({ ...pdv, disabled: e.target.checked })} />
              إخفاء الصفحة كلّها
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={async () => {
              await savePageOverride(pageKey, pdv);
              flash(true, "حُفظت الصفحة.");
            }} className="flex-1 rounded-lg bg-[var(--bz-blue)] py-2.5 text-sm font-bold text-white">
              حفظ
            </button>
            <button onClick={async () => {
              if (!confirm("إرجاع الصفحة إلى محتواها الأصلي؟")) return;
              await resetPageOverride(pageKey);
              setPd(null);
              flash(true, "أُرجعت الصفحة إلى الأصل.");
            }} className="rounded-lg border border-border px-4 text-sm font-bold text-text-muted">
              إرجاع للأصل
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
