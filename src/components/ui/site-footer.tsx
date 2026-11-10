"use client";

import Link from "next/link";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { LEGAL_LINKS } from "@/features/settings/legal-links";

function FooterLink({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  const internal = href.startsWith("/");
  const cls = `bz-footer-link${compact ? " bz-footer-link-compact" : ""}`;
  if (internal) return <Link href={href} className={cls}>{label}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return <div><h3 className="bz-footer-column-title">{title}</h3><nav className="bz-footer-column-links">{links.map((link) => <FooterLink key={`${title}-${link.href}`} {...link} />)}</nav></div>;
}

export function SiteFooter({
  variant = "compact",
  className = "",
  landingDescription,
}: {
  variant?: "compact" | "full";
  className?: string;
  landingDescription?: string;
}) {
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();
  const copyright = settings.footerText || `© ${year} BacZone. جميع الحقوق محفوظة.`;
  const custom = settings.footerLinks ?? [];
  const legal = LEGAL_LINKS.filter((link) => ["/about", "/contact", "/privacy", "/terms"].includes(link.href));

  if (variant === "full") {
    return (
      <footer className={`bz-site-footer ${className}`}>
        <div className="bz-site-footer-inner">
          <div className="bz-footer-grid">
            <div className="bz-footer-brand-block">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logoUrl || "/icon.svg"} alt={settings.siteName || "BacZone"} width={48} height={48} className="h-12 w-12 rounded-2xl object-contain" />
                <span className="font-display text-2xl font-black text-white">{settings.siteName || "BacZone"}</span>
              </div>
              <p>{landingDescription || copyright}</p>
            </div>
            <FooterColumn title="استكشف" links={[{ href: "/tools", label: "الأدوات" }, { href: "/blog", label: "المقالات" }, { href: "/guides", label: "الأدلة" }, { href: "/specialties", label: "التخصصات" }]} />
            <FooterColumn title="المنصة" links={[{ href: "/courses", label: "الدورات" }, { href: "/rooms", label: "الغرف" }, { href: "/community", label: "المجتمع" }, { href: "/library", label: "المكتبة" }]} />
            <FooterColumn title="عن BacZone" links={legal.map((link) => ({ href: link.href, label: link.label === "شروط الاستخدام" ? "اتفاقية الاستخدام" : link.label }))} />
            <FooterColumn title="الحساب" links={[{ href: "/login", label: "دخول" }, { href: "/register", label: "إنشاء حساب" }]} />
          </div>
          {custom.length > 0 && <nav aria-label="روابط إضافية" className="bz-footer-custom-links">{custom.map((link, index) => <FooterLink key={`custom-${index}`} href={link.href} label={link.label} />)}</nav>}
          <div className="bz-footer-bottom"><span>{copyright}</span></div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`border-t border-border bg-surface px-4 py-4 pb-24 text-center text-xs text-text-muted lg:pb-4 ${className}`}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2.5"><p>{copyright}</p>{custom.length > 0 && <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">{custom.map((link, index) => <FooterLink key={`compact-${index}`} href={link.href} label={link.label} compact />)}</nav>}<nav aria-label="روابط قانونية" className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5">{LEGAL_LINKS.map((link) => <FooterLink key={link.href} href={link.href} label={link.href === "/terms" ? "اتفاقية الاستخدام" : link.label} compact />)}</nav></div>
    </footer>
  );
}
