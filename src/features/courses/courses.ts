"use client";

import {
  ref, get, set, update, remove, push, onValue, query, orderByChild, equalTo, limitToLast,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { addNotification } from "@/features/community/social";
import {
  type Course, type CourseSection, type CourseStatus, type LessonContent,
  countLessons, sumDuration, flatLessons, stripUndefined,
} from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   الدورات — القراءة والكتابة ودورة حياة المراجعة

   ثلاث عُقد متكاملة (انظر types.ts):
     courses        العمل الجاري — بلا روابط
     courseContent  الروابط — قراءتها للمالك والمشترك فقط
     coursesPublic  المنشور — للجميع

   **النسخة العامّة يكتبها الأدمن وحده** لحظة النشر. لو كتبها الأستاذ
   لَنشر نفسه بلا مراجعة، وهو بالضبط ما تمنعه هذه البنية.
════════════════════════════════════════════════════════════ */

const C = "courses";
const CONTENT = "courseContent";
const PUB = "coursesPublic";
const INDEX = "teacherCourses";

type Row = Omit<Course, "id">;

function withId(id: string, r: Row): Course {
  return {
    id,
    ...r,
    sections: (r.sections ?? []).map((s) => ({ ...s, lessons: s.lessons ?? [] })),
  };
}

function mapSnap(val: Record<string, Row> | null): Course[] {
  return Object.entries(val ?? {}).map(([id, r]) => withId(id, r));
}

/* ── قراءة ── */

/** كتالوج المنشور — يعمل قبل تسجيل الدخول */
export function listenPublicCourses(cb: (list: Course[]) => void, max = 120) {
  return onValue(query(ref(rtdb, PUB), orderByChild("publishedAt"), limitToLast(max)), (snap) => {
    cb(mapSnap(snap.val()).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)));
  }, () => cb([]));
}

export function listenPublicCourse(courseId: string, cb: (c: Course | null) => void) {
  return onValue(ref(rtdb, `${PUB}/${courseId}`), (snap) => {
    const v = snap.val() as Row | null;
    cb(v ? withId(courseId, v) : null);
  }, () => cb(null));
}

/** السجلّ الكامل — للمالك والأدمن (القاعدة تمنع غيرهما من التعديل) */
export function listenCourse(courseId: string, cb: (c: Course | null) => void) {
  return onValue(ref(rtdb, `${C}/${courseId}`), (snap) => {
    const v = snap.val() as Row | null;
    cb(v ? withId(courseId, v) : null);
  }, () => cb(null));
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const snap = await get(ref(rtdb, `${C}/${courseId}`));
  const v = snap.val() as Row | null;
  return v ? withId(courseId, v) : null;
}

/**
 * دورات أستاذ واحد — لوحته.
 * تقرأ الفهرس ثمّ كل دورة على حدة: `courses` ليست مقروءة كاملة إلّا
 * للأدمن، وهذا ما يمنع أي طالب من تصفّح مسوّدات الأساتذة.
 */
export function listenTeacherCourses(uid: string, cb: (list: Course[]) => void) {
  const found = new Map<string, Course>();
  let inner: Array<() => void> = [];

  const emit = () =>
    cb([...found.values()].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)));

  const outer = onValue(ref(rtdb, `${INDEX}/${uid}`), (snap) => {
    const ids = Object.keys((snap.val() as Record<string, number> | null) ?? {});
    inner.forEach((u) => u());
    inner = [];
    found.clear();
    if (!ids.length) { emit(); return; }
    ids.forEach((id) => {
      inner.push(
        onValue(ref(rtdb, `${C}/${id}`), (s) => {
          const v = s.val() as Row | null;
          if (v) found.set(id, withId(id, v));
          else found.delete(id);
          emit();
        }, () => { found.delete(id); emit(); }),
      );
    });
  }, () => cb([]));

  return () => { outer(); inner.forEach((u) => u()); };
}

/** كل الدورات — للأدمن وحده (القاعدة تمنع غيره) */
export function listenAllCourses(cb: (list: Course[]) => void) {
  return onValue(ref(rtdb, C), (snap) => {
    cb(mapSnap(snap.val()).sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)));
  }, () => cb([]));
}

/* ── محتوى الدروس (الروابط) ── */

export function listenCourseContent(courseId: string, cb: (m: Record<string, LessonContent>) => void) {
  return onValue(ref(rtdb, `${CONTENT}/${courseId}`), (snap) => {
    cb((snap.val() as Record<string, LessonContent> | null) ?? {});
  }, () => cb({}));
}

export async function getCourseContent(courseId: string): Promise<Record<string, LessonContent>> {
  try {
    const snap = await get(ref(rtdb, `${CONTENT}/${courseId}`));
    return (snap.val() as Record<string, LessonContent> | null) ?? {};
  } catch { return {}; }
}

/* ── الكتابة ── */

export interface CourseDraftInput {
  title: string;
  shortDesc?: string;
  fullDesc?: string;
  coverUrl?: string;
  subject: string;
  branches: Course["branches"];
  outcomes?: string[];
  type: "free" | "paid";
  price?: number;
  oldPrice?: number;
  sections: CourseSection[];
  /** الروابط تُفصَل عن البيانات قبل الحفظ */
  content: Record<string, LessonContent>;
}

/** يُجرّد الأقسام من الروابط، ويُبقي رابط المعاينة داخل السجلّ العامّ فقط */
function publicSections(sections: CourseSection[]): CourseSection[] {
  return sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: (s.lessons ?? []).map((l) =>
      stripUndefined({
        id: l.id,
        title: l.title,
        description: l.description || undefined,
        duration: l.duration || undefined,
        kind: l.kind,
        preview: l.preview || undefined,
      }),
    ) as CourseSection["lessons"],
  }));
}

/**
 * صفّ الدورة كما يُحفَظ.
 *
 * الحقول الفارغة تُكتب `null` صراحةً لا تُحذف من الكائن: `update`
 * يتجاهل المفتاح الغائب فيُبقي القيمة القديمة — فيُحوّل الأستاذ دورته
 * إلى مجّانية ويبقى سعرها القديم مخزّناً ثمّ يُنسخ إلى السوق عند النشر.
 * و`null` في Firebase تعني حذف الحقل، فهي التعبير الصحيح عن «فارغ».
 */
function baseRow(input: CourseDraftInput, teacher: { uid: string; name: string }) {
  const sections = publicSections(input.sections);
  const paid = input.type === "paid";
  const oldPrice = Number(input.oldPrice);
  return {
    title: input.title.trim().slice(0, 160),
    shortDesc: input.shortDesc?.trim().slice(0, 300) || null,
    fullDesc: input.fullDesc?.trim().slice(0, 4000) || null,
    coverUrl: input.coverUrl?.trim().slice(0, 600) || null,
    subject: input.subject,
    branches: input.branches,
    outcomes: (input.outcomes ?? []).map((o) => o.trim().slice(0, 200)).filter(Boolean).slice(0, 10),
    teacherId: teacher.uid,
    teacherName: teacher.name,
    type: input.type,
    price: paid ? Math.max(0, Math.round(Number(input.price) || 0)) : null,
    oldPrice: paid && oldPrice > 0 ? Math.round(oldPrice) : null,
    sections,
    lessonCount: countLessons(input.sections),
    totalDuration: sumDuration(input.sections),
  };
}

/** خريطة الروابط للدروس الموجودة فقط — لا نترك بقايا دروس محذوفة */
function contentFor(input: CourseDraftInput): Record<string, LessonContent> {
  const out: Record<string, LessonContent> = {};
  for (const l of flatLessons(input.sections)) {
    const c = input.content[l.id] ?? {};
    const row = stripUndefined({
      url: c.url?.trim() || undefined,
      resourceUrl: c.resourceUrl?.trim() || undefined,
      text: l.kind === "text" ? (c.text?.slice(0, 20000) || undefined) : undefined,
    });
    out[l.id] = row;
  }
  return out;
}

export async function createCourse(input: CourseDraftInput, teacher: { uid: string; name: string }): Promise<string> {
  const r = push(ref(rtdb, C));
  const id = r.key as string;
  await set(r, { ...baseRow(input, teacher), status: "draft" as CourseStatus, createdAt: Date.now(), updatedAt: Date.now() });
  await set(ref(rtdb, `${CONTENT}/${id}`), contentFor(input));
  /* فهرس دورات الأستاذ: عقدة `courses` لم تعد مقروءة للجميع (المسوّدة
     خاصّة)، فلا يصلح استعلام عليها. الفهرس يُخبر الأستاذ بمعرّفات
     دوراته، ثمّ يقرأ كل دورة على حدة بصلاحيته عليها. */
  await set(ref(rtdb, `${INDEX}/${teacher.uid}/${id}`), Date.now());
  return id;
}

/**
 * حفظ المسوّدة. الحالات المسموح بالتعديل فيها: مسوّدة أو «تعديلات
 * مطلوبة» أو مرفوضة. المنشورة لا تُعدَّل مباشرة — وإلّا صار النشر
 * باباً خلفياً لتغيير المحتوى بعد الموافقة.
 */
export async function saveCourse(courseId: string, input: CourseDraftInput, teacher: { uid: string; name: string }) {
  await update(ref(rtdb, `${C}/${courseId}`), { ...baseRow(input, teacher), updatedAt: Date.now() });
  await set(ref(rtdb, `${CONTENT}/${courseId}`), contentFor(input));
}

/**
 * الحذف بترتيب مقصود: المحتوى والنسخة العامّة **قبل** صفّ الدورة.
 * قاعدة الكتابة في `courseContent` تتحقّق من ملكية الدورة، فلو حُذف
 * صفّها أوّلاً لتعذّر حذف المحتوى إلى الأبد وبقيت روابط الدروس في
 * قاعدة البيانات.
 */
export async function deleteCourse(courseId: string, teacherId?: string) {
  await remove(ref(rtdb, `${CONTENT}/${courseId}`)).catch(() => {});
  await remove(ref(rtdb, `${PUB}/${courseId}`)).catch(() => {});
  if (teacherId) await remove(ref(rtdb, `${INDEX}/${teacherId}/${courseId}`)).catch(() => {});
  await remove(ref(rtdb, `${C}/${courseId}`));
}

export function canTeacherEdit(status: CourseStatus): boolean {
  return status === "draft" || status === "changes" || status === "rejected";
}

/* ── دورة حياة المراجعة ── */

/** الأستاذ يُرسل للمراجعة — ولا يستطيع تجاوزها */
export async function submitForReview(course: Course) {
  await update(ref(rtdb, `${C}/${course.id}`), {
    status: "submitted" as CourseStatus,
    submittedAt: Date.now(),
    updatedAt: Date.now(),
    rejectReason: null,
  });
  await notifyAdmins({
    type: "course-submitted",
    text: `دورة جديدة بانتظار المراجعة: «${course.title}» — ${course.teacherName}`,
    link: `/admin?tab=courses&course=${course.id}`,
  });
}

/** الأدمن: تغيير الحالة مع إشعار الأستاذ */
export async function setCourseStatus(
  course: Course,
  status: CourseStatus,
  opts: { reason?: string } = {},
) {
  const patch: Record<string, unknown> = { status, updatedAt: Date.now() };
  if (status === "rejected") patch.rejectReason = opts.reason?.slice(0, 500) ?? "";
  if (status !== "rejected") patch.rejectReason = null;
  await update(ref(rtdb, `${C}/${course.id}`), patch);

  const texts: Partial<Record<CourseStatus, string>> = {
    review: `دورتك «${course.title}» قيد المراجعة الآن.`,
    approved: `تمّت الموافقة على دورتك «${course.title}» — بانتظار النشر.`,
    changes: `مطلوب تعديلات على دورتك «${course.title}». راجع ملاحظات الإدارة.`,
    rejected: `عذراً، رُفضت دورتك «${course.title}».${opts.reason ? ` السبب: ${opts.reason}` : ""}`,
    unpublished: `أُوقف نشر دورتك «${course.title}».`,
  };
  const text = texts[status];
  if (text) await addNotification(course.teacherId, { type: "course", text, link: `/courses/teach` });
}

/**
 * النشر: يكتب النسخة العامّة (بيانات + روابط دروس المعاينة فقط).
 * الأدمن وحده يملك حقّ الكتابة في `coursesPublic` — وهذا هو ما يجعل
 * «لا يستطيع الأستاذ نشر نفسه» قاعدة لا مجرّد إخفاء زرّ.
 */
export async function publishCourse(course: Course) {
  const content = await getCourseContent(course.id);
  const sections: CourseSection[] = (course.sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    lessons: (s.lessons ?? []).map((l) =>
      stripUndefined({ ...l, url: l.preview ? content[l.id]?.url : undefined }),
    ) as CourseSection["lessons"],
  }));

  const { id, ...rest } = course;
  void id;
  await set(ref(rtdb, `${PUB}/${course.id}`), stripUndefined({
    ...rest,
    sections,
    status: "published" as CourseStatus,
    publishedAt: course.publishedAt ?? Date.now(),
    rejectReason: undefined,
  }));
  await update(ref(rtdb, `${C}/${course.id}`), {
    status: "published" as CourseStatus,
    publishedAt: course.publishedAt ?? Date.now(),
    updatedAt: Date.now(),
    rejectReason: null,
  });
  await addNotification(course.teacherId, {
    type: "course",
    text: `🎉 نُشرت دورتك «${course.title}» — صارت متاحة للطلبة.`,
    link: `/courses/${course.id}`,
  });
}

export async function unpublishCourse(course: Course) {
  await remove(ref(rtdb, `${PUB}/${course.id}`));
  await setCourseStatus(course, "unpublished");
}

/* ── محادثة المراجعة ── */

export interface ReviewMessage {
  id: string;
  byUid: string;
  byName: string;
  byRole: "admin" | "teacher";
  text: string;
  at: number;
}

export function listenReviewThread(courseId: string, cb: (list: ReviewMessage[]) => void) {
  return onValue(ref(rtdb, `courseReviewThreads/${courseId}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<ReviewMessage, "id">> | null) ?? {};
    cb(Object.entries(val).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.at - b.at));
  }, () => cb([]));
}

export async function postReviewMessage(
  course: Course,
  from: { uid: string; name: string; role: "admin" | "teacher" },
  text: string,
) {
  const t = text.trim();
  if (!t) return;
  await push(ref(rtdb, `courseReviewThreads/${course.id}`), {
    byUid: from.uid, byName: from.name, byRole: from.role, text: t.slice(0, 1000), at: Date.now(),
  });
  if (from.role === "admin") {
    await addNotification(course.teacherId, {
      type: "course",
      text: `ملاحظة من الإدارة على دورة «${course.title}»`,
      link: `/courses/teach?course=${course.id}`,
    });
  } else {
    await notifyAdmins({
      type: "course",
      text: `ردّ الأستاذ ${from.name} على مراجعة «${course.title}»`,
      link: `/admin?tab=courses&course=${course.id}`,
    });
  }
}

/* ── إشعار الإدارة ── */

/** يُرسل إلى كل حسابات الأدمن عبر نظام الإشعارات القائم */
export async function notifyAdmins(n: { type: string; text: string; link?: string }) {
  try {
    const snap = await get(query(ref(rtdb, "users"), orderByChild("role"), equalTo("admin")));
    const val = (snap.val() as Record<string, unknown> | null) ?? {};
    await Promise.all(Object.keys(val).map((uid) => addNotification(uid, n)));
  } catch {
    /* الإشعار مساعد لا شرط — لا نُفشل العملية لأجله */
  }
}
