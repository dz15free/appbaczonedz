import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { BLOG_LABELS, labelName } from "@/features/blog/types";
import { absUrl } from "@/lib/site-url";
import { BlogLayout } from "@/features/blog/public-sidebar";
import { AdSlot } from "@/components/ui/ad-slot";

const TITLE = "مقالات ونصائح البكالوريا";
const DESC =
  "أدلّة عملية لطالب البكالوريا في الجزائر: كيف تنظّم مراجعتك، كيف تراجع كل مادّة " +
  "بطبيعتها، وكيف تتعامل مع ضغط الامتحان — مكتوبة لتُطبَّق لا لتُقرأ فقط.";

export const revalidate = 600;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: "/blog",
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

function arDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "long", day: "numeric" })
    .format(new Date(ms));
}

export default async function BlogIndex(
  { searchParams }: { searchParams: Promise<{ label?: string }> },
) {
  const { label } = await searchParams;
  const all = await getPublishedEntries();
  const posts = label ? all.filter((p) => (p.labels ?? []).includes(label)) : all;

  /* التصنيفات المعروضة هي التي فيها مقالات فعلاً — تصنيفٌ فارغ يوصل
     الزائر إلى صفحة خالية ويُقرأ عند Google صفحةً بلا قيمة. */
  const used = BLOG_LABELS.filter((l) => all.some((p) => (p.labels ?? []).includes(l.id)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: TITLE, description: DESC, inLanguage: "ar", url: absUrl("/blog"),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
          { "@type": "ListItem", position: 2, name: "المقالات", item: absUrl("/blog") },
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

        <header className="border-b border-border bg-surface">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-11">
            <nav aria-label="مسار التنقّل" className="text-[12px] text-text-muted">
              <Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link>
              <span className="mx-1.5">/</span>
              <span className="text-text">المقالات</span>
            </nav>
            <h1 className="mt-2.5 font-display text-[25px] font-extrabold leading-[1.3] text-text sm:text-[32px]">
              {TITLE}
            </h1>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-text-muted sm:text-[15px]">
              {DESC}
            </p>

            {used.length > 0 && (
              <nav aria-label="تصنيفات" className="mt-5 flex flex-wrap gap-2">
                <Link href="/blog"
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition ${
                    !label ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-primary"
                  }`}>
                  الكلّ
                </Link>
                {used.map((l) => (
                  <Link key={l.id} href={`/blog?label=${encodeURIComponent(l.id)}`}
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition ${
                      label === l.id ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-primary"
                    }`}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </header>

        <AdSlot placement="article-top" className="mx-auto max-w-5xl px-4 pt-5" />
        <BlogLayout>
          {posts.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-6 text-center text-[13.5px] text-text-muted">
              {label ? "لا مقالات في هذا التصنيف بعد." : "المقالات في الطريق — عد قريباً."}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary/40">
                    {p.cover && (
                      /* أبعاد صريحة: بلاها تقفز البطاقات حين تصل الصور */
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover} alt={p.coverAlt || p.title}
                        width={640} height={336} loading="lazy" decoding="async"
                        className="aspect-[640/336] w-full object-cover" />
                    )}
                    <span className="flex flex-1 flex-col p-3.5">
                      {(p.labels?.length ?? 0) > 0 && (
                        <span className="mb-1.5 text-[11px] font-extrabold text-primary">
                          {labelName(p.labels![0])}
                        </span>
                      )}
                      <span className="text-[15px] font-extrabold leading-[1.55] text-text">{p.title}</span>
                      {p.excerpt && (
                        <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.8] text-text-muted">
                          {p.excerpt}
                        </span>
                      )}
                      <span className="mt-auto pt-2.5 text-[11.5px] text-text-muted">
                        {arDate(p.publishedAt)} · {p.readMinutes} دقائق
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AdSlot placement="article-middle" className="mt-8" />
          <AdSlot placement="article-bottom" className="mt-4" />
        </BlogLayout>
      </main>
      <SiteFooter />
    </>
  );
}
