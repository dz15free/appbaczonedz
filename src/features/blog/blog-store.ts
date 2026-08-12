"use client";

import { useEffect, useState } from "react";
import { ref, onValue, get, set, update, remove, push } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import {
  estimateReadMinutes, slugify,
  type BlogIndexEntry, type PostStatus,
} from "@/features/blog/types";
import { htmlToText } from "@/features/blog/sanitize";

/* ════════════════════════════════════════════════════════════
   إدارة المقالات من لوحة الإدارة

   هذا الملفّ **عميل** ويعيش في `/admin` وحده — فلا يصل بايت منه إلى
   زائر يقرأ مقالاً. القراءة العامّة في `blog-server.ts` (خادم، REST).

   ── ما يجعل النشر فورياً ──
   الحفظ في Firebase وحده لا يُظهر المقال: صفحته مخزَّنة على Vercel.
   فبعد كل كتابة نُنادي `/api/blog/revalidate` فيُبطل تخزين الصفحة
   ويُعاد بناؤها من البيانات الجديدة. هذه هي الحلقة التي تُغني عن
   إعادة نشر المشروع.

   ── الروابط القديمة ──
   تغيير الرابط بعد النشر يُضيف القديم إلى `oldSlugs` تلقائياً — فلا
   يفقد المقال ما بُني له من ترتيب، ويُحوَّل الرابط القديم 301 إلى
   الجديد. ولا يُعتمد على تذكّر المحرّر لذلك.
   ════════════════════════════════════════════════════════════ */

const INDEX = "blog/index";
const CONTENT = "blog/content";

export interface DraftInput {
  id?: string;
  title: string;
  slug: string;
  html: string;
  excerpt?: string;
  cover?: string;
  coverAlt?: string;
  labels?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonical?: string;
  noindex?: boolean;
  authorName?: string;
}

/** كل المقالات (مسوّدات ومنشورة) — للوحة الإدارة */
export function useBlogIndex() {
  const [rows, setRows] = useState<BlogIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, INDEX), (snap) => {
      const val = (snap.val() as Record<string, Omit<BlogIndexEntry, "id">> | null) ?? {};
      const list = Object.entries(val).map(([id, r]) => ({ id, ...r })) as BlogIndexEntry[];
      list.sort((a, b) => (b.updatedAt ?? b.publishedAt ?? 0) - (a.updatedAt ?? a.publishedAt ?? 0));
      setRows(list);
      setLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  return { rows, loaded };
}

export async function loadContent(id: string): Promise<string> {
  const snap = await get(ref(rtdb, `${CONTENT}/${id}/html`));
  return (snap.val() as string) ?? "";
}

/** هل الرابط مستعمل في مقال آخر؟ رابطان متطابقان يعني مقالاً لا يُفتح */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const snap = await get(ref(rtdb, INDEX));
  const val = (snap.val() as Record<string, BlogIndexEntry> | null) ?? {};
  return Object.entries(val).some(([id, e]) =>
    id !== exceptId && (e.slug === slug || (e.oldSlugs ?? []).includes(slug)));
}

/** يطلب من الخادم إبطال تخزين الصفحات — بلاه يتأخّر ظهور المقال */
async function revalidate(uid: string, slug: string, oldSlug?: string) {
  try {
    await fetch("/api/blog/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid, slug, oldSlug }),
    });
  } catch {
    /* فشل الإبطال لا يُفقد المقال: هو محفوظ، ويظهر بعد انقضاء المدّة */
  }
}

/**
 * حفظ مقال (إنشاء أو تعديل). الحالة تُمرَّر صراحةً فلا يُنشر شيء
 * بالخطأ: «حفظ» يُبقي المسودّة مسودّةً، والنشر فعلٌ مستقلّ.
 */
export async function saveArticle(
  uid: string,
  input: DraftInput,
  status: PostStatus,
): Promise<{ id: string; slug: string }> {
  const now = Date.now();
  const id = input.id ?? (push(ref(rtdb, INDEX)).key as string);

  const slug = slugify(input.slug || input.title) || id;
  let oldSlugs: string[] = [];
  let publishedAt = 0;
  let previousSlug: string | undefined;

  if (input.id) {
    const snap = await get(ref(rtdb, `${INDEX}/${input.id}`));
    const prev = snap.val() as BlogIndexEntry | null;
    if (prev) {
      oldSlugs = Array.isArray(prev.oldSlugs) ? [...prev.oldSlugs] : [];
      publishedAt = prev.publishedAt ?? 0;
      previousSlug = prev.slug;
      /* الرابط تغيّر: نحفظ القديم للتحويل الدائم */
      if (prev.slug && prev.slug !== slug && !oldSlugs.includes(prev.slug)) {
        oldSlugs.push(prev.slug);
      }
      /* ولو عاد المحرّر إلى رابط قديم، نُخرجه من قائمة القدماء حتى لا
         يُحوّل المقال إلى نفسه في حلقة. */
      oldSlugs = oldSlugs.filter((s) => s !== slug);
    }
  }

  /* 🐛 كان تاريخ النشر يُضبط على «الآن» دائماً، فيتجاهل أي تاريخ قادم
     مع المقال — ولهذا ظهرت المقالات المستوردة كلّها بتاريخ يوم واحد.
     الآن نحترم التاريخ المُرسَل إن وُجد: الاستيراد يحفظ تواريخه
     الحقيقية، والنشر العادي من اللوحة يبقى «الآن» كما كان. */
  if (status === "published" && !publishedAt) {
    const incoming = Number((input as { publishedAt?: number }).publishedAt) || 0;
    publishedAt = incoming > 0 && incoming <= now ? incoming : now;
  }

  const entry: Record<string, unknown> = {
    slug,
    title: input.title.trim() || "بلا عنوان",
    excerpt: (input.excerpt || htmlToText(input.html, 180)).trim(),
    cover: input.cover?.trim() || "",
    coverAlt: input.coverAlt?.trim() || "",
    labels: input.labels ?? [],
    status,
    publishedAt,
    /* تاريخ التحديث يحترم المُرسَل أيضاً — وإلّا بدت كل المقالات
       «حُدّثت» في اللحظة نفسها، وهو ما يفضح الاستيراد الجماعي. */
    updatedAt: (() => {
      const u = Number((input as { updatedAt?: number }).updatedAt) || 0;
      return u > 0 && u <= now ? Math.max(u, publishedAt) : now;
    })(),
    authorName: input.authorName?.trim() || "فريق BacZone",
    readMinutes: estimateReadMinutes(input.html),
    oldSlugs,
    seoTitle: input.seoTitle?.trim() || "",
    seoDescription: input.seoDescription?.trim() || "",
    canonical: input.canonical?.trim() || "",
    noindex: Boolean(input.noindex),
  };

  await set(ref(rtdb, `${INDEX}/${id}`), entry);
  await set(ref(rtdb, `${CONTENT}/${id}`), { html: input.html });
  await revalidate(uid, slug, previousSlug);

  return { id, slug };
}

/** نشر / سحب النشر — بلا لمس المحتوى */
export async function setStatus(uid: string, entry: BlogIndexEntry, status: PostStatus) {
  const patch: Record<string, unknown> = { status, updatedAt: Date.now() };
  if (status === "published" && !entry.publishedAt) patch.publishedAt = Date.now();
  await update(ref(rtdb, `${INDEX}/${entry.id}`), patch);
  await revalidate(uid, entry.slug);
}

export async function deleteArticle(uid: string, entry: BlogIndexEntry) {
  await remove(ref(rtdb, `${INDEX}/${entry.id}`));
  await remove(ref(rtdb, `${CONTENT}/${entry.id}`));
  await revalidate(uid, entry.slug);
}
