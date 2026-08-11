import type { BlogContent, BlogIndexEntry, BlogPost } from "@/features/blog/types";

/* ════════════════════════════════════════════════════════════
   قراءة المدوّنة **على الخادم**

   هذا الملفّ هو ما يجعل المقال قابلاً للفهرسة. الشرط الذي وضعتَه —
   «Googlebot يقرأ المحتوى من HTML بلا `useEffect` ولا Firebase Client
   SDK» — يتحقّق هنا وحده: القراءة تقع على الخادم قبل إرسال الصفحة،
   فيصل الزاحفَ نصُّ المقال مكتوباً في HTML لا وعدٌ بجلبه.

   ولم أخترع الطريقة: هي **نفسها** المستعملة في `/specialties`
   (`guide-server.ts`) وهي تعمل في موقعك اليوم — REST مع `revalidate`،
   بلا حزمة Firebase على الخادم (توفير في زمن البناء وحجم الدالّة)،
   وبلا مفتاح لأنّ عقدة `blog` مقروءة علناً بالقواعد.

   ── التخزين المؤقّت وإبطاله ──
   `revalidate` رقمٌ احتياطيّ لا آلية النشر: النشر الفوريّ يقع بإبطال
   صريح من لوحة الإدارة (`/api/blog/revalidate`). فالمقال يظهر خلال
   ثوانٍ من الضغط على «نشر» بلا إعادة نشر للمشروع، والرقم هنا شبكة
   أمان إن فشل الإبطال.

   ── الفشل ──
   انقطاع القاعدة يُرجع قائمةً فارغة لا صفحة خطأ: فهرسٌ فارغ مؤقّتاً
   أهون من 500 يراها الزاحف فيُسقط الصفحة من الفهرس.
   ════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");

/** شبكة أمان: النشر الفوريّ يقع بالإبطال الصريح لا بانتظار هذه المدّة */
const TTL = 600;

type IndexMap = Record<string, Omit<BlogIndexEntry, "id">>;

async function readJson<T>(path: string, ttl = TTL): Promise<T | null> {
  if (!DB) return null;
  try {
    const res = await fetch(`${DB}/${path}.json`, { next: { revalidate: ttl } });
    if (!res.ok) return null;
    return (await res.json()) as T | null;
  } catch {
    return null;
  }
}

function normalize(id: string, raw: Omit<BlogIndexEntry, "id">): BlogIndexEntry {
  return {
    id,
    slug: raw.slug ?? id,
    title: raw.title ?? "بلا عنوان",
    excerpt: raw.excerpt ?? "",
    cover: raw.cover ?? "",
    coverAlt: raw.coverAlt ?? "",
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    status: raw.status === "published" ? "published" : "draft",
    publishedAt: raw.publishedAt ?? 0,
    updatedAt: raw.updatedAt ?? raw.publishedAt ?? 0,
    authorName: raw.authorName ?? "فريق BacZone",
    readMinutes: raw.readMinutes ?? 1,
    oldSlugs: Array.isArray(raw.oldSlugs) ? raw.oldSlugs : [],
    seoTitle: raw.seoTitle ?? "",
    seoDescription: raw.seoDescription ?? "",
    canonical: raw.canonical ?? "",
    noindex: Boolean(raw.noindex),
  };
}

/** كل البطاقات — المسودّات معها، ويُصفّيها المستدعي */
export async function getAllEntries(): Promise<BlogIndexEntry[]> {
  const val = await readJson<IndexMap>("blog/index");
  if (!val) return [];
  return Object.entries(val)
    .map(([id, raw]) => normalize(id, raw))
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
}

/** المنشور وحده — وهو ما يراه الزائر ومحرّك البحث */
export async function getPublishedEntries(): Promise<BlogIndexEntry[]> {
  const all = await getAllEntries();
  return all.filter((e) => e.status === "published");
}

/**
 * البحث بالرابط. تُرجع أيضاً `redirectTo` إن كان الرابط قديماً —
 * فتُحوّل الصفحةُ تحويلاً دائماً بدل أن تُعطي 404 وتُهدر ما بُني من
 * ترتيب في محرّكات البحث.
 */
export async function resolveSlug(
  slug: string,
): Promise<{ entry: BlogIndexEntry | null; redirectTo?: string }> {
  const wanted = decodeURIComponent(slug).trim().toLowerCase();
  const all = await getAllEntries();

  const direct = all.find((e) => e.slug.toLowerCase() === wanted);
  if (direct) return { entry: direct };

  const moved = all.find((e) => (e.oldSlugs ?? []).some((s) => s.toLowerCase() === wanted));
  if (moved) return { entry: moved, redirectTo: moved.slug };

  return { entry: null };
}

/** المقال كاملاً — البطاقة مع الجسم */
export async function getPost(slug: string): Promise<{ post: BlogPost | null; redirectTo?: string }> {
  const { entry, redirectTo } = await resolveSlug(slug);
  if (!entry) return { post: null };
  if (redirectTo) return { post: null, redirectTo };

  const content = await readJson<BlogContent>(`blog/content/${entry.id}`);
  return { post: { ...entry, html: content?.html ?? "" } };
}

/** مقالات قريبة — لا تُترك صفحة المقال بلا مخرج */
export async function getRelated(entry: BlogIndexEntry, limit = 3): Promise<BlogIndexEntry[]> {
  const all = await getPublishedEntries();
  const others = all.filter((e) => e.id !== entry.id);
  const sameLabel = others.filter((e) =>
    (e.labels ?? []).some((l) => (entry.labels ?? []).includes(l)),
  );
  /* من التصنيف نفسه أوّلاً، ثمّ الأحدث — فلا تبقى البطاقات ناقصة */
  return [...sameLabel, ...others.filter((e) => !sameLabel.includes(e))].slice(0, limit);
}
