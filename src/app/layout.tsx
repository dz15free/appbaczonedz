import type { Metadata, Viewport } from "next";
import { Tajawal, Cairo } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Preloader } from "@/components/preloader";

// نمنع FontAwesome من حقن CSS تلقائياً (نستورده يدوياً أعلاه)
config.autoAddCss = false;

/* 🐛 **سبب أنّ النصّ العربي كان يبدو باهتاً وغير عريض**: الخطّ يُحمَّل
   بأوزان ٤٠٠ و٥٠٠ و٧٠٠ فقط، بينما المشروع يستعمل `font-extrabold`
   (وزن ٨٠٠) في **مئات** المواضع. الوزن غير المحمَّل لا يُرسَم عريضاً
   حقيقياً — المتصفّح إمّا يُرجعه إلى ٧٠٠ أو يزيّفه بتغليظ اصطناعي
   يُشوّه حروف العربية. تحميل ٨٠٠ يجعل كل ما كُتب `extrabold` عريضاً
   فعلاً، وهو أوضح فارق بصريّ في المنصّة كلّها. */
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
  adjustFontFallback: true,
});

/* خطّ العناوين: أُضيف ٩٠٠ للعناوين الكبرى — العنوان العربي يحتاج
   وزناً أثقل من اللاتيني ليقرأ «عنواناً» على شاشة الهاتف. */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
  adjustFontFallback: true,
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com").replace(/\/+$/, "");
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
  manifest: "/manifest.json",
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
  /* الأيقونات محلّية: كانت تُحمَّل من `blogger.googleusercontent.com`
     — نداء إلى نطاق ثالث على المسار الحرج لكل صفحة، وخارج سيطرتنا
     تماماً لو تغيّر أو حُذف. الملفّات في `public/` أصلاً. */
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
    shortcut: "/favicon.ico",
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
  maximumScale: 1, // مهم للسبورة وغرفة الدراسة على الجوال
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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${cairo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
