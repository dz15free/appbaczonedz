"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faVideo, faChalkboard, faBookOpen, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

/* ════════════════════════════════════════════════════════════
   حالة المضيف — لماذا لم تكن تظهر لأحد

   🐛 الخيار موجود في القائمة («متفرّغ / مشغول / سأعود»)، والاختيار
   يُكتب في `roomLive/$roomId/ownerStatus`، والصفحة تستمع إليه
   وتُمرّره: page → RoomStage → WaitingScreen…

   ثمّ **يُفكَّك في التوقيعة ولا يُستعمل في أيّ سطر بعدها.**

   فالمسار كامل من طرفه إلى طرفه إلّا آخر خطوة. ولذلك لم يبدُ للمالك
   أنّ شيئاً معطوب — القائمة تعمل والاختيار «يُحفظ» — بينما لا يرى
   المنضمّون شيئاً إطلاقاً. والوعد الذي تحته («تظهر إلى جانب اسمك في
   الغرفة») لم يكن يتحقّق في أيّ مكان.

   والحالة تُعرض الآن في موضعين لأنّ لكلٍّ منهما سؤالاً مختلفاً:
   شاشة الانتظار تجيب «لماذا لم تبدأ الحصّة؟»، ورفّ الصفّ يجيب «هل
   الأستاذ معنا الآن؟» أثناء الحصّة نفسها.
   ════════════════════════════════════════════════════════════ */
export const OWNER_STATUS_META: Record<
  "available" | "busy" | "brb",
  { label: string; short: string; color: string; dot: string }
> = {
  available: { label: "المعلّم متفرّغ", short: "متفرّغ", color: "var(--bz-green)", dot: "#16a34a" },
  busy: { label: "المعلّم مشغول الآن", short: "مشغول", color: "#b45309", dot: "#f59e0b" },
  brb: { label: "المعلّم سيعود بعد قليل", short: "سأعود", color: "var(--bz-blue-700)", dot: "#2563eb" },
};

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
            {/* حالة المضيف: تُعرض للمنضمّ لأنّها جوابٌ عن سؤاله
                الوحيد في هذه الشاشة — «هل نسيَنا؟». وتُخفى حين تكون
                «متفرّغ» لأنّها الحالة الطبيعية، وإعلان الطبيعيّ ضجيج. */}
            {ownerStatus && ownerStatus !== "available" && (
              <div
                className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2"
                style={{
                  borderColor: OWNER_STATUS_META[ownerStatus].dot,
                  color: OWNER_STATUS_META[ownerStatus].color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: OWNER_STATUS_META[ownerStatus].dot }}
                />
                <span className="text-[12px] font-extrabold">
                  {OWNER_STATUS_META[ownerStatus].label}
                </span>
              </div>
            )}

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
