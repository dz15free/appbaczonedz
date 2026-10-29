"use client";

import { useState } from "react";
import { saveArticle } from "@/features/blog/blog-store";
import type { BlogIndexEntry } from "@/features/blog/types";
import { BLOG_REWRITES } from "@/features/blog/rewrites";
import { DEFAULT_AUTHOR } from "@/features/authors/authors";

/* ════════════════════════════════════════════════════════════
   تطبيق المقالات المُعاد كتابتها — مقالاً مقالاً

   لماذا لا يوجد زرّ «طبّق الكلّ»: سبب رفض أدسنس الأوّل أنّ 21 مقالاً
   نُشرت في الجزء نفسه من الثانية. تحديثها كلّها بضغطة يكرّر العلامة
   نفسها في «آخر تحديث». تطبيق 3 أو 4 يومياً يجعل تواريخ التحديث
   حقيقية ومتفرّقة — لأنّها كذلك فعلاً.

   الرابط وتاريخ النشر الأصلي لا يتغيّران أبداً (saveArticle يحفظهما)،
   فلا تضيع فهرسة Google ولا الروابط المشاركة.
   ════════════════════════════════════════════════════════════ */

const norm = (s: string) => {
  try { s = decodeURIComponent(s); } catch { /* ليس مُرمَّزاً */ }
  return s.normalize("NFC").trim();
};

function isOwnCover(c?: string) {
  const v = (c ?? "").trim();
  return !!v && (v.startsWith("/") || /^https:\/\/(www\.)?baczone\.app\//.test(v) || /firebasestorage\.googleapis\.com/.test(v));
}

export function RewritesPanel({ uid, rows }: { uid: string; rows: BlogIndexEntry[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState("");

  const items = BLOG_REWRITES.map((rw) => {
    const row = rows.find((r) => norm(r.slug) === norm(rw.slug) || (r.oldSlugs ?? []).some((o) => norm(o) === norm(rw.slug)));
    const applied = done[rw.slug] || (!!row && row.excerpt === rw.excerpt);
    return { rw, row, applied };
  });
  const pending = items.filter((i) => i.row && !i.applied);
  const appliedCount = items.filter((i) => i.applied).length;

  async function apply(i: (typeof items)[number]) {
    if (!i.row) return;
    setBusy(i.rw.slug); setErr("");
    try {
      await saveArticle(uid, {
        id: i.row.id,
        slug: i.row.slug,                 // الرابط كما هو
        title: i.rw.title,
        html: i.rw.html,
        excerpt: i.rw.excerpt,
        /* الأغلفة المرتبطة من مواقع أخرى تُحذف — ويُعرض غلاف محلّي بدلها */
        cover: isOwnCover(i.row.cover) ? i.row.cover : "",
        coverAlt: isOwnCover(i.row.cover) ? i.row.coverAlt : "",
        labels: i.row.labels,
        seoTitle: i.rw.seoTitle,
        seoDescription: i.rw.seoDescription,
        canonical: i.row.canonical,
        noindex: false,
        authorName: DEFAULT_AUTHOR.name,
      }, "published");
      setDone((d) => ({ ...d, [i.rw.slug]: true }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر التطبيق");
    } finally {
      setBusy(null);
    }
  }

  if (BLOG_REWRITES.length === 0) return null;

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold">المقالات المُعاد كتابتها</p>
        <p className="text-xs text-text-muted">{appliedCount} من {items.length} مُطبَّق</p>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
        طبّق <b>3 أو 4 مقالات يومياً</b> لا كلّها دفعة واحدة: هكذا تتوزّع تواريخ «آخر تحديث» توزيعاً حقيقياً.
        الرابط وتاريخ النشر الأصلي لا يتغيّران، والكاتب يصير {DEFAULT_AUTHOR.name}.
      </p>
      {err && <p className="mt-2 text-[12px] font-bold text-danger">{err}</p>}
      <ul className="mt-3 space-y-1.5">
        {items.map((i) => (
          <li key={i.rw.slug} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px]">{i.rw.title}</span>
            {!i.row ? (
              <span className="shrink-0 text-[11px] text-text-muted">لم يُعثر على المقال</span>
            ) : i.applied ? (
              <span className="shrink-0 text-[11px] font-bold text-secondary">✓ مُطبَّق</span>
            ) : (
              <button
                type="button"
                onClick={() => void apply(i)}
                disabled={!!busy}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
              >
                {busy === i.rw.slug ? "جارٍ…" : "طبّق"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {pending.length === 0 && appliedCount === items.length && (
        <p className="mt-3 text-[12px] font-bold text-secondary">طُبّقت كلّ المقالات.</p>
      )}
    </section>
  );
}
