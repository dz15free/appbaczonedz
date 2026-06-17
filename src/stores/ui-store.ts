"use client";

import { create } from "zustand";

type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const STORAGE_KEY = "bz-theme";

function applyToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    applyToDocument(theme);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  initTheme: () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    // الافتراضي: وضع فاتح (أبيض) حتى لو كان النظام داكناً
    const theme: Theme = saved ?? "light";
    applyToDocument(theme);
    set({ theme });
  },
}));
