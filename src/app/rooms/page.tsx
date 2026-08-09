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
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listLiveRooms, findRoomByName, type LiveRoom } from "@/features/rooms/rooms";
import { CreateRoomDialog, ROOM_SUBJECTS } from "@/features/rooms/create-room-dialog";
import { ScheduleSessionDialog } from "@/features/rooms/schedule-session-dialog";
import { UpcomingSessions } from "@/features/rooms/upcoming-sessions";
import { AppShell } from "@/components/app-shell";
import { Card, Badge, Chip, ChipRail, EmptyState, Skeleton, SkeletonList } from "@/components/ui/kit";
import { Input, Button } from "@/components/ui/field";
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

  /* التحميل داخل الغلاف: كان يُرجع نصّاً عارياً بلا هيدر ولا شريط سفلي. */
  if (loading || !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-5">
          <Skeleton className="h-10 w-2/3 rounded-control" />
          <SkeletonList count={3} lines={1} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[22px] font-extrabold leading-tight text-text-primary sm:text-2xl">الغرف النشطة الآن</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={manualRefresh}
              aria-label="تحديث"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-border bg-surface text-text-muted transition hover:border-primary/40 hover:text-primary"
            >
              <FontAwesomeIcon icon={faRotate} className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {/* التسميات كانت تختفي كلّياً تحت `sm` فيبقى زرّان بأيقونتين
                بلا أي نصّ على الهاتف — لا أحد يعرف أيّهما يفعل ماذا. */}
            <Button size="md" variant="ghost" onClick={() => setShowSchedule(true)}>
              <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4" /> جدولة
            </Button>
            <Button size="md" onClick={() => setShowCreate(true)}>
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" /> غرفة جديدة
            </Button>
          </div>
        </div>
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-text-muted">
          تظهر هنا الغرف العامّة التي بها طالب متّصل خلال آخر دقيقة — اضغط زرّ التحديث للبحث عن الجديد.
        </p>

        {/* الجلسات القادمة */}
        <UpcomingSessions />

        {/* الانضمام بكتابة اسم الغرفة */}
        <Card className="mt-4">
          <span className="mb-2 block text-[13px] font-extrabold text-text-primary">الانضمام بالاسم (يشمل الغرف الخاصّة وغرف الأستاذ)</span>
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
          {joinMsg && <p className="mt-2 text-[12.5px] font-bold text-danger">{joinMsg}</p>}
        </Card>

        {fetching ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SkeletonList count={4} lines={1} />
          </div>
        ) : (
          <>
            {/* فلتر المواد */}
            {rooms.length > 0 && (
              <div className="mt-5">
                <ChipRail>
                  {[{ id: "", label: "كلّ المواد" }, ...ROOM_SUBJECTS.filter((s) => s.id)].map((s) => (
                    <Chip key={s.id} active={subjectFilter === s.id} onClick={() => setSubjectFilter(s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </ChipRail>
              </div>
            )}

            {/* قائمة الغرف */}
            {(() => {
              const filtered = subjectFilter
                ? rooms.filter((r) => r.subject === subjectFilter)
                : rooms;
              return filtered.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    icon={faUsers}
                    title={rooms.length === 0 ? "لا غرف نشطة الآن" : `لا غرف نشطة في «${ROOM_SUBJECTS.find((s) => s.id === subjectFilter)?.label}»`}
                    hint={rooms.length === 0
                      ? "افتح غرفة وادعُ زملاءك — المراجعة الجماعية تُنجز أكثر ممّا تظنّ."
                      : "جرّب مادّة أخرى من الشريط، أو افتح غرفة لهذه المادّة بنفسك."}
                    action={<Button size="md" onClick={() => setShowCreate(true)}>إنشاء غرفة</Button>}
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {filtered.map((r) => (
                    /* بطاقة الغرفة كانت `rounded-lg p-4` بحدّ رماديّ مسطّح
                       — أضعف بطاقة في المنصّة، بينما تعرض الرئيسية
                       البطاقة الغنيّة نفسها للغرف. صفحة الغرف تستحقّ
                       على الأقلّ ما تعرضه الرئيسية. */
                    <Link key={r.id} href={`/rooms/${r.id}`} className="block">
                      <Card interactive className="h-full">
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-item bg-primary/10 text-primary">
                            <FontAwesomeIcon icon={faUsers} className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-extrabold text-text-primary">{r.name}</p>
                            <p className="mt-0.5 truncate text-[11.5px] font-semibold text-text-muted">
                              يديرها {r.ownerName}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1.5 rounded-chip bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600">
                            <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5 animate-pulse" />
                            {r.activeCount}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                          {r.subject && (
                            <Badge tone="brand">
                              {ROOM_SUBJECTS.find((s) => s.id === r.subject)?.label ?? r.subject}
                            </Badge>
                          )}
                          {r.isPaid
                            ? <Badge tone="warn" icon={faLock}>{r.price} دج</Badge>
                            : <Badge tone="success">مجّانية</Badge>}
                          {r.isPaid && <ContentRatingBadge itemId={r.id} showEmpty />}
                          <span className="ms-auto flex items-center gap-1 text-[12px] font-extrabold text-primary">
                            ادخل
                            <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3 -scale-x-100" />
                          </span>
                        </div>
                      </Card>
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
