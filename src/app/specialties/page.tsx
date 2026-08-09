import type { Metadata } from "next";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { EditablePage } from "@/features/admin/editable-page";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";
import { GuideBrowser } from "@/features/guide/guide-browser";
import { absUrl } from "@/features/guide/site-url";
import { getGuideRows } from "@/features/guide/guide-server";

/* ════════════════════════════════════════════════════════════
   دليل التخصّصات — صفحة عامّة

   بلا تسجيل دخول عمداً: الطالب يبحث عن تخصّصه قبل أن يعرف المنصّة،
   وجدار التسجيل يمنع الفهرسة من الأساس لأنّ الزاحف لا يسجّل دخوله.
════════════════════════════════════════════════════════════ */

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

/* نصف ساعة: المحتوى تحريريّ يتغيّر نادراً */
export const revalidate = 1800;

export default async function SpecialtiesPage() {
  /* الصفوف تُقرأ على الخادم فيصل الزاحف إلى قائمة تخصّصات حقيقية،
     ولا يحمّل الزائر بايتاً من محتوى الدليل الكامل. */
  const rows = await getGuideRows();
  const publishedCount = rows.filter((r) => r.published).length;
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
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ══ الترويسة: شريط لوني يميّز الدليل عن بقيّة الموقع ══ */}
      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-5xl px-4 py-9 sm:py-12">
          <span className="bz-guide-kicker">دليل BacZone</span>
          <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.25] sm:text-4xl">
            {TITLE}
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
            كل سنة يختار آلاف الطلبة تخصّصاً لا يعرفون عنه إلا اسمه. هنا تعرف
            <b className="text-white"> ماذا ستدرس فعلاً</b>، و
            <b className="text-white">كيف تُقبل</b>، و
            <b className="text-white">أين تعمل بعدها</b>.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="bz-guide-stat">{SPEC_INDEX.length} تخصّصاً</span>
            <span className="bz-guide-stat">{SPEC_FIELDS.length} مجالات</span>
            <span className="bz-guide-stat">{publishedCount} دليلاً مكتوباً</span>
            <span className="bz-guide-stat">بلا تسجيل</span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-3 pb-14 sm:px-4">
        <GuideBrowser rows={rows} />
      </div>
    </main>
      <PublicCta title={"اخترت تخصّصك؟ الخطوة التالية هي معدّلك"} hint={"انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، ملخّصات ومواضيع — مجّاناً."} />
    </>
    </EditablePage>
  );
}
