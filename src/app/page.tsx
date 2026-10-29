import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalculator,
  faChalkboard,
  faChevronLeft,
  faClock,
  faGraduationCap,
  faListCheck,
  faPlay,
  faScaleBalanced,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FaviconSync, LandingFaqRow } from "@/components/landing/landing-client";
import { getPublicSiteSettings } from "@/features/settings/site-settings-server";
import { GUIDES } from "@/features/guides/guides-data";
import { TOOLS } from "@/features/tools/tools-data";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { DEFAULT_LOGO } from "@/lib/brand-assets";
import { PublicRootRedirect } from "@/components/ui/public-root-redirect";
import { LANDING } from "@/features/landing/landing-content";
import { FEATURE_PAGES } from "@/features/landing/features-data";
import { FEATURE_ICON } from "@/features/landing/feature-icon";
import { DEFAULT_AUTHOR } from "@/features/authors/authors";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BacZone — منصة الدراسة التفاعلية لتلاميذ البكالوريا",
  description: "أدوات للحساب والتخطيط والمحاكاة، محتوى وأدلة للمراجعة والتوجيه، ومجتمع وغرف تفاعلية لتلاميذ البكالوريا في الجزائر.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "/",
    title: "BacZone — منصة الدراسة التفاعلية لتلاميذ البكالوريا",
    description: "أدوات ومحتوى وغرف دراسة تساعدك على الاستعداد للبكالوريا بوضوح.",
    siteName: "BacZone",
  },
};

function toolIcon(href: string) {
  if (href.includes("weighted")) return faScaleBalanced;
  if (href.includes("exam")) return faVideo;
  if (href.includes("planner")) return faListCheck;
  if (href.includes("youtube")) return faPlay;
  if (href.includes("pomodoro")) return faClock;
  return faCalculator;
}

function articleDate(value?: number) {
  if (!value) return "مقال تعليمي";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}


export default async function LandingPage() {
  const s = await getPublicSiteSettings();
  const publicTools = TOOLS.filter((tool) => !tool.needsAccount).slice(0, 8);
  const landingGuides = GUIDES.slice(0, 4);
  const articles = (await getPublishedEntries()).slice(0, 6);
  const heroImage = s.landingHeroImageUrl || "/landing/baczone-student-hero.png";
  const footerDescription = s.landingFooterDescription || "منصّة دراسة تفاعلية لتلاميذ البكالوريا في الجزائر: مقالات وأدلّة وأدوات وغرف ومجتمع في مكان واحد.";
  const fields = SPEC_FIELDS.slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: s.siteName || "BacZone", description: metadata.description, url: "https://baczone.app/", inLanguage: "ar" },
      { "@type": "Organization", name: s.siteName || "BacZone", url: "https://baczone.app/", logo: s.logoUrl || DEFAULT_LOGO, founder: { "@type": "Person", name: DEFAULT_AUTHOR.name, url: `https://baczone.app/author/${DEFAULT_AUTHOR.slug}` } },
      { "@type": "FAQPage", mainEntity: LANDING.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <>
      <PublicRootRedirect />
      <main dir="rtl" className="bz-landing-v2 relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)] text-[var(--bz-text)] antialiased">
        <FaviconSync href={s.faviconUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PublicHeader variant="landing" />

        {/* ── البطل ── */}
        <section className="bz-landing-v2-hero relative isolate overflow-hidden bg-[#0C0F1E] text-white">
          <img src={heroImage} alt={s.landingHeroImageAlt || "تلميذ جزائري يراجع دروسه على الحاسوب"} className="bz-landing-hero-image absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0C0F1E]/15 via-[#0C0F1E]/60 to-[#0C0F1E]/96" />
          <div className="relative mx-auto flex min-h-[640px] max-w-7xl items-center px-5 pb-24 pt-28 sm:px-8 lg:min-h-[680px] lg:px-10 lg:pb-28 lg:pt-32" dir="ltr">
            <div className="bz-landing-hero-copy max-w-2xl text-left" dir="rtl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-bold text-white/85 backdrop-blur-md">
                <span className="bz-hero-margin" aria-hidden="true" />{LANDING.badge}
              </div>
              <h1 className="bz-landing-hero-title max-w-2xl font-display font-black tracking-tight">
                <span className="bz-landing-hero-title-lead">{LANDING.titleLead} <span className="bz-landing-hero-title-review">{LANDING.titleMid}</span></span>
                <span className="bz-landing-hero-title-success bz-hero-success">{LANDING.titleSuccess}</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-[2] text-white/78 sm:text-lg">{LANDING.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="bz-landing-primary-btn"><span>أنشئ حسابك مجّاناً</span><FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
                <Link href="/blog" className="bz-landing-ghost-btn">تصفّح المقالات<FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
              </div>
              <nav aria-label="روابط سريعة" className="bz-hero-quick mt-7">
                {LANDING.quickLinks.map((q) => <Link key={q.href} href={q.href}>{q.label}</Link>)}
              </nav>
            </div>
            <div className="bz-landing-mobile-visual" aria-hidden="true"><img src={heroImage} alt="" className="bz-landing-mobile-visual-image" /><span className="bz-landing-mobile-visual-shade" /></div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-[var(--bz-bg)] [clip-path:ellipse(70%_100%_at_50%_100%)] sm:h-16" />
        </section>

        <PublicSidebarLayout placement="global" includeArticles={false}>
          {/* ── ١: المحتوى أوّلاً ── */}
          <section className="px-5 pb-6 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-7xl">
              <div className="mb-7"><span className="bz-landing-kicker">ابدأ من حيث أنت</span><h2 className="bz-landing-section-title !text-right">اقرأ، افهم، ثمّ قرّر</h2><p className="bz-landing-section-subtitle !mx-0 !text-right">محتوى مكتوب لتلميذ البكالوريا الجزائري: كيف يراجع كلّ مادّة، وكيف يختار تخصّصه بعد النجاح.</p></div>
              <div className="bz-hub">
                <article className="bz-hub-col bz-hub-articles">
                  <header><h3>أحدث المقالات</h3><Link href="/blog">الكلّ <FontAwesomeIcon icon={faChevronLeft} className="h-2.5 w-2.5" /></Link></header>
                  <ul>
                    {articles.map((a) => (
                      <li key={a.id}>
                        <Link href={`/blog/${a.slug}`}>
                          <b>{a.title}</b>
                          <small>{articleDate(a.publishedAt)} · {a.readMinutes} دقائق قراءة</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="bz-hub-col">
                  <header><h3>دليل التخصّصات</h3><Link href="/specialties">الكلّ <FontAwesomeIcon icon={faChevronLeft} className="h-2.5 w-2.5" /></Link></header>
                  <p className="bz-hub-lede">{SPEC_INDEX.length} تخصّصاً ومدرسة عليا: ماذا تدرس فيه، كيف تُقبل، وأين تعمل بعده.</p>
                  <div className="bz-hub-chips">{fields.map((f) => <Link key={f} href="/specialties">{f}</Link>)}</div>
                </article>
                <article className="bz-hub-col">
                  <header><h3>أدلّة المراجعة</h3><Link href="/guides">الكلّ <FontAwesomeIcon icon={faChevronLeft} className="h-2.5 w-2.5" /></Link></header>
                  <ul>
                    {landingGuides.map((g) => <li key={g.slug}><Link href={`/guides/${g.slug}`}><b>{g.title}</b></Link></li>)}
                  </ul>
                </article>
              </div>
            </div>
          </section>

          {/* ── ٢: الأدوات المجّانية ── */}
          <section className="px-5 py-14 sm:px-8 sm:py-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="bz-landing-kicker">مجّانية وبلا حساب</span><h2 className="bz-landing-section-title !text-right">أدوات تستعملها اليوم</h2><p className="bz-landing-section-subtitle !mx-0 !text-right">احسب، خطّط، وتدرّب على ظروف الامتحان الحقيقية.</p></div><Link href="/tools" className="bz-landing-text-link">كلّ الأدوات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{publicTools.map((tool) => <Link key={tool.href} href={tool.href} className="bz-landing-tool-card"><span className="bz-landing-tool-icon" style={{ color: tool.color, backgroundColor: `${tool.color}14` }}><FontAwesomeIcon icon={toolIcon(tool.href)} /></span><h3>{tool.name}</h3><p>{tool.desc}</p><span className="bz-landing-card-link">{tool.cta}<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></Link>)}</div>
            </div>
          </section>

          {/* ── ٣: المنصّة — كل ميزة تقود إلى صفحتها العامّة ── */}
          <section className="bz-platform px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mb-9 text-center"><span className="bz-landing-kicker">ادرس مع الآخرين</span><h2 className="bz-landing-section-title">منصّة كاملة حين تحتاجها</h2><p className="bz-landing-section-subtitle">غرف بسبورة وصوت، ومجتمع حسب المادّة، ومساعدة ذكيّة. اضغط أيّ ميزة لترى كيف تعمل بالتفصيل.</p></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURE_PAGES.map((f) => (
                  <Link key={f.slug} href={`/features/${f.slug}`} className="bz-landing-info-card bz-feature-card">
                    <span className="bz-landing-icon-box"><FontAwesomeIcon icon={FEATURE_ICON[f.icon]} className="h-5 w-5" /></span>
                    <h3>{f.title}</h3>
                    <p>{f.short}</p>
                    <span className="bz-landing-card-link">كيف تعمل <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                  </Link>
                ))}
              </div>
              <div className="bz-landing-platform-shot mx-auto mt-10 max-w-5xl overflow-hidden rounded-[24px] border border-[var(--bz-line)] bg-[var(--bz-surface)] p-2 shadow-xl shadow-slate-900/10">
                <img src="/landing/baczonedz-dashboard-reference-v2.png" alt="لقطة من واجهة منصّة BacZone: المجتمع والغرف والأدوات" loading="lazy" className="block h-auto w-full rounded-[18px]" />
              </div>
            </div>
          </section>

          {/* ── ٤: لكلّ دور ── */}
          <section className="px-5 py-14 sm:px-8 sm:py-16">
            <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
              {LANDING.audience.map((c) => (
                <article key={c.kind} className={`bz-landing-audience-card ${c.kind === "teacher" ? "is-teacher" : "is-student"}`}>
                  <div className="flex items-start gap-4">
                    <span className="bz-landing-audience-icon"><FontAwesomeIcon icon={c.kind === "teacher" ? faChalkboard : faGraduationCap} className="h-6 w-6" /></span>
                    <div className="min-w-0"><h3>{c.title}</h3><p>{c.body}</p><Link href={c.cta.href}>{c.cta.label} <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link></div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── ٥: من يكتب ── */}
          <section className="px-5 pb-14 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <aside className="bz-author-box !mt-0">
                <span className="bz-author-mark" aria-hidden="true">{DEFAULT_AUTHOR.name.charAt(0)}</span>
                <div className="min-w-0">
                  <span className="bz-author-kicker">من يكتب في BacZone</span>
                  <Link href={`/author/${DEFAULT_AUTHOR.slug}`} className="bz-author-name">{DEFAULT_AUTHOR.name}</Link>
                  <p className="bz-author-role">{DEFAULT_AUTHOR.role}</p>
                  <p className="bz-author-bio">{DEFAULT_AUTHOR.bio[1]}</p>
                  <Link href={`/author/${DEFAULT_AUTHOR.slug}`} className="bz-author-more">تعرّف عليه <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
                </div>
              </aside>
            </div>
          </section>

          {/* ── ٦: أسئلة ── */}
          <section className="bg-[var(--bz-canvas)] px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-4xl">
              <div className="mb-9 text-center"><span className="bz-landing-kicker">أسئلة شائعة</span><h2 className="bz-landing-section-title">قبل أن تبدأ</h2></div>
              <div className="grid gap-3 md:grid-cols-2">{LANDING.faq.map((f) => <LandingFaqRow key={f.q} q={f.q} a={f.a} />)}</div>
            </div>
          </section>
        </PublicSidebarLayout>

        <section className="bz-landing-final-cta relative overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#0C0F1E,#2433B8)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <img src={s.logoUrl || DEFAULT_LOGO} alt="" width={64} height={64} className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain" />
            <h2 className="font-display text-3xl font-black sm:text-5xl">ابدأ بما تحتاجه اليوم</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">مقال يوضّح طريقك، أو أداة تحسب معدّلك، أو غرفة تراجع فيها مع غيرك.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/blog" className="bz-landing-primary-btn">اقرأ المقالات <FontAwesomeIcon icon={faArrowLeft} /></Link>
              <Link href="/register" className="bz-landing-ghost-btn">أنشئ حسابك <FontAwesomeIcon icon={faArrowLeft} /></Link>
            </div>
          </div>
        </section>
        <SiteFooter variant="full" landingDescription={footerDescription} />
      </main>
    </>
  );
}
