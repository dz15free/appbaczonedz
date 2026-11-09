"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faCircleInfo } from "@fortawesome/free-solid-svg-icons";

/* ════════════════════════════════════════════════════════════
   رسائل قصيرة (toast) — بديل `alert()` في واجهة التلميذ

   `alert()` يوقف الصفحة كلّها وينتظر نقرة، ويظهر بشكل المتصفّح لا
   بشكل المنصّة. هذه رسالة صغيرة أعلى الشاشة تختفي وحدها، ويقرؤها
   قارئ الشاشة (aria-live).

     toast.success("نُشر منشورك")
     toast.error("تعذّر الرفع. تحقّق من الاتّصال.")
   ════════════════════════════════════════════════════════════ */

type Tone = "success" | "error" | "info";
type Item = { id: number; tone: Tone; text: string };

const listeners = new Set<(items: Item[]) => void>();
let items: Item[] = [];
let seq = 0;

function emit() { listeners.forEach((fn) => fn(items)); }

function show(tone: Tone, text: string, ms?: number) {
  if (typeof window === "undefined" || !text) return;
  /* الرسالة نفسها مرّتين متتاليتين لا تتكرّر على الشاشة */
  if (items.some((t) => t.text === text)) return;
  const id = ++seq;
  items = [...items.slice(-2), { id, tone, text }];
  emit();
  const life = ms ?? (tone === "error" ? 5200 : 3200);
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, life);
}

export const toast = {
  success: (text: string, ms?: number) => show("success", text, ms),
  error: (text: string, ms?: number) => show("error", text, ms),
  info: (text: string, ms?: number) => show("info", text, ms),
};

/** رسالة الخطأ المناسبة: نصّ الخطأ إن كان عربياً مفهوماً، وإلّا البديل */
export function errorText(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  return msg && /[؀-ۿ]/.test(msg) ? msg : fallback;
}

const ICON = { success: faCircleCheck, error: faCircleExclamation, info: faCircleInfo };

export function Toaster() {
  const [list, setList] = useState<Item[]>([]);
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);

  return (
    <div className="bz-toaster" aria-live="polite" aria-atomic="false">
      {list.map((t) => (
        <div key={t.id} className={`bz-toast is-${t.tone}`} role={t.tone === "error" ? "alert" : "status"}>
          <FontAwesomeIcon icon={ICON[t.tone]} className="bz-toast-ic" />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
