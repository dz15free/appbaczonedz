"use client";

import { useEffect, useState } from "react";
import { ref, onValue, onDisconnect, set, serverTimestamp, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface PresenceMember {
  uid: string;
  name: string;
  joinedAt: number;
}

// حضور لحظي عبر RTDB (نفس فكرة الكود القديم: onDisconnect + نبض)
export function usePresence(roomId: string, uid?: string, name?: string) {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!roomId || !uid) return;
    const myRef = ref(rtdb, `presence/${roomId}/${uid}`);

    // سجّل حضوري + احذفه تلقائياً عند قطع الاتصال
    set(myRef, { name: name ?? "طالب", joinedAt: Date.now(), lastActive: serverTimestamp() });
    onDisconnect(myRef).remove();

    // نبض كل 20 ثانية للإبقاء على النشاط
    const beat = setInterval(() => {
      set(myRef, { name: name ?? "طالب", joinedAt: Date.now(), lastActive: serverTimestamp() });
    }, 20000);

    // استمع لقائمة الحاضرين
    const roomRef = ref(rtdb, `presence/${roomId}`);
    const unsub = onValue(roomRef, (snap) => {
      const val = (snap.val() as Record<string, Omit<PresenceMember, "uid">>) ?? {};
      setMembers(Object.entries(val).map(([id, v]) => ({ uid: id, ...v })));
    });

    return () => {
      clearInterval(beat);
      unsub();
      remove(myRef);
    };
  }, [roomId, uid, name]);

  return members;
}
