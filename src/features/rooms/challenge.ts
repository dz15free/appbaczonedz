// Live Problem — تحدّيات داخل الغرفة (RTDB، بلا أي تكلفة إضافية)
//
// الخصوصية هي جوهر التصميم:
//   roomLive/{roomId}/challenge        → السؤال (يقرأه الجميع، يكتبه المالك)
//   roomChallengeAnswers/{roomId}/{uid} → حلّ الطالب (يقرأه صاحبه والمالك فقط)
//   roomChallengeScores/{roomId}/{uid}  → التقييم (يكتبه المالك فقط)
//
// الحلول خارج roomLive عمداً: قاعدة القراءة هناك مفتوحة لكل عضو،
// ولا يمكن تضييقها للأبناء (صلاحيات Firebase تتوارث ولا تُلغى).
// أفضل حل يُنسخ نصّه داخل challenge/showcase ليراه الجميع دون فتح بقية الحلول.

import { ref, set, get, push, remove, update, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface ChallengeShowcase {
  name: string;
  text: string;
}

/** مرفق التمرين: صورة أو مستند يراه الطلاب مع السؤال */
export interface ChallengeAttachment {
  /** رابط العرض المباشر */
  url: string;
  name: string;
  /** صورة تُعرض داخل البطاقة · مستند يُفتح في تبويب */
  kind: "image" | "doc";
}

export interface Challenge {
  question: string;
  createdAt: number;
  open: boolean;
  showcase?: ChallengeShowcase;
  attachment?: ChallengeAttachment;
  /** لحظة انتهاء الوقت — مُطلقة لا مدّة.
      المدّة تحتاج معرفة «متى بدأ» عند كل جهاز، وساعات الأجهزة تختلف؛
      اللحظة المطلقة تُحسب مرّة واحدة عند الأستاذ فيتّفق الجميع عليها. */
  deadline?: number;
}

export interface ChallengeAnswer {
  uid: string;
  name: string;
  text: string;
  at: number;
  /** صورة الحلّ أو ملفّه — كثير من الحلول تُكتب على الورق ثم تُصوَّر */
  attachment?: ChallengeAttachment;
}

const MAX_ANSWER = 4000;
const MAX_QUESTION = 2000;

/* ═══════════ الأستاذ ═══════════ */

export async function createChallenge(
  roomId: string,
  question: string,
  opts?: { attachment?: ChallengeAttachment; minutes?: number },
) {
  const q = question.trim();
  // السؤال قد يكون فارغاً إن كان المرفق هو التمرين نفسه (صورة تمرين)
  if (!q && !opts?.attachment) return;
  // تحدٍّ جديد يبدأ بصفحة نظيفة: نمسح حلول التحدي السابق
  await remove(ref(rtdb, `roomChallengeAnswers/${roomId}`));
  await remove(ref(rtdb, `roomChallengeScores/${roomId}`));
  /* قاعدة البيانات ترفض `undefined` وتُسقط الكتابة كلّها، فنبني
     الكائن حقلاً حقلاً بدل تمرير خصائص قد تكون غير معرّفة. */
  const data: Record<string, unknown> = {
    question: q.slice(0, MAX_QUESTION),
    createdAt: Date.now(),
    open: true,
  };
  if (opts?.attachment?.url) {
    data.attachment = {
      url: opts.attachment.url,
      name: opts.attachment.name.slice(0, 120),
      kind: opts.attachment.kind,
    };
  }
  const m = Number(opts?.minutes);
  if (Number.isFinite(m) && m > 0) data.deadline = Date.now() + m * 60_000;

  await set(ref(rtdb, `roomLive/${roomId}/challenge`), data);
}

/** إغلاق التسليم مع إبقاء الحلول ظاهرة للأستاذ */
export async function closeChallenge(roomId: string) {
  await update(ref(rtdb, `roomLive/${roomId}/challenge`), { open: false });
}

/** إنهاء التحدي وإزالته من شاشة الجميع */
export async function endChallenge(roomId: string) {
  await remove(ref(rtdb, `roomLive/${roomId}/challenge`));
  await remove(ref(rtdb, `roomChallengeAnswers/${roomId}`));
  await remove(ref(rtdb, `roomChallengeScores/${roomId}`));
}

/** عرض حلّ كأفضل إجابة — يُنسخ نصّه ليراه الجميع دون كشف بقية الحلول */
export async function showcaseAnswer(roomId: string, answer: ChallengeAnswer | null) {
  const r = ref(rtdb, `roomLive/${roomId}/challenge/showcase`);
  if (!answer) {
    await remove(r);
    return;
  }
  await set(r, { name: answer.name, text: answer.text });
}

export async function setAnswerScore(roomId: string, uid: string, score: number | null) {
  const r = ref(rtdb, `roomChallengeScores/${roomId}/${uid}`);
  if (score === null) await remove(r);
  else await set(r, score);
}

export function listenAllAnswers(roomId: string, cb: (list: ChallengeAnswer[]) => void) {
  return onValue(ref(rtdb, `roomChallengeAnswers/${roomId}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<ChallengeAnswer, "uid">>) ?? {};
    const list = Object.entries(val)
      .map(([uid, a]) => ({ uid, ...a }))
      .sort((a, b) => a.at - b.at); // الأسبق أولاً
    cb(list);
  });
}

export function listenScores(roomId: string, cb: (scores: Record<string, number>) => void) {
  return onValue(ref(rtdb, `roomChallengeScores/${roomId}`), (snap) => {
    cb((snap.val() as Record<string, number>) ?? {});
  });
}

/* ═══════════ الطالب ═══════════ */

export async function submitAnswer(roomId: string, uid: string, name: string, text: string,
  attachment?: ChallengeAttachment) {
  const t = text.trim();
  /* الحلّ قد يكون **صورة بلا نصّ** — ورقة مصوّرة. رفضه لغياب النصّ كان
     سيمنع أشيع طريقة يحلّ بها الطالب فعلاً. */
  if (!t && !attachment?.url) return;
  const row: Record<string, unknown> = {
    name: name || "طالب",
    text: t.slice(0, MAX_ANSWER),
    at: Date.now(),
  };
  if (attachment?.url) {
    row.attachment = {
      url: attachment.url,
      name: attachment.name.slice(0, 120),
      kind: attachment.kind,
    };
  }
  await set(ref(rtdb, `roomChallengeAnswers/${roomId}/${uid}`), row);
}

export function listenMyAnswer(roomId: string, uid: string, cb: (a: ChallengeAnswer | null) => void) {
  return onValue(ref(rtdb, `roomChallengeAnswers/${roomId}/${uid}`), (snap) => {
    const v = snap.val() as Omit<ChallengeAnswer, "uid"> | null;
    cb(v ? { uid, ...v } : null);
  });
}

export function listenMyScore(roomId: string, uid: string, cb: (score: number | null) => void) {
  return onValue(ref(rtdb, `roomChallengeScores/${roomId}/${uid}`), (snap) => {
    cb((snap.val() as number | null) ?? null);
  });
}

/* ═══════════ مشترك ═══════════ */

export function listenChallenge(roomId: string, cb: (c: Challenge | null) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/challenge`), (snap) => {
    cb((snap.val() as Challenge | null) ?? null);
  });
}

/** عدّاد المسلّمين — يستعمله الأستاذ دون تحميل نصوص الحلول */
export async function countAnswers(roomId: string): Promise<number> {
  const snap = await get(ref(rtdb, `roomChallengeAnswers/${roomId}`));
  return snap.exists() ? Object.keys(snap.val() as object).length : 0;
}

/** حفظ التحدي وحلّه في بطاقات المراجعة لاحقاً — يبني نصّ البطاقة */
export function challengeToCard(question: string, answer: string) {
  return { front: `🧠 ${question}`, back: answer };
}

// مُصدَّر للاستعمال المستقبلي في سجلّ التحديات داخل ملخّص الحصة
export async function archiveChallenge(roomId: string, challenge: Challenge) {
  await push(ref(rtdb, `roomLive/${roomId}/challengeHistory`), {
    question: challenge.question,
    at: challenge.createdAt,
  });
}


/** هل انتهى الوقت؟ يُحسب من اللحظة المطلقة فيتّفق عليه كل الأجهزة. */
export function isChallengeExpired(c: Challenge | null | undefined): boolean {
  return Boolean(c?.deadline && Date.now() >= c.deadline);
}

/** ما تبقّى بالثواني — سالب يعني انتهى */
export function challengeSecondsLeft(c: Challenge | null | undefined): number | null {
  if (!c?.deadline) return null;
  return Math.round((c.deadline - Date.now()) / 1000);
}
