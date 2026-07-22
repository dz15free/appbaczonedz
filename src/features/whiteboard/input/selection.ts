/* ════════════════════════════════════════════════════════════
   حالة التحديد — تحديد متعدّد حقيقي

   النظام القديم كان `selectedId: string | null` — قيمة مفردة،
   فالتحديد المتعدّد كان مستحيلاً بنيويّاً. الآن مجموعة.
════════════════════════════════════════════════════════════ */

import type { BoardObject, Box } from "../core/board-object";
import { aabbOf, unionBox } from "../core/board-object";
import type { Scene } from "../core/scene";
import { combinedCaps } from "./transform";

export class Selection {
  private ids = new Set<string>();
  version = 0;

  get size(): number { return this.ids.size; }
  get isEmpty(): boolean { return this.ids.size === 0; }
  has(id: string): boolean { return this.ids.has(id); }
  list(): string[] { return Array.from(this.ids); }

  set(ids: Iterable<string>): void {
    this.ids = new Set(ids);
    this.version++;
  }

  add(id: string): void { this.ids.add(id); this.version++; }
  remove(id: string): void { this.ids.delete(id); this.version++; }

  toggle(id: string): void {
    if (this.ids.has(id)) this.ids.delete(id);
    else this.ids.add(id);
    this.version++;
  }

  only(id: string): void { this.ids = new Set([id]); this.version++; }
  clear(): void {
    if (!this.ids.size) return;
    this.ids.clear();
    this.version++;
  }

  /** إسقاط المعرّفات التي لم تعد موجودة (بعد حذف من مستخدم آخر) */
  prune(scene: Scene): void {
    let changed = false;
    for (const id of this.ids) if (!scene.has(id)) { this.ids.delete(id); changed = true; }
    if (changed) this.version++;
  }

  objects(scene: Scene): BoardObject[] {
    const out: BoardObject[] = [];
    for (const id of this.ids) {
      const o = scene.get(id);
      if (o) out.push(o);
    }
    return out;
  }

  /** الصندوق الجامع للتحديد — إطار المقابض */
  box(scene: Scene): Box | null {
    const objs = this.objects(scene);
    if (objs.length === 1) return aabbOf(objs[0]);
    return unionBox(objs);
  }

  /** القدرات المسموحة للتحديد الحالي (الأقلّ صلاحيةً يحكم) */
  caps(scene: Scene) {
    return combinedCaps(this.objects(scene));
  }
}
