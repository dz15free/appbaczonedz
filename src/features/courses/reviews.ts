"use client";

import { useEffect, useState } from "react";
import { ref, set, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   تقييمات الدورات

   بنية `contentRatings` نفسها حرفاً بحرف — نجوم، تعليق اختياري،
   سطر واحد لكل طالب — لكن في عقدة خاصّة، لأنّ **شرط الأهلية مختلف**:
   الملخّص يشترط شراءً، والدورة تقبل التسجيل المجّاني أيضاً. ودمجهما
   في عقدة واحدة يعني قاعدة واحدة لا تصلح لأيّ منهما.

   **المتوسّط لا يُكتب**: يُحسب من السطور عند القراءة. لو خُزّن رقماً
   لاستطاع أي متصفّح رفع تقييم دورته إلى 5 بكتابة واحدة — ولا توجد
   دالّة خادم تحرسه في هذه المعمارية.
════════════════════════════════════════════════════════════ */

export interface CourseReview {
  uid: string;
  name: string;
  stars: number;
  comment?: string;
  at: number;
  updatedAt?: number;
}

export function listenCourseReviews(courseId: string, cb: (list: CourseReview[]) => void) {
  return onValue(ref(rtdb, `courseReviews/${courseId}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<CourseReview, "uid">> | null) ?? {};
    cb(
      Object.entries(val)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => (b.updatedAt ?? b.at) - (a.updatedAt ?? a.at)),
    );
  }, () => cb([]));
}

export function useCourseReviews(courseId?: string) {
  const [list, setList] = useState<CourseReview[]>([]);
  useEffect(() => {
    if (!courseId) { setList([]); return; }
    const unsub = listenCourseReviews(courseId, setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId]);
  const count = list.length;
  const avg = count ? Math.round((list.reduce((a, r) => a + r.stars, 0) / count) * 10) / 10 : 0;
  return { list, count, avg };
}

export async function saveCourseReview(
  courseId: string,
  uid: string,
  name: string,
  stars: number,
  comment: string,
  firstAt?: number,
) {
  const s = Math.max(1, Math.min(5, Math.round(stars)));
  const data: Record<string, unknown> = {
    name: (name || "طالب").slice(0, 80),
    stars: s,
    at: firstAt ?? Date.now(),
  };
  if (firstAt) data.updatedAt = Date.now();
  const c = comment.trim();
  if (c) data.comment = c.slice(0, 500);
  await set(ref(rtdb, `courseReviews/${courseId}/${uid}`), data);
}

/** حذف: صاحب التقييم أو الأدمن (القاعدة تفرض ذلك) */
export async function deleteCourseReview(courseId: string, uid: string) {
  await remove(ref(rtdb, `courseReviews/${courseId}/${uid}`));
}
