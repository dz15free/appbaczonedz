/* ════════════════════════════════════════════════════════════
   المشهد — مخزن الكائنات وعملياته

   كل شيء هنا يعمل على **كائنات**، لا بكسلات:
   التحديد، المسح، النقل، التحجيم، النسخ، التراجع، الطبقات.

   المشهد لا يرسم ولا يزامن — مسؤوليّة واحدة فقط: إدارة الكائنات.
════════════════════════════════════════════════════════════ */

import type { BoardObject, Box, LayerId } from "./board-object";
import { aabbOf, boxesIntersect, pointInBox, toLocal, LAYER_ORDER } from "./board-object";
import { getDef } from "./registry";

export class Scene {
  private items = new Map<string, BoardObject>();
  /** يرتفع مع كل تغيير — يخبر المحرّك أنّ إعادة الرسم لازمة */
  version = 0;

  /* ── قراءة ─────────────────────────────────────────── */

  get(id: string): BoardObject | undefined { return this.items.get(id); }
  has(id: string): boolean { return this.items.has(id); }
  get size(): number { return this.items.size; }

  /** كل الكائنات مرتّبة للرسم: حسب الطبقة ثمّ z */
  ordered(visibleLayers?: Set<LayerId>): BoardObject[] {
    const out = Array.from(this.items.values()).filter(
      (o) => !visibleLayers || visibleLayers.has(o.layer)
    );
    out.sort((a, b) => {
      const la = LAYER_ORDER.indexOf(a.layer);
      const lb = LAYER_ORDER.indexOf(b.layer);
      return la !== lb ? la - lb : a.z - b.z;
    });
    return out;
  }

  inLayer(layer: LayerId): BoardObject[] {
    return this.ordered().filter((o) => o.layer === layer);
  }

  /** الكائنات المتقاطعة مع منطقة — لتخطّي ما هو خارج الشاشة */
  inBox(area: Box, visibleLayers?: Set<LayerId>): BoardObject[] {
    return this.ordered(visibleLayers).filter((o) => boxesIntersect(aabbOf(o), area));
  }

  /* ── كتابة ─────────────────────────────────────────── */

  add(obj: BoardObject): void {
    if (obj.z === undefined || obj.z === null) obj.z = this.nextZ(obj.layer);
    this.items.set(obj.id, obj);
    this.version++;
  }

  /** إدراج/استبدال بلا لمس z — تُستعمل عند الوصول من المزامنة */
  put(obj: BoardObject): void {
    this.items.set(obj.id, obj);
    this.version++;
  }

  update(id: string, patch: Partial<BoardObject>): BoardObject | undefined {
    const cur = this.items.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch, meta: { ...cur.meta, createdAt: cur.meta?.createdAt ?? Date.now(), updatedAt: Date.now() } } as BoardObject;
    this.items.set(id, next);
    this.version++;
    return next;
  }

  remove(id: string): boolean {
    const ok = this.items.delete(id);
    if (ok) this.version++;
    return ok;
  }

  removeMany(ids: Iterable<string>): void {
    let changed = false;
    for (const id of ids) if (this.items.delete(id)) changed = true;
    if (changed) this.version++;
  }

  clearLayer(layer: LayerId): void {
    let changed = false;
    for (const [id, o] of this.items) {
      if (o.layer === layer) { this.items.delete(id); changed = true; }
    }
    if (changed) this.version++;
  }

  replaceAll(objs: BoardObject[]): void {
    this.items.clear();
    for (const o of objs) this.items.set(o.id, o);
    this.version++;
  }

  /* ── الطبقات وترتيب العمق ──────────────────────────── */

  nextZ(layer: LayerId): number {
    let max = 0;
    for (const o of this.items.values()) if (o.layer === layer && o.z > max) max = o.z;
    return max + 1;
  }

  bringToFront(id: string): void {
    const o = this.items.get(id);
    if (o) this.update(id, { z: this.nextZ(o.layer) });
  }

  sendToBack(id: string): void {
    const o = this.items.get(id);
    if (!o) return;
    let min = 0;
    for (const it of this.items.values()) if (it.layer === o.layer && it.z < min) min = it.z;
    this.update(id, { z: min - 1 });
  }

  /* ── الإصابة (Hit testing) ─────────────────────────── */

  /**
   * أي كائن تحت هذه النقطة؟ نبدأ من الأعلى بصريّاً.
   * ثلاث مراحل: صندوق محاذٍ (رخيص) ← فكّ الدوران ← اختبار النوع.
   *
   * tol بوحدات العالم (يمرّرها المستدعي متكيّفة: أوسع للمس).
   */
  pick(px: number, py: number, tol: number, visibleLayers?: Set<LayerId>): BoardObject | null {
    const list = this.ordered(visibleLayers);
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (o.locked) continue;
      if (!pointInBox(aabbOf(o), px, py, tol)) continue;      // ١) رفض سريع
      const l = toLocal(o, px, py);                            // ٢) فكّ الدوران
      const def = getDef(o.type);
      if (def?.hitTest) {                                      // ٣) اختبار النوع
        if (def.hitTest(o as never, l.x, l.y, tol)) return o;
      } else {
        if (l.x >= -tol && l.y >= -tol && l.x <= o.w + tol && l.y <= o.h + tol) return o;
      }
    }
    return null;
  }

  /** كل الكائنات داخل إطار تحديد */
  pickArea(area: Box, visibleLayers?: Set<LayerId>): BoardObject[] {
    return this.ordered(visibleLayers).filter(
      (o) => !o.locked && boxesIntersect(aabbOf(o), area)
    );
  }
}
