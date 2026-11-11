"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { listenPost, type Post } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   المنشور المثبَّت — منشور واحد تضعه الإدارة أوّل المجتمع وأوّل
   «آخر المنشورات» في الرئيسية.

   لماذا `settings/pinnedPost` لا حقلاً على المنشور نفسه:
   • قواعد `settings` جاهزة كما نريد بالضبط: يقرؤها الجميع، ولا يكتبها
     إلّا الأدمن. حقل على المنشور كان سيحتاج قاعدة جديدة تُنشر على
     Firebase — وصاحب المنشور يملك الكتابة على عقدة منشوره، فكان يستطيع
     تثبيت منشوره بنفسه.
   • منشور واحد مثبَّت في كلّ لحظة: التثبيت الجديد يحلّ محلّ القديم
     بكتابة واحدة، بلا بحث عن «المثبَّت السابق» لإلغائه.
   • المثبَّت قد يكون أقدم من آخر 200 منشور التي يجلبها `listenPosts`،
     فنستمع إليه بمعرّفه مستقلّاً — يبقى ظاهراً مهما قدُم.
   ════════════════════════════════════════════════════════════ */

const PIN_PATH = "settings/pinnedPost";

export interface PinInfo {
  id: string;
  at: number;
  by: string;
}

export function listenPin(cb: (pin: PinInfo | null) => void) {
  return onValue(
    ref(rtdb, PIN_PATH),
    (snap) => {
      const v = snap.val() as Partial<PinInfo> | null;
      cb(v && typeof v.id === "string" && v.id ? { id: v.id, at: v.at ?? 0, by: v.by ?? "" } : null);
    },
    () => cb(null),
  );
}

/** تثبيت منشور — للأدمن (القواعد ترفض غيره). يحلّ محلّ أيّ مثبَّت سابق. */
export async function pinPost(postId: string, adminUid: string) {
  await set(ref(rtdb, PIN_PATH), { id: postId, at: Date.now(), by: adminUid });
}

export async function unpinPost() {
  await remove(ref(rtdb, PIN_PATH));
}

/**
 * المنشور المثبَّت كاملاً، أو null.
 * يعود null أيضاً إن حُذف المنشور أو لم يعد عامّاً: التثبيت يعرض المنشور
 * لكلّ المنصّة، فلا يجوز أن يُظهر منشوراً خاصّاً أو للأصدقاء لغير أهله.
 */
export function usePinnedPost(myUid: string | undefined): { pin: PinInfo | null; post: Post | null } {
  const [pin, setPin] = useState<PinInfo | null>(null);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!myUid) return;
    return listenPin(setPin);
  }, [myUid]);

  const pinId = pin?.id;
  useEffect(() => {
    if (!myUid || !pinId) { setPost(null); return; }
    return listenPost(pinId, myUid, (p) => setPost(p && p.visibility === "public" ? p : null));
  }, [myUid, pinId]);

  return { pin, post: pin && post && post.id === pin.id ? post : null };
}

/** يضع المثبَّت أوّلاً ويُزيله من بقيّة القائمة حتى لا يظهر مرّتين */
export function withPinnedFirst<T extends { id: string }>(list: T[], pinned: T | null): T[] {
  if (!pinned) return list;
  return [pinned, ...list.filter((p) => p.id !== pinned.id)];
}
