"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faVideo,
  faChalkboard,
  faFolderOpen,
  faComments,
  faArrowRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoom, type Room } from "@/features/rooms/rooms";
import { usePresence } from "@/features/rooms/use-presence";
import { ChatPanel } from "@/features/chat/chat-panel";
import { VideoSync } from "@/features/video/video-sync";
import { Whiteboard } from "@/features/whiteboard/whiteboard";

const TOOLS = [
  { id: "welcome", label: "مرحباً", icon: faHouse, ready: true },
  { id: "video", label: "فيديو", icon: faVideo, ready: true },
  { id: "whiteboard", label: "سبورة", icon: faChalkboard, ready: true },
  { id: "files", label: "ملفات", icon: faFolderOpen, ready: false },
];

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tool, setTool] = useState("welcome");
  const [chatOpen, setChatOpen] = useState(false);

  const members = usePresence(roomId, user?.uid, user?.displayName ?? undefined);
  const isOwner = !!room && !!user && room.ownerId === user.uid;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    getRoom(roomId).then((r) => (r ? setRoom(r) : setNotFound(true)));
  }, [roomId]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (notFound) return <div className="p-10 text-center text-text-muted">الغرفة غير موجودة.</div>;

  return (
    <main className="flex h-[100dvh] flex-col">
      {/* الشريط العلوي */}
      <header className="bz-glass flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/rooms")} aria-label="رجوع" className="text-text-muted">
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold leading-tight">{room?.name ?? "..."}</h1>
            <span className="text-xs text-text-muted">{members.length} متصل الآن</span>
          </div>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary lg:hidden"
          aria-label="الدردشة"
        >
          <FontAwesomeIcon icon={faComments} className="h-5 w-5" />
        </button>
      </header>

      {/* أشرطة الأدوات */}
      <nav className="flex gap-1 border-b border-border px-3 py-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => t.ready && setTool(t.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              tool === t.id ? "bg-gradient-primary text-white" : "text-text-muted hover:bg-primary/10"
            } ${!t.ready && "cursor-not-allowed opacity-50"}`}
          >
            <FontAwesomeIcon icon={t.icon} className="h-4 w-4" />
            {t.label}
            {!t.ready && <span className="text-[10px]">قريباً</span>}
          </button>
        ))}
      </nav>

      {/* المحتوى + الدردشة */}
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col overflow-hidden">
          {tool === "welcome" && (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <FontAwesomeIcon icon={faHouse} className="h-10 w-10 text-primary" />
                <h2 className="mt-4 font-display text-xl font-extrabold">أهلاً بك في الغرفة</h2>
                <p className="mt-2 max-w-sm text-sm text-text-muted">
                  جرّب تبويب «فيديو» للمشاهدة الجماعية المتزامنة. السبورة والصوت قادمان قريباً.
                  الدردشة والحضور يعملان الآن.
                </p>
              </div>
            </div>
          )}

          {tool === "video" && <VideoSync roomId={roomId} isOwner={isOwner} />}

          {tool === "whiteboard" && <Whiteboard roomId={roomId} />}

          {tool === "files" && (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-text-muted">
              هذه الأداة قيد البناء في الخطوة القادمة.
            </div>
          )}
        </section>

        {/* الدردشة: جانبية على الحاسوب، درج على الجوال */}
        <aside className="hidden w-96 border-r border-border lg:block">
          <ChatPanel roomId={roomId} />
        </aside>
      </div>

      {/* درج الدردشة على الجوال */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-surface lg:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-bold">الدردشة</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="إغلاق الدردشة"
              className="grid h-11 w-11 place-items-center rounded-md text-text-muted active:bg-primary/10"
            >
              <FontAwesomeIcon icon={faXmark} className="pointer-events-none h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel roomId={roomId} />
          </div>
        </div>
      )}
    </main>
  );
}
