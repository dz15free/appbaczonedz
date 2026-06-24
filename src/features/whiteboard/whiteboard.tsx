"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faHighlighter,
  faSlash,
  faArrowRight,
  faSquare,
  faCircle,
  faFont,
  faEraser,
  faRotateLeft,
  faRotateRight,
  faTrash,
  faBorderAll,
  faChevronLeft,
  faChevronRight,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";

interface Point {
  x: number;
  y: number;
}
type Kind = "pen" | "highlighter" | "line" | "arrow" | "rect" | "ellipse" | "text" | "eraser";
interface Shape {
  id: string;
  uid: string;
  kind: Kind;
  color: string;
  size: number;
  points: Point[];
  text?: string;
}

const COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6"];
const SIZES = [2, 4, 8];
const SYMBOLS = ["+", "−", "×", "÷", "=", "√", "π", "²", "³", "≤", "≥", "→", "∞", "∫", "Σ", "θ", "α", "Δ"];

const TOOLS: { id: Kind; icon: typeof faPen; label: string }[] = [
  { id: "pen", icon: faPen, label: "قلم" },
  { id: "highlighter", icon: faHighlighter, label: "تحديد" },
  { id: "line", icon: faSlash, label: "خط" },
  { id: "arrow", icon: faArrowRight, label: "سهم" },
  { id: "rect", icon: faSquare, label: "مستطيل" },
  { id: "ellipse", icon: faCircle, label: "دائرة" },
  { id: "text", icon: faFont, label: "نص" },
  { id: "eraser", icon: faEraser, label: "ممحاة" },
];

export function Whiteboard({ roomId, canDraw = true }: { roomId: string; canDraw?: boolean }) {
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const shapes = useRef<Shape[]>([]);
  const drawnIds = useRef<Set<string>>(new Set());
  const redoStack = useRef<Shape[]>([]);
  const redrawScheduled = useRef(false);

  const drawing = useRef(false);
  const currentShape = useRef<Shape | null>(null);

  const [tool, setTool] = useState<Kind>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [grid, setGrid] = useState(true);
  const [stamp, setStamp] = useState<string | null>(null);

  // الصفحات: صفحة نشطة متزامنة + عدد الصفحات
  const [activePage, setActivePage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const stampRef = useRef(stamp);
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;
  stampRef.current = stamp;

  // مسار الأشكال للصفحة النشطة
  const strokesPath = `roomLive/${roomId}/whiteboard/pages/${activePage}/strokes`;
  const dpr = () => window.devicePixelRatio || 1;

  // يزيل أي قيمة undefined قبل الكتابة (Firebase يرفض undefined)
  const clean = (o: Record<string, unknown>) => {
    const r: Record<string, unknown> = {};
    for (const k in o) if (o[k] !== undefined) r[k] = o[k];
    return r;
  };

  // ── رسم شكل على سياق معيّن ──
  const drawShape = useCallback((s: Shape, ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const P = (p: Point) => ({ x: p.x * w, y: p.y * h });
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size * dpr();
    if (s.kind === "eraser") ctx.globalCompositeOperation = "destination-out";
    else if (s.kind === "highlighter") ctx.globalAlpha = 0.35;

    const pts = s.points;
    if (s.kind === "pen" || s.kind === "highlighter" || s.kind === "eraser") {
      if (pts.length) {
        ctx.beginPath();
        const a = P(pts[0]);
        ctx.moveTo(a.x, a.y);
        for (let i = 1; i < pts.length; i++) {
          const b = P(pts[i]);
          ctx.lineTo(b.x, b.y);
        }
        if (pts.length === 1) ctx.lineTo(a.x + 0.5, a.y + 0.5);
        ctx.stroke();
      }
    } else if (s.kind === "line" || s.kind === "arrow") {
      if (pts.length >= 2) {
        const a = P(pts[0]);
        const b = P(pts[1]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (s.kind === "arrow") {
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          const head = 10 * dpr() + s.size * dpr();
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
          ctx.stroke();
        }
      }
    } else if (s.kind === "rect") {
      if (pts.length >= 2) {
        const a = P(pts[0]);
        const b = P(pts[1]);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }
    } else if (s.kind === "ellipse") {
      if (pts.length >= 2) {
        const a = P(pts[0]);
        const b = P(pts[1]);
        ctx.beginPath();
        ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (s.kind === "text" && s.text) {
      const a = P(pts[0]);
      const px = s.size * 8 * dpr();
      ctx.font = `bold ${px}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(s.text, a.x, a.y);
    }
    ctx.restore();
  }, []);

  const fullRedraw = useCallback(() => {
    const ctx = mainRef.current?.getContext("2d");
    const canvas = mainRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of shapes.current) drawShape(s, ctx);
  }, [drawShape]);

  const scheduleRedraw = useCallback(() => {
    if (redrawScheduled.current) return;
    redrawScheduled.current = true;
    requestAnimationFrame(() => {
      redrawScheduled.current = false;
      fullRedraw();
    });
  }, [fullRedraw]);

  const clearPreview = useCallback(() => {
    const ctx = previewRef.current?.getContext("2d");
    const c = previewRef.current;
    if (ctx && c) ctx.clearRect(0, 0, c.width, c.height);
  }, []);

  // ── تهيئة + تجاوب ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const main = mainRef.current;
    const prev = previewRef.current;
    if (!wrap || !main || !prev) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      for (const c of [main, prev]) {
        c.width = Math.max(1, Math.floor(r.width * dpr()));
        c.height = Math.max(1, Math.floor(r.height * dpr()));
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
      }
      fullRedraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fullRedraw]);

  // ── مزامنة RTDB (onValue: متين، يصل للجميع) — لكل صفحة ──
  useEffect(() => {
    // عند تبديل الصفحة، أعد ضبط الحالة المحلية وامسح اللوحة
    shapes.current = [];
    drawnIds.current = new Set();
    redoStack.current = [];
    scheduleRedraw();

    const sref = ref(rtdb, strokesPath);
    const unsub = onValue(sref, (snap) => {
      const val = (snap.val() as Record<string, Omit<Shape, "id">>) ?? {};
      const ids = Object.keys(val);
      const present = new Set(ids);
      // حذف؟ أعد البناء كاملاً
      const removed = shapes.current.some((s) => !present.has(s.id));
      if (removed) {
        shapes.current = ids.map((id) => ({ id, ...val[id] }));
        drawnIds.current = new Set(ids);
        scheduleRedraw();
        return;
      }
      // إضافات: ارسمها تزايدياً (بلا وميض)
      const ctx = mainRef.current?.getContext("2d");
      for (const id of ids) {
        if (!drawnIds.current.has(id)) {
          const s = { id, ...val[id] } as Shape;
          drawnIds.current.add(id);
          shapes.current.push(s);
          if (ctx) drawShape(s, ctx);
        }
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, activePage]);

  // ── مزامنة الصفحة النشطة وعدد الصفحات ──
  useEffect(() => {
    const metaRef = ref(rtdb, `roomLive/${roomId}/whiteboard/meta`);
    const unsub = onValue(metaRef, (snap) => {
      const m = (snap.val() as { activePage?: number; pageCount?: number }) ?? {};
      if (typeof m.pageCount === "number") setPageCount(Math.max(1, m.pageCount));
      if (typeof m.activePage === "number") setActivePage(m.activePage);
    });
    return () => unsub();
  }, [roomId]);

  function getPoint(e: React.PointerEvent): Point {
    const r = previewRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function commit(s: Shape) {
    drawnIds.current.add(s.id);
    shapes.current.push(s);
    redoStack.current = [];
    const ctx = mainRef.current?.getContext("2d");
    if (ctx) drawShape(s, ctx);
    const { id, ...data } = s;
    set(ref(rtdb, `${strokesPath}/${id}`), clean(data));
  }

  function newShape(kind: Kind, p: Point, text?: string): Shape {
    const s: Shape = {
      id: `${user!.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uid: user!.uid,
      kind,
      color: colorRef.current,
      size: sizeRef.current,
      points: [p],
    };
    if (text !== undefined) s.text = text; // لا نُدرج text إن لم يوجد (Firebase يرفض undefined)
    return s;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!user) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = getPoint(e);
    const t = toolRef.current;

    // ختم رمز رياضي
    if (stampRef.current) {
      commit(newShape("text", p, stampRef.current));
      return;
    }
    // نص حرّ
    if (t === "text") {
      const txt = window.prompt("النص:");
      if (txt) commit(newShape("text", p, txt));
      return;
    }
    // أدوات الرسم
    drawing.current = true;
    currentShape.current = newShape(t, p);
    if (t === "line" || t === "arrow" || t === "rect" || t === "ellipse") {
      currentShape.current.points.push(p); // نقطة نهاية مبدئية
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current || !currentShape.current) return;
    e.preventDefault();
    const p = getPoint(e);
    const s = currentShape.current;

    if (s.kind === "pen" || s.kind === "highlighter" || s.kind === "eraser") {
      const last = s.points[s.points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 0.003) return;
      s.points.push(p);
      // رسم المقطع الحي على الطبقة الرئيسية
      const ctx = mainRef.current?.getContext("2d");
      if (ctx) {
        const tmp: Shape = { ...s, points: [last, p] };
        drawShape(tmp, ctx);
      }
    } else {
      // أشكال: معاينة على الطبقة العلوية
      s.points[1] = p;
      clearPreview();
      const ctx = previewRef.current?.getContext("2d");
      if (ctx) drawShape(s, ctx);
    }
  }

  function onPointerUp() {
    if (!drawing.current || !currentShape.current) return;
    drawing.current = false;
    const s = currentShape.current;
    currentShape.current = null;
    clearPreview();
    if (s.kind === "pen" || s.kind === "highlighter" || s.kind === "eraser") {
      // رُسمت حيّاً؛ خزّنها وادفعها
      drawnIds.current.add(s.id);
      shapes.current.push(s);
      redoStack.current = [];
      const { id, ...data } = s;
      set(ref(rtdb, `${strokesPath}/${id}`), clean(data));
    } else {
      commit(s); // الأشكال: ارسمها على الرئيسية وادفعها
    }
  }

  function undo() {
    const mine = [...shapes.current].reverse().find((s) => s.uid === user?.uid);
    if (!mine) return;
    redoStack.current.push(mine);
    remove(ref(rtdb, `${strokesPath}/${mine.id}`));
  }
  function redo() {
    const s = redoStack.current.pop();
    if (!s) return;
    const { id, ...data } = s;
    set(ref(rtdb, `${strokesPath}/${id}`), clean(data));
  }
  function clearAll() {
    if (!confirm("مسح هذه الصفحة بالكامل للجميع؟")) return;
    remove(ref(rtdb, strokesPath));
  }

  // ── إدارة الصفحات ──
  function gotoPage(idx: number) {
    if (idx < 0 || idx >= pageCount) return;
    update(ref(rtdb, `roomLive/${roomId}/whiteboard/meta`), { activePage: idx, pageCount });
  }
  function addPage() {
    const newCount = pageCount + 1;
    update(ref(rtdb, `roomLive/${roomId}/whiteboard/meta`), { pageCount: newCount, activePage: newCount - 1 });
  }
  function deletePage() {
    if (pageCount <= 1) { clearAll(); return; }
    if (!confirm("حذف هذه الصفحة؟")) return;
    // امسح أشكال الصفحة الحالية وأزل الصفحة بإعادة فهرسة الصفحات اللاحقة
    remove(ref(rtdb, strokesPath));
    const target = Math.max(0, activePage - 1);
    update(ref(rtdb, `roomLive/${roomId}/whiteboard/meta`), { pageCount: pageCount - 1, activePage: target });
  }

  function pickTool(k: Kind) {
    setTool(k);
    setStamp(null);
  }

  return (
    <div className="flex h-full flex-col">
      {canDraw && (
        <div className="space-y-1 border-b border-border bg-surface p-2">
          {/* الأدوات */}
          <div className="flex flex-wrap items-center gap-1.5">
            {TOOLS.map((t) => (
              <ToolBtn key={t.id} active={tool === t.id && !stamp} onClick={() => pickTool(t.id)} icon={t.icon} label={t.label} />
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === "eraser") pickTool("pen");
                }}
                aria-label={`لون`}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-primary" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            {SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => setSize(sz)}
                aria-label={`سُمك`}
                className={`grid h-8 w-8 place-items-center rounded-md ${size === sz ? "bg-primary/10" : "hover:bg-primary/10"}`}
              >
                <span className="rounded-full bg-text-primary" style={{ width: sz + 2, height: sz + 2 }} />
              </button>
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            <ToolBtn active={grid} onClick={() => setGrid((g) => !g)} icon={faBorderAll} label="شبكة" />
            <ToolBtn onClick={undo} icon={faRotateLeft} label="تراجع" />
            <ToolBtn onClick={redo} icon={faRotateRight} label="إعادة" />
            <ToolBtn onClick={clearAll} icon={faTrash} label="مسح" danger />
          </div>
          {/* الرموز الرياضية */}
          <div className="flex flex-wrap items-center gap-1">
            {SYMBOLS.map((sym) => (
              <button
                key={sym}
                onClick={() => setStamp((cur) => (cur === sym ? null : sym))}
                className={`grid h-7 min-w-7 place-items-center rounded px-1.5 text-sm font-bold ${
                  stamp === sym ? "bg-gradient-primary text-white" : "bg-background text-text-primary hover:bg-primary/10"
                }`}
              >
                {sym}
              </button>
            ))}
            {stamp && <span className="text-xs text-text-muted">اضغط على السبورة لوضع: {stamp}</span>}
          </div>
        </div>
      )}

      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden bg-white"
        style={
          grid
            ? {
                backgroundImage:
                  "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }
            : undefined
        }
      >
        <canvas ref={mainRef} className="pointer-events-none absolute inset-0" />
        <canvas
          ref={previewRef}
          className={`absolute inset-0 ${canDraw ? "touch-none" : "pointer-events-none"}`}
          onPointerDown={canDraw ? onPointerDown : undefined}
          onPointerMove={canDraw ? onPointerMove : undefined}
          onPointerUp={canDraw ? onPointerUp : undefined}
          onPointerLeave={canDraw ? onPointerUp : undefined}
          onPointerCancel={canDraw ? onPointerUp : undefined}
        />
      </div>

      {/* ── شريط الصفحات ── */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-surface px-2 py-1.5">
        <button
          onClick={() => gotoPage(activePage - 1)}
          disabled={activePage === 0}
          className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary disabled:opacity-30"
          aria-label="الصفحة السابقة"
        >
          <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => gotoPage(i)}
              className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-bold transition ${
                i === activePage ? "bg-gradient-primary text-white" : "bg-background text-text-muted hover:bg-primary/10"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => gotoPage(activePage + 1)}
          disabled={activePage >= pageCount - 1}
          className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary disabled:opacity-30"
          aria-label="الصفحة التالية"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
        </button>

        {canDraw && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <button onClick={addPage} title="إضافة صفحة"
              className="grid h-8 w-8 place-items-center rounded-lg text-secondary transition hover:bg-secondary/10">
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            </button>
            <button onClick={deletePage} title="حذف الصفحة"
              className="grid h-8 w-8 place-items-center rounded-lg text-danger transition hover:bg-danger/10">
              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <span className="ms-1 text-[11px] font-semibold text-text-muted">صفحة {activePage + 1}/{pageCount}</span>
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  icon,
  label,
  danger,
}: {
  active?: boolean;
  onClick: () => void;
  icon: typeof faPen;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-md transition ${
        danger
          ? "text-danger hover:bg-danger/10"
          : active
            ? "bg-gradient-primary text-white"
            : "text-text-muted hover:bg-primary/10"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="pointer-events-none h-4 w-4" />
    </button>
  );
}
