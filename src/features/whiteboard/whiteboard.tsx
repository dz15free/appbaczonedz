"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickShape, boundsOf, describeShape } from "@/features/whiteboard/shape-geometry";
import { ShapeActionsSheet } from "@/features/whiteboard/shape-actions";
import {
  listenMarks, listenSavedMarks, recordMarkSaved, tagInfo,
  setMark, clearMark,
  type ShapeMark, type MarkTag,
} from "@/features/whiteboard/marks";
import { saveFlashcard } from "@/features/study/save-flashcard";
import { ref, onValue, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  FloatingConsole, ConsoleZone, ConsoleDivider, ConsoleButton,
  ConsoleSwatch, StageIndicator,
} from "@/components/ui/console";
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
  faArrowPointer, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { recognize } from "@/features/whiteboard/smart/recognize";
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

/* أيقونات الأدوات في الكونسول — من نظام أيقونات BacZone الموحّد */
/* تسمية النوع التي تظهر في لسان الكائن — العنصر الثاني من توقيع BacZone */
const KIND_LABEL: Record<Kind, string> = {
  pen: "رسم", highlighter: "تظليل", line: "خط", arrow: "سهم",
  rect: "مستطيل", ellipse: "دائرة", text: "نصّ", eraser: "ممحاة",
};

const TOOL_ICON: Record<ToolId, IconName> = {
  select: "cursor", pen: "pen", highlighter: "marker", line: "line",
  arrow: "arrow", rect: "square", ellipse: "circle", text: "text", eraser: "eraser",
};

const COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6"];
const SIZES = [2, 4, 8];
/* نسبة اللوح الثابتة.
   كانت اللوحة تأخذ شكل الحاوية أيًّا كان، والإحداثيات محفوظة نسبيّة (0..1) —
   فالدائرة المرسومة على الحاسوب (نسبة ١٫٦٧) تصل الهاتف (نسبة ٠٫٥٨) بيضاويّةً
   ممطوطة، والكتابة تبدو طويلة. الآن اللوح يحتفظ بنسبة واحدة على كل الأجهزة
   ويُوسَّط داخل المساحة المتاحة، فما يراه الأستاذ هو ما يراه الطالب بالضبط. */
const BOARD_AR = 16 / 10;

const SYMBOLS = ["+", "−", "×", "÷", "=", "√", "π", "²", "³", "≤", "≥", "→", "∞", "∫", "Σ", "θ", "α", "Δ"];

/* الاختيار أداة تفاعل لا نوع شكل — لذلك يبقى خارج Kind
   فلا يتسرّب إلى قاعدة البيانات ولا يُخزَّن كشكل. */
type ToolId = Kind | "select";

const TOOLS: { id: ToolId; icon: typeof faPen; label: string }[] = [
  { id: "select", icon: faArrowPointer, label: "اختيار" },
  { id: "pen", icon: faPen, label: "قلم" },
  { id: "highlighter", icon: faHighlighter, label: "تحديد" },
  { id: "line", icon: faSlash, label: "خط" },
  { id: "arrow", icon: faArrowRight, label: "سهم" },
  { id: "rect", icon: faSquare, label: "مستطيل" },
  { id: "ellipse", icon: faCircle, label: "دائرة" },
  { id: "text", icon: faFont, label: "نص" },
  { id: "eraser", icon: faEraser, label: "ممحاة" },
];

export function Whiteboard({ roomId, canDraw = true, roomName, subject }: {
  roomId: string; canDraw?: boolean; roomName?: string; subject?: string | null;
}) {
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const shapes = useRef<Shape[]>([]);
  const drawnIds = useRef<Set<string>>(new Set());
  const redoStack = useRef<Shape[]>([]);
  const redrawScheduled = useRef(false);

  const drawing = useRef(false);
  const currentShape = useRef<Shape | null>(null);

  const [tool, setTool] = useState<ToolId>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  // لوحة الرموز الرياضية — كانت صفًّا دائمًا، صارت تظهر عند الطلب فقط
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  // تحويل الرسم الحرّ إلى أشكال مثالية — يُعطَّل للمواد التي تحتاج رسمًا عضويًّا (الأحياء)
  const [smartShapes, setSmartShapes] = useState(true);
  // شارة «تراجع» بعد تحويل ناجح — الذكاء الذي لا يمكن رفضه إزعاج
  const [snapUndo, setSnapUndo] = useState<{ shapedId: string; original: Shape } | null>(null);
  /* سحب عنصر محدَّد: تحريك أو تحجيم من إحدى الزوايا الأربع.
     نحتفظ بنسخة من النقاط الأصلية فتُحسب كل خطوة من الأصل لا تراكميًّا. */
  const dragRef = useRef<{
    mode: "move" | "resize";
    corner?: "nw" | "ne" | "sw" | "se";
    start: Point;
    orig: Point[];
    b: { x0: number; y0: number; x1: number; y1: number };
  } | null>(null);
  const [grid, setGrid] = useState(true);
  const [stamp, setStamp] = useState<string | null>(null);
  // التحديد: الحالة للواجهة، والمرجع ليقرأه الرسم دون إعادة إنشاء الدوال
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  // الطالب لا يرسم، فالاختيار عنده دائم بلا زر إضافي
  const selecting = !canDraw || tool === "select";
  const selectingRef = useRef(selecting);
  const canDrawRef = useRef(canDraw);
  // درج الإجراءات + مؤقّت الضغط المطوّل
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Smart Highlights
  const [marks, setMarks] = useState<Record<string, ShapeMark>>({});
  const marksRef = useRef<Record<string, ShapeMark>>({});
  const [toast, setToast] = useState<{ tag: MarkTag; text?: string } | null>(null);
  const savedMarks = useRef<Set<string>>(new Set());
  const seenMarks = useRef<Set<string>>(new Set());

  // الصفحات: صفحة نشطة متزامنة + عدد الصفحات
  const [activePage, setActivePage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  // Follow Teacher: صفحة الأستاذ، وهل يتابعها هذا المستخدم؟
  const [teacherPage, setTeacherPage] = useState(0);
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const stampRef = useRef(stamp);
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;
  stampRef.current = stamp;
  selectingRef.current = selecting;
  selectedRef.current = selectedId;
  canDrawRef.current = canDraw;
  marksRef.current = marks;
  followingRef.current = following;

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

    // العلامات — خط رفيع بلون الوسم حول العنصر.
    // خفيف عمداً: الملاحظات تقول ألّا يقطع التعليم تركيز الطالب.
    const dprv = window.devicePixelRatio || 1;
    for (const [shapeId, m] of Object.entries(marksRef.current)) {
      const shape = shapes.current.find((x) => x.id === shapeId);
      const mb = shape ? boundsOf(shape) : null;
      if (!mb) continue;
      const info = tagInfo(m.tag);
      const w = canvas.width, h = canvas.height;
      ctx.save();
      ctx.strokeStyle = info.color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2 * dprv;
      ctx.strokeRect(mb.x0 * w, mb.y0 * h, (mb.x1 - mb.x0) * w, (mb.y1 - mb.y0) * h);
      ctx.globalAlpha = 1;
      ctx.font = `${13 * dprv}px sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.fillText(info.emoji, mb.x0 * w, Math.max(mb.y0 * h - 2 * dprv, 14 * dprv));
      ctx.restore();
    }

    // إطار العنصر المحدَّد — يُرسم هنا لا على طبقة منفصلة، فيبقى
    // ظاهراً بعد أي إعادة رسم أو تغيير حجم دون منطق إضافي
    const sel = selectedRef.current;
    if (sel) {
      const shape = shapes.current.find((x) => x.id === sel);
      const b = shape ? boundsOf(shape) : null;
      if (b) {
        const w = canvas.width, h = canvas.height;
        const k = window.devicePixelRatio || 1;
        const x = b.x0 * w, y = b.y0 * h;
        const bw = (b.x1 - b.x0) * w, bh = (b.y1 - b.y0) * h;
        const pad = 5 * k;
        const X = x - pad, Y = y - pad, W = bw + pad * 2, H = bh + pad * 2;
        // طول ذراع القوس: نسبة من الضلع مع حدّ أقصى، فلا يبتلع الأشكال الصغيرة
        const arm = Math.max(6 * k, Math.min(14 * k, Math.min(W, H) * 0.28));

        ctx.save();
        ctx.strokeStyle = "#2350D9";              // أزرق BacZone
        ctx.lineWidth = 1 * k;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.35;
        ctx.strokeRect(X, Y, W, H);               // إطار خافت

        // أقواس الزوايا — التوقيع البصري لـ BacZone بدل المربّعات الأربعة
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2.4 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        // أعلى يمين
        ctx.moveTo(X + W - arm, Y); ctx.lineTo(X + W, Y); ctx.lineTo(X + W, Y + arm);
        // أعلى يسار
        ctx.moveTo(X + arm, Y); ctx.lineTo(X, Y); ctx.lineTo(X, Y + arm);
        // أسفل يمين
        ctx.moveTo(X + W - arm, Y + H); ctx.lineTo(X + W, Y + H); ctx.lineTo(X + W, Y + H - arm);
        // أسفل يسار
        ctx.moveTo(X + arm, Y + H); ctx.lineTo(X, Y + H); ctx.lineTo(X, Y + H - arm);
        ctx.stroke();

        // لسان النوع فوق الإطار — يجعل اللوح مقروءًا بلا فتح شيء
        {
          const label = KIND_LABEL[shape.kind] ?? "عنصر";
          const fs = 11 * k;
          ctx.font = `600 ${fs}px system-ui, sans-serif`;
          ctx.direction = "rtl";
          ctx.textBaseline = "middle";
          const padX = 7 * k;
          const tw = ctx.measureText(label).width + padX * 2;
          const th = 17 * k;
          const tx = X + W - tw;            // يُحاذى إلى يمين الإطار (RTL)
          const ty = Y - th - 4 * k;
          const rr = 4 * k;
          ctx.beginPath();
          ctx.moveTo(tx + rr, ty);
          ctx.arcTo(tx + tw, ty, tx + tw, ty + th, rr);
          ctx.arcTo(tx + tw, ty + th, tx, ty + th, rr);
          ctx.arcTo(tx, ty + th, tx, ty, rr);
          ctx.arcTo(tx, ty, tx + tw, ty, rr);
          ctx.closePath();
          ctx.fillStyle = "#2350D9";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "right";
          ctx.fillText(label, tx + tw - padX, ty + th / 2);
        }

        // مقابض التحجيم — للمالك فقط (الطالب يحدّد ليقرأ لا ليعدّل)
        if (canDrawRef.current) {
          const r = 4 * k;
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 1.6 * k;
          for (const [cx, cy] of [[X, Y], [X + W, Y], [X, Y + H], [X + W, Y + H]]) {
            ctx.beginPath();
            ctx.rect(cx - r, cy - r, r * 2, r * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
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

  // العلامات لهذه الصفحة
  useEffect(() => {
    const unsub = listenMarks(roomId, activePage, (m) => { setMarks(m); scheduleRedraw(); });
    return () => { unsub(); seenMarks.current = new Set(); };
  }, [roomId, activePage, scheduleRedraw]);

  // ما حُفظ سابقاً في حساب الطالب — يمنع تكرار البطاقة نفسها
  useEffect(() => {
    if (!user || canDraw) return;
    return listenSavedMarks(user.uid, roomId, (ids) => { savedMarks.current = ids; });
  }, [user, canDraw, roomId]);

  // علامة جديدة عند الطالب: تنبيه خفيف، ونقلها إلى بطاقاته إن كانت نصاً
  useEffect(() => {
    if (canDraw || !user) return;
    for (const [shapeId, m] of Object.entries(marks)) {
      if (seenMarks.current.has(shapeId)) continue;
      seenMarks.current.add(shapeId);
      // أول تحميل للصفحة ليس حدثاً — لا نُغرق الطالب بتنبيهات قديمة
      if (Date.now() - m.at > 60000) continue;

      setToast({ tag: m.tag, text: m.text });
      setTimeout(() => setToast(null), 3200);

      if (m.text && !savedMarks.current.has(shapeId)) {
        const info = tagInfo(m.tag);
        saveFlashcard({
          uid: user.uid,
          front: m.text,
          back: `${info.emoji} ${info.label}${roomName ? ` — ${roomName}` : ""}`,
          subject: subject || "general",
          source: roomName ? `سبورة ${roomName}` : "السبورة",
        }).then(() => recordMarkSaved(user.uid, roomId, shapeId)).catch(() => {});
      }
    }
  }, [marks, canDraw, user, roomId, roomName, subject]);

  // Escape يلغي التحديد — سلوك متوقّع في كل محرّر
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      // لا نتدخّل أثناء الكتابة في حقل
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      if (e.key === "Escape") {
        setSelectedId(null);
        selectedRef.current = null;
        scheduleRedraw();
        return;
      }
      if (!canDrawRef.current) return;

      // حذف العنصر المحدَّد
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const id = selectedId;
        shapes.current = shapes.current.filter((x) => x.id !== id);
        drawnIds.current.delete(id);
        remove(ref(rtdb, `${strokesPath}/${id}`));
        setSelectedId(null);
        selectedRef.current = null;
        fullRedraw();
        return;
      }

      // تكرار العنصر المحدَّد بإزاحة صغيرة
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const src = shapes.current.find((x) => x.id === selectedId);
        if (!src) return;
        const OFF = 0.02;
        const copy: Shape = {
          ...src,
          id: `${user!.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          uid: user!.uid,
          points: src.points.map((q) => ({ x: q.x + OFF, y: q.y + OFF })),
        };
        commit(copy);
        setSelectedId(copy.id);
        selectedRef.current = copy.id;
        fullRedraw();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, scheduleRedraw, strokesPath]);

  // ── تهيئة + تجاوب ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const board = boardRef.current;
    const main = mainRef.current;
    const prev = previewRef.current;
    if (!wrap || !board || !main || !prev) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;

      // احتواء: أكبر مستطيل بنسبة BOARD_AR يدخل في الحاوية
      let bw = r.width;
      let bh = bw / BOARD_AR;
      if (bh > r.height) { bh = r.height; bw = bh * BOARD_AR; }
      bw = Math.floor(bw); bh = Math.floor(bh);

      board.style.width = `${bw}px`;
      board.style.height = `${bh}px`;

      for (const c of [main, prev]) {
        c.width = Math.max(1, Math.floor(bw * dpr()));
        c.height = Math.max(1, Math.floor(bh * dpr()));
        c.style.width = `${bw}px`;
        c.style.height = `${bh}px`;
      }
      fullRedraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    // تغيّر اتجاه الهاتف لا يُطلق ResizeObserver دائمًا
    window.addEventListener("orientationchange", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, [fullRedraw]);

  // ── مزامنة RTDB (onValue: متين، يصل للجميع) — لكل صفحة ──
  useEffect(() => {
    // عند تبديل الصفحة، أعد ضبط الحالة المحلية وامسح اللوحة
    shapes.current = [];
    drawnIds.current = new Set();
    redoStack.current = [];
    setSelectedId(null);
    selectedRef.current = null;
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
      if (typeof m.activePage === "number") {
        setTeacherPage(m.activePage);
        // الأستاذ يتبع صفحته دائماً، والطالب فقط إن لم يوقف المتابعة
        if (canDraw || followingRef.current) setActivePage(m.activePage);
      }
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

    // وضع الاختيار: نلتقط الشكل ولا نرسم شيئاً
    if (selectingRef.current) {
      const c = mainRef.current;
      const v = { w: c?.clientWidth ?? 1, h: c?.clientHeight ?? 1 };
      // هامش أوسع للمس من هامش الفأرة
      const tol = e.pointerType === "mouse" ? 10 : 18;

      // ١) هل الضغطة على مقبض تحجيم للعنصر المحدَّد حاليًّا؟ (له الأولوية)
      const curSel = selectedRef.current;
      if (curSel && canDraw) {
        const cur = shapes.current.find((x) => x.id === curSel);
        const cb = cur ? boundsOf(cur) : null;
        if (cur && cb) {
          const corner = hitCorner(p, cb, e.pointerType === "mouse" ? 12 : 22);
          if (corner) {
            dragRef.current = { mode: "resize", corner, start: p, orig: cur.points.map((q) => ({ ...q })), b: cb };
            cancelLongPress();
            return;
          }
          // ٢) داخل الإطار → تحريك
          if (p.x >= cb.x0 && p.x <= cb.x1 && p.y >= cb.y0 && p.y <= cb.y1) {
            dragRef.current = { mode: "move", start: p, orig: cur.points.map((q) => ({ ...q })), b: cb };
            cancelLongPress();
            return;
          }
        }
      }

      const hit = pickShape(shapes.current, p, v, tol);
      setSelectedId(hit ? hit.id : null);
      selectedRef.current = hit ? hit.id : null;
      scheduleRedraw();

      // ضغط مطوّل على عنصر → درج الإجراءات (بديل النقر الأيمن على الهاتف)
      if (hit) {
        pressStart.current = { x: e.clientX, y: e.clientY };
        if (longPress.current) clearTimeout(longPress.current);
        longPress.current = setTimeout(() => setActionsOpen(true), 550);
      }
      return;
    }

    // ختم رمز رياضي — يُوضع مرّة واحدة ثم يعود المستخدم لأداته
    // (كان يبقى مفعّلاً فيُبطل الرسم بالقلم حتى يُلغيه المستخدم يدويّاً)
    if (stampRef.current) {
      commit(newShape("text", p, stampRef.current));
      stampRef.current = null;
      setStamp(null);
      return;
    }
    // نص حرّ
    if (t === "text") {
      const txt = window.prompt("النص:");
      if (txt) commit(newShape("text", p, txt));
      return;
    }
    // أدوات الرسم — "select" استُبعد أعلاه، والحارس يوثّق ذلك للمترجم
    if (t === "select") return;
    drawing.current = true;
    currentShape.current = newShape(t, p);
    if (t === "line" || t === "arrow" || t === "rect" || t === "ellipse") {
      currentShape.current.points.push(p); // نقطة نهاية مبدئية
    }
  }

  function cancelLongPress() {
    if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
    pressStart.current = null;
  }

  /* النقر الأيمن على الحاسوب — يفتح إجراءات العنصر مباشرة.
     كان الوصول الوحيد هو ضغط مطوّل ٥٥٠ms في وضع الاختيار، وهو غير مكتشَف
     على الحاسوب إطلاقاً، فبدت ميزتا العلامات الذكية وإجراءات العناصر معطّلتين. */
  function onContextMenu(e: React.MouseEvent) {
    if (!user) return;
    const c = mainRef.current;
    const r = previewRef.current?.getBoundingClientRect();
    if (!r) return;
    e.preventDefault();
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    const v = { w: c?.clientWidth ?? 1, h: c?.clientHeight ?? 1 };
    const hit = pickShape(shapes.current, p, v, 12);
    if (!hit) return;
    setSelectedId(hit.id);
    selectedRef.current = hit.id;
    scheduleRedraw();
    setActionsOpen(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    // تحريك الإصبع يعني تمريراً لا ضغطاً مطوّلاً
    if (longPress.current && pressStart.current) {
      const d = Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y);
      if (d > 10) cancelLongPress();
    }

    // سحب عنصر محدَّد (تحريك/تحجيم) — يسبق منطق الرسم
    if (dragRef.current) {
      e.preventDefault();
      const sel = selectedRef.current;
      const shape = sel ? shapes.current.find((x) => x.id === sel) : null;
      const pts = applyDrag(getPoint(e));
      if (shape && pts) {
        shape.points = pts;
        fullRedraw();
      }
      return;
    }

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

  /* تحويل رسمة حرّة إلى شكل مثالي.
     الإحداثيات مخزّنة نسبيّة (0..1)، لكن خوارزمية التعرّف تعمل بالبكسل
     (عتبتها الدنيا 8px)، فنحوّل ذهابًا وإيابًا. */
  /* مقابض التحجيم عند زوايا الإطار */
  function cornersOf(b: { x0: number; y0: number; x1: number; y1: number }) {
    return {
      nw: { x: b.x0, y: b.y0 }, ne: { x: b.x1, y: b.y0 },
      sw: { x: b.x0, y: b.y1 }, se: { x: b.x1, y: b.y1 },
    } as const;
  }

  /** أي مقبض تحت النقطة؟ tol بالبكسل يُحوّل إلى نسبي */
  function hitCorner(
    p: Point,
    b: { x0: number; y0: number; x1: number; y1: number },
    tolPx: number
  ): "nw" | "ne" | "sw" | "se" | null {
    const c = mainRef.current;
    const tx = tolPx / (c?.clientWidth || 1);
    const ty = tolPx / (c?.clientHeight || 1);
    for (const [k, pt] of Object.entries(cornersOf(b))) {
      if (Math.abs(p.x - pt.x) <= tx && Math.abs(p.y - pt.y) <= ty) {
        return k as "nw" | "ne" | "sw" | "se";
      }
    }
    return null;
  }

  /** يطبّق التحريك/التحجيم على نقاط الشكل انطلاقًا من الأصل */
  function applyDrag(p: Point): Point[] | null {
    const d = dragRef.current;
    if (!d) return null;
    if (d.mode === "move") {
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      return d.orig.map((q) => ({ x: q.x + dx, y: q.y + dy }));
    }
    // تحجيم: الزاوية المقابلة تبقى مثبّتة
    const { x0, y0, x1, y1 } = d.b;
    const anchor = {
      nw: { x: x1, y: y1 }, ne: { x: x0, y: y1 },
      sw: { x: x1, y: y0 }, se: { x: x0, y: y0 },
    }[d.corner || "se"];
    const w0 = x1 - x0, h0 = y1 - y0;
    if (w0 < 1e-6 || h0 < 1e-6) return null;
    const MIN = 0.01; // لا نسمح بانهيار الشكل إلى نقطة
    let sx = (p.x - anchor.x) / (d.corner === "nw" || d.corner === "sw" ? -w0 : w0);
    let sy = (p.y - anchor.y) / (d.corner === "nw" || d.corner === "ne" ? -h0 : h0);
    if (Math.abs(sx) < MIN) sx = sx < 0 ? -MIN : MIN;
    if (Math.abs(sy) < MIN) sy = sy < 0 ? -MIN : MIN;
    // الإشارة محسوبة أصلًا في المقام أعلاه — لا تُعكس مرّة ثانية
    return d.orig.map((q) => ({
      x: anchor.x + (q.x - anchor.x) * sx,
      y: anchor.y + (q.y - anchor.y) * sy,
    }));
  }

  function trySnap(s: Shape): Shape | null {
    const c = mainRef.current;
    if (!c) return null;
    const w = c.clientWidth || 1;
    const h = c.clientHeight || 1;
    const px = s.points.map((pt) => ({ x: pt.x * w, y: pt.y * h }));
    const r = recognize(px, { snapAngles: true });
    // المثلّث غير مدعوم في نموذج الأشكال الحالي — نترك الرسمة كما هي
    if (!r || r.type === "triangle") return null;

    const a = { x: r.x / w, y: r.y / h };
    const b = { x: (r.x + r.w) / w, y: (r.y + r.h) / h };
    return {
      id: `${user!.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uid: s.uid,
      kind: r.type as Kind,
      color: s.color,
      size: s.size,
      points: [a, b],
    };
  }

  /** استعادة الرسمة الحرّة بعد تحويل غير مرغوب */
  function undoSnap() {
    if (!snapUndo) return;
    const { shapedId, original } = snapUndo;
    setSnapUndo(null);
    // احذف الشكل المثالي
    shapes.current = shapes.current.filter((x) => x.id !== shapedId);
    drawnIds.current.delete(shapedId);
    remove(ref(rtdb, `${strokesPath}/${shapedId}`));
    // أعد الرسمة الأصلية
    commit(original);
    fullRedraw();
  }

  function onPointerUp() {
    cancelLongPress();

    // انتهاء سحب عنصر → احفظ الموضع الجديد مرّة واحدة
    if (dragRef.current) {
      dragRef.current = null;
      const sel = selectedRef.current;
      const shape = sel ? shapes.current.find((x) => x.id === sel) : null;
      if (shape) update(ref(rtdb, `${strokesPath}/${shape.id}`), { points: shape.points });
      return;
    }

    if (!drawing.current || !currentShape.current) return;
    drawing.current = false;
    const s = currentShape.current;
    currentShape.current = null;
    clearPreview();
    if (s.kind === "pen" || s.kind === "highlighter" || s.kind === "eraser") {
      // القلم فقط: حاول التعرّف على شكل مقصود قبل حفظ الرسمة الحرّة
      if (s.kind === "pen" && smartShapes && s.points.length >= 4) {
        const shaped = trySnap(s);
        if (shaped) {
          commit(shaped);
          fullRedraw();                 // امسح أثر الرسمة الحرّة من اللوحة الحيّة
          setSnapUndo({ shapedId: shaped.id, original: s });
          window.setTimeout(
            () => setSnapUndo((cur) => (cur && cur.shapedId === shaped.id ? null : cur)),
            2600
          );
          return;
        }
      }
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
    // الأستاذ ينقل الغرفة كلها. الطالب يتصفّح لنفسه فقط ويتوقّف عن
    // المتابعة تلقائياً — كان أي طالب ينقل الجميع، وهذا يُربك الحصة.
    if (!canDraw) {
      setActivePage(idx);
      setFollowing(false);
      return;
    }
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

  function pickTool(k: ToolId) {
    setTool(k);
    setStamp(null);
    stampRef.current = null; // مزامنة فوريّة — لا ننتظر إعادة الرسم
    toolRef.current = k;
    // مغادرة وضع الاختيار تُسقط التحديد حتى لا يبقى إطار معلّق
    if (k !== "select" && selectedRef.current) {
      setSelectedId(null);
      selectedRef.current = null;
      scheduleRedraw();
    }
  }

  return (
    <div className="flex h-full flex-col">

      <div
        ref={wrapRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#EDF0F5] p-1.5 sm:p-2"
      >
        {/* اللوح — نسبة ثابتة، موسّط، وما حوله هامش محايد بدل تمطيط المحتوى */}
        <div
          ref={boardRef}
          className="relative shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-black/5"
          style={{
            boxShadow: "0 1px 2px rgba(19,23,34,.05), 0 8px 24px rgba(19,23,34,.07)",
            ...(grid
              ? {
                  backgroundImage:
                    "linear-gradient(#e9ecf2 1px, transparent 1px), linear-gradient(90deg, #e9ecf2 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }
              : {}),
          }}
        >
          <canvas ref={mainRef} className="pointer-events-none absolute inset-0" />
        {/* شريط التحديد — يؤكّد للمستخدم ما التقطه، ويسهّل الإفلات.
            هذا هو المرساة التي ستُعلَّق عليها إجراءات الخطوة الثالثة. */}
        {selectedId && (() => {
          const shape = shapes.current.find((x) => x.id === selectedId);
          return (
            <div className="pointer-events-auto absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-surface px-3 py-1.5 shadow-glass">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="max-w-[45vw] truncate text-[11px] font-bold text-text-primary">
                {shape ? describeShape(shape) : "عنصر"}
              </span>
              <button
                onClick={() => setActionsOpen(true)}
                aria-label="إجراءات العنصر"
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary transition hover:bg-primary/20"
              >
                إجراءات
              </button>
              <button
                onClick={() => { setSelectedId(null); selectedRef.current = null; scheduleRedraw(); }}
                aria-label="إلغاء التحديد"
                className="grid h-5 w-5 place-items-center rounded-full text-text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })()}

        {/* تنبيه العلامة — يظهر ويختفي دون مقاطعة */}
        {toast && (
          <div
            className="bz-radial-in pointer-events-none absolute left-1/2 top-3 z-30 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 shadow-glass"
            style={{ background: `${tagInfo(toast.tag).color}1f`, border: `1px solid ${tagInfo(toast.tag).color}55` }}
          >
            <span className="text-sm leading-none">{tagInfo(toast.tag).emoji}</span>
            <span className="truncate text-[11px] font-bold" style={{ color: tagInfo(toast.tag).color }}>
              {tagInfo(toast.tag).label}
              {toast.text ? " — حُفظت في بطاقاتك" : ""}
            </span>
          </div>
        )}

        <ShapeActionsSheet
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          shape={shapes.current.find((x) => x.id === selectedId) ?? null}
          uid={user?.uid ?? ""}
          roomName={roomName}
          subject={subject}
          canDelete={canDraw}
          canMark={canDraw}
          currentTag={selectedId ? marks[selectedId]?.tag ?? null : null}
          onMark={(tag) => {
            if (!selectedId) return;
            const sh = shapes.current.find((x) => x.id === selectedId);
            if (tag === null) clearMark(roomId, activePage, selectedId);
            else setMark(roomId, activePage, selectedId, tag, sh?.text);
          }}
          onDelete={() => {
            if (!selectedId) return;
            remove(ref(rtdb, `${strokesPath}/${selectedId}`));
            setSelectedId(null);
            selectedRef.current = null;
            scheduleRedraw();
          }}
        />

        <canvas
          ref={previewRef}
          className={`absolute inset-0 ${canDraw || selecting ? "touch-none" : "pointer-events-none"}`}
          onPointerDown={canDraw || selecting ? onPointerDown : undefined}
          onPointerMove={canDraw || selecting ? onPointerMove : undefined}
          onPointerUp={canDraw || selecting ? onPointerUp : undefined}
          onPointerLeave={canDraw || selecting ? onPointerUp : undefined}
          onPointerCancel={canDraw || selecting ? onPointerUp : undefined}
          onContextMenu={canDraw || selecting ? onContextMenu : undefined}
        />
        </div>

        {/* لوحة الرموز الرياضية — سياقية، تظهر فوق الكونسول عند الطلب */}
        {symbolsOpen && canDraw && (
          <div
            className="pointer-events-auto absolute bottom-[64px] left-1/2 z-20 flex max-w-[calc(100%-20px)]
              -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border p-1.5"
            style={{
              background: "rgba(255,255,255,.98)",
              borderColor: "var(--bz-line-2)",
              boxShadow: "0 10px 28px rgba(19,23,34,.14)",
            }}
          >
            {SYMBOLS.map((sym) => (
              <button
                key={sym}
                onClick={() => setStamp((cur) => (cur === sym ? null : sym))}
                className={`grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-sm font-bold transition ${
                  stamp === sym
                    ? "text-white"
                    : "hover:bg-[var(--bz-blue-050)]"
                }`}
                style={stamp === sym ? { background: "var(--bz-blue)" } : { color: "var(--bz-ink)" }}
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* تحوّل شكل — شارة تراجع لثانيتين: الذكاء الذي لا يمكن رفضه إزعاج */}
        {snapUndo && (
          <div
            className="pointer-events-auto absolute bottom-[64px] left-1/2 z-30 flex -translate-x-1/2
              items-center gap-2 rounded-full border py-1 pe-1 ps-3 text-[11px] font-semibold shadow-lg"
            style={{
              background: "rgba(255,255,255,.98)",
              borderColor: "var(--bz-line-2)",
              color: "var(--bz-ink-2)",
            }}
          >
            <Icon name="check" size={13} style={{ color: "var(--bz-green)" }} />
            حُوّلت إلى شكل مثالي
            <button
              onClick={undoSnap}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95"
              style={{ background: "var(--bz-blue)" }}
            >
              تراجع
            </button>
          </div>
        )}

        {/* الطالب: عودة إلى صفحة الأستاذ */}
        {!canDraw && !following && (
          <button
            onClick={() => { setFollowing(true); setActivePage(teacherPage); }}
            className="pointer-events-auto absolute bottom-[64px] left-1/2 z-20 -translate-x-1/2 rounded-full
              px-3 py-1 text-[11px] font-bold text-white shadow-lg transition active:scale-95"
            style={{ background: "var(--bz-blue)" }}
          >
            عُد إلى صفحة الأستاذ ({teacherPage + 1})
          </button>
        )}

        {/* ══ الكونسول: شريط واحد يستبدل الشريطين العلويين وشريط الصفحات ══ */}
        <FloatingConsole>
          {/* المراحل — ثابتة */}
          <ConsoleZone>
            <ConsoleButton
              icon="chevRight" label="الصفحة السابقة"
              disabled={activePage === 0} onClick={() => gotoPage(activePage - 1)}
            />
            <StageIndicator count={pageCount} current={activePage} onSelect={gotoPage} />
            <ConsoleButton
              icon="chevLeft" label="الصفحة التالية"
              disabled={activePage >= pageCount - 1} onClick={() => gotoPage(activePage + 1)}
            />
            {canDraw && <ConsoleButton icon="plus" label="إضافة صفحة" onClick={addPage} />}
          </ConsoleZone>

          {/* الأدوات — تتبدّل بالسياق */}
          {canDraw && (
            <>
              <ConsoleDivider />
              <ConsoleZone scroll>
                {TOOLS.map((t) => (
                  <ConsoleButton
                    key={t.id} icon={TOOL_ICON[t.id]} label={t.label}
                    active={tool === t.id && !stamp} onClick={() => pickTool(t.id)}
                  />
                ))}
                <ConsoleButton
                  icon="sigma" label="رموز رياضية"
                  active={symbolsOpen} onClick={() => setSymbolsOpen((o) => !o)}
                />
                <ConsoleButton
                  icon="shapes"
                  label={smartShapes ? "تحويل الأشكال: مفعّل" : "تحويل الأشكال: معطّل — رسم حرّ"}
                  active={smartShapes}
                  onClick={() => setSmartShapes((v) => !v)}
                />
                <ConsoleDivider />
                {COLORS.map((c) => (
                  <ConsoleSwatch
                    key={c} color={c} label="لون القلم" active={color === c}
                    onClick={() => { setColor(c); if (tool === "eraser") pickTool("pen"); }}
                  />
                ))}
                <ConsoleDivider />
                {SIZES.map((sz) => (
                  <button
                    key={sz} onClick={() => setSize(sz)} title={`سماكة ${sz}`} aria-label={`سماكة ${sz}`}
                    className="grid h-[30px] w-[26px] shrink-0 place-items-center rounded-lg transition
                      hover:bg-[var(--bz-blue-050)]"
                  >
                    <span
                      className="block rounded-full"
                      style={{
                        width: sz + 6, height: sz + 2,
                        background: size === sz ? "var(--bz-blue)" : "var(--bz-ink-3)",
                      }}
                    />
                  </button>
                ))}
              </ConsoleZone>
            </>
          )}

          {/* اللوح — ثابتة */}
          <ConsoleDivider />
          <ConsoleZone>
            <ConsoleButton icon="grid" label="شبكة" active={grid} onClick={() => setGrid((g) => !g)} />
            {canDraw && (
              <>
                <ConsoleButton icon="undo" label="تراجع" onClick={undo} />
                <ConsoleButton icon="redo" label="إعادة" onClick={redo} />
                <ConsoleButton icon="trash" label="مسح اللوح" onClick={clearAll} />
              </>
            )}
          </ConsoleZone>
        </FloatingConsole>
      </div>

    </div>
  );
}

