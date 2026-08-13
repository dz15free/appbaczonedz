import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faChevronLeft,
  faFlag,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FaviconSync, LandingFaqRow } from "@/components/landing/landing-client";
import { getPublicSiteSettings } from "@/features/settings/site-settings-server";
import { GUIDES } from "@/features/guides/guides-data";
import { TOOLS } from "@/features/tools/tools-data";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { DEFAULT_LOGO } from "@/lib/brand-assets";
import { PublicRootGate } from "@/components/ui/public-root-gate";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BacZone — منصة الدراسة التفاعلية لطلاب البكالوريا",
  description: "منصة دراسة تفاعلية لطلاب البكالوريا في الجزائر: أدوات، أدلة، مجتمع، غرف دراسة ودورات في مكان واحد.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "/",
    title: "BacZone — ادرس أذكى وراجع أسرع",
    description: "بوابتك إلى أدوات البكالوريا والأدلة والمجتمع الدراسي.",
    siteName: "BacZone",
  },
};

export default async function LandingPage() {
  const s = await getPublicSiteSettings();
  const publicTools = TOOLS.filter((tool) => !tool.needsAccount).slice(0, 8);
  const landingGuides = GUIDES.slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: s.siteName || "BacZone",
        description: "منصة دراسة تفاعلية لطلاب البكالوريا في الجزائر.",
        url: "https://baczone.app/",
        inLanguage: "ar",
      },
      {
        "@type": "Organization",
        name: s.siteName || "BacZone",
        url: "https://baczone.app/",
        logo: s.logoUrl || DEFAULT_LOGO,
      },
    ],
  };

  return (
    <PublicRootGate>
      <main className="relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)] text-[var(--bz-text)] antialiased selection:bg-blue-500/30">
      <FaviconSync href={s.faviconUrl} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader variant="landing" />

      <section className="relative overflow-hidden bg-[#07080f] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-blue-600/25 blur-[140px]" />
          <div className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#07080f_75%)]" />
        </div>
        <div className="relative mx-auto grid min-h-[min(760px,100svh)] max-w-6xl items-center gap-12 px-5 pb-24 pt-32 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:pb-28 lg:pt-40">
          <div className="text-center lg:text-right">
            {s.landingBadge && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12px] font-semibold text-blue-200/90 backdrop-blur-md sm:text-[13px]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20"><FontAwesomeIcon icon={faFlag} className="h-2.5 w-2.5 text-blue-300" /></span>
                {s.landingBadge}
              </div>
            )}
            <h1 className="max-w-3xl font-display text-[2.2rem] font-extrabold leading-[1.28] tracking-tight sm:text-5xl sm:leading-[1.2] md:text-[4rem]">
              <span className="block">{s.heroTitleLine1}</span>
              <span className="mt-2 block bg-gradient-to-l from-blue-400 via-sky-300 to-emerald-300 bg-clip-text pb-3 pt-1 text-transparent sm:mt-3">{s.heroTitleLine2}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg lg:mx-0">{s.heroSubtitle}</p>
            <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4 lg:justify-start">
              <Link href="/register" className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 px-7 py-4 text-[15px] font-bold text-white shadow-[0_16px_40px_-12px_rgba(37,99,235,0.7)] transition hover:brightness-110 active:scale-[0.98] sm:px-9">
                <span className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10 opacity-0 transition group-hover:opacity-100" />
                {s.heroCtaPrimary}
                <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
              </Link>
              <Link href="/login" className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-7 py-4 text-[15px] font-bold text-white backdrop-blur-sm transition hover:bg-white/[0.1] active:scale-[0.98] sm:px-9">{s.heroCtaSecondary}</Link>
            </div>
            {(s.badges ?? []).length > 0 && (
              <div className="mt-10 flex max-w-2xl flex-wrap justify-center gap-2.5 lg:justify-start">
                {(s.badges ?? []).map((badge) => (
                  <div key={badge.id} className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm sm:text-[13px]">
                    <DynamicIcon value={badge.icon} className="h-3.5 w-3.5 text-blue-300" emojiClass="text-sm" />{badge.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        <div className="absolute inset-x-0 bottom-0 h-14 bg-[var(--bz-bg)] [clip-path:ellipse(70%_100%_at_50%_100%)] sm:h-20" />
      </section>

      <PublicSidebarLayout placement="global" includeArticles={false}>
        <section className="px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">أدوات عملية</span><h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">ابدأ بما تحتاجه اليوم</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">أدوات موجودة فعليًا في BacZone تساعدك على الحساب، التخطيط، التدريب واتخاذ قرارك الدراسي.</p></div><Link href="/tools" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">كل الأدوات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {publicTools.map((tool) => (<Link key={tool.href} href={tool.href} className="group rounded-2xl border border-border/60 bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white"><FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4" /></span><h3 className="mt-4 text-[15px] font-extrabold leading-snug">{tool.name}</h3><p className="mt-2 text-[12.5px] leading-relaxed text-text-muted">{tool.desc}</p><span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">{tool.cta}<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></Link>))}
            </div>
          </div>
        </section>

        {(s.steps ?? []).length > 0 && <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-5xl"><div className="mb-10 text-center sm:mb-14"><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">كيف تعمل المنصة</span><h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">{s.stepsTitle}</h2></div><div className="grid gap-5 sm:grid-cols-3 sm:gap-6">{(s.steps ?? []).map((step) => <div key={step.id} className="group relative overflow-hidden rounded-3xl border border-border/60 bg-[var(--bz-bg)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl sm:p-7"><div className="absolute -right-4 -top-4 select-none text-[5.5rem] font-black leading-none text-primary/[0.04]">{step.n}</div><div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-base font-extrabold text-white shadow-lg shadow-blue-500/25">{step.n}</div><h3 className="relative mt-5 font-display text-lg font-bold">{step.title}</h3><p className="relative mt-2 text-[13.5px] leading-relaxed text-text-muted">{step.desc}</p></div>)}</div></div></section>}

        {(s.audience ?? []).length > 0 && <section className="px-5 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-5xl"><div className="mb-10 text-center"><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">للطلاب والأساتذة</span><h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{s.audienceTitle}</h2><p className="mx-auto mt-3 max-w-lg text-sm text-text-muted">{s.audienceSubtitle}</p></div><div className="grid gap-5 md:grid-cols-2">{(s.audience ?? []).map((item, index) => <article key={item.id} className={`rounded-3xl border p-6 sm:p-8 ${index === 0 ? "border-blue-500/20 bg-blue-500/[0.06]" : "border-emerald-500/20 bg-emerald-500/[0.06]"}`}><div className="flex gap-5"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white"><DynamicIcon value={item.icon} className="h-6 w-6" emojiClass="text-2xl" /></div><div><h3 className="font-display text-xl font-extrabold">{item.title}</h3><p className="mt-2.5 text-[14px] leading-[1.9] text-text-muted">{item.desc}</p></div></div></article>)}</div></div></section>}

        {(s.features ?? []).length > 0 && <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-6xl"><div className="mb-10 text-center"><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">داخل BacZone</span><h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{s.featuresTitle}</h2><p className="mx-auto mt-3 max-w-lg text-sm text-text-muted">{s.featuresSubtitle}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(s.features ?? []).slice(0, 9).map((feature) => <article key={feature.id} className="rounded-2xl border border-border/50 bg-[var(--bz-bg)] p-5 transition hover:-translate-y-1 hover:border-primary/30"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><DynamicIcon value={feature.icon} className="h-5 w-5" emojiClass="text-xl" /></div><h3 className="mt-4 text-[15px] font-bold">{feature.title}</h3><p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{feature.desc}</p></article>)}</div></div></section>}


        {landingGuides.length > 0 && <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-6xl"><div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">أدلة الدراسة</span><h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">أدلة تساعدك على التقدّم</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">محتوى مرجعي موجود فعليًا في BacZone، يمكنك العودة إليه أثناء المراجعة.</p></div><Link href="/guides" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">كل الأدلة <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link></div><div className="grid gap-4 md:grid-cols-3">{landingGuides.map((guide) => <Link key={guide.slug} href={`/guides/${guide.slug}`} className="rounded-2xl border border-border/60 bg-[var(--bz-bg)] p-5 transition hover:-translate-y-1 hover:border-primary/30"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: guide.color }}><FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" /></span><span className="text-sm font-extrabold leading-snug">{guide.title}</span></div><p className="mt-4 text-[13px] leading-relaxed text-text-muted">{guide.description}</p><span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">اقرأ الدليل <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></Link>)}</div></div></section>}

        {(s.faq ?? []).length > 0 && <section className="px-5 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-3xl"><h2 className="text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{s.faqTitle}</h2><div className="mt-10 space-y-3">{(s.faq ?? []).map((faq) => <LandingFaqRow key={faq.id} q={faq.q} a={faq.a} />)}</div></div></section>}
      </PublicSidebarLayout>

      <section className="relative overflow-hidden bg-[#07080f] px-5 py-20 text-white sm:px-6 sm:py-28"><div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" /><div className="relative mx-auto max-w-xl text-center"><img src={s.logoUrl || DEFAULT_LOGO} alt="" width={72} height={72} className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain shadow-[0_0_48px_-8px_rgba(59,130,246,0.6)]" /><h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">{s.ctaTitle}</h2><p className="mx-auto mt-4 max-w-md text-[15px] text-white/55">{s.ctaSubtitle}</p><Link href="/register" className="mt-9 inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-[15px] font-bold text-slate-900 shadow-2xl transition hover:bg-white/95 active:scale-[0.98]"><span>{s.ctaButton}</span><FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link></div></section>
        <SiteFooter variant="full" />
      </main>
    </PublicRootGate>
  );
}
