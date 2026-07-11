"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* ════════════════════════════════════════════
   BottomSheet — لوح سفلي بأسلوب تطبيقات الهاتف
   - يُركّب على مستوى document.body (يعمل داخل الشاشة الكاملة)
   - سحب للأسفل لإغلاقه (Swipe to dismiss)
   - خلفية معتمة بنقرة للإغلاق
   يُستخدم بدل النوافذ الصغيرة والـ Popups في كل الغرفة
════════════════════════════════════════════ */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "80vh",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // قفل تمرير الخلفية أثناء فتح اللوح
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // إغلاق بمفتاح Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => { if (open) setDragY(0); }, [open]);

  if (!mounted || !open) return null;

  function onTouchStart(e: React.TouchEvent) { startY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (dragY > 110) onClose();
    else setDragY(0);
    startY.current = null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10060] flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* خلفية معتمة */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] bz-bs-fade"
        onClick={onClose}
      />
      {/* اللوح */}
      <div
        ref={sheetRef}
        className="relative bz-bs-slide rounded-t-3xl border-t border-border bg-surface shadow-2xl"
        style={{
          maxHeight,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : "transform .28s cubic-bezier(.22,1,.36,1)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {/* مقبض السحب */}
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2.5 pb-1 active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="h-1.5 w-11 rounded-full bg-border" />
        </div>
        {title && (
          <div className="px-5 pb-2 pt-1">
            <h3 className="text-base font-extrabold text-text-primary">{title}</h3>
          </div>
        )}
        <div className="overflow-y-auto px-4 pb-2" style={{ maxHeight: `calc(${maxHeight} - 64px)` }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* عنصر إجراء داخل اللوح السفلي — صف كبير سهل اللمس */
export function SheetAction({
  icon,
  label,
  hint,
  onClick,
  tone = "default",
}: {
  icon: IconDefinition;
  label: string;
  hint?: string;
  onClick: () => void;
  tone?: "default" | "primary" | "danger" | "amber";
}) {
  const toneCls =
    tone === "primary" ? "text-primary" :
    tone === "danger" ? "text-danger" :
    tone === "amber" ? "text-amber-500" :
    "text-text-primary";
  const bgCls =
    tone === "primary" ? "bg-primary/10" :
    tone === "danger" ? "bg-danger/10" :
    tone === "amber" ? "bg-amber-400/15" :
    "bg-border/40";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-right transition active:scale-[0.98] hover:bg-primary/5"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bgCls} ${toneCls}`}>
        <FontAwesomeIcon icon={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${toneCls}`}>{label}</span>
        {hint && <span className="block text-xs text-text-muted">{hint}</span>}
      </span>
    </button>
  );
}
