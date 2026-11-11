import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faBookOpen, faChalkboard, faChalkboardUser, faCircleQuestion, faCreditCard,
  faGraduationCap, faRocket, faScrewdriverWrench, faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FEATURE_PAGES } from "@/features/landing/features-data";
import { FEATURE_ICON } from "@/features/landing/feature-icon";
import { GUIDE, GUIDE_SECTION_COUNT, GUIDE_UPDATED, type GuideChapter } from "@/features/help/guide-data";
import { BRANCHES } from "@/features/calculator/branches";
import { absUrl } from "@/lib/site-url";
import { OG_DEFAULT } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════
   صفحة المنصّة — /features

   🐛 كانت عنواناً وفقرة وستّة روابط: من يسأل «ما BacZone؟» لا يجد
   جواباً هنا، ومحرّك البحث يرى صفحة فهرس بلا محتوى. صارت الصفحة التي
   تُجيب عن السؤال كاملاً: ما هي، لمن، ما أقسامها، ما المجّاني فيها،
   على أيّ جهاز تعمل، وكيف يبدأ الزائر — مع رابط لشرح كلّ قسم.

   خريطة الأقسام مأخوذة من `guide-data.ts` نفسه، فلا يمكن أن تَعِد هذه
   الصفحة بقسم لا يشرحه الدليل. والقاعدة قاعدة `features-data.ts`: لا
   نكتب ما لا تفعله المنصّة اليوم.
   ════════════════════════════════════════════════════════════ */

const TITLE = "منصّة BacZone — ما هي، وما أقسامها، وكيف تبدأ";
const DESC =
  "BacZone منصّة دراسة لتلاميذ البكالوريا في الجزائر: غرف مراجعة بسبورة وصوت، دورات أساتذة، مكتبة ملخّصات، مساعدة ذكيّة، مجتمع، وأدوات مجّانية لحساب المعدّل وتنظيم المراجعة.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: absUrl("/features") },
  openGraph: { images: OG_DEFAULT, type: "website", locale: "ar_DZ", url: absUrl("/features"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const CHAPTER_ICON: Record<GuideChapter["icon"], typeof faUsers> = {
  start: faRocket,
  rooms: faChalkboard,
  learn: faGraduationCap,
  community: faUsers,
  tools: faScrewdriverWrench,
  content: faBookOpen,
  teacher: faChalkboardUser,
  pay: faCreditCard,
  help: faCircleQuestion,
};

const toolsCount = GUIDE.find((c) => c.id === "tools")?.sections.length ?? 0;

const STATS = [
  { n: String(BRANCHES.length), label: "شُعب لها حاسبة معدّل بمعاملاتها" },
  { n: String(toolsCount), label: "أدوات مراجعة، أغلبها بلا تسجيل" },
  { n: String(GUIDE_SECTION_COUNT), label: "قسماً مشروحاً في دليل المنصّة" },
  { n: "0 دج", label: "ثمن الحساب والغرف العامّة والمجتمع" },
];

const START = [
  { title: "أنشئ حسابك", body: "بريد إلكتروني وكلمة مرور، ثمّ تختار شعبتك وولايتك فتُخصَّص المنصّة لموادّك." },
  { title: "ادخل غرفة أو احسب معدّلك", body: "الغرف المفتوحة الآن تظهر في صفحة الغرف، والحاسبات تعمل حتى بلا حساب." },
  { title: "اجعلها عادة", body: "ثبّت المنصّة على هاتفك كتطبيق، وفعّل الإشعارات لتصلك تذكيرات الجلسات." },
];

const DEVICES = [
  { title: "في المتصفّح مباشرة", body: "لا شيء يُثبَّت: Chrome أو Safari أو Edge، على الهاتف أو اللوحي أو الحاسوب." },
  { title: "أو كتطبيق على شاشتك", body: "تُضاف إلى الشاشة الرئيسية على أندرويد وآيفون والحاسوب، فتفتح بلا شريط المتصفّح وتصلك الإشعارات." },
  { title: "مصمّمة للهاتف أوّلاً", body: "السبورة ترسل الخطوط لا الصور فتبقى خفيفة على بيانات الهاتف، والغرفة تتكيّف مع الوضعين الرأسي والأفقي." },
  { title: "عربية من اليمين إلى اليسار", body: "الواجهة والمحتوى بالعربية، والمعادلات تُكتب بشكلها الرياضي الصحيح." },
];

const TRUST = [
  { title: "ميكروفونك مغلق عند الدخول", body: "لا يُفتح إلّا حين تضغطه بنفسك بعد أن يأذن لك صاحب الغرفة، والصوت مباشر لا يُسجَّل." },
  { title: "لا نرى بيانات بطاقتك", body: "الدفع الإلكتروني يتمّ على صفحة Chargily، ويصلنا منها أنّ العملية نجحت فقط." },
  { title: "الدورات تُراجَع قبل النشر", body: "لا تظهر دورة في الكتالوج إلّا بعد موافقة إدارة المنصّة." },
  { title: "تبليغ وإشراف", body: "أيّ منشور مخالف يُبلَّغ عنه بضغطة ويُراجَع، وصاحب الغرفة يُخرج من يشوّش." },
];

const FAQ = [
  {
    q: "ما هي منصّة BacZone؟",
    a: "منصّة دراسة جزائرية لتلاميذ السنة الثالثة ثانوي: تجمع غرف مراجعة مباشرة بسبورة وصوت، ودورات ينشئها أساتذة، ومكتبة ملخّصات، ومساعدة ذكيّة، ومجتمعاً للأسئلة، وأدوات لحساب المعدّل وتنظيم المراجعة ودليلاً للتخصّصات الجامعية.",
  },
  {
    q: "هل BacZone مجّانية؟",
    a: "الحساب والغرف العامّة والمجتمع والمجموعات والخبّاشة والأدوات والمقالات ودليل التخصّصات مجّانية. المدفوع هو ما يقرّر صاحبه بيعه — بعض غرف الأساتذة وبعض الدورات وبعض مصادر المكتبة — وسعره ظاهر قبل الدخول.",
  },
  {
    q: "هل أحتاج حساباً لاستعمالها؟",
    a: "لا تحتاجه لحساب المعدّل والمعدّل الموزون ومحاكاة البكالوريا الفردية وبرنامج المراجعة والمقالات ودليل التخصّصات. وتحتاجه للغرف والمجتمع والدورات والخبّاشة وكلّ ما يُحفظ باسمك.",
  },
  {
    q: "هل تعمل على الهاتف؟",
    a: "نعم، وهي مصمّمة للهاتف أوّلاً. تعمل في المتصفّح مباشرة، وتستطيع تثبيتها كتطبيق على الشاشة الرئيسية في أندرويد وآيفون.",
  },
  {
    q: "أنا أستاذ، ماذا أجد فيها؟",
    a: "تسجّل بحساب أستاذ فتنشئ غرف تدريس بشارة مميّزة، وتجدول حصصك، وتنشئ دورات تُراجَع ثمّ تُنشر، وتضيف مصادر إلى المكتبة، وتتابع مبيعاتك إن جعلت محتواك مدفوعاً.",
  },
  {
    q: "أين أتعلّم استعمال كلّ قسم؟",
    a: "في دليل المنصّة: يشرح كلّ قسم خطوة بخطوة، ومعه حلول للمشاكل الشائعة كالميكروفون والإشعارات.",
  },
];

export default function FeaturesIndex() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: "المنصّة", item: absUrl("/features") },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESC,
      url: absUrl("/features"),
      inLanguage: "ar",
      dateModified: GUIDE_UPDATED,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />
      <main className="min-h-screen bg-[var(--bz-bg)]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <h1 className="bz-rooms-h1">منصّة BacZone: مكان واحد لتحضير البكالوريا</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.95] text-text-muted">
            BacZone منصّة دراسة جزائرية لتلاميذ السنة الثالثة ثانوي وأساتذتهم. تراجع فيها مع زملائك وأستاذك على سبورة
            مشتركة وبالصوت، وتدرس وحدك من دورات وملخّصات، وتحسب معدّلك وتنظّم أسبوعك — وكلّ ذلك في المتصفّح، بلا
            تطبيق يُثبَّت.
          </p>
          <div className="bz-platform-cta mt-5">
            <Link href="/register" className="bz-help-btn !mt-0">أنشئ حسابك مجّاناً <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></Link>
            <Link href="/help" className="bz-help-ghost !mt-0">دليل المنصّة</Link>
          </div>

          <div className="bz-platform-stats">
            {STATS.map((s) => <div key={s.label}><b>{s.n}</b><span>{s.label}</span></div>)}
          </div>

          {/* ── لمن ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-who">
            <h2 id="pf-who">لمن صُنعت؟</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="bz-feature-role">
                <span>للتلميذ</span>
                <p>
                  تجد غرفة مراجعة مفتوحة حين تريد أن تدرس مع غيرك، وأستاذاً يشرح على السبورة، ومن يجيب عن سؤالك في المجتمع،
                  ومساعدة ذكيّة حين لا يوجد من تسأله. ومعها أدوات تحوّل القلق إلى خطّة: معدّلك، برنامجك الأسبوعي، وما
                  بقي من دروسك.
                </p>
              </div>
              <div className="bz-feature-role is-teacher">
                <span>للأستاذ</span>
                <p>
                  قسم كامل في المتصفّح: سبورة بأدوات هندسية ورموز رياضية، صوت تتحكّم في من يتكلّم فيه، استفتاء وتحدٍّ
                  ومحاكاة بكالوريا لتختبر الفهم، ثمّ دورات ومصادر تنشرها لتلاميذ مادّتك وتتابع مبيعاتها إن شئت.
                </p>
              </div>
            </div>
          </section>

          {/* ── خريطة الأقسام ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-map">
            <h2 id="pf-map">أقسام المنصّة</h2>
            <p className="bz-platform-sub">
              هذه كلّ أقسام BacZone كما هي اليوم. اضغط أيّ بطاقة لتقرأ شرح القسم في دليل المنصّة خطوة بخطوة.
            </p>
            <div className="bz-platform-map">
              {GUIDE.filter((c) => c.id !== "help").map((c) => (
                <Link key={c.id} href={`/help#ch-${c.id}`}>
                  <span className="bz-platform-map-head">
                    <FontAwesomeIcon icon={CHAPTER_ICON[c.icon]} aria-hidden="true" />
                    <b>{c.title}</b>
                  </span>
                  <p>{c.blurb}</p>
                  <ul>{c.sections.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
                </Link>
              ))}
            </div>
          </section>

          {/* ── الميزات بالتفصيل ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-features">
            <h2 id="pf-features">أبرز الميزات بالتفصيل</h2>
            <p className="bz-platform-sub">لكلّ ميزة صفحتها: كيف تعمل، ما تفيد التلميذ والأستاذ، وأسئلتها الشائعة.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {FEATURE_PAGES.map((f) => (
                <Link key={f.slug} href={`/features/${f.slug}`} className="bz-feature-mini is-lg">
                  <span className="bz-feature-icon bz-feature-icon--sm" aria-hidden="true"><FontAwesomeIcon icon={FEATURE_ICON[f.icon]} /></span>
                  <span className="min-w-0"><b>{f.title}</b><small>{f.short}</small></span>
                  <FontAwesomeIcon icon={faArrowLeft} className="bz-feature-mini-go h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </section>

          {/* ── البداية ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-start">
            <h2 id="pf-start">كيف تبدأ؟</h2>
            <ol className="bz-feature-steps">
              {START.map((s, i) => (
                <li key={s.title}>
                  <span className="bz-feature-step-n" aria-hidden="true">{i + 1}</span>
                  <div><h3>{s.title}</h3><p>{s.body}</p></div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── المجّاني والمدفوع ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-price">
            <h2 id="pf-price">ما المجّاني وما المدفوع؟</h2>
            <ul className="bz-platform-list is-2">
              <li>
                <b>مجّاني</b>
                <span>الحساب، الغرف العامّة وإنشاؤها، المجتمع والمجموعات، الخبّاشة، كلّ أدوات المراجعة، المقالات، ودليل التخصّصات.</span>
              </li>
              <li>
                <b>مدفوع حين يقرّر صاحبه</b>
                <span>بعض غرف الأساتذة، بعض الدورات، وبعض مصادر المكتبة. السعر ظاهر قبل الدخول، والدفع بالبطاقة عبر Chargily أو بكود وصول.</span>
              </li>
            </ul>
          </section>

          {/* ── الأجهزة ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-devices">
            <h2 id="pf-devices">على أيّ جهاز تعمل؟</h2>
            <ul className="bz-platform-list is-2">
              {DEVICES.map((d) => <li key={d.title}><b>{d.title}</b><span>{d.body}</span></li>)}
            </ul>
          </section>

          {/* ── الخصوصية ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-trust">
            <h2 id="pf-trust">الخصوصية والأمان</h2>
            <ul className="bz-platform-list is-2">
              {TRUST.map((d) => <li key={d.title}><b>{d.title}</b><span>{d.body}</span></li>)}
            </ul>
            <p className="bz-platform-sub">
              التفاصيل الكاملة في <Link href="/privacy" className="font-bold text-[var(--v9-link,var(--bz-blue))] underline underline-offset-4">سياسة الخصوصية</Link>.
            </p>
          </section>

          {/* ── أسئلة شائعة ── */}
          <section className="bz-platform-sec" aria-labelledby="pf-faq">
            <h2 id="pf-faq">أسئلة شائعة عن المنصّة</h2>
            <div className="bz-feature-faq">
              {FAQ.map((x) => (
                <details key={x.q}>
                  <summary>{x.q}</summary>
                  <p>{x.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="bz-feature-cta">
            <Link href="/register" className="bz-feature-cta-btn">أنشئ حسابك وابدأ <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
