/* ════════════════════════════════════════════════════════════
   سجلّ الأنواع — القرار المعماري الأهمّ

   المحرّك لا يعرف ما هي «الخريطة الذهنية» ولا «التركيب الكيميائي».
   هو يعرف صناديق. كل نوع يعرّف نفسه هنا: كيف يُرسم، كيف يُصاب،
   ما التحويلات المسموحة، وكيف يتحوّل إلى مادّة تعليمية.

   ➜ إضافة أداة تعليمية جديدة = ملفّ في objects/ + سطر register().
     لا تعديل في المحرّك. هذا ما يجعل البنية تحتمل سنوات.
════════════════════════════════════════════════════════════ */

import type { BoardObject, Capabilities } from "./board-object";
import { DEFAULT_CAPS } from "./board-object";

/** سياق الرسم — يمرّره المحرّك لكل نوع */
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  /** تحويل وحدات العالم إلى بكسلات */
  scale: number;
  /** هل الكائن محدَّد الآن؟ (قد يغيّر النوع مظهره) */
  selected: boolean;
  /** لقطة زمنية للحركات (0..1) — للتحوّل الناعم */
  t?: number;
}

/** مسوّدة بطاقة مراجعة — الجسر إلى بقية المنصّة */
export interface FlashcardDraft {
  front: string;
  back?: string;
  latex?: string;
}

export interface ObjectAction {
  id: string;
  label: string;
  run(obj: BoardObject, api: ActionApi): void;
}

export interface ActionApi {
  update(id: string, patch: Partial<BoardObject>): void;
  remove(id: string): void;
  duplicate(id: string): void;
}

export interface ObjectDefinition<D = unknown> {
  type: string;
  /** اسم عربي مختصر يظهر في الواجهة */
  label: string;
  caps: Capabilities;

  /** الرسم — الإحداثيات المُمرَّرة بالبكسل بعد التحويل */
  render(obj: BoardObject<D>, rc: RenderContext): void;

  /**
   * إصابة دقيقة. النقطة بإحداثيات الكائن المحلّية (الدوران مفكوك).
   * الافتراضي: داخل الصندوق. الأنواع الخطّية تتجاوزه لدقّة أعلى.
   */
  hitTest?(obj: BoardObject<D>, lx: number, ly: number, tol: number): boolean;

  /** وصف نصّي — للملخّص وقارئ الشاشة */
  describe(obj: BoardObject<D>): string;

  /** الجسور التعليمية (اختيارية) */
  toFlashcard?(obj: BoardObject<D>): FlashcardDraft | null;

  /** أوامر إضافية في قائمة الكائن */
  actions?: ObjectAction[];
}

const REGISTRY = new Map<string, ObjectDefinition<never>>();

export function register<D>(def: ObjectDefinition<D>): void {
  REGISTRY.set(def.type, def as unknown as ObjectDefinition<never>);
}

export function getDef(type: string): ObjectDefinition<never> | undefined {
  return REGISTRY.get(type);
}

export function allTypes(): string[] {
  return Array.from(REGISTRY.keys());
}

/** قدرات نوع — مع رجوع آمن إن لم يُسجَّل بعد */
export function capsOf(type: string): Capabilities {
  return REGISTRY.get(type)?.caps ?? DEFAULT_CAPS;
}

/** رسم كائن عبر نوعه — نقطة الدخول الوحيدة للمحرّك */
export function renderObject(obj: BoardObject, rc: RenderContext): void {
  const def = REGISTRY.get(obj.type);
  if (!def) return;              // نوع غير معروف: نتجاهله بهدوء
  const { ctx } = rc;
  ctx.save();
  if (obj.angle) {
    const cx = (obj.x + obj.w / 2) * rc.scale;
    const cy = (obj.y + obj.h / 2) * rc.scale;
    ctx.translate(cx, cy);
    ctx.rotate(obj.angle);
    ctx.translate(-cx, -cy);
  }
  ctx.globalAlpha = obj.style.opacity ?? 1;
  def.render(obj as never, rc);
  ctx.restore();
}

export function describeObject(obj: BoardObject): string {
  return REGISTRY.get(obj.type)?.describe(obj as never) ?? "عنصر";
}

export function objectToFlashcard(obj: BoardObject): FlashcardDraft | null {
  return REGISTRY.get(obj.type)?.toFlashcard?.(obj as never) ?? null;
}
