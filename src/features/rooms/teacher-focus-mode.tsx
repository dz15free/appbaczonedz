"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCompress, faComments, faHand, faUserSecret, faFolderOpen, faUsers,
  faChartBar, faShareNodes, faKey, faGripVertical, faXmark, faEllipsis,
  faChalkboard, faBrain, faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StatusDot } from "@/components/ui/status-dot";
import { useTimerLabel } from "@/features/rooms/room-timer";
import type { OwnerStatus, RaisedHand } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   Teacher Focus Mode — وضع تركيز الأستاذ

   الفلسفة: ثلاث طبقات فوق المسرح
     1) المسرح  — السبورة/PDF/الفيديو، يأخذ كل المساحة (يبقى كما هو، لا يُعاد بناؤه)
     2) الأدوات — شريط عائم قابل للنقل، يختفي تلقائياً بعد سكون
     3) اللوحات — لوحة جانبية واحدة بتبويبات، لا تظهر إلا عند فتحها

   هذا المكوّن *طبقة* تُرسم داخل مسرح الغرفة، وليس غلافاً حول المحتوى،
   حتى لا تُفكَّك السبورة وتُعاد تهيئتها عند الدخول أو الخروج.
════════════════════════════════════════════════════════════ */

export type FocusSide = "right" | "left" | "bottom";
const POS_KEY = "bz_tfocus_toolbar_side";
const IDLE_MS = 3000;

export interface TeacherFocusProps {
  roomId: string;
  roomName: string;
  memberCount: number;
  ownerStatus: OwnerStatus;
  onCycleStatus: () => void;
  /* الأدوات */
  tools: { id: string; label: string; icon: IconDefinition }[];
  activeTool: string;
  onPickTool: (id: string) => void;
  /* إجراءات الحصة */
  timerButton: ReactNode;          // زر المؤقّت الحالي (يُعاد استعماله كما هو)
  onCreatePoll: () => void;
  onChallenge: () => void;         // إنشاء تحدٍّ أو فتح لوحته
  onSummary: () => void;           // ملخّص الحصة
  hasChallenge: boolean;
  challengePanel: ReactNode;
  onShare: () => void;
  onGenerateCode?: () => void;     // للغرف المدفوعة فقط
  /* اللوحات */
  chatPanel: ReactNode;
  filesPanel: ReactNode;
  participantsPanel: ReactNode;
  questionsPanel: ReactNode;
  /* عدّادات */
  unreadChat: number;
  hands: RaisedHand[];
  onLowerHand: (uid: string) => void;
  onGrantMic: (uid: string) => void;
  unansweredCount: number;
  /* خروج */
  onExit: () => void;
}

type TabId = "chat" | "hands" | "questions" | "files" | "people" | "challenge";

export function TeacherFocusMode(props: TeacherFocusProps) {
  const [side, setSide] = useState<FocusSide>("right");
  const [tab, setTab] = useState<TabId | null>(null);
  const [sheet, setSheet] = useState<TabId | "more" | "tools" | null>(null);
  const [idle, setIdle] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── الموضع المحفوظ محلياً (لا يستهلك قاعدة البيانات) ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY) as FocusSide | null;
      if (saved === "right" || saved === "left" || saved === "bottom") setSide(saved);
    } catch { /* التخزين المحلي قد يكون معطّلاً */ }
  }, []);

  const saveSide = useCallback((s: FocusSide) => {
    setSide(s);
    try { localStorage.setItem(POS_KEY, s); } catch { /* تجاهل */ }
  }, []);

  /* ── حجم الشاشة ── */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  /* ── الإخفاء التلقائي: يعود أي شيء ظاهراً عند أي حركة ── */
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => {
    // لا نُخفي شيئاً واللوحة مفتوحة أو الشريط قيد السحب أو على الهاتف
    if (tab || drag || mobile) {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    wake();
    const ev: (keyof WindowEventMap)[] = ["mousemove", "pointerdown", "keydown", "wheel"];
    ev.forEach((e) => window.addEventListener(e, wake));
    return () => {
      ev.forEach((e) => window.removeEventListener(e, wake));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [tab, drag, mobile, wake]);

  /* ── اختصارات لوحة المفاتيح (الحاسوب) ── */
  useEffect(() => {
    if (mobile) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { if (tab) setTab(null); else props.onExit(); return; }
      if (k === "c") setTab((v) => (v === "chat" ? null : "chat"));
      else if (k === "h") setTab((v) => (v === "hands" ? null : "hands"));
      else if (k === "q") setTab((v) => (v === "questions" ? null : "questions"));
      else if (k === "f") setTab((v) => (v === "files" ? null : "files"));
      else if (k >= "1" && k <= "5") {
        const t2 = props.tools[Number(k) - 1];
        if (t2) props.onPickTool(t2.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, tab, props.tools, props.onExit, props.onPickTool]);

  /* ── سحب الشريط العائم: يلتصق بأقرب حافة عند الإفلات ── */
  function onGripDown(e: React.PointerEvent) {
    if (mobile) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY });
  }
  function onGripMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ x: e.clientX, y: e.clientY });
  }
  function onGripUp(e: React.PointerEvent) {
    if (!drag) return;
    const { innerWidth: w, innerHeight: h } = window;
    const moved = Math.abs(e.clientX - drag.x) > 4 || Math.abs(e.clientY - drag.y) > 4;
    if (!moved) {
      // نقرة بلا سحب → تنقّل بين المواضع الثلاثة
      saveSide(side === "right" ? "left" : side === "left" ? "bottom" : "right");
    } else {
      const fromBottom = h - e.clientY;
      if (fromBottom < h * 0.22) saveSide("bottom");
      else saveSide(e.clientX > w / 2 ? "right" : "left");
    }
    setDrag(null);
  }

  // اللوحة المفتوحة تدفع المفاتيح جانباً، والشريط العائم على اليسار يدفعها لليمين
  const railPos: React.CSSProperties = tab
    ? { left: 352 }
    : side === "left"
      ? { right: 12 }
      : { left: 12 };

  const hidden = idle && !mobile;
  const chromeCls = `bz-tfocus-chrome${hidden ? " bz-tfocus-idle" : ""}`;

  const statusText = props.ownerStatus === "available" ? "متفرّغ" : props.ownerStatus === "busy" ? "مشغول" : "سأعود";

  /* ═══════════ الشريط العلوي (مشترك) ═══════════ */
  const topBar = (
    <div className={`bz-tfocus-top ${chromeCls}`}>
      <button
        onClick={props.onExit}
        title="خروج من وضع التركيز (Esc)"
        aria-label="خروج من وضع التركيز"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-text-muted transition hover:bg-primary/10 hover:text-primary active:scale-95"
      >
        <FontAwesomeIcon icon={faCompress} className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[13px] font-bold leading-tight text-text-primary">{props.roomName}</h1>
        <p className="truncate text-[10px] leading-tight text-text-muted">{props.memberCount} متصل</p>
      </div>

      <FocusTimerChip roomId={props.roomId} />

      <button
        onClick={props.onCycleStatus}
        title="تغيير حالتك"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-bold text-text-primary transition hover:bg-primary/10"
      >
        <StatusDot status={props.ownerStatus} size={9} />
        <span className="hidden sm:inline">{statusText}</span>
      </button>
    </div>
  );

  /* ═══════════ إجراءات الشريط العائم ═══════════ */
  const actions: { id: string; icon: IconDefinition; label: string; onClick: () => void; badge?: number; active?: boolean }[] = [
    ...props.tools.map((t) => ({
      id: `tool-${t.id}`, icon: t.icon, label: t.label,
      onClick: () => props.onPickTool(t.id), active: props.activeTool === t.id,
    })),
    { id: "challenge", icon: faBrain, label: props.hasChallenge ? "لوحة التحدي" : "تحدٍّ جديد", onClick: props.onChallenge, active: props.hasChallenge },
    { id: "poll", icon: faChartBar, label: "استفتاء", onClick: props.onCreatePoll },
    { id: "summary", icon: faFileLines, label: "ملخّص الحصة", onClick: props.onSummary },
    { id: "share", icon: faShareNodes, label: "مشاركة الرابط", onClick: props.onShare },
    ...(props.onGenerateCode ? [{ id: "code", icon: faKey, label: "كود وصول", onClick: props.onGenerateCode }] : []),
  ];

  const vertical = side !== "bottom";

  /* ═══════════ تجربة الهاتف ═══════════ */
  if (mobile) {
    return (
      <>
        {topBar}

        <div className="bz-tfocus-bottombar">
          <MobileBtn icon={faChalkboard} label="الأداة" onClick={() => setSheet("tools")} />
          <MobileBtn icon={faUsers} label="الطلاب" badge={props.hands.length} onClick={() => setSheet("hands")} />
          <MobileBtn icon={faComments} label="الدردشة" badge={props.unreadChat} onClick={() => setSheet("chat")} />
          <MobileBtn icon={faUserSecret} label="أسئلة" badge={props.unansweredCount} onClick={() => setSheet("questions")} />
          <MobileBtn icon={faEllipsis} label="المزيد" onClick={() => setSheet("more")} />
        </div>

        <BottomSheet open={sheet === "tools"} onClose={() => setSheet(null)} title="ما الذي تعرضه الآن؟">
          <div className="grid grid-cols-3 gap-2 pb-2">
            {props.tools.map((t) => (
              <button
                key={t.id}
                onClick={() => { props.onPickTool(t.id); setSheet(null); }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3.5 text-xs font-bold transition active:scale-95 ${
                  props.activeTool === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted"
                }`}
              >
                <FontAwesomeIcon icon={t.icon} className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </div>
        </BottomSheet>

        <BottomSheet open={sheet === "chat"} onClose={() => setSheet(null)} title="الدردشة" maxHeight="80vh">
          <div className="h-[66vh]">{props.chatPanel}</div>
        </BottomSheet>

        <BottomSheet open={sheet === "hands"} onClose={() => setSheet(null)} title="الطلاب ورفع اليد" maxHeight="80vh">
          <HandsList hands={props.hands} onLower={props.onLowerHand} onGrantMic={props.onGrantMic} />
          <div className="mt-2 h-[46vh] border-t border-border pt-2">{props.participantsPanel}</div>
        </BottomSheet>

        <BottomSheet open={sheet === "questions"} onClose={() => setSheet(null)} title="الأسئلة المجهولة" maxHeight="80vh">
          <div className="max-h-[66vh]">{props.questionsPanel}</div>
        </BottomSheet>

        <BottomSheet open={sheet === "more"} onClose={() => setSheet(null)} title="أدوات الحصة">
          <div className="space-y-2 pb-2">
            <div className="flex flex-wrap items-center gap-2">{props.timerButton}</div>
            <SheetRow icon={faBrain} label={props.hasChallenge ? "لوحة حلول التحدي" : "تحدٍّ جديد"} onClick={() => { setSheet(null); props.onChallenge(); }} />
            <SheetRow icon={faFileLines} label="ملخّص الحصة" onClick={() => { setSheet(null); props.onSummary(); }} />
            <SheetRow icon={faChartBar} label="استفتاء سريع" onClick={() => { setSheet(null); props.onCreatePoll(); }} />
            <SheetRow icon={faFolderOpen} label="ملفات الغرفة" onClick={() => setSheet("files")} />
            <SheetRow icon={faShareNodes} label="مشاركة رابط الغرفة" onClick={() => { setSheet(null); props.onShare(); }} />
            {props.onGenerateCode && (
              <SheetRow icon={faKey} label="توليد كود وصول" onClick={() => { setSheet(null); props.onGenerateCode!(); }} />
            )}
          </div>
        </BottomSheet>

        <BottomSheet open={sheet === "files"} onClose={() => setSheet(null)} title="ملفات الغرفة" maxHeight="80vh">
          <div className="h-[66vh]">{props.filesPanel}</div>
        </BottomSheet>
      </>
    );
  }

  /* ═══════════ تجربة الحاسوب ═══════════ */
  return (
    <>
      {topBar}

      {/* الشريط العائم */}
      <div
        className={`bz-tfocus-toolbar bz-tfocus-${side} ${chromeCls}`}
        style={drag ? { transition: "none" } : undefined}
      >
        <button
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          title="اسحب لتغيير الموضع (أو انقر للتنقّل: يمين ← يسار ← أسفل)"
          aria-label="نقل شريط الأدوات"
          className={`grid shrink-0 cursor-grab touch-none place-items-center rounded-md text-text-muted transition hover:text-primary active:cursor-grabbing ${
            vertical ? "h-6 w-9" : "h-9 w-6"
          }`}
        >
          <FontAwesomeIcon icon={faGripVertical} className={`h-3.5 w-3.5 ${vertical ? "rotate-90" : ""}`} />
        </button>

        <span className={vertical ? "h-px w-6 bg-border" : "h-6 w-px bg-border"} />

        {actions.map((a) => (
          <button
            key={a.id}
            onClick={a.onClick}
            title={a.label}
            aria-label={a.label}
            className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg transition active:scale-90 ${
              a.active ? "bg-gradient-primary text-white shadow" : "text-text-muted hover:bg-primary/10 hover:text-primary"
            }`}
          >
            <FontAwesomeIcon icon={a.icon} className="h-4 w-4" />
          </button>
        ))}

        <span className={vertical ? "h-px w-6 bg-border" : "h-6 w-px bg-border"} />

        <div className="bz-tfocus-timer">{props.timerButton}</div>
      </div>

      {/* مفاتيح فتح اللوحة الجانبية — تحمل الشارات حتى وهي مغلقة.
          الموضع محسوب: يتفادى اللوحة المفتوحة والشريط العائم معاً. */}
      <div className={`bz-tfocus-rail ${chromeCls}`} style={railPos}>
        <RailBtn icon={faComments} label="الدردشة (C)" badge={props.unreadChat} active={tab === "chat"} onClick={() => setTab((v) => (v === "chat" ? null : "chat"))} />
        <RailBtn icon={faHand} label="رفع اليد (H)" badge={props.hands.length} active={tab === "hands"} onClick={() => setTab((v) => (v === "hands" ? null : "hands"))} />
        <RailBtn icon={faUserSecret} label="الأسئلة (Q)" badge={props.unansweredCount} active={tab === "questions"} onClick={() => setTab((v) => (v === "questions" ? null : "questions"))} />
        <RailBtn icon={faFolderOpen} label="الملفات (F)" active={tab === "files"} onClick={() => setTab((v) => (v === "files" ? null : "files"))} />
        <RailBtn icon={faUsers} label="المشاركون" active={tab === "people"} onClick={() => setTab((v) => (v === "people" ? null : "people"))} />
        <RailBtn icon={faBrain} label="حلول التحدي" active={tab === "challenge"} onClick={() => setTab((v) => (v === "challenge" ? null : "challenge"))} />
      </div>

      {/* اللوحة الجانبية الواحدة */}
      {tab && (
        <aside className="bz-tfocus-sidebar">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-bold text-text-primary">
              {tab === "chat" ? "الدردشة"
                : tab === "hands" ? "رفع اليد"
                : tab === "questions" ? "الأسئلة المجهولة"
                : tab === "files" ? "ملفات الغرفة"
                : tab === "challenge" ? "حلول التحدي"
                : "المشاركون"}
            </span>
            <button
              onClick={() => setTab(null)}
              aria-label="إغلاق اللوحة"
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "chat" && props.chatPanel}
            {tab === "files" && props.filesPanel}
            {tab === "people" && props.participantsPanel}
            {tab === "questions" && <div className="h-full overflow-y-auto p-3">{props.questionsPanel}</div>}
            {tab === "challenge" && <div className="h-full overflow-y-auto p-3">{props.challengePanel}</div>}
            {tab === "hands" && (
              <div className="h-full overflow-y-auto p-3">
                <HandsList hands={props.hands} onLower={props.onLowerHand} onGrantMic={props.onGrantMic} />
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}

/* ─── مؤقّت مصغّر في الشريط العلوي (اشتراك معزول) ─── */
function FocusTimerChip({ roomId }: { roomId: string }) {
  const label = useTimerLabel(roomId);
  if (!label) return null;
  return (
    <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold tabular-nums text-primary">
      {label}
    </span>
  );
}

/* ─── زر في شريط المفاتيح الجانبي ─── */
function RailBtn({ icon, label, badge, active, onClick }: {
  icon: IconDefinition; label: string; badge?: number; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`relative grid h-10 w-10 place-items-center rounded-xl transition active:scale-90 ${
        active ? "bg-gradient-primary text-white shadow" : "text-text-muted hover:bg-primary/10 hover:text-primary"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-[17px] w-[17px]" />
      {!!badge && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* ─── زر الشريط السفلي على الهاتف ─── */
function MobileBtn({ icon, label, badge, onClick }: {
  icon: IconDefinition; label: string; badge?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-text-muted transition active:scale-90"
    >
      <FontAwesomeIcon icon={icon} className="h-[18px] w-[18px]" />
      <span className="text-[10px] font-bold">{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute right-1/2 top-0.5 grid h-4 min-w-4 translate-x-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* ─── صف داخل الدرج السفلي ─── */
function SheetRow({ icon, label, onClick }: { icon: IconDefinition; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition active:scale-[0.98] hover:bg-primary/5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </span>
      <span className="text-sm font-bold text-text-primary">{label}</span>
    </button>
  );
}

/* ─── قائمة الأيدي المرفوعة (طابور حسب الأسبقية) ─── */
function HandsList({ hands, onLower, onGrantMic }: {
  hands: RaisedHand[]; onLower: (uid: string) => void; onGrantMic: (uid: string) => void;
}) {
  if (hands.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">لا أحد رفع يده الآن.</p>;
  }
  return (
    <div className="space-y-2">
      {hands.map((h, i) => (
        <div key={h.uid} className="flex items-center gap-2 rounded-2xl border border-warning/25 bg-warning/5 p-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-warning/15 text-[11px] font-bold text-warning">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{h.name}</span>
          <button
            onClick={() => onGrantMic(h.uid)}
            className="shrink-0 rounded-lg bg-secondary/10 px-2.5 py-1.5 text-xs font-bold text-secondary active:scale-95"
          >
            أعطِ الكلمة
          </button>
          <button
            onClick={() => onLower(h.uid)}
            aria-label="خفض اليد"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted active:scale-95 hover:bg-danger/10 hover:text-danger"
          >
            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
