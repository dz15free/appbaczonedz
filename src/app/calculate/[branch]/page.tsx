import type { Metadata } from "next";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { EditablePage } from "@/features/admin/editable-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCHES, getBranch, totalCoef } from "@/features/calculator/branches";
import { BRANCH_CONTENT } from "@/features/calculator/content";
import { Calculator } from "@/features/calculator/calculator";
import { absUrl } from "@/features/guide/site-url";
import { BAC_YEAR, CALC_UPDATED, COEF_LAW, avg, exampleFor, num, topSubjects } from "@/features/calculator/seo";
import { OG_CALC } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════
   صفحة حساب المعدّل لشعبة واحدة

   **صفحة ساكنة لكل شعبة**: تُبنى وقت النشر، فتصل إلى التلميذ على 3G
   بلا استعلام قاعدة بيانات، وتُفهرَس بعنوانها الدقيق.

   الرابط `/calculate/sciences` — قصير وثابت. تغييره بعد النشر يُلغي
   ترتيب الصفحة ويكسر كل رابط شاركه تلميذ.
════════════════════════════════════════════════════════════ */

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ branch: b.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ branch: string }> },
): Promise<Metadata> {
  const { branch } = await params;
  const b = getBranch(branch);
  if (!b) return { title: "شعبة غير موجودة" };
  const c = BRANCH_CONTENT[b.slug];

  /* العنوان يبدأ بما يكتبه التلميذ حرفياً في البحث */
  const title = `حساب معدل البكالوريا شعبة ${b.short} ${BAC_YEAR}`;
  /* الوصف يجيب عمّا يبحث عنه التلميذ فعلاً: هل المعاملات صحيحة؟ هل هي
     مجّانية؟ وهو أقصر من 160 حرفاً فلا يُقطَع في نتيجة البحث. */
  const description =
    `احسب معدل البكالوريا ${BAC_YEAR} لشعبة ${b.short} فوراً بالمعاملات الرسمية السارية (مجموعها ${totalCoef(b)}). ` +
    `مع جدول المعاملات ومثال محسوب — مجاناً وبلا تسجيل.`;
  const url = `/calculate/${b.slug}`;

  return {
    title,
    description,
    keywords: [...(c?.kw ?? []), `معاملات شعبة ${b.short}`, `بكالوريا ${BAC_YEAR}`, "معاملات البكالوريا", "BacZone"],
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "ar_DZ", url: absUrl(url),
      title, description, siteName: "BacZone", images: OG_CALC,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BranchCalculatorPage(
  { params }: { params: Promise<{ branch: string }> },
) {
  const { branch } = await params;
  const b = getBranch(branch);
  if (!b) { notFound(); return null; }
  const c = BRANCH_CONTENT[b.slug];

  /* بيانات منظّمة: تطبيق + أسئلة شائعة + فتات طريق.
     الأخيرة تجعل Google يعرض مسار الصفحة بدل الرابط الخامّ. */
  const total = totalCoef(b);
  const mandatory = b.subjects.filter((s) => !s.optional);
  const top = topSubjects(b, 1)[0];
  const ex = exampleFor(b);
  const lawAnswer =
    `نعم. القرار رقم ${COEF_LAW.cancelled.no} المؤرّخ في ${COEF_LAW.cancelled.date} الذي عدّل المعاملات أُلغي بالقرار رقم ${COEF_LAW.cancelling.no} المؤرّخ في ${COEF_LAW.cancelling.date}، ` +
    `فبقيت معاملات القرار رقم ${COEF_LAW.inForce.no} (${COEF_LAW.inForce.date}) سارية — وهي المعتمدة في هذه الحاسبة لشعبة ${b.short}.`;
  /* أسئلة تُولَّد من جدول الشعبة نفسه — أرقامها لا تُكتب يدوياً */
  const faq = [
    ...(c?.faq ?? []),
    {
      q: `كم مجموع معاملات شعبة ${b.short}؟`,
      a: `مجموع المعاملات الإجبارية في شعبة ${b.short} هو ${total}، موزّعة على ${mandatory.length} ${mandatory.length > 10 ? "مادّة" : "مواد"}، وأعلاها ${top.name} بمعامل ${top.coef}. اللغة الأمازيغية اختيارية ولا يدخل معاملها في هذا المجموع.`,
    },
    { q: `هل هذه معاملات بكالوريا ${BAC_YEAR} السارية؟`, a: lawAnswer },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `حساب معدل البكالوريا شعبة ${b.short} ${BAC_YEAR}`,
        description: `حاسبة معدل البكالوريا ${BAC_YEAR} لشعبة ${b.short} بالمعاملات الرسمية السارية.`,
        url: absUrl(`/calculate/${b.slug}`),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        isAccessibleForFree: true,
        dateModified: CALC_UPDATED,
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BacZone", item: absUrl("/") },
          { "@type": "ListItem", position: 2, name: "حساب معدل البكالوريا", item: absUrl("/calculate") },
          { "@type": "ListItem", position: 3, name: `شعبة ${b.short}`, item: absUrl(`/calculate/${b.slug}`) },
        ],
      },
    ],
  };

  const others = BRANCHES.filter((x) => x.slug !== b.slug);

  return (
    <EditablePage pageKey={`calculate-${b.slug}`}>
    <>
      <PublicHeader />
      <main className="bz-guide min-h-screen bz-v9-tools">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-calc-branch-hero bz-v9-tool-hero">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-11">
          <nav aria-label="مسار الصفحة" className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/" className="hover:text-white hover:underline">BacZone</Link>
            <span aria-hidden="true">←</span>
            <Link href="/calculate" className="font-bold text-white hover:underline">حساب معدل البكالوريا</Link>
            <span aria-hidden="true">←</span>
            <span>شعبة {b.short}</span>
          </nav>
          <PublicBackButton fallbackHref="/calculate" fallbackLabel="حاسبة البكالوريا" tone="dark" className="mb-6" />
          <div className="bz-calc-branch-hero-layout">
            <div>
              <span className="bz-calc-branch-kicker">حاسبة شعبة {b.short}</span>
              {/* العنوان الرئيسي هو ما يكتبه التلميذ في البحث حرفياً — كان
                  جملةً عامّة لا تذكر الشعبة ولا «حساب المعدل»، فلا تعرف
                  محرّكات البحث من أقوى إشارة في الصفحة عمّ تتحدّث. */}
              <h1 className="mt-2 font-display text-[25px] font-extrabold leading-[1.3] sm:text-[36px]">
                حساب معدل البكالوريا شعبة {b.short} {BAC_YEAR}
              </h1>
              <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
                احسب معدّل بكالوريتك بوضوح: أدخل علاماتك مادةً مادة، وراجع أثر المعاملات الرسمية، ثم احصل على نتيجة مفهومة بلا تسجيل أو إدخال بيانات شخصية.
              </p>
            </div>
            <div className="bz-calc-branch-hero-stat">
              <b>{b.subjects.length}</b><span>مواد</span>
              <i />
              <b>{totalCoef(b)}</b><span>معامل</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-3 pb-14 pt-5 sm:px-4">
        <div className="bz-calc-step-rail" aria-label="مراحل حساب المعدل">
          <span className="is-current"><b>1</b><em>اخترت شعبتك</em></span>
          <i />
          <span className="is-current"><b>2</b><em>أدخل العلامات</em></span>
          <i />
          <span><b>3</b><em>افهم نتيجتك</em></span>
        </div>
        <Calculator branch={b} />

        {c && (
          <article className="mt-8">
            <section className="bz-spec-sec">
              <h2>عن شعبة {b.short}</h2>
              <RichP text={c.intro} />
            </section>

            <section className="bz-spec-sec" id="how">
              <h2>كيف يُحسب معدل البكالوريا في شعبة {b.short}؟</h2>
              <p className="bz-spec-p">
                تُضرب علامة كل مادّة في معاملها، تُجمع النقاط، ثمّ يُقسم المجموع على مجموع المعاملات الإجبارية — وهو <b>{total}</b> في شعبة {b.short}:
              </p>
              <p className="bz-calc-inline-formula">المعدّل = مجموع (العلامة × المعامل) ÷ {total}</p>
              <h3 className="mt-5 text-[14.5px] font-extrabold text-[var(--bz-ink)]">مثال محسوب خطوة بخطوة</h3>
              <p className="bz-spec-p">علامات افتراضية للتوضيح فقط — ضع علاماتك أنت في الحاسبة أعلاه:</p>
              <div className="bz-calc-table-wrap">
                <table className="bz-calc-table">
                  <thead>
                    <tr><th scope="col">المادّة</th><th scope="col">العلامة</th><th scope="col">المعامل</th><th scope="col">النقاط</th></tr>
                  </thead>
                  <tbody>
                    {ex.rows.map((r) => (
                      <tr key={r.name}>
                        <th scope="row">{r.name}</th>
                        <td>{num(r.grade)}</td>
                        <td>× {r.coef}</td>
                        <td>{num(r.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row">المجموع</th><td>—</td><td>{ex.result.totalCoef}</td><td>{num(ex.result.totalPoints)}</td></tr>
                  </tfoot>
                </table>
              </div>
              <p className="bz-spec-p">
                المعدّل = {num(ex.result.totalPoints)} ÷ {ex.result.totalCoef} = <b>{avg(ex.result.average)} من 20</b>، وتقديره «{ex.result.mention}».
                {" "}اللغة الأمازيغية تُركت فارغة في المثال لأنّها اختيارية.
              </p>
            </section>

            <section className="bz-spec-sec">
              <h2>أين يقع ثقل معدّلك؟</h2>
              <RichP text={c.weight} />
            </section>

            <section className="bz-spec-sec is-pro">
              <h2>نصيحة عملية</h2>
              <RichP text={c.tip} />
            </section>

            {/* جدول المعاملات — يُقرأ ويُفهرَس */}
            <section className="bz-spec-sec">
              <h2>جدول معاملات شعبة {b.short} — بكالوريا {BAC_YEAR}</h2>
              <div className="overflow-hidden rounded-xl border border-[var(--bz-line)]">
                <table className="w-full text-[13px]">
                  <thead className="bg-[var(--bz-canvas)] text-[11px] text-[var(--bz-ink-3)]">
                    <tr>
                      <th className="p-2 text-right">المادّة</th>
                      <th className="p-2">المعامل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.subjects.map((s) => (
                      <tr key={s.name} className="border-t border-[var(--bz-line)]">
                        <td className="p-2 font-semibold">
                          {s.name}
                          {s.optional && (
                            <span className="ms-1.5 rounded bg-[var(--bz-blue-050)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--bz-blue)]">
                              دعها فارغة إن لم تجتزها
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-mono font-bold" style={{ color: b.color }}>
                          {s.coef}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[var(--bz-line-2)] bg-[var(--bz-canvas)]">
                      <td className="p-2 font-extrabold">مجموع المعاملات الإجبارية</td>
                      <td className="p-2 text-center font-mono font-extrabold">{totalCoef(b)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="bz-spec-note">
                الأمازيغية يمكنك تركها فارغة إن لم تجتزها. وإذا أدخلت علامةً لها، تُحتسب النقاط فوق 10 فقط وتُضرب في معاملها وتُضاف إلى المجموع، <b>دون</b> إضافة معاملها إلى القاسم. وإن كانت علامتك تحت 10 فلن تنقص معدّلك.
              </p>
            </section>

            <section className="bz-spec-sec" id="law">
              <h2>هل تغيّرت معاملات شعبة {b.short} في بكالوريا {BAC_YEAR}؟</h2>
              <p className="bz-spec-p">
                لا. صدر القرار رقم {COEF_LAW.cancelled.no} بتاريخ {COEF_LAW.cancelled.date} وعدّل مواقيت ومعاملات مواد التعليم الثانوي، ثمّ <b>ألغته وزارة التربية الوطنية</b> بالقرار رقم {COEF_LAW.cancelling.no} المؤرّخ في {COEF_LAW.cancelling.date}.
                {" "}وبذلك تبقى المعاملات السارية هي معاملات القرار رقم {COEF_LAW.inForce.no} المؤرّخ في {COEF_LAW.inForce.date} — وهي نفسها المبيّنة في الجدول أعلاه والمعتمدة في الحاسبة.
              </p>
              <p className="bz-spec-p">
                فإن وجدت جدولاً يحذف مادّة من شعبة {b.short} أو يغيّر معاملها في بكالوريا {BAC_YEAR}، فالأرجح أنّه نُشر قبل قرار الإلغاء.
                {" "}<Link href="/calculate#coefficients" className="font-bold text-[var(--bz-blue)] hover:underline">قارن معاملات كل الشعب في جدول واحد</Link>.
              </p>
            </section>

            {faq.length > 0 && (
              <section className="bz-spec-sec">
                <h2>أسئلة شائعة حول معدل شعبة {b.short}</h2>
                {faq.map((f, i) => (
                  <div key={i} className="mb-3">
                    <h3 className="text-[13.5px] font-extrabold text-[var(--bz-ink)]">{f.q}</h3>
                    <p className="bz-spec-p">{f.a}</p>
                  </div>
                ))}
              </section>
            )}
          </article>
        )}

        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">بعد حساب المعدّل</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/tools/weighted-average" className="bz-spec-rel"><span>حساب المعدل الموزون للتوجيه الجامعي</span></Link>
            <Link href="/specialties" className="bz-spec-rel"><span>دليل التخصّصات الجامعية</span></Link>
            <Link href="/tools/exam-simulator" className="bz-spec-rel"><span>محاكي امتحان البكالوريا</span></Link>
            <Link href="/tools/study-planner" className="bz-spec-rel"><span>مخطّط المراجعة</span></Link>
          </div>
          {/* نصّ الرابط يسمّي الصفحة المقصودة: «حساب معدل رياضيات» لا
              «رياضيات» وحدها — إشارة لمحرّك البحث وللتلميذ معاً. */}
          <h2 className="mb-3 mt-7 font-display text-base font-extrabold">حساب معدل البكالوريا لشعب أخرى</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {others.map((x) => (
              <Link key={x.slug} href={`/calculate/${x.slug}`} className="bz-spec-rel">
                <span className="truncate">حساب معدل {x.short}</span>
              </Link>
            ))}
            <Link href="/calculate" className="bz-spec-rel"><span>كل الشعب</span></Link>
          </div>
        </aside>
      </div>
    </main>
      <PublicCta />
    </>
    </EditablePage>
  );
}

/** يُصيّر **الغامق** بلا مكتبة Markdown */
function RichP({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <p className="bz-spec-p">
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-extrabold text-[var(--bz-ink)]">{p}</strong>
          : <span key={i}>{p}</span>,
      )}
    </p>
  );
}
