/* ════════════════════════════════════════════════════════════
   سجلّ الاشعارات — مصدر واحد لكل نوع: وجهته وأيقونته ونبرته

   🐛 المشكلة التي وُلد هذا الملفّ لحلّها:

   لم يكن هناك جدول توجيه إطلاقاً. كل موضع إنشاء يكتب `link` نصّاً عند
   الإنشاء، وصفحة الاشعارات تستعمله كما هو:

       return n.link ? <Link href={n.link}>…</Link> : <div>…</div>

   ونتيجة ذلك ثلاث علل:

   ١) **طلب الصداقة كان يذهب إلى `/community`** — وصفحة المجتمع تفتح
      على تبويب «المنشورات» دائماً، فيهبط الطالب على الأخبار وواجهة
      القبول/الرفض في تبويب آخر لا يصل إليه. الرابط «يعمل» ولا يوصل.

   ٢) الوجهة محفوظة **في البيانات** لا في الشيفرة، فتصحيحها لا يُصلح
      الاشعارات المخزَّنة أصلاً في قواعد الطلبة. ولهذا يعلو حلّ الشيفرة
      على حلّ البيانات هنا: `canonical` أدناه **يتجاوز** الرابط المحفوظ
      للأنواع التي نعرف وجهتها بلا بيانات إضافية — فتُصلَح كل الاشعارات
      القديمة في اللحظة نفسها بلا هجرة بيانات.

   ٣) الأيقونة كانت `if` من ثلاثة أنواع وما بقي جرس عامّ — فلا يعرف
      الطالب نوع الاشعار قبل قراءته.

   ولم يُحذف شيء: الأنواع الأحد عشر القائمة كلّها هنا بأسمائها نفسها،
   والاشعارات المخزَّنة تعمل كما هي. النوع المجهول يسقط على وجهة
   وأيقونة افتراضيّتين بلا انفجار.
   ════════════════════════════════════════════════════════════ */

/** مفاتيح الأيقونات — تُترجَم إلى FontAwesome في الواجهة وحدها،
    فيبقى هذا الملفّ صالحاً للخادم ولا يجرّ مكتبة أيقونات معه. */
export type NotifIcon =
  | "userPlus" | "userCheck" | "message" | "comment" | "reply" | "upvote"
  | "at" | "room" | "calendar" | "course" | "cart" | "star"
  | "target" | "graduation" | "megaphone" | "support" | "payment" | "bell";

export type NotifTone = "primary" | "green" | "amber" | "red" | "violet" | "muted";

export interface NotifMeta {
  /** تسمية عربية تُعرض كصنف الاشعار */
  label: string;
  icon: NotifIcon;
  tone: NotifTone;
  /** وجهة ثابتة لا تحتاج بيانات إضافية — تتجاوز الرابط المحفوظ */
  canonical?: string;
}

/* الأنواع القائمة (١١) + الجديدة. الأسماء القديمة تبقى حرفياً كما هي
   في قاعدة البيانات — تغييرها يُعطّل كل اشعار مخزَّن. */
export const NOTIF_META: Record<string, NotifMeta> = {
  /* ── قائمة من قبل ── */
  friend_request: {
    label: "طلب صداقة", icon: "userPlus", tone: "primary",
    /* 🐛 هنا كان العطب: كان `/community` فيهبط على المنشورات.
       والوجهة ثابتة فنفرضها، فتُصلَح الاشعارات القديمة أيضاً. */
    canonical: "/community?tab=people",
  },
  friend_accept: { label: "قُبلت صداقتك", icon: "userCheck", tone: "green" },
  dm:            { label: "رسالة", icon: "message", tone: "primary" },
  support:       { label: "الدعم", icon: "support", tone: "violet" },
  payment:       { label: "الدفع", icon: "payment", tone: "amber" },
  course:        { label: "دورة", icon: "course", tone: "primary" },
  "course-submitted": { label: "دورة بانتظار المراجعة", icon: "course", tone: "amber" },
  purchase:      { label: "شراء", icon: "cart", tone: "green" },
  daily:         { label: "مهمّة يومية", icon: "target", tone: "amber", canonical: "/home" },
  room:          { label: "غرفة", icon: "room", tone: "primary" },
  exam:          { label: "نتيجة امتحان", icon: "graduation", tone: "violet" },

  /* ── جديدة في هذه الدفعة ── */
  post_comment:  { label: "تعليق على منشورك", icon: "comment", tone: "primary" },
  comment_reply: { label: "ردّ على تعليقك", icon: "reply", tone: "primary" },
  post_upvote:   { label: "تصويت لمنشورك", icon: "upvote", tone: "green" },
  mention:       { label: "أشار إليك", icon: "at", tone: "violet" },
  room_invite:   { label: "دعوة إلى غرفة", icon: "room", tone: "primary" },
  room_scheduled:{ label: "حصّة مجدولة", icon: "calendar", tone: "amber" },
  course_review: { label: "تقييم دورتك", icon: "star", tone: "amber" },
  course_sale:   { label: "بيع دورة", icon: "cart", tone: "green" },
  announcement:  { label: "إعلان من الإدارة", icon: "megaphone", tone: "red" },
};

const FALLBACK: NotifMeta = { label: "إشعار", icon: "bell", tone: "muted" };

export function notifMeta(type: string | undefined): NotifMeta {
  return (type && NOTIF_META[type]) || FALLBACK;
}

/** هل النوع معروف؟ (للتشخيص وللإحصاء لا للعرض) */
export function isKnownNotifType(type: string | undefined): boolean {
  return Boolean(type && NOTIF_META[type]);
}

/* ── تصنيف للتصفية في الواجهة ── */
export const NOTIF_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: "social",  label: "اجتماعي", types: ["friend_request", "friend_accept", "post_comment", "comment_reply", "post_upvote", "mention", "dm"] },
  { id: "rooms",   label: "الغرف",   types: ["room", "room_invite", "room_scheduled", "exam"] },
  { id: "courses", label: "الدورات", types: ["course", "course-submitted", "purchase", "course_review", "course_sale"] },
  { id: "system",  label: "المنصّة", types: ["daily", "announcement", "support", "payment"] },
];

/**
 * وجهة الاشعار.
 *
 * الترتيب مقصود: الوجهة الثابتة في الشيفرة أوّلاً (فتُصلَح السجلّات
 * القديمة)، ثمّ الرابط المحفوظ (وهو الحامل الوحيد للمعرّفات — لا نعرف
 * رقم المنشور بلا بيانات)، ثمّ `/notifications` كملاذ أخير حتى لا يبقى
 * اشعار غير قابل للنقر أبداً.
 */
export function notifLink(n: { type?: string; link?: string }): string {
  const meta = notifMeta(n.type);
  if (meta.canonical) return meta.canonical;
  const stored = (n.link ?? "").trim();
  if (stored) return stored;
  return "/notifications";
}

/** رابط تعليق بعينه داخل منشور — يُستعمل عند الإنشاء لا عند العرض */
export function commentLink(postId: string, commentId: string): string {
  return `/community/${postId}#c-${commentId}`;
}
