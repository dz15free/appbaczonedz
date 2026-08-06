import type { MetadataRoute } from "next";

/* نسمح بدليل التخصّصات ونمنع ما خلف تسجيل الدخول: زحف صفحات تُعيد
   تحويلاً إلى تسجيل الدخول يُهدر ميزانية الزحف بلا فائدة. */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/specialties", "/specialties/", "/calculate", "/calculate/"],
        disallow: ["/api/", "/admin", "/rooms/", "/messages/", "/tools/", "/aibot"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
