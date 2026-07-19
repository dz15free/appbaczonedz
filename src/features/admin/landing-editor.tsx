"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faCheck } from "@fortawesome/free-solid-svg-icons";
import {
  useSiteSettings, saveSiteSettings,
  type LandingCard, type LandingStep, type FaqItem, type SiteSettings,
} from "@/features/settings/use-site-settings";
import { CardListEditor } from "@/features/admin/card-list-editor";

function uid() { return Math.random().toString(36).slice(2, 9); }

function Field({ label, value, onChange, textarea, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      )}
    </label>
  );
}

export function LandingEditor() {
  const { settings, loaded } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (loaded) setDraft(settings); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await saveSiteSettings({
      landingBadge: draft.landingBadge,
      heroTitleLine1: draft.heroTitleLine1,
      heroTitleLine2: draft.heroTitleLine2,
      heroSubtitle: draft.heroSubtitle,
      heroCtaPrimary: draft.heroCtaPrimary,
      heroCtaSecondary: draft.heroCtaSecondary,
      badges: draft.badges,
      stepsTitle: draft.stepsTitle,
      steps: draft.steps,
      featuresTitle: draft.featuresTitle,
      featuresSubtitle: draft.featuresSubtitle,
      features: draft.features,
      audienceTitle: draft.audienceTitle,
      audienceSubtitle: draft.audienceSubtitle,
      audience: draft.audience,
      pricingTitle: draft.pricingTitle,
      pricingNote: draft.pricingNote,
      pricingRows: draft.pricingRows,
      faqTitle: draft.faqTitle,
      faq: draft.faq,
      ctaTitle: draft.ctaTitle,
      ctaSubtitle: draft.ctaSubtitle,
      ctaButton: draft.ctaButton,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!loaded) return <p className="text-text-muted">جارٍ التحميل...</p>;

  return (
    <div className="space-y-6">
      {/* قسم الهيرو */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">🎯 القسم الرئيسي (الهيرو)</h3>
        <div className="space-y-3">
          <Field label="الشارة العلوية" value={draft.landingBadge ?? ""} onChange={(v) => set("landingBadge", v)} placeholder="صُنعت في الجزائر..." />
          <Field label="العنوان — السطر الأول" value={draft.heroTitleLine1 ?? ""} onChange={(v) => set("heroTitleLine1", v)} />
          <Field label="العنوان — السطر الثاني (ملوّن)" value={draft.heroTitleLine2 ?? ""} onChange={(v) => set("heroTitleLine2", v)} />
          <Field label="الوصف" value={draft.heroSubtitle ?? ""} onChange={(v) => set("heroSubtitle", v)} textarea />
          <div className="grid grid-cols-2 gap-3">
            <Field label="الزر الأساسي" value={draft.heroCtaPrimary ?? ""} onChange={(v) => set("heroCtaPrimary", v)} />
            <Field label="الزر الثانوي" value={draft.heroCtaSecondary ?? ""} onChange={(v) => set("heroCtaSecondary", v)} />
          </div>
        </div>
      </section>

      {/* شارات المزايا السريعة */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">🏷️ الشارات السريعة</h3>
        <CardListEditor
          title="الشارات"
          items={draft.badges ?? []}
          onChange={(items) => set("badges", items)}
          fields={[{ key: "label", label: "النص" }]}
          newItem={() => ({ id: uid(), icon: "star", label: "ميزة جديدة" })}
        />
      </section>

      {/* الخطوات */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">📋 قسم الخطوات</h3>
        <Field label="عنوان القسم" value={draft.stepsTitle ?? ""} onChange={(v) => set("stepsTitle", v)} />
        <div className="mt-3">
          <CardListEditor<LandingStep>
            title="الخطوات"
            items={draft.steps ?? []}
            onChange={(items) => set("steps", items)}
            hasIcon={false}
            fields={[
              { key: "n", label: "الرقم", placeholder: "01" },
              { key: "title", label: "العنوان" },
              { key: "desc", label: "الوصف", type: "textarea" },
            ]}
            newItem={() => ({ id: uid(), n: "0" + (((draft.steps ?? []).length) + 1), title: "خطوة جديدة", desc: "" })}
          />
        </div>
      </section>

      {/* لمن هذه المنصّة */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">👥 لمن هذه المنصّة</h3>
        <div className="space-y-3">
          <Field label="عنوان القسم" value={draft.audienceTitle ?? ""} onChange={(v) => set("audienceTitle", v)} />
          <Field label="وصف القسم" value={draft.audienceSubtitle ?? ""} onChange={(v) => set("audienceSubtitle", v)} />
        </div>
        <div className="mt-3">
          <CardListEditor<LandingCard>
            title="البطاقات (للطالب / للأستاذ)"
            items={draft.audience ?? []}
            onChange={(items) => set("audience", items)}
            fields={[
              { key: "title", label: "العنوان" },
              { key: "desc", label: "الشرح", type: "textarea" },
            ]}
            newItem={() => ({ id: uid(), icon: "users", title: "دور جديد", desc: "" })}
          />
        </div>
      </section>

      {/* التكلفة */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">💳 قسم التكلفة</h3>
        <div className="space-y-3">
          <Field label="عنوان القسم" value={draft.pricingTitle ?? ""} onChange={(v) => set("pricingTitle", v)} />
          <Field label="الشرح الرئيسي" value={draft.pricingNote ?? ""} onChange={(v) => set("pricingNote", v)} textarea />
        </div>
        <div className="mt-3">
          <CardListEditor<{ id: string; title: string; desc: string }>
            title="بنود التكلفة"
            items={draft.pricingRows ?? []}
            onChange={(items) => set("pricingRows", items)}
            hasIcon={false}
            fields={[
              { key: "title", label: "البند" },
              { key: "desc", label: "التفصيل", type: "textarea" },
            ]}
            newItem={() => ({ id: uid(), title: "بند جديد", desc: "" })}
          />
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">❓ الأسئلة الشائعة</h3>
        <Field label="عنوان القسم" value={draft.faqTitle ?? ""} onChange={(v) => set("faqTitle", v)} />
        <div className="mt-3">
          <CardListEditor<FaqItem>
            title="الأسئلة"
            items={draft.faq ?? []}
            onChange={(items) => set("faq", items)}
            hasIcon={false}
            fields={[
              { key: "q", label: "السؤال" },
              { key: "a", label: "الجواب", type: "textarea" },
            ]}
            newItem={() => ({ id: uid(), q: "سؤال جديد", a: "" })}
          />
        </div>
      </section>

      {/* المزايا */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">⭐ قسم المزايا</h3>
        <div className="space-y-3">
          <Field label="عنوان القسم" value={draft.featuresTitle ?? ""} onChange={(v) => set("featuresTitle", v)} />
          <Field label="وصف القسم" value={draft.featuresSubtitle ?? ""} onChange={(v) => set("featuresSubtitle", v)} />
        </div>
        <div className="mt-3">
          <CardListEditor<LandingCard>
            title="بطاقات المزايا"
            items={draft.features ?? []}
            onChange={(items) => set("features", items)}
            fields={[
              { key: "title", label: "العنوان" },
              { key: "desc", label: "الوصف", type: "textarea" },
            ]}
            newItem={() => ({ id: uid(), icon: "star", title: "ميزة جديدة", desc: "" })}
          />
        </div>
      </section>

      {/* CTA النهائي */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg font-bold">🚀 الدعوة النهائية</h3>
        <div className="space-y-3">
          <Field label="العنوان" value={draft.ctaTitle ?? ""} onChange={(v) => set("ctaTitle", v)} />
          <Field label="الوصف" value={draft.ctaSubtitle ?? ""} onChange={(v) => set("ctaSubtitle", v)} textarea />
          <Field label="نص الزر" value={draft.ctaButton ?? ""} onChange={(v) => set("ctaButton", v)} />
        </div>
      </section>

      {/* زر الحفظ الثابت */}
      <div className="sticky bottom-4 z-10">
        <button onClick={save} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50">
          <FontAwesomeIcon icon={saved ? faCheck : faFloppyDisk} className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ كل تغييرات الصفحة الرئيسية"}
        </button>
      </div>
    </div>
  );
}
