"use client";

import { useEffect, useState } from "react";
import {
  ref, set, push, update, remove, onValue, get, query, orderByChild, limitToLast,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { BranchMap, Targeted } from "@/features/feed/targeting";
import { matchesBranch, relevanceScore } from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   التغذية الدراسية — طبقة البيانات

   **ليست منشوراً بعنوان آخر.** المنشور نصّ يقرؤه الطالب؛ وعنصر التغذية
   شيء **يفعله**: يُجيب، يصوّت، يحفظ بطاقة، يكتشف خطأً شائعاً. لذلك لكل
   نوع حمولته ومعالجته، ولذلك عاش في عقدة مستقلّة لا في `community/posts`
   — فمنشورات المجتمع تبقى كما هي بلا حرف واحد.

   ثلاث عُقد لا أكثر:
     studyFeed/$id                 المحتوى (يكتبه الأدمن، يقرؤه الجميع)
     feedVotes/$id/$uid            صوت/إجابة الطالب (يكتب سطره وحده)
     feedProgress/$uid/$id         ما أنجزه الطالب (يقرؤه هو وحده)

   والأصوات في عقدة منفصلة عن المحتوى بنفس منطق `roomLive/poll/votes`
   القائم: الطالب يكتب صوته ولا يمسّ السؤال. والنسبة تُحسب عند القراءة
   لا تُخزَّن رقماً — فلا رقم قابلاً للتزوير.

   الأنواع **مفتوحة**: `type` نصّ حرّ يعرف العارض ما يعرفه ويعرض الباقي
   بطاقةَ محتوى عامّة. فإضافة نوع لاحقاً لا تكسر ما نُشر.
════════════════════════════════════════════════════════════ */

export type FeedType =
  | "question" | "quiz" | "poll" | "flashcard" | "mistake"
  | "fact" | "philosophy" | "document" | "challenge" | "practice"
  | "room" | "note";

export const FEED_TYPES: { id: FeedType; label: string; emoji: string; hint: string }[] = [
  { id: "question",   label: "سؤال",            emoji: "🧠", hint: "سؤال باختيارات وإجابة صحيحة وشرح" },
  { id: "quiz",       label: "تحدٍّ سريع",       emoji: "🎯", hint: "عدّة أسئلة متتالية مع نتيجة" },
  { id: "poll",       label: "استفتاء",          emoji: "📊", hint: "رأي الطلبة — بلا إجابة صحيحة" },
  { id: "flashcard",  label: "بطاقات مراجعة",    emoji: "📘", hint: "وجه/ظهر — تُحفظ في بطاقات الطالب" },
  { id: "mistake",    label: "خطأ شائع",         emoji: "📝", hint: "الخطأ ← التصحيح ← لماذا ← نصيحة" },
  { id: "fact",       label: "معلومة",           emoji: "💡", hint: "حقيقة أو ملاحظة قصيرة" },
  { id: "philosophy", label: "سؤال فلسفة",       emoji: "🔥", hint: "مقالة قصيرة ثمّ نموذج إجابة" },
  { id: "document",   label: "وثيقة تاريخ",      emoji: "📄", hint: "صورة وثيقة وسؤال عليها" },
  { id: "challenge",  label: "تحدّي اليوم",      emoji: "🏆", hint: "يُبرَز في صدر التغذية" },
  { id: "practice",   label: "تمرين قصير",       emoji: "✏️", hint: "تمرين بحلّ يُكشف بعد المحاولة" },
  { id: "note",       label: "بطاقة محتوى",      emoji: "📌", hint: "نصّ حرّ + رابط — نوع عامّ يقبل أي محتوى" },
];

export interface FeedChoice {
  text: string;
  correct?: boolean;
}

export interface FeedQuestion {
  text: string;
  imageUrl?: string;
  choices: FeedChoice[];
  explanation?: string;
}

/* ── المرفقات ──
   لا استضافة لدينا، فالمرفق **رابط** لا ملفّ مرفوع: صورة التمرين على أي
   مستضيف، أو ملفّ PDF على Drive. النوع يُستنتج من الرابط ليُعرض كصورة
   داخل البطاقة أو كبطاقة ملفّ قابلة للفتح — لا رابط عارٍ أمام الطالب. */
export type AttachmentKind = "image" | "pdf" | "file";

export interface FeedAttachment {
  url: string;
  label?: string;
  kind?: AttachmentKind;
}

/** يستنتج نوع المرفق من امتداد الرابط — والمستخدم يستطيع تجاوزه صراحةً */
export function attachmentKind(a: FeedAttachment): AttachmentKind {
  if (a.kind) return a.kind;
  const u = (a.url || "").split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(u)) return "image";
  if (/\.pdf$/.test(u)) return "pdf";
  return "file";
}

export interface FeedCard {
  front: string;
  back: string;
}

export interface FeedItem extends Targeted {
  id: string;
  type: FeedType | string;
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  /** question · quiz · practice · document */
  questions?: FeedQuestion[];
  /** poll */
  options?: string[];
  /** flashcard */
  cards?: FeedCard[];
  /** مرفقات (صور/ملفّات) — تُعرض تحت النصّ. `null` تعني «احذفها» عند التحديث */
  attachments?: FeedAttachment[] | null;
  /** mistake */
  wrong?: string;
  right?: string;
  why?: string;
  tip?: string;
  /** philosophy */
  modelAnswer?: string;
  /** نقاط تُمنح مرّة واحدة عند الإنجاز */
  xp?: number;
  branches?: BranchMap | null;
  subject?: string | null;
  /** ترتيب يدوي من الأدمن — الأعلى أوّلاً */
  priority?: number;
  pinned?: boolean;
  featured?: boolean;
  hidden?: boolean;
  publishAt?: number;
  expiresAt?: number;
  createdAt: number;
  createdBy?: string;
}

const PATH = "studyFeed";
const MAX_XP = 40;

/* ── قراءة ── */

export function listenFeed(cb: (items: FeedItem[]) => void, max = 80) {
  return onValue(
    query(ref(rtdb, PATH), orderByChild("createdAt"), limitToLast(max)),
    (snap) => {
      const val = (snap.val() as Record<string, Omit<FeedItem, "id">> | null) ?? {};
      cb(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    },
    () => cb([]),
  );
}

export function useFeed(max = 80) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  useEffect(() => {
    const unsub = listenFeed(setItems, max);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [max]);
  return items;
}

/** هل العنصر منشور الآن؟ (النشر المجدول والانتهاء) */
export function isLive(i: FeedItem, now = Date.now()): boolean {
  if (i.hidden) return false;
  if (i.publishAt && i.publishAt > now) return false;
  if (i.expiresAt && i.expiresAt < now) return false;
  return true;
}

/**
 * ترتيب التغذية لطالب بعينه.
 *
 * الترتيب مقصود ولا يُترك للصدفة: المثبّت أوّلاً، ثمّ تحدّي اليوم، ثمّ
 * ما صُوِّب إلى شعبته، ثمّ الأحدث. و**لا نوعان متتاليان من نوع واحد**
 * إن أمكن — خمس بطاقات غرف متتالية تُحوّل التغذية إلى إعلان.
 */
export function rankFeed(
  items: FeedItem[],
  student: { track?: string | null; subject?: string | null },
): FeedItem[] {
  const now = Date.now();
  const visible = items.filter((i) => isLive(i, now) && matchesBranch(i, student.track));

  const scored = visible.map((i) => {
    let s = relevanceScore(i, student);
    if (i.pinned) s += 500;
    if (i.type === "challenge") s += 120;
    if (i.featured) s += 60;
    s += Math.max(0, Math.min(50, Number(i.priority) || 0));
    // الطزاجة: تسقط تدريجياً على مدى أسبوعين
    const ageDays = (now - (i.createdAt ?? 0)) / 86_400_000;
    s += Math.max(0, 30 - ageDays * 2);
    return { i, s };
  });

  scored.sort((a, b) => b.s - a.s || (b.i.createdAt ?? 0) - (a.i.createdAt ?? 0));
  return spread(scored.map((x) => x.i));
}

/** يُبعد المتجاورين من النوع نفسه دون تخريب الترتيب */
function spread(list: FeedItem[]): FeedItem[] {
  const out: FeedItem[] = [];
  const rest = [...list];
  while (rest.length) {
    const prev = out[out.length - 1];
    let idx = 0;
    if (prev) {
      const alt = rest.findIndex((x) => x.type !== prev.type);
      if (alt > 0 && alt <= 2) idx = alt;   // ننظر خطوتين لا أكثر
    }
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}

/* ── كتابة (الأدمن) ── */

function clean(input: Partial<FeedItem>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === "" || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    o[k] = v;
  }
  return o;
}

export async function createFeedItem(input: Partial<FeedItem>, adminUid: string): Promise<string> {
  const r = push(ref(rtdb, PATH));
  await set(r, {
    ...clean(input),
    xp: Math.max(0, Math.min(MAX_XP, Math.round(Number(input.xp) || 0))),
    createdAt: Date.now(),
    createdBy: adminUid,
  });
  return r.key as string;
}

export async function updateFeedItem(id: string, patch: Partial<FeedItem>) {
  const body = clean(patch);
  // الحقول التي تُفرَّغ عمداً تُكتب null صراحةً كي تُحذف
  for (const k of ["body", "imageUrl", "linkUrl", "modelAnswer", "wrong", "right", "why", "tip"] as const) {
    if (patch[k] === "") body[k] = null;
  }
  // المرفقات مصفوفة: تفريغها يجب أن يكتب null وإلّا بقيت القديمة
  if (patch.attachments === null || (Array.isArray(patch.attachments) && !patch.attachments.length)) {
    body.attachments = null;
  }
  if (patch.xp !== undefined) body.xp = Math.max(0, Math.min(MAX_XP, Math.round(Number(patch.xp) || 0)));
  await update(ref(rtdb, `${PATH}/${id}`), body);
}

export async function deleteFeedItem(id: string) {
  await remove(ref(rtdb, `${PATH}/${id}`));
  await remove(ref(rtdb, `feedVotes/${id}`)).catch(() => {});
}

/* ── تفاعل الطالب ── */

export interface FeedVote {
  /** رقم الخيار (استفتاء/سؤال) أو نصّ (فلسفة) */
  choice?: number;
  text?: string;
  at: number;
}

/** أصوات عنصر — تُقرأ لحساب النسب، ولا رقم مخزَّن يمكن تزويره */
export function listenVotes(itemId: string, cb: (v: Record<string, FeedVote>) => void) {
  return onValue(ref(rtdb, `feedVotes/${itemId}`), (s) => {
    cb((s.val() as Record<string, FeedVote> | null) ?? {});
  }, () => cb({}));
}

export async function castFeedVote(itemId: string, uid: string, vote: { choice?: number; text?: string }) {
  const data: FeedVote = { at: Date.now() };
  if (typeof vote.choice === "number") data.choice = vote.choice;
  if (vote.text) data.text = vote.text.trim().slice(0, 2000);
  await set(ref(rtdb, `feedVotes/${itemId}/${uid}`), data);
}

export function tally(votes: Record<string, FeedVote>, optionCount: number) {
  const counts = new Array(optionCount).fill(0) as number[];
  let total = 0;
  for (const v of Object.values(votes)) {
    if (typeof v.choice === "number" && v.choice >= 0 && v.choice < optionCount) {
      counts[v.choice]++;
      total++;
    }
  }
  return { counts, total, pct: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)) };
}

/* ── تقدّم الطالب في التغذية ── */

export interface FeedProgress {
  done?: boolean;
  /** عدد الإجابات الصحيحة (اختبار) */
  score?: number;
  total?: number;
  xpClaimed?: number;
  at: number;
}

export function listenMyFeedProgress(uid: string, cb: (m: Record<string, FeedProgress>) => void) {
  return onValue(ref(rtdb, `feedProgress/${uid}`), (s) => {
    cb((s.val() as Record<string, FeedProgress> | null) ?? {});
  }, () => cb({}));
}

export async function getFeedProgress(uid: string, itemId: string): Promise<FeedProgress | null> {
  try {
    const s = await get(ref(rtdb, `feedProgress/${uid}/${itemId}`));
    return (s.val() as FeedProgress | null) ?? null;
  } catch { return null; }
}

/**
 * تسجيل إنجاز عنصر — **مرّة واحدة**.
 * القاعدة ترفض الكتابة فوق سجلّ قائم، فلا يُعاد المحاولة لجمع النقاط
 * مرّتين. والنقاط تُمنح من هنا لا من الواجهة (انظر `awardFeedXp`).
 */
export async function markFeedDone(
  uid: string,
  item: FeedItem,
  result?: { score?: number; total?: number },
): Promise<number> {
  const prev = await getFeedProgress(uid, item.id);
  if (prev?.done) return 0;

  const xp = Math.max(0, Math.min(MAX_XP, Math.round(Number(item.xp) || 0)));
  const data: FeedProgress = { done: true, at: Date.now() };
  if (typeof result?.score === "number") data.score = result.score;
  if (typeof result?.total === "number") data.total = result.total;
  if (xp) data.xpClaimed = xp;

  await set(ref(rtdb, `feedProgress/${uid}/${item.id}`), data);
  return xp;
}
