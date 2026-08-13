import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faClock, faHouse, faUser } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPost, getPublishedEntries, getRelated } from "@/features/blog/blog-server";
import { sanitizeArticle, htmlToText } from "@/features/blog/sanitize";
import { labelName } from "@/features/blog/types";
import { absUrl } from "@/lib/site-url";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const entries = await getPublishedEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await getPost(slug);
  if (!post) return { title: "المقال غير موجود" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || htmlToText(post.html, 160);
  const url = post.canonical || absUrl(`/blog/${post.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", locale: "ar_DZ", url, title, description, siteName: "BacZone", publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined, modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined, images: post.cover ? [{ url: post.cover }] : undefined },
    twitter: { card: post.cover ? "summary_large_image" : "summary", title, description, images: post.cover ? [post.cover] : undefined },
  };
}

function arDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "long", day: "numeric" }).format(new Date(ms));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { post, redirectTo } = await getPost(slug);
  if (redirectTo) permanentRedirect(`/blog/${encodeURIComponent(redirectTo)}`);
  if (!post || post.status !== "published") notFound();

  const html = sanitizeArticle(post.html);
  const related = await getRelated(post);
  const url = post.canonical || absUrl(`/blog/${post.slug}`);
  const description = post.seoDescription || post.excerpt || htmlToText(post.html, 160);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: post.title, description, inLanguage: "ar", mainEntityOfPage: { "@type": "WebPage", "@id": url }, datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined, dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined, author: { "@type": "Organization", name: post.authorName || "BacZoneDZ", url: absUrl("/about") }, publisher: { "@type": "Organization", name: "BacZoneDZ", logo: { "@type": "ImageObject", url: absUrl("/icon-512.png") } }, image: post.cover ? [post.cover] : undefined },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") }, { "@type": "ListItem", position: 2, name: "المقالات", item: absUrl("/blog") }, { "@type": "ListItem", position: 3, name: post.title, item: url }] },
    ],
  };

  return <>
    <PublicHeader />
    <main className="bz-blog-article-page min-h-screen bg-[var(--bz-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-article-editorial-hero">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
          <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[11px] text-text-muted"><FontAwesomeIcon icon={faHouse} className="h-3 w-3" /><Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link><span>←</span><Link href="/blog" className="hover:text-primary hover:underline">المدونة</Link></nav>
          <div className="bz-article-editorial-grid mt-8">
            <div className="max-w-3xl">
              {(post.labels?.length ?? 0) > 0 && <div className="flex flex-wrap gap-1.5">{post.labels!.map((label) => <Link key={label} href={`/blog?label=${encodeURIComponent(label)}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary">{labelName(label)}</Link>)}</div>}
              <h1 className="mt-4 font-display text-[29px] font-extrabold leading-[1.3] text-text sm:text-[46px]">{post.title}</h1>
              {post.excerpt && <p className="mt-4 max-w-2xl text-[15px] leading-[2] text-text-muted sm:text-[17px]">{post.excerpt}</p>}
              <div className="bz-article-byline mt-6"><span><FontAwesomeIcon icon={faUser} className="h-3 w-3" /> {post.authorName || "فريق BacZone"}</span>{post.publishedAt && <><i /> <time dateTime={new Date(post.publishedAt).toISOString()}>{arDate(post.publishedAt)}</time></>}<i /><span><FontAwesomeIcon icon={faClock} className="h-3 w-3" /> {post.readMinutes} دقائق قراءة</span></div>
            </div>
            <div className="bz-article-editorial-mark"><FontAwesomeIcon icon={faBookOpen} className="h-7 w-7" /><span>مقال من أجل مراجعة أهدأ</span></div>
          </div>
        </div>
      </header>
      {post.cover && <img src={post.cover} alt={post.coverAlt || post.title} width={1200} height={630} loading="eager" decoding="async" className="bz-article-cover-pro mx-auto mt-6 aspect-[1200/630] w-full max-w-5xl object-cover px-4" />}
      <PublicSidebarLayout placement="blog">
        <div className="bz-article-shell bz-article-editorial-shell mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
          <div className="bz-article-reading-layout">
            <aside className="bz-article-reading-aside"><span>في هذا المقال</span><b>{post.readMinutes} دقائق</b><Link href="/blog"><FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> كل المقالات</Link></aside>
            <article className="bz-article" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          {related.length > 0 && <section className="bz-article-related"><div className="bz-article-related-head"><div><span>من نفس الموضوع</span><h2>اقرأ أيضاً</h2></div><Link href="/blog">كل المقالات <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></Link></div><ul className="mt-5 grid gap-3 sm:grid-cols-3">{related.map((relatedPost) => <li key={relatedPost.id}><Link href={`/blog/${relatedPost.slug}`} className="bz-article-related-card group">{relatedPost.cover ? <img src={relatedPost.cover} alt={relatedPost.coverAlt || relatedPost.title} width={320} height={168} loading="lazy" decoding="async" className="aspect-[320/168] w-full object-cover" /> : <div className="flex aspect-[320/168] items-center justify-center bg-primary/5"><span className="text-xs font-extrabold text-primary/60">BacZone</span></div>}<span><b>{relatedPost.title}</b><small>{relatedPost.readMinutes} دقائق قراءة <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></small></span></Link></li>)}</ul></section>}
          <PublicCta />
        </div>
      </PublicSidebarLayout>
    </main>
    <SiteFooter />
  </>;
}
