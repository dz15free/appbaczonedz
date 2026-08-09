"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck, faXmark, faLightbulb, faChevronLeft, faRotate, faBolt,
  faUpRightFromSquare, faPaperPlane, faBookmark, faCircleCheck, faChartSimple,
  faFilePdf, faFileArrowDown, faImage,
} from "@fortawesome/free-solid-svg-icons";
import { saveFlashcard } from "@/features/study/save-flashcard";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { awardXp } from "@/features/gamification/points";
import {
  castFeedVote, listenVotes, markFeedDone, tally, attachmentKind,
  type FeedItem, type FeedProgress, type FeedVote, type FeedAttachment, FEED_TYPES,
} from "@/features/feed/feed";
import { branchLabel, isExactBranchMatch } from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   بطاقات التغذية الدراسية

   كل نوع بطاقته: السؤال يُجاب عنه، والاستفتاء يُصوَّت فيه، والبطاقة
   تُقلَب وتُحفظ، والخطأ الشائع يُقرأ على أربع خطوات. بطاقة واحدة لكل
   الأنواع كانت ستُنتج «منشوراً بعنوان مختلف» — وهو بالضبط ما لا نريده.

   والنقاط تُمنح **بعد الفعل** لا قبله، ومرّة واحدة: `markFeedDone`
   يكتب سجلّاً ترفض القاعدة الكتابة فوقه، ثمّ يُمنح ما فيه.

   نوع لا يعرفه العارض يُعرض بطاقةَ محتوى عامّة بدل أن يختفي — فإضافة
   نوع من لوحة الإدارة لا تحتاج نشر شيفرة.
════════════════════════════════════════════════════════════ */

export function FeedCard({
  item, uid, track, progress, onDone, readOnly,
}: {
  item: FeedItem;
  uid?: string;
  track?: string | null;
  progress?: FeedProgress | null;
  onDone?: (xp: number) => void;
  /**
   * الأستاذ والأدمن ليسا معنيّين بالنقاط ولا بـ«قرأتها»: يريان المحتوى
   * كاملاً — الإجابة الصحيحة والشرح ونموذج الجواب — كمنشور يُقرأ لا
   * تمريناً يُحلّ. عرض زرّ نقاطٍ لمن لا يجمعها ضجيجٌ لا فائدة فيه.
   */
  readOnly?: boolean;
}) {
  const meta = FEED_TYPES.find((t) => t.id === item.type);
  const relevant = isExactBranchMatch(item, track);
  const subjects = useSiteSubjects();
  const subjectName = subjects.find((s) => s.id === item.subject)?.name ?? item.subject;

  async function finish(result?: { score?: number; total?: number }) {
    if (!uid || progress?.done) return;
    const xp = await markFeedDone(uid, item, result);
    if (xp) await awardXp(uid, xp);
    onDone?.(xp);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/30">
      {/* ترويسة النوع */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background px-3.5 py-2">
        <span className="text-[13px]" aria-hidden>{meta?.emoji ?? "📌"}</span>
        <span className="text-[11px] font-extrabold text-primary">{meta?.label ?? "محتوى دراسي"}</span>
        {item.subject && item.subject !== "general" && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{subjectName}</span>
        )}
        <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-muted">
          {branchLabel(item.branches)}
        </span>
        {relevant && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
            <FontAwesomeIcon icon={faBolt} className="h-2.5 w-2.5" /> لشعبتك
          </span>
        )}
        {Boolean(item.xp) && !readOnly && (
          <span className="ms-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600">
            +{item.xp} نقطة
          </span>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="text-[14.5px] font-extrabold leading-snug text-text-primary">{item.title}</h3>
        {item.body && (
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-text-muted">{item.body}</p>
        )}
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy"
            className="mt-2.5 max-h-72 w-full rounded-xl border border-border object-contain" />
        )}

        <Attachments list={item.attachments} />

        <div className="mt-3">
          {item.type === "poll" ? (
            <PollBody item={item} uid={readOnly ? undefined : uid} onFirstVote={() => finish()} readOnly={readOnly} />
          ) : item.type === "flashcard" ? (
            <FlashcardBody item={item} uid={uid} done={Boolean(progress?.done)} onDone={() => finish()} readOnly={readOnly} />
          ) : item.type === "mistake" ? (
            <MistakeBody item={item} done={Boolean(progress?.done) || Boolean(readOnly)} onDone={() => finish()} />
          ) : item.type === "philosophy" ? (
            <PhilosophyBody item={item} uid={uid} done={Boolean(progress?.done)} onDone={() => finish()} readOnly={readOnly} />
          ) : (item.questions?.length ?? 0) > 0 ? (
            <QuestionsBody item={item} done={Boolean(progress?.done)} savedScore={progress?.score}
              onDone={(score, total) => finish({ score, total })} readOnly={readOnly} />
          ) : (
            <PlainBody item={item} done={Boolean(progress?.done) || Boolean(readOnly)} onDone={() => finish()} />
          )}
        </div>

        {item.linkUrl && (
          <a href={item.linkUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-extrabold text-primary transition hover:bg-primary/5">
            {item.linkLabel || "افتح المصدر"}
            <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 opacity-60" />
          </a>
        )}
      </div>
    </article>
  );
}

/* ── المرفقات ──
   التمرين القصير كثيراً ما يكون **صورة**: نصّ التمرين مصوّراً أو ملفّ
   PDF. عرضه رابطاً عارياً يقتل التمرين، فالصور تُعرض داخل البطاقة كما
   تُعرض في أي منشور، والملفّات تظهر بطاقةَ ملفّ واضحة تُفتح في تبويب
   جديد — وارتفاع اللمس ≥ 44px كي يعمل على الهاتف. */
function Attachments({ list }: { list?: FeedAttachment[] | null }) {
  const items = (list ?? []).filter((a) => a && a.url);
  if (!items.length) return null;

  const images = items.filter((a) => attachmentKind(a) === "image");
  const files = items.filter((a) => attachmentKind(a) !== "image");

  return (
    <div className="mt-2.5 space-y-2">
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {images.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-xl border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.label || "مرفق"} loading="lazy"
                className="max-h-80 w-full object-contain" />
              <span className="absolute bottom-1.5 end-1.5 hidden items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold text-white group-hover:flex">
                <FontAwesomeIcon icon={faImage} className="h-2.5 w-2.5" /> تكبير
              </span>
              {a.label && (
                <span className="block border-t border-border px-2.5 py-1.5 text-[11px] font-bold text-text-muted">{a.label}</span>
              )}
            </a>
          ))}
        </div>
      )}

      {files.map((a, i) => {
        const pdf = attachmentKind(a) === "pdf";
        return (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${pdf ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
              <FontAwesomeIcon icon={pdf ? faFilePdf : faFileArrowDown} className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-extrabold text-text-primary">
                {a.label || (pdf ? "ملفّ التمرين (PDF)" : "ملفّ مرفق")}
              </span>
              <span className="block text-[10.5px] font-semibold text-text-muted">اضغط للفتح في تبويب جديد</span>
            </span>
            <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3 w-3 shrink-0 text-text-muted" />
          </a>
        );
      })}
    </div>
  );
}

/* ── استفتاء ── */
function PollBody({ item, uid, onFirstVote, readOnly }: { item: FeedItem; uid?: string; onFirstVote: () => void; readOnly?: boolean }) {
  const [votes, setVotes] = useState<Record<string, FeedVote>>({});
  const [busy, setBusy] = useState(false);
  const options = item.options ?? [];

  useEffect(() => {
    const unsub = listenVotes(item.id, setVotes);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [item.id]);

  const mine = uid ? votes[uid]?.choice : undefined;
  const voted = typeof mine === "number" || Boolean(readOnly);
  const t = useMemo(() => tally(votes, options.length), [votes, options.length]);

  async function vote(i: number) {
    if (!uid || voted || busy) return;   // صوت واحد لا يُبدَّل
    setBusy(true);
    try {
      await castFeedVote(item.id, uid, { choice: i });
      onFirstVote();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <button
          key={i}
          onClick={() => vote(i)}
          disabled={voted || !uid || busy}
          className={`relative flex min-h-[44px] w-full items-center gap-2 overflow-hidden rounded-xl border px-3 text-right text-[13px] font-bold transition ${
            voted
              ? mine === i ? "border-primary bg-primary/5 text-primary" : "border-border text-text-muted"
              : "border-border text-text-primary hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
          }`}
        >
          {voted && (
            <span className="absolute inset-y-0 right-0 bg-primary/10" style={{ width: `${t.pct[i]}%` }} aria-hidden />
          )}
          <span className="relative min-w-0 flex-1 truncate">{o}</span>
          {voted && <span className="relative shrink-0 text-[12px] font-extrabold">{t.pct[i]}%</span>}
          {voted && mine === i && <FontAwesomeIcon icon={faCheck} className="relative h-3 w-3 shrink-0" />}
        </button>
      ))}
      <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <FontAwesomeIcon icon={faChartSimple} className="h-2.5 w-2.5" />
        {readOnly ? `${t.total} صوتاً` : voted ? `${t.total} صوتاً` : "صوّت لترى النتائج"}
      </p>
    </div>
  );
}

/* ── أسئلة (سؤال · تحدٍّ · تمرين · وثيقة) ── */
function QuestionsBody({
  item, done, savedScore, onDone, readOnly,
}: {
  item: FeedItem;
  done: boolean;
  savedScore?: number;
  onDone: (score: number, total: number) => void;
  readOnly?: boolean;
}) {
  const qs = item.questions ?? [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(done && !readOnly);

  const q = qs[idx];
  if (!q) return null;

  // في وضع القراءة تُكشف الإجابة والشرح فوراً — لا تمرين يُحلّ
  const revealed = picked !== null || Boolean(readOnly);
  const correctIdx = q.choices.findIndex((c) => c.correct);

  function pick(i: number) {
    if (revealed || finished || readOnly) return;
    setPicked(i);
    if (q.choices[i]?.correct) setScore((s) => s + 1);
  }

  function next() {
    if (idx < qs.length - 1) { setIdx(idx + 1); setPicked(null); return; }
    setFinished(true);
    onDone(score, qs.length);
  }

  if (finished) {
    const shown = typeof savedScore === "number" ? savedScore : score;
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-center">
        <FontAwesomeIcon icon={faCircleCheck} className="h-6 w-6 text-emerald-600" />
        <p className="mt-1.5 text-[13.5px] font-extrabold text-emerald-700">
          {qs.length > 1 ? `نتيجتك ${shown} من ${qs.length}` : shown ? "إجابة صحيحة ✓" : "راجع الشرح وأعد المحاولة لاحقاً"}
        </p>
        {qs[0]?.explanation && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">{qs[0].explanation}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {qs.length > 1 && (
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-[11px] font-bold text-text-muted">سؤال {idx + 1} من {qs.length}</p>
          {readOnly && idx < qs.length - 1 && (
            <button onClick={() => setIdx(idx + 1)} className="text-[11px] font-bold text-primary hover:underline">
              السؤال التالي ←
            </button>
          )}
        </div>
      )}
      <p className="text-[13.5px] font-bold leading-relaxed text-text-primary">{q.text}</p>
      {q.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="" loading="lazy"
          className="mt-2 max-h-64 w-full rounded-xl border border-border object-contain" />
      )}

      <div className="mt-2.5 space-y-2">
        {q.choices.map((c, i) => {
          const isCorrect = i === correctIdx;
          const isPicked = picked === i;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 text-right text-[13px] font-bold transition ${
                !revealed
                  ? "border-border text-text-primary hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
                  : isCorrect
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                    : isPicked
                      ? "border-danger/50 bg-danger/10 text-danger"
                      : "border-border text-text-muted opacity-70"
              }`}
            >
              <span className="min-w-0 flex-1">{c.text}</span>
              {revealed && isCorrect && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 shrink-0" />}
              {revealed && isPicked && !isCorrect && <FontAwesomeIcon icon={faXmark} className="h-3 w-3 shrink-0" />}
            </button>
          );
        })}
      </div>

      {revealed && q.explanation && (
        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[12px] leading-relaxed text-text-muted">
          <FontAwesomeIcon icon={faLightbulb} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          {q.explanation}
        </p>
      )}

      {revealed && !readOnly && (
        <button onClick={next}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white">
          {idx < qs.length - 1 ? "السؤال التالي" : "إنهاء"}
          <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── بطاقات مراجعة ── */
function FlashcardBody({
  item, uid, done, onDone, readOnly,
}: { item: FeedItem; uid?: string; done: boolean; onDone: () => void; readOnly?: boolean }) {
  const cards = item.cards ?? [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(done);
  const c = cards[i];
  if (!c) return null;

  async function saveAll() {
    if (!uid || saved) return;
    for (const card of cards.slice(0, 10)) {
      await saveFlashcard({
        uid, front: card.front, back: card.back,
        subject: item.subject || "general", source: "التغذية الدراسية",
      });
    }
    setSaved(true);
    onDone();
  }

  return (
    <div>
      <button
        onClick={() => setFlipped((v) => !v)}
        className="flex min-h-[104px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background p-4 text-center transition hover:border-primary/40"
      >
        <span className="text-[10.5px] font-extrabold text-text-muted">
          {flipped ? "الظهر" : "الوجه"} · اضغط للقلب
        </span>
        <span className="text-[14px] font-extrabold leading-relaxed text-text-primary">
          {flipped ? c.back : c.front}
        </span>
      </button>

      <div className="mt-2.5 flex items-center gap-2">
        {cards.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setI((x) => (x + 1) % cards.length); setFlipped(false); }}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary"
            >
              <FontAwesomeIcon icon={faRotate} className="h-3 w-3" /> التالية
            </button>
            <span className="text-[11px] text-text-muted">{i + 1}/{cards.length}</span>
          </div>
        )}
        {!readOnly && (
        <button
          onClick={saveAll}
          disabled={!uid || saved}
          className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-extrabold transition ${
            saved ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "bg-gradient-primary text-white"
          }`}
        >
          <FontAwesomeIcon icon={saved ? faCircleCheck : faBookmark} className="h-3 w-3" />
          {saved ? "محفوظة في بطاقاتك" : `احفظ ${cards.length > 1 ? "البطاقات" : "البطاقة"}`}
        </button>
        )}
      </div>
    </div>
  );
}

/* ── خطأ شائع ── */
function MistakeBody({ item, done, onDone }: { item: FeedItem; done: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(done);
  return (
    <div className="space-y-2">
      <Row tone="bad" label="الخطأ" value={item.wrong} />
      {open ? (
        <>
          <Row tone="ok" label="الصواب" value={item.right} />
          {item.why && <Row tone="info" label="لماذا؟" value={item.why} />}
          {item.tip && <Row tone="tip" label="نصيحة" value={item.tip} />}
        </>
      ) : (
        <button
          onClick={() => { setOpen(true); onDone(); }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white"
        >
          <FontAwesomeIcon icon={faLightbulb} className="h-3.5 w-3.5" /> اكشف التصحيح
        </button>
      )}
    </div>
  );
}

function Row({ tone, label, value }: { tone: "bad" | "ok" | "info" | "tip"; label: string; value?: string }) {
  if (!value) return null;
  const cls = {
    bad: "border-danger/30 bg-danger/5 text-danger",
    ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
    info: "border-border bg-background text-text-muted",
    tip: "border-primary/30 bg-primary/5 text-primary",
  }[tone];
  return (
    <div className={`rounded-xl border p-2.5 ${cls}`}>
      <p className="text-[10.5px] font-extrabold opacity-80">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{value}</p>
    </div>
  );
}

/* ── سؤال فلسفة ── */
function PhilosophyBody({
  item, uid, done, onDone, readOnly,
}: { item: FeedItem; uid?: string; done: boolean; onDone: () => void; readOnly?: boolean }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(done);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!uid || !text.trim() || busy) return;
    setBusy(true);
    try {
      await castFeedVote(item.id, uid, { text });
      setSent(true);
      onDone();
    } finally { setBusy(false); }
  }

  if (readOnly) {
    return item.modelAnswer ? (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <p className="text-[10.5px] font-extrabold text-primary">نموذج إجابة</p>
        <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-muted">{item.modelAnswer}</p>
      </div>
    ) : null;
  }

  if (sent) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-bold text-emerald-700">
          <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" /> شاركتَ إجابتك
        </p>
        {item.modelAnswer && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10.5px] font-extrabold text-primary">نموذج إجابة</p>
            <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-muted">{item.modelAnswer}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="لو كنت في الامتحان، ماذا ستكتب؟"
        aria-label="إجابتك"
        className="w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
      />
      <button
        onClick={send}
        disabled={!uid || !text.trim() || busy}
        className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
        {busy ? "…" : "شارك إجابتك"}
      </button>
      {item.modelAnswer && (
        <p className="mt-1.5 text-center text-[11px] text-text-muted">يظهر نموذج الإجابة بعد المشاركة.</p>
      )}
    </div>
  );
}

/* ── نوع عامّ / غير معروف ── */
function PlainBody({ item, done, onDone }: { item: FeedItem; done: boolean; onDone: () => void }) {
  if (!item.xp || done) return null;
  return (
    <button
      onClick={onDone}
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-[13px] font-extrabold text-primary"
    >
      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> قرأتُها
    </button>
  );
}
