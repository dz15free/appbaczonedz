/* ════════════════════════════════════════════════════════════
   المتحكّم — يربط الإدخال بالمحرّك

   يجمع: المشهد + الكاميرا + التحديد + التاريخ + المزامنة،
   ويحوّل أحداث المؤشّر إلى عمليات على **كائنات**.

   لا يعرف React. لا يعرف الواجهة. قابل للاختبار وحده.
════════════════════════════════════════════════════════════ */

import type { BoardObject, Box, LayerId, ObjectStyle } from "./board-object";
import { aabbOf, newId, normalizeBox } from "./board-object";
import { Scene } from "./scene";
import { Selection } from "../input/selection";
import { History, invert, type Command } from "./history";
import type { Camera, Viewport } from "./camera";
import { screenToWorld } from "./camera";

import { pickHandle, resizeBox, angleTo, snapAngle, applyGroupBox, type HandleId } from "../input/transform";
import { computeSnap, type Guide } from "../smart/snapping";
import { recognize, type Pt } from "../smart/recognize";
import { MorphRunner } from "../render/morph";

export type ToolId =
  | "select" | "pen" | "highlighter" | "eraser"
  | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "sticky";

export type Mode = "idle" | "draw" | "move" | "resize" | "rotate" | "marquee";

export interface ControllerHooks {
  onChange(): void;                       // اطلب إعادة رسم
  onSelectionChange?(): void;
  /** تحوّل شكل — لعرض زرّ التراجع */
  onRecognized?(id: string, undo: () => void): void;
  /** طلب تحرير نصّ */
  onEditText?(obj: BoardObject): void;
}

export interface Persist {
  create(obj: BoardObject): void;
  queue(id: string, patch: Partial<BoardObject>): void;
  commit(id: string, patch: Partial<BoardObject>): void;
  delete(id: string): void;
  deleteMany(ids: string[]): void;
  flush(): void;
}

export class BoardController {
  scene = new Scene();
  selection = new Selection();
  history = new History();
  morph = new MorphRunner();

  tool: ToolId = "pen";
  style: ObjectStyle = { color: "#0f172a", width: 3, opacity: 1 };
  layer: LayerId = "teacher";
  /** التعرّف على الأشكال — يمكن تعطيله (الأحياء تحتاج رسماً عضويّاً) */
  smartShapes = true;

  mode: Mode = "idle";
  guides: Guide[] = [];
  marquee: Box | null = null;
  /** المسار قيد الرسم (إحداثيات عالمية) */
  draft: Pt[] | null = null;

  private handle: HandleId | null = null;
  private startPt = { x: 0, y: 0 };
  private startBox: Box | null = null;
  private startAngle = 0;
  private beforeMap = new Map<string, Partial<BoardObject>>();
  private drawingId: string | null = null;

  constructor(
    private uid: string,
    private hooks: ControllerHooks,
    private persist: Persist,
    private canEdit: () => boolean,
  ) {}

  /* ── أدوات مساعدة ───────────────────────────────── */

  private worldTol(cam: Camera, px: number): number { return px / cam.scale; }

  private capsOfSelection() { return this.selection.caps(this.scene); }

  private snapshot(ids: string[]): void {
    this.beforeMap.clear();
    for (const id of ids) {
      const o = this.scene.get(id);
      if (o) this.beforeMap.set(id, { x: o.x, y: o.y, w: o.w, h: o.h, angle: o.angle });
    }
  }

  private pushUpdates(): void {
    const items: Command[] = [];
    for (const [id, before] of this.beforeMap) {
      const o = this.scene.get(id);
      if (!o) continue;
      const after = { x: o.x, y: o.y, w: o.w, h: o.h, angle: o.angle };
      if (before.x !== after.x || before.y !== after.y || before.w !== after.w
          || before.h !== after.h || before.angle !== after.angle) {
        items.push({ kind: "update", id, before, after });
        this.persist.commit(id, after);
      }
    }
    if (items.length) this.history.push(items.length === 1 ? items[0] : { kind: "batch", items });
    this.beforeMap.clear();
  }

  /* ── دورة المؤشّر ──────────────────────────────── */

  pointerDown(sx: number, sy: number, cam: Camera, vp: Viewport, opts: { touch: boolean; additive: boolean }): void {
    const p = screenToWorld(cam, vp, sx, sy);
    this.startPt = p;
    const tolPx = opts.touch ? 14 : 5;
    const tol = this.worldTol(cam, tolPx);

    if (this.tool === "select") {
      // ١) مقبض تحويل؟
      const box = this.selection.box(this.scene);
      if (box) {
        const caps = this.capsOfSelection();
        const h = pickHandle(
          box, p.x, p.y, this.worldTol(cam, opts.touch ? 16 : 9),
          this.worldTol(cam, opts.touch ? 34 : 26),
          { resize: caps.resize !== "none", rotate: caps.rotate }
        );
        if (h) {
          this.handle = h;
          this.startBox = box;
          this.mode = h === "rotate" ? "rotate" : "resize";
          this.startAngle = angleTo(box, p.x, p.y);
          this.snapshot(this.selection.list());
          return;
        }
      }

      // ٢) كائن تحته؟
      const hit = this.scene.pick(p.x, p.y, tol);
      if (hit) {
        if (opts.additive) this.selection.toggle(hit.id);
        else if (!this.selection.has(hit.id)) this.selection.only(hit.id);
        this.hooks.onSelectionChange?.();
        if (this.capsOfSelection().move) {
          this.mode = "move";
          this.snapshot(this.selection.list());
        }
        this.hooks.onChange();
        return;
      }

      // ٣) لا شيء → إطار تحديد
      if (!opts.additive) this.selection.clear();
      this.mode = "marquee";
      this.marquee = { x: p.x, y: p.y, w: 0, h: 0 };
      this.hooks.onChange();
      return;
    }

    if (!this.canEdit()) return;

    // أداة ممحاة: حذف الكائن تحت المؤشّر
    if (this.tool === "eraser") {
      const hit = this.scene.pick(p.x, p.y, tol);
      if (hit) this.eraseObject(hit);
      return;
    }

    // أدوات الإنشاء
    this.mode = "draw";
    if (this.tool === "pen" || this.tool === "highlighter") {
      this.draft = [p];
    } else {
      const obj = this.makeObject(this.tool, p);
      if (!obj) return;
      this.drawingId = obj.id;
      this.scene.add(obj);
      this.persist.create(obj);
    }
    this.hooks.onChange();
  }

  pointerMove(sx: number, sy: number, cam: Camera, vp: Viewport, opts: { touch: boolean; shift: boolean; alt: boolean }): void {
    const p = screenToWorld(cam, vp, sx, sy);

    switch (this.mode) {
      case "draw": {
        if (this.draft) { this.draft.push(p); this.hooks.onChange(); return; }
        if (this.drawingId) {
          const o = this.scene.get(this.drawingId);
          if (!o) return;
          const b = normalizeBox({ x: this.startPt.x, y: this.startPt.y, w: p.x - this.startPt.x, h: p.y - this.startPt.y });
          this.scene.update(this.drawingId, b);
          this.persist.queue(this.drawingId, b);
          this.hooks.onChange();
        }
        return;
      }

      case "move": {
        const dx = p.x - this.startPt.x;
        const dy = p.y - this.startPt.y;
        const ids = this.selection.list();
        // نطبّق الإزاحة على النسخة المحفوظة قبل السحب
        for (const id of ids) {
          const before = this.beforeMap.get(id);
          if (!before) continue;
          this.scene.update(id, { x: (before.x ?? 0) + dx, y: (before.y ?? 0) + dy });
        }
        // محاذاة ذكية (تُلغى بـ Alt)
        this.guides = [];
        if (!opts.alt) {
          const box = this.selection.box(this.scene);
          if (box) {
            const others = this.scene.ordered().filter((o) => !this.selection.has(o.id));
            const snap = computeSnap(box, others, this.worldTol(cam, 6));
            if (snap.dx || snap.dy) {
              for (const id of ids) {
                const o = this.scene.get(id);
                if (o) this.scene.update(id, { x: o.x + snap.dx, y: o.y + snap.dy });
              }
            }
            this.guides = snap.guides;
          }
        }
        for (const id of ids) {
          const o = this.scene.get(id);
          if (o) this.persist.queue(id, { x: o.x, y: o.y });
        }
        this.hooks.onChange();
        return;
      }

      case "resize": {
        if (!this.startBox || !this.handle) return;
        const caps = this.capsOfSelection();
        const uniform = caps.resize === "uniform" || opts.shift;
        const after = resizeBox(this.startBox, this.handle, p.x - this.startPt.x, p.y - this.startPt.y, uniform);
        const objs = this.selection.objects(this.scene);
        const patches = applyGroupBox(objs, this.startBox, after);
        // نطبّق على النسخ المحفوظة قبل السحب لتفادي التراكم
        for (const [id, patch] of patches) {
          const before = this.beforeMap.get(id);
          if (!before) continue;
          const sx2 = this.startBox.w === 0 ? 1 : after.w / this.startBox.w;
          const sy2 = this.startBox.h === 0 ? 1 : after.h / this.startBox.h;
          this.scene.update(id, {
            x: after.x + ((before.x ?? 0) - this.startBox.x) * sx2,
            y: after.y + ((before.y ?? 0) - this.startBox.y) * sy2,
            w: (before.w ?? 0) * sx2,
            h: (before.h ?? 0) * sy2,
          });
          this.persist.queue(id, patch);
        }
        this.hooks.onChange();
        return;
      }

      case "rotate": {
        if (!this.startBox) return;
        let a = angleTo(this.startBox, p.x, p.y) - this.startAngle;
        if (opts.shift) a = snapAngle(a);
        for (const id of this.selection.list()) {
          const before = this.beforeMap.get(id);
          if (!before) continue;
          const next = (before.angle ?? 0) + a;
          this.scene.update(id, { angle: next });
          this.persist.queue(id, { angle: next });
        }
        this.hooks.onChange();
        return;
      }

      case "marquee": {
        if (!this.marquee) return;
        this.marquee = normalizeBox({
          x: this.startPt.x, y: this.startPt.y,
          w: p.x - this.startPt.x, h: p.y - this.startPt.y,
        });
        this.hooks.onChange();
        return;
      }

      default: return;
    }
  }

  pointerUp(): void {
    switch (this.mode) {
      case "draw": {
        if (this.draft) this.finishFreehand();
        else if (this.drawingId) {
          const o = this.scene.get(this.drawingId);
          if (o) {
            // شكل صغير جداً = نقرة بالخطأ
            if (o.w < 2 && o.h < 2) { this.scene.remove(o.id); this.persist.delete(o.id); }
            else {
              this.persist.commit(o.id, { x: o.x, y: o.y, w: o.w, h: o.h });
              this.history.push({ kind: "add", obj: o });
            }
          }
          this.drawingId = null;
        }
        break;
      }
      case "move":
      case "resize":
      case "rotate":
        this.pushUpdates();
        this.persist.flush();
        break;
      case "marquee": {
        if (this.marquee) {
          const found = this.scene.pickArea(this.marquee);
          this.selection.set(found.map((o) => o.id));
          this.hooks.onSelectionChange?.();
        }
        break;
      }
      default: break;
    }
    this.mode = "idle";
    this.handle = null;
    this.startBox = null;
    this.marquee = null;
    this.guides = [];
    this.hooks.onChange();
  }

  /* ── الرسم الحرّ + التعرّف ─────────────────────── */

  private finishFreehand(): void {
    const pts = this.draft ?? [];
    this.draft = null;
    if (pts.length < 2) return;

    const highlighter = this.tool === "highlighter";
    let obj: BoardObject | null = null;

    if (this.smartShapes && !highlighter) {
      const rec = recognize(pts, { snapAngles: true });
      if (rec) {
        const b = normalizeBox({ x: rec.x, y: rec.y, w: rec.w, h: rec.h });
        obj = this.baseObject(rec.type, b);
        // حركة ناعمة من صندوق الرسم الأصلي إلى الشكل المثالي
        const rough = this.boundsOfPts(pts);
        this.morph.add(obj.id, rough, b);
        const created = obj;
        this.hooks.onRecognized?.(created.id, () => this.revertRecognition(created, pts, highlighter));
      }
    }

    if (!obj) obj = this.freehandObject(pts, highlighter);

    this.scene.add(obj);
    this.persist.create(obj);
    this.history.push({ kind: "add", obj });
    this.hooks.onChange();
  }

  /** استعادة الرسم الحرّ بعد تعرّف غير مرغوب */
  private revertRecognition(shaped: BoardObject, pts: Pt[], highlighter: boolean): void {
    this.scene.remove(shaped.id);
    this.persist.delete(shaped.id);
    const free = this.freehandObject(pts, highlighter);
    this.scene.add(free);
    this.persist.create(free);
    this.hooks.onChange();
  }

  private boundsOfPts(pts: Pt[]): Box {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
    return { x: x0, y: y0, w: Math.max(x1 - x0, 1), h: Math.max(y1 - y0, 1) };
  }

  private freehandObject(pts: Pt[], highlighter: boolean): BoardObject {
    const b = this.boundsOfPts(pts);
    const local = pts.map((p) => ({ x: (p.x - b.x) / b.w, y: (p.y - b.y) / b.h }));
    return {
      id: newId(this.uid), uid: this.uid, type: "path", layer: this.layer,
      x: b.x, y: b.y, w: b.w, h: b.h, angle: 0, z: 0,
      style: { ...this.style, opacity: highlighter ? 0.35 : 1 },
      data: { points: local, highlighter },
      meta: { createdAt: Date.now() }, v: 2,
    };
  }

  private baseObject(type: string, b: Box): BoardObject {
    return {
      id: newId(this.uid), uid: this.uid, type, layer: this.layer,
      x: b.x, y: b.y, w: b.w, h: b.h, angle: 0, z: 0,
      style: { ...this.style },
      data: {},
      meta: { createdAt: Date.now() }, v: 2,
    };
  }

  private makeObject(tool: ToolId, p: Pt): BoardObject | null {
    const map: Partial<Record<ToolId, string>> = {
      line: "line", arrow: "arrow", rect: "rect", ellipse: "ellipse", triangle: "triangle",
    };
    const type = map[tool];
    if (!type) return null;
    return this.baseObject(type, { x: p.x, y: p.y, w: 1, h: 1 });
  }

  /* ── عمليات على الكائنات ──────────────────────── */

  addText(text: string, at: Pt, fontSize = 28): BoardObject {
    const obj: BoardObject = {
      id: newId(this.uid), uid: this.uid, type: "text", layer: this.layer,
      x: at.x, y: at.y, w: Math.max(text.length * fontSize * 0.55, 40), h: fontSize * 1.4,
      angle: 0, z: 0,
      style: { ...this.style, fontSize },
      data: { text },
      meta: { createdAt: Date.now() }, v: 2,
    };
    this.scene.add(obj);
    this.persist.create(obj);
    this.history.push({ kind: "add", obj });
    this.hooks.onChange();
    return obj;
  }

  addSticky(text: string, at: Pt): BoardObject {
    const obj: BoardObject = {
      id: newId(this.uid), uid: this.uid, type: "sticky", layer: this.layer,
      x: at.x, y: at.y, w: 220, h: 160, angle: 0, z: 0,
      style: { ...this.style, fill: "#fef9c3", color: "#422006", fontSize: 22 },
      data: { text },
      meta: { createdAt: Date.now() }, v: 2,
    };
    this.scene.add(obj);
    this.persist.create(obj);
    this.history.push({ kind: "add", obj });
    this.hooks.onChange();
    return obj;
  }

  eraseObject(o: BoardObject): void {
    this.scene.remove(o.id);
    this.persist.delete(o.id);
    this.selection.remove(o.id);
    this.history.push({ kind: "remove", obj: o });
    this.hooks.onChange();
  }

  deleteSelection(): void {
    const objs = this.selection.objects(this.scene);
    if (!objs.length) return;
    this.scene.removeMany(objs.map((o) => o.id));
    this.persist.deleteMany(objs.map((o) => o.id));
    this.selection.clear();
    this.history.push({ kind: "batch", items: objs.map((o) => ({ kind: "remove" as const, obj: o })) });
    this.hooks.onChange();
  }

  duplicateSelection(offset = 24): void {
    const objs = this.selection.objects(this.scene);
    if (!objs.length) return;
    const created: BoardObject[] = [];
    for (const o of objs) {
      const copy: BoardObject = {
        ...o, id: newId(this.uid), uid: this.uid,
        x: o.x + offset, y: o.y + offset, z: 0,
        meta: { createdAt: Date.now() },
      };
      this.scene.add(copy);
      this.persist.create(copy);
      created.push(copy);
    }
    this.selection.set(created.map((o) => o.id));
    this.history.push({ kind: "batch", items: created.map((o) => ({ kind: "add" as const, obj: o })) });
    this.hooks.onChange();
  }

  restyleSelection(patch: Partial<ObjectStyle>): void {
    const objs = this.selection.objects(this.scene);
    if (!objs.length) return;
    const items: Command[] = [];
    for (const o of objs) {
      const before = { style: { ...o.style } };
      const after = { style: { ...o.style, ...patch } };
      this.scene.update(o.id, after);
      this.persist.commit(o.id, after);
      items.push({ kind: "update", id: o.id, before, after });
    }
    this.history.push(items.length === 1 ? items[0] : { kind: "batch", items });
    this.hooks.onChange();
  }

  /* ── التراجع/الإعادة ──────────────────────────── */

  private applyCommand(c: Command): void {
    switch (c.kind) {
      case "add":
        this.scene.add(c.obj);
        this.persist.create(c.obj);
        break;
      case "remove":
        this.scene.remove(c.obj.id);
        this.persist.delete(c.obj.id);
        this.selection.remove(c.obj.id);
        break;
      case "update":
        this.scene.update(c.id, c.after);
        this.persist.commit(c.id, c.after);
        break;
      case "batch":
        for (const it of c.items) this.applyCommand(it);
        break;
    }
  }

  undo(): void {
    const c = this.history.undo();
    if (!c) return;
    this.applyCommand(invert(c));
    this.hooks.onChange();
  }

  redo(): void {
    const c = this.history.redo();
    if (!c) return;
    this.applyCommand(c);
    this.hooks.onChange();
  }

  /** مزامنة واردة — نُبقي تحديدنا صالحاً */
  applyRemote(objs: BoardObject[]): void {
    this.scene.replaceAll(objs);
    this.selection.prune(this.scene);
    this.hooks.onChange();
  }

  /** صندوق كائن مع مراعاة الحركة الجارية */
  animatedBox(o: BoardObject, now: number): Box {
    return this.morph.boxAt(o.id, now) ?? aabbOf(o);
  }
}
