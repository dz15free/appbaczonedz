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

import type { IconName } from "@/components/ui/icon";

export type MarkTag = "important" | "memorize" | "expected" | "mistake" | "core";

export interface ShapeMark {
  shapeId: string;
  tag: MarkTag;
  at: number;
  /** نصّ العنصر وقت التعليم — نحفظه لأن الشكل قد يُمسح لاحقاً */
  text?: string;
}

/* الوسم يحمل أيقونة من نظام أيقونات BacZone بدل رمز تعبيري:
   الأيقونة تُرسم بالمسار نفسه في كل جهاز، ولا تتغيّر شكلاً بين
   أندرويد و iOS كما يفعل الإيموجي، ولا تكسر لهجة الواجهة المهنية. */
export const TAGS: { id: MarkTag; label: string; icon: IconName; color: string }[] = [
  { id: "important", label: "مهم جدًا",     icon: "star",   color: "#D08217" },
  { id: "memorize",  label: "للحفظ",         icon: "book",   color: "#6D4AC4" },
  { id: "expected",  label: "سؤال متوقّع",   icon: "target", color: "#2350D9" },
  { id: "mistake",   label: "خطأ شائع",      icon: "close",  color: "#D2453C" },
  { id: "core",      label: "فكرة أساسية",   icon: "ai",     color: "#1E8A5F" },
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
