"use client";

import { useEffect, useRef, useState } from "react";
import { ChargilyPayButton } from "@/features/paid/chargily-button";
import { useParams, useRouter } from "next/navigation";
import { ContentRatingBadge, ContentRatingSheet } from "@/features/community/content-rating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faVideo, faChalkboard, faFolderOpen, faCircleCheck, faNoteSticky, faSpinner, faLock, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ref, onValue, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { InviteSheet } from "@/features/rooms/invite-sheet";
import { getRoom, type Room, promoteToMod, demoteMod, kickUser, listenMods, listenKicked, listenBanned, listenPoll, type RoomPoll, listenMessages, setOwnerStatus, listenOwnerStatus, type OwnerStatus } from "@/features/rooms/rooms";
import { RoomPollPanel, CreatePollModal } from "@/features/rooms/room-poll";
import { RoomActivityToasts } from "@/features/rooms/room-activity-toasts";
import { RoomTimerButton, RoomTimerDisplay } from "@/features/rooms/room-timer";
import { RoomNotes } from "@/features/rooms/room-notes";
import { ParticipantsPanel } from "@/features/rooms/participants-panel";
import type { RaisedHand } from "@/features/rooms/rooms";
import { usePresence } from "@/features/rooms/use-presence";
import { useActiveTool, type RoomTool } from "@/features/rooms/use-active-tool";
import { ChatPanel } from "@/features/chat/chat-panel";
import { RoomVoiceBar } from "@/features/voice/room-voice-bar";
import { playHandRaiseSound } from "@/lib/sound";
import { listenHasAccess, redeemCode, createAccessCode } from "@/features/paid/paid-access";
import { sendAnonQuestion, listenAnonQuestions, markAnonAnswered, deleteAnonQuestion, type AnonQuestion } from "@/features/rooms/rooms";
import { saveFlashcard } from "@/features/study/save-flashcard";
import { StudentChallengeLayer, CreateChallengeSheet, TeacherChallengePanel, useChallenge } from "@/features/rooms/room-challenge";
import { RateTeacherSheet } from "@/features/community/teacher-rating-ui";
import { SupportChatSheet } from "@/features/support/support-chat";
import { markAttendance } from "@/features/community/teacher-rating";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import dynamic from "next/dynamic";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { WorkspaceBar, LiveBadge, BarButton, Segmented } from "@/components/ui/workspace";
import { RoomStage } from "@/features/rooms/room-stage";
import { SpeakerRail } from "@/features/rooms/speaker-rail";
import { RoomControlBar } from "@/features/rooms/control-bar";
import { RoomDock, type DockTab } from "@/features/rooms/room-dock";
import { useHasSideDock } from "@/lib/use-media";
import { useRoomState, ROOM_STATES } from "@/features/rooms/use-room-state";
import { ExamGradingSheet } from "@/features/rooms/exam-sim/exam-papers";
import { listenExam, type ExamSession } from "@/features/rooms/exam-sim/exam-session";
import { Icon } from "@/components/ui/icon";

// تحميل ديناميكي للأدوات الثقيلة (تقليل حجم الحزمة الأولية)
const loadingTool = () => (
  <div className="grid h-full place-items-center text-text-muted">
    <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
  </div>
);
/* الأسطح (سبورة/فيديو/ملفّات/ملاحظات) انتقلت إلى `RoomStage` الذي
   يُبقيها مُركَّبة ولا يُفكّكها عند التبديل. ولوحة الملفّات تبقى
   مُستورَدة هنا لأنّ الأدراج الثانوية تستعملها. */
const RoomFiles = dynamic(() => import("@/features/rooms/room-files").then((m) => m.RoomFiles), { ssr: false, loading: loadingTool });
/* قاعة الامتحان تُحمَّل عند الحاجة فقط: بيانات المحاكاة كبيرة، ولا
   يجوز أن تُثقل كل غرفة عادية لا امتحان فيها. */
const ExamStage = dynamic(() => import("@/features/rooms/exam-sim/exam-stage").then((m) => m.ExamStage), { ssr: false, loading: loadingTool });
/* لوح الإعداد يحمل جدول مواضيع البكالوريا كاملاً — يُحمَّل حين يفتحه
   الأستاذ لا مع كل غرفة. */
const ExamSetupSheet = dynamic(() => import("@/features/rooms/exam-sim/exam-setup-sheet").then((m) => m.ExamSetupSheet), { ssr: false });

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
  /* الرصيف ظاهر من 768px: على اللوح والحاسوب الدردشة معروضة دائماً
     فلا معنى لعدّاد غير مقروء، وزرّ «الدردشة» ينقل التبويب بدل أن
     يفتح ورقة تُكرّر ما هو ظاهر. */
  const hasSideDock = useHasSideDock();
  // في وضع التركيز تصبح الدردشة درجاً سفلياً حتى على الشاشات العريضة → يبقى العدّاد فعّالاً
  const focusRef = useRef(false);

  useEffect(() => {
    if (hasSideDock && !focusRef.current) setUnreadChat(0);
  }, [hasSideDock]);

  /* الدردشة صارت تبويباً في الرصيف: مفتوحة إمّا في اللوحة الجانبية
     على الحاسوب، أو في ورقة الرصيف على الهاتف. العدّاد يتبع ذلك. */
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
        if (fromOther && !chatOpenRef.current && (!hasSideDock || focusRef.current)) {
          setUnreadChat((u) => u + newCount);
          /* 🐛 كان يُنشئ `AudioContext` **جديداً لكل رسالة** ولا يُغلقه:
             المتصفّح يحدّ عددها، فبعد عشرات الرسائل يتوقّف الصوت
             ويبقى التسريب. سياق واحد مُشترك يُنشأ عند أوّل حاجة. */
          try {
            const w = window as unknown as { __bzAudioCtx?: AudioContext; AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
            const Ctor = w.AudioContext || w.webkitAudioContext;
            if (Ctor) {
              const ctx = (w.__bzAudioCtx ??= new Ctor());
              if (ctx.state === "suspended") void ctx.resume();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 660;
              gain.gain.setValueAtTime(0.18, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
              osc.start(); osc.stop(ctx.currentTime + 0.25);
            }
          } catch { /* صامت */ }
        }
      }
      lastMsgCount.current = textMsgs.length;
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, user?.uid, hasSideDock]);

  const members = usePresence(roomId, user?.uid, user?.displayName ?? undefined);
  const isOwner = !!room && !!user && room.ownerId === user.uid;
  const [mods, setMods] = useState<Set<string>>(new Set());
  const [roomAccess, setRoomAccess] = useState(false);
  const isModEarly = !!user && mods.has(user.uid);

  /* ── حقّ قراءة محتوى الغرفة ──
     صارت `roomLive` مغلقة في الغرف المدفوعة على مستوى قاعدة البيانات
     (كانت تُقرأ بـ`auth != null`، أي أنّ محتوى أيّ غرفة مدفوعة —
     السبورة والملاحظات والمحاكاة — كان يُقرأ بلا دفع بطلبٍ مباشر
     يتجاوز بوّابة الواجهة).

     ولهذا لا نفتح مستمعاً واحداً على `roomLive` قبل أن تُحسم
     الأهليّة: البيانات وصلت (`room`)، والغرفة مجانية أو أنا مالكها
     أو مشرفها أو دفعتُ ثمنها. وبلا هذا الشرط يرى من لم يدفع سلسلة
     `permission_denied` — وهي رفضٌ صحيح لكنّه ضجيج لا معنى له. */
  const canReadLive = !!room && (!room.isPaid || isOwner || isModEarly || roomAccess);

  const { tool, setTool } = useActiveTool(roomId, isOwner, canReadLive);
  const { state: roomState, setRoomState } = useRoomState(roomId, isOwner, canReadLive);

  /* ── ما تفعله حالة الغرفة فعلاً ──
     كانت الأزرار الأربعة تضبط قيمة **لا يقرؤها أحد** — زينة محضة، ولهذا
     لم يكن معناها مفهوماً. لكل حالة الآن أثر حقيقي يراه الجميع:

       دراسة      → كل شيء متاح (الافتراضي)
       تركيز      → تُطوى الأعمدة الجانبية، المحتوى وحده
       امتحان     → تُغلق الدردشة للجميع ويظهر وقت التمرين
       مراجعة ملفّ → يُعرض الملفّ ويُطوى الشريط الجانبي

     مُشتقّة لا مُخزَّنة: حالة واحدة مصدرها `roomState` المُزامن، فلا
     يمكن أن تتناقض النسخ بين الأجهزة. */
  /* «وضع التركيز» صار حالةً في الهيكل نفسه لا واجهةً ثانية: تتقلّص
     الأطراف (الرفّ والرصيف) ويمتدّ المسرح، ويبقى شريط التحكّم كما هو
     فلا يفقد المستخدم زرّاً واحداً. */
  const stateHidesSidePanels = roomState === "focus" || roomState === "review";
  const stateHidesChat = roomState === "exam" || roomState === "focus";

  /* «مراجعة ملفّ» تعرض الملفّات فعلاً بدل أن تكون تسمية بلا أثر.
     للمالك وحده: الطالب يتبع ما يعرضه الأستاذ. */
  useEffect(() => {
    if (roomState === "review" && isOwner && tool !== "files") setTool("files");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, isOwner]);

  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [examSetupOpen, setExamSetupOpen] = useState(false);
  const [examGradingOpen, setExamGradingOpen] = useState(false);
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dockTab, setDockTab] = useState<DockTab>("chat");
  /* «الدردشة مفتوحة» صارت حالةً مُشتقّة: تبويب الدردشة في ورقة
     الرصيف على الهاتف. بلا هذا يبقى العدّاد يزيد وأنت تقرأ. */
  useEffect(() => {
    setChatOpen(participantsOpen && dockTab === "chat");
  }, [participantsOpen, dockTab]);

  // وضع تركيز الأستاذ: زر واحد يستبدل "شاشة كاملة" و"إخفاء اللوحات" السابقين
  const [fullscreen, setFullscreen] = useState(false);
  // وضع التركيز للطالب + الأدراج الثانوية داخله
  const [studentFocus, setStudentFocus] = useState(false);
  const [studentAskOpen, setStudentAskOpen] = useState(false);
  const [focusSheet, setFocusSheet] = useState<null | "files" | "notes" | "cards">(null);

  // دخول موحّد للشاشة الكاملة: يحاول Fullscreen API بعد نقرة المستخدم،
  // ثم يفعّل طبقة CSS الآمنة على iOS أو عند رفض المتصفح.
  async function requestRoomFullscreen() {
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
    } catch { /* iOS/Safari — نستخدم طبقة CSS */ }
  }
  async function enterFullscreen() {
    await requestRoomFullscreen();
    setFullscreen(true);
  }
  async function enterStudentFocus() {
    await requestRoomFullscreen();
    setStudentFocus(true);
  }
  async function exitFullscreen() {
    try {
      const doc = document as any;
      if (doc.fullscreenElement && doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    } catch {}
    setFullscreen(false);
    setStudentFocus(false);
  }

  // قفل تمرير الصفحة بالكامل أثناء الشاشة الكاملة (يمنع ظهور المحتوى خلفها على iOS)
  useEffect(() => {
    document.body.classList.toggle("bz-fullscreen-active", fullscreen);
    document.body.classList.toggle("bz-room-focus-active", studentFocus);
    return () => {
      document.body.classList.remove("bz-fullscreen-active");
      document.body.classList.remove("bz-room-focus-active");
    };
  }, [fullscreen, studentFocus]);

  /* مزامنة الحالة مع المتصفّح.
     بدون هذا: يخرج المستخدم بمفتاح Esc أو بزرّ المتصفّح فتبقى الحالة true
     وتعلق الواجهة في تخطيط الشاشة الكاملة بلا مخرج. */
  useEffect(() => {
    function sync() {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      // على iOS لا توجد Fullscreen API — نبقى على وضع CSS ولا نُلغيه
      if (!active && (document.fullscreenEnabled || doc.webkitFullscreenElement !== undefined)) {
        setFullscreen(false);
        setStudentFocus(false);
      }
    }
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  /* ارتفاع الواجهة الفعلي.
     🐛 كان يُقاس في ملء الشاشة وحده، فعلى iPhone في الوضع العادي
     تفتح لوحة المفاتيح (كتابة رسالة أو حلّ تحدٍّ) فتدفع شريط التحكّم
     خارج الشاشة، لأنّ `100dvh` لا تتقلّص مع اللوحة. الآن يُقاس دائماً
     ما دامت الغرفة مفتوحة. */
  useEffect(() => {
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
  }, []);

  // مزامنة عند الخروج من الشاشة بـ ESC أو زر المتصفّح
  useEffect(() => {
    const onFSChange = () => {
      const doc = document as any;
      const active = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      // تجاهل الخروج المؤقّت بسبب فتح منتقي الملفات (الرفع داخل الشاشة الكاملة)
      if ((window as any).__bzIgnoreFSExit) return;
      if (!active) {
        setFullscreen(false);
        setStudentFocus(false);
      }
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
  // الخروج من وضع التركيز يغلق أي درج مفتوح تابع له (وإلا بقي معلّقاً فوق الغرفة العادية)
  useEffect(() => {
    focusRef.current = studentFocus || fullscreen;
    if (!studentFocus) setFocusSheet(null);
  }, [studentFocus, fullscreen]);
  // الأسئلة المجهولة (يراها المالك)
  const [anonQs, setAnonQs] = useState<AnonQuestion[]>([]);
  const [anonOpen, setAnonOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  // Live Problem — تحدّي الحصة
  const [challengeCreateOpen, setChallengeCreateOpen] = useState(false);
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const challenge = useChallenge(roomId);
  // ملخّص الحصة
  // تقييم الأستاذ
  const [rateOpen, setRateOpen] = useState(false);
  // تقييم الغرفة المدفوعة (لمن اشترى)
  const [rateRoomOpen, setRateRoomOpen] = useState(false);
  const prevAnon = useRef(0);
  /* مستمع واحد لجلسة المحاكاة يقرؤه الأستاذ والطالب معاً — لا تكرار،
     ولا يعمل إلّا ما دامت الصفحة مفتوحة. */
  useEffect(() => {
    if (!roomId || !canReadLive) return;
    const unsub = listenExam(roomId, setExam);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, canReadLive]);

  /* الوضعان القديمان (`fullscreen` للأستاذ و`studentFocus` للتلميذ)
     صارا اسماً واحداً في الواجهة: تقلّص الأطراف. */
  const focusMode = fullscreen || studentFocus;

  const isMod = isModEarly;               // حُسبت أعلى مع أهليّة القراءة
  const isPrivileged = isOwner || isMod;

  useEffect(() => {
    const unsub = listenMods(roomId, setMods);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);
  useEffect(() => {
    /* `bannedUsers` مقروءة للمالك وحده في القواعد، فمستمعُ غيره
       يُرفض بلا فائدة. القائمة تُعرض للمالك أصلاً في الرصيف. */
    if (!isOwner) return;
    const unsub = listenBanned(roomId, setBanned);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, isOwner]);
  useEffect(() => {
    if (!canReadLive) return;
    const unsub = listenPoll(roomId, setActivePoll);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, canReadLive]);
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
    if (!user || !canReadLive) return;
    const unsub = listenKicked(roomId, user.uid, (kicked) => {
      if (kicked) router.replace("/rooms");
    return () => { if (typeof unsub === "function") unsub(); };
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, user, router, canReadLive]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && (fullscreen || studentFocus)) exitFullscreen(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, studentFocus]);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  /* 🐛 كانت بيانات الغرفة تُقرأ **مرّة واحدة**: تغيير الاسم أو
     تحويلها إلى مدفوعة لا يظهر لمن هو داخلها إلّا بعد تحديث الصفحة.
     مستمع حيّ على العقدة نفسها يُصلح ذلك بكتابة واحدة. */
  useEffect(() => {
    if (!roomId) return;
    const unsub = onValue(ref(rtdb, `rooms/${roomId}`), (snap) => {
      const val = snap.val() as Omit<Room, "id"> | null;
      if (val) setRoom({ id: roomId, ...val } as Room);
      else setNotFound(true);
    }, () => { getRoom(roomId).then((r) => (r ? setRoom(r) : setNotFound(true))); });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

  // رفع اليد + إشعار صوتي للمالك
  const [handsQueue, setHandsQueue] = useState<RaisedHand[]>([]);
  const [ownerStatus, setOwnerStatusState] = useState<OwnerStatus>("available");
  useEffect(() => {
    if (!canReadLive) return;
    const unsub = listenOwnerStatus(roomId, setOwnerStatusState);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId, canReadLive]);
  useEffect(() => {
    if (!canReadLive) return;
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
  }, [roomId, isOwner, user, canReadLive]);

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

  return (
    /* `overflow-x-hidden` + `w-full`: أزرار الشريط العلوي `shrink-0`،
       فمجموعها على شاشة أندرويد الضيّقة يتجاوز العرض ويدفع **الصفحة
       كلّها** جانباً — فتُقصّ الحوافّ يميناً ويساراً كما في لقطتك.
       iOS يخفي ذلك لاختلاف تعامله مع الفيض. */
    <main
      /* `bz-room` تحمل تجاوب الغرفة كلّه: الارتفاع الحقيقي مع لوحة
         مفاتيح iOS، والمنطقة الآمنة في الجهات الأربع، وهدف اللمس
         44px، وطيّ الرفّ في الوضع الأفقي القصير. */
      className={`bz-room flex w-full flex-col overflow-x-hidden bg-background text-text-primary ${
        focusMode ? "bz-fullscreen" : ""
      }`}
    >
      {/* ══════════ شريط الغرفة الموحّد ══════════
          كان هنا شريطان فوق بعضهما: رأس الغرفة القديم ثم شريط مساحة
          الدراسة. كلاهما يعرض الاسم والعدد و«مباشر» — ازدواج يأكل 56
          بكسل من ارتفاع اللوح ويعطي مظهر لوحة تحكّم قديمة.
          صارا شريطاً واحداً بارتفاع 52px، بترتيب ثابت:
          هويّة الحصّة | حالة الغرفة | إجراءات. */}
      <WorkspaceBar className="bz-topbar">
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
              <span className="truncate">
              {room?.subject ? `${room.subject} · ` : ""}
              {members.length} متصل
            </span>
          </div>
        </div>

        <LiveBadge />

        {/* حالة الغرفة — وسط الشريط، المالك يقرّر والطالب يرى */}
        {/* حالات الغرفة قرار الأستاذ: تُغيّر ما يراه الجميع.
            الطالب يرى **أثرها** في الشريط الأزرق أسفل، لا أزرارها
            معطّلة — الزرّ الذي لا يعمل يُربك ولا يُفيد. */}
        {isOwner && (
          <div className="mx-auto hidden md:block">
            <Segmented items={ROOM_STATES} value={roomState} onChange={setRoomState} compact />
          </div>
        )}
        {!isOwner && <span className="mx-auto" />}

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

        {/* رفع اليد والدردشة ووظائف التلميذ انتقلت إلى شريط التحكّم:
            زرّ واحد لكل فعل، لا زرّ في الأعلى وآخر في الأسفل. */}

        {/* أثناء المحاكاة يحتاج **الطالب** ملء الشاشة أيضاً — على iPhone
            خصوصاً حيث لا يعمل ملء الشاشة الحقيقي، فيتكفّل البديل. */}
        {!isOwner && exam && (
          <BarButton
            icon={fullscreen ? "collapse" : "expand"}
            title={fullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
            active={fullscreen}
            onClick={() => (fullscreen ? exitFullscreen() : enterFullscreen())}
          />
        )}

        <BarButton
          icon={focusMode ? "collapse" : "expand"}
          title={focusMode ? "إنهاء وضع التركيز" : "وضع التركيز — يوسّع المسرح"}
          active={focusMode}
          onClick={() => (focusMode ? exitFullscreen() : isOwner ? enterFullscreen() : enterStudentFocus())}
        />

        <BarButton
          icon="exit"
          label="خروج"
          tone="danger"
          title="مغادرة الغرفة"
          onClick={() => router.push("/rooms")}
        />
      </WorkspaceBar>

      {/* الأيدي المرفوعة — كان الزرّ يضبط `handsOpen` ولا شيء يُصيَّرها،
          فيبدو معطّلاً. سقط الدرج عند دمج الشريطين. */}
      <BottomSheet
        open={handsOpen}
        onClose={() => setHandsOpen(false)}
        title={`الأيدي المرفوعة (${handsQueue.length})`}
      >
        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {handsQueue.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">لا أحد رفع يده الآن.</p>
          ) : (
            <div className="space-y-2">
              {handsQueue.map((h, i) => (
                <div key={h.uid} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--bz-blue-050)] text-[11px] font-extrabold text-[var(--bz-blue-700)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.name}</span>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => grantMic(h.uid)}
                        className="rounded-lg bg-[var(--bz-blue-050)] px-2.5 py-1 text-[11px] font-bold text-[var(--bz-blue-700)]"
                      >
                        أعطه الميكروفون
                      </button>
                      <button
                        onClick={() => lowerHand(h.uid)}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-text-muted hover:text-danger"
                      >
                        إنزال
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* درج الحاضرين — الهاتف لا يتّسع للشريط الجانبي، فالورقة السفلية
          هي البديل الصحيح (وهي ما طلبته في الملاحظات بدل النوافذ). */}
      <BottomSheet
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        title="الصفّ"
        maxHeight="86dvh"
      >
        {/* نفس الرصيف الذي يراه الحاسوب — لا لوحة ثانية للهاتف */}
        {/* `dvh` لا `vh`: على iOS يقيس `vh` الشاشة كاملةً فتتجاوز
            الورقة الشاشة حين يظهر شريط المتصفّح. */}
        <div className="h-[68dvh] sm:h-[62dvh]">
          <RoomDock
            tab={dockTab}
            onTab={setDockTab}
            chatEnabled={!stateHidesChat}
            handsCount={handsQueue.length}
            unreadChat={unreadChat}
            unansweredAnon={anonQs.filter((q) => !q.answered).length}
            showQuestions={isOwner}
            roomId={roomId}
            banned={banned}
            isOwner={isOwner}
            chatPanel={<ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />}
            classPanel={
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
            }
            questionsPanel={<AnonQuestionsList roomId={roomId} questions={anonQs} />}
          />
        </div>
      </BottomSheet>

      {/* المؤقّت على مستوى الصفحة — مستقلّ عن أي درج فلا يُفكَّك معه */}
      {isOwner && (
        <RoomTimerButton roomId={roomId} open={timerOpen} onOpenChange={setTimerOpen} hideTrigger />
      )}

      {/* ══ محاكاة البكالوريا — ألواح المالك ══ */}
      {isOwner && user && (
        <>
          <ExamSetupSheet
            roomId={roomId}
            open={examSetupOpen}
            onClose={() => setExamSetupOpen(false)}
            teacherUid={user.uid}
          />
          <ExamGradingSheet
            roomId={roomId}
            roomName={room?.name ?? "الغرفة"}
            grader={{ uid: user.uid, name: user.displayName || "الأستاذ" }}
            open={examGradingOpen}
            onClose={() => setExamGradingOpen(false)}
          />
        </>
      )}

      {/* درج دعوة الأصدقاء */}
      {isPrivileged && room && (
        <InviteSheet
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          roomId={roomId}
          roomName={room.name || "غرفة دراسة"}
        />
      )}

      {/* ══ رفّ الصفّ ══
          الحضور والأيدي المرفوعة وحالة الميكروفون ظاهرة دائماً في 56
          بكسل. قبله كان في الشريط عدد مجرّد، والأيدي خلف ورقة سفلية. */}
      {!stateHidesSidePanels && !exam && !focusMode && (
        <SpeakerRail
          roomId={roomId}
          members={members}
          hands={handsQueue}
          mods={mods}
          ownerId={room?.ownerId ?? ""}
          myUid={user?.uid}
          isOwner={isOwner}
          onGrantMic={isOwner ? grantMic : undefined}
          onLowerHand={isOwner ? lowerHand : undefined}
          onOpenClass={() => { setDockTab("class"); if (!hasSideDock || focusMode) setParticipantsOpen(true); }}
        />
      )}

      {/* المسرح + الرصيف */}
      <div className="flex flex-1 overflow-hidden">
        {/* ⚠️ ملء الشاشة انتقل إلى `<main>`: كان على هذا القسم وحده
            فيغطّي شريط التحكّم ويخفي الميكروفون، ولهذا وُلدت واجهتا
            «وضع التركيز» المنفصلتان. الآن الهيكل كلّه يملأ الشاشة
            وتتقلّص أطرافه فقط. */}
        <section
          id="bz-room-stage"
          className="relative flex flex-1 flex-col overflow-hidden bg-background"
        >
          {/* منطقة المحتوى — في الشاشة الكاملة بالهاتف تأخذ الجزء العلوي فقط */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* شريط يشرح الحالة غير الافتراضية.
                الحالة تُغيّر ما يراه الطالب، فلا يجوز أن تتغيّر الشاشة
                تحته دون تفسير — وإلّا بدت الغرفة معطوبة. */}
            {roomState !== "study" && (
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] px-3 py-1.5">
                <Icon
                  name={roomState === "exam" ? "timer" : roomState === "review" ? "file" : "target"}
                  size={13}
                  className="text-[var(--bz-blue)]"
                />
                <span className="text-[11.5px] font-bold text-[var(--bz-blue-700)]">
                  {roomState === "focus"
                    ? "وضع التركيز — أُخفيت الأعمدة الجانبية ليبقى المحتوى وحده"
                    : roomState === "exam"
                      ? exam
                        ? `محاكاة البكالوريا — ${exam.subjectName} · الدردشة مغلقة، ركّز على ورقتك`
                        : "وضع الامتحان — الدردشة مغلقة، ركّز على ورقتك"
                      : "مراجعة ملفّ — الملفّ معروض والشريط الجانبي مطويّ"}
                </span>
              </div>
            )}

            {/* ══ قاعة الامتحان ══
                تحلّ محلّ **محتوى المسرح** لا محلّ الغرفة: الشريط العلوي
                والمشاركون والصوت وكل ما حولها يبقى حيّاً، فإنهاء المحاكاة
                يُزيل هذه الطبقة فيعود ما تحتها كما تركه المستخدم. */}
            {/* ══ المسرح ══
                سطح واحد لا يُفرَّغ: كل ما زاره المستخدم يبقى مُركَّباً
                ويُخفى بلا فقدان أبعاده، فالسبورة لا تُعاد من الصفر عند
                العودة إليها. وقاعة الامتحان تبقى **كما هي** طبقةً
                فوقه — لم يُمسّ شكلها. */}
            <RoomStage
              roomId={roomId}
              roomName={room?.name ?? "الغرفة"}
              subject={room?.subject ?? undefined}
              isOwner={isOwner}
              isPrivileged={isPrivileged}
              tool={tool}
              memberCount={members.length}
              ownerStatus={ownerStatus}
              onPickTool={isOwner ? setTool : undefined}
              examLayer={
                exam && user ? (
                  <ExamStage
                    roomId={roomId}
                    roomName={room?.name ?? "الغرفة"}
                    session={exam}
                    isOwner={isOwner}
                    uid={user.uid}
                    userName={user.displayName || "طالب"}
                    onLeaveRoom={() => router.push("/rooms")}
                  />
                ) : undefined
              }
            />

            {/* ══ الاستفتاء يعلو المحتوى ولا يحلّ محلّه ══
                كان يُزيل اللوح تماماً، فيفقد الطالب السياق الذي يُسأل
                عنه — وهو أسوأ لحظة لإخفائه. الآن بطاقة تنزل من أعلى
                المنصّة والمحتوى باقٍ خلفها ومقروء.
                لا نُعتّم الخلفية كثيراً لأنّ السؤال غالباً عمّا عليها. */}
            {activePoll?.open && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center p-3 sm:p-4">
                <div
                  className="bz-poll-in pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border"
                  style={{
                    background: "rgba(255,255,255,.97)",
                    borderColor: "var(--bz-blue-100)",
                    backdropFilter: "saturate(180%) blur(12px)",
                    WebkitBackdropFilter: "saturate(180%) blur(12px)",
                    boxShadow:
                      "0 0 0 1px rgba(19,23,34,.05), 0 18px 44px -12px rgba(19,23,34,.28)",
                  }}
                >
                  <div className="flex items-center gap-2 border-b border-[var(--bz-line)] bg-[var(--bz-blue-050)] px-3.5 py-2">
                    <Icon name="poll" size={14} className="text-[var(--bz-blue)]" />
                    <span className="text-[12px] font-extrabold text-[var(--bz-blue-700)]">
                      استفتاء مباشر
                    </span>
                    <span className="flex-1" />
                    {isOwner && (
                      <span className="text-[10.5px] font-bold text-[var(--bz-ink-3)]">
                        أنت صاحب الاستفتاء — لا تصوّت فيه
                      </span>
                    )}
                  </div>
                  <div className="max-h-[52vh] overflow-y-auto">
                    <RoomPollPanel
                      roomId={roomId}
                      poll={activePoll}
                      isOwner={isOwner}
                      myUid={user?.uid ?? ""}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* تحدّي الحصة — مساحة حل خاصة بكل طالب */}
            {!isOwner && !exam && (
              <StudentChallengeLayer
                roomId={roomId}
                uid={user.uid}
                name={user.displayName || "طالب"}
                subject={room?.subject}
                roomName={room?.name}
              />
            )}

            {/* مؤقّت الدرس — يظهر للجميع */}
            {/* المؤقّت كان يُخفى في وضع التركيز — وهو أحوج ما يكون
                إليه هناك. يظهر الآن دائماً إلّا في قاعة الامتحان
                (لها مؤقّتها الخاصّ). */}
            <RoomTimerDisplay roomId={roomId} isOwner={isOwner} hidden={Boolean(exam)} />
          </div>

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

          {/* مضيف موحّد لكل نوافذ الغرفة. وجوده داخل المسرح يجعل
              BottomSheet وFloatingAssistant وواجهات الأدوات تظهر داخل
              الشاشة الكاملة بدل أن تُركّب خلفها على body. */}
          <div id="bz-room-overlay-root" className="pointer-events-none absolute inset-0 z-[2147483500]" />
        </section>

        {/* ══ الرصيف ══
            لوحة واحدة بتبويبات: الدردشة، الصفّ (ومعه المحظورون
            وفكّ الحظر — وكانت قائمة لا تُفتح أبداً)، والأسئلة
            المجهولة التي كانت مدفونة في ورقة للمالك وحده. */}
        {/* 🐛 كان `lg:block` أي 1024px: فاللوح العمودي (iPad 768–820)
            لم يكن يرى الرصيف إطلاقاً — لا دردشة ولا صفّ — مع أنّ في
            شاشته متّسعاً واسعاً. يظهر الآن من 768px بعرض متدرّج. */}
        {hasSideDock && !focusMode && !stateHidesSidePanels && (
          <aside className="w-[240px] shrink-0 border-s border-border lg:w-[272px] xl:w-[300px] 2xl:w-[320px]">
            <RoomDock
              tab={dockTab}
              onTab={setDockTab}
              chatEnabled={!stateHidesChat}
              handsCount={handsQueue.length}
              unreadChat={unreadChat}
              unansweredAnon={anonQs.filter((q) => !q.answered).length}
              showQuestions={isOwner}
              roomId={roomId}
              banned={banned}
              isOwner={isOwner}
              chatPanel={<ChatPanel roomId={roomId} isOwner={isOwner} canModerate={isPrivileged} />}
              classPanel={
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
              }
              questionsPanel={<AnonQuestionsList roomId={roomId} questions={anonQs} />}
            />
          </aside>
        )}
      </div>

      {/* ══ شريط التحكّم الواحد ══
          يجمع في مكان واحد ما كان موزّعاً على: شريط الصوت، ورفّ
          الأيقونات، وشريط أدوات الهاتف، والزرّ العائم، ودرج «إجراءات
          الحصة»، ودرج «وظائف الطالب». نفسه للأستاذ وللتلميذ وعلى كل
          المقاسات — والتلميذ لم يكن له تنقّل على الهاتف إطلاقاً. */}
      {(
        <RoomControlBar
          isOwner={isOwner}
          isPrivileged={isPrivileged}
          tool={tool}
          onPickTool={(t) => isOwner && setTool(t)}
          voiceSlot={<RoomVoiceBar roomId={roomId} isOwner={isOwner} embedded />}
          memberCount={members.length}
          handsCount={handsQueue.length}
          myHand={myHand}
          onToggleHand={toggleHand}
          onOpenClass={() => { setDockTab("class"); if (!hasSideDock || focusMode) setParticipantsOpen(true); }}
          onOpenChat={() => { setDockTab("chat"); if (!hasSideDock || focusMode) setParticipantsOpen(true); }}
          unreadChat={unreadChat}
          chatDisabled={stateHidesChat}
          onPoll={isOwner ? () => setShowCreatePoll(true) : undefined}
          onChallenge={isOwner ? () => (challenge ? setChallengePanelOpen(true) : setChallengeCreateOpen(true)) : undefined}
          hasChallenge={Boolean(challenge)}
          onTimer={isOwner ? () => setTimerOpen(true) : undefined}
          onAnon={isOwner ? () => setAnonOpen(true) : undefined}
          unansweredAnon={anonQs.filter((q) => !q.answered).length}
          onExamSim={isOwner ? () => (exam ? setExamGradingOpen(true) : setExamSetupOpen(true)) : undefined}
          hasExam={Boolean(exam)}
          onGradePapers={isOwner ? () => setExamGradingOpen(true) : undefined}
          ownerStatus={isOwner ? ownerStatus : undefined}
          onPickStatus={isOwner ? (st) => setOwnerStatus(roomId, st) : undefined}
          onShare={shareRoomLink}
          onInvite={isPrivileged ? () => setInviteOpen(true) : undefined}
          onAccessCode={isOwner && room?.isPaid ? generateAccessCode : undefined}
          onFocus={() => { if (isOwner) { void enterFullscreen(); } else { void enterStudentFocus(); } }}
          focusActive={fullscreen || studentFocus}
          onStudentFiles={!isOwner ? () => setFocusSheet("files") : undefined}
          onStudentNotes={!isOwner ? () => setFocusSheet("notes") : undefined}
          onStudentCards={!isOwner ? () => setFocusSheet("cards") : undefined}
          onAskAnon={!isOwner ? () => setStudentAskOpen(true) : undefined}
          onRateTeacher={!isOwner && room?.ownerId && room?.ownerRole === "teacher" ? () => setRateOpen(true) : undefined}
          onRateRoom={!isOwner && room?.isPaid && roomAccess ? () => setRateRoomOpen(true) : undefined}
          onSaveCard={quickSaveCard}
          roomState={roomState}
          roomStates={isOwner ? ROOM_STATES.map((st) => ({ id: st.id, label: st.label })) : undefined}
          onRoomState={isOwner ? (id) => setRoomState(id as typeof roomState) : undefined}
        />
      )}

      {/* ورقة سؤال مجهول للتلميذ — الميزة كانت متاحة في وضع التركيز
          وحده، فلم يجدها من لم يدخل ذلك الوضع. */}
      {!isOwner && (
        <BottomSheet open={studentAskOpen} onClose={() => setStudentAskOpen(false)} title="اسأل الأستاذ بلا اسمك">
          <AnonAskForm onSend={(q) => { submitAnonQuestion(q); setStudentAskOpen(false); }} />
        </BottomSheet>
      )}

      {/* نافذة إنشاء استفتاء */}
      {showCreatePoll && isOwner && (
        <CreatePollModal roomId={roomId} onClose={() => setShowCreatePoll(false)} />
      )}

      {/* أدراج الوظائف الثانوية — على مستوى الصفحة عمداً: يفتحها المساعد
          العائم في الغرفة العادية أيضاً، لا في وضع التركيز وحده. */}
      <BottomSheet open={focusSheet === "files"} onClose={() => setFocusSheet(null)} title="ملفات الغرفة" maxHeight="80vh">
        <div className="h-[68vh]"><RoomFiles roomId={roomId} isOwner={isOwner} /></div>
      </BottomSheet>
      <BottomSheet open={focusSheet === "notes"} onClose={() => setFocusSheet(null)} title="ملاحظات الدرس" maxHeight="80vh">
        <div className="h-[68vh]"><RoomNotes roomId={roomId} isOwner={isOwner} canEdit={isPrivileged} roomName={room?.name ?? "الغرفة"} /></div>
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

      {/* حُذف «ملخّص الحصة»: الملاحظات تؤدّي الغرض نفسه، وميزتان
          تفعلان الشيء ذاته تُربكان الأستاذ ولا تخدمانه. */}

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

/* نموذج السؤال المجهول — كان داخل وضع تركيز الطالب وحده، فصار
   ورقةً مستقلّة يفتحها شريط التحكّم في كل الأوضاع. */
function AnonAskForm({ onSend }: { onSend: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="pb-2">
      <p className="mb-2 text-[12.5px] leading-relaxed text-text-muted">
        سؤالك يصل الأستاذ بلا اسمك. اكتب سؤالاً واحداً واضحاً.
      </p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={4}
        dir="auto"
        maxLength={500}
        placeholder="مثال: لم أفهم شرط مجال التعريف في المثال الثاني…"
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={!q.trim()}
        onClick={() => { onSend(q.trim()); setQ(""); }}
        className="mt-2 w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
      >
        إرسال السؤال
      </button>
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
        <p className="mt-1 text-sm text-text-muted">غرفة مدفوعة — ادفع بالبطاقة أو أدخل كود وصول</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-600">
          <FontAwesomeIcon icon={faLock} className="h-3 w-3" /> {room.price} دج
        </div>

        {/* الدفع الفوري أوّلاً — أسرع طريق. ومن لا يملك بطاقة يجد
            البديلين تحته: الكود، والتواصل مع الإدارة. */}
        <ChargilyPayButton
          itemType="room"
          itemId={room.id}
          price={room.price ?? 0}
          uid={uid}
          className="mt-4 text-right"
        />

        <button onClick={() => setShowPay(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-bold text-text-muted transition hover:border-primary hover:text-primary active:scale-95">
          أو ادفع بالتواصل مع الإدارة
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
