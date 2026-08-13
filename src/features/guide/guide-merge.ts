/* ════════════════════════════════════════════════════════════
   دمج الدليل — وحدة **محايدة** (بلا "use client" وبلا Firebase)

   🐛 كانت هذه الدوالّ داخل `guide-store.ts` وأعلاه `"use client"`،
   وهي تستورد `SEED_CONTENT` — **١٫١٩ ميغابايت** من محتوى الدليل.
   فكانت الحزمة كلّها تُشحن إلى متصفّح كل زائر لصفحتي التخصّصات، ثمّ
   يُرمى نصفها لحظة وصول بيانات Firebase.

   وأخطر من ذلك: لأنّ الصفحة كانت مكوّن عميل يجلب المحتوى في
   `useEffect`، فإنّ ما يصل إلى زاحف Google هو هذا حرفياً:

       <main>جارٍ التحميل…</main>

   لا عنوان، ولا نصّ، ولا بيانات منظّمة — في **٢٦٠ صفحة** مُرسَلة
   إليه في `sitemap.xml`. بفصل الدمج هنا صار الخادم يقرؤه ويُصيّر
   الصفحة جاهزة، ولا يحمّل الزائر بايتاً واحداً من البذرة.
   ════════════════════════════════════════════════════════════ */

import { SPEC_INDEX, type SpecLite } from "@/features/guide/spec-index";
import { SEED_CONTENT } from "@/features/guide/seed-content";

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

/* بعض مفاتيح المحتوى تحمل علامات فرنسية، بينما الروابط الثابتة في الفهرس
   تستعمل صيغة ASCII. نطابق الصيغتين بعد إزالة العلامات فقط؛ لا نغيّر
   الرابط العام ولا ننسخ المحتوى إلى مفاتيح مكررة. */
function plainSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const SEED_BY_PLAIN_SLUG = new Map(
  Object.entries(SEED_CONTENT).map(([slug, value]) => [plainSlug(slug), value]),
);

/** يدمج الفهرس الثابت مع ما كتبتَه */
export function mergeGuide(content: Record<string, SpecContent>): SpecFull[] {
  return SPEC_INDEX.map((s) => {
    /* البذرة أساس، وما كتبتَه في لوحة الإدارة يفوز عليها حقلاً حقلاً —
       فتستطيع تعديل قسم واحد دون إعادة كتابة الباقي. */
    const seed = SEED_CONTENT[s.slug] ?? SEED_BY_PLAIN_SLUG.get(plainSlug(s.slug));
    const c = { ...(seed ?? {}), ...(content?.[s.slug] ?? {}) };
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


/* `linkOf` و`normalizePermalink` في `spec-link.ts`: استيرادهما من هنا
   يجرّ `SEED_CONTENT` معهما إلى أي مكوّن عميل يحتاج بناء رابط. */
export { linkOf, normalizePermalink } from "@/features/guide/spec-link";
