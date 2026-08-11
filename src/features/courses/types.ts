/* ════════════════════════════════════════════════════════════
   نظام الدورات — الأنواع والمساعدات المشتركة

   ثلاث عُقد لا واحدة، والسبب أمنيّ لا تنظيمي:

     courses/$id        بيانات الدورة (بلا روابط الدروس)  — يقرؤها المسجّلون
     courseContent/$id  روابط الدروس                       — يقرؤها المالك فقط
     coursesPublic/$id  نسخة المنشور                       — يقرؤها الجميع

   لو وُضع كل شيء في عقدة واحدة لَقرأ أي حساب رابط أي درس مدفوع دون
   شراء — لأنّ قواعد Firebase تُقرَّر على مستوى العقدة لا الحقل.
   والنسخة العامّة تجعل السوق يعمل قبل تسجيل الدخول (وللفهرسة)، ولا
   تحمل إلّا ما هو منشور فعلاً.

   ولا نُخزّن الفيديوهات: المزوّد خارجي (Drive/YouTube/رابط)، وFirebase
   يحفظ الوصف فقط — فاستبدال المزوّد لاحقاً لا يمسّ بنية الدورة.
════════════════════════════════════════════════════════════ */

import { TRACKS } from "@/lib/constants";

/** دورة العمل: مسوّدة ← مراجعة ← موافقة ← نشر */
export type CourseStatus =
  | "draft"
  | "submitted"
  | "review"
  | "changes"
  | "rejected"
  | "approved"
  | "published"
  | "unpublished";

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "مسوّدة",
  submitted: "بانتظار المراجعة",
  review: "قيد المراجعة",
  changes: "تعديلات مطلوبة",
  rejected: "مرفوضة",
  approved: "مقبولة",
  published: "منشورة",
  unpublished: "موقوفة عن النشر",
};

export const COURSE_STATUS_TONE: Record<CourseStatus, string> = {
  draft: "bg-border text-text-muted",
  submitted: "bg-sky-500/12 text-sky-600",
  review: "bg-primary/12 text-primary",
  changes: "bg-amber-400/18 text-amber-600",
  rejected: "bg-danger/12 text-danger",
  approved: "bg-emerald-500/12 text-emerald-600",
  published: "bg-emerald-500/15 text-emerald-600",
  unpublished: "bg-border text-text-muted",
};

/** نوع محتوى الدرس — المزوّد الخارجي مجرّد ناقل */
export type LessonKind = "video" | "pdf" | "text" | "external";

export const LESSON_KIND_LABEL: Record<LessonKind, string> = {
  video: "فيديو",
  pdf: "ملفّ / PDF",
  text: "درس نصّي",
  external: "مصدر خارجي",
};

/* «المستوى» (تأسيسي/متوسّط/متقدّم/مراجعة) أُزيل بالكامل: تسمية لا معنى
   لها في البكالوريا — الشُّعبة والمادّة تكفيان لوصف من تخاطبه الدورة،
   وحقل زائد في المعالج يُبطئ الأستاذ بلا فائدة. */

/** وصف الدرس كما يراه الطالب — بلا رابط إلّا إن كان مجّاني المعاينة */
export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  /** بالدقائق — تقديري */
  duration?: number;
  kind: LessonKind;
  /** معاينة مجّانية: يُفتح قبل الشراء */
  preview?: boolean;
  /** نصّ الدرس النصّي (لا يحتاج مزوّداً خارجياً) */
  text?: string;
  /** يُملأ في النسخة العامّة لدروس المعاينة فقط */
  url?: string;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

/** روابط الدرس — تعيش في عقدة محميّة منفصلة */
export interface LessonContent {
  url?: string;
  resourceUrl?: string;
  text?: string;
}

export interface Course {
  id: string;
  title: string;
  shortDesc?: string;
  fullDesc?: string;
  coverUrl?: string;
  subject: string;
  /** الشُّعب: `all` أو خريطة معرّفات — الأستاذ يختار واحدة أو أكثر */
  branches: Record<string, true> | { all: true };
  outcomes?: string[];
  teacherId: string;
  teacherName: string;
  type: "free" | "paid";
  price?: number;
  oldPrice?: number;
  sections: CourseSection[];
  status: CourseStatus;
  lessonCount?: number;
  totalDuration?: number;
  createdAt: number;
  updatedAt?: number;
  submittedAt?: number;
  publishedAt?: number;
  /** سبب الرفض — يظهر للأستاذ */
  rejectReason?: string;
}

/* ── الشُّعب ── */

/** تعريفات الشُّعب من تصنيف المنصّة القائم — لا قائمة جديدة */
export const COURSE_BRANCHES = TRACKS;

export function isAllBranches(b?: Course["branches"]): boolean {
  return Boolean(b && (b as { all?: true }).all === true);
}

export function branchIds(b?: Course["branches"]): string[] {
  if (!b || isAllBranches(b)) return [];
  return Object.keys(b).filter((k) => k !== "all" && (b as Record<string, boolean>)[k]);
}

export function branchLabel(b?: Course["branches"]): string {
  if (isAllBranches(b)) return "كل الشعب";
  const ids = branchIds(b);
  if (!ids.length) return "كل الشعب";
  const names = ids.map((id) => COURSE_BRANCHES.find((t) => t.id === id)?.name ?? id);
  return names.length <= 2 ? names.join(" + ") : `${names[0]} +${names.length - 1}`;
}

/** هل الدورة مناسبة لشعبة الطالب؟ */
export function matchesTrack(c: { branches?: Course["branches"] }, track?: string | null): boolean {
  if (!track) return false;
  if (isAllBranches(c.branches)) return true;
  return branchIds(c.branches).includes(track);
}

/* ── مساعدات العرض ── */

export function countLessons(sections: CourseSection[] = []): number {
  return sections.reduce((n, s) => n + (s.lessons?.length ?? 0), 0);
}

export function sumDuration(sections: CourseSection[] = []): number {
  return sections.reduce(
    (n, s) => n + (s.lessons ?? []).reduce((m, l) => m + (Number(l.duration) || 0), 0),
    0,
  );
}

/** «٣ س ٢٥ د» — أوضح من «205 دقيقة» */
export function formatDuration(minutes = 0): string {
  const m = Math.max(0, Math.round(minutes));
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} د`;
  return r ? `${h} س ${r} د` : `${h} س`;
}

/** كل الدروس بترتيب التشغيل — يستعملها المشغّل والتقدّم */
export function flatLessons(sections: CourseSection[] = []): CourseLesson[] {
  return sections.flatMap((s) => s.lessons ?? []);
}

/* ── الروابط الخارجية ── */

/** معرّف ملفّ Google Drive من أي شكل من أشكال روابطه */
export function driveIdFrom(url: string): string | null {
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

/** معرّف فيديو يوتيوب */
export function youtubeIdFrom(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export type Provider = "youtube" | "drive" | "direct" | "unknown";

export function providerOf(url?: string): Provider {
  if (!url) return "unknown";
  if (youtubeIdFrom(url)) return "youtube";
  if (driveIdFrom(url)) return "drive";
  if (/^https?:\/\//i.test(url)) return "direct";
  return "unknown";
}

/** رابط العرض المدمج — الطالب لا يرى «رابط Drive» بل مشغّلاً */
export function embedUrl(url?: string): string | null {
  if (!url) return null;
  const yt = youtubeIdFrom(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`;
  const dr = driveIdFrom(url);
  if (dr) return `https://drive.google.com/file/d/${dr}/preview`;
  if (/^https?:\/\//i.test(url)) return url;
  return null;
}

/** تحقّق معقول من الرابط — يُرجع رسالة الخطأ أو null */
export function validateLessonUrl(kind: LessonKind, url: string): string | null {
  const u = url.trim();
  if (kind === "text") return null;
  if (!u) return "الرابط مطلوب لهذا النوع من الدروس.";
  if (!/^https:\/\//i.test(u)) return "استعمل رابطاً يبدأ بـ https://";
  if (kind === "video" && providerOf(u) === "unknown") {
    return "رابط الفيديو غير مفهوم — استعمل YouTube أو Google Drive أو رابط MP4 مباشر.";
  }
  if (u.length > 600) return "الرابط طويل أكثر من اللازم.";
  return null;
}

/** حماية بسيطة من الحقول الفارغة التي ترفضها قاعدة البيانات */
export function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
}

export function newId(prefix = "l"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
