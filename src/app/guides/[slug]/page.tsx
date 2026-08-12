import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/features/guides/guides-data";
import { absUrl } from "@/features/guide/site-url";

/* صفحات ساكنة: المحتوى مرجعي لا يتغيّر يومياً، فتُبنى وقت النشر وتصل
   على 3G بلا استعلام. */

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "دليل غير موجود" };
  const url = `/guides/${g.slug}`;
  return {
    title: g.seoTitle,
    description: g.description,
    keywords: [...g.keywords, "BacZone"],
    alternates: { canonical: url },
    openGraph: {
      type: "article", locale: "ar_DZ", url: absUrl(url),
      title: g.seoTitle, description: g.description, siteName: "BacZone",
    },
    twitter: { card: "summary_large_image", title: g.seoTitle, description: g.description },
  };
}

export default async function GuidePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) { notFound(); return null; }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.seoTitle,
        description: g.description,
        inLanguage: "ar",
        publisher: { "@type": "Organization", name: "BacZone" },
        mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(`/guides/${g.slug}`) },
      },
      {
        "@type": "FAQPage",
        mainEntity: g.faq.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الأدلّة", item: absUrl("/guides") },
          { "@type": "ListItem", position: 2, name: g.title, item: absUrl(`/guides/${g.slug}`) },
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
            <Link href="/guides" className="font-bold text-white hover:underline">الأدلّة</Link>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            {g.title}
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.9] text-white/80">
            {g.audience} · قراءة {g.readMinutes} دقائق
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 pb-14 pt-5 sm:px-4">
        {/* فهرس قافز: الدليل يُرجَع إليه، فيجب أن يُقفز داخله */}
        <nav className="bz-guide-toc" aria-label="محتويات الدليل">
          <p className="mb-2 text-[11.5px] font-extrabold text-[var(--bz-ink-3)]">محتويات الدليل</p>
          <ol>
            {g.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="bz-toc-n">{i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-6">
          {g.sections.map((s) => (
            <section key={s.id} id={s.id} className="bz-spec-sec scroll-mt-4">
              <h2>{s.title}</h2>
              <div className="bz-article" dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}

          <section className="bz-spec-sec">
            <h2>أسئلة شائعة</h2>
            {g.faq.map((f, i) => (
              <div key={i} className="mb-3">
                <p className="text-[13.5px] font-extrabold text-[var(--bz-ink)]">{f.q}</p>
                <p className="bz-spec-p">{f.a}</p>
              </div>
            ))}
          </section>
        </article>

        {/* الأدوات المذكورة في الدليل — في نهايته حيث يحتاجها القارئ */}
        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">طبّق ما قرأته</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/calculate" className="bz-spec-rel"><span>احسب معدّل بكالوريتك</span></Link>
            <Link href="/tools/weighted-average" className="bz-spec-rel"><span>احسب معدّلك الموزون</span></Link>
            <Link href="/specialties" className="bz-spec-rel"><span>دليل التخصّصات الجامعية</span></Link>
            <Link href="/tools" className="bz-spec-rel"><span>كل أدوات البكالوريا</span></Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
