/* النصّ والملاحظة اللاصقة.

   الفارق الجوهري عن النظام القديم: العرض **يُقاس فعليّاً**
   بـ ctx.measureText بدل تخمين (عدد الحروف × 0.62) الذي كان
   يجعل تحديد النصّ العربي غير دقيق. */

import { register } from "../core/registry";
import type { BoardObject } from "../core/board-object";

export interface TextData { text: string; align?: "right" | "center" | "left" }

/** قياس نصّ متعدّد الأسطر بوحدات العالم */
export function measureText(
  ctx: CanvasRenderingContext2D, text: string, fontPx: number, weight = 700
): { w: number; h: number; lines: string[] } {
  const lines = (text || "").split("\n");
  ctx.save();
  ctx.font = `${weight} ${fontPx}px system-ui, sans-serif`;
  let w = 0;
  for (const ln of lines) w = Math.max(w, ctx.measureText(ln).width);
  ctx.restore();
  return { w, h: lines.length * fontPx * 1.3, lines };
}

function fontPxOf(obj: BoardObject<TextData>, scale: number): number {
  return Math.max((obj.style.fontSize ?? 28) * scale, 1);
}

register<TextData>({
  type: "text",
  label: "نصّ",
  // التدوير مسموح للنصّ، لكن التحجيم موحّد حتى لا تتشوّه الحروف
  caps: { move: true, resize: "uniform", rotate: true, edit: true },

  render(obj, rc) {
    const { ctx, scale } = rc;
    const fp = fontPxOf(obj, scale);
    const m = measureText(ctx, obj.data.text, fp, obj.style.fontWeight ?? 700);
    ctx.fillStyle = obj.style.color;
    ctx.font = `${obj.style.fontWeight ?? 700} ${fp}px system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.direction = "rtl";
    const x = obj.x * scale, y = obj.y * scale;
    m.lines.forEach((ln, i) => {
      const lw = ctx.measureText(ln).width;
      let lx = x;
      if (obj.data.align === "center") lx = x + (obj.w * scale - lw) / 2;
      else if (obj.data.align === "right") lx = x + (obj.w * scale - lw);
      ctx.fillText(ln, lx, y + i * fp * 1.3);
    });
  },

  // الصندوق كافٍ للنصّ — وهو الآن دقيق لأنّه محسوب بقياس حقيقي
  describe: (obj) => (obj.data.text ? `نص: ${obj.data.text.slice(0, 24)}` : "نص"),

  toFlashcard: (obj) => (obj.data.text ? { front: obj.data.text } : null),
});

/* ── ملاحظة لاصقة ───────────────────────────────────── */

register<TextData>({
  type: "sticky",
  label: "ملاحظة",
  caps: { move: true, resize: "free", rotate: true, edit: true },

  render(obj, rc) {
    const { ctx, scale } = rc;
    const x = obj.x * scale, y = obj.y * scale;
    const w = obj.w * scale, h = obj.h * scale;
    // ورقة بظلّ خفيف
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.18)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = obj.style.fill || "#fef9c3";
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    const fp = Math.max((obj.style.fontSize ?? 22) * scale, 1);
    const pad = 8 * scale;
    const m = measureText(ctx, obj.data.text, fp, 600);
    ctx.fillStyle = obj.style.color || "#422006";
    ctx.font = `600 ${fp}px system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.direction = "rtl";
    m.lines.forEach((ln, i) => {
      const lw = ctx.measureText(ln).width;
      ctx.fillText(ln, x + w - pad - lw, y + pad + i * fp * 1.3);
    });
  },

  describe: (obj) => (obj.data.text ? `ملاحظة: ${obj.data.text.slice(0, 20)}` : "ملاحظة"),
  toFlashcard: (obj) => (obj.data.text ? { front: obj.data.text } : null),
});
