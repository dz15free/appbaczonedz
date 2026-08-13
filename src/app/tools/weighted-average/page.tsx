import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCalculator, faCircleCheck, faScaleBalanced } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { W_DOMAINS } from "@/features/tools/weighted";
import { WeightedCalculator } from "@/features/tools/weighted-calculator";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "حساب المعدل الموزون للبكالوريا 2027 — كل الميادين";
const DESC = "احسب معدّلك الموزون للتوجيه الجامعي في الجزائر: الطبّ، الإعلام الآلي، الهندسة، اللغات، الترجمة وغيرها — بالصيغ المعتمدة، بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["حساب المعدل الموزون", "المعدل الموزون بكالوريا", "معدل التوجيه الجامعي", "حساب معدل الطب", "المعدل الموزون الجزائر", "BacZone"],
  alternates: { canonical: "/tools/weighted-average" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools/weighted-average"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const FAQ = [
  { q: "ما الفرق بين معدّل البكالوريا والمعدّل الموزون؟", a: "معدّل البكالوريا هو معدّلك العامّ في كل المواد. أمّا المعدّل الموزون فيُعيد حساب هذا المعدّل مع إعطاء وزن إضافي لمادّة التخصّص المطلوبة في الميدان الذي ترغب فيه — فيختلف معدّلك الموزون من ميدان إلى آخر." },
  { q: "لماذا يُضرب معدّل البكالوريا في 2؟", a: "لأنّ المعدّل العامّ يبقى الأساس، ومادّة التخصّص عامل مرجّح لا بديل. فيُحسب المعدّل مرّتين ومادّة التخصّص مرّة، ثمّ يُقسم المجموع على ثلاثة." },
  { q: "هل كل الميادين تستعمل الترجيح؟", a: "لا. ميدان العلوم الإنسانية والاقتصاد يعتمد معدّل البكالوريا العامّ مباشرةً بلا ترجيح، كما هو مبيّن في الحاسبة أعلاه." },
  { q: "معدّلي الموزون أقلّ من معدّل بكالوريتي — هل هذا طبيعي؟", a: "نعم. إن كانت علامتك في مادّة التخصّص أقلّ من معدّلك العامّ فسينخفض الموزون، والعكس صحيح. ولهذا قد يكون ميدان أنسب لك من آخر بالمعدّل نفسه." },
  { q: "هل هذه النتيجة رسمية؟", a: "لا. هذه أداة تقدير وفق الصيغ المعتمدة، والنتيجة الرسمية تصدر عن الجهات المعنيّة عند التوجيه." },
];

export default function WeightedAveragePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: TITLE, url: absUrl("/tools/weighted-average"), applicationCategory: "EducationalApplication", operatingSystem: "All", inLanguage: "ar", offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" }, creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") } },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الأدوات", item: absUrl("/tools") }, { "@type": "ListItem", position: 2, name: "المعدل الموزون", item: absUrl("/tools/weighted-average") }] },
    ],
  };

  return (
    <main className="bz-guide bz-weighted-page min-h-screen">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-weighted-product-hero">
        <div className="bz-weighted-product-hero-grid mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          <div>
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-white/65"><Link href="/tools" className="font-bold text-white hover:underline">الأدوات</Link><span>←</span><span>المعدل الموزون</span></nav>
            <PublicBackButton fallbackHref="/tools" fallbackLabel="الأدوات" tone="dark" className="mb-6" />
            <span className="bz-weighted-product-kicker"><FontAwesomeIcon icon={faScaleBalanced} /> أداة التوجيه</span>
            <h1 className="mt-4 font-display text-[31px] font-extrabold leading-[1.2] tracking-tight sm:text-5xl">اعرف أيّ ميدان يرفع فرصك</h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.95] text-white/72 sm:text-lg">المعدل العام لا يحكي القصة كاملة. اختر الميدان، أدخل معدلك وعلامة التخصص، ثم شاهد أثر الترجيح بوضوح قبل ترتيب رغباتك.</p>
            <div className="mt-7 flex flex-wrap gap-2.5"><span><b>{W_DOMAINS.length}</b> ميادين</span><span><b>3</b> خطوات</span><span><b>5 ثوانٍ</b> كشف هادئ</span></div>
          </div>
          <div className="bz-weighted-product-hero-card"><span>المعادلة الأساسية</span><strong>المعدل × 2</strong><i>＋ علامة مادة التخصص</i><b>÷ 3</b><small>قارن الفرق قبل أن تختار</small></div>
        </div>
        <div className="bz-weighted-product-wave" />
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="bz-weighted-product-shell mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="bz-weighted-product-path" aria-label="طريقة استعمال الحاسبة"><span className="is-active"><b>01</b><strong>اختر الميدان</strong><small>الطب، الهندسة، اللغات وغيرها</small></span><i /><span><b>02</b><strong>أدخل العلامات</strong><small>معدلك ومواد الترجيح</small></span><i /><span><b>03</b><strong>افهم الفرق</strong><small>أين تكون أقرب؟</small></span></div>

          <section className="bz-weighted-product-app" aria-label="حاسبة المعدل الموزون"><div className="bz-weighted-product-app-head"><div><span className="bz-weighted-product-eyebrow">ابدأ المقارنة</span><h2>معدّلك يتغيّر حسب الميدان</h2><p>لا تغيّر الصيغة، غيّر زاوية النظر إلى نتيجتك.</p></div><span className="bz-weighted-product-app-icon"><FontAwesomeIcon icon={faCalculator} /></span></div><WeightedCalculator /></section>

          <section className="bz-weighted-product-explain" aria-label="شرح المعدل الموزون"><article><span className="bz-weighted-product-explain-icon"><FontAwesomeIcon icon={faScaleBalanced} /></span><div><h2>ما هو المعدّل الموزون؟</h2><p>عند التوجيه الجامعي، لا يُنظر إلى معدّل بكالوريتك وحده في كل الميادين. بعض الميادين تُعطي <strong>وزناً إضافياً لمادّة التخصّص</strong>: فمن يريد الطبّ تُحسب له علامة العلوم الطبيعية مرّة إضافية، ومن يريد الإعلام الآلي تُحسب له الرياضيات.</p><p>والنتيجة أنّ معدّلك الموزون يختلف من ميدان إلى آخر بالمعدّل نفسه، وقد يكون ميدان في متناولك وآخر بعيداً.</p></div></article><article><span className="bz-weighted-product-explain-icon"><FontAwesomeIcon icon={faCircleCheck} /></span><div><h2>كيف تستعملها؟</h2><ol><li>اختر ميدان التخصّص الذي ترغب فيه.</li><li>أدخل معدّل بكالوريتك — وإن لم تعرفه فاحسبه أولاً في <Link href="/calculate">حاسبة المعدّل</Link>.</li><li>أدخل علامات مواد التخصّص التي يطلبها الميدان.</li><li>انتظر الكشف ثم اقرأ الفرق عن معدّلك العام.</li></ol></div></article></section>

          <section className="bz-weighted-product-tip"><div><span className="bz-weighted-product-eyebrow">نصيحة عملية</span><h2>لا ترتّب رغباتك بالمعدل العام وحده</h2><p><strong>احسب معدّلك في أكثر من ميدان قبل ترتيب رغباتك.</strong> فرق نصف نقطة في الموزون قد يغيّر ترتيبك، والحاسبة تساعدك على رؤية هذا الفرق قبل اتخاذ قرارك.</p></div><Link href="/specialties">اكتشف التخصصات الجامعية <FontAwesomeIcon icon={faArrowLeft} /></Link></section>

          <section className="bz-weighted-product-formulas"><div className="bz-weighted-product-section-head"><span className="bz-weighted-product-eyebrow">مرجع سريع</span><h2>صيغ الميادين</h2><p>البيانات التالية هي الصيغ نفسها التي تستعملها الحاسبة.</p></div><div className="overflow-x-auto rounded-2xl border border-[var(--bz-line)]"><table className="w-full min-w-[520px] text-[12.5px]"><thead><tr><th>الميدان</th><th>الصيغة</th></tr></thead><tbody>{W_DOMAINS.map((d) => <tr key={d.id}><td>{d.title}</td><td>{d.formulaText}</td></tr>)}</tbody></table></div></section>

          <section className="bz-weighted-product-faq" aria-labelledby="weighted-faq-title"><div className="bz-weighted-product-section-head"><span className="bz-weighted-product-eyebrow">قبل أن تبدأ</span><h2 id="weighted-faq-title">أسئلة شائعة</h2></div><div className="space-y-2.5">{FAQ.map((f) => <details key={f.q}><summary>{f.q}<span>＋</span></summary><p>{f.a}</p></details>)}</div></section>

          <aside className="bz-weighted-product-related"><h2>أدوات تكمّلها</h2><div><Link href="/calculate">حساب معدّل البكالوريا <FontAwesomeIcon icon={faArrowLeft} /></Link><Link href="/specialties">دليل التخصّصات الجامعية <FontAwesomeIcon icon={faArrowLeft} /></Link></div></aside>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}
