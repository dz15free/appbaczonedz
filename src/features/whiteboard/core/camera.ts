/* ════════════════════════════════════════════════════════════
   الكاميرا — تحلّ أخطر مشكلة كانت في السبورة

   المشكلة القديمة: اللوحة كانت تأخذ شكل الحاوية، والإحداثيات
   نسبية (0..1). فالدائرة المرسومة على الحاسوب تصل الطالب على
   الهاتف **بيضاويّة**، والمثلّث القائم يفقد زاويته.
   هذا خطأ في صحّة المحتوى التعليمي، لا مجرّد شكل.

   الحلّ: عالم افتراضي بنسبة ثابتة. كل الإحداثيات بوحدات العالم.
   الشاشة تعرض هذا العالم بـ«احتواء» موسّط. فما يراه الأستاذ هو
   ما يراه الطالب بالضبط، على أي جهاز.

   ومع ذلك السبورة **غير محدودة**: الأستاذ يتنقّل ويكبّر بحرّية،
   و«الصفحة» (WORLD_W × WORLD_H) هي موضع البداية المتّفق عليه —
   زرّ «العودة للمركز» يُرجع الجميع إليها فلا يضيع أحد.
════════════════════════════════════════════════════════════ */

/** أبعاد صفحة العالم — نسبة 16:10 مريحة للتدريس */
export const WORLD_W = 1600;
export const WORLD_H = 1000;

export interface Camera {
  /** مركز الرؤية بوحدات العالم */
  cx: number;
  cy: number;
  /** بكسل لكل وحدة عالم */
  scale: number;
}

export interface Viewport {
  /** أبعاد لوحة العرض بالبكسل (CSS) */
  w: number;
  h: number;
}

export const MIN_SCALE_FACTOR = 0.4;   // أقصى تصغير نسبةً لمقياس «الاحتواء»
export const MAX_SCALE_FACTOR = 6;     // أقصى تكبير

/** المقياس الذي يجعل صفحة العالم تملأ الشاشة مع احتواء كامل */
export function fitScale(vp: Viewport): number {
  if (vp.w <= 0 || vp.h <= 0) return 1;
  return Math.min(vp.w / WORLD_W, vp.h / WORLD_H);
}

/** كاميرا البداية: الصفحة كاملة، موسّطة */
export function homeCamera(vp: Viewport): Camera {
  return { cx: WORLD_W / 2, cy: WORLD_H / 2, scale: fitScale(vp) };
}

export function clampScale(scale: number, vp: Viewport): number {
  const f = fitScale(vp);
  return Math.min(Math.max(scale, f * MIN_SCALE_FACTOR), f * MAX_SCALE_FACTOR);
}

/* ── تحويلات الإحداثيات ───────────────────────────────── */

/** عالم → شاشة (بكسل CSS) */
export function worldToScreen(cam: Camera, vp: Viewport, wx: number, wy: number) {
  return {
    x: (wx - cam.cx) * cam.scale + vp.w / 2,
    y: (wy - cam.cy) * cam.scale + vp.h / 2,
  };
}

/** شاشة → عالم */
export function screenToWorld(cam: Camera, vp: Viewport, sx: number, sy: number) {
  return {
    x: (sx - vp.w / 2) / cam.scale + cam.cx,
    y: (sy - vp.h / 2) / cam.scale + cam.cy,
  };
}

/** تكبير حول نقطة شاشة محدّدة (إصبعان أو عجلة) — يبقى ما تحت الإصبع ثابتاً */
export function zoomAt(
  cam: Camera, vp: Viewport, sx: number, sy: number, factor: number
): Camera {
  const before = screenToWorld(cam, vp, sx, sy);
  const scale = clampScale(cam.scale * factor, vp);
  const after = screenToWorld({ ...cam, scale }, vp, sx, sy);
  return { cx: cam.cx + (before.x - after.x), cy: cam.cy + (before.y - after.y), scale };
}

/** تحريك الكاميرا بإزاحة شاشة */
export function panBy(cam: Camera, dxPx: number, dyPx: number): Camera {
  return { ...cam, cx: cam.cx - dxPx / cam.scale, cy: cam.cy - dyPx / cam.scale };
}

/** هل ابتعدت الكاميرا عن الصفحة الأساسية؟ (لإظهار زرّ العودة) */
export function isAwayFromHome(cam: Camera, vp: Viewport): boolean {
  const dx = Math.abs(cam.cx - WORLD_W / 2);
  const dy = Math.abs(cam.cy - WORLD_H / 2);
  const f = fitScale(vp);
  return dx > WORLD_W * 0.25 || dy > WORLD_H * 0.25 || Math.abs(cam.scale / f - 1) > 0.15;
}

/** حركة انتقال ناعمة بين كاميرتين (0..1) */
export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    scale: a.scale + (b.scale - a.scale) * e,
  };
}

/** حدود المنطقة المرئية بوحدات العالم — لتخطّي رسم ما هو خارجها */
export function visibleBounds(cam: Camera, vp: Viewport) {
  const halfW = vp.w / 2 / cam.scale;
  const halfH = vp.h / 2 / cam.scale;
  return { x: cam.cx - halfW, y: cam.cy - halfH, w: halfW * 2, h: halfH * 2 };
}
