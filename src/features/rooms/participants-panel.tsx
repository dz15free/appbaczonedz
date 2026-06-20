"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHand, faUserShield, faUserSlash, faCrown } from "@fortawesome/free-solid-svg-icons";
import { UserAvatar } from "@/components/ui/user-avatar";
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
}

export function ParticipantsPanel({
  members, hands, mods, ownerId, myUid, isOwner, speakingUid, onPromote, onKick,
}: Props) {
  const handMap = new Map(hands.map((h, i) => [h.uid, i + 1]));

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
                <UserAvatar name={m.name} size="sm" className={speaking ? "ring-2 ring-secondary" : ""} />
                {handPos && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-warning text-[8px] font-bold text-white ring-2 ring-background">
                    {handPos}
                  </span>
                )}
                {/* نقطة الحالة (نشط/غائب) */}
                {!handPos && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
                      m.lastActive && Date.now() - m.lastActive < 45000 ? "bg-secondary" : "bg-text-muted/50"
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
                    <span className="text-[10px] font-bold text-warning">👑 المضيف</span>
                  ) : isMod ? (
                    <span className="text-[10px] font-bold text-primary">مشرف</span>
                  ) : (
                    <RoleBadge uid={m.uid} />
                  )}
                </div>
              </div>

              {/* أدوات المالك */}
              {isOwner && !isRoomOwner && (
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
                  {onKick && (
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
