// نظام الإنجازات — نقاط/مستويات/أوسمة (Firebase RTDB، مجاني)
import { ref, runTransaction } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faSeedling,
  faPenFancy,
  faComments,
  faUsers,
  faStar,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";

export const POINTS = { post: 10, comment: 5, daily: 5 } as const;
const PER_LEVEL = 100; // كل 100 نقطة = مستوى

export function levelFromPoints(points = 0): number {
  return Math.floor(points / PER_LEVEL) + 1;
}

export function levelInfo(points = 0) {
  const level = levelFromPoints(points);
  const into = points % PER_LEVEL;
  return { level, into, span: PER_LEVEL, pct: Math.round((into / PER_LEVEL) * 100) };
}

export interface UserStats {
  points?: number;
  postCount?: number;
  commentCount?: number;
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: IconDefinition;
  color: "primary" | "secondary" | "warning" | "danger";
  ok: (s: UserStats, friendCount: number) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first_post", name: "أوّل خطوة", desc: "نشرت أوّل منشور", icon: faSeedling, color: "secondary", ok: (s) => (s.postCount ?? 0) >= 1 },
  { id: "prolific", name: "كاتب نشيط", desc: "نشرت 10 منشورات", icon: faPenFancy, color: "primary", ok: (s) => (s.postCount ?? 0) >= 10 },
  { id: "commenter", name: "مُعلّق فعّال", desc: "كتبت 10 تعليقات", icon: faComments, color: "primary", ok: (s) => (s.commentCount ?? 0) >= 10 },
  { id: "social", name: "اجتماعي", desc: "لديك 5 أصدقاء", icon: faUsers, color: "warning", ok: (_s, f) => f >= 5 },
  { id: "rising", name: "نجم صاعد", desc: "جمعت 200 نقطة", icon: faStar, color: "warning", ok: (s) => (s.points ?? 0) >= 200 },
  { id: "veteran", name: "خبير المنصة", desc: "جمعت 500 نقطة", icon: faCrown, color: "danger", ok: (s) => (s.points ?? 0) >= 500 },
];

export function earnedBadges(stats: UserStats, friendCount: number): Badge[] {
  return BADGES.filter((b) => b.ok(stats, friendCount));
}

// منح نقاط على نشاط المستخدم نفسه (يكتب في عقدته فقط — تسمح به القواعد)
export async function awardActivity(uid: string, kind: "post" | "comment") {
  const pts = kind === "post" ? POINTS.post : POINTS.comment;
  const statKey = kind === "post" ? "postCount" : "commentCount";
  try {
    await runTransaction(ref(rtdb, `users/${uid}`), (u) => {
      if (!u) return u;
      u.points = (u.points || 0) + pts;
      u[statKey] = (u[statKey] || 0) + 1;
      u.level = levelFromPoints(u.points);
      return u;
    });
  } catch {
    /* لا نُفشل العملية الأساسية إن تعذّر منح النقاط */
  }
}

// نقاط الزيارة اليومية (مرّة واحدة في اليوم) + عدّاد أيام متتالية
export async function recordDailyVisit(uid: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  try {
    await runTransaction(ref(rtdb, `users/${uid}`), (u) => {
      if (!u) return u;
      if (u.lastVisit === today) return undefined; // إلغاء — لا تغيير
      // تحديث السلسلة
      u.streak = u.lastVisit === yesterday ? (u.streak || 0) + 1 : 1;
      u.lastVisit = today;
      u.points = (u.points || 0) + POINTS.daily;
      u.level = levelFromPoints(u.points);
      return u;
    });
  } catch {
    /* تجاهل */
  }
}
