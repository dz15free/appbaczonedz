import type { MetadataRoute } from "next";
import { getGuideRows } from "@/features/guide/guide-server";
import { linkOf } from "@/features/guide/spec-link";
import { SPEC_INDEX } from "@/features/guide/spec-index";
import { BRANCHES } from "@/features/calculator/branches";

/* ════════════════════════════════════════════════════════════
   خريطة الموقع

   بدونها قد يمرّ شهور قبل أن يكتشف Google 260 صفحة تخصّص — لا يصل
   إليها إلّا بتتبّع الروابط واحدة واحدة. الخريطة تعرضها كلّها دفعة
   واحدة.

   الصفحات المحمية بتسجيل الدخول **ليست هنا عمداً**: إدراج صفحة لا
   يستطيع الزائر رؤيتها يُهدر ميزانية الزحف ويُضعف تقييم الموقع.
════════════════════════════════════════════════════════════ */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com";

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

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/specialties`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/courses`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/calculate`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // صفحة لكل شعبة: كل واحدة تُفهرَس بعنوانها الدقيق
    ...BRANCHES.map((b) => ({
      url: `${BASE}/calculate/${b.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];

  /* 🐛 كانت الخريطة تُرسل **المعرّف** بينما تُصدر الصفحة canonical
     بالرابط المخصّص. فكان محرّك البحث يتلقّى إشارتين متناقضتين لكل
     تخصّص غيّرتَ رابطه. الآن نقرأ الروابط الحقيقية من الخادم —
     ولا نُدرج إلّا **المنشور** منها: إرسال صفحة «قيد الإعداد» إلى
     Google يُهدر ميزانية الزحف على لا شيء. */
  const rows = await getGuideRows().catch(() => []);
  const specs: MetadataRoute.Sitemap = (rows.length ? rows : SPEC_INDEX.map((s) => ({ ...s, published: true })))
    .filter((s: { published?: boolean }) => s.published !== false)
    .map((s: { permalink?: string; slug: string; updatedAt?: number }) => ({
      url: `${BASE}/specialties/${linkOf(s)}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const courses: MetadataRoute.Sitemap = (await publishedCourses()).map((c) => ({
    url: `${BASE}/courses/${c.id}`,
    lastModified: new Date(c.at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...statics, ...specs, ...courses];
}
