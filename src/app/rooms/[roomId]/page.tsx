"use client";

import { useEffect, useRef, useState } from "react";
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
  faHand,
  faUsers,
  faCrown,
  faUserShield,
  faUserSlash,
  faBan,
  faUnlock,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { ref, onValue, set, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoom, type Room, promoteToMod, demoteMod, kickUser, banUser, unbanUser, listenMods, listenKicked, listenBanned } from "@/features/rooms/rooms";
import { usePresence } from "@/features/rooms/use-presence";
import { useActiveTool, type RoomTool } from "@/features/rooms/use-active-tool";
import { ChatPanel } from "@/features/chat/chat-panel";
import { VideoSync } from "@/features/video/video-sync";
import { Whiteboard } from "@/features/whiteboard/whiteboard";
import { RoomVoiceBar } from "@/features/voice/room-voice-bar";
import { RoomFiles } from "@/features/rooms/room-files";
import { playHandRaiseSound } from "@/lib/sound";

const TOOLS: { id: RoomTool; label: string; icon: typeof faHouse }[] = [
  { id: "welcome", label: "مرحباً", icon: faHouse },
  { id: "video", label: "فيديو", icon: faVideo },
  { id: "whiteboard", label: "سبورة", icon: faChalkboard },
  { id: "files", label: "ملفات", icon: faFolderOpen },
];

interface Hand {
  uid: string;
  name: string;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [handsOpen, setHandsOpen] = useState(false);
  const [hands, setHands] = useState<Hand[]>([]);
  const [myHand, setMyHand] = useState(false);
  const prevHands = useRef(0);

  const members = usePresence(roomId, user?.uid, user?.displayName ?? undefined);
  const isOwner = !!room && !!user && room.ownerId === user.uid;
  const { tool, setTool } = useActiveTool(roomId, isOwner);

  const [mods, setMods] = useState<Set<string>>(new Set());
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [showParticipants, setShowParticipants] = useState(false);
  const isMod = user ? mods.has(user.uid) : false;
  const isPrivileged = isOwner || isMod;

  // الاستماع للمشرفين والمحظورين
  useEffect(() => listenMods(roomId, setMods), [roomId]);
  useEffect(() => listenBanned(roomId, setBanned), [roomId]);

  // إذا طُرد المستخدم الحالي — يغادر تلقائياً
  useEffect(() => {
    if (!user) return;
    return listenKicked(roomId, user.uid, (kicked) => {
      if (kicked) router.replace("/rooms");
    });
  }, [roomId, user, router]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    getRoom(roomId).then((r) => (r ? setRoom(r) : setNotFound(true)));
  }, [roomId]);

  // رفع اليد + إشعار صوتي للمالك
  useEffect(() => {
    const r = ref(rtdb, `roomLive/${roomId}/hands`);
    const unsub = onValue(r, (snap) => {
      const val = (snap.val() as Record<string, { name: string }>) ?? {};
      const list = Object.entries(val).map(([uid, v]) => ({ uid, name: v.name }));
      setHands(list);
      setMyHand(!!(user && val[user.uid]));
      if (isOwner && list.length > prevHands.current) playHandRaiseSound();
      prevHands.current = list.length;
    });
    return () => unsub();
  }, [roomId, isOwner, user]);

  function toggleHand() {
    if (!user) return;
    const r = ref(rtdb, `roomLive/${roomId}/hands/${user.uid}`);
    if (myHand) remove(r);
    else set(r, { name: user.displayName || "طالب", ts: Date.now() });
  }

  function lowerHand(uid: string) {
    remove(ref(rtdb, `roomLive/${roomId}/hands/${uid}`));
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (notFound) return <div className="p-10 text-center text-text-muted">الغرفة غير موجودة.</div>;

  const currentLabel = TOOLS.find((t) => t.id === tool)?.label ?? "";

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

        <div className="flex items-center gap-2">
          {/* رفع اليد: للطلاب */}
          {!isOwner && (
            <button
              onClick={toggleHand}
              aria-label="رفع اليد"
              className={`grid h-10 w-10 place-items-center rounded-md ${
                myHand ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary"
              }`}
            >
              <FontAwesomeIcon icon={faHand} className="h-5 w-5" />
            </button>
          )}

          {/* الأيدي المرفوعة: للمالك */}
          {isPrivileged && (
            <button
              onClick={() => setShowParticipants((s) => !s)}
              title="المشاركون"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-primary/10 hover:text-primary"
            >
              <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
              <span className="hidden sm:inline">المشاركون</span>
              <span className="text-xs font-bold text-primary">{members.length}</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setHandsOpen((o) => !o)}
              aria-label="الأيدي المرفوعة"
              className={`relative grid h-10 w-10 place-items-center rounded-md ${
                hands.length ? "bg-warning/20 text-warning" : "bg-primary/10 text-text-muted"
              }`}
            >
              <FontAwesomeIcon icon={faHand} className="h-5 w-5" />
              {hands.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {hands.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setChatOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary lg:hidden"
            aria-label="الدردشة"
          >
            <FontAwesomeIcon icon={faComments} className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* قائمة الأيدي المرفوعة (للمالك) */}
      {isOwner && handsOpen && hands.length > 0 && (
        <div className="border-b border-border bg-surface px-4 py-2">
          <span className="text-xs font-bold text-text-muted">طلاب رفعوا أيديهم:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {hands.map((h) => (
              <button
                key={h.uid}
                onClick={() => lowerHand(h.uid)}
                className="flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-sm text-warning"
              >
                <FontAwesomeIcon icon={faHand} className="h-3 w-3" />
                {h.name} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الأدوات: المالك يتحكّم، الطالب يرى الأداة الحالية فقط */}
      {isOwner ? (
        <nav className="flex gap-1 border-b border-border px-3 py-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                tool === t.id ? "bg-gradient-primary text-white" : "text-text-muted hover:bg-primary/10"
              }`}
            >
              <FontAwesomeIcon icon={t.icon} className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      ) : (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-primary" />
          يعرض المعلّم الآن: <span className="font-bold text-text-primary">{currentLabel}</span>
        </div>
      )}

      {/* المحتوى + الدردشة */}
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col overflow-hidden">
          {tool === "welcome" && (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <FontAwesomeIcon icon={faHouse} className="h-10 w-10 text-primary" />
                <h2 className="mt-4 font-display text-xl font-extrabold">أهلاً بك في الغرفة</h2>
                <p className="mt-2 max-w-sm text-sm text-text-muted">
                  {isOwner
                    ? "اختر أداة من الأعلى (فيديو/سبورة) لتظهر لكل الطلاب. والصوت متاح دائماً في الأسفل."
                    : "ينتظر الجميع أن يبدأ المعلّم. الصوت والدردشة متاحان الآن."}
                </p>
              </div>
            </div>
          )}

          {tool === "video" && <VideoSync roomId={roomId} isOwner={isOwner} />}
          {tool === "whiteboard" && <Whiteboard roomId={roomId} canDraw={isOwner} />}

          {tool === "files" && <RoomFiles roomId={roomId} isOwner={isOwner} />}
        </section>

        <aside className="hidden w-96 border-r border-border lg:block">
          <ChatPanel roomId={roomId} />
        </aside>
      </div>

      {/* الشريط الصوتي الدائم (يبقى في كل الأدوات) */}
      <RoomVoiceBar roomId={roomId} isOwner={isOwner} />

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
      {/* درج المشاركين — للمالك والمشرف */}
      {showParticipants && isPrivileged && (
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setShowParticipants(false)}>
          <div
            className="absolute left-0 top-0 flex h-full w-full max-w-xs flex-col bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-bold">المشاركون ({members.length})</span>
              <button onClick={() => setShowParticipants(false)} className="text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {members.map((m) => {
                const isMe = m.uid === user?.uid;
                const memberIsOwner = m.uid === room?.ownerId;
                const memberIsMod = mods.has(m.uid);
                const memberIsBanned = banned.has(m.uid);
                return (
                  <div key={m.uid} className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                      {(m.name || "ط").charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.name || "طالب"}{isMe && " (أنا)"}</span>
                      <span className={`text-xs font-bold ${memberIsOwner ? "text-warning" : memberIsMod ? "text-primary" : "text-text-muted"}`}>
                        {memberIsOwner ? "👑 مالك" : memberIsMod ? "🛡️ مشرف" : "طالب"}
                      </span>
                    </div>
                    {!isMe && !memberIsOwner && (
                      <div className="flex gap-1">
                        {isOwner && (
                          <button
                            title={memberIsMod ? "إلغاء الترقية" : "ترقية إلى مشرف"}
                            onClick={() => memberIsMod ? demoteMod(roomId, m.uid) : promoteToMod(roomId, m.uid)}
                            className={`grid h-8 w-8 place-items-center rounded-md text-xs ${memberIsMod ? "bg-primary/10 text-primary" : "hover:bg-primary/10 text-text-muted hover:text-primary"}`}
                          >
                            <FontAwesomeIcon icon={memberIsMod ? faCircleCheck : faUserShield} className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="طرد مؤقّت"
                          onClick={() => kickUser(roomId, m.uid)}
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-warning/10 hover:text-warning"
                        >
                          <FontAwesomeIcon icon={faUserSlash} className="h-3.5 w-3.5" />
                        </button>
                        {isOwner && (
                          <button
                            title={memberIsBanned ? "فك الحظر" : "حظر دائم"}
                            onClick={() => memberIsBanned ? unbanUser(roomId, m.uid) : banUser(roomId, m.uid)}
                            className={`grid h-8 w-8 place-items-center rounded-md ${memberIsBanned ? "bg-secondary/10 text-secondary hover:bg-secondary/20" : "text-text-muted hover:bg-danger/10 hover:text-danger"}`}
                          >
                            <FontAwesomeIcon icon={memberIsBanned ? faUnlock : faBan} className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* قائمة المحظورين */}
            {isOwner && banned.size > 0 && (
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs font-bold text-danger">محظورون ({banned.size})</p>
                {[...banned].map((uid) => (
                  <div key={uid} className="mb-1 flex items-center justify-between gap-2 rounded-md bg-danger/5 px-3 py-2 text-sm">
                    <span className="truncate text-xs text-text-muted">{uid.slice(0, 12)}...</span>
                    <button
                      onClick={() => unbanUser(roomId, uid)}
                      className="flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-xs font-bold text-secondary hover:bg-secondary/20"
                    >
                      <FontAwesomeIcon icon={faUnlock} className="h-3 w-3" /> فك الحظر
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
