import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faCalculator, faCircleCheck, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import { BRANCHES, totalCoef } from "@/features/calculator/branches";
import { absUrl } from "@/features/guide/site-url";
import { BAC_YEAR, CALC_UPDATED, COEF_LAW, MENTIONS, avg, coefMatrix, exampleFor, num } from "@/features/calculator/seo";
import { OG_CALC } from "@/lib/seo";

/* 🐛 كان العنوان يقول «2026» بعد انتهاء دورتها (صفحات الشعب «2027»)،
   وطوله 87 حرفاً فيُقطَع في نتيجة البحث قبل اسم المنصّة. السنة الآن من
   مصدر واحد، والعنوان يبدأ بعبارة البحث نفسها ويبقى تحت ~60 حرفاً. */
const TITLE = `حساب معدل البكالوريا ${BAC_YEAR} لجميع الشعب — حاسبة معدل الباك`;
const DESC =
  `احسب معدل البكالوريا ${BAC_YEAR} مجاناً لكل الشعب بالمعاملات الرسمية السارية: علوم تجريبية، رياضيات، تقني رياضي، تسيير واقتصاد، آداب ولغات. مع جدول المعاملات وطريقة الحساب.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "حساب معدل البكالوريا", "حساب معدل الباك", `حساب معدل البكالوريا ${BAC_YEAR}`, "حاسبة معدل الباك",
    "حساب معدل الباكلوريا", "حساب معدل البكالوريا شعبة علوم تجريبية", "حساب معدل البكالوريا شعبة رياضيات",
    "حساب معدل البكالوريا شعبة تسيير واقتصاد", "حساب معدل البكالوريا شعبة آداب وفلسفة",
    "حساب معدل البكالوريا شعبة لغات أجنبية", "حساب معدل البكالوريا تقني رياضي",
    `معاملات البكالوريا ${BAC_YEAR}`, "جدول معاملات البكالوريا", "حساب معدل البكالوريا بعد تعديلات الوزارة",
    `بكالوريا ${BAC_YEAR}`, "BacZone",
  ],
  alternates: { canonical: "/calculate" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/calculate"), title: TITLE, description: DESC, siteName: "BacZone", images: OG_CALC },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const LAW_TEXT =
  `القرار رقم ${COEF_LAW.cancelled.no} المؤرّخ في ${COEF_LAW.cancelled.date} عدّل مواقيت ومعاملات مواد التعليم الثانوي، ثمّ ألغته وزارة التربية الوطنية بالقرار رقم ${COEF_LAW.cancelling.no} المؤرّخ في ${COEF_LAW.cancelling.date}. ` +
  `فالمعاملات السارية في بكالوريا ${BAC_YEAR} هي معاملات القرار رقم ${COEF_LAW.inForce.no} المؤرّخ في ${COEF_LAW.inForce.date}، وهي المعتمدة في هذه الحاسبة.`;

const FAQ = [
  {
    q: "كيف يتم حساب معدل البكالوريا؟",
    a: "يُحسب معدل البكالوريا بضرب علامة كل مادة في معاملها، ثم قسمة مجموع النقاط على مجموع المعاملات. الصيغة: المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات.",
  },
  {
    q: `هل تغيّرت معاملات البكالوريا ${BAC_YEAR}؟`,
    a: `لا. ${LAW_TEXT}`,
  },
  {
    q: "هل يمكن حساب المعدل لجميع الشعب؟",
    a: "نعم، تتوفر حاسبة منفصلة لكل شعبة: علوم تجريبية، رياضيات، تقني رياضي، تسيير واقتصاد، آداب وفلسفة، ولغات أجنبية.",
  },
  {
    q: "ما هو معدل النجاح في البكالوريا؟",
    a: "ينجح المترشّح بمعدل 10 من 20 فما فوق. وابتداءً من 12 تُمنح التقديرات: قريب من الجيّد (12)، جيّد (14)، جيّد جدّاً (16)، ممتاز (18).",
  },
  {
    q: "كيف تُحسب اللغة الأمازيغية في المعدل؟",
    a: "الأمازيغية مادّة اختيارية تُحسب كإضافة: تؤخذ النقاط فوق 10 فقط وتُضرب في معاملها وتُضاف إلى مجموع النقاط، دون إضافة معاملها إلى مجموع المعاملات. فإن كانت العلامة تحت 10 فلا تنقص المعدل.",
  },
  {
    q: "ما الفرق بين معدل البكالوريا والمعدل الموزون؟",
    a: "معدل البكالوريا هو معدّلك العام في كل المواد. أمّا المعدل الموزون فيُستعمل في التوجيه الجامعي ويمنح وزناً إضافياً لمادّة التخصّص المطلوبة في الميدان، ويمكن حسابه بأداة المعدل الموزون في BacZone.",
  },
  {
    q: "هل النتيجة التي تظهرها الحاسبة رسمية؟",
    a: "الحاسبة أداة تقدير دقيقة وفق المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر فقط عن الديوان الوطني للامتحانات والمسابقات.",
  },
];

export default function CalculateHub() {
  const matrix = coefMatrix(BRANCHES);
  /* مثال محسوب على أكثر الشعب عدداً — يمرّ من دالّة الحاسبة نفسها */
  const sample = BRANCHES[0];
  const ex = exampleFor(sample);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication", name: `حساب معدل البكالوريا ${BAC_YEAR}`, description: DESC, url: absUrl("/calculate"),
        applicationCategory: "EducationalApplication", operatingSystem: "All", inLanguage: "ar",
        isAccessibleForFree: true, dateModified: CALC_UPDATED,
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BacZone", item: absUrl("/") },
          { "@type": "ListItem", position: 2, name: "حساب معدل البكالوريا", item: absUrl("/calculate") },
        ],
      },
      /* قائمة الحاسبات: تعرّف محرّك البحث بصفحات الشعب كمجموعة واحدة */
      {
        "@type": "ItemList",
        name: `حاسبات معدل البكالوريا ${BAC_YEAR} حسب الشعبة`,
        itemListElement: BRANCHES.map((b, i) => ({
          "@type": "ListItem", position: i + 1,
          name: `حساب معدل البكالوريا شعبة ${b.short}`, url: absUrl(`/calculate/${b.slug}`),
        })),
      },
    ],
  };

  return (
    <EditablePage pageKey="calculate">
      <>
        <PublicHeader />
        <main className="bz-guide bz-calc-directory min-h-screen bz-v9-tools">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <header className="bz-calc-directory-hero bz-v9-tool-hero">
            <div className="bz-calc-directory-hero-grid mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
              <div className="bz-calc-directory-copy">
                <span className="bz-calc-directory-kicker"><FontAwesomeIcon icon={faCalculator} /> مساحة الحساب</span>
                {/* العنوان الرئيسي = عبارة البحث. الجملة التسويقية القديمة انتقلت
                    إلى الفقرة تحته، فلم يُحذف شيء ممّا يقرؤه الزائر. */}
                <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.22] tracking-tight sm:text-5xl lg:text-[54px]">
                  حساب معدل البكالوريا {BAC_YEAR} لجميع الشعب
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-[1.95] text-white/72 sm:text-lg">
                  احسب معدّلك قبل أن تختار خطوتك التالية: اختر شعبتك، أدخل علاماتك مادةً مادة، ثم افهم أثر المعاملات على نتيجتك. كل حاسبة مستقلة بموادها، وتعمل مباشرة من الهاتف والحاسوب بلا تسجيل.
                </p>
                <div className="mt-7 flex flex-wrap gap-2.5" aria-label="خصائص الحاسبة">
                  <span><b>{BRANCHES.length}</b> شعب</span><span><b>0–20</b> نطاق العلامات</span><span><b>بلا تسجيل</b> وبدون حفظ</span>
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
                  <Link key={branch.slug} href={`/calculate/${branch.slug}`} title={`حساب معدل البكالوريا شعبة ${branch.short}`} className="bz-branch-product-card" style={{ "--branch-color": branch.color } as CSSProperties}>
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

            {/* جدول كلّ الشعب: ما يبحث عنه التلميذ باسم «معاملات البكالوريا» —
                يُولَّد من جداول الحاسبة نفسها، فلا رقم يُكتب مرّتين. */}
            <section className="bz-spec-sec mt-4" id="coefficients" aria-labelledby="coef-title">
              <h2 id="coef-title">جدول معاملات البكالوريا {BAC_YEAR} لجميع الشعب</h2>
              <p className="bz-spec-p">معامل كل مادّة في كل شعبة، ومجموع المعاملات الإجبارية الذي يُقسم عليه مجموع النقاط. اضغط اسم الشعبة لفتح حاسبتها.</p>
              <div className="bz-calc-table-wrap">
                <table className="bz-calc-table is-matrix">
                  <thead>
                    <tr>
                      <th scope="col">المادّة</th>
                      {BRANCHES.map((b) => <th key={b.slug} scope="col"><Link href={`/calculate/${b.slug}`}>{b.short}</Link></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row) => (
                      <tr key={row.name}>
                        <th scope="row">{row.name}{row.optional && <small> (اختيارية)</small>}</th>
                        {row.coefs.map((coef, i) => <td key={BRANCHES[i].slug}>{coef ?? "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">مجموع المعاملات الإجبارية</th>
                      {matrix.totals.map((t, i) => <td key={BRANCHES[i].slug}>{t}</td>)}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="bz-spec-note">اللغة الأمازيغية اختيارية: تُحتسب النقاط فوق 10 فقط مضروبةً في معاملها، ولا يدخل معاملها في المجموع.</p>
            </section>

            <section className="bz-spec-sec" id="law" aria-labelledby="law-title">
              <h2 id="law-title">هل تغيّرت معاملات البكالوريا {BAC_YEAR}؟</h2>
              <p className="bz-spec-p"><b>لا — المعاملات السابقة باقية.</b> {LAW_TEXT}</p>
              <p className="bz-spec-p">فإن قرأت جدولاً يحذف مادّة أو يغيّر معاملها في بكالوريا {BAC_YEAR}، فالأرجح أنّه نُشر بين القرارين. الجدول أعلاه يعرض المعاملات السارية.</p>
            </section>

            <section className="bz-spec-sec" id="example" aria-labelledby="example-title">
              <h2 id="example-title">مثال: حساب معدل البكالوريا خطوة بخطوة</h2>
              <p className="bz-spec-p">لنأخذ تلميذاً في شعبة {sample.short} بعلامات افتراضية (للتوضيح فقط). نضرب كل علامة في معاملها ثمّ نجمع:</p>
              <div className="bz-calc-table-wrap">
                <table className="bz-calc-table">
                  <thead><tr><th scope="col">المادّة</th><th scope="col">العلامة</th><th scope="col">المعامل</th><th scope="col">النقاط</th></tr></thead>
                  <tbody>
                    {ex.rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th><td>{num(r.grade)}</td><td>× {r.coef}</td><td>{num(r.points)}</td></tr>)}
                  </tbody>
                  <tfoot><tr><th scope="row">المجموع</th><td>—</td><td>{ex.result.totalCoef}</td><td>{num(ex.result.totalPoints)}</td></tr></tfoot>
                </table>
              </div>
              <p className="bz-spec-p">المعدّل = {num(ex.result.totalPoints)} ÷ {ex.result.totalCoef} = <b>{avg(ex.result.average)} من 20</b> — تقدير «{ex.result.mention}». <Link href={`/calculate/${sample.slug}`} className="font-bold text-[var(--bz-blue)] hover:underline">جرّب بعلاماتك في حاسبة {sample.short}</Link>.</p>
            </section>

            <section className="bz-spec-sec" id="mentions" aria-labelledby="mentions-title">
              <h2 id="mentions-title">التقديرات: ماذا يعني معدّلك؟</h2>
              <p className="bz-spec-p">النجاح في البكالوريا يبدأ من معدّل <b>10 من 20</b>. وهذه التقديرات المقابلة لكل مجال:</p>
              <div className="bz-calc-table-wrap">
                <table className="bz-calc-table">
                  <thead><tr><th scope="col">المعدّل</th><th scope="col">التقدير</th></tr></thead>
                  <tbody>{MENTIONS.map((m) => <tr key={m.label}><th scope="row">{m.from}</th><td>{m.label}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="bz-spec-p">ومعدّل البكالوريا ليس كل شيء في التوجيه: كثير من التخصّصات ترتّب المترشّحين بـ<Link href="/tools/weighted-average" className="font-bold text-[var(--bz-blue)] hover:underline">المعدل الموزون</Link>، فاحسبه قبل ترتيب رغباتك وراجع <Link href="/specialties" className="font-bold text-[var(--bz-blue)] hover:underline">دليل التخصّصات الجامعية</Link>.</p>
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
