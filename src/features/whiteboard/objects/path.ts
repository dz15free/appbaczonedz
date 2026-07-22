/* الرسم الحرّ — نقاط مخزّنة نسبةً للصندوق (0..1)
   فيتحرّك ويتحجّم بتغيير الصندوق وحده، بلا لمس النقاط.
   السماكة تُخزَّن نسبيّاً أيضاً فلا تتشوّه عند التحجيم. */

import { register, type RenderContext } from "../core/registry";
import type { BoardObject } from "../core/board-object";

export interface PathData {
  points: { x: number; y: number }[];   // 0..1 داخل الصندوق
  highlighter?: boolean;
  /** إن كان ناتجاً عن تعرّف تلقائي نحتفظ بالأصل للتراجع */
  original?: { x: number; y: number }[];
}

function strokePath(obj: BoardObject<PathData>, rc: RenderContext, close = false) {
  const { ctx, scale } = rc;
  const pts = obj.data.points;
  if (!pts?.length) return;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const px = (obj.x + pts[i].x * obj.w) * scale;
    const py = (obj.y + pts[i].y * obj.h) * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}

register<PathData>({
  type: "path",
  label: "رسم حرّ",
  caps: { move: true, resize: "free", rotate: true, edit: false },

  render(obj, rc) {
    const { ctx, scale } = rc;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = Math.max(obj.style.width * scale, 0.5);
    if (obj.data.highlighter) ctx.globalAlpha = (obj.style.opacity ?? 0.35);
    strokePath(obj, rc);
  },

  hitTest(obj, lx, ly, tol) {
    const pts = obj.data.points;
    if (!pts?.length) return false;
    // النقاط نسبية → نحوّلها لإحداثيات محلّية بالوحدات
    const toL = (p: { x: number; y: number }) => ({ x: p.x * obj.w, y: p.y * obj.h });
    if (pts.length === 1) {
      const a = toL(pts[0]);
      return Math.hypot(lx - a.x, ly - a.y) <= tol;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = toL(pts[i]), b = toL(pts[i + 1]);
      if (distToSeg(lx, ly, a.x, a.y, b.x, b.y) <= tol) return true;
    }
    return false;
  },

  describe(obj) {
    return obj.data.highlighter ? "تظليل" : "رسم";
  },
});

export function distToSeg(
  px: number, py: number, ax: number, ay: number, bx: number, by: number
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
