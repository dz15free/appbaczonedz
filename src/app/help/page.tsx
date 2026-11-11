import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faBookOpen, faChalkboard, faChalkboardUser, faCircleQuestion, faCreditCard,
  faGraduationCap, faLocationDot, faRocket, faScrewdriverWrench, faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { GUIDE, GUIDE_SECTION_COUNT, GUIDE_UPDATED, type GuideChapter, type GuideSection } from "@/features/help/guide-data";
import { GuideSearch } from "@/features/help/guide-search";
import { absUrl } from "@/lib/site-url";
import { OG_DEFAULT } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════
   دليل المنصّة — /help

   يشرح الموقع قسماً بقسم لمن دخله أوّل مرّة ولمن يبحث عن زرّ بعينه.
   داخل قشرة التطبيق (`AppShell`) لأنّه جزء من المنصّة لا صفحة تسويق:
   يفتحه التلميذ من القائمة وهو في منتصف عمله ويعود منه بضغطة.

   المحتوى في `features/help/guide-data.ts` ويُرسَم كلّه على الخادم،
   فيُقرأ ويُفهرَس بلا JavaScript. كلّ قسم `<details>`: الصفحة طويلة
   (أربعون قسماً ونيّف)، والطيّ يجعلها فهرساً يُتصفَّح لا جداراً يُمرَّر.
   ════════════════════════════════════════════════════════════ */

const TITLE = "دليل منصّة BacZone — كلّ قسم وكيف تستعمله";
const DESC =
  "شرح منصّة BacZone قسماً بقسم: إنشاء الحساب، غرف الدراسة والسبورة والصوت، الدورات، المكتبة، الخبّاشة، المجتمع، أدوات المراجعة، والدفع — مع حلول للمشاكل الشائعة.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: absUrl("/help") },
  openGraph: { images: OG_DEFAULT, type: "article", locale: "ar_DZ", url: absUrl("/help"), title: TITLE, description: DESC, siteName: "BacZone" },
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

const WHO_LABEL: Record<GuideSection["who"], string | null> = {
  all: null,
  student: "للتلميذ",
  teacher: "للأستاذ",
};

/* ثلاثة مداخل لمن لا يعرف من أين يبدأ */
const QUICK = [
  { href: "#account", n: "١", title: "أنشئ حسابك", body: "بريد وكلمة مرور، ثمّ اختر شعبتك." },
  { href: "#rooms-list", n: "٢", title: "ادخل غرفة مراجعة", body: "استمع وتابع السبورة، وارفع يدك لتسأل." },
  { href: "#calculate", n: "٣", title: "احسب معدّلك", body: "بمعاملات شعبتك — بلا تسجيل." },
];

/** «قسمان» · «٣ أقسام» · «١١ قسماً» — العدد العربي يغيّر معدوده */
function countLabel(n: number): string {
  if (n === 1) return "قسم واحد";
  if (n === 2) return "قسمان";
  return n <= 10 ? `${n} أقسام` : `${n} قسماً`;
}

function Section({ s }: { s: GuideSection }) {
  const who = WHO_LABEL[s.who];
  return (
    <details id={s.id} className="bz-help-sec" data-guide-section>
      <summary>
        <span className="bz-help-sec-head">
          <span className="bz-help-sec-title">
            <h3>{s.title}</h3>
            {who && <span className={`bz-help-who${s.who === "teacher" ? " is-teacher" : ""}`}>{who}</span>}
          </span>
          <span className="bz-help-sec-lead">{s.lead}</span>
        </span>
        <span className="bz-help-chev" aria-hidden="true" />
      </summary>

      <div className="bz-help-body">
        {s.where && (
          <p className="bz-help-where">
            <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" />
            <span><b>أين تجده:</b> {s.where}</span>
          </p>
        )}
        {s.steps && (
          <ol className="bz-help-steps">
            {s.steps.map((t, i) => <li key={i}><span aria-hidden="true">{i + 1}</span><p>{t}</p></li>)}
          </ol>
        )}
        {s.points && <ul className="bz-help-points">{s.points.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        {s.tip && <p className="bz-help-callout is-tip"><b>نصيحة</b>{s.tip}</p>}
        {s.note && <p className="bz-help-callout is-note"><b>انتبه</b>{s.note}</p>}
        {s.link && (
          <Link href={s.link.href} className="bz-help-open">
            {s.link.label} <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </details>
  );
}

export default function HelpPage() {
  const updated = new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(GUIDE_UPDATED));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: TITLE,
      description: DESC,
      inLanguage: "ar",
      dateModified: GUIDE_UPDATED,
      mainEntityOfPage: absUrl("/help"),
      author: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      publisher: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      articleSection: GUIDE.map((c) => c.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: "المنصّة", item: absUrl("/features") },
        { "@type": "ListItem", position: 3, name: "دليل المنصّة", item: absUrl("/help") },
      ],
    },
  ];

  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bz-help mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:pt-10">
        <nav aria-label="مسار التنقّل" className="bz-help-crumbs">
          <Link href="/features">المنصّة</Link>
          <span aria-hidden="true">←</span>
          <span>دليل المنصّة</span>
        </nav>

        <header className="bz-help-hero">
          <span className="bz-help-kicker">
            <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" /> دليل المنصّة
          </span>
          <h1>كلّ قسم في BacZone، وكيف تستعمله</h1>
          <p>
            شرح للمنصّة قسماً بقسم: ما هو كلّ قسم، أين تجده، وما الذي تضغطه. افتح القسم الذي تحتاجه،
            أو اكتب ما تبحث عنه.
          </p>
          <GuideSearch />
          <p className="bz-help-meta">
            {GUIDE.length} فصول · {GUIDE_SECTION_COUNT} قسماً · آخر مراجعة {updated}
          </p>
        </header>

        <section aria-labelledby="guide-quick" className="bz-help-quick">
          <h2 id="guide-quick">جديد هنا؟ ابدأ بهذه الثلاث</h2>
          <div>
            {QUICK.map((x) => (
              <a key={x.href} href={x.href}>
                <span aria-hidden="true">{x.n}</span>
                <b>{x.title}</b>
                <small>{x.body}</small>
              </a>
            ))}
          </div>
        </section>

        <nav aria-label="فصول الدليل" className="bz-help-toc">
          {GUIDE.map((c) => (
            <a key={c.id} href={`#ch-${c.id}`}>
              <FontAwesomeIcon icon={CHAPTER_ICON[c.icon]} aria-hidden="true" />
              <span><b>{c.title}</b><small>{countLabel(c.sections.length)}</small></span>
            </a>
          ))}
        </nav>

        {GUIDE.map((c) => (
          <section key={c.id} id={`ch-${c.id}`} className="bz-help-chapter" data-guide-chapter aria-labelledby={`ch-${c.id}-t`}>
            <div className="bz-help-chapter-head">
              <span className="bz-feature-icon bz-feature-icon--sm" aria-hidden="true">
                <FontAwesomeIcon icon={CHAPTER_ICON[c.icon]} />
              </span>
              <div>
                <h2 id={`ch-${c.id}-t`}>{c.title}</h2>
                <p>{c.blurb}</p>
              </div>
            </div>
            {c.sections.map((s) => <Section key={s.id} s={s} />)}
          </section>
        ))}

        <aside className="bz-help-end">
          <h2>لم تجد ما تبحث عنه؟</h2>
          <p>راسلنا واذكر الصفحة والجهاز وما ضغطت، فنجيبك من أوّل مرّة — ونضيف الجواب إلى هذا الدليل.</p>
          <div>
            <Link href="/contact" className="bz-help-btn">اتصل بنا</Link>
            <Link href="/features" className="bz-help-ghost">ما الذي تقدّمه المنصّة؟</Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
