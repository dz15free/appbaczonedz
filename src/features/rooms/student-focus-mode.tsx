"use client";

import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompress, faHand, faComments, faStar,
  faUserSecret, faPaperPlane, faFolderOpen, faNoteSticky, faLayerGroup,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FloatingAssistant, type RadialAction } from "@/components/ui/floating-assistant";
import { useTimerLabel } from "@/features/rooms/room-timer";

/* ════════════════════════════════════════════
   Student Focus Mode — وضع التركيز للطالب (Mobile First)
   بيئة دراسة نظيفة: محتوى + دردشة قابلة للطي + شريطان صغيران
   يُبقي فقط ما يحتاجه الطالب أثناء المتابعة
════════════════════════════════════════════ */

export interface StudentFocusProps {
  roomId: string;
  roomName: string;
  ownerName?: string;
  ownerStatus: "available" | "busy" | "brb";
  memberCount: number;
  myHandRaised: boolean;
  onToggleHand: () => void;
  onExit: () => void;
  onSaveToCards: () => void;      // حفظ سريع لبطاقات المراجعة
  onAnonymousQuestion: (q: string) => void;
  onOpenFiles: () => void;
  onOpenNotes: () => void;
  onOpenCards: () => void;
  unreadChat: number;
  children: ReactNode;            // المحتوى الرئيسي (سبورة/PDF/فيديو)
  chatPanel: ReactNode;           // لوحة الدردشة
  challengeLayer?: ReactNode;     // طبقة تحدّي الحصة (Live Problem)
}

export function StudentFocusMode(props: StudentFocusProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const statusLabel =
    props.ownerStatus === "busy" ? "🔴 مشغول" :
    props.ownerStatus === "brb" ? "🟡 سيعود" : "🟢 يشرح الآن";

  function quickSave() {
    props.onSaveToCards();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  }

  function submitQuestion() {
    const q = question.trim();
    if (!q) return;
    props.onAnonymousQuestion(q);
    setQuestion("");
    setAskOpen(false);
  }

  // وظائف ثانوية داخل المساعد العائم (FAB)
  const radialActions: RadialAction[] = [
    { id: "files", icon: faFolderOpen, label: "الملفات", onClick: props.onOpenFiles, tone: "primary" },
    { id: "notes", icon: faNoteSticky, label: "الملاحظات", onClick: props.onOpenNotes, tone: "amber" },
    { id: "cards", icon: faLayerGroup, label: "بطاقاتي", onClick: props.onOpenCards, tone: "primary" },
  ];

  return (
    <div className="bz-focus-root">
      {/* ═══ شريط علوي صغير جداً ═══ */}
      <div className="bz-focus-topbar border-b border-border bg-surface">
        <button
          onClick={props.onExit}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition active:scale-95 hover:text-primary"
          aria-label="خروج من وضع التركيز"
        >
          <FontAwesomeIcon icon={faCompress} className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-[13px] font-bold leading-tight">{props.roomName}</h1>
            <span className="shrink-0 text-[10px] font-bold text-text-muted">{statusLabel}</span>
          </div>
          {props.ownerName && (
            <p className="truncate text-[10px] leading-tight text-text-muted">
              {props.ownerName} · {props.memberCount} متصل
            </p>
          )}
        </div>

        <FocusTimerBadge roomId={props.roomId} />
      </div>

      {/* ═══ المحتوى الرئيسي ═══ */}
      <div className="relative flex-1 overflow-hidden">
        {props.children}

        {/* تحدّي الحصة — يظهر فوق المحتوى دون حجبه */}
        {props.challengeLayer}

        {/* تأكيد الحفظ السريع */}
        {savedFlash && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-white shadow-lg bz-radial-in">
            ⭐ حُفظت في بطاقات المراجعة
          </div>
        )}

        {/* فقاعة دردشة صغيرة عند وصول رسائل */}
        {!chatOpen && props.unreadChat > 0 && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute bottom-3 right-3 z-[55] flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xl bz-radial-in active:scale-95"
          >
            <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" />
            {props.unreadChat > 9 ? "9+" : props.unreadChat} رسالة جديدة
          </button>
        )}
      </div>

      {/* ═══ شريط سفلي صغير ═══ */}
      <div className="bz-focus-bottombar border-t border-border bg-surface">
        <div className="flex items-stretch justify-around gap-1 px-2 py-1.5">
          <FocusBtn
            icon={faHand}
            label="ارفع يدك"
            active={props.myHandRaised}
            onClick={props.onToggleHand}
          />
          <FocusBtn
            icon={faUserSecret}
            label="سؤال مجهول"
            onClick={() => setAskOpen(true)}
          />
          <FocusBtn
            icon={faStar}
            label="حفظ"
            tone="amber"
            onClick={quickSave}
          />
          <FocusBtn
            icon={faComments}
            label="الدردشة"
            badge={props.unreadChat}
            onClick={() => setChatOpen(true)}
          />
        </div>
      </div>

      {/* ═══ المساعد العائم (وظائف ثانوية) ═══ */}
      <FloatingAssistant actions={radialActions} side="left" />

      {/* ═══ درج الدردشة ═══ */}
      <BottomSheet open={chatOpen} onClose={() => setChatOpen(false)} title="الدردشة" maxHeight="75vh">
        <div className="h-[62vh]">{props.chatPanel}</div>
      </BottomSheet>

      {/* ═══ درج السؤال المجهول ═══ */}
      <BottomSheet open={askOpen} onClose={() => setAskOpen(false)} title="سؤال مجهول 🕵️">
        <p className="mb-3 px-1 text-xs leading-relaxed text-text-muted">
          سيصل سؤالك للأستاذ دون إظهار اسمك. اكتب سؤالك بوضوح.
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالك هنا..."
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          dir="auto"
          autoFocus
        />
        <button
          onClick={submitQuestion}
          disabled={!question.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
          إرسال بدون اسم
        </button>
      </BottomSheet>
    </div>
  );
}

/* شارة المؤقّت — مكوّن مستقل حتى يبقى تحديثه كل ثانية معزولاً عن بقية الواجهة */
function FocusTimerBadge({ roomId }: { roomId: string }) {
  const label = useTimerLabel(roomId);
  if (!label) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary tabular-nums">
      <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
      {label}
    </span>
  );
}

function FocusBtn({
  icon, label, onClick, active, tone, badge,
}: {
  icon: typeof faHand; label: string; onClick: () => void;
  active?: boolean; tone?: "amber"; badge?: number;
}) {
  const activeCls = active
    ? "text-warning"
    : tone === "amber" ? "text-amber-500" : "text-text-muted";
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition active:scale-90 ${activeCls}`}
    >
      <FontAwesomeIcon icon={icon} className="h-[19px] w-[19px]" />
      <span className="text-[10px] font-bold">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1/2 top-0.5 translate-x-4 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
