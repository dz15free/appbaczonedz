"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines, faPenToSquare, faPaperPlane, faUpRightFromSquare, faClock,
  faShieldHalved, faTriangleExclamation, faCircleCheck, faSpinner, faPaperclip,
  faXmark, faStop, faPlus, faUsers, faEye, faLightbulb, faHourglassHalf,
  faExpand, faCompress, faRightFromBracket, faTriangleExclamation as faWarn,
} from "@fortawesome/free-solid-svg-icons";
import { AttachmentView } from "@/features/rooms/attachment-view";
import { initDrive, connectDrive, uploadToDrive, hasDriveToken, isDriveConfigured } from "@/lib/gdrive";
import type { ChallengeAttachment } from "@/features/rooms/challenge";
import {
  type ExamSession, type ExamPaper, type ExamGrade,
  submitPaper, listenMyPaper, listenMyGrade, listenPapers, listenGrades,
  endExam, extendExam, closeExam, releaseSolution,
  secondsLeft as calcSecondsLeft, formatClock, formatSimDuration,
} from "@/features/rooms/exam-sim/exam-session";
import {
  useExamGuard, integrityReport, bellStart, bellEnd, primeAudio,
  toggleFullscreen, isFullscreen,
} from "@/features/rooms/exam-sim/exam-guard";
import { ExamPapersPanel } from "@/features/rooms/exam-sim/exam-papers";

/* ════════════════════════════════════════════════════════════
   قاعة الامتحان داخل الغرفة

   تحلّ محلّ **محتوى المسرح** لا محلّ الغرفة: الشريط العلوي والمشاركون
   والصوت وكل ما حولها يبقى كما هو، فالخروج من المحاكاة لا يُعيد بناء
   شيء — تختفي هذه الطبقة فيعود ما تحتها حيّاً.

   على الحاسوب: الموضوع يميناً وورقة الطالب يساراً — كما في القاعة،
   السؤال أمامك والورقة تحتك. وعلى الهاتف تبويبان، لأنّ عمودين على
   ٣٦٠ بكسل يعنيان عمودين لا يُقرأ أيّ منهما.

   المؤقّت يُحسب من `endsAt` المطلقة في كل تصيير: تحديث الصفحة لا
   يُصفّره، وإعادة الاتصال لا تُربكه، ولا يحتاج مزامنة إضافية.
════════════════════════════════════════════════════════════ */

export function ExamStage({
  roomId, roomName, session, isOwner, uid, userName, onLeaveRoom,
}: {
  roomId: string;
  roomName: string;
  session: ExamSession;
  isOwner: boolean;
  uid: string;
  userName: string;
  /** مغادرة الغرفة — الظرف الطارئ يقع، والطالب يجب أن يجد باباً */
  onLeaveRoom?: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  /* ── الوقت: مصدره اللحظة المطلقة، ونبضة كل ثانية للعرض فقط ── */
  const [left, setLeft] = useState(() => calcSecondsLeft(session));
  useEffect(() => {
    setLeft(calcSecondsLeft(session));
    const t = window.setInterval(() => setLeft(calcSecondsLeft(session)), 1000);
    return () => window.clearInterval(t);
  }, [session]);

  const timeUp = left <= 0 || session.status === "ended";

  return (
    <div ref={stageRef} className="bz-room-exam-stage flex h-full min-h-0 flex-col bg-background">
      {isOwner ? (
        <TeacherExamView
          roomId={roomId} roomName={roomName} session={session}
          left={left} timeUp={timeUp} uid={uid} userName={userName} stageRef={stageRef}
        />
      ) : (
        <StudentExamView
          roomId={roomId} session={session} left={left} timeUp={timeUp}
          uid={uid} userName={userName} stageRef={stageRef} onLeaveRoom={onLeaveRoom}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   عرض الوقت — يتغيّر لونه مع اقتراب النهاية
══════════════════════════════════════════════════════════ */
function TimerPill({ left, timeUp, compact }: { left: number; timeUp: boolean; compact?: boolean }) {
  const danger = left <= 300 && !timeUp;
  return (
    <span
      dir="ltr"
      aria-live="polite"
      aria-label={timeUp ? "انتهى الوقت" : `الوقت المتبقي ${formatClock(left)}`}
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 font-mono font-extrabold tabular-nums ${
        compact ? "py-1 text-[13px]" : "py-1.5 text-[16px] sm:text-[19px]"
      } ${
        timeUp
          ? "bg-danger/12 text-danger"
          : danger
            ? "animate-pulse bg-danger/12 text-danger"
            : "bg-primary/10 text-primary"
      }`}
    >
      <FontAwesomeIcon icon={faClock} className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {timeUp ? "00:00:00" : formatClock(left)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   زرّ ملء الشاشة — يعمل على iPhone بالبديل التنسيقي

   موجود لكل من في القاعة لا للأستاذ وحده: الطالب هو من يحتاج شاشة
   خالية من كل شيء عدا موضوعه.
══════════════════════════════════════════════════════════ */
function FullscreenBtn({ stageRef }: { stageRef?: React.RefObject<HTMLElement | null> }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  return (
    <button
      onClick={async () => setOn(await toggleFullscreen(stageRef?.current ?? null))}
      aria-label={on ? "خروج من ملء الشاشة" : "ملء الشاشة"}
      title={on ? "خروج من ملء الشاشة" : "ملء الشاشة"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition hover:border-primary hover:text-primary"
    >
      <FontAwesomeIcon icon={on ? faCompress : faExpand} className="h-3.5 w-3.5" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   عارض الموضوع — إطار Drive داخل واجهة المنصّة
══════════════════════════════════════════════════════════ */
function SubjectViewer({ session, onOpenExternal }: { session: ExamSession; onOpenExternal?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <FontAwesomeIcon icon={faFileLines} className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-[12px] font-extrabold text-text-primary">{session.examLabel}</span>
        </span>
        <a
          href={session.examUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpenExternal}
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary"
        >
          <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5" /> فتح
        </a>
      </div>
      <iframe
        src={session.examUrl}
        title={session.examLabel}
        className="min-h-0 w-full flex-1 bg-white"
        allow="autoplay"
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   الطالب
══════════════════════════════════════════════════════════ */
function StudentExamView({
  roomId, session, left, timeUp, uid, userName, stageRef, onLeaveRoom,
}: {
  roomId: string;
  session: ExamSession;
  left: number;
  timeUp: boolean;
  uid: string;
  userName: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onLeaveRoom?: () => void;
}) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tab, setTab] = useState<"subject" | "answer">("subject");
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<ChallengeAttachment[]>([]);
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [grade, setGrade] = useState<ExamGrade | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [driveReady, setDriveReady] = useState(false);

  const submitted = Boolean(paper);
  const guardActive = !submitted && !timeUp;

  const { violations, lastReason, alarmOpen, resume, grace } = useExamGuard({
    active: guardActive,
    opts: session.guard,
    secondsLeft: left,
    stageRef,
  });

  /* الجرس عند الدخول — داخل تفاعل سابق، فالصوت مسموح */
  useEffect(() => {
    if (session.guard.sfx && !submitted && !timeUp) bellStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const u1 = listenMyPaper(roomId, uid, setPaper);
    const u2 = listenMyGrade(roomId, uid, setGrade);
    return () => { u1(); u2(); };
  }, [roomId, uid]);

  useEffect(() => {
    if (!isDriveConfigured()) return;
    let alive = true;
    void initDrive().then((ok) => { if (alive) setDriveReady(ok); });
    return () => { alive = false; };
  }, []);

  /* التسليم الآلي عند انتهاء الوقت — لا تضيع ورقة كُتبت */
  const autoDone = useRef(false);
  useEffect(() => {
    if (!timeUp || submitted || autoDone.current) return;
    if (!text.trim() && atts.length === 0) return;
    autoDone.current = true;
    void doSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, submitted]);

  useEffect(() => {
    if (timeUp && session.guard.sfx) bellEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  async function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setErr("الملفّ أكبر من 8 ميغابايت."); return; }
    setUploading(true);
    setErr("");
    grace(4000);   // فتح منتقي الملفّات ليس مغادرة للامتحان
    try {
      if (!hasDriveToken()) await connectDrive();
      const up = await uploadToDrive(f);
      /* `thumbnail?sz=w1600` لا `uc?export=view`: الثاني أوقفته Google
         للتضمين المباشر فتظهر علامة استفهام بدل صورة الورقة. نفس
         الرابط المستعمل في مرفقات التحدّي. */
      setAtts((a) => [...a, {
        url: `https://drive.google.com/thumbnail?id=${up.id}&sz=w1600`,
        name: up.name || f.name,
        kind: f.type.startsWith("image/") ? "image" as const : "doc" as const,
      }].slice(0, 6));
    } catch {
      setErr("تعذّر رفع الملفّ. حاول مجدّداً.");
    } finally { setUploading(false); }
  }

  async function doSubmit(auto = false) {
    if (busy || submitted) return;
    setBusy(true);
    setErr("");
    try {
      const e = await submitPaper(roomId, session, {
        uid, name: userName, text, attachments: atts, violations, auto,
      });
      if (e) setErr(e);
      else setConfirm(false);
    } catch {
      setErr("تعذّر تسليم الورقة — تحقّق من اتصالك.");
    } finally { setBusy(false); }
  }

  /* ── بعد التسليم: شاشة النتيجة ── */
  if (submitted) {
    return (
      <StudentResultView
        session={session} paper={paper!} grade={grade}
        violations={paper!.violations ?? 0}
      />
    );
  }

  const canSubmit = Boolean(text.trim() || atts.length);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── ترويسة القاعة ── */}
      <header className="shrink-0 border-b border-border bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-primary">
              <FontAwesomeIcon icon={faShieldHalved} className="h-2.5 w-2.5" />
              قاعة امتحان البكالوريا
            </p>
            <p className="truncate text-[13px] font-extrabold text-text-primary">{session.subjectName}</p>
            <p className="truncate text-[10.5px] text-text-muted">
              {session.specialtyLabel} · {session.examLabel} · {formatSimDuration(session.durationMin)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <TimerPill left={left} timeUp={timeUp} />
            <FullscreenBtn stageRef={stageRef} />
            {onLeaveRoom && (
              <button
                onClick={() => setLeaveOpen(true)}
                aria-label="مغادرة الغرفة"
                title="مغادرة الغرفة"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-danger/40 text-danger transition hover:bg-danger/10"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </div>

        {session.guard.ac && (
          <p className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-bold ${
            violations === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-danger/10 text-danger"
          }`}>
            <FontAwesomeIcon icon={violations === 0 ? faCircleCheck : faTriangleExclamation} className="h-2.5 w-2.5" />
            {violations === 0 ? "المراقبة مفعّلة — لا مخالفات" : `محاولات خروج: ${violations}`}
          </p>
        )}
      </header>

      {/* ── تبويبان على الهاتف ── */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-surface px-2 py-1.5 lg:hidden">
        <TabBtn active={tab === "subject"} icon={faFileLines} label="الموضوع" onClick={() => setTab("subject")} />
        <TabBtn active={tab === "answer"} icon={faPenToSquare} label="ورقتي" onClick={() => setTab("answer")} />
      </div>

      {/* ── المسرح ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={`min-h-0 flex-1 ${tab === "subject" ? "block" : "hidden"} lg:block`}>
          <SubjectViewer session={session} onOpenExternal={() => grace(4000)} />
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto border-s border-border bg-background lg:max-w-[46%] ${
          tab === "answer" ? "block" : "hidden"
        } lg:block`}>
          <div className="space-y-3 p-3">
            <div>
              <label htmlFor="bz-exam-answer" className="mb-1 block text-[12px] font-extrabold text-text-primary">
                ورقة إجابتك
              </label>
              <textarea
                id="bz-exam-answer"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                maxLength={8000}
                disabled={timeUp && !session.allowLate}
                placeholder="اكتب حلّك هنا… أو صوّر ورقتك وأرفقها بالأسفل."
                className="w-full resize-y rounded-2xl border border-border bg-surface p-3 text-[13.5px] leading-relaxed outline-none focus:border-primary disabled:opacity-60"
              />
              <p className="mt-1 text-end text-[10.5px] text-text-muted">{text.length} / 8000</p>
            </div>

            {/* المرفقات */}
            <div>
              <p className="mb-1.5 text-[12px] font-extrabold text-text-primary">صور الورقة / ملفّات</p>
              {atts.length > 0 && (
                <ul className="mb-2 space-y-2">
                  {atts.map((a, i) => (
                    <li key={i} className="relative">
                      <AttachmentView att={a} compact />
                      <button
                        onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}
                        aria-label={`حذف ${a.name}`}
                        className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!isDriveConfigured() ? (
                <p className="rounded-xl bg-border/50 px-3 py-2 text-[11px] text-text-muted">
                  إرفاق الملفّات غير مفعّل على هذه المنصّة — اكتب حلّك في المساحة أعلاه.
                </p>
              ) : !hasDriveToken() ? (
                <button
                  onClick={async () => { grace(6000); try { await connectDrive(); setDriveReady(true); setErr(""); } catch { setErr("تعذّر الاتصال بحساب Google."); } }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-[12px] font-extrabold text-primary transition hover:border-primary"
                >
                  <FontAwesomeIcon icon={faPaperclip} className="h-3 w-3" /> اربط حسابك لإرفاق صورة الورقة
                </button>
              ) : (
                <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-[12px] font-extrabold transition ${
                  uploading || !driveReady ? "cursor-wait text-text-muted" : "text-primary hover:border-primary"
                }`}>
                  <FontAwesomeIcon icon={uploading ? faSpinner : faPaperclip} className={`h-3 w-3 ${uploading ? "animate-spin" : ""}`} />
                  {uploading ? "جارٍ الرفع…" : !driveReady ? "جارٍ التهيئة…" : "أرفق صورة أو ملفّ"}
                  <input type="file" hidden accept="image/*,.pdf,.doc,.docx"
                    disabled={uploading || !driveReady}
                    onChange={(e) => { void pickFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
              )}
            </div>

            {err && <p className="text-[11.5px] font-bold text-danger">{err}</p>}

            {timeUp && !session.allowLate && (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-[11.5px] font-bold text-danger">
                انتهى الوقت ولم يعد التسليم متاحاً.
              </p>
            )}
            {timeUp && session.allowLate && (
              <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-[11.5px] font-bold text-amber-700">
                انتهى الوقت — ما زال بإمكانك التسليم وسيُسجَّل كتسليم متأخّر.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── شريط التسليم الثابت ── */}
      <div
        className="shrink-0 border-t border-border bg-surface px-3 py-2.5"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="lg:hidden"><TimerPill left={left} timeUp={timeUp} compact /></span>
          <button
            onClick={() => { primeAudio(); setConfirm(true); }}
            disabled={!canSubmit || (timeUp && !session.allowLate) || busy}
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-[14px] font-extrabold text-white shadow-glow transition active:scale-[0.99] disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" /> تسليم الورقة
          </button>
        </div>
      </div>

      {/* ── تأكيد التسليم ── */}
      {confirm && (
        <div className="absolute inset-0 z-[60] grid place-items-center bg-black/60 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 text-center">
            <FontAwesomeIcon icon={faPaperPlane} className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-display text-lg font-extrabold text-text-primary">
              هل أنت متأكّد من تسليم ورقتك؟
            </h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
              لا يمكن التعديل بعد التسليم. تأكّد من أنّك أرفقت كل صفحات حلّك.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirm(false)}
                className="min-h-[44px] flex-1 rounded-2xl border border-border text-[13px] font-extrabold text-text-muted">
                رجوع
              </button>
              <button onClick={() => doSubmit(false)} disabled={busy}
                className="min-h-[44px] flex-1 rounded-2xl bg-gradient-primary text-[13px] font-extrabold text-white disabled:opacity-50">
                {busy ? "…" : "نعم، سلّم"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── مغادرة الغرفة أثناء الامتحان ── */}
      {leaveOpen && (
        <div className="absolute inset-0 z-[65] grid place-items-center bg-black/60 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 text-center">
            <FontAwesomeIcon icon={faWarn} className="h-8 w-8 text-amber-500" />
            <h3 className="mt-3 font-display text-lg font-extrabold text-text-primary">مغادرة الغرفة الآن؟</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
              {submitted
                ? "ورقتك مُسلَّمة بالفعل — يمكنك المغادرة بأمان."
                : session.allowLate
                  ? "لم تُسلّم ورقتك بعد. يمكنك العودة والتسليم ما دامت المحاكاة مفتوحة."
                  : "لم تُسلّم ورقتك بعد، وقد لا تتمكّن من التسليم بعد انتهاء الوقت."}
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setLeaveOpen(false)}
                className="min-h-[44px] flex-1 rounded-2xl border border-border text-[13px] font-extrabold text-text-muted">
                البقاء
              </button>
              <button onClick={() => { setLeaveOpen(false); onLeaveRoom?.(); }}
                className="min-h-[44px] flex-1 rounded-2xl bg-danger text-[13px] font-extrabold text-white">
                مغادرة
              </button>
            </div>
            {!submitted && (
              <button
                onClick={() => { setLeaveOpen(false); setTab("answer"); }}
                className="mt-2.5 text-[12px] font-bold text-primary hover:underline"
              >
                العودة لتسليم ورقتي أوّلاً
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── إنذار المراقبة ── */}
      {alarmOpen && (
        <div className="absolute inset-0 z-[70] grid place-items-center bg-danger/85 p-5" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 text-center">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-9 w-9 text-danger" />
            <h3 className="mt-3 font-display text-lg font-extrabold text-danger">غادرتَ شاشة الامتحان</h3>
            <p className="mt-1.5 text-[12.5px] font-bold text-text-primary">
              المخالفة رقم {violations}{lastReason ? ` — ${lastReason}` : ""}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-muted">
              في القاعة الحقيقية تكفي واحدة لسحب ورقتك. المخالفات تُسجَّل مع ورقتك ويراها أستاذك.
            </p>
            <button onClick={resume}
              className="mt-4 min-h-[46px] w-full rounded-2xl bg-gradient-primary text-[13.5px] font-extrabold text-white">
              العودة إلى الامتحان
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active, icon, label, onClick,
}: { active: boolean; icon: typeof faFileLines; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-extrabold transition ${
        active ? "bg-gradient-primary text-white" : "border border-border text-text-muted"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-3 w-3" /> {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   الطالب بعد التسليم — الانتظار ثمّ النتيجة
══════════════════════════════════════════════════════════ */
function StudentResultView({
  session, paper, grade, violations,
}: { session: ExamSession; paper: ExamPaper; grade: ExamGrade | null; violations: number }) {
  const report = useMemo(() => integrityReport(violations, session.guard.ac), [violations, session.guard.ac]);
  const released = grade?.released ? grade : null;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-lg space-y-3">
        <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <FontAwesomeIcon icon={faCircleCheck} className="h-9 w-9 text-emerald-600" />
          <h2 className="mt-2.5 font-display text-lg font-extrabold text-emerald-700">تمّ تسليم ورقتك بنجاح</h2>
          <p className="mt-1 text-[12px] text-emerald-800/80">
            {new Date(paper.submittedAt).toLocaleString("ar-DZ")}
            {paper.late ? " · تسليم متأخّر" : ""}
            {paper.auto ? " · تسليم آلي عند انتهاء الوقت" : ""}
          </p>
        </div>

        {/* تقرير النزاهة — بصياغة المحاكي نفسها */}
        <div className={`flex items-start gap-2 rounded-2xl border p-3.5 ${
          report.tone === "ok" ? "border-emerald-500/30 bg-emerald-500/5" : "border-danger/30 bg-danger/5"
        }`}>
          <FontAwesomeIcon
            icon={report.tone === "ok" ? faShieldHalved : faTriangleExclamation}
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${report.tone === "ok" ? "text-emerald-600" : "text-danger"}`}
          />
          <p className={`text-[12px] leading-relaxed ${report.tone === "ok" ? "text-emerald-800" : "text-danger"}`}>
            {report.text}
          </p>
        </div>

        {/* النتيجة */}
        {released ? (
          <div className="rounded-3xl border border-border bg-surface p-5">
            <p className="text-[11.5px] font-bold text-text-muted">علامتك في {session.subjectName}</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-primary" dir="ltr">
              {released.score} <span className="text-xl text-text-muted">/ {released.max}</span>
            </p>
            {released.notes && (
              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <p className="text-[11.5px] font-extrabold text-text-primary">ملاحظات الأستاذ</p>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-muted">{released.notes}</p>
              </div>
            )}
            <p className="mt-2.5 text-[10.5px] text-text-muted">
              صحّحها {released.gradedByName ?? "الأستاذ"} · {new Date(released.gradedAt).toLocaleString("ar-DZ")}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-surface p-5 text-center">
            <FontAwesomeIcon icon={faHourglassHalf} className="h-7 w-7 text-text-muted opacity-50" />
            <p className="mt-2 text-[13px] font-extrabold text-text-primary">ورقتك بانتظار التصحيح</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted">
              يصلك إشعار فور أن يعتمد الأستاذ علامتك — حتى لو غادرت الغرفة.
            </p>
          </div>
        )}

        {/* التصحيح النموذجي */}
        {session.solutionUrl && session.solutionReleased && (
          <a href={session.solutionUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 py-3 text-[13px] font-extrabold text-primary">
            <FontAwesomeIcon icon={faLightbulb} className="h-3.5 w-3.5" /> عرض التصحيح النموذجي
          </a>
        )}

        {/* ورقتي كما سُلِّمت */}
        <div className="rounded-3xl border border-border bg-surface p-4">
          <p className="text-[12px] font-extrabold text-text-primary">ورقتي كما سُلِّمت</p>
          {paper.text && (
            <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-background p-3 text-[12.5px] leading-relaxed text-text-muted">
              {paper.text}
            </p>
          )}
          {(paper.attachments ?? []).map((a, i) => (
            <div key={i} className="mt-2"><AttachmentView att={a} compact /></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   الأستاذ
══════════════════════════════════════════════════════════ */
function TeacherExamView({
  roomId, roomName, session, left, timeUp, uid, userName, stageRef,
}: {
  roomId: string;
  roomName: string;
  session: ExamSession;
  left: number;
  timeUp: boolean;
  uid: string;
  userName: string;
  stageRef?: React.RefObject<HTMLElement | null>;
}) {
  const [tab, setTab] = useState<"subject" | "papers">("papers");
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [grades, setGrades] = useState<Record<string, ExamGrade>>({});
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const u1 = listenPapers(roomId, setPapers);
    const u2 = listenGrades(roomId, setGrades);
    return () => { u1(); u2(); };
  }, [roomId]);

  const graded = papers.filter((p) => grades[p.uid]).length;

  async function act(name: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(name);
    try { await fn(); } finally { setBusy(""); }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── لوحة تحكّم الأستاذ ── */}
      <header className="shrink-0 border-b border-border bg-surface px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-primary">
              <FontAwesomeIcon icon={faShieldHalved} className="h-2.5 w-2.5" /> محاكاة جارية
            </p>
            <p className="truncate text-[13px] font-extrabold text-text-primary">
              {session.subjectName} · {session.examLabel}
            </p>
            <p className="truncate text-[10.5px] text-text-muted">
              {session.specialtyLabel} · {formatSimDuration(session.durationMin)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <TimerPill left={left} timeUp={timeUp} />
            <FullscreenBtn stageRef={stageRef} />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <CtrlBtn icon={faPlus} label="+5 دقائق" busy={busy === "ext"}
            onClick={() => act("ext", () => extendExam(roomId, 5))} />
          <CtrlBtn icon={faStop} label="إنهاء الوقت" tone="warn" busy={busy === "end"}
            disabled={timeUp}
            onClick={() => act("end", () => endExam(roomId))} />
          <CtrlBtn
            icon={faLightbulb}
            label={session.solutionReleased ? "إخفاء التصحيح" : "إتاحة التصحيح"}
            tone={session.solutionReleased ? "on" : "default"}
            busy={busy === "sol"}
            disabled={!session.solutionUrl}
            onClick={() => act("sol", () => releaseSolution(roomId, !session.solutionReleased))}
          />
          <CtrlBtn icon={faXmark} label="إنهاء المحاكاة" tone="bad" busy={busy === "close"}
            onClick={() => {
              if (!confirm("إنهاء المحاكاة وإعادة الغرفة إلى وضعها الطبيعي؟\n\nالأوراق والعلامات تبقى محفوظة، وتستطيع التصحيح لاحقاً.")) return;
              void act("close", () => closeExam(roomId));
            }} />
        </div>

        <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-text-muted">
          <FontAwesomeIcon icon={faUsers} className="h-3 w-3 text-primary" />
          {papers.length} ورقة مسلَّمة · {graded} مصحَّحة
        </p>
      </header>

      {/* ── تبويبان ── */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-surface px-2 py-1.5 lg:hidden">
        <TabBtn active={tab === "papers"} icon={faPenToSquare} label="أوراق الطلبة" onClick={() => setTab("papers")} />
        <TabBtn active={tab === "subject"} icon={faEye} label="الموضوع" onClick={() => setTab("subject")} />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={`min-h-0 flex-1 ${tab === "subject" ? "block" : "hidden"} lg:block`}>
          <SubjectViewer session={session} />
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto border-s border-border bg-background lg:max-w-[46%] ${
          tab === "papers" ? "block" : "hidden"
        } lg:block`}>
          <ExamPapersPanel
            roomId={roomId}
            roomName={roomName}
            papers={papers}
            grades={grades}
            grader={{ uid, name: userName }}
          />
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({
  icon, label, onClick, busy, disabled, tone = "default",
}: {
  icon: typeof faPlus;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "warn" | "bad" | "on";
}) {
  const cls =
    tone === "warn" ? "border-amber-400/50 bg-amber-400/10 text-amber-600"
      : tone === "bad" ? "border-danger/40 bg-danger/10 text-danger"
      : tone === "on" ? "border-primary/50 bg-primary/10 text-primary"
      : "border-border bg-surface text-text-muted hover:border-primary hover:text-primary";
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className={`flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-[11.5px] font-extrabold transition disabled:opacity-40 ${cls}`}>
      <FontAwesomeIcon icon={busy ? faSpinner : icon} className={`h-2.5 w-2.5 ${busy ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
