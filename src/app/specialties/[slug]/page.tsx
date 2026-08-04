import type { Metadata } from "next";
import { SpecArticle } from "@/features/guide/spec-article";

/* ════════════════════════════════════════════════════════════
   صفحة تخصّص واحد

   المحتوى يعيش في قاعدة البيانات (تكتبه من لوحة الإدارة)، فالصفحة
   ديناميكية لا ساكنة: تعديلك يظهر فوراً بلا إعادة بناء للموقع.

   الرابط يقبل ثلاثة أشكال حتى لا ينكسر شيء أبداً:
     • الرابط المخصّص الذي كتبته
     • رابطاً قديماً بعد تغييره (aliases)
     • المعرّف الأصلي في الفهرس
════════════════════════════════════════════════════════════ */

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const pretty = decodeURIComponent(slug);
  const url = `/specialties/${pretty}`;
  // العنوان الحقيقي يأتي مع المحتوى؛ هذا أساس آمن للفهرسة والمشاركة
  const title = `التخصّص الجامعي — دليل BacZone`;
  return {
    title,
    description:
      "ماذا تدرس في هذا التخصّص، كيف تُقبل فيه، وأين تعمل بعد التخرّج — دليل التوجيه الجامعي من BacZone.",
    alternates: { canonical: url },
    openGraph: { type: "article", locale: "ar_DZ", url, title, siteName: "BacZone" },
  };
}

export default async function SpecialityPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return <SpecArticle slug={decodeURIComponent(slug)} />;
}
