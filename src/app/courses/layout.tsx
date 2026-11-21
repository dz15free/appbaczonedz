import type { Metadata } from "next";
import { OG_DEFAULT } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════
   ميتاداتا فهرس الدورات

   الصفحة نفسها مكوّن عميل فلا تستطيع تصدير `metadata`، فتُوضَع هنا.

   ── الفهرسة ──
   فهرس بلا دورة منشورة صفحة شبه فارغة (عنوان وتصفية فقط): «محتوى قليل
   القيمة» في نظر Google ومراجع AdSense. فلا تُفهرَس إلّا إذا وُجدت دورة
   منشورة واحدة على الأقلّ — وهو الشرط نفسه الذي يُدرجها في `sitemap.xml`.
════════════════════════════════════════════════════════════ */

const TITLE = "دورات البكالوريا — دروس مصوّرة من أساتذة جزائريين";
const DESC =
  "دورات تعليمية لطلبة البكالوريا في الجزائر منظّمة حسب المادّة والشعبة، مجّانية ومدفوعة، " +
  "يقدّمها أساتذة على BacZoneDZ.";

async function hasPublishedCourses(): Promise<boolean> {
  const db = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  if (!db) return false;
  try {
    const res = await fetch(`${db}/coursesPublic.json`, { next: { revalidate: 3600 } });
    if (!res.ok) return false;
    const val = (await res.json()) as Record<string, { status?: string }> | null;
    return Object.values(val ?? {}).some((c) => c?.status === "published");
  } catch {
    return false;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const any = await hasPublishedCourses();
  return {
    title: TITLE,
    description: DESC,
    /* ⚠️ هذا `canonical` يرث إلى الصفحات المتفرّعة، وكلّ صفحة فرعية تُلغيه
       بقيمتها الخاصّة (`new` و`mine` و`teach` و`[courseId]`). */
    alternates: { canonical: "/courses" },
    robots: any ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: OG_DEFAULT,
      type: "website", locale: "ar_DZ", url: "/courses",
      title: TITLE, description: DESC, siteName: "BacZoneDZ",
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  };
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
