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
  faPlus, faArrowPointer, faXmark,
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
  const [grid, setGrid] = useState(true);
  const [stamp, setStamp] = useState<string | null>(null);
  // التحديد: الحالة للواجهة، والمرجع ليقرأه الرسم دون إعادة إنشاء الدوال
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  // الطالب لا يرسم، فالاختيار عنده دائم بلا زر إضافي
  const selecting = !canDraw || tool === "select";
  const selectingRef = useRef(selecting);
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
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
        ctx.setLineDash([7 * (window.devicePixelRatio || 1), 5 * (window.devicePixelRatio || 1)]);
        ctx.strokeRect(b.x0 * w, b.y0 * h, (b.x1 - b.x0) * w, (b.y1 - b.y0) * h);
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
      if (e.key === "Escape") { setSelectedId(null); selectedRef.current = null; scheduleRedraw(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, scheduleRedraw]);

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
    cancelLongPress();
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
            {stamp
              ? <span className="text-xs font-bold text-primary">اضغط على السبورة لوضع: {stamp}</span>
              : <span className="text-[10px] text-text-muted">💡 لتمييز عنصر أو حفظه كبطاقة: اختر أداة «اختيار» ثم انقره بالزر الأيمن (أو اضغط عليه مطوّلاً بالهاتف)</span>}
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

      {/* ── شريط الصفحات ── */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-surface px-2 py-1.5">
        {!canDraw && (
          following ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-bold text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              أتابع الأستاذ
            </span>
          ) : (
            <button
              onClick={() => { setFollowing(true); setActivePage(teacherPage); }}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary transition active:scale-95"
            >
              عُد إلى الأستاذ ({teacherPage + 1})
            </button>
          )
        )}
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
              title={i === teacherPage && !canDraw ? "صفحة الأستاذ الآن" : undefined}
              className={`relative grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-bold transition ${
                i === activePage ? "bg-gradient-primary text-white" : "bg-background text-text-muted hover:bg-primary/10"
              }`}
            >
              {i + 1}
              {/* نقطة تدلّ الطالب على موضع الأستاذ حين يتصفّح بحرّية */}
              {!canDraw && !following && i === teacherPage && (
                <span className="absolute -top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-secondary" />
              )}
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
