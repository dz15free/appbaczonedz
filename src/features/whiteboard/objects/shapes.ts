/* الأشكال الهندسية — كائنات حقيقية بصندوق ودوران.
   كلها تُرسم من الصندوق، فالتحريك والتحجيم مجّانيان. */

import { register, type RenderContext } from "../core/registry";
import type { BoardObject } from "../core/board-object";
import { distToSeg } from "./path";

/** الأشكال الهندسية لا تحتاج بيانات إضافية — الصندوق يكفي */
export type ShapeData = Record<string, never>;

function prep(obj: BoardObject, rc: RenderContext) {
  const { ctx, scale } = rc;
  ctx.strokeStyle = obj.style.color;
  ctx.lineWidth = Math.max(obj.style.width * scale, 0.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (obj.style.dash === "dashed") ctx.setLineDash([8 * scale * obj.style.width, 6 * scale * obj.style.width]);
  else if (obj.style.dash === "dotted") ctx.setLineDash([1, 4 * scale * obj.style.width]);
  else ctx.setLineDash([]);
  return { x: obj.x * scale, y: obj.y * scale, w: obj.w * scale, h: obj.h * scale };
}

/* ── خط ─────────────────────────────────────────────── */
register<ShapeData>({
  type: "line",
  label: "خط",
  caps: { move: true, resize: "free", rotate: true, edit: false },
  render(obj, rc) {
    const b = prep(obj, rc);
    rc.ctx.beginPath();
    rc.ctx.moveTo(b.x, b.y);
    rc.ctx.lineTo(b.x + b.w, b.y + b.h);
    rc.ctx.stroke();
  },
  hitTest(obj, lx, ly, tol) {
    return distToSeg(lx, ly, 0, 0, obj.w, obj.h) <= tol;
  },
  describe: () => "خط",
});

/* ── سهم ────────────────────────────────────────────── */
register<ShapeData>({
  type: "arrow",
  label: "سهم",
  caps: { move: true, resize: "free", rotate: true, edit: false },
  render(obj, rc) {
    const b = prep(obj, rc);
    const { ctx } = rc;
    const x2 = b.x + b.w, y2 = b.y + b.h;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // رأس السهم — حجمه يتبع سماكة الخط فيبقى متناسقاً
    const ang = Math.atan2(b.h, b.w);
    const head = Math.max(10, obj.style.width * rc.scale * 3.5);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
    ctx.stroke();
  },
  hitTest(obj, lx, ly, tol) {
    return distToSeg(lx, ly, 0, 0, obj.w, obj.h) <= tol;
  },
  describe: () => "سهم",
});

/* ── مستطيل ─────────────────────────────────────────── */
register<ShapeData>({
  type: "rect",
  label: "مستطيل",
  caps: { move: true, resize: "free", rotate: true, edit: false },
  render(obj, rc) {
    const b = prep(obj, rc);
    if (obj.style.fill) { rc.ctx.fillStyle = obj.style.fill; rc.ctx.fillRect(b.x, b.y, b.w, b.h); }
    rc.ctx.strokeRect(b.x, b.y, b.w, b.h);
  },
  hitTest(obj, lx, ly, tol) {
    if (obj.style.fill) {
      return lx >= -tol && ly >= -tol && lx <= obj.w + tol && ly <= obj.h + tol;
    }
    // بلا تعبئة: الإطار فقط — وإلا التقط مستطيل كبير كل ما تحته
    const near = (v: number, t: number) => Math.abs(v - t) <= tol;
    const inX = lx >= -tol && lx <= obj.w + tol;
    const inY = ly >= -tol && ly <= obj.h + tol;
    return (inX && (near(ly, 0) || near(ly, obj.h))) || (inY && (near(lx, 0) || near(lx, obj.w)));
  },
  describe: () => "مستطيل",
});

/* ── دائرة / بيضاوي ─────────────────────────────────── */
register<ShapeData>({
  type: "ellipse",
  label: "دائرة",
  caps: { move: true, resize: "free", rotate: true, edit: false },
  render(obj, rc) {
    const b = prep(obj, rc);
    const { ctx } = rc;
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.abs(b.w / 2), Math.abs(b.h / 2), 0, 0, Math.PI * 2);
    if (obj.style.fill) { ctx.fillStyle = obj.style.fill; ctx.fill(); }
    ctx.stroke();
  },
  hitTest(obj, lx, ly, tol) {
    const rx = obj.w / 2, ry = obj.h / 2;
    if (rx < 0.5 || ry < 0.5) return false;
    const nx = (lx - rx) / rx, ny = (ly - ry) / ry;
    const val = nx * nx + ny * ny;
    if (obj.style.fill) return val <= 1 + tol / Math.max(rx, ry);
    const band = tol / Math.min(rx, ry);
    return val <= (1 + band) ** 2 && val >= Math.max(0, 1 - band) ** 2;
  },
  describe: () => "دائرة",
});

/* ── مثلّث ──────────────────────────────────────────── */
register<ShapeData>({
  type: "triangle",
  label: "مثلّث",
  caps: { move: true, resize: "free", rotate: true, edit: false },
  render(obj, rc) {
    const b = prep(obj, rc);
    const { ctx } = rc;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w / 2, b.y);
    ctx.lineTo(b.x + b.w, b.y + b.h);
    ctx.lineTo(b.x, b.y + b.h);
    ctx.closePath();
    if (obj.style.fill) { ctx.fillStyle = obj.style.fill; ctx.fill(); }
    ctx.stroke();
  },
  hitTest(obj, lx, ly, tol) {
    const pts = [
      { x: obj.w / 2, y: 0 }, { x: obj.w, y: obj.h }, { x: 0, y: obj.h },
    ];
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      if (distToSeg(lx, ly, a.x, a.y, b.x, b.y) <= tol) return true;
    }
    return false;
  },
  describe: () => "مثلّث",
});
