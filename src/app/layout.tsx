import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Preloader } from "@/components/preloader";
import { PublicSiteFooter } from "@/components/ui/public-site-footer";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/site-url";

// نمنع FontAwesome من حقن CSS تلقائياً (نستورده يدوياً أعلاه)
config.autoAddCss = false;

/* الخطوط تُدار محلياً عبر CSS system fallbacks حتى لا يعتمد Build أو أول paint على Google Fonts. */

/* العنوان من المصدر الوحيد — كان مكرّراً في ثمانية ملفّات */
const SITE_NAME = "BacZoneDZ";
const SITE_TITLE = "BacZoneDZ — منصّة ومجتمع طلاب البكالوريا في الجزائر";
const SITE_DESC =
  "منصّة تعليمية ومجتمع دراسي متكامل لطلبة البكالوريا في الجزائر: دورات من أساتذة، " +
  "غرف مراجعة مباشرة، سبورة ذكية، ملخّصات ومواضيع، حاسبة المعدّل، ودليل التخصّصات الجامعية.";

export const metadata: Metadata = {
  /* 🐛 غياب `metadataBase` كان يجعل Next يحلّ **كل** رابط نسبيّ في
     المشروع مقابل `http://localhost:3000`. أي أنّ `canonical` ووسوم
     OpenGraph في صفحات التخصّصات والحاسبة والدورات كانت تشير في
     الإنتاج إلى جهاز التطوير — من أسوأ إشارات السيو الممكنة. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    /* قالب: كل صفحة تضيف اسمها قبل اسم المنصّة تلقائياً */
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  /* `?v=3` على المانيفست أيضاً: أندرويد يُخزّنه ولا يُعيد قراءته إلّا
     إذا تغيّر رابطه — وبلا إعادة قراءته يبقى `orientation: portrait`
     القديم فاعلاً فلا يدور التطبيق المثبَّت. */
  manifest: "/manifest.json?v=3",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  /* 🐛 التحقّق من ملكيّة الموقع في Search Console: بلا هذا لا تستطيع
     رؤية الفهرسة ولا طلبها. القيمة تُوضع في متغيّر بيئة، فلا تُكتب
     في الشيفرة. */
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  /* الأيقونات كلّها محلّية من `public/` — لا نطاق ثالث على المسار
     الحرج لكل صفحة. والترتيب مقصود، و`?v=3` مقصود:

     • `favicon.ico` أوّلاً وبمقاسات متعدّدة: كان ١٦×١٦ وحده، فكان
       أندرويد يُكبّره في التبويب والاختصار فيبدو باهتاً «قديماً».
       صار يحمل ١٦ و٣٢ و٤٨ و٦٤ و١٢٨ فيختار كل جهاز مقاسه.
     • `apple-touch-icon` ١٨٠×١٨٠ بلا شفافية — iOS يُسوّد الشفّاف.
     • `?v=3` يكسر كاش الأيقونات، وهو عنيد جداً في أندرويد ويدوم
       أسابيع بلا هذه الحيلة. */
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "16x16 32x32 48x48 64x64 128x128" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico?v=3",
  },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

// منع وميض الثيم: نطبّق الوضع الداكن قبل رسم الصفحة (الافتراضي: فاتح)
const noFlashScript = `
(function(){try{var t=localStorage.getItem('bz-theme');
if(t==='dark'){document.documentElement.classList.add('dark');}
else{document.documentElement.classList.remove('dark');}}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="bz-font-fallbacks">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <Script
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9915600428717387"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen font-sans">
        {/* بيانات منظّمة على مستوى الموقع: تُعرّف المنصّة لمحرّكات
            البحث وتُفعّل مربّع البحث داخل نتيجة Google. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: SITE_NAME,
              alternateName: "باك زون",
              url: SITE_URL,
              logo: `${SITE_URL}/icon-512.png`,
              description: SITE_DESC,
              areaServed: { "@type": "Country", name: "الجزائر" },
              inLanguage: "ar",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              inLanguage: "ar",
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/courses?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
          ]) }}
        />
        <Preloader />
        <Providers>
          {children}
          <PublicSiteFooter />
        </Providers>
        {/* آخر ما في الصفحة، وبعد التفاعل — فلا يزاحم الرسم الأوّل */}
        {/* ⚠️ `Suspense` إلزامية هنا: `Analytics` تستعمل
            `useSearchParams`، وبدون حدّ Suspense يُخرج Next **كل صفحة**
            من التصيير الساكن إلى الديناميكي — فتخسر المدوّنة والأدوات
            فهرستها السريعة كلّها لأجل سكربت تتبّع. */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
