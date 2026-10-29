import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faHouse } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FEATURE_PAGES, getFeaturePage } from "@/features/landing/features-data";
import { FEATURE_ICON } from "@/features/landing/feature-icon";
import { absUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return FEATURE_PAGES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFeaturePage(slug);
  if (!f) return { title: "الصفحة غير موجودة" };
  const url = absUrl(`/features/${f.slug}`);
  return {
    title: `${f.title} | BacZone`,
    description: f.description,
    alternates: { canonical: url },
    openGraph: { type: "article", locale: "ar_DZ", url, title: f.title, description: f.description, siteName: "BacZone" },
  };
}

export default async function FeaturePageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFeaturePage(slug);
  if (!f) notFound();
  const others = FEATURE_PAGES.filter((x) => x.slug !== f.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: f.title, description: f.description, url: absUrl(`/features/${f.slug}`), inLanguage: "ar" },
      { "@type": "FAQPage", mainEntity: f.faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: "المنصّة", item: absUrl("/features") },
        { "@type": "ListItem", position: 3, name: f.title, item: absUrl(`/features/${f.slug}`) },
      ] },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[var(--bz-bg)]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[11px] text-text-muted">
            <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
            <Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link><span>←</span>
            <Link href="/features" className="hover:text-primary hover:underline">المنصّة</Link>
          </nav>

          <header className="bz-feature-hero">
            <span className="bz-feature-icon" aria-hidden="true"><FontAwesomeIcon icon={FEATURE_ICON[f.icon]} /></span>
            <h1>{f.title}</h1>
            <p className="bz-feature-lede">{f.short}</p>
          </header>

          <section className="bz-prose">
            {f.intro.map((p, i) => <p key={i}>{p}</p>)}
          </section>

          <section className="mt-10">
            <h2 className="bz-feature-h2">كيف تعمل</h2>
            <ol className="bz-feature-steps">
              {f.steps.map((s, i) => (
                <li key={i}>
                  <span className="bz-feature-step-n" aria-hidden="true">{i + 1}</span>
                  <div><h3>{s.title}</h3><p>{s.body}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="bz-feature-role"><span>للتلميذ</span><p>{f.forStudent}</p></div>
            <div className="bz-feature-role is-teacher"><span>للأستاذ</span><p>{f.forTeacher}</p></div>
          </section>

          <section className="mt-10">
            <h2 className="bz-feature-h2">تفاصيل تهمّك</h2>
            <dl className="bz-feature-details">
              {f.details.map((d, i) => <div key={i}><dt>{d.title}</dt><dd>{d.body}</dd></div>)}
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="bz-feature-h2">أسئلة شائعة</h2>
            <div className="bz-feature-faq">
              {f.faq.map((x, i) => (
                <details key={i}>
                  <summary>{x.q}</summary>
                  <p>{x.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="bz-feature-cta">
            <Link href={f.cta.href} className="bz-feature-cta-btn">{f.cta.label} <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
          </div>

          <section className="mt-12">
            <h2 className="bz-feature-h2">في المنصّة أيضاً</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {others.map((o) => (
                <Link key={o.slug} href={`/features/${o.slug}`} className="bz-feature-mini">
                  <span className="bz-feature-icon bz-feature-icon--sm" aria-hidden="true"><FontAwesomeIcon icon={FEATURE_ICON[o.icon]} /></span>
                  <span className="min-w-0"><b>{o.title}</b><small>{o.short}</small></span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
