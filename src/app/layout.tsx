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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // مهم للسبورة وغرفة الدراسة على الجوال
  themeColor: "#4f46e5",
};

// منع وميض الثيم: نطبّق الوضع الداكن قبل رسم الصفحة
const noFlashScript = `
(function(){try{var t=localStorage.getItem('bz-theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();
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
