"use client";

import { ref, set, get, update, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { addNotification } from "@/features/community/social";
import type { ChallengeAttachment } from "@/features/rooms/challenge";

/* ════════════════════════════════════════════════════════════
   محاكاة البكالوريا داخل الغرفة — طبقة البيانات

   **لا بنية موازية.** الجلسة تعيش في `roomLive/{roomId}/exam` بجانب
   `challenge` و`poll` و`timer`، وقواعدها هي قواعد `roomLive` القائمة.
   وحالة الغرفة تنتقل إلى `exam` — وهي حالة **موجودة أصلاً** في
   `use-room-state` تُغلق الدردشة وتُظهر الشريط التفسيري. فالغرفة لا
   تُبنى من جديد، بل تُبدّل حالتها.

   الأوراق والعلامات خارج `roomLive` عمداً — بنفس السبب الذي أخرج
   `roomChallengeAnswers` منها: قراءة `roomLive` مفتوحة لكل عضو، ولا
   يمكن تضييقها للأبناء (صلاحيات Firebase تتوارث ولا تُلغى). ورقة
   الطالب وعلامته يقرؤهما هو ومالك الغرفة لا غير.

   المؤقّت **لحظة انتهاء مطلقة** (`endsAt`) لا مدّة: المدّة تحتاج
   معرفة «متى بدأ» عند كل جهاز، وتحديث الصفحة يُصفّرها. اللحظة
   المطلقة تُحسب مرّة واحدة عند الأستاذ فيتّفق عليها الجميع، ويصمد
   الوقت أمام التحديث وإعادة الاتصال.
════════════════════════════════════════════════════════════ */

export type ExamStatus = "running" | "ended";

export interface ExamGuardOpts {
  /** فرض ملء الشاشة */
  fs: boolean;
  /** رصد مغادرة الشاشة (مكافحة الغش) */
  ac: boolean;
  /** المؤثّرات الصوتية (جرس البداية · تكّة آخر ٥ دقائق) */
  sfx: boolean;
}

export interface ExamSession {
  status: ExamStatus;
  specialtyKey: string;
  specialtyLabel: string;
  subjectName: string;
  examLabel: string;
  examUrl: string;
  solutionUrl?: string | null;
  source?: string;
  durationMin: number;
  startedAt: number;
  /** لحظة انتهاء الوقت — مطلقة، فلا يُصفّرها تحديث الصفحة */
  endsAt: number;
  guard: ExamGuardOpts;
  /** يسمح بالتسليم بعد انتهاء الوقت (يبقى مسجّلاً كمتأخّر) */
  allowLate: boolean;
  /** يُفتح للطلبة بعد أن يقرّر الأستاذ */
  solutionReleased?: boolean;
  createdBy: string;
  endedAt?: number;
}

export interface ExamPaper {
  uid: string;
  name: string;
  text?: string;
  attachments?: ChallengeAttachment[];
  submittedAt: number;
  /** عدد مخالفات المراقبة كما سجّلها محرّك المحاكاة */
  violations?: number;
  /** سُلّمت آلياً عند انتهاء الوقت */
  auto?: boolean;
  /** سُلّمت بعد انتهاء الوقت */
  late?: boolean;
}

export interface ExamGrade {
  score: number;
  max: number;
  notes?: string;
  gradedAt: number;
  gradedBy: string;
  gradedByName?: string;
  /** لا يرى الطالب علامته قبل أن يُطلقها الأستاذ */
  released: boolean;
}

const MAX_TEXT = 8000;
const MAX_NOTES = 1500;

/* ── مسارات ── */
const examPath = (roomId: string) => `roomLive/${roomId}/exam`;
const papersPath = (roomId: string) => `roomExamPapers/${roomId}`;
const gradesPath = (roomId: string) => `roomExamGrades/${roomId}`;

/* ══════════ الأستاذ: إدارة الجلسة ══════════ */

export interface StartExamInput {
  specialtyKey: string;
  specialtyLabel: string;
  subjectName: string;
  examLabel: string;
  examUrl: string;
  solutionUrl?: string | null;
  source?: string;
  durationMin: number;
  guard: ExamGuardOpts;
  allowLate: boolean;
  createdBy: string;
}

/**
 * بدء محاكاة جديدة.
 * تمسح أوراق الجلسة السابقة وعلاماتها — كما يفعل `createChallenge`
 * تماماً: امتحان جديد يبدأ بصفحة نظيفة، وإلّا اختلطت أوراق موضوعين.
 */
export async function startExam(roomId: string, input: StartExamInput) {
  await remove(ref(rtdb, papersPath(roomId))).catch(() => {});
  await remove(ref(rtdb, gradesPath(roomId))).catch(() => {});

  const now = Date.now();
  const minutes = Math.max(1, Math.min(600, Math.round(input.durationMin)));
  const data: ExamSession = {
    status: "running",
    specialtyKey: input.specialtyKey,
    specialtyLabel: input.specialtyLabel,
    subjectName: input.subjectName,
    examLabel: input.examLabel.slice(0, 160),
    examUrl: input.examUrl,
    solutionUrl: input.solutionUrl || null,
    source: input.source || "main",
    durationMin: minutes,
    startedAt: now,
    endsAt: now + minutes * 60_000,
    guard: input.guard,
    allowLate: input.allowLate,
    solutionReleased: false,
    createdBy: input.createdBy,
  };
  await set(ref(rtdb, examPath(roomId)), data);
  // الحالة القائمة نفسها: تُغلق الدردشة وتُظهر شريط «وضع الامتحان»
  await set(ref(rtdb, `roomLive/${roomId}/roomState`), "exam");
}

/** إنهاء وقت الامتحان — الأوراق والعلامات تبقى */
export async function endExam(roomId: string) {
  await update(ref(rtdb, examPath(roomId)), { status: "ended", endedAt: Date.now() });
}

/** تمديد الوقت بدقائق (موجب أو سالب) */
export async function extendExam(roomId: string, minutes: number) {
  const snap = await get(ref(rtdb, examPath(roomId)));
  const s = snap.val() as ExamSession | null;
  if (!s) return;
  const next = Math.max(Date.now() + 10_000, s.endsAt + minutes * 60_000);
  await update(ref(rtdb, examPath(roomId)), { endsAt: next, status: "running" });
}

export async function releaseSolution(roomId: string, on: boolean) {
  await update(ref(rtdb, examPath(roomId)), { solutionReleased: on });
}

/**
 * إغلاق المحاكاة وإعادة الغرفة إلى وضعها الطبيعي.
 * **لا يُحذف شيء**: الأوراق والعلامات تبقى، ويستطيع الأستاذ التصحيح
 * لاحقاً وإطلاق النتائج بعد أن يغادر الطلبة.
 */
export async function closeExam(roomId: string) {
  await remove(ref(rtdb, examPath(roomId)));
  await set(ref(rtdb, `roomLive/${roomId}/roomState`), "study");
}

export function listenExam(roomId: string, cb: (s: ExamSession | null) => void) {
  return onValue(ref(rtdb, examPath(roomId)), (snap) => {
    cb((snap.val() as ExamSession | null) ?? null);
  }, () => cb(null));
}

/* ══════════ الطالب: التسليم ══════════ */

export interface SubmitInput {
  uid: string;
  name: string;
  text: string;
  attachments: ChallengeAttachment[];
  violations: number;
  auto?: boolean;
}

/**
 * تسليم الورقة.
 * **مرّة واحدة**: القاعدة ترفض الكتابة فوق ورقة مسلَّمة، والواجهة
 * تتحقّق أيضاً — فلا تسليم مكرّر ولا تعديل بعد التسليم.
 */
export async function submitPaper(
  roomId: string,
  session: ExamSession,
  input: SubmitInput,
): Promise<string | null> {
  const existing = await get(ref(rtdb, `${papersPath(roomId)}/${input.uid}`));
  if (existing.exists()) return "سلّمتَ ورقتك مسبقاً.";

  const late = Date.now() > session.endsAt;
  if (late && !session.allowLate && !input.auto) {
    return "انتهى الوقت ولم يعد التسليم متاحاً.";
  }

  const text = input.text.trim().slice(0, MAX_TEXT);
  const atts = (input.attachments ?? []).slice(0, 6).map((a) => ({
    url: a.url, name: a.name.slice(0, 120), kind: a.kind,
  }));
  if (!text && atts.length === 0) return "اكتب حلّك أو أرفق صورة ورقتك قبل التسليم.";

  const paper: Record<string, unknown> = {
    name: (input.name || "طالب").slice(0, 80),
    submittedAt: Date.now(),
    violations: Math.max(0, Math.round(input.violations || 0)),
  };
  if (text) paper.text = text;
  if (atts.length) paper.attachments = atts;
  if (input.auto) paper.auto = true;
  if (late) paper.late = true;

  await set(ref(rtdb, `${papersPath(roomId)}/${input.uid}`), paper);
  return null;
}

/** ورقة الطالب نفسه — يقرؤها هو والأستاذ */
export function listenMyPaper(roomId: string, uid: string, cb: (p: ExamPaper | null) => void) {
  return onValue(ref(rtdb, `${papersPath(roomId)}/${uid}`), (snap) => {
    const v = snap.val() as Omit<ExamPaper, "uid"> | null;
    cb(v ? { uid, ...v } : null);
  }, () => cb(null));
}

/** كل الأوراق — للأستاذ وحده (القاعدة تمنع غيره) */
export function listenPapers(roomId: string, cb: (list: ExamPaper[]) => void) {
  return onValue(ref(rtdb, papersPath(roomId)), (snap) => {
    const val = (snap.val() as Record<string, Omit<ExamPaper, "uid">> | null) ?? {};
    cb(
      Object.entries(val)
        .map(([uid, p]) => ({ uid, ...p }))
        .sort((a, b) => a.submittedAt - b.submittedAt),
    );
  }, () => cb([]));
}

/* ══════════ التصحيح والنتائج ══════════ */

export function listenGrades(roomId: string, cb: (m: Record<string, ExamGrade>) => void) {
  return onValue(ref(rtdb, gradesPath(roomId)), (snap) => {
    cb((snap.val() as Record<string, ExamGrade> | null) ?? {});
  }, () => cb({}));
}

export function listenMyGrade(roomId: string, uid: string, cb: (g: ExamGrade | null) => void) {
  return onValue(ref(rtdb, `${gradesPath(roomId)}/${uid}`), (snap) => {
    cb((snap.val() as ExamGrade | null) ?? null);
  }, () => cb(null));
}

/**
 * حفظ التقييم.
 * `released` منفصل عن الحفظ عمداً: الأستاذ قد يصحّح عشر أوراق ثمّ
 * يُطلقها دفعة واحدة، ولا يجوز أن يرى أوّل طالب علامته قبل آخرهم.
 */
export async function saveGrade(
  roomId: string,
  roomName: string,
  studentUid: string,
  grade: { score: number; max: number; notes?: string; released: boolean },
  by: { uid: string; name: string },
) {
  const max = Math.max(1, Math.min(100, Math.round(grade.max) || 20));
  const score = Math.max(0, Math.min(max, Math.round(grade.score * 4) / 4));
  const data: ExamGrade = {
    score,
    max,
    gradedAt: Date.now(),
    gradedBy: by.uid,
    gradedByName: by.name.slice(0, 80),
    released: grade.released,
  };
  const notes = grade.notes?.trim().slice(0, MAX_NOTES);
  if (notes) data.notes = notes;

  await set(ref(rtdb, `${gradesPath(roomId)}/${studentUid}`), data);

  /* الإشعار عند الإطلاق فقط — نظام الإشعارات القائم نفسه.
     إشعار عند كل حفظ يعني إزعاج الطالب بعلامة قد تتغيّر. */
  if (grade.released) {
    await addNotification(studentUid, {
      type: "exam",
      text: `صُحّحت ورقتك في «${roomName}» — علامتك ${score}/${max}`,
      link: `/rooms/${roomId}`,
    });
  }
}

/** إطلاق كل العلامات المصحّحة دفعة واحدة */
export async function releaseAllGrades(
  roomId: string,
  roomName: string,
  grades: Record<string, ExamGrade>,
) {
  const pending = Object.entries(grades).filter(([, g]) => !g.released);
  for (const [uid, g] of pending) {
    await update(ref(rtdb, `${gradesPath(roomId)}/${uid}`), { released: true });
    await addNotification(uid, {
      type: "exam",
      text: `صُحّحت ورقتك في «${roomName}» — علامتك ${g.score}/${g.max}`,
      link: `/rooms/${roomId}`,
    });
  }
  return pending.length;
}

/* ══════════ مساعدات الوقت ══════════ */

/** الثواني المتبقية — من اللحظة المطلقة، فتصمد أمام التحديث */
export function secondsLeft(session: ExamSession | null): number {
  if (!session) return 0;
  return Math.max(0, Math.floor((session.endsAt - Date.now()) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/** «٤ سا و٣٠ د» — الشكل الذي يستعمله المحاكي */
export function formatSimDuration(minutes?: number | null): string {
  const m = Number(minutes) || 0;
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} د`;
  return r ? `${h} سا و${r} د` : `${h} سا`;
}

export function isTimeUp(session: ExamSession | null): boolean {
  if (!session) return false;
  return session.status === "ended" || Date.now() >= session.endsAt;
}
