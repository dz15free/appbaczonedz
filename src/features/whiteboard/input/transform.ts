/* ════════════════════════════════════════════════════════════
   التحويل — تحريك، تحجيم، تدوير

   يعمل على **صناديق**، فينطبق على كل الأنواع تلقائيّاً:
   نصّ، معادلة، صورة، رسم حرّ، وأي أداة مستقبلية.

   القدرات تُقرأ من السجلّ: نوع يمنع التدوير لا تظهر له يد التدوير.
════════════════════════════════════════════════════════════ */

import type { BoardObject, Box } from "../core/board-object";
import { normalizeBox } from "../core/board-object";
import { capsOf } from "../core/registry";

export type HandleId =
  | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate" | "move";

export interface Handle { id: HandleId; x: number; y: number }

/** مواضع المقابض بوحدات العالم حول صندوق */
export function handlesFor(b: Box, rotateOffset: number): Handle[] {
  const { x, y, w, h } = b;
  return [
    { id: "nw", x, y },
    { id: "n", x: x + w / 2, y },
    { id: "ne", x: x + w, y },
    { id: "e", x: x + w, y: y + h / 2 },
    { id: "se", x: x + w, y: y + h },
    { id: "s", x: x + w / 2, y: y + h },
    { id: "sw", x, y: y + h },
    { id: "w", x, y: y + h / 2 },
    { id: "rotate", x: x + w / 2, y: y - rotateOffset },
  ];
}

/** أي مقبض تحت النقطة؟ (tol بوحدات العالم — أكبر للمس) */
export function pickHandle(
  b: Box, px: number, py: number, tol: number, rotateOffset: number,
  allow: { resize: boolean; rotate: boolean }
): HandleId | null {
  for (const h of handlesFor(b, rotateOffset)) {
    if (h.id === "rotate" && !allow.rotate) continue;
    if (h.id !== "rotate" && !allow.resize) continue;
    if (Math.abs(px - h.x) <= tol && Math.abs(py - h.y) <= tol) return h.id;
  }
  return null;
}

/** القدرات المشتركة لمجموعة مختارة — الأقلّ صلاحيةً يحكم */
export function combinedCaps(objs: BoardObject[]) {
  let move = true, rotate = true;
  let resize: "free" | "uniform" | "none" = "free";
  for (const o of objs) {
    const c = capsOf(o.type);
    if (!c.move) move = false;
    if (!c.rotate) rotate = false;
    if (c.resize === "none") resize = "none";
    else if (c.resize === "uniform" && resize !== "none") resize = "uniform";
  }
  return { move, rotate, resize };
}

/** تطبيق تحجيم من مقبض على صندوق */
export function resizeBox(
  start: Box, handle: HandleId, dx: number, dy: number, uniform: boolean
): Box {
  let { x, y, w, h } = start;
  const ratio = start.h === 0 ? 1 : start.w / start.h;

  switch (handle) {
    case "nw": x += dx; y += dy; w -= dx; h -= dy; break;
    case "n":  y += dy; h -= dy; break;
    case "ne": y += dy; w += dx; h -= dy; break;
    case "e":  w += dx; break;
    case "se": w += dx; h += dy; break;
    case "s":  h += dy; break;
    case "sw": x += dx; w -= dx; h += dy; break;
    case "w":  x += dx; w -= dx; break;
    default: break;
  }

  if (uniform && w !== 0 && h !== 0) {
    // نحافظ على النسبة — مهمّ للنصّ والصور
    const byW = Math.abs(w) > Math.abs(h * ratio);
    if (byW) h = w / ratio; else w = h * ratio;
  }

  return normalizeBox({ x, y, w, h });
}

/** زاوية من مركز الصندوق إلى نقطة */
export function angleTo(b: Box, px: number, py: number): number {
  return Math.atan2(py - (b.y + b.h / 2), px - (b.x + b.w / 2)) + Math.PI / 2;
}

/** محاذاة الزاوية لأقرب ١٥° عند الضغط على Shift */
export function snapAngle(a: number): number {
  const step = Math.PI / 12;
  return Math.round(a / step) * step;
}

/** إعادة توزيع تحويل الصندوق الجماعي على كائناته (نسبيّاً) */
export function applyGroupBox(
  objs: BoardObject[], before: Box, after: Box
): Map<string, Partial<BoardObject>> {
  const out = new Map<string, Partial<BoardObject>>();
  const sx = before.w === 0 ? 1 : after.w / before.w;
  const sy = before.h === 0 ? 1 : after.h / before.h;
  for (const o of objs) {
    out.set(o.id, {
      x: after.x + (o.x - before.x) * sx,
      y: after.y + (o.y - before.y) * sy,
      w: o.w * sx,
      h: o.h * sy,
    });
  }
  return out;
}
