"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ContentRatingBadge, ContentRatingSheet } from "@/features/community/content-rating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faVideo,
  faChalkboard,
  faFolderOpen,
  faXmark,
  faUnlock,
  faCircleCheck,
  faChartBar,
  faShareNodes,
  faNoteSticky,
  faSpinner,
  faLock,
  faKey,
  faBrain,
  faFileLines,
  faUserSecret,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { ref, onValue, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import {
  getRoom, type Room,
  promoteToMod, demoteMod,
  kickUser, banUser, unbanUser,
  listenMods, listenKicked, listenBanned,
  listenPoll, type RoomPoll,
  listenMessages,
  setOwnerStatus, listenOwnerStatus, type OwnerStatus,
} from "@/features/rooms/rooms";
import { RoomPollPanel, CreatePollModal } from "@/features/rooms/room-poll";
import { RoomActivityToasts } from "@/features/rooms/room-activity-toasts";
import { RoomTimerButton, RoomTimerDisplay } from "@/features/rooms/room-timer";
import { RoomNotes } from "@/features/rooms/room-notes";
import { ParticipantsPanel } from "@/features/rooms/participants-panel";
import { WaitingScreen } from "@/features/rooms/waiting-screen";
import type { RaisedHand } from "@/features/rooms/rooms";
import { usePresence } from "@/features/rooms/use-presence";
import { useActiveTool, type RoomTool } from "@/features/rooms/use-active-tool";
import { ChatPanel } from "@/features/chat/chat-panel";
import { RoomVoiceBar } from "@/features/voice/room-voice-bar";
import { playHandRaiseSound } from "@/lib/sound";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { listenHasAccess, redeemCode, createAccessCode } from "@/features/paid/paid-access";
import { sendAnonQuestion, listenAnonQuestions, markAnonAnswered, deleteAnonQuestion, type AnonQuestion } from "@/features/rooms/rooms";
import { saveFlashcard } from "@/features/study/save-flashcard";
import { StudentFocusMode } from "@/features/rooms/student-focus-mode";
import { TeacherFocusMode } from "@/features/rooms/teacher-focus-mode";
import { StudentChallengeLayer, CreateChallengeSheet, TeacherChallengePanel, useChallenge } from "@/features/rooms/room-challenge";
import { TeacherSummarySheet, SummaryViewerSheet, useSummaries } from "@/features/rooms/room-summary";
import { RateTeacherSheet } from "@/features/community/teacher-rating-ui";
import { SupportChatSheet } from "@/features/support/support-chat";
import { markAttendance } from "@/features/community/teacher-rating";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import dynamic from "next/dynamic";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import {
  WorkspaceBar, LiveBadge, BarButton, Segmented,
  IconRail, RailButton, RailDivider, RailSpacer, SideDock,
} from "@/components/ui/workspace";
import { useRoomState, ROOM_STATES } from "@/features/rooms/use-room-state";
import { FloatingAssistant } from "@/components/ui/floating-assistant";
import { StatusDot } from "@/components/ui/status-dot";
import { Icon } from "@/components/ui/icon";

// تحميل ديناميكي للأدوات الثقيلة (تقليل حجم الحزمة الأولية)
const loadingTool = () => (
  <div className="grid h-full place-items-center text-text-muted">
    <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
  </div>
);
const VideoSync = dynamic(() => import("@/features/video/video-sync").then((m) => m.VideoSync), { ssr: false, loading: loadingTool });
const Whiteboard = dynamic(() => import("@/features/whiteboard/whiteboard").then((m) => m.Whiteboard), { ssr: false, loading: loadingTool });
const RoomFiles = dynamic(() => import("@/features/rooms/room-files").then((m) => m.RoomFiles), { ssr: false, loading: loadingTool });


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

  // عدّاد الرسائل غير المقروءة + صوت الإشعار
  const [unreadChat, setUnreadChat] = useState(0);
  const chatOpenRef = useRef(false);
  const lastMsgCount = useRef(0);
  const chatInit = useRef(false);
  const isDesktop = useRef(false);
  // في وضع التركيز تصبح الدردشة درجاً سفلياً حتى على الشاشات العريضة → يبقى العدّاد فعّالاً
  const focusRef = useRef(false);

  // على الحاسوب، الشريط الجانبي للدردشة ظاهر دائماً → لا عدّاد
  useEffect(() => {
    const check = () => { isDesktop.current = window.matchMedia("(min-width: 1024px)").matches; if (isDesktop.current && !focusRef.current) setUnreadChat(0); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { chatOpenRef.current = chatOpen; if (chatOpen) setUnreadChat(0); }, [chatOpen]);

  useEffect(() => {
    const unsub = listenMessages(roomId, (msgs) => {
      const textMsgs = msgs.filter((m) => m.type === "text");
      if (!chatInit.current) {
        chatInit.current = true;
        lastMsgCount.current = textMsgs.length;
        return;
      }
      const newCount = textMsgs.length - lastMsgCount.current;
      if (newCount > 0) {
        const last = textMsgs[textMsgs.length - 1];
        const fromOther = last && last.userId !== user?.uid;
        if (fromOther && !chatOpenRef.current && (!isDesktop.current || focusRef.current)) {
          setUnreadChat((u) => u + newCount);
          // صوت إشعار قصير
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
          } catch { /* صامت */ }
        }
      }
      lastMsgCount.current = textMsgs.length;
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, user?.uid]);

  const members = usePresence(roomId, user?.uid, user?.displayName ?? undefined);
  const isOwner = !!room && !!user && room.ownerId === user.uid;
  const { tool, setTool } = useActiveTool(roomId, isOwner);
  const { state: roomState, setRoomState } = useRoomState(roomId, isOwner);

  const [mods, setMods] = useState<Set<string>>(new Set());
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [showParticipants, setShowParticipants] = useState(false);
  // قائمة «المزيد» — تجمع إجراءات الحصة الثانوية فلا يزدحم الشريط
  const [moreOpen, setMoreOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [dockTab, setDockTab] = useState("chat");
  // وضع تركيز الأستاذ: زر واحد يستبدل "شاشة كاملة" و"إخفاء اللوحات" السابقين
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

  /* مزامنة الحالة مع المتصفّح.
     بدون هذا: يخرج المستخدم بمفتاح Esc أو بزرّ المتصفّح فتبقى الحالة true
     وتعلق الواجهة في تخطيط الشاشة الكاملة بلا مخرج. */
  useEffect(() => {
    function sync() {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      // على iOS لا توجد Fullscreen API — نبقى على وضع CSS ولا نُلغيه
      if (!active && (document.fullscreenEnabled || doc.webkitFullscreenElement !== undefined)) {
        setFullscreen((cur) => (cur ? false : cur));
      }
    }
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

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
      // تجاهل الخروج المؤقّت بسبب فتح منتقي الملفات (الرفع داخل الشاشة الكاملة)
      if ((window as any).__bzIgnoreFSExit) return;
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
  const [roomAccess, setRoomAccess] = useState(false);
  // وضع التركيز للطالب + الأدراج الثانوية داخله
  const [studentFocus, setStudentFocus] = useState(false);
  const [focusSheet, setFocusSheet] = useState<null | "files" | "notes" | "cards">(null);
  // الخروج من وضع التركيز يغلق أي درج مفتوح تابع له (وإلا بقي معلّقاً فوق الغرفة العادية)
  useEffect(() => {
    focusRef.current = studentFocus || fullscreen;
    if (!studentFocus) setFocusSheet(null);
  }, [studentFocus, fullscreen]);
  // الأسئلة المجهولة (يراها المالك)
  const [anonQs, setAnonQs] = useState<AnonQuestion[]>([]);
  const [anonOpen, setAnonOpen] = useState(false);
  // Live Problem — تحدّي الحصة
  const [challengeCreateOpen, setChallengeCreateOpen] = useState(false);
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const challenge = useChallenge(roomId);
  // ملخّص الحصة
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaries = useSummaries(roomId);
  // تقييم الأستاذ
  const [rateOpen, setRateOpen] = useState(false);
  // تقييم الغرفة المدفوعة (لمن اشترى)
  const [rateRoomOpen, setRateRoomOpen] = useState(false);
  const prevAnon = useRef(0);
  const { settings } = useSiteSettings();
  const isMod = !!user && mods.has(user.uid);
  const isPrivileged = isOwner || isMod;

  useEffect(() => {
    const unsub = listenMods(roomId, setMods);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  useEffect(() => {
    const unsub = listenBanned(roomId, setBanned);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  useEffect(() => {
    const unsub = listenPoll(roomId, setActivePoll);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  // الأسئلة المجهولة — للمالك فقط
  useEffect(() => {
    if (!isOwner) return;
    const unsub = listenAnonQuestions(roomId, (qs) => {
      const unanswered = qs.filter((q) => !q.answered).length;
      if (unanswered > prevAnon.current) { try { playHandRaiseSound(); } catch {} }
      prevAnon.current = unanswered;
      setAnonQs(qs);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, isOwner]);
  useEffect(() => {
    if (!room?.isPaid || !user) return;
    const unsub = listenHasAccess(user.uid, "room", roomId, setRoomAccess);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [room?.isPaid, user, roomId]);
  useEffect(() => {
    if (!user) return;
    const unsub = listenKicked(roomId, user.uid, (kicked) => {
      if (kicked) router.replace("/rooms");
    return () => { if (typeof unsub === "function") unsub(); };
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, user, router]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && fullscreen) exitFullscreen(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    getRoom(roomId).then((r) => (r ? setRoom(r) : setNotFound(true)));
  }, [roomId]);

  // رفع اليد + إشعار صوتي للمالك
  const [handsQueue, setHandsQueue] = useState<RaisedHand[]>([]);
  const [ownerStatus, setOwnerStatusState] = useState<OwnerStatus>("available");
  useEffect(() => {
    const unsub = listenOwnerStatus(roomId, setOwnerStatusState);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  useEffect(() => {
    const r = ref(rtdb, `roomLive/${roomId}/hands`);
    const unsub = onValue(r, (snap) => {
      const val = (snap.val() as Record<string, { name: string; ts?: number; at?: number }>) ?? {};
      const list = Object.entries(val).map(([uid, v]) => ({ uid, name: v.name }));
      setHands(list);
      // طابور مرتّب حسب وقت الرفع
      const queue = Object.entries(val)
        .map(([uid, v]) => ({ uid, name: v.name, at: v.at ?? v.ts ?? 0 }))
        .sort((a, b) => a.at - b.at);
      setHandsQueue(queue);
      setMyHand(!!(user && val[user.uid]));
      if (isOwner && list.length > prevHands.current) playHandRaiseSound();
      prevHands.current = list.length;
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, isOwner, user]);

  function toggleHand() {
    if (!user) return;
    const r = ref(rtdb, `roomLive/${roomId}/hands/${user.uid}`);
    if (myHand) remove(r);
    else set(r, { name: user.displayName || "طالب", at: Date.now() });
  }

  function lowerHand(uid: string) {
    remove(ref(rtdb, `roomLive/${roomId}/hands/${uid}`));
  }

  // إعطاء الإذن بالتحدّث: يخفض اليد ويفتح ميكروفون الطالب
  function grantMic(uid: string) {
    remove(ref(rtdb, `roomLive/${roomId}/hands/${uid}`));
    // فتح الميكروفون عبر إزالة الكتم في عقدة الصوت
    update(ref(rtdb, `roomLive/${roomId}/voice/${uid}`), { muted: false });
  }

  // حفظ سريع لبطاقة مراجعة من داخل الغرفة (تكامل الدفتر الحيّ)
  function quickSaveCard() {
    if (!user) return;
    const label = `${room?.name ?? "الغرفة"} — ${currentToolLabel()}`;
    saveFlashcard({
      uid: user.uid,
      front: label,
      back: "أضف التفاصيل لاحقاً من صفحة بطاقات المراجعة.",
      subject: room?.subject || "general",
      source: room?.name,
    });
  }
  function currentToolLabel() {
    return TOOLS.find((t) => t.id === tool)?.label ?? "ملاحظة";
  }
  // مشاركة رابط الغرفة — يستعمله الشريط العادي ووضع التركيز معاً
  // يُسجَّل حضور الطالب مرة واحدة عند دخوله غرفة الأستاذ (أساس أهلية التقييم)
  useEffect(() => {
    if (!user || !room?.ownerId || isOwner) return;
    markAttendance(room.ownerId, user.uid).catch(() => {});
  }, [user, room?.ownerId, isOwner]);

  function shareRoomLink() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url)
      .then(() => alert("تم نسخ رابط الغرفة"))
      .catch(() => prompt("انسخ الرابط:", url));
  }

  // توليد كود وصول لغرفة مدفوعة
  async function generateAccessCode() {
    if (!room || !user) return;
    const c = await createAccessCode({
      itemType: "room", itemId: roomId, itemTitle: room.name,
      price: room.price ?? 0, ownerId: room.ownerId, ownerName: room.ownerName, createdBy: user.uid,
    });
    prompt("كود الوصول (أعطِه للطالب بعد الدفع):", c);
  }

  function submitAnonQuestion(q: string) {
    sendAnonQuestion(roomId, q);
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (notFound) return <div className="p-10 text-center text-text-muted">الغرفة غير موجودة.</div>;

  // بوّابة الغرف المدفوعة
  if (room?.isPaid && !isOwner && !roomAccess && !isPrivileged) {
    return <PaidRoomGate room={room} uid={user.uid} onUnlocked={() => setRoomAccess(true)} />;
  }

  const currentLabel = TOOLS.find((t) => t.id === tool)?.label ?? "";

  return (
    <main className="flex h-[100dvh] flex-col bg-background text-text-primary">
      {/* ══════════ شريط الغرفة الموحّد ══════════
          كان هنا شريطان فوق بعضهما: رأس الغرفة القديم ثم شريط مساحة
          الدراسة. كلاهما يعرض الاسم والعدد و«مباشر» — ازدواج يأكل 56
          بكسل من ارتفاع اللوح ويعطي مظهر لوحة تحكّم قديمة.
          صارا شريطاً واحداً بارتفاع 52px، بترتيب ثابت:
          هويّة الحصّة | حالة الغرفة | إجراءات. */}
      <WorkspaceBar>
        <button
          onClick={() => router.push("/rooms")}
          aria-label="رجوع إلى الغرف"
          title="رجوع إلى الغرف"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--bz-ink-3)] transition hover:bg-[var(--bz-canvas)] hover:text-[var(--bz-ink)]"
        >
          <Icon name="chevRight" size={17} />
        </button>

        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--bz-blue)] text-[13px] font-extrabold text-white">
          {(room?.name ?? "").charAt(0) || "B"}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-extrabold leading-tight text-[var(--bz-ink)]">
              {room?.name ?? "..."}
            </span>
            {room?.isPaid && (
              <>
                <span className="shrink-0 rounded-md bg-[var(--bz-amber-050)] px-1.5 text-[9.5px] font-bold text-[var(--bz-amber)]">
                  مدفوعة
                </span>
                {/* تقييم الغرفة — كان في الرأس القديم، أُعيد بعد الدمج */}
                <ContentRatingBadge itemId={roomId} showEmpty />
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] leading-tight text-[var(--bz-ink-3)]">
            <StatusDot status={ownerStatus} size={6} />
            <span className="truncate">
              {room?.subject ? `${room.subject} · ` : ""}
              {members.length} متصل
            </span>
          </div>
        </div>

        <LiveBadge />

        {/* حالة الغرفة — وسط الشريط، المالك يقرّر والطالب يرى */}
        <div className="mx-auto hidden md:block">
          <Segmented
            items={ROOM_STATES}
            value={roomState}
            onChange={isOwner ? setRoomState : undefined}
            disabled={!isOwner}
            compact
          />
        </div>

        <span className="flex-1 md:hidden" />

        {isOwner && (
          <BarButton
            icon="hand"
            title="الأيدي المرفوعة"
            badge={hands.length}
            active={hands.length > 0}
            onClick={() => setHandsOpen((o) => !o)}
          />
        )}

        <BarButton
          icon="users"
          label={String(members.length)}
          hideLabelOnMobile={false}
          title={`الحاضرون: ${members.length}`}
          onClick={() => setParticipantsOpen(true)}
        />

        <span className="lg:hidden">
          <BarButton
            icon="chat"
            title="الدردشة"
            badge={unreadChat}
            onClick={() => setChatOpen(true)}
          />
        </span>

        {isOwner ? (
          <>
            <BarButton
              icon={fullscreen ? "collapse" : "expand"}
              title={fullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
              active={fullscreen}
              onClick={() => (fullscreen ? exitFullscreen() : enterFullscreen())}
            />
            <BarButton
              icon="more"
              title="إجراءات الحصة"
              badge={anonQs.filter((q) => !q.answered).length}
              active={Boolean(challenge)}
              onClick={() => setMoreOpen(true)}
            />
          </>
        ) : (
          <>
            {room?.isPaid && roomAccess && user && (
              <BarButton icon="star" title="قيّم الغرفة" onClick={() => setRateRoomOpen(true)} />
            )}
            {room?.ownerId && room?.ownerRole === "teacher" && (
              <BarButton icon="star" title="قيّم الأستاذ" onClick={() => setRateOpen(true)} />
            )}
            <BarButton
              icon="expand"
              title="وضع التركيز"
              tone="primary"
              onClick={() => setStudentFocus(true)}
            />
          </>
        )}

        <BarButton
          icon="exit"
          label="خروج"
          tone="danger"
          title="مغادرة الغرفة"
          onClick={() => router.push("/rooms")}
        />
      </WorkspaceBar>

      {/* درج الحاضرين — الهاتف لا يتّسع للشريط الجانبي، فالورقة السفلية
          هي البديل الصحيح (وهي ما طلبته في الملاحظات بدل النوافذ). */}
      <BottomSheet
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        title={`الحاضرون (${members.length})`}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <ParticipantsPanel
            members={members}
            hands={handsQueue}
            mods={mods}
            ownerId={room?.ownerId ?? ""}
            myUid={user?.uid}
            isOwner={isOwner}
            onPromote={isOwner ? (uid) => (mods.has(uid) ? demoteMod(roomId, uid) : promoteToMod(roomId, uid)) : undefined}
            onKick={isPrivileged ? (uid) => kickUser(roomId, uid) : undefined}
            onGrantMic={isOwner ? grantMic : undefined}
          />
        </div>
      </BottomSheet>

      {/* درج «إجراءات الحصة» — للمالك */}
      {isOwner && (
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="إجراءات الحصة">
          <div className="grid grid-cols-2 gap-2.5 p-1 sm:grid-cols-3">
            {/* مؤقّت الدرس */}
            <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-2">
              <RoomTimerButton roomId={roomId} />
            </div>

            <button
              onClick={() => { setShowCreatePoll(true); setMoreOpen(false); }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:bg-primary/5"
            >
              <FontAwesomeIcon icon={faChartBar} className="h-5 w-5 text-primary" />
              استفتاء
            </button>

            <button
              onClick={() => { challenge ? setChallengePanelOpen(true) : setChallengeCreateOpen(true); setMoreOpen(false); }}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition ${
                challenge ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface text-text-primary hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <FontAwesomeIcon icon={faBrain} className="h-5 w-5 text-primary" />
              {challenge ? "لوحة التحدّي" : "تحدٍّ"}
            </button>

            <button
              onClick={() => { setAnonOpen(true); setMoreOpen(false); }}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition ${
                anonQs.some((q) => !q.answered) ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface text-text-primary hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <FontAwesomeIcon icon={faUserSecret} className="h-5 w-5 text-primary" />
              أسئلة مجهولة
              {anonQs.some((q) => !q.answered) && (
                <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {anonQs.filter((q) => !q.answered).length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setSummaryOpen(true); setMoreOpen(false); }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:bg-primary/5"
            >
              <FontAwesomeIcon icon={faFileLines} className="h-5 w-5 text-primary" />
              ملخّص الحصة
            </button>

            <button
              onClick={() => {
                const next: OwnerStatus = ownerStatus === "available" ? "busy" : ownerStatus === "busy" ? "brb" : "available";
                setOwnerStatus(roomId, next);
              }}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition ${
                ownerStatus === "available" ? "border-border bg-surface text-secondary"
                  : ownerStatus === "busy" ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-warning/40 bg-warning/10 text-warning"
              }`}
            >
              <StatusDot status={ownerStatus} size={12} />
              {ownerStatus === "available" ? "متفرّغ" : ownerStatus === "busy" ? "مشغول" : "سأعود"}
            </button>

            {room?.isPaid && (
              <button
                onClick={() => { generateAccessCode(); setMoreOpen(false); }}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm font-semibold text-amber-600 transition hover:bg-amber-400/20"
              >
                <FontAwesomeIcon icon={faKey} className="h-5 w-5" />
                كود وصول
              </button>
            )}

            <button
              onClick={() => { shareRoomLink(); setMoreOpen(false); }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:bg-primary/5"
            >
              <FontAwesomeIcon icon={faShareNodes} className="h-5 w-5 text-primary" />
              مشاركة الرابط
            </button>
          </div>
        </BottomSheet>
      )}

      {/* المحتوى + المشاركون + الدردشة (تخطيط 3 أعمدة على الحاسوب) */}
      <div className="flex flex-1 overflow-hidden">
        {/* ══ شريط الأيقونات ══
            تبديل المحتوى انتقل إلى هنا من شريط التبويبات المحذوف.
            أيقونة بلا تسمية: لا يزيد الازدحام البصري، والتسمية في
            الـtooltip وفي aria-label لقارئ الشاشة. */}
        {!fullscreen && (
          <IconRail>
            <RailButton icon="home" label="مرحباً" active={tool === "welcome"}
              onClick={() => isOwner && setTool("welcome")} />
            <RailButton icon="video" label="فيديو" active={tool === "video"}
              onClick={() => isOwner && setTool("video")} />
            <RailButton icon="layers" label="السبورة" active={tool === "whiteboard"}
              onClick={() => isOwner && setTool("whiteboard")} />
            <RailButton icon="file" label="ملفّات" active={tool === "files"}
              onClick={() => isOwner && setTool("files")} />
            <RailButton icon="note" label="ملاحظات" active={tool === "notes"}
              onClick={() => isOwner && setTool("notes")} />
            {isOwner && (
              <>
                <RailDivider />
                <RailButton icon="poll" label="استفتاء"
                  onClick={() => setShowCreatePoll(true)} />
                <RailButton icon="target" label={challenge ? "لوحة التحدّي" : "تحدٍّ"}
                  active={Boolean(challenge)}
                  onClick={() => (challenge ? setChallengePanelOpen(true) : setChallengeCreateOpen(true))} />
                <RailButton icon="anon" label="الأسئلة المجهولة"
                  badge={anonQs.filter((q) => !q.answered).length}
                  onClick={() => setMoreOpen(true)} />
              </>
            )}
            <RailSpacer />
            <RailButton icon="more" label="المزيد" onClick={() => setMoreOpen(true)} />
          </IconRail>
        )}

        <section
          id="bz-room-stage"
          className={`relative flex flex-col overflow-hidden bg-background ${fullscreen ? "bz-fullscreen" : ""}`}
          style={fullscreen ? undefined : { flex: 1, overflow: "hidden" }}
        >
          {/* منطقة المحتوى — في الشاشة الكاملة بالهاتف تأخذ الجزء العلوي فقط */}
          <div className={`relative flex flex-1 flex-col overflow-hidden${fullscreen ? " bz-tfocus-stage" : ""}`}>
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
                  <WaitingScreen isOwner={isOwner} roomName={room?.name ?? "الغرفة"} memberCount={members.length} ownerStatus={ownerStatus} />
                )}
                {tool === "video" && <VideoSync roomId={roomId} isOwner={isOwner} />}
                {tool === "whiteboard" && <Whiteboard roomId={roomId} canDraw={isOwner} roomName={room?.name} subject={room?.subject} />}
                {tool === "files" && <RoomFiles roomId={roomId} isOwner={isOwner} />}
                {tool === "notes" && <RoomNotes roomId={roomId} isOwner={isOwner} roomName={room?.name ?? "الغرفة"} />}
              </>
            )}
            {/* تحدّي الحصة — مساحة حل خاصة بكل طالب */}
            {!isOwner && !studentFocus && (
              <StudentChallengeLayer
                roomId={roomId}
                uid={user.uid}
                name={user.displayName || "طالب"}
                subject={room?.subject}
                roomName={room?.name}
              />
            )}

            {/* مؤقّت الدرس — يظهر للجميع */}
            <RoomTimerDisplay roomId={roomId} isOwner={isOwner} hidden={studentFocus || fullscreen} />
          </div>

          {/* ═══ طبقة وضع تركيز الأستاذ ═══ */}
          {fullscreen && isOwner && (
            <TeacherFocusMode
              roomId={roomId}
              roomName={room?.name ?? "الغرفة"}
              memberCount={members.length}
              ownerStatus={ownerStatus}
              onCycleStatus={() => {
                const next: OwnerStatus = ownerStatus === "available" ? "busy" : ownerStatus === "busy" ? "brb" : "available";
                setOwnerStatus(roomId, next);
              }}
              tools={TOOLS}
              activeTool={tool}
              onPickTool={(id) => setTool(id as RoomTool)}
              timerButton={<RoomTimerButton roomId={roomId} />}
              onCreatePoll={() => setShowCreatePoll(true)}
              onChallenge={() => (challenge ? setChallengePanelOpen(true) : setChallengeCreateOpen(true))}
              onSummary={() => setSummaryOpen(true)}
              hasChallenge={!!challenge}
              challengePanel={<TeacherChallengePanel roomId={roomId} memberCount={members.length} />}
              onShare={shareRoomLink}
              onGenerateCode={room?.isPaid ? generateAccessCode : undefined}
              chatPanel={<ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />}
              filesPanel={<RoomFiles roomId={roomId} isOwner={isOwner} />}
              participantsPanel={
                <ParticipantsPanel
                  members={members}
                  hands={handsQueue}
                  mods={mods}
                  ownerId={room?.ownerId ?? ""}
                  myUid={user?.uid}
                  isOwner={isOwner}
                  onPromote={(uid) => (mods.has(uid) ? demoteMod(roomId, uid) : promoteToMod(roomId, uid))}
                  onKick={(uid) => kickUser(roomId, uid)}
                  onGrantMic={grantMic}
                />
              }
              questionsPanel={<AnonQuestionsList roomId={roomId} questions={anonQs} />}
              unreadChat={unreadChat}
              hands={handsQueue}
              onLowerHand={lowerHand}
              onGrantMic={grantMic}
              unansweredCount={anonQs.filter((q) => !q.answered).length}
              onExit={exitFullscreen}
            />
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

        {/* ══ الشريط الجانبي الواحد ══
            كان عمودين منفصلين (مشاركون w-64 + دردشة w-96) يأكلان 360px
            من العرض دائماً. صارا لوحة واحدة بتبويبات — «Sidebar واحدة
            تحتوي Tabs» من الملاحظات — فرَبِحت المنصّة المساحة. */}
        {!fullscreen && (
          <SideDock
            tabs={[
              { id: "chat", label: "الدردشة" },
              { id: "class", label: "الصفّ", badge: handsQueue.length },
            ]}
            active={dockTab}
            onSelect={setDockTab}
            padded={false}
          >
            {dockTab === "chat" ? (
              <ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />
            ) : (
              <ParticipantsPanel
              members={members}
              hands={handsQueue}
              mods={mods}
              ownerId={room?.ownerId ?? ""}
              myUid={user?.uid}
              isOwner={isOwner}
              onPromote={isOwner ? (uid) => (mods.has(uid) ? demoteMod(roomId, uid) : promoteToMod(roomId, uid)) : undefined}
              onKick={isPrivileged ? (uid) => kickUser(roomId, uid) : undefined}
              onGrantMic={isOwner ? grantMic : undefined}
            />
            )}
          </SideDock>
        )}
      </div>

      {/* الشريط الصوتي الدائم (يبقى في كل الأدوات) */}
      <RoomVoiceBar roomId={roomId} isOwner={isOwner} />

      {/* ══ المساعد العائم ══
          الهاتف لا يتّسع لشريط الأيقونات الجانبي، فالوظائف الثانوية
          تُجمع هنا في زرّ واحد بدل أن تختفي. يظهر على الهاتف والجهاز
          اللوحي فقط (lg:hidden) لأنّ الحاسوب يملك الشريط الجانبي.
          ويُخفى في وضع التركيز لأنّ له مساعده الخاص. */}
      {!studentFocus && !fullscreen && (
        <div>
          <FloatingAssistant
            side="left"
            hideOnDesktop
            actions={[
              { id: "files", icon: "file", label: "الملفّات", tone: "primary",
                onClick: () => isOwner ? setTool("files") : setFocusSheet("files") },
              { id: "notes", icon: "note", label: "الملاحظات", tone: "amber",
                onClick: () => isOwner ? setTool("notes") : setFocusSheet("notes") },
              { id: "class", icon: "users", label: "الحاضرون",
                badge: handsQueue.length,
                onClick: () => setParticipantsOpen(true) },
              ...(isOwner
                ? [{ id: "actions", icon: "more" as const, label: "إجراءات الحصة",
                     badge: anonQs.filter((q) => !q.answered).length,
                     onClick: () => setMoreOpen(true) }]
                : [{ id: "focus", icon: "target" as const, label: "وضع التركيز", tone: "primary" as const,
                     onClick: () => setStudentFocus(true) }]),
            ]}
          />
        </div>
      )}

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
            <ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />
          </div>
        </div>
      )}

      {/* درج المشاركين على الجوال */}
      {showParticipants && (
        <div className="fixed inset-0 z-[70] bg-black/50 xl:hidden" onClick={() => setShowParticipants(false)}>
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-2xl animate-fade-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <ParticipantsPanel
              members={members}
              hands={handsQueue}
              mods={mods}
              ownerId={room?.ownerId ?? ""}
              myUid={user?.uid}
              isOwner={isOwner}
              onPromote={isOwner ? (uid) => (mods.has(uid) ? demoteMod(roomId, uid) : promoteToMod(roomId, uid)) : undefined}
              onKick={isPrivileged ? (uid) => kickUser(roomId, uid) : undefined}
              onGrantMic={isOwner ? grantMic : undefined}
            />
            {/* قائمة المحظورين للمالك */}
            {isOwner && banned.size > 0 && (
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs font-bold text-danger">المحظورون ({banned.size})</p>
                <div className="space-y-1.5">
                  {[...banned].map((uid) => (
                    <div key={uid} className="flex items-center justify-between gap-2 rounded-md bg-danger/5 px-3 py-2">
                      <span className="truncate font-mono text-xs text-text-muted">{uid.slice(0, 14)}…</span>
                      <button
                        onClick={() => unbanUser(roomId, uid)}
                        className="flex shrink-0 items-center gap-1 rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary hover:bg-secondary/20"
                      >
                        <FontAwesomeIcon icon={faUnlock} className="h-3 w-3" /> فك
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إنشاء استفتاء */}
      {showCreatePoll && isOwner && (
        <CreatePollModal roomId={roomId} onClose={() => setShowCreatePoll(false)} />
      )}

      {/* ═══ وضع التركيز للطالب ═══ */}
      {studentFocus && !isOwner && (
        <StudentFocusMode
          roomName={room?.name ?? "الغرفة"}
          ownerName={room?.ownerName}
          ownerStatus={ownerStatus}
          memberCount={members.length}
          myHandRaised={myHand}
          onToggleHand={toggleHand}
          onExit={() => setStudentFocus(false)}
          onSaveToCards={quickSaveCard}
          onAnonymousQuestion={submitAnonQuestion}
          onOpenFiles={() => setFocusSheet("files")}
          onOpenNotes={() => setFocusSheet("notes")}
          onOpenCards={() => setFocusSheet("cards")}
          onOpenSummary={summaries.length > 0 ? () => setSummaryOpen(true) : undefined}
          onRateTeacher={() => setRateOpen(true)}
          unreadChat={unreadChat}
          roomId={roomId}
          chatPanel={<ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />}
          challengeLayer={
            <StudentChallengeLayer
              roomId={roomId}
              uid={user.uid}
              name={user.displayName || "طالب"}
              subject={room?.subject}
              roomName={room?.name}
            />
          }
        >
          {/* نفس المحتوى الذي يعرضه المعلّم */}
          {activePoll?.open ? (
            <RoomPollPanel roomId={roomId} poll={activePoll} isOwner={isOwner} myUid={user?.uid ?? ""} />
          ) : (
            <>
              {tool === "welcome" && <WaitingScreen isOwner={isOwner} roomName={room?.name ?? "الغرفة"} memberCount={members.length} ownerStatus={ownerStatus} />}
              {tool === "video" && <VideoSync roomId={roomId} isOwner={isOwner} />}
              {tool === "whiteboard" && <Whiteboard roomId={roomId} canDraw={isOwner} roomName={room?.name} subject={room?.subject} />}
              {tool === "files" && <RoomFiles roomId={roomId} isOwner={isOwner} />}
              {tool === "notes" && <RoomNotes roomId={roomId} isOwner={isOwner} roomName={room?.name ?? "الغرفة"} />}
            </>
          )}
        </StudentFocusMode>
      )}

      {/* أدراج الوظائف الثانوية — على مستوى الصفحة عمداً: يفتحها المساعد
          العائم في الغرفة العادية أيضاً، لا في وضع التركيز وحده. */}
      <BottomSheet open={focusSheet === "files"} onClose={() => setFocusSheet(null)} title="ملفات الغرفة" maxHeight="80vh">
        <div className="h-[68vh]"><RoomFiles roomId={roomId} isOwner={isOwner} /></div>
      </BottomSheet>
      <BottomSheet open={focusSheet === "notes"} onClose={() => setFocusSheet(null)} title="ملاحظات الدرس" maxHeight="80vh">
        <div className="h-[68vh]"><RoomNotes roomId={roomId} isOwner={isOwner} roomName={room?.name ?? "الغرفة"} /></div>
      </BottomSheet>
      <BottomSheet open={focusSheet === "cards"} onClose={() => setFocusSheet(null)} title="بطاقات المراجعة">
        <div className="px-1 py-2">
          <p className="text-sm leading-relaxed text-text-muted">
            كل ما تحفظه من الغرفة بزرّ الحفظ يُضاف مباشرة إلى بطاقات المراجعة. راجعها في أي وقت من صفحة البطاقات.
          </p>
          <a
            href="/tools/flashcards"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white active:scale-95"
          >
            فتح بطاقات المراجعة
          </a>
        </div>
      </BottomSheet>

      {/* تقييم الأستاذ — للطالب وحده */}
      {!isOwner && room?.ownerId && (
        <RateTeacherSheet
          teacherUid={room.ownerId}
          teacherName={room.ownerName || "الأستاذ"}
          studentUid={user.uid}
          studentName={user.displayName || "طالب"}
          open={rateOpen}
          onClose={() => setRateOpen(false)}
        />
      )}

      {/* تقييم الغرفة المدفوعة — لمن اشترى الدخول */}
      {!isOwner && room?.isPaid && user && (
        <ContentRatingSheet
          itemId={roomId}
          itemTitle={room.name || "الغرفة"}
          uid={user.uid}
          name={user.displayName || "طالب"}
          kind="room"
          open={rateRoomOpen}
          onClose={() => setRateRoomOpen(false)}
        />
      )}

      {/* ملخّص الحصة */}
      {isOwner ? (
        <TeacherSummarySheet
          roomId={roomId}
          roomName={room?.name ?? "الغرفة"}
          teacherName={user.displayName || "الأستاذ"}
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
        />
      ) : (
        <SummaryViewerSheet
          roomId={roomId}
          roomName={room?.name ?? "الغرفة"}
          uid={user.uid}
          subject={room?.subject}
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      {/* أدراج التحدي — للمالك */}
      {isOwner && (
        <>
          <CreateChallengeSheet roomId={roomId} open={challengeCreateOpen} onClose={() => setChallengeCreateOpen(false)} />
          <BottomSheet open={challengePanelOpen} onClose={() => setChallengePanelOpen(false)} title="حلول التحدي" maxHeight="88vh">
            <TeacherChallengePanel roomId={roomId} memberCount={members.length} />
            <button
              onClick={() => { setChallengePanelOpen(false); setChallengeCreateOpen(true); }}
              className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-bold text-text-muted transition hover:border-primary hover:text-primary"
            >
              بدء تحدٍّ جديد
            </button>
          </BottomSheet>
        </>
      )}

      {/* درج الأسئلة المجهولة — للمالك */}
      {isOwner && (
        <BottomSheet open={anonOpen} onClose={() => setAnonOpen(false)} title="الأسئلة المجهولة" maxHeight="80vh">
          <AnonQuestionsList roomId={roomId} questions={anonQs} />
        </BottomSheet>
      )}

    </main>
  );
}

/* قائمة الأسئلة المجهولة — تُستعمل في الدرج السفلي وفي لوحة وضع التركيز */
function AnonQuestionsList({ roomId, questions }: { roomId: string; questions: AnonQuestion[] }) {
  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        لا أسئلة بعد. يمكن للطلاب إرسال أسئلتهم دون إظهار أسمائهم.
      </p>
    );
  }
  return (
    <div className="space-y-2.5 pb-2">
      {questions.map((q) => (
        <div
          key={q.id}
          className={`rounded-2xl border p-3.5 ${q.answered ? "border-border bg-border opacity-60" : "border-primary/20 bg-primary/5"}`}
        >
          <p className="text-sm leading-relaxed text-text-primary" dir="auto">{q.text}</p>
          <div className="mt-2.5 flex items-center gap-2">
            {!q.answered && (
              <button
                onClick={() => markAnonAnswered(roomId, q.id)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary active:scale-95"
              >
                <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" /> تمّت الإجابة
              </button>
            )}
            <button
              onClick={() => deleteAnonQuestion(roomId, q.id)}
              className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger active:scale-95"
            >
              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> حذف
            </button>
            {q.answered && <span className="text-xs font-bold text-secondary">✓ أُجيب عنه</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* بوّابة الغرف المدفوعة — قفل + كود وصول */
function PaidRoomGate({ room, uid, onUnlocked }: {
  room: Room; uid: string; onUnlocked: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  async function unlock() {
    setBusy(true); setErr("");
    const error = await redeemCode(code, uid, "");
    setBusy(false);
    if (error) { setErr(error); return; }
    onUnlocked();
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-5 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-surface p-6 shadow-glass">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-amber-500">
          <FontAwesomeIcon icon={faLock} className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-xl font-extrabold">{room.name}</h1>
        <p className="mt-1 text-sm text-text-muted">غرفة مدفوعة — تحتاج كود وصول للدخول</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-600">
          <FontAwesomeIcon icon={faLock} className="h-3 w-3" /> {room.price} دج
        </div>

        <button onClick={() => setShowPay(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-white active:scale-95">
          تواصل مع الإدارة للشراء
        </button>
        <SupportChatSheet open={showPay} onClose={() => setShowPay(false)} initialKind="payment" />

        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="أدخل كود الوصول"
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
          <button onClick={unlock} disabled={busy || !code.trim()}
            className="rounded-xl bg-gradient-primary px-5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "..." : "دخول"}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}

        <button onClick={() => router.replace("/rooms")} className="mt-4 text-xs font-semibold text-text-muted hover:text-primary">
          ← العودة للغرف
        </button>
      </div>
    </div>
  );
}
