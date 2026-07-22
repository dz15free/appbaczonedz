/* ════════════════════════════════════════════════════════════
   المحرّك البصري — ثلاث طبقات بدل لوحة واحدة تراكمية

     static  : الكائنات الثابتة — تُعاد عند تغيّر المشهد فقط
     active  : ما يُرسم/يُسحب الآن — كل إطار
     overlay : التحديد والمقابض وأدلّة المحاذاة — كل إطار

   لماذا؟ لأنّ سحب كائن واحد كان سيعيد رسم كل الكائنات.
   بهذا الفصل يبقى الأداء ٦٠ إطاراً حتى على هاتف متوسّط.

   كل الرسم عبر requestAnimationFrame مع علم «متّسخ» (dirty)،
   فلا رسم فوري عند كل حدث مؤشّر.
════════════════════════════════════════════════════════════ */

import type { Scene } from "../core/scene";
import type { LayerId } from "../core/board-object";
import { renderObject } from "../core/registry";
import type { Camera, Viewport } from "../core/camera";
import { WORLD_W, WORLD_H, visibleBounds, worldToScreen } from "../core/camera";

export interface Layers {
  staticC: HTMLCanvasElement;
  activeC: HTMLCanvasElement;
  overlayC: HTMLCanvasElement;
}

export function dpr(): number {
  return typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2.5);
}

/** ضبط أبعاد لوحة لتطابق حاويتها بدقّة الشاشة */
export function sizeCanvas(c: HTMLCanvasElement, w: number, h: number): void {
  const r = dpr();
  c.width = Math.max(1, Math.floor(w * r));
  c.height = Math.max(1, Math.floor(h * r));
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
}

export class Renderer {
  private raf = 0;
  private dirtyStatic = true;
  private dirtyOverlay = true;
  private lastVersion = -1;

  constructor(
    private layers: Layers,
    private scene: Scene,
    private getCamera: () => Camera,
    private getViewport: () => Viewport,
    private getVisibleLayers: () => Set<LayerId>,
    private drawOverlay: (ctx: CanvasRenderingContext2D, cam: Camera, vp: Viewport) => void,
    private drawActive?: (ctx: CanvasRenderingContext2D, cam: Camera, vp: Viewport) => void,
  ) {}

  /** اطلب إعادة رسم — تُجمَّع في إطار واحد */
  invalidate(what: "static" | "overlay" | "all" = "all"): void {
    if (what === "static" || what === "all") this.dirtyStatic = true;
    if (what === "overlay" || what === "all") this.dirtyOverlay = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  /** حلقة مستمرّة أثناء التفاعل (سحب/رسم) */
  startLoop(): void {
    const tick = () => {
      this.draw();
      if (this.looping) this.raf = requestAnimationFrame(tick);
    };
    if (!this.looping) {
      this.looping = true;
      this.raf = requestAnimationFrame(tick);
    }
  }
  stopLoop(): void {
    this.looping = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.invalidate("all");
  }
  private looping = false;

  private applyTransform(ctx: CanvasRenderingContext2D, cam: Camera, vp: Viewport): void {
    const r = dpr();
    ctx.setTransform(r, 0, 0, r, 0, 0);
    // نُحوّل بحيث يصبح رسم الكائنات بوحدات العالم × المقياس
    ctx.translate(vp.w / 2 - cam.cx * cam.scale, vp.h / 2 - cam.cy * cam.scale);
  }

  private draw(): void {
    const cam = this.getCamera();
    const vp = this.getViewport();
    if (vp.w <= 0 || vp.h <= 0) return;

    const sceneChanged = this.scene.version !== this.lastVersion;
    if (sceneChanged) { this.dirtyStatic = true; this.lastVersion = this.scene.version; }

    if (this.dirtyStatic) {
      const ctx = this.layers.staticC.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.layers.staticC.width, this.layers.staticC.height);
        this.applyTransform(ctx, cam, vp);
        this.drawPage(ctx, cam);
        const area = visibleBounds(cam, vp);
        const vis = this.getVisibleLayers();
        for (const o of this.scene.inBox(area, vis)) {
          renderObject(o, { ctx, scale: cam.scale, selected: false });
        }
      }
      this.dirtyStatic = false;
    }

    // الطبقة النشطة تُمسح دائماً (محتواها لحظي)
    const actx = this.layers.activeC.getContext("2d");
    if (actx) {
      actx.setTransform(1, 0, 0, 1, 0, 0);
      actx.clearRect(0, 0, this.layers.activeC.width, this.layers.activeC.height);
      if (this.drawActive) {
        this.applyTransform(actx, cam, vp);
        this.drawActive(actx, cam, vp);
      }
    }

    if (this.dirtyOverlay || this.looping) {
      const octx = this.layers.overlayC.getContext("2d");
      if (octx) {
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, this.layers.overlayC.width, this.layers.overlayC.height);
        this.applyTransform(octx, cam, vp);
        this.drawOverlay(octx, cam, vp);
      }
      this.dirtyOverlay = false;
    }
  }

  /** حدود «صفحة» العالم — تُطمئن المستخدم أين يقف في مساحة لا نهائية */
  private drawPage(ctx: CanvasRenderingContext2D, cam: Camera): void {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WORLD_W * cam.scale, WORLD_H * cam.scale);
    ctx.strokeStyle = "rgba(15,23,42,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, WORLD_W * cam.scale, WORLD_H * cam.scale);
    ctx.restore();
  }

  destroy(): void {
    this.looping = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

/** رسم أدلّة المحاذاة */
export function drawGuides(
  ctx: CanvasRenderingContext2D, cam: Camera,
  guides: { axis: "x" | "y"; at: number; from: number; to: number }[]
): void {
  if (!guides.length) return;
  ctx.save();
  ctx.strokeStyle = "#ec4899";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (const g of guides) {
    ctx.beginPath();
    if (g.axis === "x") {
      ctx.moveTo(g.at * cam.scale, g.from * cam.scale);
      ctx.lineTo(g.at * cam.scale, g.to * cam.scale);
    } else {
      ctx.moveTo(g.from * cam.scale, g.at * cam.scale);
      ctx.lineTo(g.to * cam.scale, g.at * cam.scale);
    }
    ctx.stroke();
  }
  ctx.restore();
}
