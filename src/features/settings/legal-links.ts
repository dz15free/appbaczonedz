/* ════════════════════════════════════════════════════════════
   الروابط القانونية — مصدر واحد

   يستوردها الفوتر، وقائمة `robots`، وخريطة الموقع، ولوحة الإدارة
   (لتُخبر الأدمن أنّها ثابتة ولا تُحرّر من صفّ الروابط).

   ملفّ ورقة بلا تبعيّات ولا `"use client"` — فيصلح للخادم والعميل معاً.
   ════════════════════════════════════════════════════════════ */

export interface LegalLink { href: string; label: string; short: string }

export const LEGAL_LINKS: LegalLink[] = [
  { href: "/blog",    label: "المقالات",          short: "المقالات" },
  { href: "/about",   label: "من نحن",            short: "من نحن" },
  { href: "/contact", label: "اتصل بنا",           short: "اتصل بنا" },
  { href: "/privacy", label: "سياسة الخصوصية",    short: "الخصوصية" },
  { href: "/terms",   label: "شروط الاستخدام",    short: "الشروط" },
];

/** المسارات وحدها — لقائمة السماح في robots ولخريطة الموقع */
export const LEGAL_PATHS = LEGAL_LINKS.map((l) => l.href);
