"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMagnifyingGlassPlus, faMagnifyingGlassMinus } from "@fortawesome/free-solid-svg-icons";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

/** عارض صور احترافي بتكبير (عجلة الفأرة + قرص الإصبعين + أزرار) وسحب */
export function ImageZoom({ src, alt = "", onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const pinchDist = useRef(0);
  const pinchStartScale = useRef(1);

  // إغلاق بـ ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function clampScale(s: number) {
    return Math.max(1, Math.min(5, s));
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => {
      const next = clampScale(s - e.deltaY * 0.002);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale === 1) return;
    dragging.current = true;
    lastPoint.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setPos({ x: e.clientX - lastPoint.current.x, y: e.clientY - lastPoint.current.y });
  }
  function onPointerUp() { dragging.current = false; }

  // قرص الإصبعين (الجوال)
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
      pinchStartScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      dragging.current = true;
      lastPoint.current = { x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDist.current > 0) {
        setScale(clampScale(pinchStartScale.current * (dist / pinchDist.current)));
      }
    } else if (e.touches.length === 1 && dragging.current) {
      setPos({ x: e.touches[0].clientX - lastPoint.current.x, y: e.touches[0].clientY - lastPoint.current.y });
    }
  }
  function onTouchEnd() { dragging.current = false; pinchDist.current = 0; }

  function reset() { setScale(1); setPos({ x: 0, y: 0 }); }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
      onClick={onClose}
      style={{ touchAction: "none" }}
    >
      {/* أزرار التحكّم */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setScale((s) => clampScale(s + 0.5))}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4" />
        </button>
        <button onClick={() => { setScale((s) => { const n = clampScale(s - 0.5); if (n === 1) setPos({ x: 0, y: 0 }); return n; }); }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25">
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="h-4 w-4" />
        </button>
        <button onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25">
          <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
        </button>
      </div>

      {/* تلميح */}
      {scale === 1 && (
        <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md">
          استخدم العجلة أو إصبعين للتكبير
        </span>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={reset}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        draggable={false}
        className="max-h-[90vh] max-w-[92vw] select-none rounded-lg object-contain"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "default",
          transition: dragging.current ? "none" : "transform 0.15s ease-out",
        }}
      />
    </div>
  );
}
