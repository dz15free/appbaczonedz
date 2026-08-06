import type { Metadata } from "next";
import Link from "next/link";
import { BRANCHES, totalCoef } from "@/features/calculator/branches";
import { absUrl } from "@/features/guide/site-url";

/* ════════════════════════════════════════════════════════════
   صفحة اختيار الشعبة

   **صفحة لكل شعبة، لا صفحة واحدة بقائمة منسدلة.** من يبحث «حساب معدل
   البكالوريا شعبة علوم تجريبية» يجب أن يصل إلى صفحة عنوانها ذلك
   بالضبط — لا إلى صفحة عامّة تطلب منه اختياراً إضافياً.

   وهذا ليس سيو فقط: الوصول المباشر يوفّر على الطالب نقرة ويُظهر له
   موادّه فوراً.
════════════════════════════════════════════════════════════ */

const TITLE = "حساب معدل البكالوريا 2027 — لكل الشعب";
const DESC =
  "احسب معدّلك في البكالوريا بدقّة وفق المعاملات المعتمدة بعد تعديلات وزارة التربية: " +
  "علوم تجريبية · رياضيات · الهندسة · تسيير واقتصاد · آداب وفلسفة · لغات · فنون.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "حساب معدل البكالوريا", "حساب معدل الباك 2027", "حاسبة معدل البكالوريا",
    "معدل البكالوريا الجزائر", "معاملات البكالوريا", "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/calculate" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/calculate"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function CalculateHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: TITLE,
    description: DESC,
    url: absUrl("/calculate"),
    applicationCategory: "EducationalApplication",
    operatingSystem: "All",
    inLanguage: "ar",
    offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
    creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
  };

  return (
    <main className="bz-guide min-h-screen">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-4xl px-4 py-9 sm:py-12">
          <span className="bz-guide-kicker">حاسبة BacZone</span>
          <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.25] sm:text-4xl">
            احسب معدّلك في البكالوريا
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
            بالمعاملات المعتمدة بعد تعديلات الوزارة. اختر شعبتك، أدخل علاماتك،
            واعرف معدّلك في ثوانٍ — <b className="text-white">بلا تسجيل</b>.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-3 pb-14 sm:px-4">
        <Link href="/home" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--bz-blue)] hover:underline">
          العودة إلى BacZone
        </Link>

        <h2 className="mb-3 mt-6 font-display text-lg font-extrabold">اختر شعبتك</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((b) => (
            <Link key={b.slug} href={`/calculate/${b.slug}`} className="bz-branch-card">
              <span className="bz-branch-bar" style={{ background: b.color }} />
              <span className="bz-branch-name">{b.short}</span>
              <span className="bz-branch-meta">
                {b.subjects.length} مواد · مجموع المعاملات {totalCoef(b)}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 text-[11.5px] leading-[1.9] text-[var(--bz-ink-3)]">
          <b className="text-[var(--bz-ink-2)]">تنبيه:</b> هذه أداة تقدير وفق المعاملات
          المعتمدة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.
        </p>
      </div>
    </main>
  );
}
