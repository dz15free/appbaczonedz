"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* ════════════════════════════════════════════
   BottomSheet — لوح سفلي متجاوب للغرفة
   - ارتفاعه يُقاس من visualViewport على iPhone
   - يحترم مناطق الأمان وشريط Safari ولوحة المفاتيح
   - رأس ثابت مع زر إغلاق واضح
   - تمرير داخلي وسحب من المقبض فقط حتى لا يتعارض مع التمرير
════════════════════════════════════════════ */

function readViewportHeight() {
  if (typeof window === "undefined") return 0;
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

function readHeightRatio(maxHeight: string) {
  const match = maxHeight.trim().match(/^([0-9.]+)(?:dvh|vh)$/);
  const ratio = match ? Number(match[1]) / 100 : 0.8;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 0.8;
}

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
  const [viewportHeight, setViewportHeight] = useState(0);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const dragYRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // قياس المساحة المرئية الفعلية؛ innerHeight وحده لا يكفي في Safari iPhone.
  useEffect(() => {
    if (!open) return;
    const update = () => setViewportHeight(readViewportHeight());
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // قفل تمرير الخلفية دون إجبار Safari على تمرير الصفحة خلف اللوح.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previous = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previous.overflow;
      body.style.overscrollBehavior = previous.overscrollBehavior;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      dragYRef.current = 0;
      setDragY(0);
    }
  }, [open]);

  if (!mounted || !open) return null;

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0]?.clientY ?? null;
    dragYRef.current = 0;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const currentY = e.touches[0]?.clientY ?? startY.current;
    const next = Math.max(0, currentY - startY.current);
    dragYRef.current = next;
    setDragY(next);
  }

  function resetDrag() {
    startY.current = null;
    dragYRef.current = 0;
    setDragY(0);
  }

  function onTouchEnd() {
    if (dragYRef.current > 110) onClose();
    else resetDrag();
  }

  const viewport = viewportHeight || readViewportHeight() || 760;
  const maxHeightPx = Math.max(260, Math.min(viewport - 12, Math.round(viewport * readHeightRatio(maxHeight))));
  // يجب أن يعيش الدرج على body لا داخل مسرح الغرفة؛ المسرح يملك overflow-hidden،
  // وSafari iPhone يقصّ fixed descendants داخله حتى لو كان z-index مرتفعاً.
  const portalRoot = document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[2147483600] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "bz-sheet-title" : undefined}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] bz-bs-fade"
        onClick={onClose}
      />
      <section
        className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-surface shadow-2xl bz-bs-slide"
        style={{
          maxHeight: `${maxHeightPx}px`,
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : "transform .28s cubic-bezier(.23,1,.32,1)",
        }}
      >
        <div
          className="shrink-0 touch-none select-none border-b border-border px-4 pb-3 pt-2.5"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={resetDrag}
          style={{ touchAction: "none" }}
        >
          <span className="mx-auto mb-2 block h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
          <div className="flex min-h-10 items-center gap-3">
            <div className="min-w-0 flex-1">
              {title && <h3 id="bz-sheet-title" className="text-base font-extrabold text-text-primary sm:text-lg">{title}</h3>}
              <p className="mt-0.5 text-[10px] font-medium text-text-muted">اسحب من المقبض للأسفل للإغلاق</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition hover:bg-border hover:text-text-primary active:scale-95"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </section>
    </div>,
    portalRoot,
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
    "bg-border";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-right transition active:scale-[0.98] hover:bg-primary/5"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bgCls} ${toneCls}`}>
        <FontAwesomeIcon icon={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${toneCls}`}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">{hint}</span>}
      </span>
    </button>
  );
}
