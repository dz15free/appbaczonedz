import type { MetadataRoute } from "next";
import { BRANCHES } from "@/features/calculator/branches";
import { getGuideRows } from "@/features/guide/guide-server";
import { linkOf } from "@/features/guide/spec-link";
import { LEGAL_PATHS } from "@/features/settings/legal-links";
import { SITE_URL } from "@/lib/site-url";

/*
 * خريطة الموقع العامة. لا ندرج الصفحات المحمية أو التخصصات الفارغة:
 * صفحة التخصص تدخل الخريطة فقط عندما تكون منشورة فعلاً وتملك مقدمة تحريرية.
 */

const BASE = SITE_URL;

async function publishedCourses(): Promise<{ id: string; at: number }[]> {
  const db = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  if (!db) return [];
  try {
    const res = await fetch(`${db}/coursesPublic.json?shallow=false`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const val = (await res.json()) as Record<string, {
      publishedAt?: number;
      status?: string;
    }> | null;
    return Object.entries(val ?? {})
      .filter(([, course]) => course?.status === "published")
      .map(([id, course]) => ({ id, at: course.publishedAt ?? Date.now() }));
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
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/tools/study-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/youtube-channels`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/exam-simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/weighted-average`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/calculate`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...BRANCHES.map((branch) => ({
      url: `${BASE}/calculate/${branch.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...LEGAL_PATHS.filter((path) => path !== "/blog").map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

  const guideRows = await getGuideRows();
  const specs: MetadataRoute.Sitemap = guideRows
    .filter((guide) => guide.published)
    .map((guide) => ({
      url: `${BASE}/specialties/${linkOf(guide)}`,
      lastModified: guide.updatedAt ? new Date(guide.updatedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const courses: MetadataRoute.Sitemap = (await publishedCourses()).map((course) => ({
    url: `${BASE}/courses/${course.id}`,
    lastModified: new Date(course.at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const seen = new Set<string>();
  return [...statics, ...specs, ...courses].filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
