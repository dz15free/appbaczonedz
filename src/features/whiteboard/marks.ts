"use client";

import { ref, set, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   Smart Highlights — وسم عناصر السبورة

   المسار: roomLive/{roomId}/marks/{page}/{shapeId}

   لماذا خارج whiteboard؟ لأن قاعدة whiteboard تسمح بالكتابة لكل
   عضو، وصلاحيات Firebase تتوارث ولا يمكن تضييقها في الأبناء.
   لو وضعنا العلامات تحتها لاستطاع أي طالب أن يعلّم ما يشاء
   ويُفسد مراجعة زملائه. هنا الكتابة لصاحب الغرفة وحده.
════════════════════════════════════════════════════════════ */

export type MarkTag = "important" | "memorize" | "expected" | "mistake" | "core";

export interface ShapeMark {
  shapeId: string;
  tag: MarkTag;
  at: number;
  /** نصّ العنصر وقت التعليم — نحفظه لأن الشكل قد يُمسح لاحقاً */
  text?: string;
}

export const TAGS: { id: MarkTag; label: string; emoji: string; color: string }[] = [
  { id: "important", label: "مهم جدًا",     emoji: "⭐", color: "#f59e0b" },
  { id: "memorize",  label: "للحفظ",         emoji: "🧠", color: "#8b5cf6" },
  { id: "expected",  label: "سؤال متوقّع",   emoji: "🎯", color: "#2563eb" },
  { id: "mistake",   label: "خطأ شائع",      emoji: "⚠️", color: "#dc2626" },
  { id: "core",      label: "فكرة أساسية",   emoji: "🔑", color: "#16a34a" },
];

export function tagInfo(tag: MarkTag) {
  return TAGS.find((t) => t.id === tag) ?? TAGS[0];
}

const path = (roomId: string, page: number) => `roomLive/${roomId}/marks/${page}`;

export async function setMark(
  roomId: string, page: number, shapeId: string, tag: MarkTag, text?: string
) {
  const data: Record<string, unknown> = { tag, at: Date.now() };
  if (text) data.text = text.slice(0, 300);
  await set(ref(rtdb, `${path(roomId, page)}/${shapeId}`), data);
}

export async function clearMark(roomId: string, page: number, shapeId: string) {
  await remove(ref(rtdb, `${path(roomId, page)}/${shapeId}`));
}

export function listenMarks(
  roomId: string, page: number, cb: (marks: Record<string, ShapeMark>) => void
) {
  return onValue(ref(rtdb, path(roomId, page)), (snap) => {
    const val = (snap.val() as Record<string, Omit<ShapeMark, "shapeId">>) ?? {};
    const out: Record<string, ShapeMark> = {};
    for (const [shapeId, m] of Object.entries(val)) out[shapeId] = { shapeId, ...m };
    cb(out);
  });
}

/* ─────────── منع تكرار الحفظ عند الطالب ───────────
   الطالب قد يعيد الدخول أو يفتح الغرفة من جهازين، فنسجّل ما
   حُفظ في حسابه حتى لا تتضاعف البطاقة نفسها. */

export function listenSavedMarks(uid: string, roomId: string, cb: (ids: Set<string>) => void) {
  return onValue(ref(rtdb, `users/${uid}/markSaves/${roomId}`), (snap) => {
    cb(new Set(Object.keys((snap.val() as Record<string, unknown>) ?? {})));
  });
}

export async function recordMarkSaved(uid: string, roomId: string, shapeId: string) {
  await set(ref(rtdb, `users/${uid}/markSaves/${roomId}/${shapeId}`), true);
}
