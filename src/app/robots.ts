import type { MetadataRoute } from "next";

/* نسمح بدليل التخصّصات ونمنع ما خلف تسجيل الدخول: زحف صفحات تُعيد
   تحويلاً إلى تسجيل الدخول يُهدر ميزانية الزحف بلا فائدة. */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/specialties", "/specialties/", "/calculate", "/calculate/", "/courses", "/courses/"],
        /* صفحات الدورات الخاصّة ممنوعة صراحةً: البناء والتعديل والمشغّل
           خلف تسجيل الدخول، وزحفها يُهدر ميزانية الزحف. المنشور وحده
           يبقى مسموحاً. */
        disallow: [
          "/api/", "/admin", "/rooms/", "/messages/", "/tools/", "/aibot",
          "/courses/new", "/courses/teach", "/courses/mine",
          "/courses/*/edit", "/courses/*/learn",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
