import type { MetadataRoute } from "next";
import { SPEC_INDEX } from "@/features/guide/spec-index";
import { BRANCHES } from "@/features/calculator/branches";
import { SITE_URL } from "@/lib/site-url";
import { LEGAL_PATHS } from "@/features/settings/legal-links";

/* ════════════════════════════════════════════════════════════
   خريطة الموقع

   بدونها قد يمرّ شهور قبل أن يكتشف Google 260 صفحة تخصّص — لا يصل
   إليها إلّا بتتبّع الروابط واحدة واحدة. الخريطة تعرضها كلّها دفعة
   واحدة.

   الصفحات المحمية بتسجيل الدخول **ليست هنا عمداً**: إدراج صفحة لا
   يستطيع الزائر رؤيتها يُهدر ميزانية الزحف ويُضعف تقييم الموقع.
════════════════════════════════════════════════════════════ */

/* العنوان من المصدر الوحيد (`@/lib/site-url`) — كان مكتوباً هنا بالدومين
   القديم `app.baczonedz.com`. وخريطةٌ تُعلن الدومين القديم بعد نقله تعني
   أنّ Google يزحف روابط تُحوّل كلّها 301: هدرٌ لميزانية الزحف وإشارة
   متناقضة مع `canonical` الذي يقول baczone.app. */
const BASE = SITE_URL;

/* ════════════════════════════════════════════════════════════
   محتوى الأدمن — يُقرأ من Firebase وقت توليد الخريطة

   🐛 كانت الخريطة تُرسل **المعرّف الثابت** (`SPEC_INDEX`) بينما
   تُصدر الصفحة `canonical` بالرابط المخصّص المحفوظ في قاعدة
   البيانات. فيتلقّى Google إشارتين متناقضتين لكل تخصّص غيّرتَ
   رابطه — وهو سبب مباشر لعدم أرشفة الصفحة.

   وكانت تُدرج **كل** الـ٢٦٠ تخصّصاً حتى غير المكتوب منها. إرسال
   صفحة «قيد الإعداد» إلى Google يُهدر ميزانية الزحف ويُضعف تقييم
   جودة الموقع كلّه.

   الآن تُقرأ العقدة الحقيقية: الرابط المخصّص، وتاريخ آخر تعديل،
   والمنشور وحده. فما تكتبه في لوحة الإدارة يصل إلى Google بلا
   إعادة نشر للموقع. */
async function guidePages(): Promise<{ slug: string; at?: number }[]> {
  const db = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  if (!db) return [];
  try {
    const res = await fetch(`${db}/guide/specialities.json`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const val = (await res.json()) as Record<string, {
      permalink?: string; intro?: string; draft?: boolean; updatedAt?: number;
    }> | null;
    return Object.entries(val ?? {})
      // منشور = له مقدّمة وليس مسودّة — نفس شرط `mergeGuide` حرفياً
      .filter(([, c]) => Boolean(c?.intro?.trim()) && c?.draft !== true)
      .map(([id, c]) => ({
        slug: (c.permalink?.trim() || id).replace(/^\/+|\/+$/g, ""),
        at: c.updatedAt,
      }));
  } catch {
    return [];
  }
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

  /* الروابط الحقيقية من قاعدة البيانات. وإن تعذّرت القراءة (شبكة أو
     قاعدة معطّلة) نسقط إلى الفهرس الثابت بدل خريطة ناقصة. */
  const live = await guidePages();
  const specs: MetadataRoute.Sitemap = live.length
    ? live.map((g) => ({
        url: `${BASE}/specialties/${g.slug}`,
        lastModified: g.at ? new Date(g.at) : now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }))
    : SPEC_INDEX.map((s) => ({
        url: `${BASE}/specialties/${s.slug}`,
        lastModified: now,
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
