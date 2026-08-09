import { mergeGuide, type SpecContent, type SpecFull } from "@/features/guide/guide-merge";

/* ════════════════════════════════════════════════════════════
   قراءة الدليل **على الخادم**

   عبر REST مع `revalidate`: بلا حزمة Firebase على الخادم، وبلا سرّ
   (عقدة `guide` قابلة للقراءة علناً بحسب القواعد)، وبتخزين مؤقّت
   نصف ساعة فلا تُثقل الباقة المجّانية.
   ════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const PATH = "guide/specialities";

export async function getGuideRows(): Promise<SpecFull[]> {
  if (!DB) return mergeGuide({});
  try {
    const res = await fetch(`${DB}/${PATH}.json`, { next: { revalidate: 1800 } });
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
