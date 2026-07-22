/* طبقة التحديد — إطار ومقابض بمظهر مصقول.
   المقابض تكبر على اللمس (٢٤px) وتصغر على الفأرة (١٢px). */

import type { Box } from "../core/board-object";
import type { Camera } from "../core/camera";
import { handlesFor } from "../input/transform";

export interface OverlayOpts {
  touch: boolean;
  allowResize: boolean;
  allowRotate: boolean;
  /** إطار تحديد بالسحب (اختياري) */
  marquee?: Box | null;
}

const ACCENT = "#2563eb";

export function drawSelection(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  box: Box | null,
  opts: OverlayOpts
): void {
  if (opts.marquee) {
    const m = opts.marquee;
    ctx.save();
    ctx.fillStyle = "rgba(37,99,235,.08)";
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.fillRect(m.x * cam.scale, m.y * cam.scale, m.w * cam.scale, m.h * cam.scale);
    ctx.strokeRect(m.x * cam.scale, m.y * cam.scale, m.w * cam.scale, m.h * cam.scale);
    ctx.restore();
  }

  if (!box) return;

  const s = cam.scale;
  const hs = (opts.touch ? 11 : 6);          // نصف حجم المقبض بالبكسل
  const rotOffPx = opts.touch ? 34 : 26;
  const rotOffset = rotOffPx / s;

  ctx.save();
  // الإطار
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(box.x * s, box.y * s, box.w * s, box.h * s);

  // المقابض
  for (const h of handlesFor(box, rotOffset)) {
    if (h.id === "rotate") {
      if (!opts.allowRotate) continue;
      // خيط يصل لمقبض التدوير
      ctx.beginPath();
      ctx.moveTo((box.x + box.w / 2) * s, box.y * s);
      ctx.lineTo(h.x * s, h.y * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x * s, h.y * s, hs, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.stroke();
      continue;
    }
    if (!opts.allowResize) continue;
    ctx.fillStyle = "#fff";
    ctx.fillRect(h.x * s - hs, h.y * s - hs, hs * 2, hs * 2);
    ctx.strokeRect(h.x * s - hs, h.y * s - hs, hs * 2, hs * 2);
  }
  ctx.restore();
}

/** تمييز خفيف للكائن تحت المؤشّر — يجعل الإصابة محسوسة */
export function drawHover(ctx: CanvasRenderingContext2D, cam: Camera, box: Box): void {
  ctx.save();
  ctx.strokeStyle = "rgba(37,99,235,.45)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(box.x * cam.scale, box.y * cam.scale, box.w * cam.scale, box.h * cam.scale);
  ctx.restore();
}
