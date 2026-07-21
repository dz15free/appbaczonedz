// تقييم الأستاذ — مع حماية من الحملات غير المبرَّرة
//
// طبقات الحماية (ثلاث منها مفروضة في قواعد Firebase نفسها،
// أي لا يمكن الالتفاف عليها من المتصفّح):
//
//   1) لا يقيّم إلا من حضر حصة فعلاً        → قاعدة تتحقّق من attendance
//   2) لا يقيّم إلا بعد 10 دقائق من الحضور  → يمنع الدخول السريع للتقييم
//   3) تقييم واحد لكل طالب، قابل للتعديل     → المسار مفتاحه uid الطالب
//   4) لا يظهر المتوسّط قبل 5 تقييمات        → يمنع أثر تقييم أو اثنين
//   5) أدوات للأدمن تكشف الأنماط المشبوهة    → تجمّع مفاجئ لتقييمات منخفضة
//
// attendance/{teacherUid}/{studentUid} = { at }  ← يُكتب مرة عند دخول الغرفة
// teacherRatings/{teacherUid}/{studentUid} = { stars, comment?, at, updatedAt? }

import { ref, set, get, remove, onValue, serverTimestamp } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export const MIN_RATINGS_TO_SHOW = 5;
export const MIN_ATTEND_MS = 10 * 60 * 1000; // 10 دقائق

export interface TeacherRating {
  studentUid: string;
  studentName: string;
  stars: number;      // 1..5
  comment?: string;
  at: number;
  updatedAt?: number;
}

export interface RatingStats {
  count: number;
  avg: number;              // 0 إن لم يبلغ الحد الأدنى
  visible: boolean;         // هل بلغ عدد التقييمات حد الإظهار؟
  breakdown: Record<number, number>;
}

/* ═══════════ الحضور ═══════════ */

/** يُستدعى مرة عند دخول الطالب غرفة أستاذ — أساس أهلية التقييم */
export async function markAttendance(teacherUid: string, studentUid: string) {
  if (!teacherUid || !studentUid || teacherUid === studentUid) return;
  const r = ref(rtdb, `attendance/${teacherUid}/${studentUid}`);
  const snap = await get(r);
  // لا نُحدّث الزمن إن كان مسجّلاً — وإلا أعاد العدّاد ومنع التقييم إلى الأبد
  if (snap.exists()) return;
  await set(r, { at: serverTimestamp() });
}

export interface Eligibility {
  canRate: boolean;
  reason?: "not-attended" | "too-soon" | "self";
  waitMs?: number;
}

export async function checkEligibility(teacherUid: string, studentUid: string): Promise<Eligibility> {
  if (teacherUid === studentUid) return { canRate: false, reason: "self" };
  const snap = await get(ref(rtdb, `attendance/${teacherUid}/${studentUid}/at`));
  const at = snap.val() as number | null;
  if (!at) return { canRate: false, reason: "not-attended" };
  const elapsed = Date.now() - at;
  if (elapsed < MIN_ATTEND_MS) return { canRate: false, reason: "too-soon", waitMs: MIN_ATTEND_MS - elapsed };
  return { canRate: true };
}

/* ═══════════ التقييم ═══════════ */

export async function rateTeacher(
  teacherUid: string,
  studentUid: string,
  studentName: string,
  stars: number,
  comment?: string
) {
  const s = Math.max(1, Math.min(5, Math.round(stars)));
  const existing = await get(ref(rtdb, `teacherRatings/${teacherUid}/${studentUid}`));
  const prev = existing.val() as TeacherRating | null;
  const data: Record<string, unknown> = {
    studentName: studentName || "طالب",
    stars: s,
    at: prev?.at ?? Date.now(),
  };
  if (prev) data.updatedAt = Date.now();
  const c = (comment ?? "").trim();
  if (c) data.comment = c.slice(0, 500);
  await set(ref(rtdb, `teacherRatings/${teacherUid}/${studentUid}`), data);
}

export async function removeMyRating(teacherUid: string, studentUid: string) {
  await remove(ref(rtdb, `teacherRatings/${teacherUid}/${studentUid}`));
}

export function listenTeacherRatings(teacherUid: string, cb: (list: TeacherRating[]) => void) {
  return onValue(ref(rtdb, `teacherRatings/${teacherUid}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<TeacherRating, "studentUid">>) ?? {};
    cb(
      Object.entries(val)
        .map(([studentUid, v]) => ({ studentUid, ...v }))
        .sort((a, b) => (b.updatedAt ?? b.at) - (a.updatedAt ?? a.at))
    );
  });
}

export function computeStats(list: TeacherRating[]): RatingStats {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  list.forEach((r) => {
    const s = Math.max(1, Math.min(5, r.stars));
    breakdown[s] = (breakdown[s] ?? 0) + 1;
    sum += s;
  });
  const count = list.length;
  return {
    count,
    avg: count ? Math.round((sum / count) * 10) / 10 : 0,
    visible: count >= MIN_RATINGS_TO_SHOW,
    breakdown,
  };
}

/* ═══════════ كشف الحملات — للأدمن ═══════════ */

export interface BrigadeFlag {
  teacherUid: string;
  lowCount: number;      // تقييمات ≤ 2
  windowHours: number;   // خلال كم ساعة
  total: number;
  avg: number;
}

/**
 * إشارة تحذير لا حكم: عدّة تقييمات منخفضة تصل في نافذة زمنية ضيّقة.
 * التقدير البشري هو الفصل — لذلك لا يُحذف شيء تلقائياً.
 */
export function detectBrigading(list: TeacherRating[], teacherUid: string): BrigadeFlag | null {
  if (list.length < 3) return null;
  const low = list
    .filter((r) => r.stars <= 2)
    .map((r) => r.updatedAt ?? r.at)
    .sort((a, b) => a - b);
  if (low.length < 3) return null;

  // أضيق نافذة تضم 3 تقييمات منخفضة متتالية
  let best = Infinity;
  for (let i = 2; i < low.length; i++) best = Math.min(best, low[i] - low[i - 2]);
  const hours = best / 3600000;
  if (hours > 24) return null; // متفرّقة على أكثر من يوم → طبيعي

  const stats = computeStats(list);
  return {
    teacherUid,
    lowCount: low.length,
    windowHours: Math.max(Math.round(hours * 10) / 10, 0.1),
    total: stats.count,
    avg: stats.avg,
  };
}

/** حذف تقييم مسيء — للأدمن وحده */
export async function adminDeleteRating(teacherUid: string, studentUid: string) {
  await remove(ref(rtdb, `teacherRatings/${teacherUid}/${studentUid}`));
}
