"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { RoomNotes } from "@/features/rooms/room-notes";
import { WaitingScreen } from "@/features/rooms/waiting-screen";
import { Icon, type IconName } from "@/components/ui/icon";
import { useMediaQuery } from "@/lib/use-media";
import { RATIO_MIN, RATIO_MAX } from "@/features/rooms/use-stage-split";
import type { RoomTool } from "@/features/rooms/use-active-tool";
import type { OwnerStatus } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   مسرح الغرفة — سطحان بلا إعادة تركيب

   ── المشكلة التي يحلّها ──
   الأستاذ يعرض فيديو، يوقفه، يفتح السبورة ليشرح نقطة، ثمّ يعيد
   التشغيل. أو يوقف محاكاة البكالوريا ويشرح على السبورة بجانب
   الموضوع. سطحٌ واحد في كل لحظة كان يجعل هذا مستحيلاً.

   ── لماذا شبكة CSS لا إعادة تركيب ──
   نقل مكوّن بين أبوين في React **إعادةُ تركيب**: الفيديو يعود إلى
   بدايته ويُعاد تحميل المشغّل، والسبورة تُمسح ويُفقد التكبير. لذلك
   تبقى الأسطح كلّها **أبناءً مباشرين للشبكة نفسها**، ولا يتغيّر
   إلّا `grid-area` لكلّ منها: من منطقة «أ» إلى «ب» أو إلى الخفاء.
   العنصر نفسه ينتقل بصريّاً وهو حيّ — هذا هو أساس الميزة كلّها.

   والمخفيّ يبقى في المنطقة الأولى بـ`visibility: hidden` لا
   `display: none`: الأولى تُبقي الأبعاد فيبقى `ResizeObserver` في
   السبورة صحيحاً، والثانية تعطي مقاس صفر فتتشوّه اللوحة عند العودة.

   ── التجاوب: الأستاذ يبثّ النيّة، والجهاز يعرضها بقدره ──
     ≥1024 أو هاتف أفقي عريض → جنباً إلى جنب بفاصل يُسحب
     لوح عموديّ 768–1023      → فوق وتحت بنفس الفاصل
     هاتف عموديّ              → شاشة واحدة + مبدّل بينهما
   سبورة 16:9 في نصف شاشة عرضها 390px غير مقروءة — والصدق في ذلك
   أنفع من تقسيمٍ يُرضي المواصفة ويُتعب العين.

   ── قاعة الامتحان ──
   شكلها لم يُمسّ. تحتلّ المنطقة الأولى، ويمكن أن تجلس السبورة إلى
   جانبها في الثانية — وهو بالضبط ما يحتاجه الأستاذ حين يوقف الوقت
   ليشرح.
   ════════════════════════════════════════════════════════════ */

const loadingTool = () => (
  <div className="grid h-full place-items-center text-text-muted">
    <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
  </div>
);

const VideoSync = dynamic(() => import("@/features/video/video-sync").then((m) => m.VideoSync), { ssr: false, loading: loadingTool });
const Whiteboard = dynamic(() => import("@/features/whiteboard/whiteboard").then((m) => m.Whiteboard), { ssr: false, loading: loadingTool });
const RoomFiles = dynamic(() => import("@/features/rooms/room-files").then((m) => m.RoomFiles), { ssr: false, loading: loadingTool });

export const TOOL_LABEL: Record<RoomTool, { label: string; icon: IconName }> = {
  welcome: { label: "مرحباً", icon: "home" },
  video: { label: "الفيديو", icon: "video" },
  whiteboard: { label: "السبورة", icon: "layers" },
  files: { label: "الملفّات", icon: "file" },
  notes: { label: "الملاحظات", icon: "note" },
};

export interface RoomStageProps {
  roomId: string;
  roomName: string;
  subject?: string;
  isOwner: boolean;
  isPrivileged: boolean;
  /** الشاشة الأولى — `activeTool` المزامَن كما هو */
  tool: RoomTool;
  /** الشاشة الثانية — `null` يعني شاشة واحدة */
  second: RoomTool | null;
  ratio: number;
  memberCount: number;
  ownerStatus: OwnerStatus;
  onPickTool?: (t: RoomTool) => void;
  onRatio?: (r: number) => void;
  /** تبديل موضع الشاشتين */
  onSwap?: () => void;
  /** إغلاق الشاشة الثانية */
  onCloseSecond?: () => void;
  /** جعل سطحٍ ما هو الشاشة الوحيدة */
  onExpand?: (t: RoomTool) => void;
  examLayer?: React.ReactNode;
  /** الامتحان موقوف مؤقّتاً — يظهر في شارة اللوحة */
  examPaused?: boolean;
}

type Mode = "row" | "col" | "single";

/* ── لوحة واحدة: الغلاف الذي ينتقل بين المناطق ── */
function Pane({
  area, visible, head, children,
}: { area: "a" | "b"; visible: boolean; head?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="bz-pane relative flex min-h-0 min-w-0 flex-col overflow-hidden"
      style={{
        gridArea: area,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        zIndex: visible ? 2 : 1,
      }}
      aria-hidden={!visible}
      inert={!visible}
    >
      {head}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

/* ── رأس اللوحة: اسمها وأفعالها ──
   🐛 كان شارةً **تطفو** فوق السطح، فتجلس على شريط رابط الفيديو
   وعلى أدوات السبورة وتحجب جزءاً منها. الرأس الآن يأخذ ارتفاعه في
   التخطيط (28px) فينزل السطح تحته: لا تراكب ولا حجب مهما كان
   السطح — وهو ما تفعله محرّرات النوافذ المنقسمة كلّها.
   ولا يظهر إلّا في وضع الشاشتين: بشاشة واحدة لا شيء يتغيّر. */
function PaneHead({
  tool, isOwner, onSwap, onClose, onExpand, paused, examOn,
}: {
  tool: RoomTool;
  isOwner: boolean;
  onSwap?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  paused?: boolean;
  examOn?: boolean;
}) {
  const meta = examOn ? { label: "قاعة الامتحان", icon: "graduation" as IconName } : TOOL_LABEL[tool];
  return (
    <div className="bz-panehead flex h-7 shrink-0 items-center gap-1.5 border-b border-[var(--bz-line)] px-2">
      <Icon name={meta.icon} size={12} className="text-[var(--bz-blue)]" />
      <span className="truncate text-[10.5px] font-extrabold text-[var(--bz-ink)]">{meta.label}</span>
      {paused && (
        <span className="shrink-0 rounded-md bg-[var(--bz-amber-050)] px-1.5 text-[9.5px] font-extrabold text-[var(--bz-amber)]">
          الوقت موقوف
        </span>
      )}
      <span className="flex-1" />
      {isOwner && (
        <span className="flex shrink-0 items-center gap-0.5">
          <button type="button" title="تبديل الشاشتين" aria-label="تبديل الشاشتين"
            onClick={onSwap}
            className="grid h-6 w-6 place-items-center rounded-lg text-[var(--bz-ink-3)] transition hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue)]">
            <Icon name="redo" size={12} />
          </button>
          <button type="button" title="اجعلها الشاشة الوحيدة" aria-label="اجعلها الشاشة الوحيدة"
            onClick={onExpand}
            className="grid h-6 w-6 place-items-center rounded-lg text-[var(--bz-ink-3)] transition hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue)]">
            <Icon name="expand" size={12} />
          </button>
          <button type="button" title="إغلاق الشاشة الثانية" aria-label="إغلاق الشاشة الثانية"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-lg text-[var(--bz-ink-3)] transition hover:bg-danger/10 hover:text-danger">
            <Icon name="close" size={12} />
          </button>
        </span>
      )}
    </div>
  );
}

export function RoomStage({
  roomId, roomName, subject, isOwner, isPrivileged,
  tool, second, ratio, memberCount, ownerStatus,
  onPickTool, onRatio, onSwap, onCloseSecond, onExpand,
  examLayer, examPaused,
}: RoomStageProps) {
  const mounted = useRef<Set<RoomTool>>(new Set([tool]));
  mounted.current.add(tool);
  if (second) mounted.current.add(second);
  const has = (t: RoomTool) => mounted.current.has(t);
  useEffect(() => {
    mounted.current.add(tool);
    if (second) mounted.current.add(second);
  }, [tool, second]);

  const examOn = Boolean(examLayer);
  const split = Boolean(second) && second !== tool;

  /* ── وضع العرض: قياس الجهاز لا تخمينه ── */
  const wide = useMediaQuery("(min-width: 1024px)");
  const wideLandscape = useMediaQuery("(min-width: 700px) and (max-height: 560px) and (orientation: landscape)");
  const tablet = useMediaQuery("(min-width: 768px)");
  const mode: Mode = !split ? "single" : wide || wideLandscape ? "row" : tablet ? "col" : "single";

  /* الهاتف العموديّ: شاشة واحدة ومبدّل — أيّهما تُعرض قرارٌ محلّي
     لكل جهاز، فلا يفرض الأستاذ على هاتفٍ ما لا يتّسع له. */
  const [phonePick, setPhonePick] = useState<"a" | "b">("a");
  useEffect(() => { if (!split) setPhonePick("a"); }, [split]);
  const singleSplit = split && mode === "single";
  const showA = !singleSplit || phonePick === "a";
  const showB = split && (!singleSplit || phonePick === "b");

  /* ── الشبكة ──
     المنطقة «أ» أوّلاً في التدفّق، فتقع يميناً في الاتجاه العربي. */
  const gridStyle = useMemo((): React.CSSProperties => {
    if (mode === "row") {
      return {
        gridTemplateColumns: `${(ratio * 100).toFixed(2)}% 8px minmax(0,1fr)`,
        gridTemplateRows: "minmax(0,1fr)",
        gridTemplateAreas: `"a d b"`,
      };
    }
    if (mode === "col") {
      return {
        gridTemplateRows: `${(ratio * 100).toFixed(2)}% 8px minmax(0,1fr)`,
        gridTemplateColumns: "minmax(0,1fr)",
        gridTemplateAreas: `"a" "d" "b"`,
      };
    }
    return {
      gridTemplateColumns: "minmax(0,1fr)",
      gridTemplateRows: "minmax(0,1fr)",
      gridTemplateAreas: `"a"`,
    };
  }, [mode, ratio]);

  /* ── سحب الفاصل ── */
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const lastWrite = useRef(0);
  const [localRatio, setLocalRatio] = useState<number | null>(null);
  const shown = localRatio ?? ratio;

  const applyRatio = useCallback((clientX: number, clientY: number, final: boolean) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    let r: number;
    if (mode === "row") {
      /* الاتجاه عربيّ: المنطقة الأولى على اليمين، فالنسبة تُقاس من
         الحافّة اليمنى لا اليسرى. */
      r = (box.right - clientX) / box.width;
    } else {
      r = (clientY - box.top) / box.height;
    }
    r = Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));
    setLocalRatio(r);
    const now = Date.now();
    /* خنق الكتابة: السحب يُطلق عشرات الأحداث في الثانية، وكلّ واحدة
       كتابةٌ في قاعدة البيانات. 120ms تكفي لإحساس اللحظية، والكتابة
       النهائية مضمونة عند الإفلات. */
    if (final || now - lastWrite.current > 120) {
      lastWrite.current = now;
      onRatio?.(r);
    }
  }, [mode, onRatio]);

  useEffect(() => {
    if (!isOwner) return;
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      applyRatio(e.clientX, e.clientY, false);
    };
    const up = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      applyRatio(e.clientX, e.clientY, true);
      setLocalRatio(null);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [isOwner, applyRatio]);

  const gridWithRatio: React.CSSProperties = useMemo(() => {
    if (mode === "row") {
      return { ...gridStyle, gridTemplateColumns: `${(shown * 100).toFixed(2)}% 8px minmax(0,1fr)` };
    }
    if (mode === "col") {
      return { ...gridStyle, gridTemplateRows: `${(shown * 100).toFixed(2)}% 8px minmax(0,1fr)` };
    }
    return gridStyle;
  }, [gridStyle, mode, shown]);

  /* 🐛 المنطقة «ب» لا وجود لها في الشبكة ذات الشاشة الواحدة. ووضعُ
     عنصرٍ في منطقة غير معرَّفة يفتح **مساراً ضمنياً** جديداً في
     الشبكة يقتطع من عرض المسار الأوّل — فظهرت اللوحة على الهاتف
     العموديّ بنصف العرض وإلى جانبها فراغ. لذلك: بشاشة واحدة كل
     الأسطح في «أ»، والظاهر منها واحد. */
  const areaOf = (t: RoomTool): "a" | "b" =>
    split && mode !== "single" && t === second && t !== tool ? "b" : "a";
  /* الرأس لا يظهر إلّا بشاشتين — شاشة واحدة تبقى كما كانت تماماً */
  const headFor = (t: RoomTool) =>
    split ? (
      <PaneHead
        tool={t}
        isOwner={isOwner}
        onSwap={onSwap}
        onClose={onCloseSecond}
        onExpand={() => onExpand?.(t)}
      />
    ) : undefined;
  const visibleOf = (t: RoomTool) => {
    if (examOn && t !== second) return false;          // الامتحان يحتلّ المنطقة الأولى
    if (t === tool) return showA;
    if (split && t === second) return showB;
    return false;
  };

  return (
    <div
      ref={boxRef}
      className="bz-stage relative grid min-h-0 flex-1 overflow-hidden"
      data-split={split ? "1" : undefined}
      data-mode={mode}
      style={gridWithRatio}
    >
      {has("welcome") && (
        <Pane area={areaOf("welcome")} visible={visibleOf("welcome")} head={headFor("welcome")}>
          <WaitingScreen
            isOwner={isOwner}
            roomName={roomName}
            memberCount={memberCount}
            ownerStatus={ownerStatus}
            onPick={isOwner ? onPickTool : undefined}
          />
        </Pane>
      )}
      {has("video") && (
        <Pane area={areaOf("video")} visible={visibleOf("video")} head={headFor("video")}>
          <VideoSync roomId={roomId} isOwner={isOwner} />
        </Pane>
      )}
      {has("whiteboard") && (
        <Pane area={areaOf("whiteboard")} visible={visibleOf("whiteboard")} head={headFor("whiteboard")}>
          <Whiteboard roomId={roomId} canDraw={isOwner} roomName={roomName} subject={subject} />
        </Pane>
      )}
      {has("files") && (
        <Pane area={areaOf("files")} visible={visibleOf("files")} head={headFor("files")}>
          <RoomFiles roomId={roomId} isOwner={isOwner} />
        </Pane>
      )}
      {has("notes") && (
        <Pane area={areaOf("notes")} visible={visibleOf("notes")} head={headFor("notes")}>
          <RoomNotes roomId={roomId} isOwner={isOwner} canEdit={isPrivileged} roomName={roomName} />
        </Pane>
      )}

      {/* قاعة الامتحان — شكلها كما هو، وتحتلّ المنطقة الأولى فتبقى
          السبورة إلى جانبها في الثانية حين يوقف الأستاذ الوقت. */}
      {examOn && (
        <div
          className="bz-pane relative z-[3] flex min-h-0 min-w-0 flex-col overflow-hidden bg-background"
          style={{ gridArea: "a", visibility: showA ? "visible" : "hidden" }}
        >
          {split && (
            <PaneHead
              tool={tool}
              examOn
              paused={examPaused}
              isOwner={isOwner}
              onSwap={onSwap}
              onClose={onCloseSecond}
              onExpand={() => onExpand?.(tool)}
            />
          )}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{examLayer}</div>
        </div>
      )}

      {/* الفاصل: خطّ شعريّ فيه مقبض يظهر عند الاقتراب */}
      {split && mode !== "single" && (
        <div
          className={`bz-divider group relative z-[6] ${mode === "row" ? "cursor-col-resize" : "cursor-row-resize"} ${
            isOwner ? "" : "pointer-events-none"
          }`}
          style={{ gridArea: "d" }}
          role={isOwner ? "separator" : undefined}
          aria-label={isOwner ? "غيّر حجم الشاشتين" : undefined}
          aria-orientation={mode === "row" ? "vertical" : "horizontal"}
          onPointerDown={(e) => {
            if (!isOwner) return;
            dragging.current = true;
            document.body.style.cursor = mode === "row" ? "col-resize" : "row-resize";
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onDoubleClick={() => { if (isOwner) { setLocalRatio(0.5); onRatio?.(0.5); setTimeout(() => setLocalRatio(null), 60); } }}
        >
          <span className="bz-divider-grip" aria-hidden="true" />
        </div>
      )}

      {/* الهاتف العموديّ: مبدّل بين الشاشتين بدل تقسيمٍ لا يُقرأ */}
      {singleSplit && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[7] flex justify-center" style={{ gridArea: "a" }}>
          <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-surface)]/95 p-1 shadow-lg backdrop-blur">
            {([["a", examOn ? "الامتحان" : TOOL_LABEL[tool].label, examOn ? ("book" as IconName) : TOOL_LABEL[tool].icon],
               ["b", TOOL_LABEL[second as RoomTool].label, TOOL_LABEL[second as RoomTool].icon]] as const).map(([k, label, icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPhonePick(k as "a" | "b")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                  phonePick === k
                    ? "bg-[var(--bz-blue)] text-white"
                    : "text-[var(--bz-ink-3)] hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue)]"
                }`}
              >
                <Icon name={icon as IconName} size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
