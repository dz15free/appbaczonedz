import { mergeGuide, type SpecContent, type SpecFull } from "@/features/guide/guide-merge";

/* ════════════════════════════════════════════════════════════
   قراءة الدليل **على الخادم**

   🐛 كانت ٢٦٠ صفحة تخصّص — كلّها مُرسَلة إلى Google في `sitemap.xml` —
   تُصيَّر على الخادم بهذا المحتوى الكامل:

       <main>جارٍ التحميل…</main>

   لأنّ `SpecArticle` كان مكوّن عميل يجلب المحتوى داخل `useEffect`.
   فلا عنوان `<h1>`، ولا نصّ، ولا JSON-LD — كلّها تحت `return` مبكّر.
   وفوق ذلك كان `generateMetadata` يُرجع **العنوان نفسه حرفياً** لكل
   الصفحات الـ٢٦٠. أي أنّ محرّك البحث يرى مئتين وستّين صفحة متطابقة
   العنوان وفارغة الجسم.

   القراءة هنا عبر REST مع `revalidate`: بلا حزمة Firebase على الخادم،
   وبلا سرّ (عقدة `guide` قابلة للقراءة علناً بحسب القواعد)، وبتخزين
   مؤقّت ساعةً كاملة فلا تُثقل الباقة المجّانية.
   ════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const PATH = "guide/specialities";

/** ساعة: المحتوى تحريريّ يتغيّر نادراً، والزحف لا يحتاج أطزج من ذلك */
export const GUIDE_REVALIDATE = 3600;

export async function getGuideRows(): Promise<SpecFull[]> {
  if (!DB) return mergeGuide({});
  try {
    const res = await fetch(`${DB}/${PATH}.json`, {
      next: { revalidate: GUIDE_REVALIDATE },
    });
    if (!res.ok) return mergeGuide({});
    const val = (await res.json()) as Record<string, SpecContent> | null;
    return mergeGuide(val ?? {});
  } catch {
    /* الشبكة أو القاعدة معطّلة: نعرض ما في البذرة بدل صفحة خطأ —
       المحتوى التحريريّ موجود أصلاً في الشيفرة. */
    return mergeGuide({});
  }
}

/** يجد تخصّصاً بالرابط المخصّص، ثمّ الروابط القديمة، ثمّ المعرّف */
export function findSpec(rows: SpecFull[], slug: string): SpecFull | null {
  const t = slug.trim().toLowerCase();
  return (
    rows.find((s) => (s.permalink?.trim() || s.slug).toLowerCase() === t) ??
    rows.find((s) => (s.aliases ?? []).some((a) => a.toLowerCase() === t)) ??
    rows.find((s) => s.slug.toLowerCase() === t) ??
    null
  );
}
