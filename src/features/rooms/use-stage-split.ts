"use client";

import { useCallback, useEffect, useState } from "react";
import { ref, onValue, set, update, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { RoomTool } from "@/features/rooms/use-active-tool";

/* ════════════════════════════════════════════════════════════
   الشاشة الثانية — حالة مزامَنة واحدة

   ── الحاجة ──
   الأستاذ يعرض فيديو، يوقفه، يفتح السبورة **بجانبه** ليشرح نقطة،
   ثم يعيد تشغيل الفيديو. أو يوقف محاكاة البكالوريا ويفتح السبورة
   بجانب الموضوع. سطحٌ واحد في كل لحظة كان يجعل هذا مستحيلاً: كل
   فتحٍ يُلغي ما قبله.

   ── لماذا عقدة جديدة لا تغيير `activeTool` ──
   `activeTool` نصّ يقرؤه كل عميل مفتوح الآن. تحويله إلى كائن يكسر
   كل نسخة عاملة في الميدان في اللحظة التي تُنشر فيها. فبقي كما هو
   **الشاشة الأولى**، وأُضيفت `stage` للثانية: العميل القديم يرى
   الشاشة الأولى ويعمل، والجديد يرى الاثنتين.

   ── الشكل ──
     roomLive/$roomId/stage = { b, ratio, updatedAt }

   `b`: السطح الثاني (أو غيابه = شاشة واحدة).
   `ratio`: حصّة الشاشة الأولى من 0.25 إلى 0.75 — تُكتب مخنوقة أثناء
   السحب فلا تُغرق حصّة الكتابة المجانية.

   ── من يكتب ──
   **مالك الغرفة وحده** (قرارك). التقسيم يُغيّر شاشة الصفّ كلّه،
   فليس فعلاً يملكه مشرف ولا طالب.

   ── والاتجاه؟ ──
   لا يُخزَّن: `row` أو `column` قرارُ **الجهاز** لا قرار الأستاذ.
   حاسوبٌ يعرض جنباً إلى جنب، ولوحٌ عموديّ فوق وتحت، وهاتفٌ عموديّ
   شاشةً واحدة مع مبدّل. الأستاذ يبثّ النيّة، وكل جهاز يعرضها بقدره.
   ════════════════════════════════════════════════════════════ */

export interface StageSplit {
  /** السطح في الشاشة الثانية — `null` يعني شاشة واحدة */
  b: RoomTool | null;
  /** حصّة الشاشة الأولى (0.25–0.75) */
  ratio: number;
}

export const RATIO_MIN = 0.25;
export const RATIO_MAX = 0.75;
export const RATIO_DEFAULT = 0.55;

const clampRatio = (r: number) => Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));

/* ════════════════════════════════════════════════════════════
   ما يُقبل سطحاً ثانياً

   «مرحباً» خرجت من القائمة (انظر `SECOND_SCREEN_TOOLS` في
   `control-bar.tsx`). وإخراجها من هنا أيضاً ليس تكراراً بل شرط
   الترحيل: توجد الآن غرف حيّة مخزَّن فيها `stage.b = "welcome"`.

   لو تركناها تُقرأ لبقيت معروضةً في تلك الغرف رغم إزالتها، ولو
   شدّدنا قاعدة الكتابة في Firebase وحدها لرُفض أوّل سحبٍ للفاصل في
   تلك الغرف (لأنّ `update` يُصادق على العقدة بعد الدمج، و`b` تبقى
   فيها). فنعاملها هنا كأنّها لا شيء: تُغلق الشاشة الثانية من نفسها
   عند أوّل تحميل، بلا خطوة ترحيل ولا حالة عالقة.
   ════════════════════════════════════════════════════════════ */
const VALID: RoomTool[] = ["video", "whiteboard", "files", "notes"];

export function useStageSplit(roomId: string, isOwner: boolean, enabled = true) {
  const [split, setSplit] = useState<StageSplit>({ b: null, ratio: RATIO_DEFAULT });

  useEffect(() => {
    if (!roomId || !enabled) return;
    const unsub = onValue(ref(rtdb, `roomLive/${roomId}/stage`), (snap) => {
      const v = snap.val() as { b?: string; ratio?: number } | null;
      const b = v?.b && VALID.includes(v.b as RoomTool) ? (v.b as RoomTool) : null;
      setSplit({ b, ratio: clampRatio(Number(v?.ratio) || RATIO_DEFAULT) });
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, enabled]);

  /** فتح سطح في الشاشة الثانية */
  const openSecond = useCallback((b: RoomTool) => {
    if (!isOwner) return;
    /* الحارس هنا لا في الواجهة وحدها: عميلٌ قديم في تبويب آخر قد
       يستدعيها بـ`welcome`، وقاعدة Firebase سترفضها — فالرفض
       الصامت من الخادم أسوأ من منعٍ واضح هنا. */
    if (!VALID.includes(b)) return;
    void set(ref(rtdb, `roomLive/${roomId}/stage`), {
      b, ratio: RATIO_DEFAULT, updatedAt: Date.now(),
    });
  }, [roomId, isOwner]);

  /** إغلاق الشاشة الثانية — تعود الغرفة إلى شاشة واحدة */
  const closeSecond = useCallback(() => {
    if (!isOwner) return;
    void remove(ref(rtdb, `roomLive/${roomId}/stage`));
  }, [roomId, isOwner]);

  /** النسبة أثناء السحب — كتابة مخنوقة، والنهائية مضمونة عند الإفلات */
  const setRatio = useCallback((r: number) => {
    if (!isOwner) return;
    void update(ref(rtdb, `roomLive/${roomId}/stage`), {
      ratio: clampRatio(r), updatedAt: Date.now(),
    });
  }, [roomId, isOwner]);

  return { split, openSecond, closeSecond, setRatio };
}
