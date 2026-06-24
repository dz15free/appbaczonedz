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

/** تاريخ نتائج البكالوريا (settings/bacResultsDate) */
export function useBacResultsDate() {
  const [dateStr, setDateStr] = useState<string | null>(null);
  useEffect(() => {
    return onValue(ref(rtdb, "settings/bacResultsDate"), (snap) => {
      setDateStr((snap.val() as string | null) ?? null);
    });
  }, []);
  return dateStr;
}

export async function setBacResultsDate(dateStr: string) {
  await set(ref(rtdb, "settings/bacResultsDate"), dateStr);
}

/** عدّ تنازلي كامل لأي تاريخ (أيام/ساعات/دقائق/ثوانٍ) يتحدّث كل ثانية */
export function useCountdownTo(dateStr: string | null, fallbackMonth = 5, fallbackDay = 15) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  useEffect(() => {
    function calc() {
      const now = new Date();
      let target: Date;
      if (dateStr) {
        target = new Date(dateStr + "T00:00:00");
        if (target <= now) target = new Date(target.getFullYear() + 1, target.getMonth(), target.getDate());
      } else {
        target = new Date(now.getFullYear(), fallbackMonth, fallbackDay);
        if (target <= now) target = new Date(now.getFullYear() + 1, fallbackMonth, fallbackDay);
      }
      let diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      const total = diff;
      const days = Math.floor(diff / 86400); diff -= days * 86400;
      const hours = Math.floor(diff / 3600); diff -= hours * 3600;
      const minutes = Math.floor(diff / 60); diff -= minutes * 60;
      setT({ days, hours, minutes, seconds: diff, total });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [dateStr, fallbackMonth, fallbackDay]);
  return t;
}

/**
 * بانر إعلاني يظهر لجميع المستخدمين أسفل الهيدر — يتحكّم به الأدمن
 * (settings/siteBanner: { text, active })
 */
export interface SiteBanner { text: string; active: boolean }

export function useSiteBanner() {
  const [banner, setBanner] = useState<SiteBanner | null>(null);

  useEffect(() => {
    return onValue(ref(rtdb, "settings/siteBanner"), (snap) => {
      setBanner((snap.val() as SiteBanner | null) ?? null);
    });
  }, []);

  return banner;
}

export async function setSiteBanner(banner: SiteBanner) {
  await set(ref(rtdb, "settings/siteBanner"), banner);
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

/** عدّ تنازلي كامل حيّ: أيام/ساعات/دقائق/ثوانٍ (يتحدّث كل ثانية) */
export function useBacCountdownFull() {
  const dateStr = useBacExamDate();
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      let exam: Date;
      if (dateStr) {
        exam = new Date(dateStr + "T00:00:00");
        if (exam <= now) exam = new Date(exam.getFullYear() + 1, exam.getMonth(), exam.getDate());
      } else {
        exam = new Date(now.getFullYear(), 5, 15);
        if (exam <= now) exam = new Date(now.getFullYear() + 1, 5, 15);
      }
      let diff = Math.max(0, Math.floor((exam.getTime() - now.getTime()) / 1000));
      const days = Math.floor(diff / 86400); diff -= days * 86400;
      const hours = Math.floor(diff / 3600); diff -= hours * 3600;
      const minutes = Math.floor(diff / 60); diff -= minutes * 60;
      setT({ days, hours, minutes, seconds: diff });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [dateStr]);

  return t;
}
