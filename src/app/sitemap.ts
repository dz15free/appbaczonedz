import type { MetadataRoute } from "next";
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/specialties`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/calculate`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // صفحة لكل شعبة: كل واحدة تُفهرَس بعنوانها الدقيق
    ...BRANCHES.map((b) => ({
      url: `${BASE}/calculate/${b.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];

  /* نُدرج المعرّف الأصلي: الرابط المخصّص يعيش في قاعدة البيانات ولا
     تصل إليه الخريطة الساكنة، والصفحة تقبل الشكلين فلا يضيع شيء. */
  const specs: MetadataRoute.Sitemap = SPEC_INDEX.map((s) => ({
    url: `${BASE}/specialties/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...statics, ...specs];
}
