"use client";

import { ref, onValue, set, remove, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { SPEC_INDEX, type SpecLite } from "@/features/guide/spec-index";
import { SEED_CONTENT } from "@/features/guide/seed-content";
// إعادة تصدير: المستوردون القدامى لا ينكسرون، والمصدر ملفّ محايد
export { absUrl, SITE_URL } from "@/features/guide/site-url";

/* ════════════════════════════════════════════════════════════
   محتوى دليل التخصّصات — تكتبه أنت

   الفهرس في الشيفرة يحمل **الأسماء فقط**. أمّا الشرح فيُكتب من لوحة
   الإدارة ويُخزَّن هنا، فيتغيّر بلا إعادة نشر للموقع.

   **الرابط (permalink) منفصل عن المعرّف** عمداً: المعرّف مفتاح داخلي
   ثابت يربط المحتوى بالفهرس، والرابط هو ما يظهر في المتصفّح وتفهرسه
   Google. فصلهما يتيح لك تحسين الرابط دون أن ينكسر الربط الداخلي.

   ⚠️ لكنّ تغيير رابط منشور يُلغي ترتيبه في Google ويكسر كل مشاركة —
   لذلك تُحذّرك الواجهة قبل التغيير، ونحتفظ بالروابط القديمة في
   `aliases` فتظلّ تعمل بدل أن تعطي 404.
════════════════════════════════════════════════════════════ */

const PATH = "guide/specialities";


export interface SpecContent {
  /** الرابط الظاهر — إن غاب استُعمل المعرّف */
  permalink?: string;
  /** روابط سابقة تظلّ تعمل بعد التغيير */
  aliases?: string[];
  title?: string;
  fr?: string;
  field?: string;
  /** وصف قصير للسيو ولبطاقة الفهرس */
  excerpt?: string;
  intro?: string;
  study?: string;
  admission?: string;
  subjects?: string;
  careers?: string;
  pros?: string;
  cons?: string;
  verdict?: string;
  /* أقسام إضافية من مراجع المناهج — تُثري المقال بما يهمّ الطالب فعلاً
     ولا يجده في الوصف الرسمي: ماذا بعد الليسانس، أين يُدرَّس، وماذا
     يقول من درسه. */
  modules?: string;
  master?: string;
  where?: string;
  salary?: string;
  daily?: string;
  numbers?: string;
  future?: string;
  voices?: string;
  prosCons?: string;
  /** مسودّة لا تظهر للزوّار */
  draft?: boolean;
  updatedAt?: number;
}

export type SpecFull = SpecLite & SpecContent & { published: boolean };

/** يدمج الفهرس الثابت مع ما كتبتَه */
export function mergeGuide(content: Record<string, SpecContent>): SpecFull[] {
  return SPEC_INDEX.map((s) => {
    /* البذرة أساس، وما كتبتَه في لوحة الإدارة يفوز عليها حقلاً حقلاً —
       فتستطيع تعديل قسم واحد دون إعادة كتابة الباقي. */
    const c = { ...(SEED_CONTENT[s.slug] ?? {}), ...(content?.[s.slug] ?? {}) };
    return {
      ...s,
      ...c,
      ar: c.title?.trim() || s.ar,
      fr: c.fr?.trim() || s.fr,
      field: c.field?.trim() || s.field,
      // منشور = له مقدّمة وليس مسودّة. صفحة فارغة أسوأ من غيابها.
      // منشور = له مقدّمة وليس مسودّة صراحةً
      published: Boolean(c.intro?.trim()) && c.draft !== true,
    };
  });
}

export function listenGuide(cb: (rows: SpecFull[]) => void) {
  return onValue(ref(rtdb, PATH), (snap) => {
    cb(mergeGuide((snap.val() as Record<string, SpecContent> | null) ?? {}));
  });
}

/** الرابط الظاهر لتخصّص */
export function linkOf(s: SpecFull): string {
  return (s.permalink?.trim() || s.slug).replace(/^\/+|\/+$/g, "");
}

/** رابط صالح: لاتيني صغير بلا مسافات — ما يظهر في شريط العنوان */
export function normalizePermalink(x: string): string {
  return x
    .trim().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function saveSpec(slug: string, patch: SpecContent) {
  /* 🐛 التخصّص الجديد يُنشأ بـ`draft: true`، ولم يكن هناك أي سبيل
     لإلغائها — فيُحفظ المقال ولا يُنشر أبداً مهما كتبت.
     الحفظ مع مقدّمة يعني نيّة النشر، فنرفع المسودّة صراحةً. */
  const clean: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.intro?.trim()) clean.draft = false;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") continue;   // القاعدة ترفض undefined
    clean[k] = v;
  }
  await update(ref(rtdb, `${PATH}/${slug}`), clean);
}

/** تغيير الرابط مع حفظ القديم فلا تنكسر الروابط المنشورة */
export async function changePermalink(slug: string, next: string) {
  const link = normalizePermalink(next);
  if (!link) return null;
  const snap = await get(ref(rtdb, `${PATH}/${slug}`));
  const cur = (snap.val() as SpecContent | null) ?? {};
  const old = (cur.permalink ?? slug).trim();
  const aliases = new Set([...(cur.aliases ?? []), old].filter((x) => x && x !== link));
  await update(ref(rtdb, `${PATH}/${slug}`), {
    permalink: link,
    aliases: [...aliases].slice(-8),   // نحتفظ بآخر ثمانية فقط
    updatedAt: Date.now(),
  });
  return link;
}

/** حذف المحتوى — الاسم يبقى في الفهرس، فتُعيد الكتابة متى شئت */
export async function clearSpec(slug: string) {
  await remove(ref(rtdb, `${PATH}/${slug}`));
}

/** تخصّص جديد لا يوجد في الفهرس */
export async function addSpec(slug: string, data: SpecContent) {
  const key = normalizePermalink(slug);
  if (!key) return null;
  await set(ref(rtdb, `${PATH}/${key}`), { ...data, permalink: key, updatedAt: Date.now() });
  return key;
}
