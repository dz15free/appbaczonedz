import type { Metadata } from "next";

/* ════════════════════════════════════════════════════════════
   بيانات الصفحة لمحرّكات البحث ولروابط المشاركة

   المصدر عقدة `coursesPublic` **وحدها** — وهي لا تحوي إلّا المنشور.
   فالمسوّدة والمرفوضة لا عنوان لها هنا أصلاً، ولا يُسرَّب شيء منهما:
   الصفحة تُوسَم `noindex` حين لا تُوجد الدورة، بدل فهرسة صفحة فارغة.
════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com").replace(/\/+$/, "");

interface PublicCourse {
  title?: string;
  shortDesc?: string;
  fullDesc?: string;
  coverUrl?: string;
  teacherName?: string;
  type?: "free" | "paid";
  price?: number;
}

async function fetchCourse(id: string): Promise<PublicCourse | null> {
  if (!DB) return null;
  try {
    const res = await fetch(`${DB}/coursesPublic/${encodeURIComponent(id)}.json`, {
      // نصف ساعة: العنوان لا يتغيّر كثيراً، وطلب لكل زيارة إهدار
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicCourse | null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ courseId: string }> },
): Promise<Metadata> {
  const { courseId } = await params;
  const c = await fetchCourse(courseId);
  const url = `${SITE}/courses/${courseId}`;

  if (!c?.title) {
    return { title: "دورة — BacZoneDZ", robots: { index: false, follow: false } };
  }

  const title = `${c.title} — دورة على BacZoneDZ`;
  const description = (c.shortDesc || c.fullDesc || `دورة من إعداد ${c.teacherName ?? "أستاذ"} على منصّة BacZoneDZ.`)
    .slice(0, 300);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "ar_DZ",
      siteName: "BacZoneDZ",
      images: c.coverUrl ? [{ url: c.coverUrl }] : undefined,
    },
    twitter: {
      card: c.coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: c.coverUrl ? [c.coverUrl] : undefined,
    },
  };
}

export default async function CourseLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const c = await fetchCourse(courseId);

  /* بيانات `Course` المنظّمة: صفحة الدورة كانت تُرسل عنواناً ووصفاً
     فقط. مع هذا المخطّط يستطيع Google عرضها كنتيجة دورة تعليمية
     باسم المزوّد والسعر — وهو فارق حقيقي في الظهور. */
  const jsonLd = c?.title
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: c.title,
        description: (c.shortDesc || c.fullDesc || "").slice(0, 300) || undefined,
        inLanguage: "ar",
        url: `${SITE}/courses/${courseId}`,
        image: c.coverUrl || undefined,
        provider: { "@type": "Organization", name: "BacZoneDZ", sameAs: SITE },
        ...(c.teacherName
          ? { author: { "@type": "Person", name: c.teacherName } }
          : {}),
        ...(c.type === "free"
          ? { isAccessibleForFree: true, offers: { "@type": "Offer", price: 0, priceCurrency: "DZD" } }
          : c.price
            ? { offers: { "@type": "Offer", price: c.price, priceCurrency: "DZD" } }
            : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {children}
    </>
  );
}
