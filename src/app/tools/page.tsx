import type { Metadata } from "next";
import Link from "next/link";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { TOOLS, type Tool } from "@/features/tools/tools-data";

const TITLE = "أدوات البكالوريا — حاسبات ومخططات ومحاكاة مجانية";
const DESC = "أدوات مجانية لطلبة البكالوريا في الجزائر: حساب المعدل، المعدل الموزون، مخطط المراجعة، مؤقت التركيز، ودليل التخصصات — أغلبها بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["أدوات البكالوريا", "حاسبة معدل البكالوريا", "المعدل الموزون", "مخطط المراجعة", "أدوات الدراسة", "BacZone"],
  alternates: { canonical: "/tools" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ToolsPage() {
  const instant = TOOLS.filter((tool) => !tool.needsAccount);
  const saved = TOOLS.filter((tool) => tool.needsAccount);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, url: absUrl("/tools"), inLanguage: "ar" },
      { "@type": "ItemList", itemListElement: TOOLS.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absUrl(tool.href) })) },
    ],
  };

  return (
    <main className="bz-guide bz-tools-page min-h-screen">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
          <span className="bz-guide-kicker">BacZone · أدوات عملية</span>
          <h1 className="mt-2.5 font-display text-[28px] font-extrabold leading-[1.22] sm:text-5xl">كل ما تحتاجه لتعرف أين تقف</h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-[1.95] text-white/80 sm:text-base">حاسبات سريعة، تخطيط قابل للطباعة، ومحاكاة تساعدك على تحويل المراجعة من نية إلى خطوات واضحة.</p>
          <div className="bz-tools-hero-stats"><span><b>{TOOLS.length}</b> أدوات للطالب</span><span><b>{instant.length}</b> تعمل مباشرة</span><span><b>مجانية</b> بلا تعقيد</span></div>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="bz-tools-shell mx-auto w-full max-w-5xl px-3 pb-16 sm:px-4">
          <section className="bz-tools-section">
            <div className="bz-tools-section-head"><div><span className="bz-tools-eyebrow">ابدأ من هنا</span><h2>أدوات تعمل فورًا</h2><p>لا تحتاج إلى حساب. أدخل ما تعرفه الآن، وخذ نتيجة تساعدك على اتخاذ الخطوة التالية.</p></div><span className="bz-tools-count">{instant.length} أدوات</span></div>
            <div className="bz-tools-grid">{instant.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div>
          </section>

          {saved.length > 0 && <section className="bz-tools-section is-saved"><div className="bz-tools-section-head"><div><span className="bz-tools-eyebrow">مع تقدّمك</span><h2>أدوات تحفظ ما أنجزته</h2><p>تحتاج حسابًا مجانيًا حتى تجد مهامك وبطاقاتك وتقدّمك كما تركتها في المرة السابقة.</p></div><span className="bz-tools-count">{saved.length} أدوات</span></div><div className="bz-tools-grid">{saved.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div></section>}

          <section className="bz-tools-guidance"><span className="bz-tools-guidance-mark">اقتراح سريع</span><h2>لا تستعمل كل شيء في يوم واحد</h2><p>احسب معدلك أولًا، ثم أنشئ برنامجًا أسبوعيًا، وبعدها استعمل المؤقت أو المحاكاة في الحصة التي ستنجزها اليوم. الأداة المفيدة هي التي تعود إليها.</p><div><Link href="/calculate">ابدأ بحساب معدلك</Link><Link href="/specialties">تعرّف على تخصصاتك</Link></div></section>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={tool.href} className="bz-modern-tool-card" style={{ "--tool-color": tool.color } as React.CSSProperties}>
      <span className="bz-modern-tool-line" />
      <span className="bz-modern-tool-top"><span className="bz-modern-tool-dot" /><span>{tool.needsAccount ? "بحساب مجاني" : "بلا تسجيل"}</span></span>
      <span className="bz-modern-tool-name">{tool.name}</span>
      <span className="bz-modern-tool-desc">{tool.desc}</span>
      <span className="bz-modern-tool-bottom"><span>{tool.benefit}</span><b>{tool.cta} ←</b></span>
    </Link>
  );
}
