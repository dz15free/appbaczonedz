"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ref,
  onChildAdded,
  onChildRemoved,
  set,
  remove,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faEraser,
  faRotateLeft,
  faRotateRight,
  faTrash,
  faBorderAll,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";

interface Point {
  x: number; // مُطبَّع 0..1
  y: number;
}
interface Stroke {
  id: string;
  uid: string;
  color: string;
  size: number;
  erase: boolean;
  points: Point[];
}

const COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6"];
const SIZES = [2, 4, 8];

export function Whiteboard({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // ذاكرة الضربات بالترتيب (لإعادة الرسم عند الحذف/التحجيم)
  const strokesRef = useRef<Stroke[]>([]);
  const drawnIds = useRef<Set<string>>(new Set());
  const redrawScheduled = useRef(false);

  // حالة الرسم الحالية
  const drawing = useRef(false);
  const current = useRef<Stroke | null>(null);

  // مكدّس التراجع/الإعادة (محلي)
  const redoStack = useRef<Stroke[]>([]);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [grid, setGrid] = useState(true);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;

  const strokesPath = `roomLive/${roomId}/whiteboard/strokes`;

  // ── رسم ضربة كاملة ──
  const drawStroke = useCallback((s: Stroke) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || s.points.length === 0) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * (window.devicePixelRatio || 1);
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
    }
    if (s.points.length === 1) {
      // نقطة واحدة = دائرة صغيرة
      ctx.lineTo(s.points[0].x * w + 0.01, s.points[0].y * h + 0.01);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  // ── إعادة الرسم الكاملة (مرة واحدة في الإطار — بلا وميض) ──
  const fullRedraw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesRef.current) drawStroke(s);
  }, [drawStroke]);

  const scheduleRedraw = useCallback(() => {
    if (redrawScheduled.current) return;
    redrawScheduled.current = true;
    requestAnimationFrame(() => {
      redrawScheduled.current = false;
      fullRedraw();
    });
  }, [fullRedraw]);

  // ── تهيئة الكانفاس + التجاوب (DPR + ResizeObserver) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    ctxRef.current = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      fullRedraw(); // إعادة الرسم بالإحداثيات المُطبَّعة
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fullRedraw]);

  // ── المزامنة عبر RTDB ──
  useEffect(() => {
    const sref = ref(rtdb, strokesPath);

    const unsubAdd = onChildAdded(sref, (snap) => {
      const id = snap.key!;
      if (drawnIds.current.has(id)) return; // ضربتي رسمتها محلياً
      const s = { id, ...(snap.val() as Omit<Stroke, "id">) };
      drawnIds.current.add(id);
      strokesRef.current.push(s);
      drawStroke(s); // رسم تزايدي فوري — بلا وميض
    });

    const unsubRemove = onChildRemoved(sref, (snap) => {
      const id = snap.key!;
      drawnIds.current.delete(id);
      strokesRef.current = strokesRef.current.filter((s) => s.id !== id);
      scheduleRedraw(); // إعادة رسم مُجمّعة (للتراجع/المسح)
    });

    return () => {
      unsubAdd();
      unsubRemove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── إحداثيات المؤشّر → مُطبَّعة ──
  function getPoint(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!user) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    current.current = {
      id: `${user.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uid: user.uid,
      color: colorRef.current,
      size: sizeRef.current,
      erase: toolRef.current === "eraser",
      points: [getPoint(e)],
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current || !current.current) return;
    e.preventDefault();
    const p = getPoint(e);
    const pts = current.current.points;
    const last = pts[pts.length - 1];
    // تقليل النقاط: تجاهل الحركة الصغيرة جداً
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.003) return;
    pts.push(p);
    // رسم المقطع الحي
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = current.current.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = current.current.color;
      ctx.lineWidth = current.current.size * (window.devicePixelRatio || 1);
      ctx.beginPath();
      ctx.moveTo(last.x * canvas.width, last.y * canvas.height);
      ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  }

  function onPointerUp() {
    if (!drawing.current || !current.current) return;
    drawing.current = false;
    const s = current.current;
    current.current = null;
    if (s.points.length === 0) return;
    // خزّنها محلياً (حتى لا نعيد رسمها عند الصدى) وادفعها
    drawnIds.current.add(s.id);
    strokesRef.current.push(s);
    redoStack.current = []; // أي رسم جديد يُلغي الإعادة
    const { id, ...data } = s;
    set(ref(rtdb, `${strokesPath}/${id}`), data);
  }

  // ── تراجع: احذف آخر ضربة لي ──
  function undo() {
    const mine = [...strokesRef.current].reverse().find((s) => s.uid === user?.uid);
    if (!mine) return;
    redoStack.current.push(mine);
    remove(ref(rtdb, `${strokesPath}/${mine.id}`));
  }

  // ── إعادة: أعد آخر ضربة تراجعت عنها ──
  function redo() {
    const s = redoStack.current.pop();
    if (!s) return;
    const { id, ...data } = s;
    set(ref(rtdb, `${strokesPath}/${id}`), data);
  }

  // ── مسح الكل ──
  function clearAll() {
    if (!confirm("مسح السبورة بالكامل للجميع؟")) return;
    remove(ref(rtdb, strokesPath));
  }

  return (
    <div className="flex h-full flex-col">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface p-2">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} icon={faPen} label="قلم" />
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} icon={faEraser} label="ممحاة" />

        <div className="mx-1 h-6 w-px bg-border" />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              setTool("pen");
            }}
            aria-label={`لون ${c}`}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === c && tool === "pen" ? "border-primary" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <div className="mx-1 h-6 w-px bg-border" />

        {SIZES.map((sz) => (
          <button
            key={sz}
            onClick={() => setSize(sz)}
            aria-label={`سُمك ${sz}`}
            className={`grid h-8 w-8 place-items-center rounded-md transition ${
              size === sz ? "bg-primary/10" : "hover:bg-primary/10"
            }`}
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

      {/* لوح الرسم */}
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
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
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
