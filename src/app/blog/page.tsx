import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { BLOG_LABELS, labelName } from "@/features/blog/types";
import { BlogLayout } from "@/features/blog/public-sidebar";
import { absUrl } from "@/lib/site-url";

const TITLE = "مقالات ونصائح البكالوريا";
const DESC =
  "أدلّة عملية لطالب البكالوريا في الجزائر: كيف تنظّم مراجعتك، كيف تراجع كل مادّة بطبيعتها، وكيف تتعامل مع ضغط الامتحان — مكتوبة لتُطبَّق لا لتُقرأ فقط.";

export const revalidate = 600;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", locale: "ar_DZ", url: "/blog", title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

function arDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "long", day: "numeric" }).format(new Date(ms));
}

function ArticleMeta({ publishedAt, readMinutes }: { publishedAt?: number; readMinutes?: number }) {
  return <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted"><time dateTime={publishedAt ? new Date(publishedAt).toISOString() : undefined}>{arDate(publishedAt)}</time><span aria-hidden>·</span><span>{readMinutes ?? 1} دقائق قراءة</span></span>;
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const { label } = await searchParams;
  const all = await getPublishedEntries();
  const posts = label ? all.filter((p) => (p.labels ?? []).includes(label)) : all;
  const used = BLOG_LABELS.filter((l) => all.some((p) => (p.labels ?? []).includes(l.id)));
  const featured = posts[0];
  const secondary = posts.slice(1);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, inLanguage: "ar", url: absUrl("/blog") },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: "المقالات", item: absUrl("/blog") },
      ] },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <BlogLayout placement="blog-index">
          <header className="overflow-hidden rounded-[1.5rem] border border-border bg-[linear-gradient(135deg,rgba(37,99,235,.12),rgba(16,185,129,.06)_55%,transparent)] px-5 py-8 sm:px-8 sm:py-11">
            <nav aria-label="مسار التنقّل" className="text-[12px] text-text-muted"><Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link><span className="mx-1.5">/</span><span className="text-text">المقالات</span></nav>
            <div className="mt-5 max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold tracking-wide text-primary">مجلة BacZone التعليمية</span>
              <h1 className="mt-3 font-display text-[28px] font-extrabold leading-[1.25] text-text sm:text-[40px]">{TITLE}</h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-[1.95] text-text-muted sm:text-[15.5px]">{DESC}</p>
            </div>
            {used.length > 0 && <nav aria-label="تصنيفات" className="mt-6 flex flex-wrap gap-2">
              <Link href="/blog" className={`rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition ${!label ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary/40 hover:text-primary"}`}>الكلّ</Link>
              {used.map((l) => <Link key={l.id} href={`/blog?label=${encodeURIComponent(l.id)}`} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition ${label === l.id ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary/40 hover:text-primary"}`}>{l.label}</Link>)}
            </nav>}
          </header>

          {featured ? (
            <div className="mt-8 space-y-8 sm:mt-10">
              <article className="group overflow-hidden rounded-[1.35rem] border border-border bg-surface shadow-[0_22px_60px_-42px_rgba(15,23,42,.45)] transition hover:-translate-y-0.5 hover:border-primary/40">
                <Link href={`/blog/${featured.slug}`} className="grid lg:grid-cols-[1.12fr_.88fr]">
                  {featured.cover ? <img src={featured.cover} alt={featured.coverAlt || featured.title} width={1000} height={560} loading="eager" decoding="async" className="aspect-[16/9] h-full w-full object-cover lg:aspect-auto" /> : <div className="min-h-48 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.28),transparent_40%),linear-gradient(135deg,#0f172a,#1d4ed8)]" aria-hidden />}
                  <div className="flex flex-col justify-center p-5 sm:p-8">
                    <span className="text-[11px] font-extrabold uppercase tracking-[.16em] text-primary">مقالة مميزة</span>
                    {(featured.labels?.length ?? 0) > 0 && <span className="mt-3 text-[12px] font-extrabold text-text-muted">{labelName(featured.labels![0])}</span>}
                    <h2 className="mt-2 font-display text-[22px] font-extrabold leading-[1.45] text-text sm:text-[28px]">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-3 line-clamp-3 text-[13px] leading-[1.95] text-text-muted sm:text-[14px]">{featured.excerpt}</p>}
                    <div className="mt-6 flex items-center justify-between gap-3"><ArticleMeta publishedAt={featured.publishedAt} readMinutes={featured.readMinutes} /><span className="font-extrabold text-primary">اقرأ المقال ←</span></div>
                  </div>
                </Link>
              </article>

              {secondary.length > 0 && <section aria-labelledby="latest-articles-title">
                <div className="mb-4 flex items-end justify-between gap-3"><div><span className="text-[11px] font-extrabold uppercase tracking-[.16em] text-primary">استكشف المزيد</span><h2 id="latest-articles-title" className="mt-1 font-display text-xl font-extrabold text-text sm:text-2xl">أحدث المقالات</h2></div><span className="text-[12px] text-text-muted">{secondary.length} مقالات</span></div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {secondary.map((p) => <li key={p.id}><Link href={`/blog/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    {p.cover ? <img src={p.cover} alt={p.coverAlt || p.title} width={640} height={360} loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="aspect-[16/9] bg-[linear-gradient(135deg,#172554,#2563eb)]" aria-hidden />}
                    <span className="flex flex-1 flex-col p-4"><span className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-primary">{(p.labels?.length ?? 0) > 0 ? labelName(p.labels![0]) : "نصيحة دراسية"}<span className="text-text-muted">{p.readMinutes ?? 1} دقائق</span></span><span className="mt-2 text-[16px] font-extrabold leading-[1.55] text-text">{p.title}</span>{p.excerpt && <span className="mt-2 line-clamp-2 text-[12.5px] leading-[1.8] text-text-muted">{p.excerpt}</span>}<span className="mt-auto pt-4"><ArticleMeta publishedAt={p.publishedAt} readMinutes={p.readMinutes} /></span></span>
                  </Link></li>)}
                </ul>
              </section>}
            </div>
          ) : <p className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center text-[13.5px] text-text-muted">{label ? "لا مقالات في هذا التصنيف بعد." : "ستظهر المقالات المنشورة هنا عند توفرها."}</p>}
        </BlogLayout>
      </main>
      <SiteFooter />
    </>
  );
}
