import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faClock, faHouse, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { BLOG_LABELS, labelName } from "@/features/blog/types";
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

function PostImage({ post, className, width, height, priority = false }: { post: Awaited<ReturnType<typeof getPublishedEntries>>[number]; className: string; width: number; height: number; priority?: boolean }) {
  return post.cover ? <img src={post.cover} alt={post.coverAlt || post.title} width={width} height={height} loading={priority ? "eager" : "lazy"} decoding="async" className={className} /> : <div className={`${className} flex items-center justify-center bg-gradient-to-br from-primary/12 via-sky-500/8 to-emerald-500/12`}><FontAwesomeIcon icon={faBookOpen} className="h-10 w-10 text-primary/45" /></div>;
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const { label } = await searchParams;
  const all = await getPublishedEntries();
  const posts = label ? all.filter((post) => (post.labels ?? []).includes(label)) : all;
  const used = BLOG_LABELS.filter((item) => all.some((post) => (post.labels ?? []).includes(item.id)));
  const featured = posts[0];
  const rest = posts.slice(1);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, inLanguage: "ar", url: absUrl("/blog") },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") }, { "@type": "ListItem", position: 2, name: TITLE, item: absUrl("/blog") }] },
    ],
  };

  return <>
    <PublicHeader />
    <main className="bz-blog-index-page min-h-screen bg-[var(--bz-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-blog-editorial-hero">
        <div className="bz-blog-editorial-grid mx-auto w-full max-w-6xl px-5 py-9 sm:px-6 sm:py-14">
          <div>
            <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[11px] text-white/65"><FontAwesomeIcon icon={faHouse} className="h-3 w-3" /><Link href="/" className="hover:text-white hover:underline">الرئيسية</Link><span>←</span><span className="font-bold text-white">المدونة</span></nav>
            <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold text-white/85"><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" /> مساحة قراءة للطالب</span>
            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.2] text-white sm:text-[52px]">اقرأ ما يساعدك<br /><span className="text-sky-200">على التقدّم.</span></h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-[2] text-white/75 sm:text-[16px]">{DESC}</p>
          </div>
          <div className="bz-blog-editorial-note"><FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5 text-sky-200" /><b>من الفكرة إلى الخطة</b><p>مقالات قصيرة تساعدك على تحويل المراجعة من ضغط يومي إلى خطوات يمكن إنجازها.</p><span>{all.length} {all.length === 1 ? "مقال منشور" : "مقالات منشورة"}</span></div>
        </div>
      </header>
      {used.length > 0 && <nav aria-label="تصنيفات المدونة" className="bz-blog-editorial-filters mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-5 py-4 sm:px-6"><Link href="/blog" className={`bz-blog-filter ${!label ? "is-active" : ""}`}>كل المقالات</Link>{used.map((item) => <Link key={item.id} href={`/blog?label=${encodeURIComponent(item.id)}`} className={`bz-blog-filter ${label === item.id ? "is-active" : ""}`}>{item.label}</Link>)}</nav>}
      <section className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-6">
        <div className="rounded-3xl border border-border/80 bg-surface px-5 py-5 sm:px-7">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
            <div>
              <span className="text-[11px] font-black text-primary">كيف تستعمل مكتبة القراءة؟</span>
              <h2 className="mt-2 font-display text-xl font-extrabold">ابدأ بسؤال واضح، ثم انتقل إلى التطبيق</h2>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                اختر المقال الذي يجيب عن المشكلة التي تواجهها الآن: بناء برنامج، فهم مادة، التعامل مع القلق، أو الاستعداد ليوم الامتحان. اقرأ الخطوات، جرّب ما يناسبك، ثم استخدم أدوات BacZone لتسجيل ما أنجزته بدل جمع نصائح بلا تطبيق.
              </p>
            </div>
            <div className="text-sm leading-7 text-text-muted">
              <p><strong className="text-text-primary">للمعلومة المتغيرة:</strong> المقالات تقدّم شرحاً عملياً، لكن معاملات البكالوريا ومواعيد التوجيه وشروط القبول تُراجع من الجهة الرسمية عند صدورها.</p>
              <nav aria-label="مسارات مرتبطة" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-extrabold text-primary">
                <Link href="/guides">الأدلة المرجعية <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-2.5 w-2.5" /></Link>
                <Link href="/tools">أدوات المراجعة <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-2.5 w-2.5" /></Link>
                <Link href="/specialties">دليل التخصصات <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-2.5 w-2.5" /></Link>
              </nav>
            </div>
          </div>
        </div>
      </section>
      <PublicSidebarLayout placement="blog">
        <section className="bz-blog-index-shell mx-auto w-full max-w-6xl px-5 pb-14 pt-4 sm:px-6 sm:pb-20">
          {featured ? <>
            <div className="bz-blog-section-heading"><div><span>الاختيار الأوّل</span><h2>{label ? `مقالات ${labelName(label)}` : "ابدأ من هنا"}</h2></div><small>{posts.length} {posts.length === 1 ? "مقال" : "مقالات"}</small></div>
            <Link href={`/blog/${featured.slug}`} className="bz-blog-featured group">
              <PostImage post={featured} width={760} height={400} priority className="bz-blog-featured-image aspect-[760/400] w-full object-cover" />
              <span className="bz-blog-featured-copy"><span className="bz-blog-card-label">{featured.labels?.[0] ? labelName(featured.labels[0]) : "دليل دراسي"}<i />{featured.readMinutes} دقائق قراءة</span><strong>{featured.title}</strong>{featured.excerpt && <span>{featured.excerpt}</span>}<span className="bz-blog-featured-foot"><time dateTime={featured.publishedAt ? new Date(featured.publishedAt).toISOString() : undefined}>{arDate(featured.publishedAt)}</time><b>افتح المقال <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></b></span></span>
            </Link>
            {rest.length > 0 && <div className="bz-blog-section-heading mt-12"><div><span>مكتبة القراءة</span><h2>مقالات أخرى قد تفيدك</h2></div><Link href="/blog" className="text-[11px] font-extrabold text-primary">تصفّح الكل <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></Link></div>}
            {rest.length > 0 && <ul className="bz-blog-editorial-grid-list">{rest.map((post) => <li key={post.id}><Link href={`/blog/${post.slug}`} className="bz-blog-editorial-card group"><PostImage post={post} width={480} height={252} className="aspect-[480/252] w-full object-cover" /><span className="bz-blog-editorial-card-copy"><span className="bz-blog-card-label">{post.labels?.[0] ? labelName(post.labels[0]) : "مقال"}<i /><FontAwesomeIcon icon={faClock} className="h-3 w-3" />{post.readMinutes} د</span><strong>{post.title}</strong>{post.excerpt && <span>{post.excerpt}</span>}<small>{arDate(post.publishedAt)} <b>اقرأ <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></b></small></span></Link></li>)}</ul>}
          </> : <div className="bz-blog-empty"><FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-primary/40" /><h2>لا توجد مقالات منشورة هنا بعد</h2><p>جرّب تصنيفاً آخر أو عد إلى كل المقالات. المسودات لا تظهر للزوار.</p><Link href="/blog">عرض كل المقالات <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></Link></div>}
        </section>
      </PublicSidebarLayout>
    </main>
    <SiteFooter />
  </>;
}
