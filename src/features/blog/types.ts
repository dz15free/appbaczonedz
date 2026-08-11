/* ════════════════════════════════════════════════════════════
   بنية المدوّنة — ولماذا عقدتان لا واحدة

   المشكلة التي تحلّها هذه البنية: صفحة الفهرس تعرض عشرين مقالاً. لو
   كان نصّ كل مقال داخل سجلّه لَنزّل الخادمُ **نصوص المقالات العشرين
   كاملةً** ليعرض عناوينها — عشرات الكيلوبايتات لتُقرأ منها الأسطر
   الأولى. ولذلك:

     blog/index/{id}    ← بطاقة خفيفة: عنوان، رابط، مقتطف، صورة، حالة
     blog/content/{id}  ← جسم المقال (HTML) — لا يُقرأ إلّا في صفحته

   والفصل ليس تحسيناً مبكّراً: هو الفرق بين فهرسٍ يُبنى في ٣٠ms وآخر
   يُبنى في ثانية، وبين باقة Firebase مجّانية تكفي وأخرى تنفد.

   ── القراءة العامّة بلا سرّ ──
   عقدة `blog` مقروءة علناً بالقواعد (كما `guide` تماماً)، فتُقرأ من
   الخادم عبر REST بلا مفتاح ولا حزمة Firebase. والكتابة للأدمن وحده.

   ── الروابط القديمة ──
   `oldSlugs` تُرافق كل مقال. تغييرُ الرابط بعد الفهرسة يقتل ترتيبه
   في Google ما لم يُحوَّل تحويلاً دائماً — فنحفظ ما مضى ونُحوّل إليه
   بـ301 بدل أن نُعطي 404.
   ════════════════════════════════════════════════════════════ */

export type PostStatus = "draft" | "published";

/** البطاقة الخفيفة — تُقرأ في الفهرس وخريطة الموقع */
export interface BlogIndexEntry {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  /** صورة الغلاف: رابط مطلق */
  cover?: string;
  /** نصّ بديل للصورة — إلزاميّ للوصولية ولا يُترك فارغاً */
  coverAlt?: string;
  labels?: string[];
  status: PostStatus;
  /** بالميلي ثانية */
  publishedAt?: number;
  updatedAt?: number;
  authorName?: string;
  /** دقائق القراءة المقدَّرة — تُحسب عند الحفظ لا عند العرض */
  readMinutes?: number;
  /** روابط سابقة لهذا المقال — تُحوَّل إليه بـ301 */
  oldSlugs?: string[];
  /* ── سيو ── */
  seoTitle?: string;
  seoDescription?: string;
  /** رابط أساسيّ مخصّص — يُترك فارغاً في الأغلب */
  canonical?: string;
  /** يمنع الفهرسة لهذا المقال وحده */
  noindex?: boolean;
}

/** جسم المقال — يُقرأ في صفحته وحدها */
export interface BlogContent {
  html: string;
}

export interface BlogPost extends BlogIndexEntry {
  html: string;
}

/** التصنيفات المعروضة في الفهرس */
export const BLOG_LABELS: { id: string; label: string }[] = [
  { id: "organize", label: "تنظيم المراجعة" },
  { id: "subjects", label: "حسب المادّة" },
  { id: "branches", label: "حسب الشعبة" },
  { id: "mindset", label: "المهارات والنفسية" },
  { id: "tools", label: "أدوات BacZone" },
];

export function labelName(id: string): string {
  return BLOG_LABELS.find((l) => l.id === id)?.label ?? id;
}

/** رابط نظيف من عنوان عربي أو لاتيني */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    /* المحارف العربية تبقى: رابط عربي مقروء أفضل من ترجمة صوتية
       مشوّهة، والمتصفّحات تُرمّزه تلقائياً. */
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** تقدير دقائق القراءة من HTML — يُحسب مرّةً عند الحفظ */
export function estimateReadMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  /* ١٨٠ كلمة/دقيقة: العربية أبطأ قراءةً من الإنجليزية (٢٢٠) */
  return Math.max(1, Math.round(words / 180));
}
