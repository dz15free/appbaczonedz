"use client";

import { useEffect, useState } from "react";
import { ref, set, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faCheck, faLock, faTrash } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { hasPurchased } from "@/features/paid/paid-access";

/* ════════════════════════════════════════════════════════════
   تقييم المحتوى المدفوع — للمشتري وحده

   الأهلية تُفرض في قواعد Firebase عبر عقدة purchases، وهي
   إثبات لا يُزوَّر: قيمتها كود وصول مُستهلَك باسم الطالب لهذا
   العنصر بالذات، والقاعدة تتحقّق من ذلك عند كل كتابة.
════════════════════════════════════════════════════════════ */

export interface ContentRating {
  uid: string;
  name: string;
  stars: number;
  comment?: string;
  at: number;
  updatedAt?: number;
}

export const MIN_CONTENT_RATINGS = 3;

export function listenContentRatings(itemId: string, cb: (list: ContentRating[]) => void) {
  return onValue(ref(rtdb, `contentRatings/${itemId}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<ContentRating, "uid">>) ?? {};
    cb(
      Object.entries(val)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => (b.updatedAt ?? b.at) - (a.updatedAt ?? a.at))
    );
  });
}

export async function rateContent(
  itemId: string, uid: string, name: string, stars: number, comment: string, isUpdate: boolean, firstAt?: number
) {
  const s = Math.max(1, Math.min(5, Math.round(stars)));
  const data: Record<string, unknown> = { name: name || "طالب", stars: s, at: firstAt ?? Date.now() };
  if (isUpdate) data.updatedAt = Date.now();
  const c = comment.trim();
  if (c) data.comment = c.slice(0, 500);
  await set(ref(rtdb, `contentRatings/${itemId}/${uid}`), data);
}

export async function deleteContentRating(itemId: string, uid: string) {
  await remove(ref(rtdb, `contentRatings/${itemId}/${uid}`));
}

export function useContentRatings(itemId: string) {
  const [list, setList] = useState<ContentRating[]>([]);
  useEffect(() => listenContentRatings(itemId, setList), [itemId]);
  const count = list.length;
  const avg = count ? Math.round((list.reduce((a, r) => a + r.stars, 0) / count) * 10) / 10 : 0;
  return { list, count, avg, visible: count >= MIN_CONTENT_RATINGS };
}

/* شارة مضغوطة تُعرض على بطاقة الملخّص / الغرفة المدفوعة */
export function ContentRatingBadge({ itemId, showEmpty }: { itemId: string; showEmpty?: boolean }) {
  const { count, avg, visible } = useContentRatings(itemId);
  if (count === 0) {
    return showEmpty ? <span className="text-[10px] text-text-muted">لم يُقيَّم بعد</span> : null;
  }
  if (!visible) {
    return <span className="text-[10px] text-text-muted">{count} تقييم</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
      <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
      {avg.toFixed(1)}
      <span className="font-normal opacity-70">({count})</span>
    </span>
  );
}

/* درج التقييم والتعليقات */
export function ContentRatingSheet({
  itemId, itemTitle, uid, name, isAdmin, open, onClose,
}: {
  itemId: string; itemTitle: string; uid: string; name: string;
  isAdmin?: boolean; open: boolean; onClose: () => void;
}) {
  const { list, count, avg, visible } = useContentRatings(itemId);
  const mine = list.find((r) => r.uid === uid);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [bought, setBought] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (!open) { setDone(false); return; }
    hasPurchased(uid, "library", itemId).then(setBought);
  }, [open, uid, itemId]);

  useEffect(() => {
    if (mine) { setStars(mine.stars); setComment(mine.comment ?? ""); }
  }, [mine]);

  async function submit() {
    if (!stars || busy) return;
    setBusy(true);
    try {
      await rateContent(itemId, uid, name, stars, comment, !!mine, mine?.at);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      alert("التقييم متاح لمن اشترى هذا المحتوى.");
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || stars;

  return (
    <BottomSheet open={open} onClose={onClose} title={itemTitle} maxHeight="86vh">
      <div className="pb-2">
        {count > 0 && (
          <p className="text-center text-sm font-bold text-amber-600">
            {visible ? `${avg.toFixed(1)} من 5 — ${count} تقييم` : `${count} تقييم (المتوسّط يظهر بعد ${MIN_CONTENT_RATINGS})`}
          </p>
        )}

        {bought === false ? (
          <div className="mt-3 rounded-2xl border border-border bg-background p-4 text-center">
            <FontAwesomeIcon icon={faLock} className="h-5 w-5 text-text-muted" />
            <p className="mt-2 text-sm font-bold text-text-primary">التقييم متاح لمن اشترى هذا المحتوى.</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              هذا يضمن أن التقييمات تأتي ممّن استعمل الملف فعلاً.
            </p>
          </div>
        ) : bought === null ? (
          <p className="py-6 text-center text-sm text-text-muted">جارٍ التحقّق...</p>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
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

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              dir="auto"
              placeholder="هل أفادك هذا الملخّص؟ ما الذي أعجبك أو نقصه؟"
              className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
            />

            <button
              onClick={submit}
              disabled={!stars || busy || done}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={done ? faCheck : faStar} className="h-4 w-4" />
              {done ? "شكراً لك ✓" : busy ? "..." : mine ? "تحديث تقييمي" : "إرسال التقييم"}
            </button>
          </>
        )}

        {/* التعليقات */}
        {list.length > 0 && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="mb-2 text-xs font-bold text-text-muted">آراء المشترين</p>
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.uid} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">{r.name}</span>
                    <span className="shrink-0 text-[11px] font-bold text-amber-600">
                      {"★".repeat(r.stars)}<span className="text-text-muted">{"★".repeat(5 - r.stars)}</span>
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => { if (confirm("حذف هذا التقييم؟")) deleteContentRating(itemId, r.uid); }}
                        aria-label="حذف"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded text-text-muted hover:text-danger"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-sm leading-relaxed text-text-primary" dir="auto">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
