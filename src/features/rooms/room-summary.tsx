"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines, faCheck, faCopy, faTrash, faLayerGroup,
  faWandMagicSparkles, faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MathText } from "@/features/rooms/use-katex";
import { saveFlashcard } from "@/features/study/save-flashcard";
import {
  type SessionSummary, buildDraft, publishSummary, deleteSummary,
  listenSummaries, summaryToText,
} from "@/features/rooms/session-summary";

/* ════════════════════════════════════════════════════════════
   ملخّص الحصة

   الأستاذ: زر واحد يبني مسوّدة من الغرفة نفسها (الملاحظات، الملفات،
   التحديات، الاستفتاء، الأسئلة)، يراجعها ويضيف الواجب، ثم ينشرها.
   الطالب: يقرأ الملخّص، وينقل أي نقطة إلى بطاقات المراجعة بضغطة.
════════════════════════════════════════════════════════════ */

export function useSummaries(roomId: string) {
  const [list, setList] = useState<SessionSummary[]>([]);
  useEffect(() => {
    const unsub = listenSummaries(roomId, setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  return list;
}

/* ═══════════ لوحة الأستاذ ═══════════ */
export function TeacherSummarySheet({
  roomId, roomName, teacherName, open, onClose,
}: {
  roomId: string; roomName: string; teacherName: string; open: boolean; onClose: () => void;
}) {
  const summaries = useSummaries(roomId);
  const [draft, setDraft] = useState<Omit<SessionSummary, "id"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // نبني المسوّدة عند فتح اللوحة فقط — لا قراءات أثناء الحصة
  useEffect(() => {
    if (!open) { setDraft(null); setDone(false); return; }
    let alive = true;
    setBusy(true);
    buildDraft(roomId, teacherName)
      .then((d) => { if (alive) setDraft(d); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [open, roomId, teacherName]);

  async function publish() {
    if (!draft || busy) return;
    setBusy(true);
    await publishSummary(roomId, draft);
    setBusy(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  function editPoint(i: number, v: string) {
    if (!draft) return;
    const kp = [...draft.keyPoints];
    kp[i] = v;
    setDraft({ ...draft, keyPoints: kp });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="📘 ملخّص الحصة" maxHeight="90vh">
      {busy && !draft ? (
        <p className="py-10 text-center text-sm text-text-muted">جارٍ تجميع ما حدث في الحصة...</p>
      ) : draft ? (
        <div className="pb-2">
          <p className="rounded-xl bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="ml-1 h-3 w-3 text-primary" />
            جُمِع هذا من ملاحظاتك وملفات الغرفة وتحدّياتها. راجعه وعدّله قبل النشر.
          </p>

          {/* ما تم شرحه */}
          <label className="mt-3 block text-xs font-bold text-text-muted">ما تم شرحه</label>
          <textarea
            value={draft.covered}
            onChange={(e) => setDraft({ ...draft, covered: e.target.value })}
            rows={3}
            dir="auto"
            placeholder="لخّص الدرس في سطرين..."
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
          />

          {/* أهم النقاط */}
          <label className="mt-3 block text-xs font-bold text-text-muted">
            أهم النقاط {draft.keyPoints.length > 0 && `(${draft.keyPoints.length})`}
          </label>
          {draft.keyPoints.length === 0 ? (
            <p className="mt-1 rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] text-text-muted">
              لم أجد نقاطاً. اكتب أسطراً تبدأ بـ «-» في ملاحظات الغرفة وستُلتقط تلقائياً.
            </p>
          ) : (
            <div className="mt-1 space-y-1.5">
              {draft.keyPoints.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-primary">•</span>
                  <input
                    value={p}
                    onChange={(e) => editPoint(i, e.target.value)}
                    dir="auto"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setDraft({ ...draft, keyPoints: draft.keyPoints.filter((_, j) => j !== i) })}
                    aria-label="حذف النقطة"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-muted hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* الواجب */}
          <label className="mt-3 block text-xs font-bold text-text-muted">الواجب</label>
          <textarea
            value={draft.homework}
            onChange={(e) => setDraft({ ...draft, homework: e.target.value })}
            rows={2}
            dir="auto"
            placeholder="ما المطلوب قبل الحصة القادمة؟"
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
          />

          {/* ما التُقط تلقائياً */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.challenges.map((c, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                🧠 تحدٍّ{c.bestBy ? ` — أفضل حل: ${c.bestBy}` : ""}
              </span>
            ))}
            {draft.files.length > 0 && (
              <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-bold text-secondary">
                📎 {draft.files.length} ملف
              </span>
            )}
            {draft.questionCount > 0 && (
              <span className="rounded-full bg-border px-2.5 py-1 text-[11px] font-bold text-text-muted">
                🕵️ {draft.questionCount} سؤال مجهول
              </span>
            )}
          </div>

          <button
            onClick={publish}
            disabled={busy || done}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={done ? faCheck : faPaperPlane} className="h-4 w-4" />
            {done ? "نُشر للطلاب ✓" : busy ? "..." : "نشر الملخّص للطلاب"}
          </button>

          {/* ملخّصات سابقة */}
          {summaries.length > 0 && (
            <div className="mt-5 border-t border-border pt-3">
              <p className="mb-2 text-xs font-bold text-text-muted">ملخّصات منشورة ({summaries.length})</p>
              {summaries.map((s) => (
                <div key={s.id} className="mb-1.5 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-text-primary">
                    {new Date(s.at).toLocaleString("ar-DZ")}
                  </span>
                  <button
                    onClick={() => { if (confirm("حذف هذا الملخّص؟")) deleteSummary(roomId, s.id); }}
                    aria-label="حذف"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-muted hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-text-muted">تعذّر تجميع الملخّص.</p>
      )}
    </BottomSheet>
  );
}

/* ═══════════ عرض الملخّص للطالب ═══════════ */
export function SummaryViewerSheet({
  roomId, roomName, uid, subject, open, onClose,
}: {
  roomId: string; roomName: string; uid: string; subject?: string | null;
  open: boolean; onClose: () => void;
}) {
  const summaries = useSummaries(roomId);
  const [savedIdx, setSavedIdx] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const s = summaries[0];

  function savePoint(point: string, key: string) {
    saveFlashcard({
      uid, front: point, back: `من حصة: ${roomName}`,
      subject: subject || "general", source: roomName,
    });
    setSavedIdx(key);
    setTimeout(() => setSavedIdx(null), 1500);
  }

  function copyAll() {
    if (!s) return;
    navigator.clipboard?.writeText(summaryToText(s, roomName))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => {});
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="📘 ملخّص الحصة" maxHeight="88vh">
      {!s ? (
        <p className="py-10 text-center text-sm text-text-muted">
          لم ينشر الأستاذ ملخّصاً بعد.
        </p>
      ) : (
        <div className="pb-2">
          <p className="text-[11px] text-text-muted">
            {s.byName} — {new Date(s.at).toLocaleString("ar-DZ")}
          </p>

          {s.covered && (
            <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="mb-1 text-[11px] font-bold text-primary">ما تم شرحه</p>
              <MathText text={s.covered} className="text-sm leading-relaxed text-text-primary" />
            </div>
          )}

          {s.keyPoints.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold text-text-muted">أهم النقاط — اضغط ⭐ لحفظها كبطاقة</p>
              <div className="space-y-1.5">
                {s.keyPoints.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-border p-2.5">
                    <MathText text={p} className="min-w-0 flex-1 text-sm leading-relaxed text-text-primary" />
                    <button
                      onClick={() => savePoint(p, `k${i}`)}
                      aria-label="حفظ كبطاقة"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition active:scale-90 hover:bg-primary/10 hover:text-primary"
                    >
                      <FontAwesomeIcon icon={savedIdx === `k${i}` ? faCheck : faLayerGroup} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.homework && (
            <div className="mt-3 rounded-2xl border border-warning/30 bg-warning/5 p-3.5">
              <p className="mb-1 text-[11px] font-bold text-warning">📝 الواجب</p>
              <MathText text={s.homework} className="text-sm leading-relaxed text-text-primary" />
            </div>
          )}

          {s.challenges.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold text-text-muted">التحدّيات</p>
              {s.challenges.map((c, i) => (
                <div key={i} className="mb-1.5 rounded-xl border border-border p-3">
                  <MathText text={c.question} className="text-sm leading-relaxed text-text-primary" />
                  {c.bestText && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-[11px] font-bold text-amber-600">🏆 أفضل حل — {c.bestBy}</p>
                      <MathText text={c.bestText} className="mt-1 text-sm leading-relaxed text-text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {s.files.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold text-text-muted">الملفات المستخدمة</p>
              <div className="flex flex-wrap gap-1.5">
                {s.files.map((f, i) => (
                  <span key={i} className="rounded-full bg-border px-2.5 py-1 text-[11px] text-text-primary">{f}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={copyAll}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold text-text-muted transition active:scale-95 hover:border-primary hover:text-primary"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="h-4 w-4" />
            {copied ? "نُسخ ✓" : "نسخ الملخّص كاملاً"}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

