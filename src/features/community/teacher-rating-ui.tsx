"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faCheck, faTrash, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  type TeacherRating, type RatingStats,
  listenTeacherRatings, computeStats, rateTeacher, removeMyRating,
  checkEligibility, type Eligibility,
  MIN_RATINGS_TO_SHOW,
} from "@/features/community/teacher-rating";

/* ─────────── هوك مشترك ─────────── */
export function useTeacherRating(teacherUid?: string) {
  const [list, setList] = useState<TeacherRating[]>([]);
  useEffect(() => {
    if (!teacherUid) return;
    return listenTeacherRatings(teacherUid, setList);
  }, [teacherUid]);
  return { list, stats: computeStats(list) };
}

/* ─────────── شارة التقييم (تُعرض بجانب الأستاذ وملخّصاته) ─────────── */
export function RatingBadge({ stats, size = "sm" }: { stats: RatingStats; size?: "sm" | "md" }) {
  if (stats.count === 0) {
    return <span className="text-[11px] text-text-muted">لا تقييمات بعد</span>;
  }
  if (!stats.visible) {
    // إخفاء المتوسّط قبل الحد الأدنى يمنع تقييماً أو اثنين من صنع سمعة
    return (
      <span className="text-[11px] text-text-muted">
        {stats.count} من {MIN_RATINGS_TO_SHOW} تقييمات مطلوبة
      </span>
    );
  }
  const big = size === "md";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-bold text-amber-600 ${big ? "text-sm" : "text-[11px]"}`}>
      <FontAwesomeIcon icon={faStar} className={big ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {stats.avg.toFixed(1)}
      <span className="font-normal opacity-70">({stats.count})</span>
    </span>
  );
}

/* ─────────── اختيار النجوم ─────────── */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} من 5`}
          className="grid h-11 w-11 place-items-center rounded-xl transition active:scale-90"
        >
          <FontAwesomeIcon
            icon={n <= shown ? faStar : faStarOutline}
            className={`h-7 w-7 ${n <= shown ? "text-amber-500" : "text-text-muted"}`}
          />
        </button>
      ))}
    </div>
  );
}

/* ─────────── درج تقييم الأستاذ (للطالب) ─────────── */
export function RateTeacherSheet({
  teacherUid, teacherName, studentUid, studentName, open, onClose,
}: {
  teacherUid: string; teacherName: string; studentUid: string; studentName: string;
  open: boolean; onClose: () => void;
}) {
  const { list, stats } = useTeacherRating(teacherUid);
  const mine = list.find((r) => r.studentUid === studentUid);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) { setDone(false); return; }
    checkEligibility(teacherUid, studentUid).then(setElig);
  }, [open, teacherUid, studentUid]);

  useEffect(() => {
    if (mine) { setStars(mine.stars); setComment(mine.comment ?? ""); }
  }, [mine]);

  async function submit() {
    if (!stars || busy) return;
    setBusy(true);
    try {
      await rateTeacher(teacherUid, studentUid, studentName, stars, comment);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      alert("تعذّر حفظ التقييم. تأكّد أنك حضرت حصة مع هذا الأستاذ.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = elig && !elig.canRate;

  return (
    <BottomSheet open={open} onClose={onClose} title={`تقييم ${teacherName}`} maxHeight="86vh">
      <div className="pb-2">
        <div className="flex items-center justify-center gap-2 pb-1">
          <RatingBadge stats={stats} size="md" />
        </div>

        {blocked ? (
          <div className="mt-3 rounded-2xl border border-border bg-background p-4 text-center">
            <FontAwesomeIcon icon={faShieldHalved} className="h-6 w-6 text-text-muted" />
            <p className="mt-2 text-sm font-bold text-text-primary">
              {elig!.reason === "self"
                ? "لا يمكنك تقييم نفسك."
                : elig!.reason === "not-attended"
                  ? "التقييم متاح لمن حضر حصة مع هذا الأستاذ."
                  : "التقييم يُفتح بعد حضور عشر دقائق على الأقل."}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              هذا الشرط يحمي الأساتذة من الحملات المنظّمة، ويجعل التقييمات تعكس تجربة حقيقية.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-center text-xs text-text-muted">
              {mine ? "يمكنك تعديل تقييمك في أي وقت" : "كيف كانت تجربتك في حصص هذا الأستاذ؟"}
            </p>
            <div className="mt-2">
              <StarPicker value={stars} onChange={setStars} />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              dir="auto"
              placeholder="تعليق اختياري — ما الذي أفادك، وما الذي يمكن تحسينه؟"
              className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
            />
            <p className="mt-1 text-left text-[10px] text-text-muted">{comment.length}/500</p>

            <button
              onClick={submit}
              disabled={!stars || busy || done}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={done ? faCheck : faStar} className="h-4 w-4" />
              {done ? "شكراً لك ✓" : busy ? "..." : mine ? "تحديث تقييمي" : "إرسال التقييم"}
            </button>

            {mine && (
              <button
                onClick={() => { if (confirm("حذف تقييمك؟")) { removeMyRating(teacherUid, studentUid); onClose(); } }}
                className="mt-2 w-full rounded-xl border border-border py-2 text-xs font-bold text-text-muted transition hover:border-danger hover:text-danger"
              >
                حذف تقييمي
              </button>
            )}
          </>
        )}

        {/* آراء الطلاب */}
        {list.filter((r) => r.comment).length > 0 && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="mb-2 text-xs font-bold text-text-muted">آراء الطلاب</p>
            <div className="space-y-2">
              {list.filter((r) => r.comment).slice(0, 20).map((r) => (
                <div key={r.studentUid} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">{r.studentName}</span>
                    <span className="shrink-0 text-[11px] font-bold text-amber-600">
                      {"★".repeat(r.stars)}<span className="text-text-muted">{"★".repeat(5 - r.stars)}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-primary" dir="auto">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/* ─────────── ملخّص التقييم على بروفايل الأستاذ ───────────
   owner=true  → الأستاذ يرى بروفايله: تظهر ملاحظة الحماية الشخصية.
   owner=false → طالب/زائر: يرى النجوم والآراء بلا الملاحظة الشخصية. */
export function MyRatingSummary({ uid, owner = false }: { uid: string; owner?: boolean }) {
  const { list, stats } = useTeacherRating(uid);
  if (stats.count === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-text-muted">
        لم يُقيَّم بعد
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5 text-amber-500" />
          تقييم الطلاب
        </h3>
        <RatingBadge stats={stats} size="md" />
      </div>

      {owner && !stats.visible && (
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
          لا يظهر متوسّطك للطلاب قبل بلوغ {MIN_RATINGS_TO_SHOW} تقييمات — حمايةً لك من أثر تقييم واحد.
        </p>
      )}

      <div className="mt-3 space-y-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = stats.breakdown[n] ?? 0;
          const pct = stats.count ? (c / stats.count) * 100 : 0;
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="w-3 shrink-0 text-[11px] font-bold text-text-muted">{n}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-5 shrink-0 text-left text-[11px] text-text-muted">{c}</span>
            </div>
          );
        })}
      </div>

      {list.filter((r) => r.comment).length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {list.filter((r) => r.comment).slice(0, 5).map((r) => (
            <div key={r.studentUid} className="rounded-xl bg-background p-2.5">
              <span className="text-[11px] font-bold text-amber-600">{"★".repeat(r.stars)}</span>
              <p className="mt-1 text-xs leading-relaxed text-text-primary" dir="auto">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── لوحة الأدمن: كشف الحملات ─────────── */
export function AdminRatingRow({ teacherUid, teacherName }: { teacherUid: string; teacherName: string }) {
  const { list, stats } = useTeacherRating(teacherUid);
  if (stats.count === 0) return null;

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{teacherName}</span>
        <RatingBadge stats={stats} />
      </div>
      <div className="mt-2 space-y-1.5">
        {list.map((r) => (
          <div key={r.studentUid} className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5">
            <span className="shrink-0 text-[11px] font-bold text-amber-600">{r.stars}★</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary">
              {r.studentName}{r.comment ? ` — ${r.comment}` : ""}
            </span>
            <span className="shrink-0 text-[10px] text-text-muted">
              {new Date(r.updatedAt ?? r.at).toLocaleDateString("ar-DZ")}
            </span>
            <button
              onClick={() => { if (confirm("حذف هذا التقييم؟")) removeMyRating(teacherUid, r.studentUid); }}
              aria-label="حذف التقييم"
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-text-muted hover:text-danger"
            >
              <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
