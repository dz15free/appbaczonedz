"use client";

import { useCallback, useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { IconName } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   حالات الغرفة

   حالة واحدة تُعيد ترتيب الواجهة كلّها. هذا جوهر ملاحظاتك:
   «لا تضف أزراراً جديدة، بل غيّر طريقة ظهورها».

   المسار في قاعدة البيانات جديد تماماً (`roomState`)، فلا يمسّ
   أيّ مفتاح قائم ولا يكسر غرفة تعمل الآن. الغرف القديمة التي لا
   تحمل المفتاح تُقرأ "study" وهي السلوك الحالي نفسه.
════════════════════════════════════════════════════════════ */

export type RoomState = "study" | "focus" | "exam" | "review";

export const ROOM_STATES: {
  id: RoomState; label: string; icon: IconName; hint: string;
}[] = [
  { id: "study",  label: "دراسة",       icon: "book",  hint: "الوضع الكامل — كل الأدوات متاحة" },
  { id: "focus",  label: "تركيز",       icon: "target", hint: "يختفي كل ما يشتّت — المحتوى فقط" },
  { id: "exam",   label: "امتحان",      icon: "timer", hint: "مؤقّت · بلا دردشة · حلّ فردي" },
  { id: "review", label: "مراجعة ملفّ", icon: "file",  hint: "الملفّ يملأ الشاشة واللوح طبقة فوقه" },
];

const VALID: RoomState[] = ["study", "focus", "exam", "review"];

function parse(v: unknown): RoomState {
  return typeof v === "string" && (VALID as string[]).includes(v)
    ? (v as RoomState)
    : "study";
}

export function roomStateLabel(s: RoomState): string {
  return ROOM_STATES.find((x) => x.id === s)?.label ?? "دراسة";
}

/**
 * المالك يقرّر الحالة، والجميع يتبعونها لحظياً.
 * الطالب يستطيع دخول تركيزه الشخصي محلّياً دون أن يغيّر حالة الغرفة.
 */
export function useRoomState(roomId: string, isOwner: boolean) {
  const [state, setState] = useState<RoomState>("study");

  useEffect(() => {
    if (!roomId) return;
    const r = ref(rtdb, `roomLive/${roomId}/roomState`);
    const unsub = onValue(r, (snap) => setState(parse(snap.val())));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

  const setRoomState = useCallback(
    (next: RoomState) => {
      if (!isOwner || !roomId) return;
      set(ref(rtdb, `roomLive/${roomId}/roomState`), next);
    },
    [isOwner, roomId],
  );

  return { state, setRoomState };
}
