"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faCheck, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useBlogIndex } from "@/features/blog/blog-store";
import { useSiteSettings, saveSiteSettings, type SiteSettings } from "@/features/settings/use-site-settings";

export function WelcomeEditor() {
  const { settings, loaded } = useSiteSettings();
  const { rows: blogRows, loaded: blogLoaded } = useBlogIndex();
  const [draft, setDraft] = useState<SiteSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (loaded) setDraft(settings); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const publishedArticles = useMemo(
    () => blogRows.filter((article) => article.status === "published"),
    [blogRows],
  );
  const selectedSlugs = Array.isArray(draft.homeArticleSlugs) ? draft.homeArticleSlugs : [];

  function toggleArticle(slug: string) {
    setDraft((current) => {
      const selected = Array.isArray(current.homeArticleSlugs) ? current.homeArticleSlugs : [];
      if (selected.includes(slug)) {
        return { ...current, homeArticleSlugs: selected.filter((item) => item !== slug) };
      }
      if (selected.length >= 3) return current;
      return { ...current, homeArticleSlugs: [...selected, slug] };
    });
  }

  async function save() {
    setSaving(true);
    await saveSiteSettings({
      homeWelcomeTitle: draft.homeWelcomeTitle,
      homeWelcomeSubtitle: draft.homeWelcomeSubtitle,
      homeArticlesTitle: draft.homeArticlesTitle,
      homeArticleSlugs: selectedSlugs.slice(0, 3),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!loaded) return <p className="text-text-muted">جارٍ التحميل...</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">👋 قسم الترحيب (بعد الدخول)</h3>
        <p className="mb-4 text-xs text-text-muted">يظهر هذا القسم للطلاب في صفحتهم الرئيسية بعد تسجيل الدخول.</p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">عنوان الترحيب الصغير</span>
            <input value={draft.homeWelcomeTitle ?? ""} onChange={(e) => setDraft((d) => ({ ...d, homeWelcomeTitle: e.target.value }))}
              placeholder="مرحباً بعودتك"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">النص التعريفي أسفله</span>
            <textarea value={draft.homeWelcomeSubtitle ?? ""} onChange={(e) => setDraft((d) => ({ ...d, homeWelcomeSubtitle: e.target.value }))}
              placeholder="BacZoneDZ منصّتك الشاملة لمراجعة البكالوريا..."
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <span className="mt-1 block text-xs text-text-muted">اتركه فارغاً لاستخدام النص الافتراضي.</span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faBookOpen} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold">مقالات الصفحة الرئيسية</h3>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              اختر حتى 3 مقالات منشورة لتظهر بعد «مصادر إضافية». عند عدم الاختيار، تظهر أحدث المقالات المنشورة تلقائياً.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
            {selectedSlugs.length}/3
          </span>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">عنوان القسم</span>
          <input
            value={draft.homeArticlesTitle ?? ""}
            onChange={(e) => setDraft((current) => ({ ...current, homeArticlesTitle: e.target.value }))}
            placeholder="مقالات قد تفيدك"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">المقالات المنشورة</span>
            {selectedSlugs.length >= 3 && <span className="text-xs font-bold text-primary">اكتمل اختيار 3 مقالات</span>}
          </div>
          {!blogLoaded ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">جارٍ تحميل المقالات...</p>
          ) : publishedArticles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">لا توجد مقالات منشورة للاختيار بعد.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pe-1">
              {publishedArticles.map((article) => {
                const selected = selectedSlugs.includes(article.slug);
                const disabled = !selected && selectedSlugs.length >= 3;
                return (
                  <label
                    key={article.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                      selected ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/25 hover:bg-background"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleArticle(article.slug)}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-relaxed">{article.title}</span>
                      {article.excerpt && <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-text-muted">{article.excerpt}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <button onClick={save} disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50">
        <FontAwesomeIcon icon={saved ? faCheck : faFloppyDisk} className="h-4 w-4" />
        {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ إعدادات الصفحة الرئيسية"}
      </button>
    </div>
  );
}
