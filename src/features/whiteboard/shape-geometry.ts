/* ════════════════════════════════════════════════════════════
   هندسة أشكال السبورة — الحدود واختبار الإصابة

   وحدة خالصة بلا حالة ولا رسم: تأخذ شكلاً ونقطة وتُرجع جواباً.
   عزلها عن whiteboard.tsx مقصود — يمكن اختبارها وتعديلها
   دون لمس ملف السبورة الذي تمرّ عبره كل حصة.

   الإحداثيات معيارية (0..1) كما تُخزَّن في قاعدة البيانات، لكن
   المسافات تُحسب بالبكسل: الفرق المعياري نفسه يمثّل مسافة أكبر
   أفقياً منه رأسياً على شاشة عريضة، ولو تجاهلنا ذلك لأصبح
   اختيار الأشكال دقيقاً في اتجاه ومتساهلاً في الآخر.
════════════════════════════════════════════════════════════ */

export interface GeoPoint { x: number; y: number }

export interface GeoShape {
  id: string;
  kind: string;
  points: GeoPoint[];
  size: number;
  text?: string;
}

export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/** مقاس اللوحة بالبكسل — لتحويل المسافات المعيارية إلى مسافات مرئية */
export interface Viewport { w: number; h: number }

/** مساحة إضافية حول الشكل حتى لا يكون الاختيار عسيراً على الإصبع */
const PAD = 0.012;

/* سياق قياس مخفيّ: يُنشأ مرّة واحدة ويُعاد استعماله لكل القياسات.
   إنشاء canvas لكل قياس كان سيُثقل إعادة الرسم بشدّة. وعلى الخادم
   (حيث لا document) نرجع إلى تقدير الحروف بدل أن ننهار. */
let measureCtx: CanvasRenderingContext2D | null | undefined;

function measureTextPx(text: string, px: number): number {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * px * 0.62;
  measureCtx.font = `bold ${px}px sans-serif`;   // مطابق تماماً لخطّ الرسم
  return measureCtx.measureText(text).width;
}

export function boundsOf(s: GeoShape): Bounds | null {
  if (!s.points?.length) return null;

  if (s.kind === "note") {
    /* البطاقة صندوق من نقطتين — فحدودها **هي** نقطتاها، بلا أي تقدير.
       كانت تُحسب من `size` وعرض ثابت، فيختلف الإطار عن الصندوق المرسوم.
       الآن يتطابقان بالضرورة لأنّهما المصدر نفسه. */
    const a = s.points[0];
    const b = s.points[1] ?? { x: a.x - 190 / 1600, y: a.y + 84 / 1000 };
    return {
      x0: Math.min(a.x, b.x) - PAD,
      y0: Math.min(a.y, b.y) - PAD,
      x1: Math.max(a.x, b.x) + PAD,
      y1: Math.max(a.y, b.y) + PAD,
    };
  }

  if (s.kind === "text") {
    /* كان العرض يُقدَّر من **عدد الحروف** (`chars * 0.62`) — تقدير يخطئ
       بشدّة: الحروف العربية والرموز الرياضية والأسس تختلف عرضاً كثيراً،
       فيظهر إطار التحديد أوسع من النصّ أو أضيق منه.
       الآن نقيس العرض الحقيقي بـ`measureText` على سياق مخفيّ يُنشأ مرّة
       واحدة ويُعاد استعماله. */
    const a = s.points[0];
    const px = s.size * 8;
    const w = measureTextPx(s.text ?? "", px) / 1600;   // عرض معياري
    const em = px / 900;
    return {
      x0: a.x - PAD,
      y0: a.y - PAD,
      x1: a.x + w + PAD,
      y1: a.y + em * 1.25 + PAD,
    };
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of s.points) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  if (!Number.isFinite(x0)) return null;
  return { x0: x0 - PAD, y0: y0 - PAD, x1: x1 + PAD, y1: y1 + PAD };
}

function insideBounds(b: Bounds, p: GeoPoint): boolean {
  return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
}

/** مسافة نقطة إلى قطعة مستقيمة، بالبكسل */
function distToSegment(p: GeoPoint, a: GeoPoint, b: GeoPoint, v: Viewport): number {
  const px = p.x * v.w, py = p.y * v.h;
  const ax = a.x * v.w, ay = a.y * v.h;
  const bx = b.x * v.w, by = b.y * v.h;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * هل تقع النقطة على هذا الشكل؟
 * tolPx: هامش باللمس — الإصبع أعرض من مؤشّر الفأرة.
 */
export function hitTest(s: GeoShape, p: GeoPoint, v: Viewport, tolPx = 12): boolean {
  const b = boundsOf(s);
  if (!b || !insideBounds(b, p)) return false;   // فحص سريع أولاً

  const tol = tolPx + s.size;
  const pts = s.points;

  switch (s.kind) {
    case "text":
    case "note":
      /* البطاقة والنصّ **كتلتان مصمتتان**: كل ما داخل حدودهما قابل
         للإصابة. وبدون هذه الحالة تسقط البطاقة إلى المسار العامّ الذي
         يقيس المسافة إلى قطعة مستقيمة — وللبطاقة نقطة واحدة لا قطعة،
         فتصير قابلة للنقر ضمن 14 بكسل من نقطتها فقط بينما صندوقها
         190 بكسل مرسوم يساراً. لهذا استعصى تحديدها. */
      return true;

    case "arc": {
      /* القوس: المسافة إلى **محيطه** لا إلى مركزه، وإلّا صار قرصاً
         مصمتاً يبتلع كل ما تحته. */
      if (pts.length < 2) return false;
      const [c, a] = pts;
      const r = Math.hypot((a.x - c.x) * v.w, (a.y - c.y) * v.h);
      const d = Math.hypot((p.x - c.x) * v.w, (p.y - c.y) * v.h);
      return Math.abs(d - r) <= tol;
    }

    case "angle": {
      // الزاوية: إصابة أيّ من شعاعيها
      if (pts.length < 3) return false;
      const [vx, r1, r2] = pts;
      return (
        distToSegment(p, vx, r1, v) <= tol || distToSegment(p, vx, r2, v) <= tol
      );
    }

    case "rect": {
      // الإطار وحده قابل للإصابة، لا داخله — وإلا التقط مستطيلٌ كبير كل ما تحته
      if (pts.length < 2) return false;
      const [a, c] = pts;
      const corners = [
        { x: a.x, y: a.y }, { x: c.x, y: a.y },
        { x: c.x, y: c.y }, { x: a.x, y: c.y },
      ];
      for (let i = 0; i < 4; i++) {
        if (distToSegment(p, corners[i], corners[(i + 1) % 4], v) <= tol) return true;
      }
      return false;
    }

    case "ellipse": {
      if (pts.length < 2) return false;
      const [a, c] = pts;
      const cx = ((a.x + c.x) / 2) * v.w, cy = ((a.y + c.y) / 2) * v.h;
      const rx = (Math.abs(c.x - a.x) / 2) * v.w, ry = (Math.abs(c.y - a.y) / 2) * v.h;
      if (rx < 1 || ry < 1) return false;
      const px = p.x * v.w, py = p.y * v.h;
      // قيمة المعادلة البارامترية: 1 يعني على المحيط تماماً
      const val = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2;
      const inner = ((Math.max(rx - tol, 1)) / rx) ** 2;
      const outer = ((rx + tol) / rx) ** 2;
      return val <= outer && val >= inner * 0.5;
    }

    default: {
      // pen · highlighter · line · arrow · eraser → سلسلة قطع
      if (pts.length === 1) {
        return Math.hypot((p.x - pts[0].x) * v.w, (p.y - pts[0].y) * v.h) <= tol;
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(p, pts[i], pts[i + 1], v) <= tol) return true;
      }
      return false;
    }
  }
}

/**
 * أي شكل تحت هذه النقطة؟
 * نبدأ من الآخر: الأحدث مرسوم فوق، فهو ما يراه المستخدم ويتوقّع اختياره.
 */
export function pickShape<T extends GeoShape>(
  shapes: T[], p: GeoPoint, v: Viewport, tolPx = 12
): T | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTest(shapes[i], p, v, tolPx)) return shapes[i];
  }
  return null;
}

/** وصف مختصر للشكل — يُعرض في شريط التحديد وفي البطاقات لاحقاً */
export function describeShape(s: GeoShape): string {
  switch (s.kind) {
    case "text": return s.text ? `نص: ${s.text.slice(0, 24)}` : "نص";
    case "note": return s.text ? `بطاقة: ${s.text.slice(0, 24)}` : "بطاقة";
    case "arc": return "قوس";
    case "angle": return "زاوية";
    case "rect": return "مستطيل";
    case "ellipse": return "دائرة";
    case "line": return "خط";
    case "arrow": return "سهم";
    case "highlighter": return "تظليل";
    default: return "رسم";
  }
}
