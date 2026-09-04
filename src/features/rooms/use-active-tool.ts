"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export type RoomTool = "welcome" | "video" | "whiteboard" | "files" | "notes";

/**
 * الأداة النشطة يتحكّم بها المالك، ويتابعها الجميع لحظياً.
 *
 * `enabled`: بعد أن صارت `roomLive` مغلقة في الغرف المدفوعة، لا يجوز
 * أن يفتح المستمعُ قناةً قبل أن يُعرف أنّ للمستخدم حقّ القراءة —
 * وإلّا رأى من لم يدفع سلسلة `permission_denied` في الطرفية وكلفتنا
 * محاولات قراءة مرفوضة. تُمرَّر `false` حتى تُحسم الأهليّة.
 */
export function useActiveTool(roomId: string, isOwner: boolean, enabled = true) {
  const [tool, setToolState] = useState<RoomTool>("welcome");

  useEffect(() => {
    if (!roomId || !enabled) return;
    const r = ref(rtdb, `roomLive/${roomId}/activeTool`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val() as RoomTool | null;
      if (v) setToolState(v);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, enabled]);

  // المالك فقط يغيّر الأداة للجميع
  const setTool = (t: RoomTool) => {
    if (!isOwner) return;
    set(ref(rtdb, `roomLive/${roomId}/activeTool`), t);
  };

  return { tool, setTool };
}
