import type { MetadataRoute } from "next";
import { SPEC_INDEX } from "@/features/guide/spec-index";

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
  ];

  const specs: MetadataRoute.Sitemap = SPEC_INDEX.map((s) => ({
    url: `${BASE}/specialties/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...statics, ...specs];
}
