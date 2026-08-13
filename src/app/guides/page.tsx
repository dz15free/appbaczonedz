import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faCompass, faHouse } from "@fortawesome/free-solid-svg-icons";
import { GUIDES } from "@/features/guides/guides-data";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

const TITLE = "أدلّة البكالوريا والتوجيه الجامعي";
const DESC = "أدلّة مرجعية لطالب البكالوريا في الجزائر: التوجيه بعد البكالوريا، ترتيب الرغبات، والمعدّل الموزون — مشروحة خطوة بخطوة.";
export const metadata: Metadata = { title: TITLE, description: DESC, keywords: ["أدلة البكالوريا", "التوجيه الجامعي", "دليل الطالب", "بكالوريا 2027", "BacZone"], alternates: { canonical: "/guides" }, openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/guides"), title: TITLE, description: DESC, siteName: "BacZone" } };

export default function GuidesIndex() {
  const sectionCount = GUIDES.reduce((total, guide) => total + guide.sections.length, 0);
  const faqCount = GUIDES.reduce((total, guide) => total + guide.faq.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: TITLE, description: DESC, url: absUrl("/guides"), inLanguage: "ar" };
  return <>
    <PublicHeader />
    <main className="bz-guides-editorial min-h-screen bg-[var(--bz-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bz-guides-editorial-hero">
        <div className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-6 sm:py-14">
          <nav className="flex items-center gap-2 text-[11px] text-white/65"><FontAwesomeIcon icon={faHouse} className="h-3 w-3" /><Link href="/" className="hover:text-white hover:underline">الرئيسية</Link><span>←</span><span className="font-bold text-white">الأدلّة</span></nav>
          <div className="bz-guides-editorial-grid mt-8"><div><span className="bz-guides-kicker"><FontAwesomeIcon icon={faCompass} className="h-3 w-3" /> مرجع الطالب</span><h1 className="mt-4 max-w-3xl font-display text-[29px] font-extrabold leading-[1.25] text-white sm:text-[49px]">خذ قرارك الدراسي<br /><span className="text-sky-200">على معرفة.</span></h1><p className="mt-4 max-w-2xl text-[14px] leading-[2] text-white/75 sm:text-[16px]">{DESC}</p></div><div className="bz-guides-hero-stats"><div><b>{GUIDES.length}</b><span>أدلّة</span></div><div><b>{sectionCount}</b><span>قسم مفصّل</span></div><div><b>{faqCount}</b><span>إجابة شائعة</span></div></div></div>
        </div>
      </header>
      <PublicSidebarLayout placement="guides">
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-7 sm:px-6 sm:pt-10">
          <div className="bz-guides-section-heading"><div><span>مكتبة التوجيه</span><h2>اختر الدليل الذي تحتاجه الآن</h2></div><small>خطوة بخطوة، بلا حشو</small></div>
          <div className="bz-guides-editorial-list">{GUIDES.map((guide, index) => <Link key={guide.slug} href={`/guides/${guide.slug}`} className="bz-guides-editorial-card group" style={{ "--guide-color": guide.color } as React.CSSProperties}><span className="bz-guides-card-line" /><span className="bz-guides-card-top"><b>{String(index + 1).padStart(2, "0")}</b><span>{guide.readMinutes} دقائق قراءة</span></span><span className="bz-guides-card-icon"><FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" /></span><h3>{guide.title}</h3><p>{guide.description}</p><span className="bz-guides-card-audience">مناسب لـ: {guide.audience}</span><span className="bz-guides-card-foot"><span>{guide.sections.length} أقسام · {guide.faq.length} أسئلة</span><b>اقرأ الدليل <FontAwesomeIcon icon={faArrowLeft} className="ms-1 h-3 w-3" /></b></span></Link>)}</div>
          <p className="bz-guides-editorial-note">نُضيف الأدلة تدريجياً وبعناية: دليل واحد مفيد أنفع من عشرة سطحية.</p>
        </section>
      </PublicSidebarLayout>
    </main>
  </>;
}
