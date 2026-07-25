// Session Summary — ملخّص الحصة
//
// المبدأ: لا تسجيل مستمر ولا ذكاء اصطناعي. الملخّص يُبنى عند الطلب
// من بيانات موجودة أصلاً في الغرفة (الملاحظات، الملفات، التحديات،
// الاستفتاء، الأسئلة). صفر كتابات إضافية أثناء الحصة، وصفر تكلفة.
//
// يُحفظ في roomSummaries/{roomId}/{id} فيبقى بعد انتهاء الحصة،
// ويستطيع الطالب فتحه لاحقاً ونسخ نقاطه إلى بطاقات المراجعة.

import { ref, get, set, push, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { RoomFile } from "@/features/rooms/rooms";

export interface SummaryChallenge {
  question: string;
  bestBy?: string;
  bestText?: string;
}

export interface SessionSummary {
  id: string;
  at: number;
  byName: string;
  covered: string;          // ما تم شرحه
  homework: string;         // الواجب
  keyPoints: string[];      // أهم النقاط
  files: string[];          // الملفات المستخدمة
  challenges: SummaryChallenge[];
  pollQuestion?: string;
  questionCount: number;    // عدد الأسئلة المجهولة
  durationMin?: number;
}

/** مسوّدة مبنيّة من حالة الغرفة الحالية — يراجعها الأستاذ قبل النشر */
export async function buildDraft(roomId: string, byName: string): Promise<Omit<SessionSummary, "id">> {
  const [notesSnap, filesSnap, chSnap, pollSnap, anonSnap] = await Promise.all([
    get(ref(rtdb, `roomLive/${roomId}/notes`)),
    get(ref(rtdb, `rooms/${roomId}/files`)),
    get(ref(rtdb, `roomLive/${roomId}/challenge`)),
    get(ref(rtdb, `roomLive/${roomId}/poll`)),
    get(ref(rtdb, `roomLive/${roomId}/anonQuestions`)),
  ]);

  // الملاحظات: أول سطر يصلح كعنوان لما شُرح، والأسطر التي تبدأ بعلامة قائمة تصلح كنقاط
  const notes = (notesSnap.val() as string | null) ?? "";
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  const keyPoints = lines
    .filter((l) => /^[-•*–]\s*/.test(l))
    .map((l) => l.replace(/^[-•*–]\s*/, ""))
    .slice(0, 12);
  const covered = lines.filter((l) => !/^[-•*–]\s*/.test(l)).join("\n").slice(0, 1500);

  const filesVal = (filesSnap.val() as Record<string, RoomFile> | null) ?? {};
  const files = Object.values(filesVal).map((f) => f.name).filter(Boolean).slice(0, 20);

  const challenges: SummaryChallenge[] = [];
  const ch = chSnap.val() as { question?: string; showcase?: { name: string; text: string } } | null;
  if (ch?.question) {
    challenges.push({
      question: ch.question,
      bestBy: ch.showcase?.name,
      bestText: ch.showcase?.text,
    });
  }

  const poll = pollSnap.val() as { question?: string } | null;
  const anon = (anonSnap.val() as Record<string, unknown> | null) ?? {};

  return {
    at: Date.now(),
    byName,
    covered,
    homework: "",
    keyPoints,
    files,
    challenges,
    pollQuestion: poll?.question,
    questionCount: Object.keys(anon).length,
  };
}

export async function publishSummary(roomId: string, s: Omit<SessionSummary, "id">) {
  const r = push(ref(rtdb, `roomSummaries/${roomId}`));
  // Firebase يرفض undefined — ننظّف الحقول الفارغة
  const clean: Record<string, unknown> = {
    at: s.at, byName: s.byName, covered: s.covered, homework: s.homework,
    keyPoints: s.keyPoints, files: s.files, challenges: s.challenges,
    questionCount: s.questionCount,
  };
  if (s.pollQuestion) clean.pollQuestion = s.pollQuestion;
  if (s.durationMin) clean.durationMin = s.durationMin;
  await set(r, clean);
  return r.key as string;
}

export async function deleteSummary(roomId: string, id: string) {
  await remove(ref(rtdb, `roomSummaries/${roomId}/${id}`));
}

/** أحدث الملخّصات أولاً */
export function listenSummaries(roomId: string, cb: (list: SessionSummary[]) => void) {
  return onValue(ref(rtdb, `roomSummaries/${roomId}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<SessionSummary, "id">>) ?? {};
    cb(
      Object.entries(val)
        .map(([id, v]) => ({
          id,
          ...v,
          keyPoints: v.keyPoints ?? [],
          files: v.files ?? [],
          challenges: v.challenges ?? [],
        }))
        .sort((a, b) => b.at - a.at)
    );
  });
}

/** نصّ جاهز للنسخ أو المشاركة خارج المنصّة */
export function summaryToText(s: SessionSummary, roomName: string): string {
  const d = new Date(s.at).toLocaleDateString("ar-DZ");
  const out: string[] = [`ملخّص حصة: ${roomName} — ${d}`, ""];
  if (s.covered) out.push("ما تم شرحه:", s.covered, "");
  if (s.keyPoints.length) {
    out.push("أهم النقاط:");
    s.keyPoints.forEach((p) => out.push(`• ${p}`));
    out.push("");
  }
  if (s.challenges.length) {
    out.push("التحدّيات:");
    s.challenges.forEach((c) => out.push(`• ${c.question}${c.bestBy ? ` (أفضل حل: ${c.bestBy})` : ""}`));
    out.push("");
  }
  if (s.homework) out.push("الواجب:", s.homework, "");
  if (s.files.length) out.push("الملفات المستخدمة:", ...s.files.map((f) => `• ${f}`), "");
  return out.join("\n").trim();
}
