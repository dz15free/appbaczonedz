
import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import { GuideBrowser } from "@/features/guide/guide-browser";
import { absUrl } from "@/features/guide/site-url";
import { getGuideRows } from "@/features/guide/guide-server";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

const TITLE = "تعرّف على تخصّصك الجامعي قبل أن تختاره";
const DESC =
  "دليل التخصّصات الجامعية في الجزائر: ماذا تدرس فعلاً في كل تخصّص، كيف تُقبل فيه، " +
  "وأين تعمل بعد التخرّج — بلغة يفهمها طالب البكالوريا.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "التخصصات الجامعية في الجزائر", "التوجيه الجامعي", "دليل الجامعة",
    "معدلات القبول", "بكالوريا", "المدارس العليا", "BacZone", "باك زون",
  ],
  alternates: { canonical: "/specialties" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: "/specialties",
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export const revalidate = 1800;

export default async function SpecialtiesPage() {
  const rows = await getGuideRows();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESC,
    inLanguage: "ar",
    url: absUrl("/specialties"),
  };

  return (
    <EditablePage pageKey={"specialties"}>
      <>
        <PublicHeader />
        <main className="bz-guide min-h-screen">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <header className="bz-specialties-editorial-hero">
            <div className="bz-specialties-editorial-grid mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
              <div className="bz-specialties-editorial-copy">
                <span className="bz-guide-kicker">دليل التوجيه الجامعي</span>
                <h1 className="mt-3 max-w-3xl font-display text-[28px] font-extrabold leading-[1.25] sm:text-[45px]">{TITLE}</h1>
                <p className="mt-4 max-w-2xl text-[14px] leading-[2] text-white/80 sm:text-[16px]">
                  لا يكفي أن يعجبك اسم التخصّص. اقرأ ما وراء الاسم: طبيعة الدراسة، المواد التي سترافقك، شكل المسار، والمعلومات التي تساعدك على اتخاذ قرار أهدأ.
                </p>
                <div className="bz-specialties-editorial-actions">
                  <a href="#specialties-directory" className="bz-specialties-primary-action">ابدأ من الدليل <span>↓</span></a>
                  <Link href="/calculate" className="bz-specialties-secondary-action">احسب معدّلك أولاً <span>←</span></Link>
                </div>
              </div>
              <aside className="bz-specialties-reading-card" aria-label="طريقة قراءة الدليل">
                <span className="bz-specialties-reading-index">قبل الاختيار</span>
                <h2>اقرأ التخصّص كمسار، لا كعنوان</h2>
                <div className="bz-specialties-reading-steps">
                  <div><b>01</b><span>افهم ماذا ستدرس فعلاً</span></div>
                  <div><b>02</b><span>راجع القبول والمعلومات المتاحة</span></div>
                  <div><b>03</b><span>وازن المسار مع ما يناسبك</span></div>
                </div>
                <p>استعمل البحث والتصفية للعثور على التخصّص، ثم خذ وقتك في قراءة الدليل كاملاً.</p>
              </aside>
            </div>
          </header>

          <PublicSidebarLayout placement="guides">
            <div id="specialties-directory" className="mx-auto w-full max-w-6xl px-3 pb-14 pt-7 sm:px-4">
              <div className="bz-specialties-directory-intro"><div><span>دليل التخصّصات</span><h2>ابحث عن المجال الذي تريد فهمه</h2></div><p>ابحث بالاسم أو تصفّح حسب المجال، ثم افتح الدليل الذي يهمك.</p></div>
              <GuideBrowser rows={rows} />
            </div>
          </PublicSidebarLayout>
        </main>
        <PublicCta title={"اخترت تخصّصك؟ الخطوة التالية هي معدّلك"} hint={"انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، ملخّصات ومواضيع — مجّاناً."} />
      </>
    </EditablePage>
  );
}
