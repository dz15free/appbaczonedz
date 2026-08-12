import type { Metadata } from "next";
import Link from "next/link";
import { W_DOMAINS } from "@/features/tools/weighted";
import { WeightedCalculator } from "@/features/tools/weighted-calculator";
import { absUrl } from "@/features/guide/site-url";

/* صفحة عامّة بلا تسجيل — المحتوى التعريفي مُصيَّر على الخادم فيُقرأ
   ويُفهرَس، والحاسبة وحدها تفاعلية. */

const TITLE = "حساب المعدل الموزون للبكالوريا 2027 — كل الميادين";
const DESC =
  "احسب معدّلك الموزون للتوجيه الجامعي في الجزائر: الطبّ، الإعلام الآلي، الهندسة، " +
  "اللغات، الترجمة وغيرها — بالصيغ المعتمدة، بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "حساب المعدل الموزون", "المعدل الموزون بكالوريا", "معدل التوجيه الجامعي",
    "حساب معدل الطب", "المعدل الموزون الجزائر", "BacZone",
  ],
  alternates: { canonical: "/tools/weighted-average" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/tools/weighted-average"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const FAQ = [
  {
    q: "ما الفرق بين معدّل البكالوريا والمعدّل الموزون؟",
    a: "معدّل البكالوريا هو معدّلك العامّ في كل المواد. أمّا المعدّل الموزون فيُعيد حساب هذا المعدّل مع إعطاء وزن إضافي لمادّة التخصّص المطلوبة في الميدان الذي ترغب فيه — فيختلف معدّلك الموزون من ميدان إلى آخر.",
  },
  {
    q: "لماذا يُضرب معدّل البكالوريا في 2؟",
    a: "لأنّ المعدّل العامّ يبقى الأساس، ومادّة التخصّص عامل مرجّح لا بديل. فيُحسب المعدّل مرّتين ومادّة التخصّص مرّة، ثمّ يُقسم المجموع على ثلاثة.",
  },
  {
    q: "هل كل الميادين تستعمل الترجيح؟",
    a: "لا. ميدان العلوم الإنسانية والاقتصاد يعتمد معدّل البكالوريا العامّ مباشرةً بلا ترجيح، كما هو مبيّن في الحاسبة أعلاه.",
  },
  {
    q: "معدّلي الموزون أقلّ من معدّل بكالوريتي — هل هذا طبيعي؟",
    a: "نعم. إن كانت علامتك في مادّة التخصّص أقلّ من معدّلك العامّ فسينخفض الموزون، والعكس صحيح. ولهذا قد يكون ميدان أنسب لك من آخر بالمعدّل نفسه.",
  },
  {
    q: "هل هذه النتيجة رسمية؟",
    a: "لا. هذه أداة تقدير وفق الصيغ المعتمدة، والنتيجة الرسمية تصدر عن الجهات المعنيّة عند التوجيه.",
  },
];

export default function WeightedAveragePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: TITLE,
        url: absUrl("/tools/weighted-average"),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الأدوات", item: absUrl("/tools") },
          { "@type": "ListItem", position: 2, name: "المعدل الموزون", item: absUrl("/tools/weighted-average") },
        ],
      },
    ],
  };

  return (
    <main className="bz-guide min-h-screen">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/" className="hover:underline">BacZone</Link>
            <span>·</span>
            <Link href="/tools" className="font-bold text-white hover:underline">الأدوات</Link>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            حساب المعدل الموزون
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.9] text-white/80">
            {W_DOMAINS.length} ميادين · بالصيغ المعتمدة · نتيجة فورية بلا تسجيل
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 pb-14 pt-5 sm:px-4">
        <WeightedCalculator />

        <article className="mt-8">
          <section className="bz-spec-sec">
            <h2>ما هو المعدّل الموزون؟</h2>
            <p className="bz-spec-p">
              عند التوجيه الجامعي، لا يُنظر إلى معدّل بكالوريتك وحده في كل الميادين.
              بعض الميادين تُعطي <strong>وزناً إضافياً لمادّة التخصّص</strong>: فمن يريد
              الطبّ تُحسب له علامة العلوم الطبيعية مرّة إضافية، ومن يريد الإعلام الآلي
              تُحسب له الرياضيات.
            </p>
            <p className="bz-spec-p">
              والنتيجة أنّ <strong>معدّلك الموزون يختلف من ميدان إلى آخر بالمعدّل نفسه</strong>.
              وقد يكون ميدان في متناولك وآخر بعيداً وإن تساوى معدّلك العامّ فيهما.
            </p>
          </section>

          <section className="bz-spec-sec">
            <h2>كيف تستعمل الحاسبة؟</h2>
            <ol className="bz-spec-list">
              <li>اختر <strong>ميدان التخصّص</strong> الذي ترغب فيه من الشرائح أعلاه.</li>
              <li>أدخل <strong>معدّل بكالوريتك</strong> — وإن لم تكن تعرفه بعد فاحسبه أوّلاً في <Link href="/calculate">حاسبة المعدّل</Link>.</li>
              <li>أدخل <strong>علامات مواد التخصّص</strong> التي يطلبها الميدان.</li>
              <li>اضغط «احسب» — ستظهر النتيجة مع <strong>الفرق عن معدّلك العامّ</strong> وتفسيره.</li>
            </ol>
          </section>

          <section className="bz-spec-sec is-pro">
            <h2>نصيحة عملية</h2>
            <p className="bz-spec-p">
              <strong>احسب معدّلك في أكثر من ميدان قبل ترتيب رغباتك.</strong> كثير من
              الطلبة يرتّبون بحسب المعدّل العامّ وحده، فيضعون ميداناً ينخفض فيه معدّلهم
              الموزون في الرغبة الأولى، ويؤخّرون ميداناً كان الترجيح فيه في صالحهم.
            </p>
            <p className="bz-spec-p">
              فرق نصف نقطة في الموزون قد يفصل بين القبول والرفض — وهو فرق تعرفه في
              دقيقتين هنا.
            </p>
          </section>

          <section className="bz-spec-sec">
            <h2>صيغ الميادين</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--bz-line)]">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[var(--bz-canvas)] text-[11px] text-[var(--bz-ink-3)]">
                  <tr>
                    <th className="p-2 text-right">الميدان</th>
                    <th className="p-2 text-right">الصيغة</th>
                  </tr>
                </thead>
                <tbody>
                  {W_DOMAINS.map((d) => (
                    <tr key={d.id} className="border-t border-[var(--bz-line)]">
                      <td className="p-2 font-semibold">{d.title}</td>
                      <td className="p-2 text-[var(--bz-ink-2)]">{d.formulaText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bz-spec-sec">
            <h2>أسئلة شائعة</h2>
            {FAQ.map((f, i) => (
              <div key={i} className="mb-3">
                <p className="text-[13.5px] font-extrabold text-[var(--bz-ink)]">{f.q}</p>
                <p className="bz-spec-p">{f.a}</p>
              </div>
            ))}
          </section>
        </article>

        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">أدوات تكمّلها</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/calculate" className="bz-spec-rel"><span>حساب معدّل البكالوريا</span></Link>
            <Link href="/specialties" className="bz-spec-rel"><span>دليل التخصّصات الجامعية</span></Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
