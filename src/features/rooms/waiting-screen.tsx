"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faVideo, faChalkboard, faBookOpen, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

/**
 * شاشة انتظار أنيقة تظهر للطلاب قبل أن يبدأ الأستاذ بعرض محتوى.
 * فيها حركات لطيفة + نصائح + حالة الانتظار.
 */
export function WaitingScreen({
  isOwner, roomName, memberCount, ownerStatus, onPick,
}: {
  isOwner: boolean; roomName: string; memberCount: number;
  ownerStatus?: "available" | "busy" | "brb";
  /** يختار المالك ما يُعرض مباشرة من هذه الشاشة */
  onPick?: (tool: "video" | "whiteboard" | "files" | "notes") => void;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      {/* خلفية متوهّجة متحرّكة */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-secondary/10 blur-3xl animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 max-w-md text-center">
        {/* أيقونة مركزية نابضة */}
        <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 rounded-3xl bg-gradient-primary opacity-20 blur-xl animate-pulse" />
          <span className="absolute inset-0 rounded-3xl border-2 border-primary/30 animate-ping-slow" />
          <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-primary text-white shadow-glow">
            <FontAwesomeIcon icon={faGraduationCap} className="h-9 w-9" />
          </span>
        </div>

        <h2 className="font-display text-2xl font-extrabold">{roomName}</h2>

        {isOwner ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              أنت المضيف — اختر ما تعرضه لتبدأ الحصّة ويراها الجميع.
            </p>
            {/* كانت هذه بطاقات عرض فقط، والنصّ يحيل المستخدم إلى الشريط
                الجانبي. البطاقة التي تصف إجراءً يجب أن تكون هي الإجراء —
                وإلّا كانت زينة تشرح مكاناً آخر. صارت أزراراً حقيقية،
                وأُضيفت «مشاركة ملف» قبل الملاحظات. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: faVideo, label: "فيديو", tool: "video" as const },
                { icon: faChalkboard, label: "سبورة", tool: "whiteboard" as const },
                { icon: faFolderOpen, label: "مشاركة ملف", tool: "files" as const },
                { icon: faBookOpen, label: "ملاحظات", tool: "notes" as const },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => onPick?.(t.tool)}
                  disabled={!onPick}
                  title={`اعرض: ${t.label}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4
                    transition hover:-translate-y-0.5 hover:border-[var(--bz-blue-100)] hover:bg-[var(--bz-blue-050)]
                    hover:shadow-md active:translate-y-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={t.icon} className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold text-text-muted group-hover:text-[var(--bz-blue-700)]">{t.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 backdrop-blur-sm">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="text-sm font-semibold text-text-muted">في انتظار أن يبدأ المعلّم...</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-muted">
              الصوت والدردشة متاحان الآن. يمكنك رفع يدك ✋ متى أردت المشاركة.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-muted">
              <span className="bz-live-dot" />
              {memberCount} مشارك في الغرفة
            </div>
          </>
        )}
      </div>
    </div>
  );
}
