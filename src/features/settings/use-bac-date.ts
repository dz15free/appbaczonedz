"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/**
 * تاريخ البكالوريا قابل للتحكّم من لوحة الإدارة (settings/bacExamDate
 * بصيغة "YYYY-MM-DD"). إن لم يُحدَّد، نستخدم 15 جوان كافتراضي.
 */
export function useBacExamDate() {
  const [dateStr, setDateStr] = useState<string | null>(null);

  useEffect(() => {
    return onValue(ref(rtdb, "settings/bacExamDate"), (snap) => {
      setDateStr((snap.val() as string | null) ?? null);
    });
  }, []);

  return dateStr;
}

export async function setBacExamDate(dateStr: string) {
  await set(ref(rtdb, "settings/bacExamDate"), dateStr);
}

/** يحسب الأيام المتبقية حتى تاريخ الامتحان (أو الافتراضي 15 جوان) */
export function useBacCountdown() {
  const dateStr = useBacExamDate();
  const [days, setDays] = useState(0);

  useEffect(() => {
    function calc() {
      const now = new Date();
      let exam: Date;
      if (dateStr) {
        exam = new Date(dateStr + "T00:00:00");
        // إن مرّ التاريخ المحدَّد، نعتمد نفس التاريخ في السنة القادمة
        if (exam <= now) exam = new Date(exam.getFullYear() + 1, exam.getMonth(), exam.getDate());
      } else {
        exam = new Date(now.getFullYear(), 5, 15); // 15 جوان (افتراضي)
        if (exam <= now) exam = new Date(now.getFullYear() + 1, 5, 15);
      }
      setDays(Math.ceil((exam.getTime() - now.getTime()) / 86400000));
    }
    calc();
    const t = setInterval(calc, 3600000);
    return () => clearInterval(t);
  }, [dateStr]);

  return days;
}
