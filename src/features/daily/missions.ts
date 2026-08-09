"use client";

import { useEffect, useState } from "react";
import { ref, set, push, update, remove, onValue, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { awardXp } from "@/features/gamification/points";
import { addNotification } from "@/features/community/social";
import type { BranchMap, Targeted } from "@/features/feed/targeting";
import { matchesBranch } from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   BacZone Daily — مهامّ اليوم

   المهمّة **ليست عدّاداً يملؤه المتصفّح**. لكل نوع فعلٌ حقيقي في
   المنصّة يُقاس من بياناته هو: بطاقات المراجعة تُقاس من `flashcards`،
   وأسئلة التغذية من `feedProgress`، ودخول غرفة من `attendance`،
   والدرس من `studyProgress`. فمن لم يفعل شيئاً لا يُنجز مهمّة مهما
   أرسل من طلبات.

   والنقاط تُطلب بعد الإنجاز عبر `missionClaims/{uid}/{day}/{id}` —
   سجلّ يُكتب مرّة واحدة وترفض القاعدة الكتابة فوقه، ثمّ تُمنح النقاط
   بسقف الخطوة نفسه. فلا مضاعفة ولا تضخيم.

   الأنواع مفتوحة: `kind` نصّ حرّ، والقياس يُختار بجدول واحد أدناه.
   إضافة نوع جديد = سطر واحد فيه.
════════════════════════════════════════════════════════════ */

export type MissionKind =
  | "flashcards"     // حفظ بطاقات مراجعة
  | "feedQuestions"  // الإجابة عن أسئلة التغذية
  | "feedQuiz"       // إتمام تحدّيات سريعة
  | "lessons"        // إنهاء دروس من المنهج
  | "roomJoin"       // حضور غرفة مراجعة
  | "posts"          // مشاركة في المجتمع
  | "custom";        // فعل يُعلّمه الطالب بنفسه (لا نقاط تلقائية)

export const MISSION_KINDS: { id: MissionKind; label: string; unit: string; hint: string }[] = [
  { id: "flashcards",    label: "بطاقات مراجعة",       unit: "بطاقة",  hint: "تُحتسب من بطاقات الطالب المحفوظة اليوم" },
  { id: "feedQuestions", label: "أسئلة التغذية",        unit: "سؤال",   hint: "تُحتسب من أسئلة الدراسة التي أجاب عنها اليوم" },
  { id: "feedQuiz",      label: "تحدّيات سريعة",        unit: "تحدٍّ",   hint: "تُحتسب من التحدّيات التي أتمّها اليوم" },
  { id: "lessons",       label: "دروس من المنهج",       unit: "درس",    hint: "تُحتسب من متتبّع التقدّم الدراسي" },
  { id: "roomJoin",      label: "حضور غرفة مراجعة",     unit: "غرفة",   hint: "تُحتسب من حضور الغرف" },
  { id: "posts",         label: "مشاركة في المجتمع",    unit: "منشور",  hint: "تُحتسب من منشورات الطالب" },
  { id: "custom",        label: "مهمّة يدوية",          unit: "خطوة",   hint: "يُعلّمها الطالب بنفسه — بلا نقاط تلقائية" },
];

export interface Mission extends Targeted {
  id: string;
  title: string;
  hint?: string;
  kind: MissionKind | string;
  /** العدد المطلوب لإتمامها */
  target: number;
  xp?: number;
  branches?: BranchMap | null;
  subject?: string | null;
  enabled?: boolean;
  /** نافذة الصلاحية — خارجها لا تظهر */
  startAt?: number;
  endAt?: number;
  createdAt: number;
  createdBy?: string;
}

const PATH = "dailyMissions";
const MAX_MISSION_XP = 40;

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/* ── قراءة ── */

export function listenMissions(cb: (list: Mission[]) => void) {
  return onValue(ref(rtdb, PATH), (snap) => {
    const val = (snap.val() as Record<string, Omit<Mission, "id">> | null) ?? {};
    cb(Object.entries(val).map(([id, m]) => ({ id, ...m })).sort((a, b) => b.createdAt - a.createdAt));
  }, () => cb([]));
}

export function useMissions() {
  const [list, setList] = useState<Mission[] | null>(null);
  useEffect(() => {
    const unsub = listenMissions(setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  return list;
}

/** مهامّ اليوم لطالب بعينه — الفعّالة، داخل نافذتها، وموجَّهة لشعبته */
export function missionsForStudent(all: Mission[], track?: string | null, now = Date.now()): Mission[] {
  return all
    .filter((m) => m.enabled !== false)
    .filter((m) => !m.startAt || m.startAt <= now)
    .filter((m) => !m.endAt || m.endAt >= now)
    .filter((m) => matchesBranch(m, track))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 6);   // ستّ مهامّ سقفاً — قائمة أطول تُثبّط لا تُحفّز
}

/* ── كتابة (الأدمن) ── */

export async function createMission(input: Partial<Mission>, adminUid: string): Promise<string> {
  const r = push(ref(rtdb, PATH));
  await set(r, cleanMission(input, adminUid));
  return r.key as string;
}

export async function updateMission(id: string, patch: Partial<Mission>) {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    body[k] = v === "" ? null : v;
  }
  if (patch.xp !== undefined) body.xp = clampXp(patch.xp);
  if (patch.target !== undefined) body.target = clampTarget(patch.target);
  await update(ref(rtdb, `${PATH}/${id}`), body);
}

export async function deleteMission(id: string) {
  await remove(ref(rtdb, `${PATH}/${id}`));
}

function clampXp(v: unknown) { return Math.max(0, Math.min(MAX_MISSION_XP, Math.round(Number(v) || 0))); }
function clampTarget(v: unknown) { return Math.max(1, Math.min(50, Math.round(Number(v) || 1))); }

function cleanMission(input: Partial<Mission>, adminUid: string) {
  const o: Record<string, unknown> = {
    title: (input.title ?? "").trim().slice(0, 140),
    kind: input.kind ?? "custom",
    target: clampTarget(input.target),
    xp: clampXp(input.xp),
    enabled: input.enabled !== false,
    branches: input.branches ?? { all: true },
    createdAt: Date.now(),
    createdBy: adminUid,
  };
  if (input.hint?.trim()) o.hint = input.hint.trim().slice(0, 300);
  if (input.subject) o.subject = input.subject;
  if (input.startAt) o.startAt = input.startAt;
  if (input.endAt) o.endAt = input.endAt;
  return o;
}

/* ══════════════════════════════════════════════════════════
   القياس — من بيانات الطالب نفسها لا من ادّعائه
══════════════════════════════════════════════════════════ */

export interface DailyCounters {
  flashcards: number;
  feedQuestions: number;
  feedQuiz: number;
  lessons: number;
  roomJoin: number;
  posts: number;
}

const EMPTY: DailyCounters = {
  flashcards: 0, feedQuestions: 0, feedQuiz: 0, lessons: 0, roomJoin: 0, posts: 0,
};

function isToday(ts?: number): boolean {
  if (!ts) return false;
  return dayKey(new Date(ts)) === dayKey();
}

/**
 * يقرأ عدّادات اليوم من العُقد القائمة — قراءة واحدة لكل عقدة، لا
 * مستمعات دائمة: هذه لوحة تُفتح لا تيّار حيّ.
 */
export async function readDailyCounters(uid: string): Promise<DailyCounters> {
  const c: DailyCounters = { ...EMPTY };
  const day = dayKey();

  await Promise.all([
    // بطاقات المراجعة المحفوظة اليوم
    get(ref(rtdb, `flashcards/${uid}`)).then((s) => {
      const v = (s.val() as Record<string, { createdAt?: number }> | null) ?? {};
      c.flashcards = Object.values(v).filter((x) => isToday(x.createdAt)).length;
    }).catch(() => {}),

    // إنجازات التغذية اليوم — السؤال والتحدّي يُفصلان بوجود `total`
    get(ref(rtdb, `feedProgress/${uid}`)).then((s) => {
      const v = (s.val() as Record<string, { at?: number; total?: number; done?: boolean }> | null) ?? {};
      for (const p of Object.values(v)) {
        if (!p.done || !isToday(p.at)) continue;
        if ((p.total ?? 0) > 1) c.feedQuiz++;
        else c.feedQuestions++;
      }
    }).catch(() => {}),

    /* الدروس: حالة الدرس في `studyProgress` بلا طابع زمني، فلا تُخبرنا
       «أُنجز اليوم». نعدّها من عقدة النشاط التي يزيدها المتتبّع نفسه
       لحظة وضع الدرس على «أتقنته». */
    get(ref(rtdb, `activity/${uid}/lessons/${day}`)).then((s) => {
      c.lessons = Number(s.val()) || 0;
    }).catch(() => {}),

    // حضور الغرف اليوم (عقدة الحضور القائمة)
    get(ref(rtdb, `activity/${uid}/rooms/${day}`)).then((s) => {
      c.roomJoin = Number(s.val()) || 0;
    }).catch(() => {}),

    get(ref(rtdb, `activity/${uid}/posts/${day}`)).then((s) => {
      c.posts = Number(s.val()) || 0;
    }).catch(() => {}),
  ]);

  return c;
}

/** يُسجّل فعلاً يومياً قابلاً للقياس (دخول غرفة · نشر) */
export async function bumpDailyActivity(uid: string, key: "rooms" | "posts" | "lessons") {
  if (!uid) return;
  const path = `activity/${uid}/${key}/${dayKey()}`;
  try {
    const s = await get(ref(rtdb, path));
    await set(ref(rtdb, path), (Number(s.val()) || 0) + 1);
  } catch { /* الفعل الأساسي لا يفشل لأجل عدّاد */ }
}

export function progressOf(m: Mission, c: DailyCounters, manual: Record<string, boolean>): number {
  if (m.kind === "custom") return manual[m.id] ? m.target : 0;
  const key = m.kind as keyof DailyCounters;
  return Math.min(m.target, c[key] ?? 0);
}

/* ══════════════════════════════════════════════════════════
   طلب النقاط — مرّة واحدة لكل مهمّة في كل يوم
══════════════════════════════════════════════════════════ */

export interface MissionClaim {
  xp: number;
  at: number;
}

export function listenClaims(uid: string, day: string, cb: (m: Record<string, MissionClaim>) => void) {
  return onValue(ref(rtdb, `missionClaims/${uid}/${day}`), (s) => {
    cb((s.val() as Record<string, MissionClaim> | null) ?? {});
  }, () => cb({}));
}

/** علامة الطالب على مهمّة يدوية — لا تمنح نقاطاً بنفسها */
export async function setManualDone(uid: string, day: string, missionId: string, done: boolean) {
  const r = ref(rtdb, `missionManual/${uid}/${day}/${missionId}`);
  if (done) await set(r, Date.now());
  else await remove(r);
}

export function listenManual(uid: string, day: string, cb: (m: Record<string, boolean>) => void) {
  return onValue(ref(rtdb, `missionManual/${uid}/${day}`), (s) => {
    const v = (s.val() as Record<string, number> | null) ?? {};
    cb(Object.fromEntries(Object.keys(v).map((k) => [k, true])));
  }, () => cb({}));
}

/**
 * يستلم نقاط مهمّة مكتملة.
 * يعيد النقاط الممنوحة، أو 0 إن كانت مستلَمة أو غير مكتملة.
 */
export async function claimMission(
  uid: string,
  mission: Mission,
  counters: DailyCounters,
  manual: Record<string, boolean>,
): Promise<number> {
  const day = dayKey();
  const done = progressOf(mission, counters, manual) >= mission.target;
  if (!done) return 0;
  // المهمّة اليدوية لا تُمنح نقاطاً: لا دليل عليها سوى قول الطالب
  if (mission.kind === "custom") return 0;

  const claimRef = ref(rtdb, `missionClaims/${uid}/${day}/${mission.id}`);
  const prev = await get(claimRef);
  if (prev.exists()) return 0;

  const xp = clampXp(mission.xp);
  await set(claimRef, { xp, at: Date.now() });
  if (xp) await awardXp(uid, xp);
  return xp;
}

/** إشعار «مهمّة اليوم جاهزة» — مرّة واحدة يومياً عبر نظام الإشعارات القائم */
export async function notifyDailyOnce(uid: string, count: number) {
  if (!uid || !count) return;
  const day = dayKey();
  const flag = ref(rtdb, `missionManual/${uid}/${day}/_notified`);
  try {
    const s = await get(flag);
    if (s.exists()) return;
    await set(flag, Date.now());
    await addNotification(uid, {
      type: "daily",
      text: `🎯 مهمّة اليوم جاهزة — لديك ${count} ${count === 1 ? "مهمّة" : "مهامّ"} مناسبة لشعبتك.`,
      link: "/home",
    });
  } catch { /* الإشعار مساعد لا شرط */ }
}
