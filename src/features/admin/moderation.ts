"use client";

import { ref, onValue, set, remove, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   إجراءات الإدارة على المستخدمين

   **الاستبعاد من الترتيب ≠ حذف المستخدم.** الأوّل عقوبة خفيفة قابلة
   للتراجع (نقاط مضخّمة، حساب تجريبي)، والثاني نهائي. الخلط بينهما
   يجعل الأدمن يحذف حين يريد الإخفاء فقط.
════════════════════════════════════════════════════════════ */

const EXCLUDED = "moderation/leaderboardExcluded";

export function listenExcluded(cb: (s: Set<string>) => void) {
  return onValue(ref(rtdb, EXCLUDED), (snap) => {
    const v = (snap.val() as Record<string, boolean> | null) ?? {};
    cb(new Set(Object.keys(v).filter((k) => v[k])));
  });
}

export async function setLeaderboardExcluded(uid: string, excluded: boolean) {
  const r = ref(rtdb, `${EXCLUDED}/${uid}`);
  if (excluded) await set(r, true);
  else await remove(r);
}

/* المسارات التي يملكها المستخدم — تُمسح عند الحذف النهائي.
   نُعدّدها صراحةً بدل مسح عشوائي: مسار منسيّ يعني بيانات يتيمة تبقى
   في قاعدة البيانات إلى الأبد. */
const OWNED_PATHS = (uid: string) => [
  `users/${uid}`,
  `flashcards/${uid}`,
  `studyProgress/${uid}`,
  `studyTasks/${uid}`,
  `notifications/${uid}`,
  `friends/${uid}`,
  `friendRequests/${uid}`,
  `userGroups/${uid}`,
  `presence/${uid}`,
  `${EXCLUDED}/${uid}`,
];

export interface DeleteResult {
  removed: string[];
  failed: string[];
}

/**
 * حذف نهائي لبيانات المستخدم من قاعدة البيانات.
 *
 * ⚠️ حدّ لا يمكن تجاوزه من المتصفّح: **حساب المصادقة نفسه** لا يُحذف
 * إلّا من Firebase Console أو Admin SDK على خادم. فنحذف كل بياناته
 * ونُعلم الأدمن صراحةً بالخطوة المتبقّية، بدل أن نوهمه بحذف كامل.
 */
export async function deleteUserData(uid: string): Promise<DeleteResult> {
  const removed: string[] = [];
  const failed: string[] = [];
  for (const p of OWNED_PATHS(uid)) {
    try {
      await remove(ref(rtdb, p));
      removed.push(p);
    } catch {
      failed.push(p);
    }
  }
  return { removed, failed };
}

/** هل بقيت للمستخدم بيانات؟ — للتحقّق بعد الحذف */
export async function userHasData(uid: string): Promise<boolean> {
  const snap = await get(ref(rtdb, `users/${uid}`));
  return snap.exists();
}
