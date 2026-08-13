import type { Metadata } from "next";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCHES, getBranch, totalCoef } from "@/features/calculator/branches";
import { BRANCH_CONTENT } from "@/features/calculator/content";
import { Calculator } from "@/features/calculator/calculator";
import { absUrl } from "@/features/guide/site-url";

/* ════════════════════════════════════════════════════════════
   صفحة حساب المعدّل لشعبة واحدة

   **صفحة ساكنة لكل شعبة**: تُبنى وقت النشر، فتصل إلى الطالب على 3G
   بلا استعلام قاعدة بيانات، وتُفهرَس بعنوانها الدقيق.

   الرابط `/calculate/sciences` — قصير وثابت. تغييره بعد النشر يُلغي
   ترتيب الصفحة ويكسر كل رابط شاركه طالب.
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

  /* العنوان يبدأ بما يكتبه الطالب حرفياً في البحث */
  const title = `حساب معدل البكالوريا شعبة ${b.short} 2027`;
  const description =
    `احسب معدّلك في شعبة ${b.short} بالمعاملات المعتمدة بعد تعديلات الوزارة. ` +
    `${b.subjects.length} مواد، مجموع المعاملات ${totalCoef(b)} — نتيجة فورية بلا تسجيل.`;
  const url = `/calculate/${b.slug}`;

  return {
    title,
    description,
    keywords: [...(c?.kw ?? []), "بكالوريا 2027", "معاملات البكالوريا", "BacZone"],
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "ar_DZ", url: absUrl(url),
      title, description, siteName: "BacZone",
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `حساب معدل البكالوريا شعبة ${b.short}`,
        url: absUrl(`/calculate/${b.slug}`),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: (c?.faq ?? []).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "حساب المعدل", item: absUrl("/calculate") },
          { "@type": "ListItem", position: 2, name: b.short, item: absUrl(`/calculate/${b.slug}`) },
        ],
      },
    ],
  };

  const others = BRANCHES.filter((x) => x.slug !== b.slug);

  return (
    <EditablePage pageKey={`calculate-${b.slug}`}>
    <>
      <PublicHeader />
      <main className="bz-guide min-h-screen">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-calc-branch-hero">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-11">
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/" className="hover:text-white hover:underline">BacZone</Link>
            <span>←</span>
            <Link href="/calculate" className="font-bold text-white hover:underline">حاسبة البكالوريا</Link>
          </nav>
          <div className="bz-calc-branch-hero-layout">
            <div>
              <span className="bz-calc-branch-kicker">حاسبة شعبة {b.short}</span>
              <h1 className="mt-2 font-display text-[26px] font-extrabold leading-[1.25] sm:text-[38px]">
                احسب معدّل بكالوريتك بوضوح
              </h1>
              <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
                أدخل علاماتك مادةً مادة، وراجع أثر المعاملات، ثم احصل على نتيجة مفهومة بلا تسجيل أو إدخال بيانات شخصية.
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
              <h2>جدول معاملات شعبة {b.short}</h2>
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
                            <span className="ms-1.5 rounded bg-[var(--bz-amber-050)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--bz-amber)]">
                              اختيارية
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
                المادّة الاختيارية (الأمازيغية) تُحتسب بونصاً: تُؤخذ النقاط فوق 10 فقط
                وتُضرب في معاملها وتُضاف إلى المجموع، <b>دون</b> إضافة معاملها إلى القاسم.
                فإن كانت علامتك تحت 10 فلن تنقص معدّلك.
              </p>
            </section>

            {c.faq.length > 0 && (
              <section className="bz-spec-sec">
                <h2>أسئلة شائعة</h2>
                {c.faq.map((f, i) => (
                  <div key={i} className="mb-3">
                    <p className="text-[13.5px] font-extrabold text-[var(--bz-ink)]">{f.q}</p>
                    <p className="bz-spec-p">{f.a}</p>
                  </div>
                ))}
              </section>
            )}
          </article>
        )}

        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">شعب أخرى</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {others.map((x) => (
              <Link key={x.slug} href={`/calculate/${x.slug}`} className="bz-spec-rel">
                <span className="truncate">{x.short}</span>
              </Link>
            ))}
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
