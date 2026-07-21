"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHand, faUserShield, faUserSlash, faCrown, faMicrophone, faSatelliteDish, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import type { PresenceMember } from "@/features/rooms/use-presence";
import type { RaisedHand } from "@/features/rooms/rooms";

interface Props {
  members: PresenceMember[];
  hands: RaisedHand[];
  mods: Set<string>;
  ownerId: string;
  myUid?: string;
  isOwner: boolean;
  speakingUid?: string | null;
  onPromote?: (uid: string) => void;
  onKick?: (uid: string) => void;
  onGrantMic?: (uid: string) => void;
}

export function ParticipantsPanel({
  members, hands, mods, ownerId, myUid, isOwner, speakingUid, onPromote, onKick, onGrantMic,
}: Props) {
  const [radarOpen, setRadarOpen] = useState(false);
  const handMap = new Map(hands.map((h, i) => [h.uid, i + 1]));

  /* Teacher Radar — من فقد التركيز الآن؟ للأستاذ وحده، وبلا إشعارات.
     "بعيد" = التبويب مغلق أمامه (إشارة قوية).
     "ساكن" = لم يلمس شيئاً منذ 5 دقائق (إشارة ضعيفة، قد يكون منتبهاً فقط). */
  const away = members.filter((m) => m.uid !== ownerId && m.visible === false);
  const idle = members.filter((m) => m.uid !== ownerId && m.visible !== false && m.idle);
  const offTrack = away.length + idle.length;

  // ترتيب: المالك أولاً، ثم رافعو الأيدي، ثم البقية
  const sorted = [...members].sort((a, b) => {
    if (a.uid === ownerId) return -1;
    if (b.uid === ownerId) return 1;
    const ha = handMap.get(a.uid) ?? 999;
    const hb = handMap.get(b.uid) ?? 999;
    return ha - hb;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FontAwesomeIcon icon={faCrown} className="h-3.5 w-3.5 text-warning" />
          المشاركون
        </h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{members.length}</span>
      </div>

      {/* رادار الأستاذ — مطوي دائماً، لا يظهر إلا إن كان هناك ما يستحق */}
      {isOwner && offTrack > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setRadarOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-right transition hover:bg-warning/5"
          >
            <FontAwesomeIcon icon={faSatelliteDish} className="h-3.5 w-3.5 shrink-0 text-warning" />
            <span className="flex-1 text-xs font-bold text-text-primary">
              {offTrack} قد يكونون خارج المتابعة
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`h-3 w-3 shrink-0 text-text-muted transition ${radarOpen ? "rotate-180" : ""}`}
            />
          </button>

          {radarOpen && (
            <div className="space-y-1 px-3 pb-3">
              {away.length > 0 && (
                <>
                  <p className="pt-1 text-[10px] font-bold text-text-muted">غادروا التبويب</p>
                  {away.map((m) => (
                    <div key={m.uid} className="flex items-center gap-2 rounded-lg bg-danger/5 px-2 py-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                      <span className="truncate text-xs font-semibold text-text-primary">{m.name}</span>
                    </div>
                  ))}
                </>
              )}
              {idle.length > 0 && (
                <>
                  <p className="pt-1 text-[10px] font-bold text-text-muted">لم يتفاعلوا منذ مدّة</p>
                  {idle.map((m) => (
                    <div key={m.uid} className="flex items-center gap-2 rounded-lg bg-warning/5 px-2 py-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <span className="truncate text-xs font-semibold text-text-primary">{m.name}</span>
                    </div>
                  ))}
                </>
              )}
              <p className="pt-1.5 text-[10px] leading-relaxed text-text-muted">
                مؤشّر تقريبي فقط — قد يكون الطالب منتبهاً دون أن يلمس شاشته.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sorted.map((m) => {
          const isRoomOwner = m.uid === ownerId;
          const isMod = mods.has(m.uid);
          const handPos = handMap.get(m.uid);
          const speaking = speakingUid === m.uid;
          const isMe = m.uid === myUid;
          return (
            <div
              key={m.uid}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                speaking ? "bg-secondary/10 ring-1 ring-secondary/40" : "hover:bg-surface"
              }`}
            >
              <div className="relative shrink-0">
                <LiveAvatar uid={m.uid} name={m.name} size="sm" className={speaking ? "ring-2 ring-secondary" : ""} />
                {handPos && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-warning text-[8px] font-bold text-white ring-2 ring-background">
                    {handPos}
                  </span>
                )}
                {/* نقطة الحالة (نشط/غائب) */}
                {!handPos && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
                      m.lastActive && Date.now() - m.lastActive < 45000 ? "bg-secondary" : "bg-text-muted"
                    }`}
                    title={m.lastActive && Date.now() - m.lastActive < 45000 ? "نشط" : "غائب"}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{m.name}{isMe && " (أنت)"}</span>
                  {handPos && <FontAwesomeIcon icon={faHand} className="h-3 w-3 shrink-0 animate-bounce text-warning" />}
                </div>
                <div className="flex items-center gap-1">
                  {isRoomOwner ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning">
                      👑 المضيف
                    </span>
                  ) : isMod ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      <FontAwesomeIcon icon={faUserShield} className="h-2.5 w-2.5" /> مشرف
                    </span>
                  ) : (
                    <RoleBadge uid={m.uid} />
                  )}
                </div>
              </div>

              {/* زر إعطاء الإذن بالتحدّث (للمالك، يظهر دائماً لمن رفع يده) */}
              {isOwner && !isRoomOwner && handPos && onGrantMic && (
                <button
                  onClick={() => onGrantMic(m.uid)}
                  title="إعطاء الإذن بالتحدّث (فتح الميكروفون)"
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary/15 px-2 py-1.5 text-[10px] font-bold text-secondary transition hover:bg-secondary/25"
                >
                  <FontAwesomeIcon icon={faMicrophone} className="h-3 w-3" />
                  إذن
                </button>
              )}

              {/* أدوات الإشراف (المالك: ترقية+طرد | المشرف: طرد فقط) */}
              {!isRoomOwner && (onPromote || onKick) && (
                <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                  {onPromote && (
                    <button
                      onClick={() => onPromote(m.uid)}
                      title={isMod ? "إزالة الإشراف" : "ترقية لمشرف"}
                      className={`grid h-7 w-7 place-items-center rounded-lg transition ${isMod ? "text-primary" : "text-text-muted hover:text-primary"}`}
                    >
                      <FontAwesomeIcon icon={faUserShield} className="h-3 w-3" />
                    </button>
                  )}
                  {onKick && !isMod && (
                    <button
                      onClick={() => onKick(m.uid)}
                      title="طرد"
                      className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <FontAwesomeIcon icon={faUserSlash} className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
