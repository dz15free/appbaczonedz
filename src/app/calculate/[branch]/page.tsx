import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faChartPie,
  faCircleCheck,
  faCircleInfo,
  faCircleQuestion,
  faFlask,
  faGears,
  faLanguage,
  faLightbulb,
  faPalette,
  faShieldHalved,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import { BRANCHES, getBranch, totalCoef } from "@/features/calculator/branches";
import { BRANCH_CONTENT } from "@/features/calculator/content";
import { Calculator } from "@/features/calculator/calculator";
import { absUrl } from "@/features/guide/site-url";

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANCHES.map((branch) => ({ branch: branch.slug }));
}

const branchIcons = {
  sciences: faFlask,
  math: faChartPie,
  engineering: faGears,
  economy: faTableList,
  letters: faBookOpen,
  languages: faLanguage,
  arts: faPalette,
} as const;

export async function generateMetadata(
  { params }: { params: Promise<{ branch: string }> },
): Promise<Metadata> {
  const { branch } = await params;
  const currentBranch = getBranch(branch);
  if (!currentBranch) return { title: "شعبة غير موجودة" };
  const content = BRANCH_CONTENT[currentBranch.slug];
  const title = `حساب معدل البكالوريا شعبة ${currentBranch.short} 2027`;
  const description =
    `احسب معدّلك في شعبة ${currentBranch.short} بالمعاملات المعتمدة بعد تعديلات الوزارة. ` +
    `${currentBranch.subjects.length} مواد، مجموع المعاملات ${totalCoef(currentBranch)} — نتيجة فورية بلا تسجيل.`;
  const url = `/calculate/${currentBranch.slug}`;

  return {
    title,
    description,
    keywords: [...(content?.kw ?? []), "بكالوريا 2027", "معاملات البكالوريا", "BacZone"],
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "ar_DZ", url: absUrl(url), title, description, siteName: "BacZone" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BranchCalculatorPage(
  { params }: { params: Promise<{ branch: string }> },
) {
  const { branch } = await params;
  const currentBranch = getBranch(branch);
  if (!currentBranch) { notFound(); return null; }
  const content = BRANCH_CONTENT[currentBranch.slug];
  const currentIcon = branchIcons[currentBranch.slug as keyof typeof branchIcons] ?? faCalculator;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `حساب معدل البكالوريا شعبة ${currentBranch.short}`,
        description: `حاسبة معدل البكالوريا 2027 لشعبة ${currentBranch.short} وفق المعاملات المعتمدة.`,
        url: absUrl(`/calculate/${currentBranch.slug}`),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: (content?.faq ?? []).map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "حساب المعدل", item: absUrl("/calculate") },
          { "@type": "ListItem", position: 2, name: currentBranch.short, item: absUrl(`/calculate/${currentBranch.slug}`) },
        ],
      },
    ],
  };

  const otherBranches = BRANCHES.filter((item) => item.slug !== currentBranch.slug);

  return (
    <EditablePage pageKey={`calculate-${currentBranch.slug}`}>
      <>
        <PublicHeader />
        <main className="bz-guide bz-branch-page min-h-screen">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <header className="bz-branch-hero" style={{ "--branch-color": currentBranch.color } as React.CSSProperties}>
            <div className="bz-branch-hero-pattern" />
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 lg:py-14">
              <nav className="bz-breadcrumb" aria-label="مسار التنقل">
                <Link href="/home">BacZone</Link><span>/</span><Link href="/calculate">حساب المعدل</Link><span>/</span><b>{currentBranch.short}</b>
              </nav>
              <div className="bz-branch-hero-layout">
                <div className="relative z-10">
                  <span className="bz-guide-kicker"><FontAwesomeIcon icon={currentIcon} aria-hidden="true" /> حاسبة شعبة {currentBranch.short}</span>
                  <h1 className="mt-4 font-display text-[29px] font-extrabold leading-[1.25] tracking-[-.03em] sm:text-[42px]">حساب معدل البكالوريا — شعبة {currentBranch.short}</h1>
                  <p className="mt-3 max-w-2xl text-[14px] leading-[1.95] text-white/80 sm:text-[16px]">أدخل علاماتك في {currentBranch.subjects.length} مواد واحصل على معدلك الفوري وفق المعاملات المعتمدة لبكالوريا 2027.</p>
                </div>
                <div className="bz-branch-hero-statbox">
                  <span className="bz-branch-hero-stat-icon"><FontAwesomeIcon icon={currentIcon} aria-hidden="true" /></span>
                  <div><b>{totalCoef(currentBranch)}</b><span>مجموع المعاملات</span></div>
                  <div><b>{currentBranch.subjects.length}</b><span>مواد محسوبة</span></div>
                  <div><b>20</b><span>أعلى علامة</span></div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-4 sm:pt-8">
            <div className="bz-branch-layout">
              <div className="bz-branch-main">
                <div className="bz-branch-calc-intro">
                  <div><span className="bz-section-kicker">الخطوة الأولى</span><h2>أدخل علاماتك واحسب نتيجتك</h2><p>ابدأ بالمواد الإجبارية. يمكنك ترك الأمازيغية فارغة لأنها تُحتسب كبونص فقط.</p></div>
                  <div className="bz-branch-calc-badge"><FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" /> مجاني</div>
                </div>
                <Calculator branch={currentBranch} />

                {content && (
                  <article className="bz-branch-article mt-8">
                    <section className="bz-spec-sec">
                      <h2><FontAwesomeIcon icon={faBookOpen} aria-hidden="true" /> عن شعبة {currentBranch.short}</h2>
                      <RichP text={content.intro} />
                    </section>

                    <section className="bz-spec-sec">
                      <h2><FontAwesomeIcon icon={faChartPie} aria-hidden="true" /> أين يقع ثقل معدّلك؟</h2>
                      <RichP text={content.weight} />
                    </section>

                    <section className="bz-spec-sec is-pro">
                      <h2><FontAwesomeIcon icon={faLightbulb} aria-hidden="true" /> نصيحة عملية</h2>
                      <RichP text={content.tip} />
                    </section>

                    <section className="bz-spec-sec" id="coefficients">
                      <h2><FontAwesomeIcon icon={faTableList} aria-hidden="true" /> جدول معاملات شعبة {currentBranch.short}</h2>
                      <div className="bz-coeff-table-wrap">
                        <table className="bz-coeff-table">
                          <thead><tr><th>المادة</th><th>المعامل</th></tr></thead>
                          <tbody>
                            {currentBranch.subjects.map((subject) => (
                              <tr key={subject.name}>
                                <td>{subject.name}{subject.optional && <span className="bz-coeff-optional">اختيارية</span>}</td>
                                <td style={{ color: currentBranch.color }}>×{subject.coef}</td>
                              </tr>
                            ))}
                            <tr className="bz-coeff-total"><td>مجموع المعاملات الإجبارية</td><td>{totalCoef(currentBranch)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="bz-spec-note"><FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />المادّة الاختيارية (الأمازيغية) تُحتسب بونصاً: تُؤخذ النقاط فوق 10 فقط وتُضرب في معاملها وتُضاف إلى المجموع، <b>دون</b> إضافة معاملها إلى القاسم. فإن كانت علامتك تحت 10 فلن تنقص معدّلك.</p>
                    </section>

                    {content.faq.length > 0 && (
                      <section className="bz-spec-sec" id="faq">
                        <h2><FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" /> أسئلة شائعة حول شعبة {currentBranch.short}</h2>
                        <div className="bz-branch-faq-list">
                          {content.faq.map((item, index) => <details key={index}><summary>{item.q}<span>+</span></summary><p>{item.a}</p></details>)}
                        </div>
                      </section>
                    )}
                  </article>
                )}
              </div>

              <aside className="bz-branch-aside">
                <div className="bz-branch-aside-card">
                  <div className="bz-branch-aside-icon" style={{ background: `${currentBranch.color}15`, color: currentBranch.color }}><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /></div>
                  <h2>حاسبة موثوقة</h2>
                  <p>المعادلة واضحة، والمواد مرتبة حسب معاملات شعبة {currentBranch.short}.</p>
                  <a href="#coefficients">عرض جدول المعاملات <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></a>
                </div>
                <div className="bz-branch-aside-card bz-branch-aside-card-tip">
                  <div className="bz-branch-aside-icon"><FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" /></div>
                  <h2>تذكّر</h2>
                  <p>النتيجة المعروضة تقديرية لمساعدتك على التخطيط، أما النتيجة الرسمية فتصدر عن الديوان الوطني للامتحانات والمسابقات.</p>
                </div>
              </aside>
            </div>

            <aside className="bz-related-branches">
              <div><span className="bz-section-kicker">اكتشف أكثر</span><h2>حاسبات الشعب الأخرى</h2></div>
              <div className="bz-related-grid">{otherBranches.map((item) => <Link key={item.slug} href={`/calculate/${item.slug}`}><span>{item.short}</span><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></Link>)}</div>
            </aside>
          </div>
        </main>
        <PublicCta />
      </>
    </EditablePage>
  );
}

function RichP({ text }: { text: string }) {
  const parts = text.split("**");
  return <p className="bz-spec-p">{parts.map((part, index) => index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>)}</p>;
}
