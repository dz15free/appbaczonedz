"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { pickShape, boundsOf, describeShape, type Bounds } from "@/features/whiteboard/shape-geometry";
import { drawMath, looksLikeMath } from "@/features/whiteboard/math-render";
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
  faCompass,
  faRulerCombined,
} from "@fortawesome/free-solid-svg-icons";
import { recognize } from "@/features/whiteboard/smart/recognize";
import { FORMULA_GROUPS, formulaGroup, type FormulaGroupId } from "@/features/whiteboard/formula-palette";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

interface Point {
  x: number;
  y: number;
}
type Kind = "pen" | "highlighter" | "line" | "arrow" | "rect" | "ellipse" | "text" | "note" | "arc" | "angle" | "eraser";
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
  rect: "مستطيل", ellipse: "دائرة", text: "نصّ", note: "بطاقة", arc: "قوس", angle: "زاوية", eraser: "ممحاة",
};

const TOOL_ICON: Record<ToolId, IconName> = {
  select: "cursor", pen: "pen", highlighter: "marker", line: "line",
  arrow: "arrow", rect: "square", ellipse: "circle", text: "text", note: "note", arc: "compass", angle: "ruler", eraser: "eraser",
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
  { id: "arc", icon: faCompass, label: "مدوّر" },
  { id: "angle", icon: faRulerCombined, label: "منقلة" },
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

  /* بصمة العنصر — لكشف **التعديل** لا الإضافة والحذف وحدهما.
     المستمع كان يعالج حالتين فقط: عنصر جديد، أو عنصر محذوف. أمّا تغيّر
     نقاط عنصر موجود (تحريك · تحجيم · تحرير نصّ) فكان يمرّ دون أثر،
     لأنّ معرّفه في drawnIds أصلاً — فلا يرى الطلاب أيّ حركة.
     نقارن الطول وأوّل نقطة وآخرها والخصائص المرئية: يكشف الإزاحة
     والتحجيم بيقين، وأرخص بكثير من مقارنة مصفوفة النقاط كاملة. */
  const sigs = useRef<Map<string, string>>(new Map());

  function shapeSig(s: Shape): string {
    const a = s.points[0];
    const z = s.points[s.points.length - 1];
    return [
      s.points.length,
      a ? `${a.x.toFixed(5)},${a.y.toFixed(5)}` : "",
      z ? `${z.x.toFixed(5)},${z.y.toFixed(5)}` : "",
      s.size, s.color, s.kind, s.text ?? "",
    ].join("|");
  }
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
    origSize?: number;
    corner?: "nw" | "ne" | "sw" | "se";
    start: Point;
    orig: Point[];
    b: { x0: number; y0: number; x1: number; y1: number };
  } | null>(null);
  const [grid, setGrid] = useState(true);

  /* ── تكبير وتحريك اللوح ──
     على شاشة ٦ إنش يكون خطّ يد الأستاذ صغيراً جداً حتى واللوح بعرض
     الشاشة كاملاً. التكبير يحلّ ذلك بلا أن يمسّ نظام الإحداثيات:
     تحويل CSS على عنصر اللوح، و`getPoint` يقيس بـ
     `getBoundingClientRect` فيحسب النسبة صحيحةً تلقائياً مهما كان
     التكبير — فلا سطر واحد في منطق الرسم يتغيّر. */
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
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
    } else if (s.kind === "arc") {
      const [c, a, b] = pts;
      if (c && a && b) {
        const C = P(c), A = P(a), B = P(b);
        const r = Math.hypot(A.x - C.x, A.y - C.y);
        const a0 = Math.atan2(A.y - C.y, A.x - C.x);
        const a1 = Math.atan2(B.y - C.y, B.x - C.x);
        ctx.beginPath();
        // فرق ضئيل جداً = دائرة كاملة، وإلّا اختفى القوس عند 360°
        if (Math.abs(a1 - a0) < 1e-4) ctx.arc(C.x, C.y, r, 0, Math.PI * 2);
        else ctx.arc(C.x, C.y, r, a0, a1);
        ctx.stroke();
        // نقطة المركز: أثر الإبرة، تُساعد على البناء الهندسي التالي
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(C.x, C.y, Math.max(1.5, s.size * 0.6) * dpr(), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (s.kind === "angle") {
      const [v, a, b] = pts;
      if (v && a && b) {
        const V = P(v), A = P(a), B = P(b);
        const r = Math.hypot(A.x - V.x, A.y - V.y);
        const a0 = Math.atan2(A.y - V.y, A.x - V.x);
        const a1 = Math.atan2(B.y - V.y, B.x - V.x);
        // الشعاعان
        ctx.beginPath();
        ctx.moveTo(V.x, V.y); ctx.lineTo(A.x, A.y);
        ctx.moveTo(V.x, V.y); ctx.lineTo(B.x, B.y);
        ctx.stroke();
        // قوس القياس عند ثلث الشعاع — لا يزاحم الرأس ولا يبتلع الشكل
        const ar = Math.max(14 * dpr(), r * 0.32);
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(V.x, V.y, ar, a0, a1);
        ctx.stroke();
        // القيمة بالدرجات — الغرض من المنقلة أن تقرأ رقماً
        let deg = Math.abs((a1 - a0) * 180 / Math.PI);
        if (deg > 360) deg = 360;
        if (deg > 180) deg = 360 - deg;
        const mid = (a0 + a1) / 2;
        const lr = ar + 13 * dpr();
        ctx.globalAlpha = 1;
        ctx.font = `600 ${12 * dpr()}px system-ui, sans-serif`;
        ctx.direction = "ltr";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = s.color;
        ctx.fillText(`${Math.round(deg)}°`, V.x + lr * Math.cos(mid), V.y + lr * Math.sin(mid));
        ctx.restore();
      }
    } else if (s.kind === "note" && s.text) {
      /* الصندوق من نقطتيه — لا عرض ثابت ولا خطّ يتضخّم.
         النصّ يلتفّ داخل عرض الصندوق، ويصغر تلقائياً إن ضاق الصندوق
         عن استيعاب أسطره: هذا معنى «النصّ يكبر معه» — يتبع الصندوق. */
      const a = P(pts[0]);
      const b = pts[1] ? P(pts[1]) : { x: a.x - 190 * dpr(), y: a.y + 84 * dpr() };
      const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
      const bw = Math.abs(b.x - a.x), bh = Math.abs(b.y - a.y);
      const k = dpr();
      const rr = 6 * k;

      ctx.save();
      ctx.shadowColor = "rgba(19,23,34,.14)";
      ctx.shadowBlur = 8 * k;
      ctx.shadowOffsetY = 2 * k;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(x0 + rr, y0);
      ctx.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, rr);
      ctx.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, rr);
      ctx.arcTo(x0, y0 + bh, x0, y0, rr);
      ctx.arcTo(x0, y0, x0 + bw, y0, rr);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const ink = NOTE_COLORS.find((c) => c.bg === s.color)?.ink ?? "#333";
      const padX = 9 * k, padY = 8 * k;
      const maxW = Math.max(20, bw - padX * 2);

      // نبحث عن أكبر مقاس يجعل النصّ يستوعب داخل الصندوق
      let px = Math.max(10 * k, Math.min(s.size * 7 * k, bh * 0.5));
      let lines: string[] = [];
      for (let guard = 0; guard < 14; guard++) {
        ctx.font = `600 ${px}px system-ui, sans-serif`;
        lines = [];
        let cur = "";
        for (const w of s.text.split(/\s+/)) {
          const t = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
          else cur = t;
        }
        if (cur) lines.push(cur);
        if (lines.length * px * 1.4 + padY * 2 <= bh || px <= 10 * k) break;
        px = Math.max(10 * k, px * 0.9);
      }

      ctx.save();
      ctx.beginPath();                    // لا يفيض حرف واحد خارج الصندوق
      ctx.rect(x0, y0, bw, bh);
      ctx.clip();
      ctx.fillStyle = ink;
      ctx.font = `600 ${px}px system-ui, sans-serif`;
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      const lh = px * 1.4;
      lines.forEach((ln, i) => ctx.fillText(ln, x0 + bw - padX, y0 + padY + i * lh));
      ctx.restore();
    } else if (s.kind === "text" && s.text) {
      const a = P(pts[0]);
      const px = s.size * 8 * dpr();
      /* 🐛 المعادلة كانت تُرسَم نصّاً عادياً بعد تحويل الأسّ إلى حرف
         Unicode مرتفع — وأيّ أسّ ليس رقماً أو `n`/`i` كان يسقط إلى
         `^${ch}` فيظهر رمز `^` حرفياً على اللوح.

         الآن ما يحتوي علامات رياضية يُخطَّط تخطيطاً حقيقياً: الأسّ
         مرفوع بخطّ أصغر، والدليل منخفض، والكسر بخطّ أفقي، والجذر
         بسقفه — فلا يظهر `^` ولا `_` ولا `{}` أبداً، ومع أي أسّ
         مهما طال (`n+1` مثلاً). */
      if (looksLikeMath(s.text)) {
        ctx.fillStyle = s.color || "#131722";
        drawMath(ctx, s.text, a.x, a.y, px);
      } else {
        ctx.font = `bold ${px}px sans-serif`;
        /* نُثبّت الاتجاه والمحاذاة صراحةً.
           البطاقة ولسان النوع وشارة الوسم تضبط `rtl`/`right`؛ ولو تسرّبت
           أيٌّ منها إلى هنا لرُسم النصّ **يساراً** من نقطته، بينما يحسب
           boundsOf مداه يميناً — فيظهر إطار التحديد بجانب النصّ لا حوله. */
        ctx.direction = "ltr";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(s.text, a.x, a.y);
      }
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
      /* وسم المجموعة: نرسم إطاراً واحداً حول أعضائها كلّهم بدل إطار
         لكل ضربة — وهو سبب تراكم الشارات في لقطتك. */
      const ids = m.members && m.members.length > 1 ? m.members : [shapeId];
      let mb: Bounds | null = null;
      for (const id of ids) {
        const sh = shapes.current.find((x) => x.id === id);
        const b2 = sh ? boundsOf(sh) : null;
        if (!b2) continue;
        mb = mb
          ? { x0: Math.min(mb.x0, b2.x0), y0: Math.min(mb.y0, b2.y0),
              x1: Math.max(mb.x1, b2.x1), y1: Math.max(mb.y1, b2.y1) }
          : b2;
      }
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

  /* `latexToUnicode` حُذفت: كانت تُسطّح المعادلة إلى حروف Unicode
     مرتفعة، وأيّ أسّ خارج خريطتها الصغيرة كان يُطبع بالرمز `^`. صار
     التخطيط الرياضي الحقيقي في `math-render.ts` يتولّى ذلك. */

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
      /* يُحفَظ LaTeX **كما هو**: الراسم يُخطّطه رياضياً عند كل رسم،
         فتبقى المعادلة قابلة للتصدير والفهم لاحقاً بدل أن تُسطَّح إلى
         حروف Unicode لا يمكن الرجوع منها. */

      /* المعادلة تحلّ **محلّ** خطّ اليد لا تُضاف تحته.
         كان الاثنان يبقيان معاً فيتراكمان على اللوح: خطّ يد ومعادلة
         لكل تحويل، والطالب يرى الشيء نفسه مكتوباً مرّتين. الآن تُوضع
         المعادلة في موضع ما كُتب، ويُحذف خطّ اليد. */
      const sh = newShape("text", { x: b.x0, y: b.y0 }, data.latex.trim());
      sh.size = TEXT_SIZES[1];
      sh.color = "#2350D9";   // المعادلة المُستخرَجة بالأزرق لتُميَّز عن خطّ اليد

      const captured = [...multiRef.current];
      commit(sh);
      for (const id of captured) {
        drawnIds.current.delete(id);
        remove(ref(rtdb, `${strokesPath}/${id}`));
      }
      shapes.current = shapes.current.filter((x) => !captured.includes(x.id));
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
    const ids = [...multiRef.current];

    /* علامة **واحدة** للمجموعة كلّها، لا علامة لكل ضربة.
       معادلة من تسع ضربات كانت تُنتج تسع شارات متراكبة لا تُقرأ. */
    const anchor = ids[0];
    if (!anchor) return;

    // ضغط الوسم نفسه مرّة أخرى يُزيله — لم يكن هناك سبيل للتراجع
    const cur = marks[anchor];
    if (cur && cur.tag === tag) {
      for (const id of ids) clearMark(roomId, activePage, id);
      clearMulti();
      fullRedraw();
      return;
    }

    // ننظّف أي وسوم مفردة قديمة على الأعضاء حتى لا تبقى شارات يتيمة
    for (const id of ids) if (id !== anchor && marks[id]) clearMark(roomId, activePage, id);

    const text = ids
      .map((id) => shapes.current.find((x) => x.id === id)?.text)
      .filter(Boolean)
      .join(" ");
    setMark(roomId, activePage, anchor, tag, text || undefined, ids);
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
    /* بطاقة الأستاذ اللاصقة يحفظها **الطالب** بنصّها لا بصورتها:
       النصّ يُبحَث ويُراجَع ويُقرأ على أي شاشة، والصورة لا تفعل شيئاً
       من ذلك — ولا تُقرأ أصلاً على هاتف صغير.
       ووجه البطاقة = معنى لون الملاحظة، فتصل إلى الطالب مصنّفة. */
    const noteMeaning =
      shape.kind === "note"
        ? (NOTE_COLORS.find((c) => c.bg === shape.color)?.label ?? "بطاقة")
        : null;
    void saveFlashcard({
      uid: user.uid,
      front: noteMeaning ?? describeShape(shape),
      back: shape.text?.trim() || describeShape(shape),   // النصّ نفسه
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

  /* ── إيماءات اللمس ──
     إصبعان: تكبير وتحريك. إصبع واحد: تحريك **لمن لا يرسم** (الطالب)
     أو حين يكون اللوح مكبّراً وقلم الرسم غير نشط. نقرتان: عودة. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let start: { d: number; k: number; cx: number; cy: number; tx: number; ty: number } | null = null;
    let pan: { x: number; y: number; tx: number; ty: number } | null = null;
    let lastTap = 0;

    const dist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    };
    const mid = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const clamp = (v: { k: number; tx: number; ty: number }) => {
      const k = Math.min(4, Math.max(1, v.k));
      /* لا يُسمح بسحب اللوح خارج الإطار: أقصى إزاحة نصف الفائض */
      const b = boardRef.current;
      const maxX = b ? (b.clientWidth * (k - 1)) / 2 : 0;
      const maxY = b ? (b.clientHeight * (k - 1)) / 2 : 0;
      return {
        k,
        tx: Math.min(maxX, Math.max(-maxX, v.tx)),
        ty: Math.min(maxY, Math.max(-maxY, v.ty)),
      };
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const v = viewRef.current;
        const m = mid(e.touches);
        start = { d: dist(e.touches), k: v.k, cx: m.x, cy: m.y, tx: v.tx, ty: v.ty };
        pan = null;
        e.preventDefault();
        return;
      }
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          setView({ k: 1, tx: 0, ty: 0 });
          lastTap = 0;
          e.preventDefault();
          return;
        }
        lastTap = now;
        /* إصبع واحد يحرّك فقط إن كان المستخدم لا يرسم أصلاً، أو كان
           اللوح مكبّراً — وإلّا خطف التحريك ضربة القلم. */
        if (!canDrawRef.current || viewRef.current.k > 1.02) {
          const v = viewRef.current;
          pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: v.tx, ty: v.ty };
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      if (start && e.touches.length === 2) {
        const d = dist(e.touches);
        const m = mid(e.touches);
        const k = start.k * (d / (start.d || 1));
        setView(clamp({
          k,
          tx: start.tx + (m.x - start.cx),
          ty: start.ty + (m.y - start.cy),
        }));
        e.preventDefault();
        return;
      }
      if (pan && e.touches.length === 1) {
        setView((v) => clamp({
          k: v.k,
          tx: pan!.tx + (e.touches[0].clientX - pan!.x),
          ty: pan!.ty + (e.touches[0].clientY - pan!.y),
        }));
        e.preventDefault();
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) start = null;
      if (e.touches.length === 0) pan = null;
    };

    wrap.addEventListener("touchstart", onStart, { passive: false });
    wrap.addEventListener("touchmove", onMove, { passive: false });
    wrap.addEventListener("touchend", onEnd);
    wrap.addEventListener("touchcancel", onEnd);
    return () => {
      wrap.removeEventListener("touchstart", onStart);
      wrap.removeEventListener("touchmove", onMove);
      wrap.removeEventListener("touchend", onEnd);
      wrap.removeEventListener("touchcancel", onEnd);
    };
  }, []);

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

      /* الحشوة تُخصَم أوّلاً: كانت القياسات تُحسب من `getBoundingClientRect`
         كاملاً بينما اللوح يعيش **داخل** حشوة `p-2/p-3`، فيزيد عرضه
         عن مساحته المتاحة بمقدار الحشوة ويُقصّ طرفه. */
      const cs = getComputedStyle(wrap);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const availW = Math.max(1, r.width - padX);
      const availH = Math.max(1, r.height - padY);

      /* احتواء: أكبر مستطيل بنسبة BOARD_AR يدخل في المساحة المتاحة.
         نأخذ **الأصغر** من القيدين صراحةً بدل تصحيح بعديّ — أوضح، ولا
         يمكن أن يتجاوز أيّاً منهما مهما كانت أبعاد الحاوية. */
      const bw0 = Math.min(availW, availH * BOARD_AR);
      let bw = Math.floor(Math.max(1, bw0));
      let bh = Math.floor(Math.max(1, bw / BOARD_AR));

      /* 🐛 **السبورة على الهاتف كانت شريطاً صغيراً وسط فراغ رمادي هائل.**

         السبب: اللوح بنسبة ١٦:١٠ ثابتة (وهذا صحيح — الدائرة يجب أن
         تصل الطالب دائرةً)، والحاوية `flex-1` تأخذ كل ارتفاع الشاشة.
         على هاتف بنسبة ٩:٢٠ يكون العرض هو القيد، فيصير ارتفاع اللوح
         ~٦٠٪ من عرض الشاشة، ويبقى أكثر من ثلثَي الشاشة فراغاً ميّتاً
         فوقه وتحته — كما في لقطتك.

         الحلّ: على الهاتف الرأسي تتقلّص الحاوية إلى ارتفاع اللوح، فيصعد
         اللوح إلى أعلى المساحة بعرض الشاشة كاملاً بلا فراغ. والمحتوى
         **هو نفسه** الذي على الحاسوب — لم نقصّ شيئاً ولا مطّطنا شيئاً. */
      const portrait = r.height > r.width * 1.15 && r.width < 900;
      if (portrait) {
        wrap.style.flexGrow = "0";
        wrap.style.flexShrink = "0";
        wrap.style.flexBasis = "auto";
        wrap.style.height = `${Math.round(bh + padY)}px`;
      } else {
        wrap.style.removeProperty("flex-grow");
        wrap.style.removeProperty("flex-shrink");
        wrap.style.removeProperty("flex-basis");
        wrap.style.removeProperty("height");
      }

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
      // حذف أو **تعديل**؟ أعد البناء كاملاً
      const removed = shapes.current.some((s) => !present.has(s.id));
      const changed = !removed && ids.some((id) => {
        if (!drawnIds.current.has(id)) return false;      // جديد لا معدَّل
        const next = shapeSig({ id, ...val[id] } as Shape);
        return sigs.current.get(id) !== next;
      });
      if (removed || changed) {
        shapes.current = ids.map((id) => ({ id, ...val[id] }));
        drawnIds.current = new Set(ids);
        sigs.current = new Map(shapes.current.map((s) => [s.id, shapeSig(s)]));
        scheduleRedraw();
        return;
      }
      // إضافات: ارسمها تزايدياً (بلا وميض)
      const ctx = mainRef.current?.getContext("2d");
      for (const id of ids) {
        if (!drawnIds.current.has(id)) {
          const s = { id, ...val[id] } as Shape;
          drawnIds.current.add(id);
          sigs.current.set(id, shapeSig(s));
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
    sigs.current.set(s.id, shapeSig(s));
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

      // ٠) الضغط داخل إطار المجموعة → سحب الجميع معاً
      if (multiRef.current.size > 0 && canDraw) {
        const gb = multiBounds();
        if (gb) {
          const snap = () => {
            const m = new Map<string, Point[]>();
            for (const id of multiRef.current) {
              const sh = shapes.current.find((x) => x.id === id);
              if (sh) m.set(id, sh.points.map((q) => ({ ...q })));
            }
            return m;
          };
          // مقبض زاوية على إطار المجموعة → تحجيم (له الأولوية على التحريك)
          const gc = hitCorner(p, gb, e.pointerType === "mouse" ? 12 : 22);
          if (gc) {
            groupDrag.current = { mode: "resize", corner: gc, start: p, b: gb, orig: snap() };
            cancelLongPress();
            return;
          }
          if (p.x >= gb.x0 && p.x <= gb.x1 && p.y >= gb.y0 && p.y <= gb.y1) {
            groupDrag.current = { mode: "move", start: p, b: gb, orig: snap() };
            cancelLongPress();
            return;
          }
        }
      }

      // ١) هل الضغطة على مقبض تحجيم للعنصر المحدَّد حاليًّا؟ (له الأولوية)
      const curSel = selectedRef.current;
      if (curSel && canDraw) {
        const cur = shapes.current.find((x) => x.id === curSel);
        const cb = cur ? boundsOf(cur) : null;
        if (cur && cb) {
          const corner = hitCorner(p, cb, e.pointerType === "mouse" ? 12 : 22);
          if (corner) {
            dragRef.current = { mode: "resize", corner, start: p, orig: cur.points.map((q) => ({ ...q })), b: cb, origSize: cur.size };
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
      setTimeout(() => (t === "note" ? editorArea.current : editorInput.current)?.focus(), 0);
      return;
    }
    /* ── المدوّر ──
       كالمدوّر الحقيقي: الضغطة تغرز الإبرة، والسحب يضبط **نصف القطر
       وزاوية القوس معاً** — لا قطراً واحداً ولا زاوية ثابتة.
       نخزّن ثلاث نقاط: المركز · بداية القوس · نهايته. */
    if (t === "angle") {
      /* المنقلة بنفس إيماءة المدوّر المُختبَرة: الضغطة تضع الرأس،
         واتجاه أوّل حركة هو الشعاع الأوّل، والدوران يفتح الزاوية. */
      drawing.current = true;
      const sh = newShape("angle", p);
      sh.points = [p, p, p];
      currentShape.current = sh;
      arcStart.current = null;
      return;
    }

    if (t === "arc") {
      drawing.current = true;
      const sh = newShape("arc", p);
      sh.points = [p, p, p];
      currentShape.current = sh;
      arcStart.current = null;
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
    if (groupDrag.current) {
      e.preventDefault();
      const p = getPoint(e);
      const g = groupDrag.current;

      if (g.mode === "resize" && g.corner) {
        /* التحجيم يثبّت الزاوية المقابلة ويقيس النسبة من الإطار الأصلي.
           MIN يمنع الانهيار إلى نقطة — ولولاه لصار عكس الاتجاه مسحاً
           فعلياً للمجموعة، ولا سبيل للرجوع. */
        const MIN = 0.02;
        const { x0, y0, x1, y1 } = g.b;
        // نقطة الارتكاز = الزاوية المقابلة للمقبض المسحوب
        const ax = g.corner === "nw" || g.corner === "sw" ? x1 : x0;
        const ay = g.corner === "nw" || g.corner === "ne" ? y1 : y0;
        // الزاوية المتحرّكة نفسها
        const mx = g.corner.includes("w") ? x0 : x1;
        const my = g.corner.startsWith("n") ? y0 : y1;
        /* النسبة **مُوقَّعة** لا مطلقة: القيمة المطلقة تُفقد الاتجاه،
           فتعمل زاوية se وحدها وتنكسر الثلاث الأخرى — وهو ما كشفه
           الاختبار قبل الشحن. الإشارة السالبة تعني قلباً حول المحور،
           وهو سلوك صحيح ومتوقّع في كل محرّر. */
        const ow = mx - ax;
        const oh = my - ay;
        let sx = Math.abs(ow) < 1e-6 ? 1 : (p.x - ax) / ow;
        let sy = Math.abs(oh) < 1e-6 ? 1 : (p.y - ay) / oh;
        // حارس الانهيار: يمنع السحق إلى نقطة بلا رجعة، ويحفظ الإشارة
        if (Math.abs(sx) < MIN) sx = (sx < 0 ? -1 : 1) * MIN;
        if (Math.abs(sy) < MIN) sy = (sy < 0 ? -1 : 1) * MIN;
        for (const [id, orig] of g.orig) {
          const sh = shapes.current.find((x) => x.id === id);
          if (sh) sh.points = orig.map((q) => ({
            x: ax + (q.x - ax) * sx,
            y: ay + (q.y - ay) * sy,
          }));
        }
        fullRedraw();
        streamGroup(g.orig.keys());
        return;
      }

      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      for (const [id, orig] of g.orig) {
        const sh = shapes.current.find((x) => x.id === id);
        if (sh) sh.points = orig.map((q) => ({ x: q.x + dx, y: q.y + dy }));
      }
      fullRedraw();
      streamGroup(g.orig.keys());
      return;
    }

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
      const dp = getPoint(e);
      const pts = applyDrag(dp);
      if (shape && pts) {
        shape.points = pts;
        /* البطاقة والنصّ لهما **نقطة واحدة**، فتحجيم النقاط لا يغيّر
           شيئاً مرئياً — لهذا لم تكن البطاقة تكبر ولا تصغر. حجمهما
           يعيش في `size`، فنُحجّمه هو. */
        /* البطاقة صندوق بنقطتين، فتحجيمها يمرّ بمسار تحجيم النقاط
           العادي — لا حاجة لتكبير الخطّ يدوياً كما كنت أفعل، وهو ما كان
           يُفيض النصّ خارج الصندوق. النصّ يتبع الصندوق عند الرسم.
           أمّا النصّ الحرّ فله نقطة واحدة، فيُحجَّم بمقاسه. */
        if (shape.kind === "text" && dragRef.current?.mode === "resize") {
          const d = dragRef.current;
          const b0 = d.b;
          const corner = d.corner ?? "se";
          const ax = corner.includes("w") ? b0.x1 : b0.x0;
          const mx = corner.includes("w") ? b0.x0 : b0.x1;
          const ow = mx - ax;
          if (Math.abs(ow) > 1e-6) {
            const f = Math.max(0.35, Math.min(4, Math.abs((dp.x - ax) / ow)));
            shape.size = Math.max(0.8, Math.min(12, (d.origSize ?? shape.size) * f));
          }
          shape.points = d.orig.map((q) => ({ ...q }));
        }
        fullRedraw();
        streamDrag(shape);
      }
      return;
    }

    if (!drawing.current || !currentShape.current) return;
    e.preventDefault();
    const p = getPoint(e);
    const s = currentShape.current;

    if (s.kind === "arc" || s.kind === "angle") {
      /* المسافة = نصف القطر · الزاوية = مدى القوس.
         نتراكم على المدى بدل أن نأخذ الفرق الخام، وإلّا انقلب القوس
         فجأة عند عبور ±π (حدّ atan2) فقفز من 359° إلى 1°. */
      const c = s.points[0];
      const r = Math.hypot(p.x - c.x, p.y - c.y);
      const ang = Math.atan2(p.y - c.y, p.x - c.x);
      if (arcStart.current === null) {
        if (r < 0.004) return;            // اهتزاز اليد لا نيّة رسم
        arcStart.current = ang;
        arcSweep.current = 0;
        arcPrev.current = ang;
      } else {
        let d = ang - (arcPrev.current ?? ang);
        if (d > Math.PI) d -= 2 * Math.PI;      // عبور الحدّ
        if (d < -Math.PI) d += 2 * Math.PI;
        arcSweep.current = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, (arcSweep.current ?? 0) + d));
        arcPrev.current = ang;
      }
      const a0 = arcStart.current;
      const a1 = a0 + (arcSweep.current ?? 0);
      s.points = [
        c,
        { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) },
        { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) },
      ];
      setArcHint({
        r,
        deg: Math.round(Math.abs((arcSweep.current ?? 0) * 180) / Math.PI),
      });
      const pc = previewRef.current?.getContext("2d");
      if (pc) {
        pc.clearRect(0, 0, previewRef.current!.width, previewRef.current!.height);
        drawShape(s, pc);
      }
      return;
    }

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
      /* الكوس يقيّد الخطّ والسهم وحدهما — المستطيل والدائرة يُرسمان
         بزاويتين متقابلتين فلا معنى لتقييد اتجاههما. */
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
  /* أوّل زاوية بعد غرز الإبرة = بداية القوس. نلتقطها مرّة واحدة فلا
     تتغيّر بينما يدور المستخدم، وإلّا لدار القوس معه ولم ينمُ أبداً. */
  const arcStart = useRef<number | null>(null);
  const arcPrev = useRef<number | null>(null);
  const arcSweep = useRef<number>(0);
  /** قراءة حيّة لنصف القطر والزاوية — كالمدوّر الحقيقي الذي تقرأ عليه */
  const [arcHint, setArcHint] = useState<{ r: number; deg: number } | null>(null);

  /* ── محرّر النصّ على اللوح ──
     كان النصّ يُكتب في `window.prompt` — نافذة نظام تقطع الشرح، ولا
     ترى فيها أين سيقع النصّ ولا بأيّ مقاس. الآن حقل يظهر **في مكانه
     على اللوح** بنفس الخطّ والمقاس واللون، فما تكتبه هو ما تراه. */
  const [editor, setEditor] = useState<{ x: number; y: number; value: string; note?: boolean; editId?: string } | null>(null);
  const [textSize, setTextSize] = useState(TEXT_SIZES[1]);
  const [noteColor, setNoteColor] = useState(0);
  const noteColorRef = useRef(noteColor);
  noteColorRef.current = noteColor;
  const textSizeRef = useRef(textSize);
  textSizeRef.current = textSize;
  const editorInput = useRef<HTMLInputElement>(null);
  const editorArea = useRef<HTMLTextAreaElement>(null);

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

  /* سحب المجموعة: نلتقط لقطة من نقاط **كل** عنصر محدَّد عند بدء السحب،
     ثم نزيح الجميع بالفرق نفسه. نبني من اللقطة الأصلية في كل حركة لا
     من الموضع السابق — وإلّا تراكمت أخطاء الفاصلة العائمة وانحرفت
     العناصر عن بعضها تدريجياً. */
  const groupDrag = useRef<{
    mode: "move" | "resize";
    corner?: "nw" | "ne" | "sw" | "se";
    start: Point;
    b: Bounds;
    orig: Map<string, Point[]>;
  } | null>(null);

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
    // نبثّ `size` أيضاً: تحجيم البطاقة والنصّ يعيش فيه لا في النقاط
    update(ref(rtdb, `${strokesPath}/${shape.id}`), { points: shape.points, size: shape.size });
  }

  /* بثّ المجموعة أثناء السحب/التحجيم.
     كنت أكتب عند الإفلات فقط خوفاً على الحصّة، فكانت المجموعة تقفز عند
     الطلاب بدل أن تتحرّك. الحلّ ليس المنع بل **الخنق الأبطأ**: 140ms
     للمجموعة بدل 80 للعنصر المفرد، وكتابة واحدة مجمّعة (`update` على
     المسار الأب) بدل كتابة لكل عنصر — فعشرون عنصراً تكلّف طلباً واحداً. */
  const groupBeat = useRef(0);

  function streamGroup(ids: Iterable<string>, force = false) {
    const now = Date.now();
    if (!force && now - groupBeat.current < 140) return;
    groupBeat.current = now;
    const patch: Record<string, Point[]> = {};
    for (const id of ids) {
      const sh = shapes.current.find((x) => x.id === id);
      if (sh) patch[`${id}/points`] = sh.points;
    }
    if (Object.keys(patch).length) update(ref(rtdb, strokesPath), patch);
  }

  /* تثبيت ما كُتب في الحقل — نصّاً عادياً أو بطاقة لاصقة.
     البطاقة تُحفظ فوراً في بطاقات المراجعة، وهذا نصّ طلبه:
     «هاته البطاقات هي من تضاف كبطاقات مراجعة». */
  function commitTyped(v: string, ed: { x: number; y: number; note?: boolean; editId?: string }) {
    /* تعديل عنصر قائم: نُحدّث نصّه ولا نُنشئ عنصراً ثانياً — وإلّا
       تكرّرت البطاقة وبقيت القديمة تحتها. */
    if (ed.editId) {
      const sh = shapes.current.find((x) => x.id === ed.editId);
      if (sh) {
        sh.text = v;
        update(ref(rtdb, `${strokesPath}/${sh.id}`), { text: v });
        fullRedraw();
        return;
      }
    }
    if (ed.note) {
      const c = NOTE_COLORS[noteColorRef.current] ?? NOTE_COLORS[0];
      const sh = newShape("note", { x: ed.x, y: ed.y }, v);
      /* البطاقة **صندوق** لا نقطة: نخزّن زاويتين.
         كان لها نقطة واحدة وعرض ثابت 190px، والتحجيم يُكبّر **الخطّ** —
         فيفيض النصّ خارج الصندوق ويختلف موضع الثلاثة (الصندوق والنصّ
         والإطار) كما في لقطتك.
         بنقطتين: التحجيم يُكبّر الصندوق والنصّ يلتفّ داخله، وحدود
         التحديد تطابقه بالضبط لأنّها هي نفسها. */
      const W = 190 / 1600, H = 84 / 1000;
      sh.points = [{ x: ed.x, y: ed.y }, { x: ed.x - W, y: ed.y + H }];
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

    // نهاية سحب المجموعة → كتابة واحدة لكل عنصر
    if (groupDrag.current) {
      streamGroup(groupDrag.current.orig.keys(), true);   // كتابة أخيرة مضمونة
      groupDrag.current = null;
      return;
    }

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
        update(ref(rtdb, `${strokesPath}/${shape.id}`), { points: shape.points, size: shape.size });
      }
      return;
    }

    if (!drawing.current || !currentShape.current) return;
    drawing.current = false;
    const s = currentShape.current;
    if (s.kind === "arc") {
      arcStart.current = null;
      arcPrev.current = null;
      arcSweep.current = 0;
      setArcHint(null);
    }
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
        /* `min-w-0` و`min-h-0` ضروريّتان: القيمة الافتراضية في flexbox هي
           `min-width: auto`، فيستطيع العنصر **تجاوز حاويته** حين يكون
           محتواه عريضاً. فتُقاس المنصّة أوسع من الشاشة على الهاتف،
           ويُبنى اللوح على ذلك القياس فيظهر مقصوصاً. */
        className="bz-stage relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-3"
      >
        {/* شارة التكبير — تظهر عند التكبير وحده، وتُعيد اللوح بنقرة */}
        {(view.k > 1.02 || view.tx !== 0 || view.ty !== 0) && (
          <button
            onClick={() => setView({ k: 1, tx: 0, ty: 0 })}
            className="absolute end-3 top-3 z-20 flex min-h-9 items-center gap-1.5 rounded-full bg-slate-900/80 px-3 text-[11.5px] font-extrabold text-white backdrop-blur-sm transition active:scale-95"
          >
            {Math.round(view.k * 100)}٪ — ملء اللوح
          </button>
        )}

        {/* اللوح — نسبة ثابتة، موسّط، وما حوله هامش محايد بدل تمطيط المحتوى */}
        <div
          ref={boardRef}
          className="bz-board relative shrink-0 overflow-hidden rounded-xl bg-white"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`,
            transformOrigin: "center center",
            transition: view.k === 1 && view.tx === 0 && view.ty === 0 ? "transform .22s cubic-bezier(.22,1,.36,1)" : "none",
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
              {canDraw && (shape.kind === "note" || shape.kind === "text") && (
                /* لم تكن هناك أيّ طريقة لتعديل نصّ كُتب — يُحذف ويُكتب
                   من جديد. الآن يُفتح المحرّر نفسه على النصّ الحالي،
                   وعند التثبيت نُحدّث العنصر مكانه بدل إنشاء آخر. */
                <ContextButton
                  icon="pen"
                  label="تعديل"
                  tone="primary"
                  onClick={() => {
                    const a = shape.points[0];
                    if (!a) return;
                    setEditor({
                      x: a.x, y: a.y,
                      value: shape.text ?? "",
                      note: shape.kind === "note",
                      editId: shape.id,
                    });
                    setTimeout(
                      () => (shape.kind === "note" ? editorArea.current : editorInput.current)?.focus(),
                      0,
                    );
                  }}
                />
              )}
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
        {editor && canDraw && editor.note && (
          /* البطاقة تُحرَّر **بشكلها النهائي**: نفس العرض ونفس اللون ونفس
             اللفّ. كان يُستعمل حقل سطر واحد، فالنصّ الطويل يخرج من إطار
             البطاقة أثناء الكتابة ثم ينضغط داخلها بعد التثبيت — فما ترى
             ليس ما تحصل عليه. */
          <textarea
            ref={editorArea}
            value={editor.value}
            onChange={(e) => setEditor({ ...editor, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
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
            rows={3}
            placeholder="اكتب… ثم Enter"
            className="absolute z-30 resize-none overflow-hidden rounded-md border p-2 font-bold leading-snug outline-none"
            style={{
              // يُرسم من نقطته يساراً، فنطابق ذلك بالضبط
              left: `calc(${editor.x * 100}% - 190px)`,
              top: `${editor.y * 100}%`,
              width: 190,
              minHeight: 64,
              background: (NOTE_COLORS[noteColor] ?? NOTE_COLORS[0]).bg,
              borderColor: (NOTE_COLORS[noteColor] ?? NOTE_COLORS[0]).ink,
              color: (NOTE_COLORS[noteColor] ?? NOTE_COLORS[0]).ink,
              fontSize: `${Math.max(11, textSize * 7)}px`,
              boxShadow: "0 2px 8px rgba(19,23,34,.14)",
            }}
          />
        )}

        {editor && canDraw && !editor.note && (
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

