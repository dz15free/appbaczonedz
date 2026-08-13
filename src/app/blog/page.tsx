import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faClock, faHouse } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { BLOG_LABELS } from "@/features/blog/types";
import { labelName } from "@/features/blog/types";
import { absUrl } from "@/lib/site-url";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

const TITLE = "مدونة BacZone";
const DESC = "أفكار وأدلة عملية تساعد طالب البكالوريا في الجزائر على تنظيم المراجعة، فهم الأدوات، والتقدّم بثقة.";

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

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const { label } = await searchParams;
  const all = await getPublishedEntries();
  const posts = label ? all.filter((post) => (post.labels ?? []).includes(label)) : all;
  const used = BLOG_LABELS.filter((item) => all.some((post) => (post.labels ?? []).includes(item.id)));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, inLanguage: "ar", url: absUrl("/blog") },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") }, { "@type": "ListItem", position: 2, name: TITLE, item: absUrl("/blog") }] },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[var(--bz-bg)]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <header className="relative overflow-hidden border-b border-border bg-surface">
          <div className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
            <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[12px] text-text-muted"><FontAwesomeIcon icon={faHouse} className="h-3 w-3" /><Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link><span aria-hidden>/</span><span className="font-bold text-text">المدونة</span></nav>
            <div className="mt-6 max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold tracking-wide text-primary"><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" /> قراءة عملية، لا حشو</span><h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-text sm:text-5xl">{TITLE}</h1><p className="mt-4 max-w-2xl text-[15px] leading-[1.95] text-text-muted sm:text-base">{DESC}</p></div>
            {used.length > 0 && <nav aria-label="تصنيفات المدونة" className="mt-8 flex flex-wrap gap-2"><Link href="/blog" className={`rounded-full border px-3.5 py-2 text-[12px] font-extrabold transition ${!label ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary/40 hover:text-primary"}`}>كل المقالات</Link>{used.map((item) => <Link key={item.id} href={`/blog?label=${encodeURIComponent(item.id)}`} className={`rounded-full border px-3.5 py-2 text-[12px] font-extrabold transition ${label === item.id ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary/40 hover:text-primary"}`}>{item.label}</Link>)}</nav>}
          </div>
        </header>

        <PublicSidebarLayout placement="blog">
          <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
            <div className="mb-7 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">المحتوى المنشور</p><h2 className="mt-1 font-display text-xl font-extrabold text-text sm:text-2xl">{label ? `مقالات: ${labelName(label)}` : "أحدث المقالات"}</h2></div><span className="text-xs text-text-muted">{posts.length} {posts.length === 1 ? "مقال" : "مقالات"}</span></div>
            {posts.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center"><FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-primary/40" /><h2 className="mt-4 text-lg font-extrabold text-text">لا توجد مقالات منشورة هنا بعد</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">جرّب تصنيفًا آخر أو عد إلى كل المقالات. المسودات لا تظهر للزوار.</p><Link href="/blog" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">عرض الكل <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link></div> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <li key={post.id}><Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5">{post.cover ? <img src={post.cover} alt={post.coverAlt || post.title} width={640} height={336} loading="lazy" decoding="async" className="aspect-[640/336] w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="flex aspect-[640/336] items-center justify-center bg-gradient-to-br from-primary/10 to-emerald-500/10"><FontAwesomeIcon icon={faBookOpen} className="h-10 w-10 text-primary/50" /></div>}<span className="flex flex-1 flex-col p-5"><span className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-primary">{post.labels?.[0] && <span>{labelName(post.labels[0])}</span>}<span className="h-1 w-1 rounded-full bg-border" /><span className="inline-flex items-center gap-1 text-text-muted"><FontAwesomeIcon icon={faClock} className="h-3 w-3" />{post.readMinutes} دقائق</span></span><span className="mt-2 text-[17px] font-extrabold leading-[1.55] text-text">{post.title}</span>{post.excerpt && <span className="mt-2 line-clamp-3 text-[13px] leading-[1.85] text-text-muted">{post.excerpt}</span>}<span className="mt-auto flex items-center justify-between gap-3 pt-6 text-[11.5px] text-text-muted"><time dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}>{arDate(post.publishedAt)}</time><span className="inline-flex items-center gap-1 font-extrabold text-primary">اقرأ المقال <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></span></span></Link></li>)}</ul>}
          </section>
        </PublicSidebarLayout>
      </main>
      <SiteFooter />
    </>
  );
}
