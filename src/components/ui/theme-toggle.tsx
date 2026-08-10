"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useUIStore } from "@/stores/ui-store";

/* زرّ الوضع الداكن.

   🐛 كان موجوداً في **درج الهاتف وحده** — فمستخدم الحاسوب لا يملك
   أي طريقة لتفعيل الوضع الداكن إطلاقاً. الصيغة `compact` هي شكله في
   الهيدر: أيقونة بلا حدّ بالمقاس نفسه الذي عليه بقيّة أزرار الشريط
   (`bz-hbtn`) فلا يبدو دخيلاً بينها. وبدونها يبقى الشكل القديم كما هو. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme, initTheme } = useUIStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      aria-pressed={isDark}
      className={
        compact
          ? "bz-hbtn grid"
          : "grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-text-primary transition hover:bg-primary/10"
      }
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className={compact ? "h-[17px] w-[17px]" : "h-4 w-4"} />
    </button>
  );
}
