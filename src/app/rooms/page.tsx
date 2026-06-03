"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUsers, faLock, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listPublicRooms, type Room } from "@/features/rooms/rooms";
import { CreateRoomDialog } from "@/features/rooms/create-room-dialog";
import { Button } from "@/components/ui/field";

export default function RoomsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) listPublicRooms().then((r) => { setRooms(r); setFetching(false); });
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <main className="min-h-screen">
      <header className="bz-glass sticky top-0 z-40 flex items-center justify-between px-5 py-3">
        <Link href="/home" className="font-display text-xl font-extrabold">
          BacZone <span className="bz-gradient-text">DZ</span>
        </Link>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          غرفة جديدة
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold">غرف الدراسة العامة</h1>
        <p className="mt-1 text-sm text-text-muted">انضمّ لغرفة موجودة أو أنشئ غرفتك الخاصة.</p>

        {fetching ? (
          <p className="mt-8 text-text-muted">جارٍ تحميل الغرف...</p>
        ) : rooms.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-text-muted">لا توجد غرف عامة بعد. كن أول من ينشئ غرفة!</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4">
              إنشاء أول غرفة
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
                    <FontAwesomeIcon
                      icon={r.type === "public" ? faUsers : faLock}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="font-bold">{r.name}</span>
                  </div>
                  <span className="mt-1 block text-xs text-text-muted">
                    أنشأها {r.ownerName}
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
    </main>
  );
}
