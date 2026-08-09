import type { Metadata, Viewport } from "next";
import { Tajawal, Cairo } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Preloader } from "@/components/preloader";
import { SITE_URL } from "@/features/guide/site-url";

// نمنع FontAwesome من حقن CSS تلقائياً (نستورده يدوياً أعلاه)
config.autoAddCss = false;

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const SITE_NAME = "BacZoneDZ";
const SITE_TITLE = "BacZoneDZ — منصّة ومجتمع طلاب البكالوريا في الجزائر";
const SITE_DESC =
  "منصّة تعليمية ومجتمع دراسي متكامل لطلبة البكالوريا في الجزائر: دورات، غرف مراجعة مباشرة، " +
  "سبورة ذكية، ملخّصات ومواضيع، حاسبة المعدّل، ودليل التخصّصات الجامعية.";

export const metadata: Metadata = {
  /* 🐛 غياب `metadataBase` كان يجعل Next يحلّ **كل** رابط نسبيّ في
     المشروع مقابل `http://localhost:3000`. أي أنّ وسوم canonical وOG
     في صفحات التخصّصات والحاسبة والدورات كانت تشير إلى جهاز التطوير
     في الإنتاج — وهي من أسوأ إشارات السيو الممكنة. */
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
  /* الأيقونات صارت محلّية: كانت تُحمَّل من blogger.googleusercontent.com
     — نداء إلى نطاق خارجي على المسار الحرج لكل صفحة، وخارج سيطرتنا
     تماماً لو تغيّر أو حُذف. الملفّات موجودة في `public/` أصلاً. */
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
  /* 🐛 كان `maximumScale: 1` هنا فيُعطَّل التكبير في **كل** الموقع —
     المكتبة، والمجتمع، ومقالات التخصّصات — لا في السبورة وحدها.
     وهو مخالف لمعيار الإتاحة WCAG 1.4.4، ويؤذي فعلياً طالباً ضعيف
     البصر يقرأ مقالاً. السبورة تمنع التكبير داخلها بـ`touch-action`
     في CSS، وهو المكان الصحيح لذلك. */
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
      <body className="min-h-screen font-sans antialiased">
        {/* بيانات منظّمة على مستوى الموقع: تُعرّف المنصّة لمحرّكات
            البحث وتفعّل مربّع البحث في نتيجة Google. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: `${SITE_URL}/icon-512.png`,
              description: SITE_DESC,
              areaServed: { "@type": "Country", name: "الجزائر" },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              inLanguage: "ar",
            },
          ]) }}
        />
        <Preloader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
