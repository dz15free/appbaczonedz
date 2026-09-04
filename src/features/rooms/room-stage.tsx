"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { RoomNotes } from "@/features/rooms/room-notes";
import { WaitingScreen } from "@/features/rooms/waiting-screen";
import type { RoomTool } from "@/features/rooms/use-active-tool";
import type { OwnerStatus } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   مسرح الغرفة — سطح واحد لا يُفرَّغ

   🐛 العلّة التي يعالجها هذا الملفّ:
   كانت الصفحة تُصيّر أداة **واحدة** في كل لحظة عبر سلسلة شروط:

       {tool === "whiteboard" && <Whiteboard … />}
       {tool === "files" && <RoomFiles … />}

   فالانتقال من السبورة إلى ملفّ **يفكّك** السبورة: يُلغى الـcanvas،
   ويُفقد موضع القلم والتكبير، ويُعاد تحميل الحزمة الديناميكية مع
   دوّارة انتظار. ثم العودة إلى السبورة تبدأ من الصفر. وبرنامج
   اجتماعات حقيقيّ لا يُفرّغ السطح المشترك أبداً.

   ── الحلّ: إبقاءٌ حيّ (keep-alive) ──
   كل سطح زاره المستخدم مرّة يبقى **مُركَّباً** في الشجرة، ويُخفى
   بـ`visibility: hidden` لا بإزالته:

     • `visibility` تُبقي للعنصر **تخطيطاً وأبعاداً**، فيبقى
       `ResizeObserver` في السبورة يقرأ مقاساً صحيحاً ولا يتشوّه
       الـcanvas عند العودة. (`display:none` يعطي مقاس صفر ويكسرها.)
     • `pointer-events: none` + `aria-hidden` يمنعان لمس السطح
       المخفيّ أو قراءة قارئ الشاشة له.
     • السطح لا يُركَّب قبل أوّل زيارة، فلا نُحمّل السبورة في غرفة
       لا يفتحها الأستاذ أصلاً.

   ── ولماذا لا يُبدَّل السطح بالتبويبات؟ ──
   لأنّ التبديل قرار الأستاذ ويُبثّ إلى الصفّ كما هو (`activeTool`).
   لم يتغيّر شيء في نموذج البيانات ولا في القواعد: تغيّر **موضع
   التركيب** فقط.

   ── قاعة الامتحان ──
   تبقى كما هي حرفاً بحرف: طبقة معتمة فوق المسرح. وما تحتها يبقى
   مُركَّباً، فإنهاء المحاكاة يُعيد الأستاذ إلى سبورته كما تركها.
   ════════════════════════════════════════════════════════════ */

const loadingTool = () => (
  <div className="grid h-full place-items-center text-text-muted">
    <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
  </div>
);

const VideoSync = dynamic(() => import("@/features/video/video-sync").then((m) => m.VideoSync), { ssr: false, loading: loadingTool });
const Whiteboard = dynamic(() => import("@/features/whiteboard/whiteboard").then((m) => m.Whiteboard), { ssr: false, loading: loadingTool });
const RoomFiles = dynamic(() => import("@/features/rooms/room-files").then((m) => m.RoomFiles), { ssr: false, loading: loadingTool });

export interface RoomStageProps {
  roomId: string;
  roomName: string;
  subject?: string;
  isOwner: boolean;
  isPrivileged: boolean;
  tool: RoomTool;
  memberCount: number;
  ownerStatus: OwnerStatus;
  onPickTool?: (t: RoomTool) => void;
  /** طبقة قاعة الامتحان — تُمرَّر كما هي بلا تغيير في شكلها */
  examLayer?: React.ReactNode;
}

/** غلاف السطح: يبقى مُركَّباً ويُخفى بلا فقدان أبعاده */
function Layer({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
        /* الطبقة النشطة وحدها تعلو — بلا أرقام سحرية، رقمان يكفيان */
        zIndex: active ? 2 : 1,
      }}
      aria-hidden={!active}
      inert={!active}
    >
      {children}
    </div>
  );
}

export function RoomStage({
  roomId, roomName, subject, isOwner, isPrivileged,
  tool, memberCount, ownerStatus, onPickTool, examLayer,
}: RoomStageProps) {
  /* لا نُركّب سطحاً لم يُفتح بعد. وبعد أوّل فتح لا نُفكّكه أبداً. */
  const mounted = useRef<Set<RoomTool>>(new Set([tool]));
  mounted.current.add(tool);
  const has = (t: RoomTool) => mounted.current.has(t);

  /* أثناء الامتحان لا يُلمس ما تحت الطبقة، لكنّه يبقى حيّاً */
  const examOn = Boolean(examLayer);

  useEffect(() => { mounted.current.add(tool); }, [tool]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {has("welcome") && (
        <Layer active={tool === "welcome" && !examOn}>
          <WaitingScreen
            isOwner={isOwner}
            roomName={roomName}
            memberCount={memberCount}
            ownerStatus={ownerStatus}
            onPick={isOwner ? onPickTool : undefined}
          />
        </Layer>
      )}

      {has("video") && (
        <Layer active={tool === "video" && !examOn}>
          <VideoSync roomId={roomId} isOwner={isOwner} />
        </Layer>
      )}

      {has("whiteboard") && (
        <Layer active={tool === "whiteboard" && !examOn}>
          <Whiteboard roomId={roomId} canDraw={isOwner} roomName={roomName} subject={subject} />
        </Layer>
      )}

      {has("files") && (
        <Layer active={tool === "files" && !examOn}>
          <RoomFiles roomId={roomId} isOwner={isOwner} />
        </Layer>
      )}

      {has("notes") && (
        <Layer active={tool === "notes" && !examOn}>
          <RoomNotes roomId={roomId} isOwner={isOwner} canEdit={isPrivileged} roomName={roomName} />
        </Layer>
      )}

      {/* قاعة الامتحان — شكلها كما هو، وهي وحدها معتمة فوق الجميع */}
      {examOn && (
        <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-background">
          {examLayer}
        </div>
      )}
    </div>
  );
}
