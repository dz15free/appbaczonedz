"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   سطح الغرفة

   قبل هذا الملف كانت الغرفة «أدوات» تتبادل المكان: اختيار الفيديو
   يُنزل السبورة من الشجرة، واختيار السبورة يُنزل الفيديو. فكان
   الطالب يشعر أنه «يفتح ميزة» لا أنه في حصّة، وكانت السبورة تُفكَّك
   وتُعاد كل مرّة.

   النموذج الجديد: **اللوح هو الغرفة**، دائم لا يُفكَّك. أمّا الفيديو
   والملفّات والملاحظات فطبقات تعلو اللوح ثم تنزاح عنه، واللوح تحتها
   كما تركه الأستاذ.

   التوافق مع الغرف الجارية مقصود: نبقى على المسار نفسه
   `roomLive/{roomId}/activeTool` وعلى قيمه القديمة، فلا تنكسر حصّة
   قائمة الآن ولا نسخة قديمة من التطبيق ما تزال مفتوحة عند أحدهم.
   القيمة "whiteboard" القديمة تعني اليوم: لا طبقة فوق اللوح.
════════════════════════════════════════════════════════════ */

/** الطبقة الظاهرة فوق اللوح. "none" تعني أنّ اللوح وحده هو المعروض. */
export type RoomOverlay = "none" | "welcome" | "video" | "files" | "notes";

/** القيم كما تُكتب في قاعدة البيانات — أبقيناها لتوافق الغرف الجارية */
type StoredTool = "welcome" | "video" | "whiteboard" | "files" | "notes";

function toOverlay(v: StoredTool | null): RoomOverlay {
  // "whiteboard" في النموذج القديم = اللوح وحده، وهو اليوم غياب الطبقة
  if (!v || v === "whiteboard") return "none";
  return v;
}

function toStored(o: RoomOverlay): StoredTool {
  return o === "none" ? "whiteboard" : o;
}

/**
 * الأستاذ يقرّر الطبقة الظاهرة، والجميع يتابعها لحظياً.
 * اللوح نفسه ليس طبقة: هو أرضية الغرفة ولا يُطفأ أبداً.
 */
export function useRoomSurface(roomId: string, isOwner: boolean) {
  // الغرفة الجديدة تبدأ بشاشة الترحيب كما كانت تماماً — لا تغيير في السلوك
  const [overlay, setOverlayState] = useState<RoomOverlay>("welcome");

  useEffect(() => {
    const r = ref(rtdb, `roomLive/${roomId}/activeTool`);
    const unsub = onValue(r, (snap) => {
      setOverlayState(toOverlay(snap.val() as StoredTool | null));
    });
    return () => unsub();
  }, [roomId]);

  /** المالك وحده يغيّر ما يراه الجميع */
  const setOverlay = (o: RoomOverlay) => {
    if (!isOwner) return;
    set(ref(rtdb, `roomLive/${roomId}/activeTool`), toStored(o));
  };

  /** إزاحة الطبقة والعودة إلى اللوح وحده */
  const closeOverlay = () => setOverlay("none");

  /** الضغط على طبقة ظاهرة يُغلقها — سلوك زرّ ثنائي الحالة في الكونسول */
  const toggleOverlay = (o: RoomOverlay) => setOverlay(overlay === o ? "none" : o);

  return { overlay, setOverlay, closeOverlay, toggleOverlay };
}
