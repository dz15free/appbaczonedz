import type { Metadata } from "next";

/* ════════════════════════════════════════════════════════════
   ميتاداتا فهرس الدورات

   `/courses` صفحة عامّة، ومُدرَجة في `sitemap.xml` بأولويّة ٠٫٩٥،
   ومسموح بها في `robots.txt` — ومع ذلك لم يكن لها عنوان ولا وصف
   خاصّ بها. الصفحة نفسها مكوّن عميل فلا تستطيع تصدير `metadata`،
   فتُوضَع هنا في التخطيط كما فُعل مع `/courses/[courseId]`.
════════════════════════════════════════════════════════════ */

const TITLE = "دورات البكالوريا — دروس مصوّرة من أساتذة جزائريين";
const DESC =
  "دورات تعليمية لطلبة البكالوريا في الجزائر: رياضيات، علوم، فيزياء، لغات وغيرها — " +
  "دروس مصوّرة ومنظّمة حسب الشعبة، مجّانية ومدفوعة، يقدّمها أساتذة معتمدون على BacZoneDZ.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "دورات البكالوريا", "دروس البكالوريا الجزائر", "دورات أونلاين",
    "أستاذ خصوصي", "مراجعة البكالوريا", "BacZone",
  ],
  /* ⚠️ هذا `canonical` يرث إلى كل الصفحات المتفرّعة، وصفحة `/courses`
     وحدها هي المقصودة به. فكل صفحة فرعية **تُلغيه بقيمتها الخاصّة**
     (انظر `new` و`mine` و`teach` و`[courseId]`) — وإلّا أعلنت أنّ
     نسختها الأصلية هي `/courses` فيُهمل Google فهرستها. */
  alternates: { canonical: "/courses" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: "/courses",
    title: TITLE, description: DESC, siteName: "BacZoneDZ",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
