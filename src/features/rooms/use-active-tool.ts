"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export type RoomTool = "welcome" | "video" | "whiteboard" | "files" | "notes";

// الأداة النشطة يتحكّم بها المالك، ويتابعها الجميع لحظياً
export function useActiveTool(roomId: string, isOwner: boolean) {
  const [tool, setToolState] = useState<RoomTool>("welcome");

  useEffect(() => {
    const r = ref(rtdb, `roomLive/${roomId}/activeTool`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val() as RoomTool | null;
      if (v) setToolState(v);
    });
    return () => unsub();
  }, [roomId]);

  // المالك فقط يغيّر الأداة للجميع
  const setTool = (t: RoomTool) => {
    if (!isOwner) return;
    set(ref(rtdb, `roomLive/${roomId}/activeTool`), t);
  };

  return { tool, setTool };
}
