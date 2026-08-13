
import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookOpen,
  faCalculator,
  faBrain,
  faCalendarCheck,
  faChartLine,
  faCircleUser,
  faClock,
  faFileLines,
  faGaugeHigh,
  faGraduationCap,
  faListCheck,
  faPlay,
  faScaleBalanced,
  faSquareCheck,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { TOOLS, type Tool } from "@/features/tools/tools-data";

const TITLE = "أدوات البكالوريا — حاسبات ومخططات ومحاكاة مجانية";
const DESC = "أدوات مجانية لطلبة البكالوريا في الجزائر: حساب المعدل، المعدل الموزون، مخطط المراجعة، مؤقت التركيز، ودليل التخصصات — أغلبها بلا تسجيل.";

const TOOL_ICONS: Record<string, typeof faCalculator> = {
  "/calculate": faGaugeHigh,
  "/tools/weighted-average": faScaleBalanced,
  "/tools/exam-simulator": faVideo,
  "/tools/study-planner": faCalendarCheck,
  "/tools/youtube-channels": faPlay,
  "/tools/planner": faFileLines,
  "/tools/pomodoro": faClock,
  "/specialties": faGraduationCap,
  "/tools/tracker": faChartLine,
  "/tools/flashcards": faBrain,
  "/tools/tasks": faListCheck,
};

const GROUPS = [
  {
    id: "know",
    eyebrow: "اعرف وضعك",
    title: "ابدأ من الأرقام التي تهمّك",
    desc: "احسب معدّلك، افهم أثر المادة ذات المعامل الأكبر، ثمّ اكتشف الخيارات التي تناسبك.",
    tone: "blue",
    hrefs: ["/calculate", "/tools/weighted-average", "/specialties"],
  },
  {
    id: "plan",
    eyebrow: "نظّم أسبوعك",
    title: "حوّل نيتك إلى برنامج قابل للتنفيذ",
    desc: "اختر أداة تخطيط تناسب مرحلتك، من جدول مطبوع إلى متابعة يومية لما أنجزته.",
    tone: "green",
    hrefs: ["/tools/study-planner", "/tools/planner", "/tools/tracker", "/tools/tasks"],
  },
  {
    id: "practice",
    eyebrow: "درّب نفسك",
    title: "اجعل وقت المراجعة أكثر تركيزاً",
    desc: "تدرّب في ظرف قريب من الامتحان، راجع بالاسترجاع النشط، واستعمل جلسات تركيز قصيرة.",
    tone: "rose",
    hrefs: ["/tools/exam-simulator", "/tools/flashcards", "/tools/pomodoro"],
  },
  {
    id: "sources",
    eyebrow: "مصادر منتقاة",
    title: "تعلّم من الشرح المناسب",
    desc: "ابدأ بسؤال واضح، ثم اختر مصدراً يساعدك على فهمه دون أن تضيع بين المقاطع.",
    tone: "violet",
    hrefs: ["/tools/youtube-channels"],
  },
] as const;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["أدوات البكالوريا", "حاسبة معدل البكالوريا", "المعدل الموزون", "مخطط المراجعة", "أدوات الدراسة", "BacZone"],
  alternates: { canonical: "/tools" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ToolsPage() {
  const byHref = new Map(TOOLS.map((tool) => [tool.href, tool]));
  const instant = TOOLS.filter((tool) => !tool.needsAccount);
  const grouped = GROUPS.map((group) => ({ ...group, tools: group.hrefs.map((href) => byHref.get(href)).filter((tool): tool is Tool => Boolean(tool)) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, url: absUrl("/tools"), inLanguage: "ar" },
      { "@type": "ItemList", itemListElement: TOOLS.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absUrl(tool.href) })) },
    ],
  };

  return (
    <main className="bz-guide bz-tools-page bz-tools-product min-h-screen">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-tools-product-hero">
        <div className="bz-tools-product-hero-inner mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
          <div className="bz-tools-product-copy">
            <span className="bz-guide-kicker">BacZone · مساحة أدواتك</span>
            <h1>كل أداة في مكانها الصحيح</h1>
            <p>لا تحتاج إلى فتح عشر صفحات لتعرف من أين تبدأ. اختر هدفك الآن، وخذ أداة تقودك إلى خطوة عملية.</p>
            <div className="bz-tools-product-actions">
              <Link href="/calculate" className="bz-tools-product-primary">ابدأ بحساب معدّلك <FontAwesomeIcon icon={faArrowLeft} /></Link>
              <Link href="/guides" className="bz-tools-product-secondary">اقرأ دليلاً للمراجعة</Link>
            </div>
          </div>
          <div className="bz-tools-product-map" aria-label="خريطة استعمال الأدوات">
            <span className="bz-tools-product-map-orbit orbit-one" />
            <span className="bz-tools-product-map-orbit orbit-two" />
            <span className="bz-tools-product-map-center"><FontAwesomeIcon icon={faGaugeHigh} /></span>
            <span className="bz-tools-product-map-node node-one"><FontAwesomeIcon icon={faCalendarCheck} /><small>خطّط</small></span>
            <span className="bz-tools-product-map-node node-two"><FontAwesomeIcon icon={faVideo} /><small>تدرّب</small></span>
            <span className="bz-tools-product-map-node node-three"><FontAwesomeIcon icon={faGraduationCap} /><small>اختر</small></span>
          </div>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="bz-tools-product-shell mx-auto w-full max-w-6xl px-3 pb-16 sm:px-4">
          <div className="bz-tools-product-overview">
            <span><b>{TOOLS.length}</b> أداة في مكان واحد</span>
            <span><b>{instant.length}</b> تعمل بلا تسجيل</span>
            <span><b>4</b> طرق للبدء</span>
          </div>

          <div className="bz-tools-product-groups">
            {grouped.map((group) => (
              <section key={group.id} className={`bz-tools-product-group tone-${group.tone}`}>
                <div className="bz-tools-product-group-head">
                  <div><span className="bz-tools-product-eyebrow">{group.eyebrow}</span><h2>{group.title}</h2><p>{group.desc}</p></div>
                  <span className="bz-tools-product-group-number">{String(group.tools.length).padStart(2, "0")}</span>
                </div>
                <div className="bz-tools-product-grid">
                  {group.tools.map((tool, index) => <ToolProductCard key={tool.href} tool={tool} index={index} />)}
                </div>
              </section>
            ))}
          </div>

          <section className="bz-tools-product-account">
            <div className="bz-tools-product-account-icon"><FontAwesomeIcon icon={faCircleUser} /></div>
            <div><span className="bz-tools-product-eyebrow">عندما تريد أن تحفظ ما أنجزته</span><h2>بعض الأدوات تصبح أقوى مع حساب مجاني</h2><p>التقدّم والبطاقات والمهام تنتظرك حيث تركتها، بينما تبقى الحاسبات والأدوات الفورية مفتوحة للجميع.</p></div>
            <Link href="/register">أنشئ حسابك <FontAwesomeIcon icon={faArrowLeft} /></Link>
          </section>

          <section className="bz-tools-guidance bz-tools-product-guidance"><span className="bz-tools-guidance-mark">اختيار بسيط</span><h2>لا تستعمل كل شيء في يوم واحد</h2><p>احسب معدلك أولاً، ثم أنشئ برنامجاً أسبوعياً، وبعدها استعمل المؤقت أو المحاكاة في الحصة التي ستنجزها اليوم. الأداة المفيدة هي التي تعود إليها.</p><div><Link href="/calculate">ابدأ بحساب معدلك</Link><Link href="/specialties">تعرّف على تخصصاتك</Link></div></section>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}

function ToolProductCard({ tool, index }: { tool: Tool; index: number }) {
  const icon = TOOL_ICONS[tool.href] ?? faSquareCheck;
  return (
    <Link href={tool.href} className="bz-tools-product-card" style={{ "--tool-color": tool.color } as React.CSSProperties}>
      <span className="bz-tools-product-card-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="bz-tools-product-card-icon"><FontAwesomeIcon icon={icon} /></span>
      <span className="bz-tools-product-card-status"><span className="bz-tools-product-card-status-dot" />{tool.needsAccount ? "بحساب مجاني" : "بلا تسجيل"}</span>
      <span className="bz-tools-product-card-name">{tool.name}</span>
      <span className="bz-tools-product-card-desc">{tool.desc}</span>
      <span className="bz-tools-product-card-benefit">{tool.benefit}</span>
      <span className="bz-tools-product-card-cta">{tool.cta} <FontAwesomeIcon icon={faArrowLeft} /></span>
    </Link>
  );
}
