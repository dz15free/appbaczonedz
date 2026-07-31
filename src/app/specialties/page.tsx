import type { Metadata } from "next";
import Link from "next/link";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";
import { SpecSearch } from "@/features/guide/spec-search";

/* ════════════════════════════════════════════════════════════
   دليل التخصّصات الجامعية — الصفحة العامّة

   **بلا تسجيل دخول عمداً**: الطالب يبحث عن تخصّصه قبل أن يعرف المنصّة
   أصلاً. وضع جدار تسجيل أمام محتوى يُبحث عنه في Google يعني ألّا يصل
   إليه أحد — ويمنع الفهرسة أساساً.

   الصفحة مكوّن خادم: المحتوى في HTML من أوّل طلب، فتقرأه محرّكات البحث
   بلا تنفيذ JavaScript. البحث وحده تفاعلي في المتصفّح.
════════════════════════════════════════════════════════════ */

const TITLE = "دليل التخصّصات الجامعية في الجزائر";
const DESC =
  "دليل شامل لأكثر من 250 تخصّصاً جامعياً في الجزائر: شروط القبول، نظام الدراسة، " +
  "المواد، وفرص العمل — مشروح بلغة يفهمها طالب البكالوريا.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "التخصصات الجامعية في الجزائر", "دليل الجامعة", "التوجيه الجامعي",
    "معدلات القبول", "بكالوريا", "المدارس العليا", "BacZone",
  ],
  alternates: { canonical: "/specialties" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: "/specialties",
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function SpecialtiesPage() {
  const byField = SPEC_FIELDS.map((f) => ({
    field: f,
    items: SPEC_INDEX.filter((s) => s.field === f),
  }));

  /* بيانات منظَّمة: تجعل Google يفهم أنّ هذه **قائمة** لا نصّاً حرّاً،
     فيعرضها أحياناً كنتيجة موسّعة. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESC,
    inLanguage: "ar",
    hasPart: SPEC_INDEX.slice(0, 60).map((s) => ({
      "@type": "WebPage",
      name: `تخصّص ${s.ar}${s.fr ? ` — ${s.fr}` : ""}`,
      url: `/specialties/${s.slug}`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-6">
        <p className="text-[11px] font-bold text-[var(--bz-blue)]">BacZone · دليل الجامعة</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          {TITLE}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          {SPEC_INDEX.length} تخصّصاً مشروحاً: ماذا تدرس فعلاً، وكيف تُقبل،
          وأين تعمل بعد التخرّج. اختر بالبحث أو تصفّح حسب المجال.
        </p>
      </header>

      <SpecSearch />

      <div className="mt-8 space-y-8">
        {byField.map(({ field, items }) => (
          <section key={field} id={field}>
            <h2 className="mb-3 flex items-baseline gap-2 font-display text-lg font-extrabold">
              {field}
              <span className="font-mono text-xs font-bold text-text-muted">{items.length}</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  href={`/specialties/${s.slug}`}
                  className="group rounded-xl border border-border bg-surface p-3 transition hover:-translate-y-0.5 hover:border-[var(--bz-blue-100)] hover:shadow-md"
                >
                  <span className="block truncate text-sm font-extrabold text-text-primary group-hover:text-[var(--bz-blue-700)]">
                    {s.ar}
                  </span>
                  {s.fr && (
                    <span className="mt-0.5 block truncate text-[11px] text-text-muted" dir="ltr">
                      {s.fr}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-xl border border-border bg-[var(--bz-canvas)] p-3 text-[11.5px] leading-relaxed text-text-muted">
        <b>تنبيه:</b> معدّلات القبول المذكورة مؤشّر من سنوات سابقة وتتغيّر كل سنة
        بحسب عدد الناجحين ورغباتهم. اعتمد دائماً على منصّة التوجيه الرسمية عند
        ملء رغباتك.
      </p>
    </main>
  );
}
