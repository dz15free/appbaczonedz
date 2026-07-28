"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays, faTrash, faArrowRight, faClock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import {
  listenUpcomingSessions, deleteScheduledSession, type ScheduledSession,
} from "@/features/rooms/rooms";
import { ROOM_SUBJECTS } from "@/features/rooms/create-room-dialog";

const JOIN_EARLY_MS = 10 * 60 * 1000; // يمكن الدخول 10 دقائق قبل الموعد

function formatCountdown(ms: number): string {
  if (ms <= 0) return "الآن";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "أقل من دقيقة";
  if (totalMin < 60) return `بعد ${totalMin} د`;
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hours < 24) return min ? `بعد ${hours} س ${min} د` : `بعد ${hours} س`;
  const days = Math.floor(hours / 24);
  return `بعد ${days} ${days === 1 ? "يوم" : "أيام"}`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("ar-DZ", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export function UpcomingSessions() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = listenUpcomingSessions(setSessions);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  // تحديث العدّاد التنازلي كل 30 ثانية
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (sessions.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4 text-primary" />
        الجلسات القادمة
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {sessions.map((s) => {
          const diff = s.scheduledAt - now;
          const canJoin = diff <= JOIN_EARLY_MS;
          const isMine = s.ownerId === user?.uid;
          const subjectLabel = s.subject ? ROOM_SUBJECTS.find((x) => x.id === s.subject)?.label : null;

          return (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold">{s.name}</span>
                  {subjectLabel && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {subjectLabel}
                    </span>
                  )}
                  {s.isPaid && (
                    <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      🔒 {s.price} دج
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                  <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                  {formatDateTime(s.scheduledAt)} · {s.ownerName}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {isMine && (
                  <button
                    onClick={() => { if (confirm("حذف هذه الجلسة المجدولة؟")) deleteScheduledSession(s.id); }}
                    aria-label="حذف"
                    className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
                {canJoin ? (
                  <button
                    onClick={() => router.push(`/rooms/${s.roomId}`)}
                    className="flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-white"
                  >
                    دخول
                    <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3 -scale-x-100" />
                  </button>
                ) : (
                  <span className="rounded-md bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
                    {formatCountdown(diff)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
