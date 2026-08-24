import type { MetadataRoute } from "next";
import { getGuideRows } from "@/features/guide/guide-server";
import { BRANCHES } from "@/features/calculator/branches";
import { GUIDES } from "@/features/guides/guides-data";
import { SITE_URL } from "@/lib/site-url";
import { LEGAL_PATHS } from "@/features/settings/legal-links";
import { getPublishedEntries } from "@/features/blog/blog-server";

/* ════════════════════════════════════════════════════════════
   خريطة الموقع

   الخريطة تعلن الصفحات العامة المكتملة لمحركات البحث، بينما تبقى صفحات
   التخصصات التي تحتاج استكمالاً قابلة للوصول عبر الدليل والروابط المباشرة
   دون أن تُقدَّم في الخريطة كأنها مراجع مكتملة.

   الصفحات المحمية بتسجيل الدخول **ليست هنا عمداً**: إدراج صفحة لا
   يستطيع الزائر رؤيتها يُهدر ميزانية الزحف ويُضعف تقييم الموقع.
════════════════════════════════════════════════════════════ */

/* العنوان من المصدر الوحيد (`@/lib/site-url`) — كان مكتوباً هنا بالدومين
   القديم `app.baczonedz.com`. وخريطةٌ تُعلن الدومين القديم بعد نقله تعني
   أنّ Google يزحف روابط تُحوّل كلّها 301: هدرٌ لميزانية الزحف وإشارة
   متناقضة مع `canonical` الذي يقول baczone.app. */
const BASE = SITE_URL;

/* التخصصات من نفس loader الذي تصيّر به الصفحة العامة. بهذا لا ينفصل
   شرط النشر وقابلية الفهرسة في Sitemap عن الصفحة، ولا يعود fallback
   الشبكة إلى إدراج صفحة ناقصة على أنها دليل مكتمل. */
async function guidePages(): Promise<{ slug: string; at?: number }[]> {
  const rows = await getGuideRows();
  return rows
    .filter((row) => row.published && row.indexable)
    .map((row) => ({
      slug: (row.permalink?.trim() || row.slug).replace(/^\/+|\/+$/g, ""),
      at: row.updatedAt,
    }));
}

/* الدورات المنشورة — تُقرأ من `coursesPublic`، وهي العقدة الوحيدة
   التي لا تحوي إلّا المنشور. المسوّدة والمرفوضة لا تصل هنا أصلاً،
   فلا تُفهرَس صفحة خاصّة بالخطأ. */
async function publishedCourses(): Promise<{ id: string; at: number }[]> {
  const db = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  if (!db) return [];
  try {
    const res = await fetch(`${db}/coursesPublic.json?shallow=false`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const val = (await res.json()) as Record<string, { publishedAt?: number; status?: string }> | null;
    return Object.entries(val ?? {})
      .filter(([, c]) => c?.status === "published")
      .map(([id, c]) => ({ id, at: c.publishedAt ?? Date.now() }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getPublishedEntries();
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/blog`,
      lastModified: posts[0]?.updatedAt ? new Date(posts[0].updatedAt) : now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...posts.filter((post) => !post.noindex).map((post) => ({
      url: `${BASE}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: new Date(post.updatedAt || post.publishedAt || now),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/specialties`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/courses`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // صفحة لكل دليل — محتوى مرجعي يستحقّ الفهرسة منفرداً
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...blogPages,
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/tools/study-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/youtube-channels`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/exam-simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/weighted-average`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/planner`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/pomodoro`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/calculate`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // صفحة لكل شعبة: كل واحدة تُفهرَس بعنوانها الدقيق
    ...BRANCHES.map((b) => ({
      url: `${BASE}/calculate/${b.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    /* الصفحات القانونية والتعريفية — مراجعة AdSense تبحث عن سياسة
       الخصوصية أوّلاً، وغيابها عن الخريطة يُبطئ فهرستها.
       و`/blog` ليست هنا: لها خريطتها الخاصّة `/blog/sitemap.xml` لأنّها
       تتغيّر مع كل مقال، فلا يُبطَل تخزين هذه الخريطة معها. */
    ...LEGAL_PATHS.filter((path) => path !== "/blog").map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

  const specs: MetadataRoute.Sitemap = (await guidePages()).map((g) => ({
    url: `${BASE}/specialties/${g.slug}`,
    lastModified: g.at ? new Date(g.at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const courses: MetadataRoute.Sitemap = (await publishedCourses()).map((c) => ({
    url: `${BASE}/courses/${c.id}`,
    lastModified: new Date(c.at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  /* إزالة التكرار: رابط واحد لا يجوز أن يظهر مرّتين في الخريطة */
  const all = [...statics, ...specs, ...courses];
  const seen = new Set<string>();
  return all.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
