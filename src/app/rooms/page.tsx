"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentRatingBadge } from "@/features/community/content-rating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faUsers,
  faArrowRight,
  faCircle,
  faRightToBracket,
  faRotate,
  faCalendarPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listLiveRooms, findRoomByName, type LiveRoom } from "@/features/rooms/rooms";
import { CreateRoomDialog, ROOM_SUBJECTS } from "@/features/rooms/create-room-dialog";
import { ScheduleSessionDialog } from "@/features/rooms/schedule-session-dialog";
import { UpcomingSessions } from "@/features/rooms/upcoming-sessions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/field";
import { loginHrefFor } from "@/features/auth/use-require-auth";

export default function RoomsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  const loadRooms = useCallback(async () => {
    const r = await listLiveRooms();
    setRooms(r);
    setFetching(false);
  }, []);

  async function manualRefresh() {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!user) return;
    loadRooms();
    const t = setInterval(loadRooms, 30000);
    return () => clearInterval(t);
  }, [user, loadRooms]);

  async function handleJoinByName() {
    if (!joinName.trim()) return;
    setJoining(true);
    setJoinMsg("");
    const room = await findRoomByName(joinName);
    if (room) {
      router.push(`/rooms/${room.id}`);
    } else {
      setJoinMsg("لا توجد غرفة بهذا الاسم.");
      setJoining(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
        {/* ── الرأس: عنوان، وملخّص حيّ من البيانات نفسها، وأفعال ── */}
        <header className="bz-rooms-head">
          <div className="min-w-0">
            <h1 className="bz-rooms-h1">الغرف النشطة الآن</h1>
            <p className="bz-rooms-summary">
              {fetching ? (
                "نبحث عن الغرف المفتوحة…"
              ) : rooms.length === 0 ? (
                "لا غرفة مفتوحة في هذه اللحظة"
              ) : (
                <>
                  <span className="bz-rooms-pulse" aria-hidden="true" />
                  {rooms.length === 1 ? "غرفة واحدة" : `${rooms.length} غرف`}
                  {" · "}
                  {rooms.reduce((n, r) => n + (r.activeCount ?? 0), 0)} يراجعون الآن
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={manualRefresh}
              aria-label="تحديث القائمة"
              title="تحديث القائمة"
              className="bz-icon-btn"
            >
              <FontAwesomeIcon icon={faRotate} className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Button onClick={() => setShowSchedule(true)} variant="ghost" className="flex items-center gap-2 px-3 sm:px-4">
              <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4" />
              <span className="hidden sm:inline">جدولة جلسة</span>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 sm:px-4">
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              <span className="hidden sm:inline">غرفة جديدة</span>
              <span className="sm:hidden">جديدة</span>
            </Button>
          </div>
        </header>

        {/* الجلسات القادمة */}
        <UpcomingSessions />

        {/* ── الانضمام بالاسم ── حقلٌ واحد بلا صندوق حوله */}
        <div className="bz-joinbar">
          <FontAwesomeIcon icon={faRightToBracket} className="bz-joinbar-icon h-4 w-4 -scale-x-100" />
          <input
            value={joinName}
            onChange={(e) => {
              setJoinName(e.target.value);
              setJoinMsg("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoinByName()}
            placeholder="ادخل غرفة خاصّة باسمها…"
            aria-label="اسم الغرفة"
          />
          <Button
            onClick={handleJoinByName}
            loading={joining}
            disabled={!joinName.trim()}
            className="shrink-0 px-4"
          >
            ادخل
          </Button>
        </div>
        {joinMsg ? (
          <p className="mt-2 px-1 text-[12.5px] text-danger">{joinMsg} تأكّد من كتابة الاسم كما هو تماماً.</p>
        ) : (
          <p className="mt-2 px-1 text-[12px] text-text-muted">الغرف العامّة تظهر أسفله. الخاصّة وغرف الأساتذة تُدخل باسمها.</p>
        )}

        {fetching ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="bz-roomcard bz-roomcard--skel" />)}
          </div>
        ) : (
          <>
            {/* فلتر المواد */}
            {rooms.length > 0 && (
              <div className="bz-subject-filter" role="tablist" aria-label="تصفية حسب المادة">
                {[{ id: "", label: "الكل" }, ...ROOM_SUBJECTS.filter((s) => s.id)].map((s) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={subjectFilter === s.id}
                    onClick={() => setSubjectFilter(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* قائمة الغرف */}
            {(() => {
              const filtered = subjectFilter
                ? rooms.filter((r) => r.subject === subjectFilter)
                : rooms;
              return filtered.length === 0 ? (
                <div className="bz-rooms-empty">
                  <span className="bz-room-mark" aria-hidden="true">
                    <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                  </span>
                  <h2>
                    {rooms.length === 0
                      ? "افتح أوّل غرفة اليوم"
                      : `لا أحد يراجع «${ROOM_SUBJECTS.find((s) => s.id === subjectFilter)?.label}» الآن`}
                  </h2>
                  <p>
                    {rooms.length === 0
                      ? "أنشئ غرفة لمادّتك، وأرسل رابطها لزملائك، وراجعوا معاً بالصوت والسبورة."
                      : "أنشئ غرفة لهذه المادّة وسيجدها من يبحث عنها."}
                  </p>
                  <Button onClick={() => setShowCreate(true)} className="mt-4">أنشئ غرفة</Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {filtered.map((r) => (
                    <Link key={r.id} href={`/rooms/${r.id}`} className="bz-roomcard group">
                      <span className="bz-room-mark" aria-hidden="true">{r.name?.charAt(0) || "غ"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="bz-roomcard-title">{r.name}</span>
                        <span className="bz-roomcard-meta">
                          {r.subject && (
                            <span className="bz-roomcard-subject">
                              {ROOM_SUBJECTS.find((s) => s.id === r.subject)?.label ?? r.subject}
                            </span>
                          )}
                          <span className="truncate">{r.ownerName}</span>
                          {r.isPaid && <span className="bz-roomcard-paid">{r.price} دج</span>}
                          {r.isPaid && <ContentRatingBadge itemId={r.id} showEmpty />}
                        </span>
                      </span>
                      <span className="bz-roomcard-live" title={`${r.activeCount} متصل الآن`}>
                        <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5" />
                        {r.activeCount}
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="bz-roomcard-go h-3.5 w-3.5 -scale-x-100" />
                    </Link>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </section>

      {showCreate && <CreateRoomDialog onClose={() => setShowCreate(false)} />}
      {showSchedule && <ScheduleSessionDialog onClose={() => setShowSchedule(false)} />}
    </AppShell>
  );
}
