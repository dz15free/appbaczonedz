/* ════════════════════════════════════════════════════════════
   نموذج الكائن — أساس السبورة كلّها

   كل شيء على السبورة كائن: رسم حرّ، شكل، نصّ، معادلة، صورة،
   ملاحظة لاصقة، وكل أداة تعليمية مستقبلية.

   النواة تعرف **صناديق** فقط. ما بداخل `data` يخصّ النوع نفسه،
   ويُفسَّر عبر السجلّ (registry.ts). لهذا تصبح إضافة أداة جديدة
   ملفّاً جديداً + سطر تسجيل، بلا لمس المحرّك.
════════════════════════════════════════════════════════════ */

/** طبقات السبورة — قابلة للتوسّع مستقبلاً */
export type LayerId =
  | "teacher"     // سبورة الأستاذ (المصدر الرسمي للدرس)
  | "personal"    // طبقة الطالب الخاصّة (لا يراها أحد غيره)
  | "temp"        // مؤقّتة: تُمسح تلقائيّاً (شرح عابر، إشارة)
  | "annotation"; // تعليقات فوق محتوى (PDF، صورة، رسم)

/** ترتيب رسم الطبقات من الأسفل للأعلى */
export const LAYER_ORDER: LayerId[] = ["teacher", "annotation", "personal", "temp"];

export interface ObjectStyle {
  color: string;
  /** سماكة الخط — تُخزَّن نسبةً لعرض العالم فلا تتشوّه عند التحجيم */
  width: number;
  fill?: string;
  opacity?: number;
  dash?: "solid" | "dashed" | "dotted";
  fontSize?: number;   // نسبة من ارتفاع العالم
  fontWeight?: number;
}

/** الصندوق في إحداثيات العالم الافتراضي (وحدات العالم، لا بكسلات) */
export interface Box { x: number; y: number; w: number; h: number }

export interface BoardObject<D = unknown> {
  id: string;
  uid: string;                 // من أنشأه
  type: string;                // مفتاح في السجلّ
  layer: LayerId;

  // الصندوق + الدوران = كل ما يحتاجه المحرّك للتحويل
  x: number; y: number; w: number; h: number;
  angle: number;               // راديان

  z: number;                   // ترتيب داخل الطبقة
  locked?: boolean;

  style: ObjectStyle;
  data: D;                     // بيانات خاصّة بالنوع

  meta?: {
    step?: number;             // للكشف التدريجي
    createdAt: number;
    updatedAt?: number;
  };

  /** نسخة النموذج — غيابها يعني كائناً قديماً (نظام الخطوط) */
  v: 2;
}

/** قدرات النوع — تُعلَن في السجلّ، والمحرّك يحترمها */
export interface Capabilities {
  move: boolean;
  /** free = تحجيم حرّ · uniform = يحافظ على النسبة · none = لا تحجيم */
  resize: "free" | "uniform" | "none";
  rotate: boolean;
  /** هل يمكن تحريره مباشرةً بالنقر المزدوج؟ */
  edit: boolean;
}

export const DEFAULT_CAPS: Capabilities = {
  move: true, resize: "free", rotate: true, edit: false,
};

/* ── أدوات الصندوق ─────────────────────────────────────── */

export function boxOf(o: BoardObject): Box {
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

/** الصندوق المحاذي للمحاور بعد أخذ الدوران في الحسبان */
export function aabbOf(o: BoardObject): Box {
  if (!o.angle) return boxOf(o);
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  const cos = Math.abs(Math.cos(o.angle)), sin = Math.abs(Math.sin(o.angle));
  const w = o.w * cos + o.h * sin;
  const h = o.w * sin + o.h * cos;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** صندوق يضمّ عدّة كائنات — للتحديد المتعدّد */
export function unionBox(objs: BoardObject[]): Box | null {
  if (!objs.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of objs) {
    const b = aabbOf(o);
    if (b.x < x0) x0 = b.x;
    if (b.y < y0) y0 = b.y;
    if (b.x + b.w > x1) x1 = b.x + b.w;
    if (b.y + b.h > y1) y1 = b.y + b.h;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** تحويل نقطة عالمية إلى إحداثيات الكائن المحلّية (يفكّ الدوران) */
export function toLocal(o: BoardObject, px: number, py: number): { x: number; y: number } {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (!o.angle) return { x: px - o.x, y: py - o.y };
  const c = Math.cos(-o.angle), s = Math.sin(-o.angle);
  const dx = px - cx, dy = py - cy;
  return { x: dx * c - dy * s + o.w / 2, y: dx * s + dy * c + o.h / 2 };
}

export function pointInBox(b: Box, px: number, py: number, pad = 0): boolean {
  return px >= b.x - pad && px <= b.x + b.w + pad
      && py >= b.y - pad && py <= b.y + b.h + pad;
}

export function boxesIntersect(a: Box, b: Box): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

/** معرّف فريد قصير */
export function newId(uid: string): string {
  return `${uid.slice(0, 6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** تطبيع صندوق قد يكون سالب الأبعاد (السحب للخلف) */
export function normalizeBox(b: Box): Box {
  return {
    x: b.w < 0 ? b.x + b.w : b.x,
    y: b.h < 0 ? b.y + b.h : b.y,
    w: Math.abs(b.w),
    h: Math.abs(b.h),
  };
}
