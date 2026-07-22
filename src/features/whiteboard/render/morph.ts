/* ════════════════════════════════════════════════════════════
   الحركات الصغيرة — ما يجعل السبورة تبدو «حيّة»

   حين يتحوّل رسم حرّ إلى شكل مثالي، لا نستبدله فجأة:
   ننتقل إليه بحركة ١٨٠ms ناعمة. الفرق نفسي كبير — يشعر
   المستخدم أنّ السبورة **فهمت قصده** لا أنّها غيّرت رسمه.

   ومعها زرّ تراجع لثانيتين: الذكاء الذي لا يمكن رفضه إزعاج.
════════════════════════════════════════════════════════════ */

export const MORPH_MS = 180;
export const UNDO_CHIP_MS = 2600;

/** تنعيم — بداية سريعة ونهاية هادئة */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface Morph {
  id: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  start: number;
  done: boolean;
}

export class MorphRunner {
  private items: Morph[] = [];

  add(id: string, from: Morph["from"], to: Morph["to"]): void {
    this.items = this.items.filter((m) => m.id !== id);
    this.items.push({ id, from, to, start: performance.now(), done: false });
  }

  get active(): boolean { return this.items.some((m) => !m.done); }

  /** الصندوق الحالي لكائن أثناء الحركة، أو null إن لم يكن متحرّكاً */
  boxAt(id: string, now: number): Morph["to"] | null {
    const m = this.items.find((x) => x.id === id && !x.done);
    if (!m) return null;
    const t = Math.min(1, (now - m.start) / MORPH_MS);
    const e = easeOutCubic(t);
    if (t >= 1) m.done = true;
    return {
      x: m.from.x + (m.to.x - m.from.x) * e,
      y: m.from.y + (m.to.y - m.from.y) * e,
      w: m.from.w + (m.to.w - m.from.w) * e,
      h: m.from.h + (m.to.h - m.from.h) * e,
    };
  }

  cleanup(): void {
    this.items = this.items.filter((m) => !m.done);
  }

  clear(): void { this.items = []; }
}
