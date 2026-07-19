"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* ════════════════════════════════════════════
   Mini Floating Assistant — زر دائري (FAB) يفتح قائمة شعاعية
   يحمل الوظائف الثانوية لإبقاء الشاشة نظيفة في وضع التركيز
════════════════════════════════════════════ */

export interface RadialAction {
  id: string;
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary" | "amber" | "danger";
}

export function FloatingAssistant({
  actions,
  side = "left",
}: {
  actions: RadialAction[];
  side?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toneColor = (t?: string) =>
    t === "primary" ? "var(--bz-primary,#2563eb)"
    : t === "amber" ? "#f59e0b"
    : t === "danger" ? "#dc2626"
    : "#334155";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[10055] flex flex-col items-center gap-3"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
        [side]: "16px",
      }}
    >
      {/* عناصر القائمة الشعاعية */}
      {open && (
        <div className="pointer-events-auto flex flex-col items-stretch gap-2 bz-radial-in">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => { a.onClick(); setOpen(false); }}
              className="flex items-center gap-2.5 rounded-full bg-surface py-2 pr-2 pl-4 shadow-xl ring-1 ring-border transition active:scale-95"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                style={{ background: toneColor(a.tone) }}
              >
                <FontAwesomeIcon icon={a.icon} className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap text-sm font-bold text-text-primary">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* الزر الرئيسي */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "إغلاق" : "أدوات"}
        className={`pointer-events-auto grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl transition active:scale-90 ${open ? "rotate-45 bg-danger" : "bg-gradient-primary"}`}
      >
        <FontAwesomeIcon icon={faPlus} className="h-6 w-6" />
      </button>

      {/* نقرة خارج القائمة لإغلاقها */}
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 -z-10"
          onClick={() => setOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}
