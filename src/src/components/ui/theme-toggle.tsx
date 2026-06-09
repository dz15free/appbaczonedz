"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useUIStore } from "@/stores/ui-store";

export function ThemeToggle() {
  const { theme, toggleTheme, initTheme } = useUIStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="تبديل الوضع الليلي"
      className="grid h-10 w-10 place-items-center rounded-md border border-border bg-surface text-text-primary transition hover:bg-primary/10"
    >
      <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} className="h-4 w-4" />
    </button>
  );
}
