"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse, faVideo, faChalkboard, faFolderOpen,
  faComments, faArrowRight, faXmark, faHand,
  faUsers, faUserShield, faUserSlash, faBan, faUnlock, faCircleCheck,
  faExpand, faCompress, faChartBar, faShareNodes,
  faNoteSticky, faClock,
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
import { RoomActivityToasts } from "@/features/rooms/room-activity-toasts";
import { RoomTimer } from "@/features/rooms/room-timer";
import { RoomNotes } from "@/features/rooms/room-notes";
import { usePresence } from "@/features/rooms/use-presence";
import { useActiveTool, type RoomTool } from "@/features/rooms/use-active-tool";
import { ChatPanel } from "@/features/chat/chat-panel";
import { FullscreenChatOverlay } from "@/features/chat/fullscreen-chat";
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
  { id: "notes", label: "ملاحظات", icon: faNoteSticky },
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

  // شاشة كاملة حقيقية (Fullscreen API) للحاسوب + CSS لـ iOS
  async function enterFullscreen() {
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // Safari
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
    } catch { /* iOS — يكتفي بـ CSS */ }
    setFullscreen(true);
  }
  async function exitFullscreen() {
    try {
      const doc = document as any;
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    } catch {}
    setFullscreen(false);
  }

  // قفل تمرير الصفحة بالكامل أثناء الشاشة الكاملة (يمنع ظهور المحتوى خلفها على iOS)
  useEffect(() => {
    if (fullscreen) {
      document.body.classList.add("bz-fullscreen-active");
    } else {
      document.body.classList.remove("bz-fullscreen-active");
    }
    return () => document.body.classList.remove("bz-fullscreen-active");
  }, [fullscreen]);

  // تتبّع ارتفاع الواجهة الفعلي (يتغيّر مع لوحة المفاتيح على iOS)
  useEffect(() => {
    if (!fullscreen) return;
    const vv = window.visualViewport;
    function update() {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--bz-vvh", `${h}px`);
    }
    update();
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--bz-vvh");
    };
  }, [fullscreen]);

  // مزامنة عند الخروج من الشاشة بـ ESC أو زر المتصفّح
  useEffect(() => {
    const onFSChange = () => {
      const doc = document as any;
      const active = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (!active) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("webkitfullscreenchange", onFSChange);
    };
  }, []);
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && fullscreen) exitFullscreen(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

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
    <main className="bz-studio flex h-[100dvh] flex-col">
      {/* الشريط العلوي */}
      <header className="bz-studio-bar relative z-20 flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => router.push("/rooms")}
            aria-label="رجوع"
            className="bz-studio-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          >
            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          </button>

          {/* شعار الغرفة */}
          <span className="bz-studio-glow grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold text-white sm:h-10 sm:w-10">
            {(room?.name ?? "").charAt(0) || "B"}
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight sm:text-base">{room?.name ?? "..."}</h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="bz-live-dot" />
              <span className="text-[11px] font-semibold" style={{ color: "var(--studio-dim)" }}>
                {members.length} متصل الآن
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* رفع اليد: للطلاب */}
          {!isOwner && (
            <button
              onClick={toggleHand}
              aria-label="رفع اليد"
              title="رفع اليد"
              className={`bz-studio-icon grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10 ${myHand ? "warn" : ""}`}
            >
              <FontAwesomeIcon icon={faHand} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
          )}

          {/* الأيدي المرفوعة: للمالك */}
          {isOwner && (
            <button
              onClick={() => setHandsOpen((o) => !o)}
              aria-label="الأيدي المرفوعة"
              title="الأيدي المرفوعة"
              className={`bz-studio-icon relative grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10 ${hands.length ? "warn" : ""}`}
            >
              <FontAwesomeIcon icon={faHand} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {hands.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-[var(--studio-panel)]">
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
              className={`bz-studio-icon relative grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10 ${showParticipants ? "on" : ""}`}
            >
              <FontAwesomeIcon icon={faUsers} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white ring-2 ring-[var(--studio-panel)]">
                {members.length}
              </span>
            </button>
          )}

          {/* الدردشة — جوال */}
          <button
            onClick={() => setChatOpen(true)}
            className="bz-studio-icon grid h-9 w-9 place-items-center rounded-xl lg:hidden sm:h-10 sm:w-10"
            aria-label="الدردشة"
          >
            <FontAwesomeIcon icon={faComments} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </header>

      {/* قائمة الأيدي المرفوعة (للمالك) */}
      {isOwner && handsOpen && hands.length > 0 && (
        <div className="bz-studio-bar border-b px-4 py-2.5">
          <span className="text-[11px] font-bold" style={{ color: "var(--studio-faint)" }}>
            طلاب رفعوا أيديهم
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {hands.map((h) => (
              <button
                key={h.uid}
                onClick={() => lowerHand(h.uid)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-amber-300"
                style={{ background: "rgba(251,191,36,0.12)" }}
              >
                <FontAwesomeIcon icon={faHand} className="h-3 w-3" />
                {h.name}
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الأدوات: المالك يتحكّم، الطالب يرى الأداة الحالية فقط */}
      {isOwner ? (
        <nav className="bz-studio-bar flex items-center gap-1.5 overflow-x-auto border-b px-2.5 py-2 sm:px-3">
          <div className="flex shrink-0 items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`bz-studio-tool flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tool === t.id ? "active" : ""
                }`}
              >
                <FontAwesomeIcon icon={t.icon} className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mx-1 h-6 w-px shrink-0" style={{ background: "var(--studio-border)" }} />

          {/* مؤقّت الدرس */}
          <RoomTimer roomId={roomId} isOwner={isOwner} />
          {/* استفتاء سريع */}
          <button
            onClick={() => setShowCreatePoll(true)}
            title="إنشاء استفتاء سريع"
            className="bz-studio-icon flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold"
          >
            <FontAwesomeIcon icon={faChartBar} className="h-4 w-4" />
            <span className="hidden sm:inline">استفتاء</span>
          </button>

          <div className="mr-auto" />

          {/* مشاركة الرابط */}
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard?.writeText(url).then(() => alert("✅ تم نسخ رابط الغرفة!")).catch(() => prompt("انسخ الرابط:", url));
            }}
            title="مشاركة الغرفة"
            className="bz-studio-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          >
            <FontAwesomeIcon icon={faShareNodes} className="h-4 w-4" />
          </button>
          {/* شاشة كاملة */}
          <button
            onClick={() => fullscreen ? exitFullscreen() : enterFullscreen()}
            title={fullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
            className="bz-studio-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          >
            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} className="h-4 w-4" />
          </button>
        </nav>
      ) : (
        <div className="bz-studio-bar flex items-center gap-2 border-b px-3 py-2 sm:px-4">
          <div className="bz-studio-chip flex flex-1 items-center gap-2 rounded-xl px-3 py-1.5 text-sm">
            <span className="bz-live-dot" />
            <span style={{ color: "var(--studio-faint)" }}>يعرض المعلّم الآن</span>
            <span className="font-bold" style={{ color: "var(--studio-text)" }}>{currentLabel}</span>
          </div>
          {/* شاشة كاملة للطالب أيضاً */}
          <button
            onClick={() => fullscreen ? exitFullscreen() : enterFullscreen()}
            title={fullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
            className="bz-studio-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          >
            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* المحتوى + الدردشة */}
      <div className="flex flex-1 overflow-hidden">
        <section
          className={`bz-studio-mesh relative flex flex-col overflow-hidden ${fullscreen ? "bz-fullscreen" : ""}`}
          style={fullscreen ? undefined : { flex: 1, overflow: "hidden" }}
        >
          {/* زر الخروج من الشاشة الكاملة */}
          {fullscreen && (
            <button
              onClick={exitFullscreen}
              className="bz-studio-icon absolute left-3 z-10 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold"
              style={{ top: "max(12px, env(safe-area-inset-top, 12px))" }}
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
                  <div className="max-w-sm">
                    <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center">
                      <span
                        className="absolute inset-0 rounded-2xl blur-xl"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #8b5cf6)", opacity: 0.45 }}
                      />
                      <span className="bz-studio-glow relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500">
                        <FontAwesomeIcon icon={faHouse} className="h-7 w-7 text-white" />
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-extrabold">أهلاً بك في الغرفة</h2>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--studio-dim)" }}>
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
              {tool === "notes" && <RoomNotes roomId={roomId} isOwner={isOwner} roomName={room?.name ?? "الغرفة"} />}
            </>
          )}
          {/* دردشة Fullscreen — تظهر فقط في وضع الشاشة الكاملة */}
          {fullscreen && (
            <FullscreenChatOverlay roomId={roomId} isOwner={isOwner} />
          )}

          {/* إشعارات الأنشطة المباشرة */}
          <RoomActivityToasts
            members={members}
            hands={hands}
            mods={mods}
            activePoll={activePoll}
            isOwner={isOwner}
            isMod={isMod}
            myUid={user?.uid}
          />
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
            className="absolute inset-y-0 left-0 flex w-80 max-w-full flex-col rounded-l-none rounded-r-2xl border-r border-border bg-surface shadow-2xl"
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
