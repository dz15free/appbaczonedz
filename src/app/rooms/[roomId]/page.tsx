"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse, faVideo, faChalkboard, faFolderOpen,
  faComments, faArrowRight, faXmark, faHand,
  faUsers, faUserShield, faUserSlash, faBan, faUnlock, faCircleCheck,
  faExpand, faCompress, faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import { ref, onValue, set, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import {
  getRoom, type Room,
  promoteToMod, demoteMod,
  kickUser, banUser, unbanUser,
  listenMods, listenKicked, listenBanned,
  listenPoll, type RoomPoll,
} from "@/features/rooms/rooms";
import { RoomPollPanel, CreatePollModal } from "@/features/rooms/room-poll";
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
  const [fullscreen, setFullscreen] = useState(false);
  const [activePoll, setActivePoll] = useState<RoomPoll | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const isMod = !!user && mods.has(user.uid);
  const isPrivileged = isOwner || isMod;

  useEffect(() => listenMods(roomId, setMods), [roomId]);
  useEffect(() => listenBanned(roomId, setBanned), [roomId]);
  useEffect(() => listenPoll(roomId, setActivePoll), [roomId]);
  useEffect(() => {
    if (!user) return;
    return listenKicked(roomId, user.uid, (kicked) => {
      if (kicked) router.replace("/rooms");
    });
  }, [roomId, user, router]);
  // Escape يُلغي الشاشة الكاملة
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

          {/* المشاركون: للمالك والمشرف */}
          {isPrivileged && (
            <button
              onClick={() => setShowParticipants((s) => !s)}
              aria-label="المشاركون"
              title="إدارة المشاركين"
              className={`relative grid h-10 w-10 place-items-center rounded-md ${showParticipants ? "bg-primary/20 text-primary" : "bg-primary/10 text-text-muted hover:text-primary"}`}
            >
              <FontAwesomeIcon icon={faUsers} className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">
                {members.length}
              </span>
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
        <nav className="flex items-center gap-1 border-b border-border px-3 py-2">
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
          {/* استفتاء سريع */}
          <button
            onClick={() => setShowCreatePoll(true)}
            title="إنشاء استفتاء سريع"
            className="mr-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={faChartBar} className="h-4 w-4" />
            <span className="hidden sm:inline">استفتاء</span>
          </button>
          {/* شاشة كاملة */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
            className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} className="h-4 w-4" />
          </button>
        </nav>
      ) : (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <div className="flex flex-1 items-center gap-2 text-sm text-text-muted">
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-primary" />
            يعرض المعلّم الآن: <span className="font-bold text-text-primary">{currentLabel}</span>
          </div>
          {/* شاشة كاملة للطالب أيضاً */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
            className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* المحتوى + الدردشة */}
      <div className="flex flex-1 overflow-hidden">
        <section className={`flex flex-col overflow-hidden transition-all ${
          fullscreen
            ? "fixed inset-0 z-[80] bg-background"
            : "flex-1"
        }`}>
          {/* زر الخروج من الشاشة الكاملة */}
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/60"
            >
              <FontAwesomeIcon icon={faCompress} className="h-4 w-4" />
              خروج
            </button>
          )}

          {/* الاستفتاء النشط يحلّ محلّ الأداة الحالية */}
          {activePoll?.open ? (
            <RoomPollPanel
              roomId={roomId}
              poll={activePoll}
              isOwner={isOwner}
              myUid={user?.uid ?? ""}
            />
          ) : (
            <>
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
            </>
          )}
        </section>

        <aside className="hidden w-96 border-r border-border lg:block">
          <ChatPanel roomId={roomId} isOwner={isOwner} />
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
            <ChatPanel roomId={roomId} isOwner={isOwner} />
          </div>
        </div>
      )}

      {/* نافذة إنشاء استفتاء */}
      {showCreatePoll && isOwner && (
        <CreatePollModal roomId={roomId} onClose={() => setShowCreatePoll(false)} />
      )}

      {/* لوحة إدارة المشاركين */}
      {showParticipants && isPrivileged && (
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setShowParticipants(false)}>
          <div
            className="absolute inset-y-0 left-0 flex w-80 max-w-full flex-col bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس اللوحة */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-bold">إدارة المشاركين ({members.length})</span>
              <button onClick={() => setShowParticipants(false)} className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            {/* قائمة المشاركين الحاليين */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {members.map((m) => {
                const isMe = m.uid === user?.uid;
                const memberIsOwner = m.uid === room?.ownerId;
                const memberIsMod = mods.has(m.uid);
                return (
                  <div key={m.uid} className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                      {(m.name || "ط").charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.name || "طالب"} {isMe && <span className="text-xs text-text-muted">(أنا)</span>}</p>
                      <p className={`text-xs font-bold ${memberIsOwner ? "text-warning" : memberIsMod ? "text-primary" : "text-text-muted"}`}>
                        {memberIsOwner ? "👑 مالك" : memberIsMod ? "🛡️ مشرف" : "طالب"}
                      </p>
                    </div>
                    {/* أزرار الإجراء — لا تظهر على النفس أو المالك */}
                    {!isMe && !memberIsOwner && (
                      <div className="flex items-center gap-1">
                        {/* ترقية / إلغاء ترقية — المالك فقط */}
                        {isOwner && (
                          <button
                            title={memberIsMod ? "إلغاء ترقية" : "ترقية إلى مشرف"}
                            onClick={() => memberIsMod ? demoteMod(roomId, m.uid) : promoteToMod(roomId, m.uid)}
                            className={`grid h-8 w-8 place-items-center rounded-md ${memberIsMod ? "bg-primary/15 text-primary" : "text-text-muted hover:bg-primary/10 hover:text-primary"}`}
                          >
                            <FontAwesomeIcon icon={memberIsMod ? faCircleCheck : faUserShield} className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* طرد مؤقّت — المالك والمشرف */}
                        <button
                          title="طرد مؤقّت"
                          onClick={() => kickUser(roomId, m.uid)}
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-warning/10 hover:text-warning"
                        >
                          <FontAwesomeIcon icon={faUserSlash} className="h-3.5 w-3.5" />
                        </button>
                        {/* حظر دائم — المالك فقط */}
                        {isOwner && (
                          <button
                            title="حظر دائم"
                            onClick={() => { if (confirm(`حظر ${m.name} نهائياً من الغرفة؟`)) banUser(roomId, m.uid); }}
                            className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
                          >
                            <FontAwesomeIcon icon={faBan} className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* قائمة المحظورين (للمالك) */}
            {isOwner && banned.size > 0 && (
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs font-bold text-danger">🚫 المحظورون ({banned.size})</p>
                <div className="space-y-1.5">
                  {[...banned].map((uid) => (
                    <div key={uid} className="flex items-center justify-between gap-2 rounded-md bg-danger/5 px-3 py-2">
                      <span className="truncate text-xs text-text-muted font-mono">{uid.slice(0, 14)}…</span>
                      <button
                        onClick={() => unbanUser(roomId, uid)}
                        className="flex shrink-0 items-center gap-1 rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary hover:bg-secondary/20"
                      >
                        <FontAwesomeIcon icon={faUnlock} className="h-3 w-3" />
                        فك الحظر
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
