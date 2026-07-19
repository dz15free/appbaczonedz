"use client";

import { useEffect, useState } from "react";
import { ref, onValue, onDisconnect, set, serverTimestamp, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface PresenceMember {
  uid: string;
  name: string;
  joinedAt: number;
  lastActive?: number;
  /* إشارات Teacher Radar — تُكتب مع النبض نفسه، بلا أي طلب إضافي */
  visible?: boolean;   // هل تبويب الطالب مفتوح أمامه؟
  idle?: boolean;      // لم يلمس شيئاً منذ فترة طويلة
}

const IDLE_MS = 5 * 60 * 1000; // 5 دقائق بلا أي تفاعل

// حضور لحظي عبر RTDB (نفس فكرة الكود القديم: onDisconnect + نبض)
export function usePresence(roomId: string, uid?: string, name?: string) {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!roomId || !uid) return;
    const myRef = ref(rtdb, `presence/${roomId}/${uid}`);

    const joined = Date.now();
    let lastTouch = Date.now();
    const touched = () => { lastTouch = Date.now(); };

    // نكتب حالة الانتباه داخل نفس النبض الموجود — صفر طلبات إضافية
    const write = () => {
      set(myRef, {
        name: name ?? "طالب",
        joinedAt: joined,
        lastActive: serverTimestamp(),
        visible: typeof document === "undefined" || document.visibilityState === "visible",
        idle: Date.now() - lastTouch > IDLE_MS,
      });
    };

    // سجّل حضوري + احذفه تلقائياً عند قطع الاتصال
    write();
    onDisconnect(myRef).remove();

    // تغيّر ظهور التبويب حدث نادر → كتابة فورية تجعل الرادار دقيقاً
    const onVis = () => { if (document.visibilityState === "visible") touched(); write(); };
    document.addEventListener("visibilitychange", onVis);
    const acts: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
    acts.forEach((e) => window.addEventListener(e, touched, { passive: true }));

    // نبض كل 20 ثانية — يُحدَّث lastActive فقط، لا joinedAt
    const beat = setInterval(write, 20000);

    // استمع لقائمة الحاضرين
    const roomRef = ref(rtdb, `presence/${roomId}`);
    const unsub = onValue(roomRef, (snap) => {
      const val = (snap.val() as Record<string, Omit<PresenceMember, "uid">>) ?? {};
      setMembers(Object.entries(val).map(([id, v]) => ({ uid: id, ...v })));
    });

    return () => {
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onVis);
      acts.forEach((e) => window.removeEventListener(e, touched));
      unsub();
      remove(myRef);
    };
  }, [roomId, uid, name]);

  return members;
}
