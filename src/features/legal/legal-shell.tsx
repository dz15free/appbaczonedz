import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { absUrl } from "@/lib/site-url";
import { LEGAL_LINKS } from "@/features/settings/legal-links";

/* ════════════════════════════════════════════════════════════
   غلاف الصفحات القانونية والتعريفية

   مكوّن **خادم** (بلا `"use client"`): هذه صفحات نصّية تُقرأ ولا
   تُستعمل، فلا سبب لإرسال جافاسكربت من أجلها. الترويسة والفوتر
   مكوّنان عميلان يُغلَّفان هنا، ويبقى النصّ نفسه HTML خالصاً — وهو ما
   يريده الزاحف وما يحفظ Core Web Vitals.

   ومسار التنقّل (`BreadcrumbList`) حقيقيّ لا تزيينيّ: صفحتان فعليّتان
   (الرئيسية ← هذه الصفحة). لا نُصرّح ببيانات منظّمة لا تُقابلها عناصر
   على الصفحة.
   ════════════════════════════════════════════════════════════ */

export function LegalShell({
  title,
  intro,
  path,
  updated,
  children,
}: {
  title: string;
  intro: string;
  path: string;
  /** تاريخ آخر تحديث — يُكتب في الشيفرة فلا يتغيّر بمجرّد إعادة النشر */
  updated: string;
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        description: intro,
        url: absUrl(path),
        inLanguage: "ar",
        dateModified: updated,
        isPartOf: { "@type": "WebSite", name: "BacZoneDZ", url: absUrl("/") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
          { "@type": "ListItem", position: 2, name: title, item: absUrl(path) },
        ],
      },
    ],
  };

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <header className="border-b border-border bg-surface">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-11">
            <nav aria-label="مسار التنقّل" className="text-[12px] text-text-muted">
              <Link href="/" className="hover:text-primary hover:underline">الرئيسية</Link>
              <span className="mx-1.5">/</span>
              <span className="text-text">{title}</span>
            </nav>
            <h1 className="mt-2.5 font-display text-[25px] font-extrabold leading-[1.3] text-text sm:text-[32px]">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-text-muted sm:text-[15px]">
              {intro}
            </p>
            <p className="mt-3 text-[12px] text-text-muted">
              آخر تحديث: <time dateTime={updated}>{updated}</time>
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <article className="bz-legal">{children}</article>

          {/* تنقّل بين الصفحات القانونية — الزائر الذي يقرأ الخصوصية
              يبحث عن الشروط عادةً، فلا نُلزمه بالعودة إلى الفوتر. */}
          <nav
            aria-label="صفحات أخرى"
            className="mt-10 flex flex-wrap gap-2 border-t border-border pt-5"
          >
            {LEGAL_LINKS.filter((l) => l.href !== path).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-text-muted transition hover:border-primary/40 hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
