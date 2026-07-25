"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain, faPaperPlane, faCheck, faStar, faXmark,
  faTrophy, faLock, faPenToSquare, faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { MathText, MATH_SNIPPETS, insertAtCursor } from "@/features/rooms/use-katex";
import { saveFlashcard } from "@/features/study/save-flashcard";
import {
  type Challenge, type ChallengeAnswer,
  listenChallenge, listenMyAnswer, listenMyScore, listenAllAnswers, listenScores,
  submitAnswer, createChallenge, closeChallenge, endChallenge,
  showcaseAnswer, setAnswerScore, challengeToCard,
} from "@/features/rooms/challenge";

/* ════════════════════════════════════════════════════════════
   Live Problem — التحدّيات داخل الغرفة

   الطالب: مساحة حل خاصة به وحده، يعدّلها ما دام التسليم مفتوحاً.
   الأستاذ: كل الحلول في لوحة واحدة، يقيّمها ويعرض أفضلها للجميع.
════════════════════════════════════════════════════════════ */

/* شريط إدراج المعادلات — يكتب بصيغة $...$ ويُعرض منسّقاً */
function MathBar({ taRef, onChange }: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {MATH_SNIPPETS.map((sn) => (
        <button
          key={sn.label}
          type="button"
          onClick={() => { if (taRef.current) insertAtCursor(taRef.current, sn, onChange); }}
          title={sn.insert}
          className="grid h-7 min-w-7 place-items-center rounded-lg bg-border px-1.5 text-xs font-bold text-text-primary transition active:scale-90 hover:bg-primary/10 hover:text-primary"
        >
          {sn.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────── هوك مشترك ─────────── */
export function useChallenge(roomId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => listenChallenge(roomId, setChallenge), [roomId]);
  return challenge;
}

/* ═══════════════════════════════════════════
   1) طبقة الطالب — شريط دعوة + مساحة الحل
═══════════════════════════════════════════ */
export function StudentChallengeLayer({
  roomId, uid, name, subject, roomName,
}: {
  roomId: string; uid: string; name: string; subject?: string | null; roomName?: string;
}) {
  const challenge = useChallenge(roomId);
  const [myAnswer, setMyAnswer] = useState<ChallengeAnswer | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => listenMyAnswer(roomId, uid, setMyAnswer), [roomId, uid]);
  useEffect(() => listenMyScore(roomId, uid, setMyScore), [roomId, uid]);

  // فتح مساحة الحل يبدأ من آخر نسخة سلّمها الطالب
  useEffect(() => { if (open) setDraft(myAnswer?.text ?? ""); }, [open, myAnswer?.text]);

  if (!challenge) return null;

  const submitted = !!myAnswer;
  const canEdit = challenge.open;

  async function send() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    await submitAnswer(roomId, uid, name, draft);
    setBusy(false);
    setOpen(false);
  }

  function saveToCards() {
    if (!challenge || !myAnswer) return;
    const card = challengeToCard(challenge.question, myAnswer.text);
    saveFlashcard({ uid, front: card.front, back: card.back, subject: subject || "general", source: roomName });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  }

  return (
    <>
      {/* شريط الدعوة — لا يحجب السبورة */}
      <button
        onClick={() => setOpen(true)}
        className={`pointer-events-auto absolute bottom-3 left-1/2 z-[58] flex max-w-[92%] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-xl transition active:scale-95 bz-radial-in ${
          submitted
            ? "bg-secondary text-white"
            : "bg-gradient-primary text-white"
        }`}
      >
        <FontAwesomeIcon icon={submitted ? faCheck : faBrain} className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {submitted
            ? canEdit ? "سلّمت حلّك — اضغط للتعديل" : "سلّمت حلّك ✓"
            : "تحدٍّ جديد — ابدأ الحل"}
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="تحدّي الحصة" maxHeight="88vh">
        <div className="pb-2">
          {/* السؤال */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <MathText text={challenge.question} className="text-sm font-semibold leading-relaxed text-text-primary" />
          </div>

          {/* تقييم الأستاذ إن وُجد */}
          {myScore !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/15 px-3 py-2">
              <FontAwesomeIcon icon={faStar} className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600">تقييم الأستاذ: {myScore}/5</span>
            </div>
          )}

          {/* مساحة الحل الخاصة */}
          {canEdit ? (
            <>
              <label className="mt-4 block text-xs font-bold text-text-muted">مساحة حلّك (لا يراها إلا أنت والأستاذ)</label>
              <textarea
                ref={answerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="اكتب خطوات حلّك هنا... (استعمل $x^2$ للمعادلات)"
                rows={7}
                dir="auto"
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
              />
              <MathBar taRef={answerRef} onChange={setDraft} />
              {draft.includes("$") && (
                <div className="mt-2 rounded-xl border border-border bg-background p-3">
                  <p className="mb-1 text-[11px] font-bold text-text-muted">معاينة</p>
                  <MathText text={draft} className="text-sm leading-relaxed text-text-primary" />
                </div>
              )}
              <button
                onClick={send}
                disabled={!draft.trim() || busy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={submitted ? faPenToSquare : faPaperPlane} className="h-4 w-4" />
                {busy ? "..." : submitted ? "تحديث حلّي" : "تسليم الحل"}
              </button>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-border p-3.5">
              <p className="flex items-center gap-2 text-sm font-bold text-text-muted">
                <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" /> أُغلق التسليم
              </p>
              {myAnswer && (
                <MathText text={myAnswer.text} className="mt-2 text-sm leading-relaxed text-text-primary" />
              )}
            </div>
          )}

          {/* أفضل حل يعرضه الأستاذ */}
          {challenge.showcase && (
            <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <FontAwesomeIcon icon={faTrophy} className="h-3.5 w-3.5" />
                أفضل حل — {challenge.showcase.name}
              </p>
              <MathText text={challenge.showcase.text} className="mt-2 text-sm leading-relaxed text-text-primary" />
            </div>
          )}

          {/* حفظ في بطاقات المراجعة */}
          {myAnswer && (
            <button
              onClick={saveToCards}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold text-text-muted transition active:scale-95 hover:border-primary hover:text-primary"
            >
              <FontAwesomeIcon icon={justSaved ? faCheck : faLayerGroup} className="h-4 w-4" />
              {justSaved ? "حُفظ في بطاقاتك ✓" : "احفظ التحدي وحلّه في بطاقات المراجعة"}
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

/* ═══════════════════════════════════════════
   2) إنشاء تحدٍّ — للأستاذ
═══════════════════════════════════════════ */
export function CreateChallengeSheet({ roomId, open, onClose }: {
  roomId: string; open: boolean; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const qRef = useRef<HTMLTextAreaElement>(null);

  async function start() {
    if (!q.trim() || busy) return;
    setBusy(true);
    await createChallenge(roomId, q);
    setBusy(false);
    setQ("");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="تحدٍّ جديد" maxHeight="80vh">
      <div className="pb-2">
        <p className="px-1 text-xs leading-relaxed text-text-muted">
          اكتب التمرين. سيحصل كل طالب على مساحة حل خاصة، وتصلك كل الحلول في لوحة واحدة.
        </p>
        <textarea
          ref={qRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="مثال: احسب $\\lim_{x \\to 1} \\frac{x^{2}-1}{x-1}$ مع تبرير كل خطوة."
          rows={5}
          dir="auto"
          autoFocus
          className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
        />
        <MathBar taRef={qRef} onChange={setQ} />
        {q.includes("$") && (
          <div className="mt-2 rounded-xl border border-border bg-background p-3">
            <p className="mb-1 text-[11px] font-bold text-text-muted">معاينة كما سيراها الطلاب</p>
            <MathText text={q} className="text-sm leading-relaxed text-text-primary" />
          </div>
        )}
        <p className="mt-2 px-1 text-[11px] text-text-muted">
          بدء تحدٍّ جديد يمسح حلول التحدي السابق.
        </p>
        <button
          onClick={start}
          disabled={!q.trim() || busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faBrain} className="h-4 w-4" />
          {busy ? "..." : "ابدأ التحدي"}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ═══════════════════════════════════════════
   3) لوحة الأستاذ — كل الحلول في مكان واحد
═══════════════════════════════════════════ */
export function TeacherChallengePanel({ roomId, memberCount }: {
  roomId: string; memberCount: number;
}) {
  const challenge = useChallenge(roomId);
  const [answers, setAnswers] = useState<ChallengeAnswer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => listenAllAnswers(roomId, setAnswers), [roomId]);
  useEffect(() => listenScores(roomId, setScores), [roomId]);

  const showcasedText = challenge?.showcase?.text;
  const sorted = useMemo(
    () => [...answers].sort((a, b) => (scores[b.uid] ?? 0) - (scores[a.uid] ?? 0) || a.at - b.at),
    [answers, scores]
  );

  if (!challenge) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        لا يوجد تحدٍّ نشط. ابدأ واحداً ليحلّه الطلاب مباشرة.
      </p>
    );
  }

  return (
    <div className="pb-2">
      {/* السؤال + الحالة */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
        <MathText text={challenge.question} className="text-sm font-semibold leading-relaxed text-text-primary" />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {answers.length} من {Math.max(memberCount - 1, answers.length)} سلّموا
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            challenge.open ? "bg-secondary/10 text-secondary" : "bg-border text-text-muted"
          }`}>
            {challenge.open ? "التسليم مفتوح" : "التسليم مغلق"}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {challenge.open ? (
            <button
              onClick={() => closeChallenge(roomId)}
              className="rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-bold text-warning active:scale-95"
            >
              إغلاق التسليم
            </button>
          ) : null}
          <button
            onClick={() => { if (confirm("إنهاء التحدي وحذف كل الحلول؟")) endChallenge(roomId); }}
            className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger active:scale-95"
          >
            إنهاء التحدي
          </button>
          {challenge.showcase && (
            <button
              onClick={() => showcaseAnswer(roomId, null)}
              className="rounded-lg bg-border px-3 py-1.5 text-xs font-bold text-text-muted active:scale-95"
            >
              إخفاء أفضل حل
            </button>
          )}
        </div>
      </div>

      {/* الحلول */}
      {answers.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">لم يسلّم أحد بعد...</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {sorted.map((a) => {
            const isShowcased = showcasedText === a.text;
            const open = expanded === a.uid;
            return (
              <div
                key={a.uid}
                className={`rounded-2xl border p-3 ${isShowcased ? "border-amber-400/50 bg-amber-400/10" : "border-border bg-surface"}`}
              >
                <button
                  onClick={() => setExpanded(open ? null : a.uid)}
                  className="flex w-full items-center gap-2 text-right"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">
                    {isShowcased && <Icon name="star" size={13} className="ml-1 inline text-[#D08217]" />}{a.name}
                  </span>
                  {scores[a.uid] != null && (
                    <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                      {scores[a.uid]}/5
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] text-text-muted">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <>
                    <MathText text={a.text} className="mt-2.5 border-t border-border pt-2.5 text-sm leading-relaxed text-text-primary" />
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-text-muted">التقييم:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setAnswerScore(roomId, a.uid, scores[a.uid] === n ? null : n)}
                          aria-label={`تقييم ${n}`}
                          className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold transition active:scale-90 ${
                            (scores[a.uid] ?? 0) >= n ? "bg-amber-400/20 text-amber-600" : "bg-border text-text-muted"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => showcaseAnswer(roomId, isShowcased ? null : a)}
                        className={`mr-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                          isShowcased ? "bg-border text-text-muted" : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        <FontAwesomeIcon icon={isShowcased ? faXmark : faTrophy} className="h-3 w-3" />
                        {isShowcased ? "إلغاء العرض" : "اعرضه كأفضل حل"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
