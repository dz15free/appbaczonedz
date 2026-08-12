"use client";

import Link from "next/link";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { LEGAL_LINKS } from "@/features/settings/legal-links";

/* ════════════════════════════════════════════════════════════
   فوتر واحد للموقع كلّه

   🐛 كان هناك **فوتران مستقلّان** يتفرّقان:

   ١) في `app-shell.tsx`: يقرأ `footerText` **و**`footerLinks`، ويرسم كل
      رابط `<a target="_blank">` — أي أنّ رابطاً داخلياً مثل
      `/privacy` كان سيُفتح في تبويب جديد ويُعاد تحميل التطبيق كلّه.
   ٢) في صفحة الهبوط: يقرأ `footerText` وحده و**يتجاهل `footerLinks`
      تماماً**، ويكتب `/login` و`/register` بيده. فما يضيفه الأدمن من
      لوحته لا يظهر في أهمّ صفحة عامّة في الموقع.

   ولذلك «الدمج» هنا ليس تجميلاً: هو الشرط لأن يعمل ما يضبطه الأدمن في
   كل مكان. مكوّن واحد يستعمله غلاف المنصّة والغلاف العامّ وصفحة الهبوط.

   ── صفّان، والفصل بينهما مقصود ──

   • صفّ الأدمن: `footerLinks` كما هي، قابلة للتحرير والحذف بحرّية.
   • صفّ قانونيّ **ثابت في الشيفرة**: الخصوصية والشروط ومن نحن واتصل بنا.

   ولماذا الثاني ثابت؟ لأنّ وجود سياسة الخصوصية شرطٌ في سياسات AdSense،
   ولا يجوز أن يتعلّق قبول الموقع بألّا يحذف أحدٌ صفّاً من لوحة الإدارة
   سهواً. ما يمكن أن يُحذف بضغطة لا يُبنى عليه امتثال. والصفّان في
   **فوتر واحد** لا فوترين — فهذا دمج لا ازدواج.

   ── الروابط الداخلية والخارجية ──
   الداخلي (`/…`) بـ`next/link` في التبويب نفسه — تنقّل فوريّ بلا إعادة
   تحميل. والخارجي بـ`<a target="_blank" rel="noopener">` — و`noopener`
   ليست زينة: بلاها يصل الموقع المفتوح إلى `window.opener`.
   ════════════════════════════════════════════════════════════ */

const PUBLIC_FOOTER_LINKS = [
  { href: "/tools", label: "الأدوات" },
  { href: "/specialties", label: "التخصصات" },
  { href: "/guides", label: "الأدلة" },
  { href: "/blog", label: "المدونة" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  const internal = href.startsWith("/");
  const cls = "transition hover:text-primary hover:underline";
  if (internal) return <Link href={href} className={cls}>{label}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {label}
    </a>
  );
}

export function SiteFooter({
  /** `full` لصفحة الهبوط (شعار واسم)، `compact` داخل المنصّة */
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();
  const text = settings.footerText || `© ${year} BacZoneDZ. جميع الحقوق محفوظة.`;
  const custom = settings.footerLinks ?? [];

  return (
    <footer
      className={`border-t border-border bg-surface px-4 text-center text-xs text-text-muted ${
        variant === "full" ? "py-9" : "py-4 pb-24 lg:pb-4"
      } ${className}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2.5">
        {variant === "full" && (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl || "/icon.svg"}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-display text-base font-bold text-text">
              {settings.siteName || "BacZoneDZ"}
            </span>
          </div>
        )}

        <p className={variant === "full" ? "text-[13px]" : ""}>{text}</p>

        {variant === "full" && (
          <nav aria-label="روابط الموقع" className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {PUBLIC_FOOTER_LINKS.map((l) => <FooterLink key={l.href} href={l.href} label={l.label} />)}
          </nav>
        )}

        {/* صفّ الأدمن — ما يضبطه من لوحته، ويظهر الآن في كل مكان */}
        {custom.length > 0 && (
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {custom.map((l, i) => (
              <FooterLink key={`c${i}`} href={l.href} label={l.label} />
            ))}
          </nav>
        )}

        {/* الصفّ القانونيّ — ثابت، لا يُحذف من لوحة الإدارة */}
        <nav
          aria-label="روابط قانونية"
          className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5"
        >
          {LEGAL_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>
      </div>
    </footer>
  );
}
