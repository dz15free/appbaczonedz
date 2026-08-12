import type { MetadataRoute } from "next";
import { getGuideRows } from "@/features/guide/guide-server";
import { linkOf } from "@/features/guide/spec-link";
import { BRANCHES } from "@/features/calculator/branches";
import { GUIDES } from "@/features/guides/guides-data";
import { SITE_URL } from "@/lib/site-url";
import { LEGAL_PATHS } from "@/features/settings/legal-links";

const BASE = SITE_URL;

/* الدورات المنشورة فقط — المسوّدة والمرفوضة لا تصل إلى هذه العقدة. */
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
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/tools/study-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/youtube-channels`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/exam-simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/weighted-average`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/calculate`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...BRANCHES.map((b) => ({
      url: `${BASE}/calculate/${b.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...LEGAL_PATHS.filter((path) => path === "/privacy" || path === "/terms").map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

  /* المصدر الوحيد للتخصصات المنشورة هو نفس الدمج الذي تستخدمه الصفحة.
     لذلك تُدرج البذور والمحتوى المرفق والمحتوى المحرر من Firebase بنفس الشرط،
     ولا تعود الخريطة إلى إدراج كل SPEC_INDEX عند فشل الشبكة. */
  const rows = await getGuideRows();
  const specs: MetadataRoute.Sitemap = rows
    .filter((spec) => spec.published)
    .map((spec) => ({
      url: `${BASE}/specialties/${linkOf(spec)}`,
      lastModified: spec.updatedAt ? new Date(spec.updatedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const courses: MetadataRoute.Sitemap = (await publishedCourses()).map((c) => ({
    url: `${BASE}/courses/${c.id}`,
    lastModified: new Date(c.at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const all = [...statics, ...specs, ...courses];
  const seen = new Set<string>();
  return all.filter((entry) => (seen.has(entry.url) ? false : (seen.add(entry.url), true)));
}
