import type { Metadata } from "next";
import { SpecArticle, SpecNotFound } from "@/features/guide/spec-article";
import { getGuideRows, findSpec } from "@/features/guide/guide-server";
import { linkOf } from "@/features/guide/spec-link";
import { absUrl } from "@/features/guide/site-url";

/* ════════════════════════════════════════════════════════════
   صفحة تخصّص واحد — مُصيَّرة على الخادم

   المحتوى يعيش في قاعدة البيانات (تكتبه من لوحة الإدارة)، فالصفحة
   تُعاد صياغتها كل نصف ساعة: تعديلك يظهر بلا إعادة بناء للموقع،
   والزاحف يجد HTML كاملاً لا «جارٍ التحميل…».

   الرابط يقبل ثلاثة أشكال حتى لا ينكسر شيء أبداً:
     • الرابط المخصّص الذي كتبته
     • رابطاً قديماً بعد تغييره (aliases)
     • المعرّف الأصلي في الفهرس
════════════════════════════════════════════════════════════ */

/* قيمة حرفيّة إلزاماً: Next لا يقبل تعبيراً هنا (١٨٠٠ = نصف ساعة) */
export const revalidate = 1800;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const rows = await getGuideRows();
  const spec = findSpec(rows, decodeURIComponent(slug));

  /* 🐛 كان هذا يُرجع العنوان نفسه حرفياً لكلّ التخصّصات الـ٢٦٠:
     «التخصّص الجامعي في الجزائر — دليل BacZone». مئتان وستّون رابطاً
     في `sitemap.xml` بعنوان واحد = تكرار عناوين صريح، وهو من أقوى
     أسباب رفض الأرشفة. */
  if (!spec) {
    const missingCanonical = `/specialties/${encodeURIComponent(decodeURIComponent(slug))}`;
    return {
      title: "تخصّص جامعي غير موجود — دليل BacZone",
      robots: { index: false, follow: true },
      alternates: { canonical: missingCanonical },
    };
  }

  const canonical = `/specialties/${linkOf(spec)}`;
  const title = `تخصّص ${spec.ar}${spec.fr ? ` (${spec.fr})` : ""} — الدراسة والقبول وفرص العمل`;
  const description =
    (spec.excerpt || (spec.intro ?? "").replace(/\*\*/g, "")).slice(0, 158) ||
    `كل ما تحتاج معرفته عن تخصّص ${spec.ar} في الجزائر: ماذا تدرس، كيف تُقبل، وأين تعمل بعد التخرّج.`;

  return {
    title,
    description,
    keywords: [spec.ar, spec.fr, spec.field, "التوجيه الجامعي", "الجزائر", "بكالوريا"]
      .filter(Boolean) as string[],
    alternates: { canonical },
    /* الصفحة غير المكتوبة لا تُفهرَس — لكنّ روابطها تُتبع */
    robots: spec.published ? undefined : { index: false, follow: true },
    openGraph: {
      type: "article", locale: "ar_DZ", url: absUrl(canonical),
      title, description, siteName: "BacZoneDZ",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SpecialityPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rows = await getGuideRows();
  const spec = findSpec(rows, decodeURIComponent(slug));

  if (!spec || !spec.published) return <SpecNotFound spec={spec} />;
  return <SpecArticle spec={spec} rows={rows} />;
}
