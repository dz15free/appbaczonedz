"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain, faPaperPlane, faCheck, faStar, faXmark,
  faTrophy, faLock, faPenToSquare, faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { initDrive, connectDrive, uploadToDrive, hasDriveToken, isDriveConfigured } from "@/lib/gdrive";
import { AttachmentView } from "@/features/rooms/attachment-view";
import { MathText, MATH_SNIPPETS, insertAtCursor } from "@/features/rooms/use-katex";
import { saveFlashcard } from "@/features/study/save-flashcard";
import {
  type Challenge, type ChallengeAnswer,
  listenChallenge, listenMyAnswer, listenMyScore, listenAllAnswers, listenScores,
  submitAnswer, createChallenge, closeChallenge, endChallenge,
  type ChallengeAttachment, challengeSecondsLeft,
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
  useEffect(() => {
    const unsub = listenChallenge(roomId, setChallenge);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  return challenge;
}

/* ═══════════════════════════════════════════
   1) طبقة الطالب — شريط دعوة + مساحة الحل
═══════════════════════════════════════════ */
/* عدّاد الوقت — يُحسب من اللحظة المطلقة، فيتّفق كل الأجهزة عليه مهما
   اختلفت ساعاتها. يتحوّل إلى أحمر في آخر دقيقة، ويقول «انتهى الوقت»
   بدل أن يختفي: اختفاء العدّاد يترك الطالب لا يدري ماذا جرى. */
function ChallengeCountdown({ deadline }: { deadline: number }) {
  const [left, setLeft] = useState(() => Math.round((deadline - Date.now()) / 1000));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.round((deadline - Date.now()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  const over = left <= 0;
  const urgent = !over && left <= 60;
  const mm = Math.floor(Math.abs(left) / 60);
  const ss = Math.abs(left) % 60;
  return (
    <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
      over || urgent ? "bg-[var(--bz-red-050)] text-[var(--bz-red)]" : "bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
    }`}>
      <Icon name="timer" size={14} />
      {over ? "انتهى الوقت" : `متبقٍّ ${mm}:${String(ss).padStart(2, "0")}`}
    </div>
  );
}

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
  const [justSent, setJustSent] = useState(false);
  const [myAtt, setMyAtt] = useState<ChallengeAttachment | null>(null);
  const [attErr, setAttErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [driveReady, setDriveReady] = useState(false);

  /* التهيئة عند فتح مساحة الحلّ لا عند تركيب الغرفة — لا نُحمّل سكربت
     Google لكل طالب لم يفتح التحدّي أصلاً. */
  useEffect(() => {
    if (!open || !isDriveConfigured()) return;
    let alive = true;
    initDrive().then((ok) => { if (alive) setDriveReady(ok); });
    return () => { alive = false; };
  }, [open]);

  // نستعيد مرفق الحلّ المُسلَّم عند فتح المساحة للتعديل
  useEffect(() => {
    if (open && myAnswer?.attachment) setMyAtt(myAnswer.attachment);
  }, [open, myAnswer?.attachment?.url]);   // eslint-disable-line react-hooks/exhaustive-deps
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = listenMyAnswer(roomId, uid, setMyAnswer);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, uid]);
  useEffect(() => {
    const unsub = listenMyScore(roomId, uid, setMyScore);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, uid]);

  // فتح مساحة الحل يبدأ من آخر نسخة سلّمها الطالب
  useEffect(() => { if (open) setDraft(myAnswer?.text ?? ""); }, [open, myAnswer?.text]);

  if (!challenge) return null;

  const submitted = !!myAnswer;
  const canEdit = challenge.open;

  async function send() {
    if ((!draft.trim() && !myAtt) || busy) return;
    setBusy(true);
    await submitAnswer(roomId, uid, name, draft, myAtt ?? undefined);
    setBusy(false);
    setOpen(false);
    setJustSent(true);
    // 6 ثوانٍ تكفي لرؤية التأكيد ولا تُبقيه مزعجاً
    setTimeout(() => setJustSent(false), 6000);
  }

  /* رفع صورة الحلّ. أشيع طريقة: يحلّ على ورقته ثم يصوّرها — فمنع ذلك
     كان سيجعل الميزة نظرية. */
  async function pickAnswerFile(f: File | null | undefined) {
    if (!f) return;
    setAttErr("");
    if (f.size > 8 * 1024 * 1024) { setAttErr("الملفّ أكبر من 8 ميغابايت."); return; }
    if (!driveReady) { setAttErr("جارٍ تهيئة الرفع… أعد المحاولة بعد لحظة."); return; }
    setUploading(true);
    try {
      const up = await uploadToDrive(f);
      setMyAtt({
        url: `https://drive.google.com/uc?export=view&id=${up.id}`,
        name: up.name || f.name,
        kind: f.type.startsWith("image/") ? "image" : "doc",
      });
    } catch {
      setAttErr("تعذّر الرفع. تأكّد من ربط Google ثم أعد المحاولة.");
    } finally { setUploading(false); }
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
            ? /* بعد ثوانٍ من التسليم تهدأ الرسالة إلى «حلّك مُسلَّم».
                 «اضغط للتعديل» نداء إلى فعل، وإبقاؤه ساعةً يجعل الطالب
                 يظنّ أنّ عليه فعل شيء لم يفعله. */
              justSent
                ? "تمّ تسليم حلّك ✓"
                : canEdit ? "حلّك مُسلَّم — يمكنك تعديله" : "حلّك مُسلَّم"
            : "تحدٍّ جديد — ابدأ الحل"}
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="تحدّي الحصة" maxHeight="88vh">
        <div className="pb-2">
          {/* السؤال */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <MathText text={challenge.question} className="text-sm font-semibold leading-relaxed text-text-primary" />

            {/* المرفق: الصورة تُعرض داخل البطاقة (التمرين نفسه غالباً)،
                والمستند يُفتح في تبويب — لا نُحمّل PDF داخل بطاقة صغيرة. */}
            {challenge.attachment && (
              <div className="mt-2.5">
                <AttachmentView att={challenge.attachment} />
              </div>
            )}

            {challenge.deadline && <ChallengeCountdown deadline={challenge.deadline} />}
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

              {/* إرفاق الحلّ: صورة الورقة أو ملفّ */}
              <div className="mt-3 rounded-xl border border-border p-3">
                <p className="mb-2 text-[11px] font-bold text-text-muted">
                  حللت على ورقة؟ صوّرها وأرفقها — أو أرفق ملفّاً
                </p>
                {myAtt ? (
                  <div className="space-y-2">
                    <AttachmentView att={myAtt} compact />
                    <button onClick={() => setMyAtt(null)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted hover:text-danger">
                      <Icon name="trash" size={12} /> إزالة المرفق
                    </button>
                  </div>
                ) : !isDriveConfigured() ? (
                  <p className="text-[11px] text-text-muted">رفع الملفّات غير مُفعّل.</p>
                ) : (
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-bold transition ${
                    uploading || !driveReady ? "cursor-wait text-text-muted" : "text-primary hover:border-primary"}`}>
                    <Icon name="image" size={15} />
                    {uploading ? "جارٍ الرفع…" : !driveReady ? "جارٍ التهيئة…" : "أرفق صورة أو ملفّ"}
                    <input type="file" hidden accept="image/*,.pdf,.doc,.docx"
                      disabled={uploading || !driveReady}
                      onChange={(e) => pickAnswerFile(e.target.files?.[0])} />
                  </label>
                )}
                {attErr && <p className="mt-1.5 text-[11px] font-bold text-danger">{attErr}</p>}
              </div>
              {draft.includes("$") && (
                <div className="mt-2 rounded-xl border border-border bg-background p-3">
                  <p className="mb-1 text-[11px] font-bold text-text-muted">معاينة</p>
                  <MathText text={draft} className="text-sm leading-relaxed text-text-primary" />
                </div>
              )}
              <button
                onClick={send}
                disabled={(!draft.trim() && !myAtt) || busy}
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
  const [minutes, setMinutes] = useState(0);
  const [att, setAtt] = useState<ChallengeAttachment | null>(null);
  const [upErr, setUpErr] = useState("");
  const [connected, setConnected] = useState(false);
  const [driveReady, setDriveReady] = useState(false);

  /* 🐛 «لم تكتمل تهيئة Google بعد» — كنت أستدعي connectDrive() دون
     initDrive() التي تُحمّل سكربت Google وتُنشئ tokenClient. صفحة
     الملفّات تستدعيها عند التركيب، ونسيتها هنا.
     نُهيّئ عند **فتح الدرج** لا عند تركيب الصفحة: لا نُحمّل سكربتاً
     خارجياً لكل أستاذ لم يفتح التحدّي أصلاً. */
  useEffect(() => {
    if (!open || !isDriveConfigured()) return;
    let alive = true;
    initDrive().then((ok) => {
      if (!alive) return;
      setDriveReady(ok);
      setConnected(hasDriveToken());
    });
    return () => { alive = false; };
  }, [open]);
  const qRef = useRef<HTMLTextAreaElement>(null);

  /* التمرين قد يكون **صورة** لا نصّاً — تصوير تمرين من الكتاب أشيع بكثير
     من إعادة كتابته. فنقبل البدء بمرفق وحده. */
  /* 🐛 كنت أستعمل `lib/drive` الذي يطلب توكن Google **داخل onChange بعد
     await** — فيخرج من سياق نقرة المستخدم فيحجب المتصفّح النافذة:
     `[GSI_LOGGER] Failed to open popup window… Maybe blocked by the browser?`
     الصواب نمط room-files: زرّ ربط صريح يُستدعى **مباشرة في معالج
     النقرة**، ثم الرفع يستعمل التوكن المخزّن بلا نافذة. */
  async function connect() {
    if (!driveReady) { setUpErr("جارٍ تهيئة Google… أعد المحاولة بعد لحظة."); return; }
    try { await connectDrive(); setConnected(true); setUpErr(""); }
    catch (e) { setUpErr(e instanceof Error ? e.message : "تعذّر ربط Google."); }
  }

  async function pickFile(f: File | null | undefined) {
    if (!f) return;
    setUpErr("");
    if (f.size > 8 * 1024 * 1024) { setUpErr("الملفّ أكبر من 8 ميغابايت."); return; }
    setBusy(true);
    try {
      const up = await uploadToDrive(f);
      setAtt({
        url: `https://drive.google.com/uc?export=view&id=${up.id}`,
        name: up.name || f.name,
        kind: f.type.startsWith("image/") ? "image" : "doc",
      });
    } catch {
      setUpErr("تعذّر رفع الملفّ. جرّب مرّة أخرى.");
    } finally { setBusy(false); }
  }

  async function start() {
    if ((!q.trim() && !att) || busy) return;
    setBusy(true);
    await createChallenge(roomId, q, {
      attachment: att ?? undefined,
      minutes: minutes || undefined,
    });
    setBusy(false);
    setQ(""); setAtt(null); setMinutes(0);
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

        {/* المرفق */}
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-2 text-[11px] font-bold text-text-muted">
            أرفق صورة التمرين أو ملفّاً (اختياري)
          </p>
          {att ? (
            <div className="flex items-center gap-2 rounded-lg bg-background p-2">
              <Icon name={att.kind === "image" ? "image" : "file"} size={15} className="text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{att.name}</span>
              <button onClick={() => setAtt(null)} aria-label="إزالة المرفق"
                className="text-text-muted hover:text-danger">
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : !isDriveConfigured() ? (
            <p className="rounded-lg bg-background p-2 text-[11px] text-text-muted">
              رفع الملفّات غير مُفعّل في الإعدادات.
            </p>
          ) : !connected ? (
            // زرّ حقيقي: النافذة تُفتح داخل نقرة المستخدم فلا تُحجب
            <button onClick={connect} disabled={!driveReady}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-bold text-primary transition hover:border-primary disabled:cursor-wait disabled:opacity-60">
              <Icon name="clip" size={15} />
              {driveReady ? "اربط Google أولاً لرفع الملفّ" : "جارٍ التهيئة…"}
            </button>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-bold text-text-muted hover:border-primary hover:text-primary">
              <Icon name="clip" size={15} />
              اختر صورة · PDF · Word
              <input type="file" hidden accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          )}
          {upErr && <p className="mt-1 text-[11px] font-bold text-danger">{upErr}</p>}
        </div>

        {/* المؤقّت — مدمج مع التحدّي كما طلبت */}
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-2 text-[11px] font-bold text-text-muted">
            وقت الحلّ (اختياري) — يظهر عدّ تنازلي لكل الطلاب
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[0, 5, 10, 15, 20, 30, 45].map((m) => (
              <button key={m} onClick={() => setMinutes(m)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  minutes === m
                    ? "bg-[var(--bz-blue)] text-white"
                    : "border border-border text-text-muted hover:border-primary hover:text-primary"
                }`}>
                {m === 0 ? "بلا وقت" : `${m} د`}
              </button>
            ))}
          </div>
        </div>
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

  useEffect(() => {
    const unsub = listenAllAnswers(roomId, setAnswers);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  useEffect(() => {
    const unsub = listenScores(roomId, setScores);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

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
                    {isShowcased && <Icon name="star" size={12} className="ml-1 inline text-[#D08217]" />}{a.name}
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
                    {a.text?.trim() && (
                      <MathText text={a.text} className="mt-2.5 border-t border-border pt-2.5 text-sm leading-relaxed text-text-primary" />
                    )}

                    {/* مرفق الطالب: الأستاذ يمرّ على عشرات الحلول، فالمعاينة
                        مضغوطة ويكبّرها بضغطة عند الحاجة. */}
                    {a.attachment && (
                      <div className={a.text?.trim() ? "mt-2" : "mt-2.5 border-t border-border pt-2.5"}>
                        <AttachmentView att={a.attachment} compact />
                      </div>
                    )}
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
