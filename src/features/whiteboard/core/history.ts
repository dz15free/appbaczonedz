/* ════════════════════════════════════════════════════════════
   التراجع والإعادة — على مستوى **الكائنات** لا البكسلات

   كل عملية تُسجَّل كأمر عكوس. هذا يجعل التراجع صحيحاً حتى بعد
   التحريك والتحجيم والتلوين — لا مجرّد حذف آخر خط كما كان.

   ملاحظة: نتراجع عن أعمالنا نحن فقط، فلا نمحو عمل مستخدم آخر.
════════════════════════════════════════════════════════════ */

import type { BoardObject } from "../core/board-object";

export type Command =
  | { kind: "add"; obj: BoardObject }
  | { kind: "remove"; obj: BoardObject }
  | { kind: "update"; id: string; before: Partial<BoardObject>; after: Partial<BoardObject> }
  | { kind: "batch"; items: Command[] };

const LIMIT = 60;

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  push(cmd: Command): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): Command | null {
    const c = this.undoStack.pop();
    if (!c) return null;
    this.redoStack.push(c);
    return c;
  }

  redo(): Command | null {
    const c = this.redoStack.pop();
    if (!c) return null;
    this.undoStack.push(c);
    return c;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/** يقلب أمراً — يُستعمل عند التراجع */
export function invert(cmd: Command): Command {
  switch (cmd.kind) {
    case "add": return { kind: "remove", obj: cmd.obj };
    case "remove": return { kind: "add", obj: cmd.obj };
    case "update": return { kind: "update", id: cmd.id, before: cmd.after, after: cmd.before };
    case "batch": return { kind: "batch", items: cmd.items.map(invert).reverse() };
  }
}
