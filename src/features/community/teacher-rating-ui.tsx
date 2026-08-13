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
} from "@/features/community/teacher-rating";

/* ─────────── هوك مشترك ─────────── */
export function useTeacherRating(teacherUid?: string) {
  const [list, setList] = useState<TeacherRating[]>([]);
  useEffect(() => {
    if (!teacherUid) return;
    const unsub = listenTeacherRatings(teacherUid, setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [teacherUid]);
  return { list, stats: computeStats(list) };
}

/* ─────────── شارة التقييم (تُعرض بجانب الأستاذ وملخّصاته) ─────────── */
export function RatingBadge({ stats, size = "sm" }: { stats: RatingStats; size?: "sm" | "md" }) {
  if (stats.count === 0) {
    return <span className="text-[11px] text-text-muted">لا تقييمات بعد</span>;
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
   نفس مصدر البيانات للعرض العام وحساب الأستاذ؛ `owner` يحدد فقط
   مقدار التفاصيل، ولا يغير قواعد التقييم أو صلاحية القراءة. */
export function MyRatingSummary({ uid, owner = false }: { uid: string; owner?: boolean }) {
  const { list, stats } = useTeacherRating(uid);
  const comments = list.filter((rating) => Boolean(rating.comment?.trim()));
  const visibleList = owner || stats.visible ? list : [];
  const visibleComments = owner || stats.visible ? comments : [];
  const averageReady = stats.visible;

  if (stats.count === 0) {
    return (
      <section className="bz-teacher-ratings bz-teacher-ratings-empty" aria-label="تقييمات الطلاب">
        <div className="bz-teacher-ratings-empty-icon"><FontAwesomeIcon icon={faStarOutline} /></div>
        <div><span className="bz-teacher-ratings-kicker">تقييمات الطلاب</span><h2>لم تحصل على تقييمات بعد.</h2><p>بعد أن يحضر الطلاب حصصك، يمكنهم مشاركة تجربتهم ليستفيد منها طلاب آخرون.</p></div>
      </section>
    );
  }

  return (
    <section className="bz-teacher-ratings" aria-label="تقييمات الطلاب">
      <div className="bz-teacher-ratings-head">
        <div><span className="bz-teacher-ratings-kicker">{owner ? "لوحة الأستاذ" : "تجارب الطلاب"}</span><h2>تقييمات الطلاب</h2><p>{owner ? "تابع الانطباع العام وآخر ما كتبه الطلاب عن حصصك." : "آراء منشورة تساعدك على التعرف إلى تجربة الطلاب مع الأستاذ."}</p></div>
        <div className="bz-teacher-ratings-summary">
          <span className="bz-teacher-ratings-stars" aria-label={averageReady ? `${stats.avg} من 5` : "المتوسط قيد التجميع"}>{[1, 2, 3, 4, 5].map((n) => <FontAwesomeIcon key={n} icon={averageReady && n <= Math.round(stats.avg) ? faStar : faStarOutline} />)}</span>
          <strong>{averageReady ? stats.avg.toFixed(1) : "—"}</strong>
          <small>{stats.count} {stats.count === 1 ? "تقييم" : "تقييمات"}</small>
        </div>
      </div>

      {!averageReady && <div className="bz-teacher-ratings-threshold"><FontAwesomeIcon icon={faShieldHalved} /><span>يظهر المتوسط العام بعد اكتمال 5 تقييمات، حفاظاً على دقة الانطباع وعدم بناء حكم على تجربة واحدة.</span></div>}

      <div className="bz-teacher-ratings-grid">
        <div className="bz-teacher-ratings-breakdown" aria-label="توزيع التقييمات">
          <h3>توزيع التقييمات</h3>
          {[5, 4, 3, 2, 1].map((n) => {
            const c = stats.breakdown[n] ?? 0;
            const pct = stats.count ? (c / stats.count) * 100 : 0;
            return <div key={n} className="bz-teacher-rating-bar"><span>{n}<FontAwesomeIcon icon={faStar} /></span><div><i style={{ width: `${pct}%` }} /></div><small>{c}</small></div>;
          })}
        </div>
        <div className="bz-teacher-ratings-recent">
          <div className="bz-teacher-ratings-recent-head"><h3>{owner ? "آخر التقييمات" : "آراء منشورة"}</h3><span>{visibleComments.length} تعليق</span></div>
          {visibleList.length === 0 ? <div className="bz-teacher-ratings-private-empty"><FontAwesomeIcon icon={faShieldHalved} /><p>تظهر الآراء بعد اكتمال الحد الأدنى من التقييمات.</p></div> : visibleComments.length === 0 ? <div className="bz-teacher-ratings-private-empty"><FontAwesomeIcon icon={faStarOutline} /><p>لا توجد تعليقات مكتوبة بعد، لكن عدد التقييمات محفوظ.</p></div> : <div className="bz-teacher-ratings-review-list">{visibleComments.slice(0, 6).map((rating) => <article key={rating.studentUid} className="bz-teacher-review-card"><div className="bz-teacher-review-meta"><span className="bz-teacher-review-author">{rating.studentName || "طالب"}</span><time dateTime={new Date(rating.updatedAt ?? rating.at).toISOString()}>{new Date(rating.updatedAt ?? rating.at).toLocaleDateString("ar-DZ", { year: "numeric", month: "short", day: "numeric" })}</time></div><span className="bz-teacher-review-stars" aria-label={`${rating.stars} من 5`}>{[1, 2, 3, 4, 5].map((n) => <FontAwesomeIcon key={n} icon={n <= rating.stars ? faStar : faStarOutline} />)}</span><p dir="auto">{rating.comment}</p></article>)}</div>}
        </div>
      </div>
    </section>
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
