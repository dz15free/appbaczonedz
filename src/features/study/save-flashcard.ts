"use client";

import { ref, push } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════
   حفظ بطاقة مراجعة من أي مكان في التطبيق
   (تكامل السبورة/الملاحظات ← نظام بطاقات المراجعة الحالي)
   نفس البنية المستعملة في /tools/flashcards :
   flashcards/{uid} = { front, back, subject, createdAt, source? }
════════════════════════════════════════════ */

export interface SaveFlashcardInput {
  uid: string;
  front: string;
  back: string;
  subject?: string;
  source?: string; // من أين حُفظت (اسم الغرفة مثلاً)
}

export async function saveFlashcard(input: SaveFlashcardInput): Promise<void> {
  const front = input.front.trim();
  const back = input.back.trim();
  if (!input.uid || !front) return;
  const data: Record<string, unknown> = {
    front,
    back: back || front,
    subject: input.subject || "general",
    createdAt: Date.now(),
  };
  if (input.source) data.source = input.source;
  await push(ref(rtdb, `flashcards/${input.uid}`), data);
}
