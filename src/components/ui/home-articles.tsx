"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faClock } from "@fortawesome/free-solid-svg-icons";
import { useBlogIndex } from "@/features/blog/blog-store";
import type { BlogIndexEntry } from "@/features/blog/types";

function arDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

function PostImage({ post }: { post: BlogIndexEntry }) {
  return post.cover ? (
    <img
      src={post.cover}
      alt={post.coverAlt || post.title}
      loading="lazy"
      decoding="async"
      className="aspect-[480/252] w-full object-cover"
    />
  ) : (
    <div className="flex aspect-[480/252] w-full items-center justify-center bg-gradient-to-br from-primary/12 via-sky-500/8 to-emerald-500/12">
      <FontAwesomeIcon icon={faBookOpen} className="h-10 w-10 text-primary/45" />
    </div>
  );
}

function selectPosts(rows: BlogIndexEntry[], slugs?: string[]): BlogIndexEntry[] {
  const published = rows.filter((post) => post.status === "published");
  const wanted = Array.isArray(slugs) ? slugs.filter(Boolean).slice(0, 3) : [];

  if (wanted.length > 0) {
    const selected = wanted
      .map((key) => published.find((post) => post.slug === key || post.id === key))
      .filter((post, index, list): post is BlogIndexEntry => Boolean(post) && list.indexOf(post) === index);
    if (selected.length > 0) return selected;
  }

  return published.slice(0, 3);
}

export function HomeArticles({ title, slugs, anchor = false }: { title?: string; slugs?: string[]; anchor?: boolean }) {
  const { rows, loaded } = useBlogIndex();
  const posts = selectPosts(rows, slugs);

  if (!loaded) {
    return (
      <section id={anchor ? "bz-home-articles" : undefined} className="bz-anchor">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-[17px] font-extrabold">{title || "مقالات قد تفيدك"}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />)}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section id={anchor ? "bz-home-articles" : undefined} className="bz-anchor" aria-labelledby={anchor ? "bz-home-articles-title" : undefined}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-black text-primary">من مدونة BacZone</span>
          <h2 id={anchor ? "bz-home-articles-title" : undefined} className="mt-1 font-display text-[17px] font-extrabold">
            {title || "مقالات قد تفيدك"}
          </h2>
        </div>
        <Link href="/blog" className="shrink-0 text-xs font-bold text-primary hover:underline">
          عرض الكل <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="bz-blog-editorial-card group">
            <PostImage post={post} />
            <span className="bz-blog-editorial-card-copy">
              <span className="bz-blog-card-label">
                {post.labels?.[0] || "مقال"}
                <i />
                <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                {post.readMinutes || 1} د
              </span>
              <strong>{post.title}</strong>
              {post.excerpt && <span>{post.excerpt}</span>}
              <small>
                {arDate(post.publishedAt)}
                <b>اقرأ <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></b>
              </small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
