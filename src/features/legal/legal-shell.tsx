import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { absUrl } from "@/lib/site-url";
import { LEGAL_LINKS } from "@/features/settings/legal-links";

export function LegalShell({ title, intro, path, updated, children, afterContent }: { title: string; intro: string; path: string; updated: string; children: React.ReactNode; afterContent?: React.ReactNode }) {
  const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: title, description: intro, url: absUrl(path), inLanguage: "ar", dateModified: updated, isPartOf: { "@type": "WebSite", name: "BacZoneDZ", url: absUrl("/") } }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") }, { "@type": "ListItem", position: 2, name: title, item: absUrl(path) }] }] };
  const otherLinks = LEGAL_LINKS.filter((link) => link.href !== path);
  return <>
    <PublicHeader />
    <main className="bz-legal-page min-h-screen bg-[var(--bz-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-legal-hero-pro">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
          <nav aria-label="مسار التنقّل" className="flex items-center gap-2 text-[11px] text-white/65"><Link href="/" className="hover:text-white hover:underline">الرئيسية</Link><span>←</span><span className="font-bold text-white">{title}</span></nav>
          <div className="bz-legal-hero-grid mt-8"><div><span className="bz-legal-kicker">BacZone · معلومات تهمّك</span><h1 className="mt-4 font-display text-[29px] font-extrabold leading-[1.25] text-white sm:text-[46px]">{title}</h1><p className="mt-4 max-w-2xl text-[14px] leading-[2] text-white/78 sm:text-[16px]">{intro}</p></div><div className="bz-legal-hero-stamp"><b>آخر تحديث</b><time dateTime={updated}>{updated}</time><span>نكتب بوضوح، ونراجع المعلومات باستمرار.</span></div></div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-10">
        <div className="bz-legal-page-grid">
          <aside className="bz-legal-nav" aria-label="روابط مفيدة"><span>في هذه الصفحات</span><strong>معلومات BacZone</strong><div>{otherLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}<span>←</span></Link>)}</div><Link href="/contact" className="bz-legal-contact-link">هل لديك سؤال؟ تواصل معنا <span>←</span></Link></aside>
          <article className="bz-legal bz-legal-pro">{children}<nav aria-label="صفحات أخرى" className="bz-legal-bottom-nav">{otherLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></article>
        </div>
        {afterContent && <div className="-mx-4">{afterContent}</div>}
      </div>
    </main>
    <SiteFooter />
  </>;
}
