import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPost, getPublishedEntries, getRelated } from "@/features/blog/blog-server";
import { sanitizeArticle, htmlToText } from "@/features/blog/sanitize";
import { labelName } from "@/features/blog/types";
import { absUrl } from "@/lib/site-url";
import { BlogLayout } from "@/features/blog/public-sidebar";
import { AdSlot } from "@/components/ui/ad-slot";

/* ════════════════════════════════════════════════════════════
   صفحة المقال — مكوّن خادم

   الشرط الذي وضعتَه يتحقّق هنا: المحتوى يُقرأ ويُرسَل في HTML، فلا
   `useEffect` ولا Firebase Client SDK في طريق الزاحف. اطلب الصفحة
   بـ`curl` وستجد نصّ المقال كاملاً.

   ── `dynamicParams` هو ما يُغنيك عن إعادة النشر ──
   `generateStaticParams` تُهيّئ المنشور وقت البناء، و`dynamicParams`
   تسمح بمقالٍ **لم يكن موجوداً وقت البناء** أن يُبنى عند أوّل طلب ثمّ
   يُخزَّن. فالمقال الذي تنشره الآن من لوحتك يعمل فوراً بلا deploy.

   ── التحويل الدائم ──
   تغيير الرابط بعد الفهرسة يقتل ترتيب الصفحة ما لم يُحوَّل. الرابط
   القديم يُحوَّل 301 إلى الجديد بدل 404.
   ════════════════════════════════════════════════════════════ */

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const entries = await getPublishedEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
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
    openGraph: {
      type: "article",
      locale: "ar_DZ",
      url,
      title,
      description,
      siteName: "BacZone",
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
    twitter: {
      card: post.cover ? "summary_large_image" : "summary",
      title, description,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

function arDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "long", day: "numeric" })
    .format(new Date(ms));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { post, redirectTo } = await getPost(slug);

  /* 🐛 ترويسة `Location` لا تقبل محارف غير ASCII: التحويل إلى رابط
     عربيّ خام يرمي `ERR_INVALID_CHAR` فتصير 500 بدل 301 — والزاحف يرى
     خطأ خادم على رابطٍ كان يجب أن يُحوّله. الترميز إلزاميّ هنا. */
  if (redirectTo) permanentRedirect(`/blog/${encodeURIComponent(redirectTo)}`);
  if (!post || post.status !== "published") notFound();

  const html = sanitizeArticle(post.html);
  const related = await getRelated(post);
  const url = post.canonical || absUrl(`/blog/${post.slug}`);
  const description = post.seoDescription || post.excerpt || htmlToText(post.html, 160);

  /* بيانات منظّمة حقيقية: `Article` لأنّ الصفحة مقال فعلاً، و
     `BreadcrumbList` لأنّ المسار معروض على الصفحة. ولا `FAQPage` هنا
     — لا نُصرّح بما لا يقابله عنصر مرئيّ. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description,
        inLanguage: "ar",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
        dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
        author: { "@type": "Organization", name: post.authorName || "BacZoneDZ", url: absUrl("/about") },
        publisher: {
          "@type": "Organization",
          name: "BacZoneDZ",
          logo: { "@type": "ImageObject", url: absUrl("/icon-512.png") },
        },
        image: post.cover ? [post.cover] : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
          { "@type": "ListItem", position: 2, name: "المقالات", item: absUrl("/blog") },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background">
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <header className="bz-article-hero border-b border-border bg-surface">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-11">
            <nav aria-label="مسار التنقّل" className="text-[12px] text-text-muted">
              <Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link>
              <span className="mx-1.5">/</span>
              <Link href="/blog" className="hover:text-primary hover:underline">المقالات</Link>
            </nav>

            {(post.labels?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.labels!.map((l) => (
                  <Link key={l} href={`/blog?label=${encodeURIComponent(l)}`}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-extrabold text-primary">
                    {labelName(l)}
                  </Link>
                ))}
              </div>
            )}

            <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.3] text-text sm:text-[34px]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-3 max-w-2xl text-[14px] leading-[1.9] text-text-muted sm:text-[15.5px]">
                {post.excerpt}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-text-muted" aria-label="بيانات المقال">
              <span>{post.authorName}</span>
              {post.publishedAt ? (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={new Date(post.publishedAt).toISOString()}>{arDate(post.publishedAt)}</time>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{post.readMinutes} دقائق قراءة</span>
            </div>
          </div>
        </header>

        {post.cover && (
          /* أبعاد صريحة تمنع قفزة التخطيط (CLS): بلاها يقفز النصّ حين
             تصل الصورة. و`priority` غير مستعملة عمداً — الصورة تحت
             العنوان لا فوقه، فليست عنصر LCP. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt={post.coverAlt || post.title}
            width={1200}
            height={630}
            loading="eager"
            decoding="async"
            className="mx-auto mt-6 aspect-[1200/630] w-full max-w-3xl rounded-2xl object-cover px-4 shadow-xl shadow-slate-900/10"
          />
        )}
        <AdSlot placement="article-top" className="mx-auto max-w-5xl px-4 pt-5" />

        <BlogLayout>
          <div className="w-full max-w-3xl">
          {/* HTML مُنقّى على الخادم — انظر `sanitize.ts` */}
          <article className="bz-article bz-article-paper" dangerouslySetInnerHTML={{ __html: html }} />
          <AdSlot placement="article-middle" className="mt-8" />

          <PublicCta />
          <AdSlot placement="article-bottom" className="mt-4" />

          {related.length > 0 && (
            <section className="mt-10 border-t border-border pt-6">
              <h2 className="font-display text-[17px] font-extrabold text-text">اقرأ أيضاً</h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/blog/${r.slug}`}
                      className="block h-full overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                      {r.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.cover} alt={r.coverAlt || r.title} width={480} height={250} loading="lazy" className="aspect-[480/250] w-full object-cover" />
                      )}
                      <span className="block p-3"><span className="block text-[13px] font-extrabold leading-[1.6] text-text">{r.title}</span>
                        <span className="mt-1 block text-[11.5px] text-text-muted">{r.readMinutes} دقائق</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </BlogLayout>
      </main>
      <SiteFooter />
    </>
  );
}
