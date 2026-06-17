import type { Metadata, Viewport } from "next";
import { Tajawal, Cairo } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Preloader } from "@/components/preloader";

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

export const metadata: Metadata = {
  title: "BacZoneDZ — أكبر مجتمع دراسي لطلاب البكالوريا في الجزائر",
  description:
    "منصة تعليمية ومجتمع دراسي متكامل لطلاب البكالوريا الجزائريين: غرف دراسة، سبورة ذكية، مشاركة ملفات، صوت جماعي، ومساعد ذكي.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // مهم للسبورة وغرفة الدراسة على الجوال
  themeColor: "#4f46e5",
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
        <Preloader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
