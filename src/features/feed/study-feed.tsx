"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faBolt, faArrowLeft, faSeedling } from "@fortawesome/free-solid-svg-icons";
import { useFeed, listenMyFeedProgress, rankFeed, type FeedItem, type FeedProgress } from "@/features/feed/feed";
import { FeedCard } from "@/features/feed/feed-cards";
import { LiveRoomCard, useTopLiveRoom } from "@/features/rooms/room-discovery";

/* ════════════════════════════════════════════════════════════
   التغذية الدراسية — الحاوية

   طبقة فوق المجتمع لا بديل عنه: المنشورات تبقى تحتها كما هي. وما
   يميّزها أنّها **أفعال** لا نصوص — فلها إطارها ولونها وترتيبها.

   بطاقة الغرفة الحيّة تُحقن **مرّة واحدة** بعد العنصر الثالث. خمس
   بطاقات غرف متتالية تُحوّل التغذية إلى إعلان، وهو أسرع طريق لأن
   يتجاهلها الطالب كلّها.

   العرض تدريجي: ستّة عناصر ثمّ «المزيد». تحميل ثمانين بطاقة دفعةً
   على هاتف بشبكة ٣G ليس تجربة تمرير، بل انتظار.
════════════════════════════════════════════════════════════ */

const PAGE = 6;

export function StudyFeed({
  uid, track, subject, limit, compact, showHeader = true,
}: {
  uid?: string;
  track?: string | null;
  subject?: string | null;
  /** سقف ثابت (الرئيسية) — بلا زرّ «المزيد» */
  limit?: number;
  compact?: boolean;
  showHeader?: boolean;
}) {
  const items = useFeed();
  const [progress, setProgress] = useState<Record<string, FeedProgress>>({});
  const [shown, setShown] = useState(limit ?? PAGE);
  const [gained, setGained] = useState(0);
  const liveRoom = useTopLiveRoom(track, subject);

  useEffect(() => {
    if (!uid) { setProgress({}); return; }
    const unsub = listenMyFeedProgress(uid, setProgress);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  const ranked = useMemo(
    () => (items ? rankFeed(items, { track, subject }) : []),
    [items, track, subject],
  );

  if (items === null) {
    return (
      <section className={compact ? "" : "space-y-3"}>
        {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />)}
      </section>
    );
  }

  // لا قسم فارغ: بلا محتوى ولا غرفة حيّة لا نعرض شيئاً
  if (!ranked.length && !liveRoom) return null;

  const visible = ranked.slice(0, shown);
  const hasMore = !limit && ranked.length > shown;

  return (
    <section className="space-y-3">
      {showHeader && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-text-primary sm:text-xl">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white">
                <FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4" />
              </span>
              مساحة الدراسة
            </h2>
            <p className="mt-0.5 text-[12px] text-text-muted">
              {track ? "محتوى مختار لشعبتك — أجب، راجع، واكسب نقاطاً." : "محتوى دراسي مختار — أجب، راجع، واكسب نقاطاً."}
            </p>
          </div>
          {gained > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 py-1.5 text-[12px] font-extrabold text-amber-600">
              <FontAwesomeIcon icon={faBolt} className="h-3 w-3" /> +{gained} نقطة اليوم
            </span>
          )}
        </div>
      )}

      {visible.map((item, i) => (
        <div key={item.id} className="space-y-3">
          <FeedCard
            item={item}
            uid={uid}
            track={track}
            progress={progress[item.id] ?? null}
            onDone={(xp) => setGained((g) => g + xp)}
          />
          {/* غرفة حيّة واحدة في وسط التغذية — لا تتكرّر */}
          {i === 2 && liveRoom && <LiveRoomCard room={liveRoom} uid={uid} track={track} />}
        </div>
      ))}

      {/* إن كان المحتوى أقلّ من ثلاثة، تظهر الغرفة بعده */}
      {visible.length > 0 && visible.length <= 2 && liveRoom && (
        <LiveRoomCard room={liveRoom} uid={uid} track={track} />
      )}
      {visible.length === 0 && liveRoom && <LiveRoomCard room={liveRoom} uid={uid} track={track} />}

      {hasMore && (
        <button
          onClick={() => setShown((s) => s + PAGE)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-[13px] font-extrabold text-primary transition hover:border-primary hover:bg-primary/5"
        >
          محتوى دراسي إضافي <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        </button>
      )}

      {limit && ranked.length > limit && (
        <Link href="/community"
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-[13px] font-extrabold text-primary transition hover:border-primary hover:bg-primary/5">
          تابع مساحة الدراسة <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}

/** حالة فراغ لطيفة — تُعرض في المجتمع حين لا محتوى بعد */
export function StudyFeedEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <FontAwesomeIcon icon={faSeedling} className="h-8 w-8 text-text-muted opacity-25" />
      <p className="mt-2 text-[13px] font-bold text-text-primary">لا محتوى دراسي بعد</p>
      <p className="mt-1 text-[11.5px] text-text-muted">تنشر الإدارة أسئلة وبطاقات وتحدّيات مناسبة لشعبتك.</p>
    </div>
  );
}
