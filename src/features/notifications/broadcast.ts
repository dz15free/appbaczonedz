"use client";

import { push, ref, onValue, query, limitToLast, get, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { AppNotification } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   الإشارة الجماعية @all

   ── لماذا بثّ واحد لا إشعار لكل عضو ──

   الطريقة المباشرة أن نكتب إشعاراً في `notifications/{uid}` لكل مستخدم.
   بألف طالب = **ألف كتابة في نداء واحد**، ومع نموّ المنصّة تلتهم حصّة
   Firebase وتتعثّر العملية في منتصفها — فيصل الإشعار لبعضهم دون بعض،
   ولا سبيل للتراجع.

   فنكتب **سجلّاً واحداً** في `broadcasts`، ويقرؤه كل مستخدم من طرفه
   ويدمجه مع إشعاراته. تكلفة الكتابة ثابتة مهما بلغ عدد الطلبة.

   و«مقروء» يُحفظ عند القارئ (`broadcastReads/{uid}/{id}`) لا في البثّ
   نفسه — وإلّا احتاج كل قارئ صلاحية الكتابة في سجلّ يراه الجميع.

   ── الصلاحيات ──
   الأدمن: في كل الموقع.
   الأستاذ: داخل غرفته أو مجموعته فقط (نطاق محدَّد).
   الطالب: لا — وإلّا صارت أداة إزعاج جماعي بيد أي حساب.

   والقرار **لا يُؤخذ من الواجهة**: القواعد تتحقّق من الدور في قاعدة
   البيانات، والدالّة هنا للتجربة فقط.
════════════════════════════════════════════════════════════ */

export const ALL_TOKEN = "@all";

export interface Broadcast {
  id: string;
  type: string;
  text: string;
  link?: string;
  /** نطاق البثّ: كل الموقع أو غرفة/مجموعة بعينها */
  scope: "site" | "room" | "group";
  scopeId?: string;
  fromUid: string;
  fromName: string;
  createdAt: number;
}

/** هل يملك هذا المستخدم حقّ الإشارة الجماعية في هذا النطاق؟ */
export function canBroadcast(
  role: string | undefined,
  scope: Broadcast["scope"],
  isScopeOwner?: boolean,
): boolean {
  if (role === "admin") return true;
  // الأستاذ داخل ما يملكه فقط
  if (role === "teacher" && scope !== "site") return Boolean(isScopeOwner);
  return false;
}

/** هل يحوي النصّ إشارة جماعية؟ (كلمة مستقلّة لا جزءاً من كلمة) */
export function hasAllMention(text: string): boolean {
  return /(^|\s)@all(\s|$|[.,!؟:]);?/i.test(text ?? "");
}

export async function sendBroadcast(b: Omit<Broadcast, "id" | "createdAt">) {
  const r = await push(ref(rtdb, "broadcasts"), {
    ...b,
    text: b.text.slice(0, 300),
    createdAt: Date.now(),
  });
  return r.key ?? "";
}

/**
 * يقرأ البثّ ويحوّله إلى إشعارات كإشعارات المستخدم العادية.
 * `scopes` = الغرف/المجموعات التي ينتمي إليها — فلا يرى بثّ غرفة ليس فيها.
 */
export function listenBroadcasts(
  uid: string,
  scopes: string[],
  cb: (list: AppNotification[]) => void,
) {
  const q = query(ref(rtdb, "broadcasts"), limitToLast(30));
  return onValue(q, async (snap) => {
    const val = (snap.val() as Record<string, Omit<Broadcast, "id">> | null) ?? {};
    let reads: Record<string, boolean> = {};
    try {
      const r = await get(ref(rtdb, `broadcastReads/${uid}`));
      reads = (r.val() as Record<string, boolean> | null) ?? {};
    } catch { /* الأسوأ أن تظهر غير مقروءة — لا ضرر */ }

    const list: AppNotification[] = Object.entries(val)
      // لا نُشعر صاحب البثّ ببثّه، ولا نُظهر بثّ نطاق لا ينتمي إليه
      .filter(([, b]) => b.fromUid !== uid && (b.scope === "site" || scopes.includes(b.scopeId ?? "")))
      .map(([id, b]) => ({
        id: `bc_${id}`,
        type: b.type || "announcement",
        text: b.text,
        link: b.link ?? "",
        read: Boolean(reads[id]),
        createdAt: b.createdAt,
      })) as AppNotification[];

    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

/** معرّف البثّ يبدأ بـ`bc_` — لتمييزه عن الإشعار الشخصي عند التعليم كمقروء */
export function isBroadcastId(id: string): boolean {
  return id.startsWith("bc_");
}

export async function markBroadcastRead(uid: string, notifId: string) {
  if (!isBroadcastId(notifId)) return;
  await set(ref(rtdb, `broadcastReads/${uid}/${notifId.slice(3)}`), true);
}
