"use client";

import { ref, onValue, set, remove, push, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* مهمّة دراسية واحدة قابلة للتتبّع */
export interface StudyTask {
  id: string;
  text: string;
  done: boolean;
  source?: "khabbasha" | "manual"; // مصدر المهمة
  day?: string;                    // يوم/مرحلة اختيارية (مثل "اليوم 1")
  createdAt: number;
  order: number;
}

const path = (uid: string) => `studyTasks/${uid}`;

/** استماع لمهام الطالب مرتّبة */
export function listenStudyTasks(uid: string, cb: (tasks: StudyTask[]) => void) {
  return onValue(ref(rtdb, path(uid)), (snap) => {
    const val = (snap.val() as Record<string, Omit<StudyTask, "id">>) ?? {};
    const list = Object.entries(val)
      .map(([id, t]) => ({ id, ...t }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt);
    cb(list);
  });
}

/** إضافة مهمة واحدة */
export async function addStudyTask(uid: string, text: string, opts?: { source?: StudyTask["source"]; day?: string; order?: number }) {
  const r = push(ref(rtdb, path(uid)));
  const data: Omit<StudyTask, "id"> = {
    text: text.trim(),
    done: false,
    source: opts?.source ?? "manual",
    createdAt: Date.now(),
    order: opts?.order ?? Date.now(),
  };
  if (opts?.day) data.day = opts.day;
  await set(r, data);
}

/** إضافة عدّة مهام دفعة واحدة (خطة الخباشة) */
export async function addStudyTasksBatch(uid: string, items: { text: string; day?: string }[]) {
  const base = Date.now();
  const updates: Record<string, Omit<StudyTask, "id">> = {};
  items.forEach((it, i) => {
    const key = push(ref(rtdb, path(uid))).key!;
    const data: Omit<StudyTask, "id"> = {
      text: it.text.trim(),
      done: false,
      source: "khabbasha",
      createdAt: base + i,
      order: base + i,
    };
    if (it.day) data.day = it.day;
    updates[key] = data;
  });
  await update(ref(rtdb, path(uid)), updates);
}

export async function toggleStudyTask(uid: string, id: string, done: boolean) {
  await update(ref(rtdb, `${path(uid)}/${id}`), { done });
}

export async function deleteStudyTask(uid: string, id: string) {
  await remove(ref(rtdb, `${path(uid)}/${id}`));
}

export async function clearCompletedTasks(uid: string) {
  const snap = await get(ref(rtdb, path(uid)));
  const val = (snap.val() as Record<string, Omit<StudyTask, "id">>) ?? {};
  const updates: Record<string, null> = {};
  Object.entries(val).forEach(([id, t]) => { if (t.done) updates[id] = null; });
  if (Object.keys(updates).length) await update(ref(rtdb, path(uid)), updates);
}

/**
 * يستخرج عناصر مهام من نصّ خطة الخباشة.
 * يلتقط بنود القوائم (- / * / 1. / •) والعناوين كأيام.
 */
export function extractTasksFromPlan(text: string): { text: string; day?: string }[] {
  const lines = text.split("\n");
  const tasks: { text: string; day?: string }[] = [];
  let currentDay: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // عنوان (## أو ### أو **اليوم..**) → نعتبره مرحلة/يوم
    const heading = line.match(/^#{1,4}\s+(.+)/) || line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (heading) {
      const h = heading[1].replace(/[*:#]/g, "").trim();
      if (h.length <= 40) currentDay = h;
      continue;
    }

    // بند قائمة: - أو * أو • أو 1. 2.
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)/);
    if (bullet) {
      let t = bullet[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
      // تجاهل البنود القصيرة جداً أو الفارغة
      if (t.length >= 3 && t.length <= 200) {
        tasks.push({ text: t, day: currentDay });
      }
    }
  }
  return tasks;
}
