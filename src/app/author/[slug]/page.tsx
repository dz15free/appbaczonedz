import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faHouse } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { AUTHORS, getAuthor, resolveAuthor } from "@/features/authors/authors";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { labelName } from "@/features/blog/types";
import { absUrl } from "@/lib/site-url";

export const revalidate = 600;

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getAuthor(slug);
  if (!a) return { title: "الكاتب غير موجود" };
  const description = `${a.name} — ${a.role}. ${a.bio[0].slice(0, 110)}…`;
  return {
    title: `${a.name} — ${a.role}`,
    description,
    alternates: { canonical: absUrl(`/author/${a.slug}`) },
    openGraph: { type: "profile", locale: "ar_DZ", url: absUrl(`/author/${a.slug}`), title: a.name, description, siteName: "BacZone" },
  };
}

function arDate(ms?: number) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "long", day: "numeric" }).format(new Date(ms));
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  const posts = (await getPublishedEntries()).filter((p) => resolveAuthor(p.authorName).slug === author.slug);
  const url = absUrl(`/author/${author.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      url,
      jobTitle: author.role,
      description: author.bio.join(" "),
      sameAs: author.links.map((l) => l.href),
      worksFor: { "@type": "Organization", name: "BacZone", url: "https://baczone.app" },
    },
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[var(--bz-bg)]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[11px] text-text-muted">
            <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
            <Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link>
            <span>←</span>
            <Link href="/blog" className="hover:text-primary hover:underline">المقالات</Link>
          </nav>

          <header className="bz-author-hero">
            <span className="bz-author-mark bz-author-mark--lg" aria-hidden="true">{author.name.charAt(0)}</span>
            <div>
              <h1 className="m-0 font-display text-[28px] font-extrabold leading-tight text-text sm:text-[36px]">{author.name}</h1>
              <p className="mt-1 text-[14px] font-semibold text-primary">{author.role}</p>
            </div>
          </header>

          <section className="bz-author-about">
            {author.bio.map((p, i) => <p key={i}>{p}</p>)}
            {author.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {author.links.map((l) => (
                  <a key={l.href} href={l.href} rel="me noopener" target="_blank" className="bz-author-link">{l.label}</a>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="m-0 font-display text-[20px] font-bold text-text">
              مقالاته <span className="text-[14px] font-normal text-text-muted">({posts.length})</span>
            </h2>
            <ul className="mt-4 grid gap-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`} className="bz-roomcard group">
                    <span className="min-w-0 flex-1">
                      <span className="bz-roomcard-title">{p.title}</span>
                      <span className="bz-roomcard-meta">
                        {p.labels?.[0] && <span className="bz-roomcard-subject">{labelName(p.labels[0])}</span>}
                        <span>{arDate(p.publishedAt)}</span>
                        <span>· {p.readMinutes} دقائق</span>
                      </span>
                    </span>
                    <FontAwesomeIcon icon={faArrowLeft} className="bz-author-go h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
