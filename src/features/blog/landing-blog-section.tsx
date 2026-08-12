"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen } from "@fortawesome/free-solid-svg-icons";
import type { BlogIndexEntry } from "@/features/blog/types";

function arDate(ms?: number) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", { year: "numeric", month: "short", day: "numeric" }).format(new Date(ms));
}

export function LandingBlogSection() {
  const [posts, setPosts] = useState<BlogIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog/latest", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : [])
      .then((data: BlogIndexEntry[]) => { if (!cancelled) setPosts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24" aria-labelledby="landing-blog-title">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary"><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" /> المعرفة العملية</span><h2 id="landing-blog-title" className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">أفكار صغيرة تصنع مراجعة أذكى</h2><p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-muted sm:text-[15px]">مقالات أصلية قصيرة تساعدك على تنظيم الوقت، فهم المواد، والتقدم بثبات نحو البكالوريا.</p></div>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">استكشف المدونة <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
        </div>
        {!loaded ? <div className="mt-8 grid gap-4 sm:grid-cols-3"><span className="h-48 animate-pulse rounded-2xl bg-border/40" /><span className="h-48 animate-pulse rounded-2xl bg-border/40" /><span className="h-48 animate-pulse rounded-2xl bg-border/40" /></div> : posts.length > 0 ? <div className="mt-8 grid gap-4 sm:grid-cols-3">{posts.map((post) => <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-border/60 bg-[var(--bz-bg)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">{post.cover ? <img src={post.cover} alt={post.coverAlt || post.title} width={640} height={336} loading="lazy" decoding="async" className="aspect-[640/336] w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="flex aspect-[640/336] items-center justify-center bg-gradient-to-br from-blue-600/15 to-emerald-500/10 text-primary"><FontAwesomeIcon icon={faBookOpen} className="h-8 w-8" /></div>}<span className="block p-4"><span className="block text-[15px] font-extrabold leading-[1.55] text-text">{post.title}</span>{post.excerpt && <span className="mt-2 line-clamp-2 block text-[12.5px] leading-[1.8] text-text-muted">{post.excerpt}</span>}<span className="mt-3 block text-[11px] text-text-muted">{arDate(post.publishedAt)} · {post.readMinutes} دقائق</span></span></Link>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-border p-7 text-center text-sm text-text-muted">ستجد هنا قريباً مقالات عملية من فريق BacZoneDZ. <Link href="/blog" className="font-bold text-primary hover:underline">زيارة المدونة</Link></div>}
      </div>
    </section>
  );
}
