/* المحاذاة الذكية — أدلّة تظهر أثناء السحب.
   عتبة بوحدات العالم يمرّرها المستدعي (تُحسب من مقياس الشاشة
   حتى تبقى ٦px مهما كان التكبير). */

import type { BoardObject, Box } from "../core/board-object";
import { aabbOf } from "../core/board-object";

export interface Guide { axis: "x" | "y"; at: number; from: number; to: number }

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** خطوط المحاذاة لصندوق: البداية، المنتصف، النهاية */
function linesX(b: Box): number[] { return [b.x, b.x + b.w / 2, b.x + b.w]; }
function linesY(b: Box): number[] { return [b.y, b.y + b.h / 2, b.y + b.h]; }

/**
 * يحسب إزاحة صغيرة تُحاذي الصندوق المتحرّك مع الكائنات الأخرى.
 * يرجع dx/dy لتطبيقهما، وأدلّة للرسم.
 */
export function computeSnap(
  moving: Box,
  others: BoardObject[],
  tol: number
): SnapResult {
  let bestX: { d: number; at: number; target: number } | null = null;
  let bestY: { d: number; at: number; target: number } | null = null;

  const mx = linesX(moving), my = linesY(moving);

  for (const o of others) {
    const b = aabbOf(o);
    for (const ox of linesX(b)) {
      for (const m of mx) {
        const d = Math.abs(m - ox);
        if (d <= tol && (!bestX || d < bestX.d)) bestX = { d, at: ox, target: m };
      }
    }
    for (const oy of linesY(b)) {
      for (const m of my) {
        const d = Math.abs(m - oy);
        if (d <= tol && (!bestY || d < bestY.d)) bestY = { d, at: oy, target: m };
      }
    }
  }

  const guides: Guide[] = [];
  let dx = 0, dy = 0;

  if (bestX) {
    dx = bestX.at - bestX.target;
    guides.push({ axis: "x", at: bestX.at, from: moving.y - 40, to: moving.y + moving.h + 40 });
  }
  if (bestY) {
    dy = bestY.at - bestY.target;
    guides.push({ axis: "y", at: bestY.at, from: moving.x - 40, to: moving.x + moving.w + 40 });
  }

  return { dx, dy, guides };
}
