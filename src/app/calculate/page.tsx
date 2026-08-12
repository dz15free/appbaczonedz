import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faChartPie,
  faCheck,
  faCircleInfo,
  faCircleQuestion,
  faFlask,
  faGears,
  faGraduationCap,
  faLanguage,
  faLightbulb,
  faListCheck,
  faPalette,
  faShieldHalved,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
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
    "حساب معدل البكالوريا",
    "حساب معدل الباك",
    "حساب معدل البكالوريا 2027",
    "حاسبة معدل الباك",
    "حساب معدل الباكلوريا",
    "حساب معدل البكالوريا شعبة علوم تجريبية",
    "حساب معدل البكالوريا شعبة رياضيات",
    "حساب معدل البكالوريا شعبة تسيير واقتصاد",
    "حساب معدل البكالوريا شعبة آداب وفلسفة",
    "حساب معدل البكالوريا شعبة لغات أجنبية",
    "حساب معدل البكالوريا تقني رياضي",
    "حساب معدل البكالوريا شعبة فنون",
    "حاسبة معدل البكالوريا بعد تعديلات الوزارة",
    "معاملات البكالوريا 2027",
    "حساب معدل البكالوريا بعد تغييرات الوزارة",
    "بكالوريا 2027",
    "BacZone",
  ],
  alternates: { canonical: "/calculate" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: absUrl("/calculate"),
    title: TITLE,
    description: DESC,
    siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const branchIcons = {
  sciences: faFlask,
  math: faChartPie,
  engineering: faGears,
  economy: faTableList,
  letters: faBookOpen,
  languages: faLanguage,
  arts: faPalette,
} as const;

const branchLabels: Record<string, string> = {
  sciences: "المسار العلمي",
  math: "المسار الرياضي",
  engineering: "المسار التقني",
  economy: "المسار الاقتصادي",
  letters: "المسار الأدبي",
  languages: "المسار اللغوي",
  arts: "المسار الفني",
};

const faqItems = [
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
        "@type": "WebApplication",
        name: TITLE,
        description: DESC,
        url: absUrl("/calculate"),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <EditablePage pageKey="calculate">
      <>
        <PublicHeader />
        <main className="bz-guide bz-calc-hub min-h-screen">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <header className="bz-calc-hub-hero">
            <div className="bz-calc-hero-orb bz-calc-hero-orb-one" />
            <div className="bz-calc-hero-orb bz-calc-hero-orb-two" />
            <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.12fr_.88fr] lg:gap-16 lg:py-20">
              <div className="relative z-10">
                <span className="bz-guide-kicker"><FontAwesomeIcon icon={faCalculator} aria-hidden="true" /> حاسبة BacZone 2027</span>
                <h1 className="mt-4 max-w-3xl font-display text-[31px] font-extrabold leading-[1.25] tracking-[-.035em] sm:text-5xl lg:text-[54px]">
                  احسب معدل البكالوريا <span className="bz-calc-hero-accent">بدقة وثقة</span>
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-[2] text-white/80 sm:text-[17px]">
                  احسب معدّلك فوراً وفق المعاملات المعتمدة بعد تعديلات وزارة التربية. اختر شعبتك، أدخل علاماتك، واحصل على نتيجة واضحة — <b className="text-white">بلا تسجيل وبلا تعقيد</b>.
                </p>
                <div className="bz-calc-trust-row mt-7">
                  <span><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> جميع الشعب</span>
                  <span><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> حساب فوري</span>
                  <span><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> متجاوبة مع الهاتف</span>
                </div>
              </div>

              <div className="bz-calc-hero-card" aria-label="معلومات مختصرة عن الحاسبة">
                <div className="bz-calc-hero-card-top">
                  <span className="bz-calc-hero-card-icon"><FontAwesomeIcon icon={faChartPie} aria-hidden="true" /></span>
                  <span className="bz-calc-hero-card-label">نظرة سريعة</span>
                  <span className="bz-calc-hero-card-dot" />
                </div>
                <div className="bz-calc-hero-score">20<span>/20</span></div>
                <p>علامتك تُحسب بالمعامل، لا بالتخمين.</p>
                <div className="bz-calc-hero-mini-grid">
                  <div><b>7</b><span>شعب متاحة</span></div>
                  <div><b>0 دج</b><span>مجانية بالكامل</span></div>
                  <div><b>2027</b><span>آخر تحديث</span></div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-3 pb-16 sm:px-4">
            <div className="bz-calc-hub-intro">
              <Link href="/home" className="bz-calc-back-link"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> العودة إلى BacZone</Link>
              <div className="bz-calc-section-heading">
                <div>
                  <span className="bz-section-kicker">ابدأ من هنا</span>
                  <h2>اختر شعبتك لحساب المعدل</h2>
                  <p>كل شعبة لها حاسبة مستقلة بموادها ومعاملاتها الرسمية. اضغط على شعبتك للبدء مباشرة.</p>
                </div>
                <div className="bz-calc-heading-stat"><b>{BRANCHES.length}</b><span>شعب بكالوريا</span></div>
              </div>
            </div>

            <div className="bz-branch-grid">
              {BRANCHES.map((branch, index) => (
                <Link key={branch.slug} href={`/calculate/${branch.slug}`} className="bz-branch-card" style={{ "--branch-color": branch.color } as React.CSSProperties}>
                  <span className="bz-branch-card-glow" />
                  <span className="bz-branch-card-topline"><small>{String(index + 1).padStart(2, "0")}</small><FontAwesomeIcon icon={branchIcons[branch.slug as keyof typeof branchIcons] ?? faCalculator} aria-hidden="true" /></span>
                  <span className="bz-branch-card-icon" style={{ background: `${branch.color}15`, color: branch.color }}><FontAwesomeIcon icon={branchIcons[branch.slug as keyof typeof branchIcons] ?? faCalculator} aria-hidden="true" /></span>
                  <span className="bz-branch-name">{branch.short}</span>
                  <span className="bz-branch-label">{branchLabels[branch.slug]}</span>
                  <span className="bz-branch-meta"><span>{branch.subjects.length} مواد</span><i /> <span>المعاملات {totalCoef(branch)}</span></span>
                  <span className="bz-branch-go">ابدأ الحساب <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>

            <div className="bz-calc-benefits">
              <div><span className="bz-benefit-icon"><FontAwesomeIcon icon={faListCheck} aria-hidden="true" /></span><span><b>إدخال منظم</b><small>كل مادة ومعاملها في مكان واضح</small></span></div>
              <div><span className="bz-benefit-icon"><FontAwesomeIcon icon={faChartPie} aria-hidden="true" /></span><span><b>نتيجة مفهومة</b><small>معدل، تقدير، مجموع، وبونص</small></span></div>
              <div><span className="bz-benefit-icon"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /></span><span><b>خصوصيتك محفوظة</b><small>لا تسجيل ولا بيانات شخصية</small></span></div>
            </div>

            <section className="bz-calc-content-grid mt-12" aria-label="معلومات عن حساب معدل البكالوريا">
              <div className="bz-calc-content-main">
                <section className="bz-content-card bz-content-card-featured">
                  <div className="bz-content-card-heading"><span className="bz-content-icon"><FontAwesomeIcon icon={faCalculator} aria-hidden="true" /></span><h2>كيف يتم حساب معدل البكالوريا؟</h2></div>
                  <p>يعتمد حساب معدل شهادة البكالوريا في الجزائر على نظام المعاملات. كل مادة لها معامل يعكس وزنها في المعدل النهائي. الصيغة الرسمية هي:</p>
                  <p className="bz-calc-formula-large">المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات</p>
                  <p>كلما ارتفع معامل المادة زاد تأثيرها على معدلك. لذلك يُنصح بالتركيز أكثر على المواد ذات المعاملات العالية في شعبتك.</p>
                </section>

                <section className="bz-content-card">
                  <div className="bz-content-card-heading"><span className="bz-content-icon"><FontAwesomeIcon icon={faGraduationCap} aria-hidden="true" /></span><h2>حاسبة معدل البكالوريا بعد تعديلات الوزارة 2027</h2></div>
                  <p>شهدت بكالوريا السنوات الأخيرة تعديلات في بعض المواد والمعاملات. حاسبة BacZone محدثة لتطابق آخر ما صدر عن وزارة التربية الوطنية، وتشمل جميع الشعب المعتمدة:</p>
                  <div className="bz-calc-link-list">
                    {BRANCHES.map((branch) => <Link key={branch.slug} href={`/calculate/${branch.slug}`}><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> حساب معدل البكالوريا شعبة {branch.short}</Link>)}
                  </div>
                </section>

                <section className="bz-content-card">
                  <div className="bz-content-card-heading"><span className="bz-content-icon"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /></span><h2>لماذا تستخدم حاسبة BacZone؟</h2></div>
                  <div className="bz-check-list">
                    <p><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> دقيقة ومبنية على المعاملات الرسمية المعتمدة</p>
                    <p><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> سريعة وتعمل مباشرة من الهاتف والحاسوب</p>
                    <p><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> بدون تسجيل أو إدخال بيانات شخصية</p>
                    <p><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> صفحة مستقلة لكل شعبة لنتائج أوضح وأدق</p>
                    <p><FontAwesomeIcon icon={faCheck} aria-hidden="true" /> محدثة خصيصاً لبكالوريا 2027</p>
                  </div>
                </section>

                <section className="bz-content-card">
                  <div className="bz-content-card-heading"><span className="bz-content-icon"><FontAwesomeIcon icon={faLightbulb} aria-hidden="true" /></span><h2>نصائح للحصول على معدل أفضل</h2></div>
                  <p>ركّز على المواد ذات المعاملات المرتفعة لأنها تؤثر أكثر على المعدل النهائي. استخدم الحاسبة بعد كل فرض أو اختبار تجريبي لمعرفة موقعك الحقيقي، وحدد المواد التي تحتاج جهداً إضافياً قبل الامتحان الرسمي. التخطيط المبكر والمتابعة المستمرة هما مفتاح التفوق.</p>
                </section>
              </div>

              <aside className="bz-calc-aside">
                <div className="bz-calc-aside-card">
                  <div className="bz-calc-aside-icon"><FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" /></div>
                  <h2>قبل أن تبدأ</h2>
                  <p>حضّر علاماتك من 0 إلى 20. المواد الإجبارية مطلوبة، أما الأمازيغية فتُحتسب بونصاً ويمكن تركها فارغة.</p>
                </div>
                <div className="bz-calc-aside-card bz-calc-aside-card-accent">
                  <div className="bz-calc-aside-icon"><FontAwesomeIcon icon={faBookOpen} aria-hidden="true" /></div>
                  <h2>قاعدة بسيطة</h2>
                  <p>تحسين علامة واحدة في مادة معاملها 6 أهم من تحسينها في مادة معاملها 1.</p>
                </div>
              </aside>
            </section>

            <section className="bz-calc-faq mt-12" aria-labelledby="calculator-faq-title">
              <div className="bz-calc-faq-heading"><span className="bz-section-kicker">أسئلة وأجوبة</span><h2 id="calculator-faq-title">أسئلة شائعة حول حساب معدل البكالوريا</h2><p>إجابات مختصرة تساعدك على فهم طريقة الحساب قبل إدخال علاماتك.</p></div>
              <div className="bz-calc-faq-list">
                {faqItems.map((item) => (
                  <details key={item.q} className="bz-calc-faq-item">
                    <summary><span><FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />{item.q}</span><span className="bz-faq-plus">+</span></summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>

            <p className="bz-calc-disclaimer"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /><span><b>تنبيه:</b> هذه أداة تقدير وفق المعاملات المعتمدة. النتيجة الرسمية تصدر عن الديوان الوطني للامتحانات والمسابقات.</span></p>
          </div>
        </main>
        <PublicCta title="معدّلك يبدأ من مراجعتك" hint="انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، وملخّصات لكل الشُّعب — مجّاناً." />
      </>
    </EditablePage>
  );
}
