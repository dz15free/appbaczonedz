"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Input, Button } from "@/components/ui/field";

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
    if (!loading && !user) router.replace("/login");
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
      <section className="mx-auto max-w-4xl px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold">الغرف النشطة الآن</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={manualRefresh}
              aria-label="تحديث"
              className="grid h-10 w-10 place-items-center rounded-md border border-border bg-surface text-text-muted transition hover:text-primary"
            >
              <FontAwesomeIcon icon={faRotate} className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Button onClick={() => setShowSchedule(true)} variant="ghost" className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4" />
              <span className="hidden sm:inline">جدولة جلسة</span>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              غرفة جديدة
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          تظهر هنا الغرف العامة التي بها طالب متصل خلال آخر دقيقة. اضغط التحديث للبحث عن الجديد.
        </p>

        {/* الجلسات القادمة */}
        <UpcomingSessions />

        {/* الانضمام بكتابة اسم الغرفة */}
        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <span className="mb-2 block text-sm font-semibold">الانضمام بالاسم (يشمل الغرف الخاصة وغرف الأستاذ)</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={joinName}
              onChange={(e) => {
                setJoinName(e.target.value);
                setJoinMsg("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinByName()}
              placeholder="اكتب اسم الغرفة بالضبط..."
              className="flex-1"
            />
            <Button
              onClick={handleJoinByName}
              loading={joining}
              disabled={!joinName.trim()}
              className="flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4 -scale-x-100" />
              انضمام
            </Button>
          </div>
          {joinMsg && <p className="mt-2 text-sm text-danger">{joinMsg}</p>}
        </div>

        {fetching ? (
          <p className="mt-8 text-text-muted">جارٍ تحميل الغرف...</p>
        ) : (
          <>
            {/* فلتر المواد */}
            {rooms.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {[{ id: "", label: "الكل" }, ...ROOM_SUBJECTS.filter((s) => s.id)].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectFilter(s.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      subjectFilter === s.id
                        ? "bg-gradient-primary text-white"
                        : "border border-border text-text-muted hover:border-primary hover:text-primary"
                    }`}
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
                <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
                  <p className="text-text-muted">
                    {rooms.length === 0
                      ? "لا توجد غرف نشطة الآن. أنشئ غرفة وكن أول من يبدأ!"
                      : `لا غرف نشطة لمادة «${ROOM_SUBJECTS.find((s) => s.id === subjectFilter)?.label}» الآن.`}
                  </p>
                  <Button onClick={() => setShowCreate(true)} className="mt-4">إنشاء غرفة</Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {filtered.map((r) => (
                    <Link
                      key={r.id}
                      href={`/rooms/${r.id}`}
                      className="group flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-glass"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-primary" />
                          <span className="font-bold">{r.name}</span>
                          {r.subject && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {ROOM_SUBJECTS.find((s) => s.id === r.subject)?.label ?? r.subject}
                            </span>
                          )}
                        </div>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
                          <FontAwesomeIcon icon={faCircle} className="h-2 w-2 animate-pulse" />
                          {r.activeCount} متصل الآن · {r.ownerName}
                        </span>
                      </div>
                      <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 -scale-x-100 text-text-muted transition group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </section>

      {showCreate && <CreateRoomDialog onClose={() => setShowCreate(false)} />}
    </AppShell>
  );
}
