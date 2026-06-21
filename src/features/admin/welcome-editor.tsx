"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings, saveSiteSettings, type SiteSettings } from "@/features/settings/use-site-settings";

export function WelcomeEditor() {
  const { settings, loaded } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (loaded) setDraft(settings); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await saveSiteSettings({
      homeWelcomeTitle: draft.homeWelcomeTitle,
      homeWelcomeSubtitle: draft.homeWelcomeSubtitle,
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

      <button onClick={save} disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50">
        <FontAwesomeIcon icon={saved ? faCheck : faFloppyDisk} className="h-4 w-4" />
        {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ قسم الترحيب"}
      </button>
    </div>
  );
}
