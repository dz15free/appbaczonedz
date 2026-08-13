
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { linkOf } from "@/features/guide/spec-link";
import type { SpecFull } from "@/features/guide/guide-merge";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

const SECTIONS: { key: keyof SpecFull; label: string; icon: IconName; tone?: "pro" | "con" }[] = [
  { key: "intro", label: "ما هو هذا التخصّص؟", icon: "book" },
  { key: "study", label: "نظام الدراسة ومدّتها", icon: "layers" },
  { key: "admission", label: "القبول والمعدّلات", icon: "target" },
  { key: "subjects", label: "المواد التي تدرسها", icon: "file" },
  { key: "careers", label: "أين تعمل بعد التخرّج", icon: "users" },
  { key: "pros", label: "ما يجذب إليه", icon: "star", tone: "pro" },
  { key: "cons", label: "ما يجب أن تعرفه قبل الاختيار", icon: "target", tone: "con" },
  { key: "modules", label: "المقاييس ولغة التدريس", icon: "book" },
  { key: "daily", label: "يومك الدراسي عملياً", icon: "timer" },
  { key: "where", label: "أين يُدرَّس في الجزائر؟", icon: "home" },
  { key: "numbers", label: "التخصّص بالأرقام", icon: "poll" },
  { key: "master", label: "ماذا بعد الليسانس؟", icon: "layers" },
  { key: "future", label: "الآفاق المستقبلية", icon: "target" },
  { key: "salary", label: "الأجر والمنح", icon: "star" },
  { key: "prosCons", label: "مميّزات وعيوب", icon: "shapes" },
  { key: "voices", label: "من داخل التخصّص: ما يقوله طلبته", icon: "chat" },
  { key: "verdict", label: "الخلاصة", icon: "check" },
];

function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  return <>{parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="font-extrabold text-[var(--bz-ink)]">{part}</strong> : <span key={index}>{part}</span>)}</>;
}

function Body({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((paragraph, index) => {
    const value = paragraph.trim();
    if (!value) return null;
    if (value.startsWith("•") || value.startsWith("-")) {
      return <ul key={index} className="bz-spec-list">{value.split("\n").filter(Boolean).map((item, itemIndex) => <li key={itemIndex}><Rich text={item.replace(/^[•\-]\s*/, "")} /></li>)}</ul>;
    }
    return <p key={index} className="bz-spec-p"><Rich text={value} /></p>;
  })}</>;
}

export function SpecNotFound({ spec }: { spec?: SpecFull | null }) {
  return <>
    <PublicHeader />
    <main className="bz-empty-public mx-auto max-w-2xl px-4 py-16 text-center">
      <span className="bz-empty-public-mark"><Icon name="book" size={21} /></span>
      <h1 className="mt-5 font-display text-[22px] font-extrabold leading-snug">{spec ? `تخصّص ${spec.ar} — قيد الإعداد` : "لم نجد هذا التخصّص"}</h1>
      <p className="mx-auto mt-2.5 max-w-md text-[15px] leading-[1.9] text-[var(--bz-ink-2)]">{spec ? "نكتب شرح هذا التخصّص حالياً. عد قريباً، أو تصفّح بقيّة التخصّصات." : "ربما تغيّر الرابط. تصفّح الدليل للعثور على تخصّصك."}</p>
      <Link href="/specialties" className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--bz-blue)] px-5 text-[14px] font-extrabold text-white"><Icon name="chevRight" size={14} /> كل التخصّصات</Link>
    </main>
    <PublicCta />
  </>;
}

export function SpecArticle({ spec, rows }: { spec: SpecFull; rows: SpecFull[] }) {
  const written = SECTIONS.filter(({ key }) => {
    const value = spec[key];
    return typeof value === "string" && value.trim().length > 0;
  });
  const related = rows.filter((row) => row.field === spec.field && row.slug !== spec.slug && row.published).slice(0, 6);
  const introText = spec.excerpt || (spec.intro ?? "").replace(/\*\*/g, "");
  const articleUrl = `/specialties/${linkOf(spec)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `تخصّص ${spec.ar}${spec.fr ? ` — ${spec.fr}` : ""}`,
    description: introText.slice(0, 160),
    inLanguage: "ar",
    about: { "@type": "Thing", name: spec.field },
    publisher: { "@type": "Organization", name: "BacZone" },
    ...(spec.updatedAt ? { dateModified: new Date(spec.updatedAt).toISOString() } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(articleUrl) },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "دليل التخصّصات", item: absUrl("/specialties") },
      { "@type": "ListItem", position: 2, name: spec.field, item: absUrl(`/specialties#${encodeURIComponent(spec.field)}`) },
      { "@type": "ListItem", position: 3, name: spec.ar, item: absUrl(articleUrl) },
    ],
  };

  return <>
    <PublicHeader />
    <main className="bz-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="bz-spec-hero-pro bz-spec-editorial-hero">
        <div className="bz-spec-hero-orb bz-spec-hero-orb-one" />
        <div className="bz-spec-hero-orb bz-spec-hero-orb-two" />
        <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
          <nav className="bz-spec-breadcrumb mb-7 flex flex-wrap items-center gap-2 text-[11px] text-white/65" aria-label="مسار الصفحة">
            <Link href="/specialties" className="font-bold text-white hover:underline">دليل التخصّصات</Link><span>←</span><Link href={`/specialties#${encodeURIComponent(spec.field)}`} className="hover:text-white hover:underline">{spec.field}</Link><span>←</span><span className="text-white/80">{spec.ar}</span>
          </nav>
          <div className="bz-spec-editorial-grid">
            <div className="bz-spec-editorial-copy">
              <div className="bz-spec-identity-line"><span className="bz-spec-hero-kicker"><Icon name="compass" size={12} /> دليل اختيار التخصّص</span><span className="bz-spec-field-pill">{spec.field}</span></div>
              <h1 className="mt-4 max-w-3xl font-display text-[30px] font-extrabold leading-[1.23] sm:text-[48px]">{spec.ar}</h1>
              {spec.fr && <p className="mt-2 text-[13px] font-bold tracking-wide text-white/65" dir="ltr">{spec.fr}</p>}
              <p className="bz-spec-editorial-intro mt-5 max-w-2xl text-[14px] leading-[2] text-white/80 sm:text-[16px]">{introText || "اقرأ الدليل كاملاً قبل اتخاذ قرارك الدراسي."}</p>
              <div className="bz-spec-hero-actions"><a href="#guide-content"><Icon name="chevDown" size={13} /> ابدأ القراءة</a><Link href="/specialties">تصفّح كل التخصّصات <Icon name="chevLeft" size={12} /></Link></div>
            </div>
            <aside className="bz-spec-hero-summary bz-spec-editorial-summary" aria-label="ملخص التخصص">
              <span className="bz-spec-summary-label">اقرأ قبل أن تختار</span>
              <div className="bz-spec-editorial-summary-lead">هذا الدليل يجمع المعلومات الموجودة عن المسار في قراءة واحدة، من طبيعة الدراسة إلى ما ينبغي معرفته قبل القرار.</div>
              <div className="bz-spec-summary-row"><small>المجال</small><b>{spec.field}</b></div>
              <div className="bz-spec-summary-row"><small>أقسام الدليل المتاحة</small><b>{written.length} قسم مفصّل</b></div>
            </aside>
          </div>
        </div>
      </header>

      <PublicSidebarLayout placement="guides">
        <article id="guide-content" className="bz-spec-article-pro mx-auto w-full max-w-6xl px-4 pb-14 pt-7">
          <div className="bz-spec-lede bz-spec-lede-editorial"><div className="bz-spec-lede-mark"><Icon name="ai" size={17} /></div><div><span>خلاصة البداية</span><p>{introText || "هذا الدليل يجمع أهم ما تحتاجه لفهم التخصّص ومساره وآفاقه."}</p></div><span className="bz-spec-lede-count">{written.length} أقسام</span></div>
          <div className="bz-spec-reading-layout">
            {written.length > 1 && <aside className="bz-spec-sticky-toc" aria-label="أقسام الدليل"><p><Icon name="file" size={13} /> في هذا الدليل <b>{written.length}</b></p><div>{written.map(({ key, label }, index) => <a key={String(key)} href={`#sec-${String(key)}`}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}</div></aside>}
            <div className="bz-spec-sections">
              {SECTIONS.map(({ key, label, icon, tone }) => {
                const value = spec[key];
                if (typeof value !== "string" || !value.trim()) return null;
                const sectionNumber = written.findIndex((item) => item.key === key) + 1;
                return <section key={String(key)} id={`sec-${String(key)}`} className={`bz-spec-sec bz-spec-sec-pro ${tone ? `is-${tone}` : ""}`}>
                  <div className="bz-spec-sec-heading"><span><Icon name={icon} size={15} /></span><div><small>القسم {String(sectionNumber).padStart(2, "0")}</small><h2>{label}</h2></div></div>
                  <Body text={value} />
                  {key === "admission" && <p className="bz-spec-note">المعدّلات مؤشّر من سنوات سابقة وتتغيّر كل سنة بحسب عدد الناجحين ورغباتهم — لا تعتبرها ضماناً.</p>}
                </section>;
              })}
            </div>
          </div>
          {related.length > 0 && <aside className="bz-spec-related-pro"><div><span>مقترحات من نفس الميدان</span><h2>قد تجد ضالتك في تخصّص قريب</h2></div><div className="bz-spec-related-grid">{related.map((row) => <Link key={row.slug} href={`/specialties/${linkOf(row)}`}><span>{row.ar}</span><Icon name="chevLeft" size={13} /></Link>)}</div></aside>}
        </article>
      </PublicSidebarLayout>
      <PublicCta title={`تدرس ${spec.ar}؟ جهّز معدّلك أوّلاً`} hint="انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، وملخّصات لكل الشُّعب — مجّاناً." />
    </main>
  </>;
}
