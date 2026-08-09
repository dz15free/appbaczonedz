"use client";

import { useEffect, useState } from "react";
import { ref, set, update, remove, onValue, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { listenHasAccess } from "@/features/paid/paid-access";
import type { Course } from "@/features/courses/types";
import { flatLessons } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   التسجيل والملكية والتقدّم

   لا نظام ملكية ثانياً: الدورة المدفوعة تمرّ عبر `userAccess` و
   `purchases` نفسيهما اللذين تستعملهما الملخّصات والغرف — بنوع عنصر
   جديد `course`. فالكود، وChargily، ومنح الأدمن اليدوي: كلّها تعمل
   بلا سطر إضافي.

   والمجّانية تحتاج تسجيلاً لا شراءً، فلها عقدة `courseEnrollments`
   يكتب فيها الطالب سطره وحده.

   التقدّم في قاعدة البيانات لا في المتصفّح: من يفتح الدورة من هاتفه
   بعد حاسوبه يجب أن يجدها حيث تركها.
════════════════════════════════════════════════════════════ */

export interface Enrollment {
  at: number;
  name?: string;
}

export interface CourseProgress {
  completed?: Record<string, true>;
  lastLesson?: string;
  percent?: number;
  lastActivity?: number;
}

/* ── التسجيل في الدورات المجّانية ── */

export async function enrollFree(courseId: string, uid: string, name: string) {
  await set(ref(rtdb, `courseEnrollments/${courseId}/${uid}`), {
    at: Date.now(),
    name: (name || "طالب").slice(0, 80),
  });
  await set(ref(rtdb, `userCourses/${uid}/${courseId}`), Date.now());
}

export async function leaveCourse(courseId: string, uid: string) {
  await remove(ref(rtdb, `courseEnrollments/${courseId}/${uid}`));
  await remove(ref(rtdb, `userCourses/${uid}/${courseId}`)).catch(() => {});
}

export function listenIsEnrolled(courseId: string, uid: string, cb: (v: boolean) => void) {
  return onValue(ref(rtdb, `courseEnrollments/${courseId}/${uid}`), (s) => cb(s.exists()), () => cb(false));
}

/** عدد المسجّلين — يُحسب من العقدة نفسها فلا يمكن تضخيمه بحقل */
export function listenEnrollCount(courseId: string, cb: (n: number) => void) {
  return onValue(ref(rtdb, `courseEnrollments/${courseId}`), (s) => cb(s.size), () => cb(0));
}

/** معرّفات دورات الطالب (مجّانية ومدفوعة) */
export function listenMyCourseIds(uid: string, cb: (ids: string[]) => void) {
  const free = ref(rtdb, `userCourses/${uid}`);
  const paid = ref(rtdb, `userAccess/${uid}/course`);
  let a: string[] = [];
  let b: string[] = [];
  const emit = () => cb([...new Set([...a, ...b])]);
  const u1 = onValue(free, (s) => { a = Object.keys((s.val() as object) ?? {}); emit(); }, () => { a = []; emit(); });
  const u2 = onValue(paid, (s) => { b = Object.keys((s.val() as object) ?? {}); emit(); }, () => { b = []; emit(); });
  return () => { u1(); u2(); };
}

/* ── الوصول ── */

/**
 * هل يستطيع هذا المستخدم دخول الدورة؟
 * مجّانية → مسجّل · مدفوعة → وصول مُثبت · وصاحبها والأدمن دائماً.
 */
export function useCourseAccess(course: Course | null, uid?: string, isAdmin = false) {
  const [enrolled, setEnrolled] = useState(false);
  const [owned, setOwned] = useState(false);

  const courseId = course?.id;
  const isPaid = course?.type === "paid";

  useEffect(() => {
    if (!courseId || !uid) { setEnrolled(false); return; }
    const unsub = listenIsEnrolled(courseId, uid, setEnrolled);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, uid]);

  useEffect(() => {
    if (!courseId || !uid || !isPaid) { setOwned(false); return; }
    const unsub = listenHasAccess(uid, "course", courseId, setOwned);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, uid, isPaid]);

  const isOwner = Boolean(uid && course && course.teacherId === uid);
  const staff = isOwner || isAdmin;
  const hasAccess = staff || (isPaid ? owned : enrolled);

  return { enrolled, owned, isOwner, hasAccess, staff };
}

/** أهلية التقييم: مسجّل (مجّانية) أو مشترٍ مُثبت (مدفوعة) */
export async function isReviewEligible(course: Course, uid: string): Promise<boolean> {
  try {
    if (course.type === "paid") {
      const s = await get(ref(rtdb, `purchases/${uid}/course/${course.id}`));
      return s.exists();
    }
    const s = await get(ref(rtdb, `courseEnrollments/${course.id}/${uid}`));
    return s.exists();
  } catch { return false; }
}

/* ── التقدّم ── */

export function listenProgress(uid: string, courseId: string, cb: (p: CourseProgress) => void) {
  return onValue(ref(rtdb, `courseProgress/${uid}/${courseId}`), (s) => {
    cb((s.val() as CourseProgress | null) ?? {});
  }, () => cb({}));
}

export function useProgress(uid?: string, courseId?: string) {
  const [progress, setProgress] = useState<CourseProgress>({});
  useEffect(() => {
    if (!uid || !courseId) { setProgress({}); return; }
    const unsub = listenProgress(uid, courseId, setProgress);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid, courseId]);
  return progress;
}

/** كل تقدّم الطالب دفعة واحدة — لصفحة «دوراتي» */
export function listenAllProgress(uid: string, cb: (m: Record<string, CourseProgress>) => void) {
  return onValue(ref(rtdb, `courseProgress/${uid}`), (s) => {
    cb((s.val() as Record<string, CourseProgress> | null) ?? {});
  }, () => cb({}));
}

export function percentOf(course: Pick<Course, "sections">, p: CourseProgress): number {
  const total = flatLessons(course.sections).length;
  if (!total) return 0;
  const done = Object.keys(p.completed ?? {}).length;
  return Math.min(100, Math.round((done / total) * 100));
}

export async function setLessonDone(
  uid: string,
  course: Course,
  lessonId: string,
  done: boolean,
) {
  const path = `courseProgress/${uid}/${course.id}`;
  const snap = await get(ref(rtdb, path));
  const prev = (snap.val() as CourseProgress | null) ?? {};
  const completed = { ...(prev.completed ?? {}) };
  if (done) completed[lessonId] = true;
  else delete completed[lessonId];

  const total = flatLessons(course.sections).length || 1;
  await update(ref(rtdb, path), {
    completed,
    lastLesson: lessonId,
    percent: Math.min(100, Math.round((Object.keys(completed).length / total) * 100)),
    lastActivity: Date.now(),
  });
}

export async function markLastLesson(uid: string, courseId: string, lessonId: string) {
  await update(ref(rtdb, `courseProgress/${uid}/${courseId}`), {
    lastLesson: lessonId,
    lastActivity: Date.now(),
  });
}
