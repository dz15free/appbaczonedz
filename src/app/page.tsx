import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faChalkboard,
  faChevronLeft,
  faClock,
  faFileLines,
  faFlag,
  faGraduationCap,
  faListCheck,
  faPlay,
  faScaleBalanced,
  faUsers,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FaviconSync, LandingFaqRow } from "@/components/landing/landing-client";
import { getPublicSiteSettings } from "@/features/settings/site-settings-server";
import { GUIDES } from "@/features/guides/guides-data";
import { TOOLS } from "@/features/tools/tools-data";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { DEFAULT_LOGO } from "@/lib/brand-assets";
import { PublicRootGate } from "@/components/ui/public-root-gate";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BacZone — منصة الدراسة التفاعلية لطلاب البكالوريا",
  description: "أدوات للحساب والتخطيط والمحاكاة، محتوى وأدلة للمراجعة والتوجيه، ومجتمع وغرف تفاعلية لطلاب البكالوريا في الجزائر.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "/",
    title: "BacZone — منصة الدراسة التفاعلية لطلاب البكالوريا",
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

function overviewHref(title: string) {
  if (title.includes("غرف") || title.includes("صوت")) return "/rooms";
  if (title.includes("مجتمع") || title.includes("مجموعات")) return "/community";
  if (title.includes("ملفات") || title.includes("خباشة")) return "/home";
  return "/tools";
}

export default async function LandingPage() {
  const s = await getPublicSiteSettings();
  const publicTools = TOOLS.filter((tool) => !tool.needsAccount).slice(0, 8);
  const landingGuides = GUIDES.slice(0, 4);
  const articles = (await getPublishedEntries()).slice(0, 4);
  const overviewCards = (s.features ?? []).slice(0, 6);
  const audienceCards = (s.audience ?? []).slice(0, 2);
  const heroImage = s.landingHeroImageUrl || "/landing/baczone-student-hero.png";
  const footerDescription = s.landingFooterDescription || "منصة دراسة تفاعلية لطلاب البكالوريا في الجزائر. تجمع الأدوات والمحتوى والأدلة والغرف والمجتمع في تجربة واحدة.";
  const heroTitleLine1 = s.heroTitleLine1 || "ادرس أذكى، راجع أسرع،";
  const heroTitleLine2 = s.heroTitleLine2 || "وأنجح في البكالوريا";
  const heroTitleReviewIndex = heroTitleLine1.indexOf("راجع");
  const heroTitleLead = heroTitleReviewIndex > 0 ? heroTitleLine1.slice(0, heroTitleReviewIndex).trim() : heroTitleLine1;
  const heroTitleReview = heroTitleReviewIndex > 0 ? heroTitleLine1.slice(heroTitleReviewIndex).trim().replace(/[،,]$/, "..") : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: s.siteName || "BacZone", description: metadata.description, url: "https://baczone.app/", inLanguage: "ar" },
      { "@type": "Organization", name: s.siteName || "BacZone", url: "https://baczone.app/", logo: s.logoUrl || DEFAULT_LOGO },
    ],
  };

  return (
    <PublicRootGate>
      <main dir="rtl" className="bz-landing-v2 relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)] text-[var(--bz-text)] antialiased selection:bg-blue-500/30">
        <FaviconSync href={s.faviconUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PublicHeader variant="landing" />

        <section className="bz-landing-v2-hero relative isolate overflow-hidden bg-[#061735] text-white">
          <img src={heroImage} alt={s.landingHeroImageAlt || "طالب جزائري يراجع دروسه على الحاسوب"} className="bz-landing-hero-image absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#061735]/15 via-[#061735]/58 to-[#061735]/96" />
          <div className="bz-landing-hero-overlay absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(37,99,235,.22),transparent_34%),linear-gradient(180deg,rgba(3,13,35,.08),rgba(3,13,35,.7))]" />
          <div className="relative mx-auto flex min-h-[690px] max-w-7xl items-center px-5 pb-24 pt-28 sm:px-8 lg:min-h-[720px] lg:px-10 lg:pb-32 lg:pt-36" dir="ltr">
            <div className="bz-landing-hero-copy max-w-2xl text-left" dir="rtl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-bold text-blue-100 backdrop-blur-md"><FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5 text-blue-300" />{s.landingBadge || "منصة دراسة تفاعلية لطلاب البكالوريا في الجزائر"}</div>
              <h1 className="bz-landing-hero-title max-w-2xl font-display font-black tracking-tight"><span className="bz-landing-hero-title-lead">{heroTitleLead}{heroTitleReview && <span className="bz-landing-hero-title-review">{heroTitleReview}</span>}</span><span className="bz-landing-hero-title-success bg-gradient-to-l from-blue-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent">{heroTitleLine2}</span></h1>
              <p className="mt-6 max-w-xl text-base leading-[2] text-white/75 sm:text-lg">{s.heroSubtitle || "أدوات للحساب والتخطيط والمحاكاة، محتوى وأدلة للمراجعة والتوجيه، ومجتمع وغرف تساعدك على الدراسة بوضوح."}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/tools" className="bz-landing-primary-btn"><span>{s.heroCtaPrimary || "أنشئ حسابك وابدأ"}</span><FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
                <Link href="/login" className="bz-landing-ghost-btn">{s.heroCtaSecondary || "دخول"}<FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="bz-landing-hero-badges mt-8">
                {(s.badges ?? []).slice(0, 4).map((badge) => <span key={badge.id} className="bz-landing-badge inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/75"><DynamicIcon value={badge.icon} className="h-3.5 w-3.5 shrink-0 text-blue-200" emojiClass="text-sm" /><span>{badge.label}</span></span>)}
              </div>
            </div>
            <div className="bz-landing-mobile-visual" aria-hidden="true"><img src={heroImage} alt="" className="bz-landing-mobile-visual-image" /><span className="bz-landing-mobile-visual-shade" /></div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-[var(--bz-bg)] [clip-path:ellipse(70%_100%_at_50%_100%)] sm:h-16" />
        </section>

        <PublicSidebarLayout placement="global" includeArticles={false}>
          <section className="px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14"><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><span className="bz-landing-kicker">مسارات BacZone</span><h2 className="bz-landing-section-title">{s.landingOverviewTitle || "كل ما تحتاجه في مكان واحد"}</h2><p className="bz-landing-section-subtitle">{s.landingOverviewSubtitle}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{overviewCards.map((card) => <article key={card.id} className="bz-landing-info-card"><span className="bz-landing-icon-box"><DynamicIcon value={card.icon} className="h-5 w-5" emojiClass="text-xl" /></span><h3>{card.title}</h3><p>{card.desc}</p><Link href={overviewHref(card.title)}>اكتشف المزيد <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link></article>)}</div></div></section>

          <section className="bg-[#071a3a] px-5 py-16 text-white sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><span className="bz-landing-kicker !bg-white/10 !text-blue-200">تعلم مع الآخرين</span><h2 className="bz-landing-section-title !text-white">{s.landingCommunityTitle || "مجتمع دراسي وغرف تفاعلية"}</h2><p className="bz-landing-section-subtitle !text-white/65">{s.landingCommunitySubtitle}</p></div><div className="grid gap-5 lg:grid-cols-2"><Link href="/community" className="bz-landing-community-card"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200"><FontAwesomeIcon icon={faUsers} className="h-7 w-7" /></div><h3>المجتمع</h3><p>أسئلة ونقاشات وبطاقات وتحديات داخل مساحة دراسية لا تشبه التصفح العشوائي.</p><span>استكشف المجتمع <FontAwesomeIcon icon={faArrowLeft} /></span></Link><Link href="/rooms" className="bz-landing-community-card"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200"><FontAwesomeIcon icon={faChalkboard} className="h-7 w-7" /></div><h3>غرف الدراسة</h3><p>لوح، ملفات، ملاحظات، صوت ومشاركة تساعد الطالب والأستاذ على الدراسة معًا.</p><span>استكشف الغرف <FontAwesomeIcon icon={faArrowLeft} /></span></Link></div></div></section>

          <section className="bg-[#eef4ff] px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><span className="bz-landing-kicker">تجربة المنتج</span><h2 className="bz-landing-section-title">شاهد BacZone وهي تعمل</h2><p className="bz-landing-section-subtitle">لقطة من واجهة BacZone الحالية، توضّح كيف تجتمع الدراسة والأدوات والمجتمع في مساحة واحدة.</p></div><div className="bz-landing-showcase-grid grid items-center gap-6 lg:grid-cols-[1.2fr_.8fr]" dir="ltr"><div className="bz-landing-platform-shot w-full min-w-0 overflow-hidden rounded-[28px] border border-white bg-white p-2 shadow-xl shadow-blue-950/10"><div className="w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50"><img src="/landing/baczonedz-dashboard-reference-v2.png" alt="لقطة من واجهة منصة BacZone" className="block h-auto w-full max-w-full object-contain" /></div></div><div className="rounded-[28px] bg-[#071a3a] p-7 text-white sm:p-9" dir="rtl"><span className="bz-landing-kicker !bg-blue-400/15 !text-blue-200">داخل المنصة</span><h2 className="mt-4 font-display text-2xl font-black sm:text-3xl">تجربة دراسة لا تتوقف عند المقال</h2><p className="mt-4 text-sm leading-[2] text-white/75">تنتقل من فهم الدرس إلى المراجعة والتفاعل في مساحة مرتبة، مع وصول واضح إلى الأدوات والمحتوى والغرف.</p><Link href="/home" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-400">دخول المنصة <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link></div></div></div></section>

          <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><span className="bz-landing-kicker">مساحة لكل دور</span><h2 className="bz-landing-section-title">المنصة للأستاذ وللتلميذ</h2><p className="bz-landing-section-subtitle">أدوات ومساحات واضحة لكل من يراجع أو يشرح، دون خلط بين التجربتين.</p></div><div className="grid gap-5 lg:grid-cols-2">{audienceCards.map((card, index) => <article key={card.id} className={`bz-landing-audience-card ${index === 1 ? "is-teacher" : "is-student"}`}><div className="flex items-start gap-4"><span className="bz-landing-audience-icon"><DynamicIcon value={card.icon} className="h-6 w-6" emojiClass="text-2xl" /></span><div className="min-w-0"><span className="text-xs font-black text-blue-600">{index === 1 ? "للأستاذ" : "للتلميذ"}</span><h3>{card.title}</h3><p>{card.desc}</p><Link href={index === 1 ? "/rooms" : "/tools"}>ابدأ من هنا <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link></div></div></article>)}</div></div></section>

          <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="bz-landing-kicker">الأدوات الفعلية</span><h2 className="bz-landing-section-title">{s.landingToolsTitle || "أدوات ذكية تساعدك على التقدم"}</h2><p className="bz-landing-section-subtitle !mx-0 text-right">{s.landingToolsSubtitle}</p></div><Link href="/tools" className="bz-landing-text-link">استكشف كل الأدوات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{publicTools.map((tool) => <Link key={tool.href} href={tool.href} className="bz-landing-tool-card"><span className="bz-landing-tool-icon" style={{ color: tool.color, backgroundColor: `${tool.color}14` }}><FontAwesomeIcon icon={toolIcon(tool.href)} /></span><h3>{tool.name}</h3><p>{tool.desc}</p><span className="bz-landing-card-link">{tool.cta}<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></Link>)}</div></div></section>

          {articles.length > 0 && <section className="bg-[#f5f8fd] px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="bz-landing-kicker">محتوى قابل للقراءة</span><h2 className="bz-landing-section-title">{s.landingArticlesTitle || "أحدث المقالات والدروس"}</h2><p className="bz-landing-section-subtitle !mx-0 text-right">{s.landingArticlesSubtitle}</p></div><Link href="/blog" className="bz-landing-text-link">عرض جميع المقالات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{articles.map((article) => <Link key={article.id} href={`/blog/${article.slug}`} className="bz-landing-article-card"><div className="relative aspect-[1.35] overflow-hidden bg-slate-200">{article.cover ? <img src={article.cover} alt={article.coverAlt || article.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-950 to-blue-500 text-5xl text-white/30"><FontAwesomeIcon icon={faBookOpen} /></div>}<span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-blue-800">{article.labels?.[0] || "مقال تعليمي"}</span></div><div className="p-4"><div className="flex items-center gap-2 text-[11px] text-text-muted"><span>{articleDate(article.publishedAt)}</span><span>•</span><span>{article.readMinutes} دقائق</span></div><h3 className="mt-3 line-clamp-2 font-display text-[15px] font-black leading-relaxed">{article.title}</h3><p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-text-muted">{article.excerpt}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">اقرأ المقال <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span></div></Link>)}</div></div></section>}

          <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><span className="bz-landing-kicker">المراجعة والتوجيه</span><h2 className="bz-landing-section-title">أدلة ونصائح قبل اختيار التخصص</h2><p className="bz-landing-section-subtitle">ارجع إلى الأدلة عندما تحتاج خطوة عملية للمراجعة أو فهماً أوضح لخياراتك بعد البكالوريا.</p></div><div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><article className="bz-landing-guides-card"><div><span className="bz-landing-kicker !bg-emerald-500/10 !text-emerald-700">محتوى إرشادي</span><h2 className="mt-4 font-display text-2xl font-black">{s.landingGuidesTitle || "أدلة ونصائح للمراجعة والتوجيه"}</h2><p className="mt-3 max-w-xl text-sm leading-[1.9] text-text-muted">{s.landingGuidesSubtitle}</p><div className="mt-5 flex flex-wrap gap-2">{landingGuides.slice(0, 3).map((guide) => <Link key={guide.slug} href={`/guides/${guide.slug}`} className="bz-landing-guide-chip"><FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" />{guide.title}</Link>)}</div><Link href="/guides" className="bz-landing-primary-btn mt-6 !bg-emerald-600 !px-5 !py-3 !text-xs">تصفح الأدلة <FontAwesomeIcon icon={faArrowLeft} /></Link></div><div className="bz-landing-illustration !text-emerald-600"><FontAwesomeIcon icon={faFileLines} /></div></article><article className="bz-landing-specialties-card"><div><span className="bz-landing-kicker">ما بعد البكالوريا</span><h2 className="mt-4 font-display text-2xl font-black">اكتشف التخصصات الجامعية</h2><p className="mt-3 max-w-xl text-sm leading-[1.9] text-text-muted">افهم خياراتك بعد البكالوريا: الصحة والطب، الهندسة والتكنولوجيا، الإعلام الآلي، الاقتصاد، اللغات والآداب، والعلوم الإنسانية.</p><Link href="/specialties" className="bz-landing-primary-btn mt-6 !px-5 !py-3 !text-xs">عرض التخصصات <FontAwesomeIcon icon={faArrowLeft} /></Link></div><div className="bz-landing-illustration"><FontAwesomeIcon icon={faGraduationCap} /></div></article></div></div></section>

          <section className="px-5 py-14 sm:px-8 sm:py-18"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-[28px] border border-border/70 bg-surface px-6 py-8 text-center shadow-sm md:flex-row md:text-right"><div><span className="bz-landing-kicker">الدورات</span><h2 className="mt-3 font-display text-xl font-black">{s.landingCoursesTitle === "تعلم منظم عندما تتوفر الدورات المنشورة" ? "دورات تعليمية منظمة" : s.landingCoursesTitle || "دورات تعليمية منظمة"}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">{s.landingCoursesSubtitle}</p></div><div className="flex shrink-0 flex-wrap justify-center gap-2 text-xs font-bold text-text-muted"><span className="rounded-xl bg-red-500/10 px-3 py-2 text-red-600">فيديو</span><span className="rounded-xl bg-blue-500/10 px-3 py-2 text-blue-600">ملف PDF</span><span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-700">درس نصي</span><span className="rounded-xl bg-orange-500/10 px-3 py-2 text-orange-700">مصدر خارجي</span></div></div></section>

          {(s.faq ?? []).length > 0 && <section className="bg-[#f5f8fd] px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-4xl"><div className="mb-9 text-center"><span className="bz-landing-kicker">أسئلة شائعة</span><h2 className="bz-landing-section-title">أسئلة تساعدك على البدء</h2></div><div className="grid gap-3 md:grid-cols-2">{(s.faq ?? []).slice(0, 4).map((faq) => <LandingFaqRow key={faq.id} q={faq.q} a={faq.a} />)}</div></div></section>}
        </PublicSidebarLayout>

        <section className="bz-landing-final-cta relative overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-28"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(99,102,241,.35),transparent_30%),linear-gradient(120deg,#101447,#2563eb)]" /><div className="relative mx-auto max-w-3xl text-center"><img src={s.logoUrl || DEFAULT_LOGO} alt="" width={64} height={64} className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain" /><h2 className="font-display text-3xl font-black sm:text-5xl">{s.ctaTitle || "جاهز لتبدأ بطريقتك؟"}</h2><p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">{s.ctaSubtitle || "ابدأ بما تحتاجه اليوم: أداة، دليل، مقال، أو مساحة دراسة."}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/tools" className="bz-landing-primary-btn !bg-blue-600 !text-white hover:!bg-blue-500">اكتشف الأدوات <FontAwesomeIcon icon={faArrowLeft} /></Link><Link href="/login" className="bz-landing-ghost-btn">دخول المنصة <FontAwesomeIcon icon={faArrowLeft} /></Link></div></div></section>
        <SiteFooter variant="full" landingDescription={footerDescription} />
      </main>
    </PublicRootGate>
  );
}
