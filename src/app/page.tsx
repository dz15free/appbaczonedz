import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faChalkboard,
  faChevronLeft,
  faCircleCheck,
  faClock,
  faCompass,
  faGraduationCap,
  faListCheck,
  faPlay,
  faRightToBracket,
  faScaleBalanced,
  faUserPlus,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { minutesLabel } from "@/features/blog/types";
import { LandingKnowledge } from "@/features/landing/landing-knowledge";
import { LandingOrientation } from "@/features/landing/landing-hub";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FaviconSync } from "@/components/landing/landing-client";
import { getPublicSiteSettings } from "@/features/settings/site-settings-server";
import { GUIDES } from "@/features/guides/guides-data";
import { TOOLS, REAL_TOOLS } from "@/features/tools/tools-data";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { DEFAULT_LOGO } from "@/lib/brand-assets";
import { PublicRootRedirect } from "@/components/ui/public-root-redirect";
import { LANDING } from "@/features/landing/landing-content";
import { FEATURE_PAGES } from "@/features/landing/features-data";
import { FEATURE_ICON } from "@/features/landing/feature-icon";
import { DEFAULT_AUTHOR } from "@/features/authors/authors";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";
import { OG_DEFAULT } from "@/lib/seo";
/* التصميم v10 «أنيق» — طبقة على هذه الصفحة وحدها. */
import "./home-v10.css";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BacZone — منصة الدراسة التفاعلية لتلاميذ البكالوريا",
  description: "أدوات للحساب والتخطيط والمحاكاة، محتوى وأدلة للمراجعة والتوجيه، ومجتمع وغرف تفاعلية لتلاميذ البكالوريا في الجزائر.",
  alternates: { canonical: "/" },
  openGraph: { images: OG_DEFAULT,
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

/* طرق الدخول السريعة تحت البطل: كلّ واحدة تقود إلى صفحة عامّة فيها محتوى */
const PATHS = [
  { href: "/calculate", icon: faCalculator, title: "احسب معدّلك", desc: "بمعاملات شعبتك الرسمية" },
  { href: "/specialties", icon: faCompass, title: "اختر تخصّصك", desc: "بآخر معدّلات التوجيه" },
  { href: "/blog", icon: faBookOpen, title: "راجع درساً", desc: "أمثلة محلولة خطوة بخطوة" },
  { href: "/guides", icon: faListCheck, title: "نظّم مراجعتك", desc: "أدلّة لكلّ مادّة وشعبة" },
];

export default async function LandingPage() {
  const s = await getPublicSiteSettings();
  const publicTools = TOOLS.filter((tool) => !tool.needsAccount).slice(0, 8);
  const landingGuides = GUIDES.slice(0, 5);
  const allArticles = await getPublishedEntries();
  const lessons = allArticles.filter((a) => (a.labels ?? []).includes("subjects")).slice(0, 6);
  /* المقالات العامّة (غير الدروس) أوّلاً، وإن لم تكفِ أكملناها من الكلّ */
  const nonLessons = allArticles.filter((a) => !(a.labels ?? []).includes("subjects"));
  const reads = (nonLessons.length >= 4 ? nonLessons : allArticles).slice(0, 6);
  const [featured, ...restReads] = reads;
  const latestLesson = lessons[0];
  /* كلّ الأدوات مجّانية (بعضها يحتاج حساباً مجّانياً) — والعدد لا يشمل دليل التخصّصات */
  const freeToolsCount = REAL_TOOLS.length;
  const footerDescription = s.landingFooterDescription || "منصّة دراسة تفاعلية لتلاميذ البكالوريا في الجزائر: مقالات وأدلّة وأدوات وغرف ومجتمع في مكان واحد.";
  const fields = SPEC_FIELDS.slice(0, 10);

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
      <main dir="rtl" className="bz-x relative min-h-screen overflow-x-hidden antialiased">
        <FaviconSync href={s.faviconUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PublicHeader />

        {/* ── البطل: لوحة داكنة، ثلاثة أزرار واضحة، ونموذج بأرقام حقيقية ── */}
        <section className="bz-x-hero" aria-labelledby="x-hero-title">
          <div className="bz-x-hero-panel">
            <div className="bz-x-hero-grid">
              <div>
                <span className="bz-x-eyebrow"><i aria-hidden="true" />{LANDING.badge}</span>
                <h1 id="x-hero-title" className="bz-x-h1">
                  <span>{LANDING.titleLead} {LANDING.titleMid}</span>
                  <span className="is-gold">{LANDING.titleSuccess}</span>
                </h1>
                <p className="bz-x-lede">{LANDING.subtitle}</p>

                <div className="bz-x-actions">
                  <Link href="/register" className="bz-x-btn is-primary"><FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" /> أنشئ حسابك مجّاناً</Link>
                  <Link href="/login" className="bz-x-btn is-ghost-dark"><FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4 -scale-x-100" /> تسجيل الدخول</Link>
                  <Link href="/blog" className="bz-x-btn is-ghost-dark"><FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" /> تصفّح المقالات</Link>
                </div>
                <p className="bz-x-actions-note">المقالات والأدوات ودليل التخصّصات مفتوحة بلا حساب.</p>

                {/* أرقام حقيقية من المحتوى نفسه — لا أرقام مختلَقة */}
                <dl className="bz-x-hero-stats">
                  <div><dt>تخصّصاً في الدليل</dt><dd>{SPEC_INDEX.length}</dd></div>
                  <div><dt>أدوات مجّانية</dt><dd>{freeToolsCount}</dd></div>
                  <div><dt>{allArticles.length > 0 ? "مقالاً ودرساً" : "دليل مراجعة"}</dt><dd>{allArticles.length > 0 ? allArticles.length : GUIDES.length}</dd></div>
                </dl>
              </div>

              {/* النموذج: كلّ بطاقة رابط حقيقي، وكلّ رقم منشور في صفحته بمصدره */}
              <div className="bz-x-mock">
                <div className="bz-x-window">
                  <div className="bz-x-window-bar" aria-hidden="true"><i /><i /><i /><span>baczone.app</span></div>
                  <div className="bz-x-window-body">
                    <Link href="/calculate" className="bz-x-mcard">
                      <small>حاسبة المعدّل · علوم تجريبية</small>
                      <b>نقطة في مادّة معاملها 6 تساوي ثلاثاً في مادّة معاملها 2</b>
                      <div className="bz-x-mrows" aria-hidden="true">
                        <span>علوم الطبيعة والحياة <em>×6</em></span>
                        <span>الرياضيات <em>×5</em></span>
                        <span>العلوم الفيزيائية <em>×5</em></span>
                      </div>
                    </Link>
                    <Link href="/specialties/medcine" className="bz-x-mcard">
                      <small>توجيه 2026 · الطبّ</small>
                      <div className="bz-x-mbig"><strong>16.33</strong><span>آخر معدّل مقبول</span></div>
                      <div className="bz-x-mbar" aria-hidden="true"><i /></div>
                      <b style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--x-muted)" }}>شرط الترشّح 16.00 فقط</b>
                    </Link>
                    {latestLesson ? (
                      <Link href={`/blog/${latestLesson.slug}`} className="bz-x-mcard is-wide">
                        <span className="bz-x-mlesson">
                          <span className="num" aria-hidden="true"><FontAwesomeIcon icon={faBookOpen} /></span>
                          <span className="min-w-0"><small>أحدث درس محلول</small><b>{latestLesson.title}</b></span>
                        </span>
                      </Link>
                    ) : (
                      <Link href="/guides" className="bz-x-mcard is-wide">
                        <small>أدلّة المراجعة</small><b>{GUIDES[0]?.title}</b>
                      </Link>
                    )}
                  </div>
                </div>
                <span className="bz-x-float"><FontAwesomeIcon icon={faCircleCheck} /> كلّ رقم بمصدره وتاريخ تحقّقه</span>
              </div>
            </div>

            <nav aria-label="ابدأ من هنا" className="bz-x-paths">
              {PATHS.map((p) => (
                <Link key={p.href} href={p.href} className="bz-x-path">
                  <span className="ic" aria-hidden="true"><FontAwesomeIcon icon={p.icon} /></span>
                  <span><b>{p.title}</b><small>{p.desc}</small></span>
                  <FontAwesomeIcon icon={faChevronLeft} className="go h-3 w-3" />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <PublicSidebarLayout placement="global" includeArticles={false}>
          {/* ── ١: اقرأ — مقال بارز وقائمة ── */}
          {featured && (
            <section className="bz-x-sec" aria-labelledby="x-reads">
              <div className="bz-x-wrap">
                <div className="bz-x-head">
                  <div>
                    <span className="bz-x-kicker">ابدأ من حيث أنت</span>
                    <h2 id="x-reads" className="bz-x-h2">اقرأ، افهم، ثمّ قرّر</h2>
                    <p className="bz-x-sub">محتوى مكتوب لتلميذ البكالوريا الجزائري: كيف يراجع كلّ مادّة، وكيف يختار تخصّصه بعد النجاح.</p>
                  </div>
                  <Link href="/blog" className="bz-x-more">كلّ المقالات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link>
                </div>
                <div className="bz-x-reads">
                  <Link href={`/blog/${featured.slug}`} className="bz-x-feature">
                    <span className="tag">مقال مختار</span>
                    <h3>{featured.title}</h3>
                    {featured.excerpt && <p>{featured.excerpt}</p>}
                    <span className="foot">{minutesLabel(featured.readMinutes ?? 1)} قراءة <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                  </Link>
                  <ol className="bz-x-list">
                    {restReads.map((a, i) => (
                      <li key={a.id}>
                        <Link href={`/blog/${a.slug}`}>
                          <span className="n" aria-hidden="true">{String(i + 2).padStart(2, "0")}</span>
                          <span className="min-w-0"><b>{a.title}</b><small>{articleDate(a.publishedAt)} · {minutesLabel(a.readMinutes ?? 1)} قراءة</small></span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bz-x-duo">
                  <div className="bz-x-card">
                    <span className="bz-x-ico is-mint" aria-hidden="true"><FontAwesomeIcon icon={faGraduationCap} /></span>
                    <h3>دليل التخصّصات الجامعية</h3>
                    <p>{SPEC_INDEX.length} تخصّصاً ومدرسة عليا: ماذا تدرس فيه، كيف تُقبل، وأين تعمل بعده.</p>
                    <div className="bz-x-chips">{fields.map((f) => <Link key={f} href="/specialties">{f}</Link>)}</div>
                  </div>
                  <div className="bz-x-card">
                    <span className="bz-x-ico is-gold" aria-hidden="true"><FontAwesomeIcon icon={faListCheck} /></span>
                    <h3>أدلّة المراجعة</h3>
                    <ul className="bz-x-links mt-2">
                      {landingGuides.map((g) => <li key={g.slug}><Link href={`/guides/${g.slug}`}><span>{g.title}</span><FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 shrink-0 opacity-50" /></Link></li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── ٢: دروس محلولة — تزيد وحدها مع الدروس المجدولة ── */}
          {lessons.length > 0 && (
            <section className="bz-x-sec is-tint" aria-labelledby="x-lessons">
              <div className="bz-x-wrap">
                <div className="bz-x-head">
                  <div>
                    <span className="bz-x-kicker">دروس بأمثلة محلولة</span>
                    <h2 id="x-lessons" className="bz-x-h2">راجع درساً كاملاً الآن</h2>
                    <p className="bz-x-sub">كلّ درس: القوانين، مثال من نوع البكالوريا محلول خطوة بخطوة ومتحقَّق من حسابه، الأخطاء التي تُضيّع النقاط، ثمّ تمارين بأجوبتها. يُضاف درس جديد كلّ يومين.</p>
                  </div>
                  <Link href="/blog" className="bz-x-more">كلّ الدروس <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link>
                </div>
                <div className="bz-x-grid is-3">
                  {lessons.map((p) => (
                    <Link key={p.id} href={`/blog/${p.slug}`} className="bz-x-card bz-x-lesson">
                      <span className="bz-x-lesson-top"><span className="pill">درس محلول</span><span className="meta">{minutesLabel(p.readMinutes ?? 1)} قراءة</span></span>
                      <h3>{p.title}</h3>
                      {p.excerpt && <p>{p.excerpt}</p>}
                      <span className="foot">اقرأ الدرس <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── ٣: الأدوات المجّانية ── */}
          <section className="bz-x-sec" aria-labelledby="x-tools">
            <div className="bz-x-wrap">
              <div className="bz-x-head">
                <div>
                  <span className="bz-x-kicker">مجّانية وبلا حساب</span>
                  <h2 id="x-tools" className="bz-x-h2">أدوات تستعملها اليوم</h2>
                  <p className="bz-x-sub">احسب، خطّط، وتدرّب على ظروف الامتحان الحقيقية.</p>
                </div>
                <Link href="/tools" className="bz-x-more">كلّ الأدوات <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></Link>
              </div>
              <div className="bz-x-grid is-4">
                {publicTools.map((tool) => (
                  <Link key={tool.href} href={tool.href} className="bz-x-card">
                    <span className="bz-x-ico" style={{ color: tool.color, backgroundColor: `${tool.color}16` }} aria-hidden="true"><FontAwesomeIcon icon={toolIcon(tool.href)} /></span>
                    <h3>{tool.name}</h3>
                    <p>{tool.desc}</p>
                    <span className="foot">{tool.cta} <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── ٤: معلومة تُقرأ في الصفحة نفسها — المعاملات ومنهجية السنة ── */}
          <div className="bz-x-sec is-tint !py-0"><LandingKnowledge /></div>

          {/* ── ٥: التوجيه بأرقام حقيقية وتصفّح التخصّصات ── */}
          <LandingOrientation />

          {/* ── ٦: المنصّة — كلّ ميزة تقود إلى صفحتها العامّة ── */}
          <section className="bz-x-sec is-tint" aria-labelledby="x-platform">
            <div className="bz-x-wrap">
              <div className="bz-x-head is-center">
                <div>
                  <span className="bz-x-kicker">ادرس مع الآخرين</span>
                  <h2 id="x-platform" className="bz-x-h2">منصّة كاملة حين تحتاجها</h2>
                  <p className="bz-x-sub">غرف بسبورة وصوت، ومجتمع حسب المادّة، ومساعدة ذكيّة. اضغط أيّ ميزة لترى كيف تعمل بالتفصيل.</p>
                </div>
              </div>
              <div className="bz-x-grid is-3">
                {FEATURE_PAGES.map((f) => (
                  <Link key={f.slug} href={`/features/${f.slug}`} className="bz-x-card bz-x-feat">
                    <span className="bz-x-ico" aria-hidden="true"><FontAwesomeIcon icon={FEATURE_ICON[f.icon]} /></span>
                    <span className="min-w-0">
                      <h3>{f.title}</h3>
                      <p>{f.short}</p>
                      <span className="foot !pt-3">كيف تعمل <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="bz-x-shot">
                <picture>
                  <source type="image/avif" srcSet="/landing/dashboard-800.avif 800w, /landing/dashboard-1366.avif 1366w" sizes="(max-width: 1200px) 100vw, 1200px" />
                  <source type="image/webp" srcSet="/landing/dashboard-800.webp 800w, /landing/dashboard-1366.webp 1366w" sizes="(max-width: 1200px) 100vw, 1200px" />
                  <img src="/landing/dashboard-1366.webp" width={1366} height={610} alt="لقطة من واجهة منصّة BacZone: المجتمع والغرف والأدوات" loading="lazy" decoding="async" />
                </picture>
              </div>
            </div>
          </section>

          {/* ── ٧: لكلّ دور ── */}
          <section className="bz-x-sec" aria-label="للتلميذ وللأستاذ">
            <div className="bz-x-wrap bz-x-roles">
              {LANDING.audience.map((c) => (
                <article key={c.kind} className={`bz-x-role ${c.kind === "teacher" ? "is-teacher" : ""}`}>
                  <span className="who"><FontAwesomeIcon icon={c.kind === "teacher" ? faChalkboard : faGraduationCap} className="h-4 w-4" /> {c.title}</span>
                  <p>{c.body}</p>
                  <Link href={c.cta.href}>{c.cta.label} <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
                </article>
              ))}
            </div>
          </section>

          {/* ── ٨: من يكتب ── */}
          <section className="pb-14 sm:pb-20" aria-label="من يكتب في BacZone">
            <div className="bz-x-wrap">
              <aside className="bz-x-author">
                <span className="mark" aria-hidden="true">{DEFAULT_AUTHOR.name.charAt(0)}</span>
                <div className="min-w-0">
                  <small>من يكتب في BacZone</small>
                  <h3><Link href={`/author/${DEFAULT_AUTHOR.slug}`}>{DEFAULT_AUTHOR.name}</Link> · <span className="text-[.9rem] font-bold text-[var(--x-muted)]">{DEFAULT_AUTHOR.role}</span></h3>
                  <p>{DEFAULT_AUTHOR.bio[1]}</p>
                </div>
                <Link href={`/author/${DEFAULT_AUTHOR.slug}`} className="bz-x-btn is-line">تعرّف عليه <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
              </aside>
            </div>
          </section>

          {/* ── ٩: أسئلة — <details> أصلي: الجواب في HTML الصفحة ── */}
          <section className="bz-x-sec is-tint" aria-labelledby="x-faq">
            <div className="bz-x-wrap" style={{ maxWidth: 1040 }}>
              <div className="bz-x-head is-center">
                <div><span className="bz-x-kicker">أسئلة شائعة</span><h2 id="x-faq" className="bz-x-h2">قبل أن تبدأ</h2></div>
              </div>
              <div className="bz-x-faq">
                {LANDING.faq.map((f) => (
                  <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
                ))}
              </div>
            </div>
          </section>
        </PublicSidebarLayout>

        <section className="bz-x-cta pt-10 sm:pt-14" aria-labelledby="x-cta">
          <div className="bz-x-cta-panel">
            <img src={s.logoUrl || DEFAULT_LOGO} alt="" width={56} height={56} />
            <h2 id="x-cta">ابدأ بما تحتاجه اليوم</h2>
            <p>مقال يوضّح طريقك، أو أداة تحسب معدّلك، أو غرفة تراجع فيها مع غيرك.</p>
            <div className="bz-x-actions">
              <Link href="/register" className="bz-x-btn is-primary"><FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" /> أنشئ حسابك مجّاناً</Link>
              <Link href="/login" className="bz-x-btn is-ghost-dark"><FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4 -scale-x-100" /> تسجيل الدخول</Link>
              <Link href="/blog" className="bz-x-btn is-ghost-dark"><FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" /> اقرأ المقالات</Link>
            </div>
          </div>
        </section>
        <SiteFooter variant="full" landingDescription={footerDescription} />
      </main>
    </>
  );
}
