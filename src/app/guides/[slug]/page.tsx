import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faCheck, faClock, faHouse } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/features/guides/guides-data";
import { absUrl } from "@/features/guide/site-url";

export const dynamicParams = false;
export function generateStaticParams() { return GUIDES.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "دليل غير موجود" };
  const url = `/guides/${guide.slug}`;
  return { title: guide.seoTitle, description: guide.description, keywords: [...guide.keywords, "BacZone"], alternates: { canonical: url }, openGraph: { type: "article", locale: "ar_DZ", url: absUrl(url), title: guide.seoTitle, description: guide.description, siteName: "BacZone" }, twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.description } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) { notFound(); return null; }
  const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: guide.seoTitle, description: guide.description, inLanguage: "ar", publisher: { "@type": "Organization", name: "BacZone" }, mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(`/guides/${guide.slug}`) } }, { "@type": "FAQPage", mainEntity: guide.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الأدلّة", item: absUrl("/guides") }, { "@type": "ListItem", position: 2, name: guide.title, item: absUrl(`/guides/${guide.slug}`) }] }] };
  return <>
    <PublicHeader />
    <main className="bz-guide-detail-editorial min-h-screen bg-[var(--bz-bg)]" style={{ "--guide-color": guide.color } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-guide-detail-hero">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-[11px] text-white/65"><FontAwesomeIcon icon={faHouse} className="h-3 w-3" /><Link href="/" className="hover:text-white hover:underline">الرئيسية</Link><span>←</span><Link href="/guides" className="hover:text-white hover:underline">الأدلّة</Link><span>←</span><span className="font-bold text-white">{guide.title}</span></nav>
          <PublicBackButton fallbackHref="/guides" fallbackLabel="الأدلّة" tone="dark" className="mt-4" />
          <div className="bz-guide-detail-hero-grid mt-6"><div><span className="bz-guides-kicker"><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" /> دليل عملي</span><h1 className="mt-4 max-w-3xl font-display text-[28px] font-extrabold leading-[1.25] text-white sm:text-[45px]">{guide.title}</h1><p className="mt-4 max-w-2xl text-[14px] leading-[2] text-white/78 sm:text-[16px]">{guide.description}</p><div className="bz-guide-detail-hero-meta"><span><FontAwesomeIcon icon={faClock} className="h-3 w-3" /> {guide.readMinutes} دقائق قراءة</span><span>{guide.audience}</span><span>{guide.sections.length} أقسام</span></div></div><div className="bz-guide-detail-card"><span>هذا الدليل يساعدك على</span><b>{guide.audience}</b><p>اقرأ الأقسام بالترتيب، أو انتقل مباشرةً إلى السؤال الذي تبحث عن إجابته.</p></div></div>
        </div>
      </header>
      <PublicSidebarLayout placement="guides">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:pt-10">
          <div className="bz-guide-detail-layout">
            <aside className="bz-guide-detail-toc" aria-label="محتويات الدليل"><p><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" /> محتويات الدليل <b>{guide.sections.length}</b></p><div>{guide.sections.map((section, index) => <a key={section.id} href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}<a href="#faq"><span>+</span> أسئلة شائعة</a></div></aside>
            <article className="bz-guide-detail-content">{guide.sections.map((section, index) => <section key={section.id} id={section.id} className="bz-guide-detail-section"><div className="bz-guide-detail-heading"><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></div><div className="bz-article" dangerouslySetInnerHTML={{ __html: section.html }} /></section>)}<section id="faq" className="bz-guide-detail-section bz-guide-faq"><div className="bz-guide-detail-heading"><span>?</span><h2>أسئلة شائعة</h2></div>{guide.faq.map((item, index) => <details key={index}><summary>{item.q}<b>+</b></summary><p>{item.a}</p></details>)}</section></article>
          </div>
          <aside className="bz-guide-actions"><div><span>حان وقت التطبيق</span><h2>حوّل ما قرأته إلى خطوة</h2></div><div className="bz-guide-action-links"><Link href="/calculate"><FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> احسب معدّل بكالوريتك <FontAwesomeIcon icon={faArrowLeft} className="ms-auto h-3 w-3" /></Link><Link href="/tools/weighted-average"><FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> احسب معدّلك الموزون <FontAwesomeIcon icon={faArrowLeft} className="ms-auto h-3 w-3" /></Link><Link href="/specialties"><FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> دليل التخصّصات الجامعية <FontAwesomeIcon icon={faArrowLeft} className="ms-auto h-3 w-3" /></Link><Link href="/tools"><FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> كل أدوات البكالوريا <FontAwesomeIcon icon={faArrowLeft} className="ms-auto h-3 w-3" /></Link></div></aside>
        </div>
      </PublicSidebarLayout>
    </main>
  </>;
}
