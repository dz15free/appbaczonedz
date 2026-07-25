"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/ui/icon";
import { WaitingScreen } from "@/features/rooms/waiting-screen";
import { RoomNotes } from "@/features/rooms/room-notes";
import { RoomPollPanel } from "@/features/rooms/room-poll";
import type { RoomOverlay } from "@/features/rooms/use-room-surface";
import type { OwnerStatus } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   سطح الغرفة الواحد

   هذا المكوّن هو تجسيد قرار التصميم: **الغرفة هي اللوح**.

   كان التبديل الخماسي (ترحيب/فيديو/سبورة/ملفات/ملاحظات) مكتوباً
   مرّتين في صفحة الغرفة — مرّة للتخطيط العادي ومرّة داخل وضع تركيز
   الطالب — فكان كل تعديل يجب أن يُكتب مرّتين وإلّا اختلف السطحان.
   صار هنا مرّة واحدة.

   الفرق الجوهري عن التبويبات: اللوح **لا يُفكَّك أبداً**. حين يفتح
   الأستاذ ملفّاً، تعلو الطبقة فوق اللوح ثم تنزاح، واللوح تحتها كما
   تركه — لا رسم يضيع ولا صفحة تُفقد ولا إعادة تحميل.
════════════════════════════════════════════════════════════ */

const loadingLayer = () => (
  <div className="grid h-full place-items-center text-text-muted">
    <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
  </div>
);

const VideoSync = dynamic(() => import("@/features/video/video-sync").then((m) => m.VideoSync), { ssr: false, loading: loadingLayer });
const Whiteboard = dynamic(() => import("@/features/whiteboard/whiteboard").then((m) => m.Whiteboard), { ssr: false, loading: loadingLayer });
const RoomFiles = dynamic(() => import("@/features/rooms/room-files").then((m) => m.RoomFiles), { ssr: false, loading: loadingLayer });

/** عنوان الطبقة كما يظهر في شريطها العلوي */
const OVERLAY_TITLE: Record<Exclude<RoomOverlay, "none">, string> = {
  welcome: "قبل أن نبدأ",
  video: "فيديو الحصّة",
  files: "ملفّات الحصّة",
  notes: "ملاحظات الدرس",
};

export interface RoomSurfaceProps {
  roomId: string;
  isOwner: boolean;
  roomName?: string;
  subject?: string | null;
  memberCount: number;
  ownerStatus: OwnerStatus;
  overlay: RoomOverlay;
  /** المالك وحده يملك إزاحة الطبقة عن الجميع */
  onCloseOverlay?: () => void;
  /** استفتاء مفتوح — يعلو كل شيء لأنه يطلب ردّ الطالب الآن */
  poll?: { open?: boolean } | null;
  pollPanel?: ReactNode;
  /** أزرار الغرفة التي تُحقن في منطقة «الغرفة» من كونسول اللوح */
  consoleExtras?: ReactNode;
}

export function RoomSurface({
  roomId, isOwner, roomName, subject, memberCount, ownerStatus,
  overlay, onCloseOverlay, poll, pollPanel, consoleExtras,
}: RoomSurfaceProps) {
  const showPoll = Boolean(poll?.open);
  const showOverlay = !showPoll && overlay !== "none";

  return (
    <div className="relative h-full w-full">
      {/* أرضية الغرفة — دائمة، لا تُفكَّك مهما علاها */}
      <div className="absolute inset-0">
        <Whiteboard
          roomId={roomId}
          canDraw={isOwner}
          roomName={roomName}
          subject={subject}
          consoleExtras={consoleExtras}
        />
      </div>

      {/* الاستفتاء يعلو كل شيء: هو الشيء الوحيد الذي يطلب ردّاً فورياً */}
      {showPoll && (
        <div className="absolute inset-0 z-20 overflow-auto bg-background/95 backdrop-blur-sm">
          {pollPanel}
        </div>
      )}

      {/* الطبقة — تعلو اللوح ولا تُلغيه */}
      {showOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col bg-background/97 backdrop-blur-sm">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-sm font-bold text-text-primary">
              {OVERLAY_TITLE[overlay]}
            </span>
            <span className="flex-1" />
            {isOwner && onCloseOverlay && (
              <button
                onClick={onCloseOverlay}
                title="إغلاق والعودة إلى اللوح"
                aria-label="إغلاق والعودة إلى اللوح"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary"
              >
                <Icon name="close" size={13} />
                <span className="hidden sm:inline">العودة إلى اللوح</span>
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {overlay === "welcome" && (
              <WaitingScreen
                isOwner={isOwner}
                roomName={roomName ?? "الغرفة"}
                memberCount={memberCount}
                ownerStatus={ownerStatus}
              />
            )}
            {overlay === "video" && <VideoSync roomId={roomId} isOwner={isOwner} />}
            {overlay === "files" && <RoomFiles roomId={roomId} isOwner={isOwner} />}
            {overlay === "notes" && (
              <RoomNotes roomId={roomId} isOwner={isOwner} roomName={roomName ?? "الغرفة"} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { RoomPollPanel };
