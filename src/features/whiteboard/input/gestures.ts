/* ════════════════════════════════════════════════════════════
   الإيماءات — مصمّمة للهاتف أولاً، لا واجهة حاسوب مضغوطة

   القاعدة الثابتة (لا وضع خاصّ يحفظه المستخدم):
     • إصبع واحد  → رسم / تحديد / سحب كائن
     • إصبعان     → تحريك اللوحة وتكبيرها **دائماً**
     • ضغط مطوّل  → قائمة الكائن (مع اهتزاز خفيف للتأكيد)

   هذا يجعل السبورة قابلة للاستعمال بلا تعلّم: الأصابع تفعل
   ما يتوقّعه أي مستخدم هاتف.
════════════════════════════════════════════════════════════ */

import type { Camera, Viewport } from "../core/camera";
import { zoomAt, panBy } from "../core/camera";

export interface PointerSample { id: number; x: number; y: number }

export const LONG_PRESS_MS = 480;
export const TAP_SLOP_PX = 8;

export class GestureTracker {
  private pts = new Map<number, PointerSample>();
  private lastDist = 0;
  private lastMid = { x: 0, y: 0 };

  get count(): number { return this.pts.size; }
  /** إصبعان فأكثر = إيماءة لوحة، لا رسم */
  get isMulti(): boolean { return this.pts.size >= 2; }

  down(p: PointerSample): void {
    this.pts.set(p.id, p);
    if (this.pts.size === 2) this.resetPinch();
  }

  move(p: PointerSample): void {
    if (this.pts.has(p.id)) this.pts.set(p.id, p);
  }

  up(id: number): void {
    this.pts.delete(id);
    if (this.pts.size < 2) this.lastDist = 0;
  }

  clear(): void {
    this.pts.clear();
    this.lastDist = 0;
  }

  private two(): [PointerSample, PointerSample] | null {
    const arr = Array.from(this.pts.values());
    return arr.length >= 2 ? [arr[0], arr[1]] : null;
  }

  private resetPinch(): void {
    const t = this.two();
    if (!t) return;
    this.lastDist = Math.hypot(t[1].x - t[0].x, t[1].y - t[0].y);
    this.lastMid = { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };
  }

  /**
   * يحسب الكاميرا الجديدة من حركة إصبعين.
   * يجمع التكبير (تغيّر المسافة) والتحريك (تغيّر المنتصف) معاً،
   * وهو ما يجعل الإيماءة تبدو طبيعية لا متقطّعة.
   */
  applyTwoFinger(cam: Camera, vp: Viewport): Camera {
    const t = this.two();
    if (!t) return cam;

    const dist = Math.hypot(t[1].x - t[0].x, t[1].y - t[0].y);
    const mid = { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };

    let next = cam;
    if (this.lastDist > 0 && dist > 0) {
      const factor = dist / this.lastDist;
      if (Math.abs(factor - 1) > 0.002) next = zoomAt(next, vp, mid.x, mid.y, factor);
    }
    const dx = mid.x - this.lastMid.x;
    const dy = mid.y - this.lastMid.y;
    if (dx || dy) next = panBy(next, dx, dy);

    this.lastDist = dist;
    this.lastMid = mid;
    return next;
  }
}

/** اهتزاز خفيف — يؤكّد للمستخدم أنّ الضغط المطوّل نجح */
export function haptic(ms = 12): void {
  try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ }
}

/** هل هذا الجهاز يعتمد اللمس أساساً؟ يحدّد حجم المقابض والهوامش */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/** هامش الإصابة بالبكسل — أوسع للإصبع */
export function hitTolerancePx(touch: boolean): number {
  return touch ? 14 : 5;
}
