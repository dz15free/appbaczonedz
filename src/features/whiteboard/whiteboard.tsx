"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { pickShape, boundsOf, describeShape, type Bounds } from "@/features/whiteboard/shape-geometry";
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
  FloatingConsole, ConsoleZone, ConsoleDivider, ConsoleButton, ContextBar, ContextButton,
  ConsoleSwatch, StageIndicator,
} from "@/components/ui/console";

import {
  faPen,
  faHighlighter,
  faSlash,
  faArrowRight,
  faSquare,
  faCircle,
  faFont,
  faEraser,
  faArrowPointer,
  faNoteSticky,
} from "@fortawesome/free-solid-svg-icons";
import { recognize } from "@/features/whiteboard/smart/recognize";
import { FORMULA_GROUPS, formulaGroup, type FormulaGroupId } from "@/features/whiteboard/formula-palette";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

interface Point {
  x: number;
  y: number;
}
type Kind = "pen" | "highlighter" | "line" | "arrow" | "rect" | "ellipse" | "text" | "note" | "eraser";
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
  rect: "مستطيل", ellipse: "دائرة", text: "نصّ", note: "بطاقة", eraser: "ممحاة",
};

const TOOL_ICON: Record<ToolId, IconName> = {
  select: "cursor", pen: "pen", highlighter: "marker", line: "line",
  arrow: "arrow", rect: "square", ellipse: "circle", text: "text", note: "note", eraser: "eraser",
};

const COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6"];
const SIZES = [2, 4, 8];

/* مقاسات النصّ منفصلة عن سماكة القلم عمداً.
   كان النصّ يستعمل سماكة القلم (2/4/8) وتُضرب في 8 → 16 و32 و64 بكسل.
   64 بكسل يملأ ثلث اللوح بكلمة واحدة، وهو ما جعل النصّ يظهر ضخماً.
   القيم هنا تُعطي 14 · 18 · 24 · 34 بكسل، والافتراضي 18 — مقاس قراءة
   حقيقي على اللوح. */
/* ── ألوان البطاقة اللاصقة ──
   ليست ألواناً للزينة: كل لون يحمل معنى ثابتاً في نظام BacZone، فيتعلّم
   الطالب قراءة اللوح بلمحة. الكهرماني أوّلاً لأنّه لون «ما يخصّ الطالب»
   في التصميم كلّه، وهو الأشيع في الالتقاط. */
const NOTE_COLORS: { bg: string; ink: string; label: string }[] = [
  { bg: "#FDF4E7", ink: "#8A5A12", label: "للحفظ" },
  { bg: "#EDF2FE", ink: "#1A3FB0", label: "فكرة" },
  { bg: "#FDEEED", ink: "#A3322B", label: "خطأ شائع" },
  { bg: "#EAF6F1", ink: "#146344", label: "خلاصة" },
];

const TEXT_SIZES = [1.75, 2.25, 3, 4.25];
const TEXT_SIZE_LABEL = ["صغير", "عادي", "كبير", "عنوان"];
/* نسبة اللوح الثابتة.
   كانت اللوحة تأخذ شكل الحاوية أيًّا كان، والإحداثيات محفوظة نسبيّة (0..1) —
   فالدائرة المرسومة على الحاسوب (نسبة ١٫٦٧) تصل الهاتف (نسبة ٠٫٥٨) بيضاويّةً
   ممطوطة، والكتابة تبدو طويلة. الآن اللوح يحتفظ بنسبة واحدة على كل الأجهزة
   ويُوسَّط داخل المساحة المتاحة، فما يراه الأستاذ هو ما يراه الطالب بالضبط. */
const BOARD_AR = 16 / 10;

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
  { id: "note", icon: faNoteSticky, label: "بطاقة لاصقة" },
  { id: "eraser", icon: faEraser, label: "ممحاة" },
];

export function Whiteboard({ roomId, canDraw = true, roomName, subject, consoleExtras }: {
  roomId: string; canDraw?: boolean; roomName?: string; subject?: string | null;
  /* منطقة إضافية تُحقن في كونسول اللوح من صفحة الغرفة.
     الكونسول واحد في التصميم: اللوح يملكه، والغرفة تُسلّمه منطقتها،
     فلا يُبنى كونسولان فوق بعضهما. اختيارية — القيمة الغائبة لا تُصيّر شيئاً. */
  consoleExtras?: ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
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
  const [formulaGroupId, setFormulaGroupId] = useState<FormulaGroupId>("math");
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
    } else if (s.kind === "note" && s.text) {
      /* بطاقة لاصقة: مستطيل ملوّن + نصّ ملفوف.
         نلفّ الكلمات يدوياً لأنّ الكانفاس لا يلفّ النصّ تلقائياً —
         بدونه تخرج البطاقة الطويلة عن حافّة اللوح. */
      const a = P(pts[0]);
      const k = dpr();
      const px = Math.max(11, s.size * 7) * k;
      const padX = 9 * k, padY = 8 * k;
      const maxW = 190 * k;
      ctx.font = `600 ${px}px system-ui, sans-serif`;
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      const words = s.text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(t).width > maxW - padX * 2 && cur) { lines.push(cur); cur = w; }
        else cur = t;
      }
      if (cur) lines.push(cur);
      const lh = px * 1.45;
      const boxW = maxW;
      const boxH = lines.length * lh + padY * 2;
      const ink = NOTE_COLORS.find((c) => c.bg === s.color)?.ink ?? "#333";
      // ظلّ خفيف يرفع البطاقة عن اللوح
      ctx.save();
      ctx.shadowColor = "rgba(19,23,34,.14)";
      ctx.shadowBlur = 8 * k;
      ctx.shadowOffsetY = 2 * k;
      ctx.fillStyle = s.color;
      const rr = 6 * k;
      ctx.beginPath();
      ctx.moveTo(a.x - boxW + rr, a.y);
      ctx.arcTo(a.x, a.y, a.x, a.y + boxH, rr);
      ctx.arcTo(a.x, a.y + boxH, a.x - boxW, a.y + boxH, rr);
      ctx.arcTo(a.x - boxW, a.y + boxH, a.x - boxW, a.y, rr);
      ctx.arcTo(a.x - boxW, a.y, a.x, a.y, rr);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = ink;
      lines.forEach((ln, i) => ctx.fillText(ln, a.x - padX, a.y + padY + i * lh));
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
      // شارة ملوّنة + التسمية بالأبيض بدل الرمز التعبيري — نفس لغة لسان النوع
      const mfs = 11 * dprv;
      ctx.font = `600 ${mfs}px system-ui, sans-serif`;
      ctx.direction = "rtl";
      ctx.textBaseline = "middle";
      const mPadX = 6 * dprv;
      const mTw = ctx.measureText(info.label).width + mPadX * 2;
      const mTh = 16 * dprv;
      const mTx = mb.x1 * w - mTw;
      const mTy = Math.max(mb.y0 * h - mTh - 3 * dprv, 0);
      const mRr = 4 * dprv;
      ctx.beginPath();
      ctx.moveTo(mTx + mRr, mTy);
      ctx.arcTo(mTx + mTw, mTy, mTx + mTw, mTy + mTh, mRr);
      ctx.arcTo(mTx + mTw, mTy + mTh, mTx, mTy + mTh, mRr);
      ctx.arcTo(mTx, mTy + mTh, mTx, mTy, mRr);
      ctx.arcTo(mTx, mTy, mTx + mTw, mTy, mRr);
      ctx.closePath();
      ctx.fillStyle = info.color;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "right";
      ctx.fillText(info.label, mTx + mTw - mPadX, mTy + mTh / 2);
      ctx.restore();
    }

    // ── إطار التحديد أثناء السحب ──
    if (marquee.current) {
      const { a, b } = marquee.current;
      const w = canvas.width, h = canvas.height;
      const k = window.devicePixelRatio || 1;
      const X = Math.min(a.x, b.x) * w, Y = Math.min(a.y, b.y) * h;
      const W = Math.abs(b.x - a.x) * w, H = Math.abs(b.y - a.y) * h;
      ctx.save();
      ctx.fillStyle = "rgba(35,80,217,.08)";
      ctx.fillRect(X, Y, W, H);
      ctx.strokeStyle = "#2350D9";
      ctx.lineWidth = 1.5 * k;
      ctx.setLineDash([5 * k, 4 * k]);
      ctx.strokeRect(X, Y, W, H);
      ctx.restore();
    }

    // ── الإطار الجامع للعناصر المحدَّدة بالإطار ──
    if (multiRef.current.size > 0) {
      const mb2 = multiBounds();
      if (mb2) {
        const w = canvas.width, h = canvas.height;
        const k = window.devicePixelRatio || 1;
        const pad = 6 * k;
        const X = mb2.x0 * w - pad, Y = mb2.y0 * h - pad;
        const W = (mb2.x1 - mb2.x0) * w + pad * 2, H = (mb2.y1 - mb2.y0) * h + pad * 2;
        ctx.save();
        ctx.fillStyle = "rgba(35,80,217,.05)";
        ctx.fillRect(X, Y, W, H);
        ctx.strokeStyle = "rgba(35,80,217,.55)";
        ctx.lineWidth = 1.5 * k;
        ctx.strokeRect(X, Y, W, H);
        // شارة العدد — تؤكّد للمستخدم كم عنصراً التقط الإطار
        const lbl = `${multiRef.current.size} عنصراً`;
        ctx.font = `600 ${11 * k}px system-ui, sans-serif`;
        ctx.direction = "rtl";
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        const tw = ctx.measureText(lbl).width + 12 * k;
        const th = 17 * k;
        const tx = X + W - tw, ty = Math.max(Y - th - 3 * k, 0);
        ctx.fillStyle = "#2350D9";
        ctx.beginPath();
        const rr = 4 * k;
        ctx.moveTo(tx + rr, ty);
        ctx.arcTo(tx + tw, ty, tx + tw, ty + th, rr);
        ctx.arcTo(tx + tw, ty + th, tx, ty + th, rr);
        ctx.arcTo(tx, ty + th, tx, ty, rr);
        ctx.arcTo(tx, ty, tx + tw, ty, rr);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(lbl, tx + tw - 6 * k, ty + th / 2);
        ctx.restore();
      }
    }

    // إطار العنصر المحدَّد — يُرسم هنا لا على طبقة منفصلة، فيبقى
    // ظاهراً بعد أي إعادة رسم أو تغيير حجم دون منطق إضافي
    const sel = selectedRef.current;
    if (sel) {
      const shape = shapes.current.find((x) => x.id === sel);
      const b = shape ? boundsOf(shape) : null;
      // التضييق داخل العامل الثلاثي أعلاه لا يمتدّ إلى هذه الكتلة،
      // ولسان النوع أدناه يحتاج shape مؤكَّد الوجود.
      if (shape && b) {
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
    return () => { if (typeof unsub === "function") unsub(); seenMarks.current = new Set(); };
  }, [roomId, activePage, scheduleRedraw]);

  // ما حُفظ سابقاً في حساب الطالب — يمنع تكرار البطاقة نفسها
  useEffect(() => {
    if (!user || canDraw) return;
    const unsub = listenSavedMarks(user.uid, roomId, (ids) => { savedMarks.current = ids; });
    return () => { if (typeof unsub === "function") unsub(); };
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
          back: `${info.label}${roomName ? ` — ${roomName}` : ""}`,
          subject: subject || "general",
          source: roomName ? `سبورة ${roomName}` : "السبورة",
        }).then(() => recordMarkSaved(user.uid, roomId, shapeId)).catch(() => {});
      }
    }
  }, [marks, canDraw, user, roomId, roomName, subject]);

  /* ── إجراءات العنصر ──
     مشتركة بين الشريط السياقي واختصارات لوحة المفاتيح، فلا يتفرّق
     السلوكان: الحذف بالزرّ هو الحذف بـ Delete حرفياً. */

  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const deleteShape = useCallback((id: string) => {
    if (!canDrawRef.current) return;
    shapes.current = shapes.current.filter((x) => x.id !== id);
    drawnIds.current.delete(id);
    remove(ref(rtdb, `${strokesPath}/${id}`));
    setSelectedId(null);
    selectedRef.current = null;
    fullRedraw();
  }, [strokesPath, fullRedraw]);

  const duplicateShape = useCallback((src: Shape) => {
    if (!canDrawRef.current || !user) return;
    const OFF = 0.02;
    const copy: Shape = {
      ...src,
      id: `${user.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uid: user.uid,
      points: src.points.map((q) => ({ x: q.x + OFF, y: q.y + OFF })),
    };
    commit(copy);
    setSelectedId(copy.id);
    selectedRef.current = copy.id;
    fullRedraw();
  }, [user, fullRedraw]);

  /* الحفظ كبطاقة مراجعة — الإجراء الأشيع للطالب، فصار ضغطة واحدة.
     نُعلّم المعرّف محليّاً حتى لا يُنشئ الطالب نسختين بضغطتين متتاليتين. */
  /* ── Math Write: من خطّ اليد إلى معادلة ──
     نقصّ **مستطيل التحديد وحده** من لوح الرسم (لا اللوح كلّه): أخفّ على
     شبكة الطالب وأدقّ في القراءة. ثم نُرسله إلى Gemini ونضع الناتج
     كعنصر معادلة أسفل ما كُتب بخطّ اليد — كما في المرجع الذي أرسلته. */
  const [mathBusy, setMathBusy] = useState(false);

  /* اللوح يرسم النصّ بـ fillText، وهو لا يفهم LaTeX. فبدل أن تظهر
     المعادلة حرفياً `x^{2}` نحوّل الشائع منها إلى رموز يونيكود حقيقية،
     فتُقرأ رياضياً على اللوح فوراً.
     النصّ الأصلي بصيغة LaTeX يبقى محفوظاً في الحقل `text` للعرض
     المنسّق لاحقاً في الملاحظات وبطاقات المراجعة عبر KaTeX. */
  function latexToUnicode(x: string): string {
    const SUP: Record<string, string> = {
      "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
      "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
      "+": "⁺", "-": "⁻", n: "ⁿ", i: "ⁱ",
    };
    const SUB: Record<string, string> = {
      "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
      "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    };
    let t = x;
    t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
    t = t.replace(/\^\{([^{}]+)\}/g, (_m, g: string) =>
      [...g].map((ch) => SUP[ch] ?? `^${ch}`).join(""));
    t = t.replace(/\^(\w)/g, (_m, g: string) => SUP[g] ?? `^${g}`);
    t = t.replace(/_\{([^{}]+)\}/g, (_m, g: string) =>
      [...g].map((ch) => SUB[ch] ?? `_${ch}`).join(""));
    t = t.replace(/_(\w)/g, (_m, g: string) => SUB[g] ?? `_${g}`);
    const SYM: [RegExp, string][] = [
      [/\\times/g, "×"], [/\\div/g, "÷"], [/\\pm/g, "±"],
      [/\\leq/g, "≤"], [/\\geq/g, "≥"], [/\\neq/g, "≠"],
      [/\\approx/g, "≈"], [/\\infty/g, "∞"], [/\\int/g, "∫"],
      [/\\sum/g, "∑"], [/\\prod/g, "∏"], [/\\partial/g, "∂"],
      [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\theta/g, "θ"],
      [/\\lambda/g, "λ"], [/\\mu/g, "μ"], [/\\pi/g, "π"],
      [/\\Delta/g, "Δ"], [/\\Omega/g, "Ω"], [/\\rightarrow/g, "→"],
      [/\\cdot/g, "·"], [/\\ln/g, "ln"], [/\\log/g, "log"], [/\\lim/g, "lim"],
    ];
    for (const [re, ch] of SYM) t = t.replace(re, ch);
    return t.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }

  async function mathWrite() {
    if (mathBusy || multiRef.current.size === 0) return;
    const b = multiBounds();
    const src = mainRef.current;   // الطبقة المثبّتة: كل ما رُسم فعلاً
    if (!b || !src) return;

    setMathBusy(true);
    try {
      const pad = 10;
      const x = Math.max(0, b.x0 * src.width - pad);
      const y = Math.max(0, b.y0 * src.height - pad);
      const w = Math.min(src.width - x, (b.x1 - b.x0) * src.width + pad * 2);
      const h = Math.min(src.height - y, (b.y1 - b.y0) * src.height + pad * 2);
      if (w < 8 || h < 8) return;

      const cut = document.createElement("canvas");
      cut.width = Math.round(w);
      cut.height = Math.round(h);
      const cx = cut.getContext("2d");
      if (!cx) return;
      // خلفية بيضاء: اللوح شفّاف، والنموذج يقرأ الخطّ الداكن أفضل على أبيض
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, cut.width, cut.height);
      cx.drawImage(src, x, y, w, h, 0, 0, cut.width, cut.height);

      const res = await fetch("/api/ocr-math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: cut.toDataURL("image/png") }),
      });
      const data = (await res.json()) as { latex?: string; error?: string };
      if (!res.ok || !data.latex) {
        setToast({ tag: "mistake", text: data.error ?? "تعذّر التعرّف" });
        return;
      }
      // تُوضع أسفل خطّ اليد مباشرة، فيرى الطالب الأصل والنتيجة معاً
      const sh = newShape("text", { x: b.x0, y: Math.min(b.y1 + 0.02, 0.97) }, latexToUnicode(data.latex));
      sh.size = TEXT_SIZES[1];
      sh.color = "#2350D9";   // المعادلة المُستخرَجة بالأزرق لتُميَّز عن خطّ اليد
      commit(sh);
      clearMulti();
      fullRedraw();
    } catch {
      setToast({ tag: "mistake", text: "تعذّر الاتصال" });
    } finally {
      setMathBusy(false);
    }
  }

  /** حذف كل ما التقطه الإطار — كتابة واحدة لكل عنصر ثم إعادة رسم واحدة */
  function deleteMulti() {
    if (!canDrawRef.current || multiRef.current.size === 0) return;
    for (const id of multiRef.current) {
      drawnIds.current.delete(id);
      remove(ref(rtdb, `${strokesPath}/${id}`));
    }
    shapes.current = shapes.current.filter((x) => !multiRef.current.has(x.id));
    clearMulti();
    fullRedraw();
  }

  /** وسم كل ما التقطه الإطار — هذا جوهر طلبه: أحدّد معادلة كاملة ثم أعلّمها مهمّة */
  function markMulti(tag: MarkTag) {
    if (!canDrawRef.current || multiRef.current.size === 0) return;
    for (const id of multiRef.current) {
      const sh = shapes.current.find((x) => x.id === id);
      setMark(roomId, activePage, id, tag, sh?.text);
    }
    clearMulti();
    fullRedraw();
  }

  const captureCard = useCallback((shape: Shape) => {
    if (!user) return;
    if (savedIds.has(shape.id)) return;
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(shape.id);
      return next;
    });
    void saveFlashcard({
      uid: user.uid,
      front: describeShape(shape),
      back: shape.text?.trim() || describeShape(shape),
      subject: subject ?? undefined,
      source: roomName ? `غرفة ${roomName}` : undefined,
    }).catch(() => {
      // فشل الحفظ يعيد الحالة حتى يستطيع الطالب المحاولة ثانية
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(shape.id);
        return next;
      });
    });
  }, [user, savedIds, subject, roomName]);

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
        deleteShape(selectedId);
        return;
      }

      // تكرار العنصر المحدَّد بإزاحة صغيرة
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const src = shapes.current.find((x) => x.id === selectedId);
        if (!src) return;
        duplicateShape(src);
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
    return () => { if (typeof unsub === "function") unsub(); };
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
    return () => { if (typeof unsub === "function") unsub(); };
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

      // فراغ → نبدأ إطار تحديد بدل أن نكتفي بإلغاء التحديد
      if (!hit) {
        clearMulti();
        marquee.current = { a: p, b: p };
      }

      setSelectedId(hit ? hit.id : null);
      selectedRef.current = hit ? hit.id : null;
      if (hit) clearMulti();
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
    if (t === "text" || t === "note") {
      setEditor({ x: p.x, y: p.y, value: "", note: t === "note" });
      // نؤجّل التركيز دورة: الحقل لم يُصيَّر بعد
      setTimeout(() => editorInput.current?.focus(), 0);
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
    if (marquee.current) {
      e.preventDefault();
      marquee.current.b = getPoint(e);
      fullRedraw();
      return;
    }

    if (dragRef.current) {
      e.preventDefault();
      const sel = selectedRef.current;
      const shape = sel ? shapes.current.find((x) => x.id === sel) : null;
      const pts = applyDrag(getPoint(e));
      if (shape && pts) {
        shape.points = pts;
        fullRedraw();
        streamDrag(shape);
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
  /* ── بثّ التحريك أثناء السحب ──
     كان الموضع يُكتب **عند الإفلات فقط**، فيرى الطلاب العنصر يقفز إلى
     مكانه الجديد بدل أن يتحرّك. الآن نبثّ أثناء السحب.

     لماذا خنق 80ms وليس كل حركة: مؤشّر الفأرة يُطلق ~120 حدثاً في
     الثانية، وكل واحد كتابة في قاعدة البيانات — ذلك يستهلك حصّة Spark
     المجانية في دقائق. 80ms = ~12 كتابة/ثانية، وهي أنعم من معدّل
     تحديث العين ولا تُرهق الحصّة.

     نكتب `points` وحدها (كتابة على مستوى الحقل) فلا نمسّ بقيّة العنصر. */
  const dragBeat = useRef(0);

  /* ── محرّر النصّ على اللوح ──
     كان النصّ يُكتب في `window.prompt` — نافذة نظام تقطع الشرح، ولا
     ترى فيها أين سيقع النصّ ولا بأيّ مقاس. الآن حقل يظهر **في مكانه
     على اللوح** بنفس الخطّ والمقاس واللون، فما تكتبه هو ما تراه. */
  const [editor, setEditor] = useState<{ x: number; y: number; value: string; note?: boolean } | null>(null);
  const [textSize, setTextSize] = useState(TEXT_SIZES[1]);
  const [noteColor, setNoteColor] = useState(0);
  const noteColorRef = useRef(noteColor);
  noteColorRef.current = noteColor;
  const textSizeRef = useRef(textSize);
  textSizeRef.current = textSize;
  const editorInput = useRef<HTMLInputElement>(null);

  /* ── التحديد بإطار (marquee) ──
     «أرسم معادلة فأحدّدها كاملة عبر إطار يغطّيها».
     المعادلة المكتوبة بخطّ اليد ليست عنصراً واحداً بل عشرات الضربات؛
     النقر يلتقط ضربة واحدة فقط. الإطار يلتقطها كلّها.

     نختار كل عنصر **يتقاطع** مع الإطار لا الذي يقع داخله بالكامل:
     ذيل الحرف أو امتداد الأس كثيراً ما يخرج قليلاً عن الإطار الذي
     يرسمه المستخدم بسرعة، والاشتراط الصارم كان سيُسقطه. */
  const marquee = useRef<{ a: Point; b: Point } | null>(null);
  const multiRef = useRef<Set<string>>(new Set());
  const [multiCount, setMultiCount] = useState(0);

  function clearMulti() {
    if (multiRef.current.size === 0) return;
    multiRef.current = new Set();
    setMultiCount(0);
  }

  /** الإطار الجامع لكل العناصر المحدَّدة — يُستعمل للرسم وللإجراءات */
  function multiBounds(): Bounds | null {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0, found = false;
    for (const id of multiRef.current) {
      const sh = shapes.current.find((x) => x.id === id);
      const b = sh ? boundsOf(sh) : null;
      if (!b) continue;
      found = true;
      x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
      x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
    }
    return found ? { x0, y0, x1, y1 } : null;
  }

  function streamDrag(shape: Shape) {
    const now = Date.now();
    if (now - dragBeat.current < 80) return;
    dragBeat.current = now;
    update(ref(rtdb, `${strokesPath}/${shape.id}`), { points: shape.points });
  }

  /* تثبيت ما كُتب في الحقل — نصّاً عادياً أو بطاقة لاصقة.
     البطاقة تُحفظ فوراً في بطاقات المراجعة، وهذا نصّ طلبه:
     «هاته البطاقات هي من تضاف كبطاقات مراجعة». */
  function commitTyped(v: string, ed: { x: number; y: number; note?: boolean }) {
    if (ed.note) {
      const c = NOTE_COLORS[noteColorRef.current] ?? NOTE_COLORS[0];
      const sh = newShape("note", { x: ed.x, y: ed.y }, v);
      sh.color = c.bg;
      sh.size = textSizeRef.current;
      commit(sh);
      if (user) {
        void saveFlashcard({
          uid: user.uid,
          front: c.label,
          back: v,
          subject: subject ?? undefined,
          source: roomName ? `غرفة ${roomName}` : undefined,
        }).catch(() => {});
      }
      return;
    }
    const sh = newShape("text", { x: ed.x, y: ed.y }, v);
    sh.size = textSizeRef.current;
    commit(sh);
  }

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

    // إغلاق إطار التحديد → التقاط كل عنصر يتقاطع معه
    if (marquee.current) {
      const { a, b } = marquee.current;
      marquee.current = null;
      const r = {
        x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y),
        x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y),
      };
      // إطار أصغر من 1.5% يعني نقرة لا سحباً — لا نُحوّلها إلى تحديد
      if (r.x1 - r.x0 > 0.015 || r.y1 - r.y0 > 0.015) {
        const picked = new Set<string>();
        for (const sh of shapes.current) {
          const sb = boundsOf(sh);
          if (!sb) continue;
          const overlaps = sb.x0 <= r.x1 && sb.x1 >= r.x0 && sb.y0 <= r.y1 && sb.y1 >= r.y0;
          if (overlaps) picked.add(sh.id);
        }
        multiRef.current = picked;
        setMultiCount(picked.size);
        setSelectedId(null);
        selectedRef.current = null;
      }
      fullRedraw();
      return;
    }

    // انتهاء سحب عنصر → احفظ الموضع الجديد مرّة واحدة
    if (dragRef.current) {
      dragRef.current = null;
      const sel = selectedRef.current;
      const shape = sel ? shapes.current.find((x) => x.id === sel) : null;
      // كتابة أخيرة مضمونة: آخر حركة قد تكون سقطت داخل نافذة الخنق
      if (shape) {
        dragBeat.current = 0;
        update(ref(rtdb, `${strokesPath}/${shape.id}`), { points: shape.points });
      }
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
        className="bz-stage relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-3"
      >
        {/* اللوح — نسبة ثابتة، موسّط، وما حوله هامش محايد بدل تمطيط المحتوى */}
        <div
          ref={boardRef}
          className="bz-board relative shrink-0 overflow-hidden rounded-xl bg-white"
          style={{
            boxShadow:
              "0 0 0 1px rgba(19,23,34,.07), 0 1px 3px rgba(19,23,34,.05), 0 12px 32px -8px rgba(19,23,34,.14)",
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
        {/* ══ الشريط السياقي ══
            كان شريط تحديد في أعلى اللوح يحمل زرّ «إجراءات» يفتح درجاً.
            صار شريط إجراءات حقيقياً فوق الرصيف مباشرة: الإجراء الأشيع
            (الحفظ كبطاقة) صار ضغطة واحدة بدل ضغطتين، وموضعه قرب الإبهام
            لا في أبعد نقطة عنه. */}
        {/* شريط سياقي للتحديد بالإطار — إجراءات تُطبَّق على المجموعة كلّها */}
        {multiCount > 0 && (
          <ContextBar label={`${multiCount} عنصراً محدَّداً`} onClose={() => { clearMulti(); fullRedraw(); }}>
            {canDraw && (
              <>
                <ContextButton icon="target" label="مهم" tone="red" onClick={() => markMulti("important")} />
                <ContextButton icon="star" label="للحفظ" tone="amber" onClick={() => markMulti("memorize")} />
                <ContextButton
                  icon="sigma"
                  label={mathBusy ? "..." : "معادلة"}
                  tone="primary"
                  disabled={mathBusy}
                  onClick={mathWrite}
                />
                <ContextButton icon="trash" label="حذف" tone="red" onClick={deleteMulti} />
              </>
            )}
          </ContextBar>
        )}

        {selectedId && (() => {
          const shape = shapes.current.find((x) => x.id === selectedId);
          if (!shape) return null;
          const tag = marks[selectedId]?.tag ?? null;
          return (
            <ContextBar
              label={describeShape(shape)}
              onClose={() => { setSelectedId(null); selectedRef.current = null; scheduleRedraw(); }}
            >
              <ContextButton
                icon="star"
                label={savedIds.has(selectedId) ? "محفوظة" : "بطاقة"}
                tone="amber"
                disabled={savedIds.has(selectedId)}
                onClick={() => captureCard(shape)}
              />
              {canDraw && (
                <ContextButton
                  icon="target"
                  label={tag ? tagInfo(tag).label : "علّم"}
                  tone={tag ? "red" : "default"}
                  onClick={() => setActionsOpen(true)}
                />
              )}
              {/* كان يفتح درج «علّم» نفسه — زرّان بفعل واحد. الآن يسأل فعلاً.
                  ويُعطَّل على الرسم الخالص لأنّ الخبّاشة تحتاج نصّاً. */}
              <ContextButton
                icon="ai"
                label="اسأل"
                disabled={!shape.text?.trim()}
                onClick={() => {
                  const t = shape.text?.trim();
                  if (t) router.push(`/aibot?q=${encodeURIComponent(`اشرح لي هذا: ${t}`)}`);
                }}
              />
              {canDraw && (
                <ContextButton
                  icon="copy"
                  label="تكرار"
                  onClick={() => duplicateShape(shape)}
                />
              )}
              {canDraw && (
                <ContextButton
                  icon="trash"
                  label="حذف"
                  tone="red"
                  onClick={() => deleteShape(selectedId)}
                />
              )}
              <ContextButton icon="more" label="المزيد" onClick={() => setActionsOpen(true)} />
            </ContextBar>
          );
        })()}

        {/* تنبيه العلامة — يظهر ويختفي دون مقاطعة */}
        {toast && (
          <div
            className="bz-radial-in pointer-events-none absolute left-1/2 top-3 z-30 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 shadow-glass"
            style={{ background: `${tagInfo(toast.tag).color}1f`, border: `1px solid ${tagInfo(toast.tag).color}55` }}
          >
            <Icon name={tagInfo(toast.tag).icon} size={14} style={{ color: tagInfo(toast.tag).color }} />
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

        {/* ── محرّر النصّ في مكانه على اللوح ──
            موضعه بالنِّسَب (%) لا بالبكسل: اللوح يتغيّر حجمه مع النافذة،
            والنسبة تُبقي الحقل مثبّتاً على النقطة نفسها من اللوح. */}
        {editor && canDraw && (
          <input
            ref={editorInput}
            value={editor.value}
            onChange={(e) => setEditor({ ...editor, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = editor.value.trim();
                if (v) commitTyped(v, editor);
                setEditor(null);
              } else if (e.key === "Escape") {
                setEditor(null);
              }
              e.stopPropagation();
            }}
            onBlur={() => {
              const v = editor.value.trim();
              if (v) commitTyped(v, editor);
              setEditor(null);
            }}
            dir="auto"
            placeholder="اكتب ثم Enter"
            className="absolute z-30 min-w-[120px] rounded-md border-2 bg-white/95 px-1.5 py-0.5 font-bold outline-none"
            style={{
              left: `${editor.x * 100}%`,
              top: `${editor.y * 100}%`,
              borderColor: "var(--bz-blue)",
              color: colorRef.current,
              fontSize: `${textSize * 8}px`,
              lineHeight: 1.2,
              maxWidth: `calc(100% - ${editor.x * 100}% - 8px)`,
            }}
          />
        )}
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
            {/* تبويبات المواد — تُظهر رموز المادّة الحالية فقط */}
            <div className="mb-1 flex w-full shrink-0 items-center gap-1 border-b border-[var(--bz-line)] pb-1">
              {FORMULA_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setFormulaGroupId(g.id)}
                  aria-pressed={formulaGroupId === g.id}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                    formulaGroupId === g.id
                      ? "bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
                      : "text-[var(--bz-ink-3)] hover:bg-[var(--bz-canvas)]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="bz-noscroll flex max-h-[104px] w-full flex-wrap items-center justify-center gap-1 overflow-y-auto">
              {formulaGroup(formulaGroupId).symbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setStamp((cur) => (cur === sym ? null : sym))}
                  title={`ختم الرمز ${sym}`}
                  className={`grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-sm font-bold transition ${
                    stamp === sym ? "text-white" : "hover:bg-[var(--bz-blue-050)]"
                  }`}
                  style={stamp === sym ? { background: "var(--bz-blue)" } : { color: "var(--bz-ink)" }}
                >
                  {sym}
                </button>
              ))}
            </div>
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

        {/* ══ متابعة الأستاذ ══
            «إذا الأستاذ انتقل، الطالب ينتقل معه — لكن يمكنه إيقاف ذلك».
            كان الإيقاف **ضمنياً** فقط: يحدث حين يتصفّح الطالب صفحة أخرى،
            ولا مؤشّر يقول له إنّه متابع أصلاً. صار مفتاحاً صريحاً يعرض
            الحالة دائماً، فيعرف الطالب لماذا تقفز الصفحة تحته. */}
        {!canDraw && (
          <button
            onClick={() => {
              if (following) { setFollowing(false); return; }
              setFollowing(true);
              setActivePage(teacherPage);
            }}
            aria-pressed={following}
            title={following ? "أنت تتابع صفحة الأستاذ — اضغط للتصفّح بحرّية" : "عُد إلى صفحة الأستاذ وتابعه"}
            className="pointer-events-auto absolute bottom-[64px] left-1/2 z-20 flex -translate-x-1/2
              items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold shadow-lg
              transition active:scale-95"
            style={
              following
                ? { background: "var(--bz-surface, #fff)", borderColor: "var(--bz-line)", color: "var(--bz-ink-2)" }
                : { background: "var(--bz-blue)", borderColor: "var(--bz-blue)", color: "#fff" }
            }
          >
            <Icon name={following ? "eye" : "target"} size={12} />
            {following
              ? `تتابع الأستاذ (${teacherPage + 1})`
              : `عُد إلى صفحة الأستاذ (${teacherPage + 1})`}
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

                {/* ألوان البطاقة اللاصقة — كل لون معنى لا زينة */}
                {tool === "note" &&
                  NOTE_COLORS.map((c, i) => (
                    <button
                      key={c.bg}
                      onClick={() => setNoteColor(i)}
                      title={`بطاقة: ${c.label}`}
                      aria-label={`بطاقة: ${c.label}`}
                      aria-pressed={noteColor === i}
                      className="grid h-[30px] w-[26px] shrink-0 place-items-center rounded-lg transition hover:bg-[var(--bz-blue-050)]"
                    >
                      <span
                        className="block h-[18px] w-[18px] rounded-[5px]"
                        style={{
                          background: c.bg,
                          boxShadow:
                            noteColor === i
                              ? `0 0 0 2px var(--bz-blue)`
                              : `inset 0 0 0 1px ${c.ink}33`,
                        }}
                      />
                    </button>
                  ))}

                {/* مقاس النصّ — يحلّ محلّ سماكة القلم حين تكون أداة
                    النصّ نشطة، فلا يزدحم الرصيف بمجموعتين معاً. */}
                {tool === "text"
                  ? TEXT_SIZES.map((ts, i) => (
                      <button
                        key={ts}
                        onClick={() => setTextSize(ts)}
                        title={`مقاس النصّ: ${TEXT_SIZE_LABEL[i]}`}
                        aria-label={`مقاس النصّ: ${TEXT_SIZE_LABEL[i]}`}
                        aria-pressed={textSize === ts}
                        className={`grid h-[30px] min-w-[30px] shrink-0 place-items-center rounded-lg px-1 font-bold transition ${
                          textSize === ts
                            ? "bg-[var(--bz-blue)] text-white"
                            : "text-[var(--bz-ink-2)] hover:bg-[var(--bz-blue-050)]"
                        }`}
                        style={{ fontSize: 9 + i * 2.5 }}
                      >
                        أ
                      </button>
                    ))
                  : SIZES.map((sz) => (
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

          {/* منطقة الغرفة — تُملأ من صفحة الغرفة إن وُجدت */}
          {consoleExtras ? (
            <>
              <ConsoleDivider />
              <ConsoleZone scroll>{consoleExtras}</ConsoleZone>
            </>
          ) : null}
        </FloatingConsole>
      </div>

    </div>
  );
}

