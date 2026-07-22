/* ════════════════════════════════════════════════════════════
   جسر التوافق مع النظام القديم

   السبورات القديمة مخزّنة بنموذج «الخطوط»:
     { kind, color, size, points[0..1], text? }   ← بلا v
   والجديد بنموذج الكائنات:
     { type, x, y, w, h, angle, style, data, v: 2 }

   نقرأ الاثنين. نكتب الجديد فقط. **لا هجرة بيانات، ولا كسر**:
   أي غرفة قديمة تُفتح وتعمل كما كانت.
════════════════════════════════════════════════════════════ */

import type { BoardObject, ObjectStyle } from "./board-object";
import { WORLD_W, WORLD_H } from "./camera";

export type LegacyKind =
  | "pen" | "highlighter" | "line" | "arrow"
  | "rect" | "ellipse" | "text" | "eraser";

export interface LegacyPoint { x: number; y: number }

export interface LegacyShape {
  id: string;
  uid: string;
  kind: LegacyKind;
  color: string;
  size: number;
  points: LegacyPoint[];
  text?: string;
}

/** أي سجلّ قادم من قاعدة البيانات: أهو بالنموذج الجديد؟ */
export function isV2(raw: unknown): raw is BoardObject {
  return !!raw && typeof raw === "object" && (raw as { v?: number }).v === 2;
}

/** خريطة نوع القديم → نوع الجديد */
const KIND_TO_TYPE: Record<LegacyKind, string> = {
  pen: "path",
  highlighter: "path",
  line: "line",
  arrow: "arrow",
  rect: "rect",
  ellipse: "ellipse",
  text: "text",
  eraser: "path",
};

/**
 * تحويل شكل قديم إلى كائن.
 * القديم يستعمل إحداثيات نسبية (0..1)؛ نضربها في أبعاد العالم.
 */
export function fromLegacy(s: LegacyShape): BoardObject | null {
  if (!s?.points?.length) return null;

  const pts = s.points.map((p) => ({ x: p.x * WORLD_W, y: p.y * WORLD_H }));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }

  // النصّ: صندوق تقديري؛ سيُصحَّح عند أوّل رسم بقياس حقيقي
  if (s.kind === "text") {
    const fs = s.size * 8 * (WORLD_H / 900);
    x1 = x0 + (s.text?.length ?? 1) * fs * 0.62;
    y1 = y0 + fs * 1.25;
  }

  const w = Math.max(x1 - x0, 1);
  const h = Math.max(y1 - y0, 1);

  const style: ObjectStyle = {
    color: s.color,
    width: s.size,
    opacity: s.kind === "highlighter" ? 0.35 : 1,
  };

  const type = KIND_TO_TYPE[s.kind] ?? "path";

  // نقاط المسار تُخزَّن نسبةً للصندوق (0..1) فتتحجّم معه بلا تشويه
  const local = pts.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h }));

  return {
    id: s.id,
    uid: s.uid,
    type,
    layer: "teacher",
    x: x0, y: y0, w, h,
    angle: 0,
    z: 0,
    style,
    data:
      type === "text" ? { text: s.text ?? "" }
      : type === "path" ? { points: local, highlighter: s.kind === "highlighter" }
      : { points: local },
    meta: { createdAt: Date.now() },
    v: 2,
  };
}

/** قراءة سجلّ من RTDB أيّاً كان نموذجه */
export function parseRecord(id: string, raw: unknown): BoardObject | null {
  if (isV2(raw)) return { ...(raw as BoardObject), id };
  const s = raw as Omit<LegacyShape, "id">;
  if (!s || typeof s !== "object" || !("kind" in s)) return null;
  return fromLegacy({ ...(s as Omit<LegacyShape, "id">), id } as LegacyShape);
}
