/* ════════════════════════════════════════════════════════════
   المزامنة — تفاؤلية محلّياً، مخنوقة على الشبكة

   المشكلة: لو بثثنا كل حركة سحب لكانت عشرات الكتابات في الثانية
   × عدد الطلاب → استنزاف حصّة Spark المجانية.

   الحلّ:
     • الحركة تظهر **فوراً** محلّياً (لا انتظار للشبكة).
     • أثناء السحب نبثّ كل ~٨٠ms فقط.
     • عند الإفلات كتابة نهائية واحدة.
     • الرسم الحرّ يُرسل مرّة واحدة عند رفع القلم، لا نقطة بنقطة.
     • تحديثات جزئية (update) لا استبدال كامل (set) — فلا يمسح
       تحريكُ أحدٍ تلوينَ آخر.
════════════════════════════════════════════════════════════ */

import { ref, set, update, remove, onValue, type Unsubscribe } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { BoardObject } from "../core/board-object";
import { parseRecord } from "../core/legacy";

export const THROTTLE_MS = 80;

/** إزالة القيم غير المعرّفة — RTDB يرفضها */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) out[k] = clean(val);
    }
    return out as T;
  }
  return v;
}

export class BoardSync {
  private pending = new Map<string, Partial<BoardObject>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private path: string) {}

  /** استماع لكل الكائنات — يقرأ الجديد والقديم معاً */
  listen(onAll: (objs: BoardObject[]) => void): Unsubscribe {
    return onValue(ref(rtdb, this.path), (snap) => {
      const val = (snap.val() as Record<string, unknown>) ?? {};
      const out: BoardObject[] = [];
      for (const [id, raw] of Object.entries(val)) {
        const obj = parseRecord(id, raw);
        if (obj) out.push(obj);
      }
      onAll(out);
    });
  }

  /** كتابة كائن كامل (إنشاء) */
  create(obj: BoardObject): void {
    const { id, ...data } = obj;
    void set(ref(rtdb, `${this.path}/${id}`), clean(data));
  }

  /** تحديث فوري بلا خنق (نهاية السحب، تغيير لون…) */
  commit(id: string, patch: Partial<BoardObject>): void {
    this.pending.delete(id);
    void update(ref(rtdb, `${this.path}/${id}`), clean(patch) as object);
  }

  /** تحديث مخنوق (أثناء السحب) — يُجمَّع ويُرسل كل ٨٠ms */
  queue(id: string, patch: Partial<BoardObject>): void {
    const prev = this.pending.get(id) ?? {};
    this.pending.set(id, { ...prev, ...patch });
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, THROTTLE_MS);
  }

  /** إرسال كل ما هو معلّق الآن */
  flush(): void {
    if (!this.pending.size) return;
    const batch: Record<string, unknown> = {};
    for (const [id, patch] of this.pending) {
      for (const [k, v] of Object.entries(clean(patch) as Record<string, unknown>)) {
        batch[`${id}/${k}`] = v;
      }
    }
    this.pending.clear();
    void update(ref(rtdb, this.path), batch);
  }

  delete(id: string): void {
    this.pending.delete(id);
    void remove(ref(rtdb, `${this.path}/${id}`));
  }

  deleteMany(ids: string[]): void {
    if (!ids.length) return;
    const batch: Record<string, null> = {};
    for (const id of ids) { this.pending.delete(id); batch[id] = null; }
    void update(ref(rtdb, this.path), batch);
  }

  clearAll(): void {
    this.pending.clear();
    void remove(ref(rtdb, this.path));
  }

  dispose(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.flush();
  }
}
