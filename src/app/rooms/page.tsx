"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faUsers,
  faArrowRight,
  faCircle,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listLiveRooms, findRoomByName, type LiveRoom } from "@/features/rooms/rooms";
import { CreateRoomDialog } from "@/features/rooms/create-room-dialog";
import { AppShell } from "@/components/app-shell";
import { Input, Button } from "@/components/ui/field";

export default function RoomsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () =>
      listLiveRooms().then((r) => {
        if (active) {
          setRooms(r);
          setFetching(false);
        }
      });
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [user]);

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
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            غرفة جديدة
          </Button>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          تظهر هنا الغرف العامة التي بها طلاب متصلون خلال آخر 5 دقائق فقط.
        </p>

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
        ) : rooms.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-text-muted">لا توجد غرف نشطة الآن. أنشئ غرفة وكن أول من يبدأ!</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4">
              إنشاء غرفة
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <Link
                key={r.id}
                href={`/rooms/${r.id}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-glass"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-primary" />
                    <span className="font-bold">{r.name}</span>
                  </div>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
                    <FontAwesomeIcon icon={faCircle} className="h-2 w-2 animate-pulse" />
                    {r.activeCount} متصل الآن · أنشأها {r.ownerName}
                  </span>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-4 w-4 -scale-x-100 text-text-muted transition group-hover:text-primary"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {showCreate && <CreateRoomDialog onClose={() => setShowCreate(false)} />}
    </AppShell>
  );
}
