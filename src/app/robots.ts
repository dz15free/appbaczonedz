import type { MetadataRoute } from "next";
import { LEGAL_PATHS } from "@/features/settings/legal-links";
import { SITE_URL } from "@/lib/site-url";

/* نسمح بدليل التخصّصات ونمنع ما خلف تسجيل الدخول: زحف صفحات تُعيد
   تحويلاً إلى تسجيل الدخول يُهدر ميزانية الزحف بلا فائدة. */

/* العنوان من المصدر الوحيد */
const BASE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        /* الصفحات القانونية والتعريفية مسموحة صراحةً: مراجعة AdSense
           تبحث عن سياسة الخصوصية أوّلاً، ومنعُها بالخطأ يُوجب الرفض. */
        allow: [
          "/", "/specialties", "/specialties/", "/calculate", "/calculate/",
          /* `/blog` تأتي ضمن LEGAL_PATHS — فلا تُكرَّر هنا */
          "/courses", "/courses/", "/blog/", ...LEGAL_PATHS,
          /* الأدوات العامّة: صفحة الأدوات والموزون والمخطّط والمؤقّت
             محتوى حقيقي مفيد ويجب أن يُفهرَس. */
          "/tools", "/tools/weighted-average", "/tools/planner", "/tools/pomodoro",
        ],
        /* صفحات الدورات الخاصّة ممنوعة صراحةً: البناء والتعديل والمشغّل
           خلف تسجيل الدخول، وزحفها يُهدر ميزانية الزحف. المنشور وحده
           يبقى مسموحاً. */
        disallow: [
          /* 🐛 كان `/tools/` ممنوعاً كاملاً، فتُحجب عنه الأدوات العامّة
             كلّها — بما فيها صفحات بُنيت خصّيصاً للفهرسة. نمنع الأدوات
             الشخصية بأسمائها فقط: هي تحفظ بيانات المستخدم ولا معنى
             لزحفها. */
          "/api/", "/admin", "/rooms/", "/messages/", "/aibot",
          "/tools/tracker", "/tools/flashcards", "/tools/tasks",
          /* صفحات شخصية أو عابرة: زحفها بلا قيمة، وبعضها يكشف ما لا يُقصد نشره */
          "/onboarding", "/profile", "/notifications", "/groups/", "/u/",
          "/pay/", "/offline", "/indexnow-key.txt",
          /* صفحة المساعد الآلي عامّة للتجربة لا للفهرسة: الصفحات
             المبنيّة على ردود ذكاء اصطناعي تُصنَّف عند Google محتوىً
             منخفض القيمة، فتجرّ تقييم الموقع كلّه معها. */
          "/omibot",
          "/courses/new", "/courses/teach", "/courses/mine",
          "/courses/*/edit", "/courses/*/learn",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
