import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faCalculator, faCircleCheck, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import { BRANCHES, totalCoef } from "@/features/calculator/branches";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "حساب معدل البكالوريا 2027 جميع الشعب | حاسبة معدل الباك بعد تعديلات الوزارة";
const DESC =
  "حساب معدل البكالوريا 2027 بدقة لجميع الشعب (علوم تجريبية، رياضيات، هندسة، تسيير، آداب، لغات، فنون) وفق المعاملات الجديدة لوزارة التربية. حساب معدل الباك مجاناً وبدقة — بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "حساب معدل البكالوريا", "حساب معدل الباك", "حساب معدل البكالوريا 2027", "حاسبة معدل الباك",
    "حساب معدل الباكلوريا", "حساب معدل البكالوريا شعبة علوم تجريبية", "حساب معدل البكالوريا شعبة رياضيات",
    "حساب معدل البكالوريا شعبة تسيير واقتصاد", "حساب معدل البكالوريا شعبة آداب وفلسفة",
    "حساب معدل البكالوريا شعبة لغات أجنبية", "حساب معدل البكالوريا تقني رياضي", "حساب معدل البكالوريا شعبة فنون",
    "حاسبة معدل البكالوريا بعد تعديلات الوزارة", "معاملات البكالوريا 2027", "حساب معدل البكالوريا بعد تغييرات الوزارة",
    "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/calculate" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/calculate"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const FAQ = [
  {
    q: "كيف يتم حساب معدل البكالوريا؟",
    a: "يُحسب معدل البكالوريا بضرب علامة كل مادة في معاملها، ثم قسمة مجموع النقاط على مجموع المعاملات. الصيغة: المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات.",
  },
  {
    q: "هل الحاسبة تعتمد المعاملات الجديدة بعد تعديلات الوزارة؟",
    a: "نعم، حاسبة BacZone محدثة وفق آخر التعديلات الصادرة عن وزارة التربية الوطنية لمعاملات بكالوريا 2027 لجميع الشعب.",
  },
  {
    q: "هل يمكن حساب المعدل لجميع الشعب؟",
    a: "نعم، تتوفر حاسبة منفصلة لكل شعبة: علوم تجريبية، رياضيات، تقني رياضي (الهندسة)، تسيير واقتصاد، آداب وفلسفة، لغات أجنبية، وفنون.",
  },
  {
    q: "هل النتيجة التي تظهرها الحاسبة رسمية؟",
    a: "الحاسبة أداة تقدير دقيقة وفق المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر فقط عن الديوان الوطني للامتحانات والمسابقات.",
  },
];

export default function CalculateHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication", name: TITLE, description: DESC, url: absUrl("/calculate"),
        applicationCategory: "EducationalApplication", operatingSystem: "All", inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
      },
    ],
  };

  return (
    <EditablePage pageKey="calculate">
      <>
        <PublicHeader />
        <main className="bz-guide bz-calc-directory min-h-screen">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <header className="bz-calc-directory-hero">
            <div className="bz-calc-directory-hero-grid mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
              <div className="bz-calc-directory-copy">
                <span className="bz-calc-directory-kicker"><FontAwesomeIcon icon={faCalculator} /> مساحة الحساب</span>
                <h1 className="mt-4 font-display text-[32px] font-extrabold leading-[1.18] tracking-tight sm:text-5xl lg:text-6xl">
                  احسب معدّلك قبل أن تختار خطوتك التالية
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-[1.95] text-white/72 sm:text-lg">
                  اختر شعبتك، أدخل علاماتك مادةً مادة، ثم افهم أثر المعاملات على نتيجتك. كل حاسبة مستقلة بموادها، وتعمل مباشرة من الهاتف والحاسوب بلا تسجيل.
                </p>
                <div className="mt-7 flex flex-wrap gap-2.5" aria-label="خصائص الحاسبة">
                  <span><b>7</b> شعب</span><span><b>0–20</b> نطاق العلامات</span><span><b>بلا تسجيل</b> وبدون حفظ</span>
                </div>
              </div>
              <div className="bz-calc-directory-orbit" aria-hidden="true">
                <div className="bz-calc-directory-orbit-ring ring-one" />
                <div className="bz-calc-directory-orbit-ring ring-two" />
                <div className="bz-calc-directory-orbit-core"><FontAwesomeIcon icon={faCalculator} /></div>
                <span className="orbit-chip chip-top"><FontAwesomeIcon icon={faLayerGroup} /> اختر الشعبة</span>
                <span className="orbit-chip chip-side"><FontAwesomeIcon icon={faCircleCheck} /> افهم النتيجة</span>
              </div>
            </div>
            <div className="bz-calc-directory-wave" />
          </header>

          <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div className="bz-calc-directory-path" aria-label="طريقة البدء">
              <span className="is-active"><b>01</b><strong>اختر شعبتك</strong><small>مواد ومعاملات واضحة</small></span>
              <i /><span><b>02</b><strong>أدخل علاماتك</strong><small>كل مادة في مكانها</small></span>
              <i /><span><b>03</b><strong>افهم نتيجتك</strong><small>خطوة عملية بعدها</small></span>
            </div>

            <section className="bz-calc-directory-picker" aria-labelledby="branches-title">
              <div className="bz-calc-directory-section-head">
                <div><span className="bz-calc-directory-eyebrow">ابدأ من شعبتك</span><h2 id="branches-title">حاسبتك جاهزة في خطوة واحدة</h2><p>لا توجد قائمة طويلة أو إعدادات مخفية. اختر البطاقة التي تحمل شعبتك وانتقل مباشرة إلى موادك.</p></div>
                <div className="bz-calc-directory-total"><b>{BRANCHES.length}</b><span>حاسبات مستقلة</span></div>
              </div>
              <div className="bz-branch-product-grid">
                {BRANCHES.map((branch, index) => (
                  <Link key={branch.slug} href={`/calculate/${branch.slug}`} className="bz-branch-product-card" style={{ "--branch-color": branch.color } as CSSProperties}>
                    <span className="bz-branch-product-glow" />
                    <span className="bz-branch-product-number">0{index + 1}</span>
                    <span className="bz-branch-product-icon"><FontAwesomeIcon icon={faCalculator} /></span>
                    <span className="bz-branch-product-body"><b>{branch.short}</b><small>{branch.subjects.length} مواد · {totalCoef(branch)} معاملات إجبارية</small><em>ابدأ الحساب <FontAwesomeIcon icon={faArrowLeft} /></em></span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bz-calc-directory-explain" aria-label="كيف تستعمل الحاسبة">
              <div className="bz-calc-directory-explain-main"><span className="bz-calc-directory-eyebrow">تجربة واضحة</span><h2>من العلامة إلى قرار مفهوم</h2><p>النتيجة ليست رقماً فقط. ستعرف مجموع نقاطك، مجموع المعاملات، والمواد التي تستحق وقتك الأكبر قبل أن ترتّب رغباتك.</p><div className="bz-calc-directory-mini-steps"><div><b>01</b><span>اختر الشعبة التي تدرس فيها.</span></div><div><b>02</b><span>أدخل العلامات بين 0 و20.</span></div><div><b>03</b><span>راجع النتيجة وخطوتك التالية.</span></div></div></div>
              <div className="bz-calc-directory-formula"><span>الصيغة المعتمدة</span><strong>المعدل</strong><b>مجموع (العلامة × المعامل)</b><i>÷ مجموع المعاملات</i></div>
            </section>

            <section className="bz-calc-directory-content" aria-label="معلومات عن حساب معدل البكالوريا">
              <article><span className="bz-calc-directory-content-icon"><FontAwesomeIcon icon={faCalculator} /></span><div><h2>كيف يتم حساب معدل البكالوريا؟</h2><p>يعتمد حساب معدل شهادة البكالوريا في الجزائر على نظام المعاملات. كل مادة لها معامل يعكس وزنها في المعدل النهائي، وكلما ارتفع المعامل زاد تأثير المادة على معدلك.</p><p className="bz-calc-directory-inline-formula">المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات</p><p>لذلك يُنصح بالتركيز أكثر على المواد ذات المعاملات العالية في شعبتك، واستعمال الحاسبة بعد الفروض أو الاختبارات التجريبية لمعرفة موقعك الحقيقي.</p></div></article>
              <article><span className="bz-calc-directory-content-icon"><FontAwesomeIcon icon={faBookOpen} /></span><div><h2>حاسبة محدثة لجميع الشعب</h2><p>تتضمن BacZone حاسبة منفصلة لكل شعبة بموادها ومعاملاتها. يمكنك الانتقال بين الصفحات من البطاقة أعلاه، أو فتح إحدى الشعب مباشرةً:</p><div className="bz-calc-directory-links">{BRANCHES.map((branch) => <Link key={branch.slug} href={`/calculate/${branch.slug}`}>{branch.short}<FontAwesomeIcon icon={faArrowLeft} /></Link>)}</div></div></article>
              <article><span className="bz-calc-directory-content-icon"><FontAwesomeIcon icon={faCircleCheck} /></span><div><h2>ما الذي تحصل عليه؟</h2><ul><li>نتيجة فورية وفق المعاملات المعتمدة.</li><li>تجربة مناسبة للهاتف والحاسوب.</li><li>لا حاجة إلى تسجيل أو إدخال بيانات شخصية.</li><li>صفحة مستقلة لكل شعبة وموادها.</li><li>تنبيه واضح بأن النتيجة تقديرية وليست وثيقة رسمية.</li></ul></div></article>
            </section>

            <section className="bz-calc-directory-faq" aria-labelledby="calc-faq-title">
              <div><span className="bz-calc-directory-eyebrow">قبل أن تبدأ</span><h2 id="calc-faq-title">أسئلة شائعة حول الحساب</h2><p>إجابات مختصرة تساعدك على قراءة النتيجة بشكل صحيح.</p></div>
              <div className="space-y-2.5">{FAQ.map((item) => <details key={item.q}><summary>{item.q}<span>＋</span></summary><p>{item.a}</p></details>)}</div>
            </section>

            <p className="bz-calc-directory-note"><b>تنبيه:</b> هذه أداة تقدير وفق المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر عن الديوان الوطني للامتحانات والمسابقات.</p>
          </div>
        </main>
        <PublicCta title="معدّلك يبدأ من مراجعتك" hint="انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، وملخّصات لكل الشُّعب — مجّاناً." />
      </>
    </EditablePage>
  );
}
