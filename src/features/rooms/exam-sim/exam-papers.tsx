"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown, faCircleCheck, faTriangleExclamation, faPaperPlane,
  faSpinner, faFloppyDisk, faClock, faShieldHalved, faInbox, faBullhorn,
} from "@fortawesome/free-solid-svg-icons";
import { AttachmentView } from "@/features/rooms/attachment-view";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LiveAvatar } from "@/components/ui/live-avatar";
import {
  saveGrade, releaseAllGrades, listenPapers, listenGrades,
  type ExamPaper, type ExamGrade,
} from "@/features/rooms/exam-sim/exam-session";

/* ════════════════════════════════════════════════════════════
   أوراق الطلبة والتصحيح

   بطاقات لا جدول: جدول بستّة أعمدة على هاتف بعرض ٣٦٠ بكسل يعني تمريراً
   أفقياً وقراءةً مستحيلة. كل ورقة بطاقة تُفتح فتُظهر الحلّ والمرفقات
   وحقول التقييم في مكانها.

   والتصحيح **لا يجب أن يقع الآن**: الأستاذ يُنهي المحاكاة وتعود الغرفة
   إلى طبيعتها، ثمّ يفتح هذه اللوحة لاحقاً من الغرفة نفسها ويصحّح على
   مهله. لذلك «الحفظ» و«الإطلاق» زرّان منفصلان: يصحّح عشر أوراق ثمّ
   يُطلقها دفعة واحدة، فلا يرى أوّل طالب علامته قبل آخرهم.
════════════════════════════════════════════════════════════ */

export function ExamPapersPanel({
  roomId, roomName, papers, grades, grader,
}: {
  roomId: string;
  roomName: string;
  papers: ExamPaper[];
  grades: Record<string, ExamGrade>;
  grader: { uid: string; name: string };
}) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [msg, setMsg] = useState("");

  const pendingRelease = useMemo(
    () => Object.values(grades).filter((g) => !g.released).length,
    [grades],
  );

  async function doReleaseAll() {
    if (releasing || !pendingRelease) return;
    setReleasing(true);
    try {
      const n = await releaseAllGrades(roomId, roomName, grades);
      setMsg(`أُرسلت ${n} نتيجة إلى الطلبة.`);
      window.setTimeout(() => setMsg(""), 3000);
    } finally { setReleasing(false); }
  }

  if (papers.length === 0) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <FontAwesomeIcon icon={faInbox} className="h-10 w-10 text-text-muted opacity-25" />
          <p className="mt-3 text-[13px] font-extrabold text-text-primary">لم تصل أوراق بعد</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted">
            تظهر ورقة كل طالب هنا فور تسليمها.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-extrabold text-text-primary">أوراق الطلبة ({papers.length})</p>
        {pendingRelease > 0 && (
          <button
            onClick={doReleaseAll}
            disabled={releasing}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2 text-[11.5px] font-extrabold text-white disabled:opacity-50"
          >
            <FontAwesomeIcon icon={releasing ? faSpinner : faBullhorn} className={`h-2.5 w-2.5 ${releasing ? "animate-spin" : ""}`} />
            إرسال {pendingRelease} نتيجة
          </button>
        )}
      </div>

      {msg && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[11.5px] font-bold text-emerald-700">{msg}</p>
      )}

      {papers.map((p) => (
        <PaperCard
          key={p.uid}
          roomId={roomId}
          roomName={roomName}
          paper={p}
          grade={grades[p.uid] ?? null}
          grader={grader}
          open={openUid === p.uid}
          onToggle={() => setOpenUid(openUid === p.uid ? null : p.uid)}
        />
      ))}
    </div>
  );
}

function PaperCard({
  roomId, roomName, paper, grade, grader, open, onToggle,
}: {
  roomId: string;
  roomName: string;
  paper: ExamPaper;
  grade: ExamGrade | null;
  grader: { uid: string; name: string };
  open: boolean;
  onToggle: () => void;
}) {
  const [score, setScore] = useState<string>(grade ? String(grade.score) : "");
  const [max, setMax] = useState<string>(grade ? String(grade.max) : "20");
  const [notes, setNotes] = useState(grade?.notes ?? "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const status = grade ? (grade.released ? "released" : "graded") : "pending";
  const statusMeta = {
    pending: { label: "قيد التصحيح", cls: "bg-amber-400/15 text-amber-700" },
    graded: { label: "مصحَّحة — لم تُرسل", cls: "bg-primary/12 text-primary" },
    released: { label: "أُرسلت النتيجة", cls: "bg-emerald-500/15 text-emerald-600" },
  }[status];

  async function save(release: boolean) {
    const s = Number(score);
    const m = Number(max);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) { setErr("أدخل علامة صحيحة."); return; }
    if (s < 0 || s > m) { setErr(`العلامة يجب أن تكون بين 0 و${m}.`); return; }
    setBusy(release ? "release" : "save");
    setErr("");
    try {
      await saveGrade(roomId, roomName, paper.uid, { score: s, max: m, notes, released: release }, grader);
    } catch {
      setErr("تعذّر الحفظ — تحقّق من اتصالك.");
    } finally { setBusy(""); }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 p-3 text-right transition hover:bg-primary/5"
      >
        <LiveAvatar uid={paper.uid} name={paper.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-extrabold text-text-primary">{paper.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" />
              {new Date(paper.submittedAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {paper.late && <span className="font-bold text-amber-600">متأخّرة</span>}
            {paper.auto && <span>تسليم آلي</span>}
            {(paper.violations ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-danger">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
                {paper.violations} مخالفة
              </span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {grade && (
            <span dir="ltr" className="text-[13px] font-extrabold text-primary">{grade.score}/{grade.max}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </span>
        <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-background p-3">
          {/* مؤشّر النزاهة — رقم كما سجّله المحرّك، بلا حكم */}
          <p className={`flex items-start gap-1.5 rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
            (paper.violations ?? 0) === 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-danger/10 text-danger"
          }`}>
            <FontAwesomeIcon
              icon={(paper.violations ?? 0) === 0 ? faShieldHalved : faTriangleExclamation}
              className="mt-0.5 h-3 w-3 shrink-0"
            />
            {(paper.violations ?? 0) === 0
              ? "لم تُسجَّل أي مغادرة لشاشة الامتحان."
              : `سُجّلت ${paper.violations} مغادرة لشاشة الامتحان. القرار لك — النظام لا يحكم.`}
          </p>

          {paper.text && (
            <div>
              <p className="mb-1 text-[11.5px] font-extrabold text-text-primary">حلّ الطالب</p>
              <p className="whitespace-pre-wrap rounded-2xl border border-border bg-surface p-3 text-[12.5px] leading-relaxed text-text-primary">
                {paper.text}
              </p>
            </div>
          )}

          {(paper.attachments ?? []).length > 0 && (
            <div>
              <p className="mb-1 text-[11.5px] font-extrabold text-text-primary">
                صور الورقة ({paper.attachments!.length})
              </p>
              <div className="space-y-2">
                {paper.attachments!.map((a, i) => <AttachmentView key={i} att={a} compact />)}
              </div>
            </div>
          )}

          {/* التقييم */}
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="mb-2 text-[11.5px] font-extrabold text-text-primary">التقييم</p>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[10.5px] font-bold text-text-muted">العلامة</span>
                <input
                  type="number" inputMode="decimal" step="0.25" min={0}
                  value={score} onChange={(e) => setScore(e.target.value)}
                  placeholder="15"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-center text-[14px] font-extrabold outline-none focus:border-primary"
                />
              </label>
              <span className="pb-3 text-[14px] font-extrabold text-text-muted">/</span>
              <label className="w-20 shrink-0">
                <span className="mb-1 block text-[10.5px] font-bold text-text-muted">من</span>
                <input
                  type="number" inputMode="numeric" min={1} max={100}
                  value={max} onChange={(e) => setMax(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-2 text-center text-[14px] font-extrabold outline-none focus:border-primary"
                />
              </label>
            </div>

            <label className="mt-2.5 block">
              <span className="mb-1 block text-[10.5px] font-bold text-text-muted">ملاحظات للطالب</span>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} maxLength={1500}
                placeholder="ما أحسنتَه وما يحتاج مراجعة…"
                className="w-full resize-y rounded-xl border border-border bg-background p-2.5 text-[12.5px] leading-relaxed outline-none focus:border-primary"
              />
            </label>

            {err && <p className="mt-1.5 text-[11px] font-bold text-danger">{err}</p>}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => save(false)}
                disabled={Boolean(busy)}
                className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[12px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <FontAwesomeIcon icon={busy === "save" ? faSpinner : faFloppyDisk} className={`h-3 w-3 ${busy === "save" ? "animate-spin" : ""}`} />
                حفظ التقييم
              </button>
              <button
                onClick={() => save(true)}
                disabled={Boolean(busy)}
                className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-primary text-[12px] font-extrabold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={busy === "release" ? faSpinner : faPaperPlane} className={`h-3 w-3 ${busy === "release" ? "animate-spin" : ""}`} />
                حفظ وإرسال للطالب
              </button>
            </div>

            {grade?.released && (
              <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-600">
                <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" />
                وصل الطالب إشعاراً بنتيجته — أي تعديل الآن يحتاج إرسالاً جديداً.
              </p>
            )}
          </div>

          <Link href={`/messages/${paper.uid}`}
            className="block text-center text-[11px] font-bold text-primary hover:underline">
            مراسلة الطالب مباشرة
          </Link>
        </div>
      )}
    </article>
  );
}

/* ════════════════════════════════════════════════════════════
   لوحة التصحيح بعد انتهاء المحاكاة

   الأستاذ لا يُلزَم بالتصحيح لحظة الامتحان. يُنهي المحاكاة فتعود
   الغرفة إلى طبيعتها، وتبقى الأوراق هنا يفتحها متى شاء — من الغرفة
   نفسها — فيصحّح ويُرسل النتائج، ويصل الطالب إشعارٌ حتى لو غادر.
════════════════════════════════════════════════════════════ */
export function ExamGradingSheet({
  roomId, roomName, grader, open, onClose,
}: {
  roomId: string;
  roomName: string;
  grader: { uid: string; name: string };
  open: boolean;
  onClose: () => void;
}) {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [grades, setGrades] = useState<Record<string, ExamGrade>>({});

  useEffect(() => {
    if (!open) return;
    const u1 = listenPapers(roomId, setPapers);
    const u2 = listenGrades(roomId, setGrades);
    return () => { u1(); u2(); };
  }, [open, roomId]);

  return (
    <BottomSheet open={open} onClose={onClose} title="📝 أوراق الطلبة والتصحيح" maxHeight="90vh">
      <div className="-mx-1">
        <ExamPapersPanel
          roomId={roomId}
          roomName={roomName}
          papers={papers}
          grades={grades}
          grader={grader}
        />
      </div>
    </BottomSheet>
  );
}
