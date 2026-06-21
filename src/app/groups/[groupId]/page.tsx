"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faUsers, faComments, faPaperPlane,
  faCrown, faRightFromBracket, faTrash, faSpinner, faFolder,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { playMessageSound } from "@/lib/sound";
import { GroupFiles } from "@/features/groups/group-files";
import {
  getGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  sendGroupMessage,
  listenGroupMembers,
  listenGroupMessages,
  listenUserGroupIds,
  GROUP_SUBJECTS,
  SUBJECT_COLOR,
  type StudyGroup,
  type GroupMember,
  type GroupMessage,
} from "@/features/groups/groups";

function timeHm(ts: number) {
  return new Date(ts).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"chat" | "members" | "files">("chat");
  const [text, setText] = useState("");
  const [joining, setJoining] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const lastCount = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    getGroup(groupId).then(setGroup);
  }, [groupId]);

  useEffect(() => {
    if (!user) return;
    return listenUserGroupIds(user.uid, setMyIds);
  }, [user]);

  useEffect(() => listenGroupMembers(groupId, setMembers), [groupId]);

  useEffect(() => {
    return listenGroupMessages(groupId, (msgs) => {
      setMessages(msgs);
      if (initialized.current && msgs.length > lastCount.current) {
        const last = msgs[msgs.length - 1];
        if (last && last.senderId !== user?.uid) playMessageSound();
      }
      lastCount.current = msgs.length;
      initialized.current = true;
    });
  }, [groupId, user?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (!group) return (
    <AppShell>
      <div className="grid place-items-center py-20 text-text-muted">
        <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
      </div>
    </AppShell>
  );

  const me = { uid: user.uid, name: profile?.name || user.displayName || "طالب" };
  const isMember = myIds.has(groupId);
  const isOwner = group.ownerId === user.uid;
  const subj = GROUP_SUBJECTS.find((s) => s.id === group.subject);
  const color = SUBJECT_COLOR[group.subject] ?? "bg-primary/10 text-primary";

  async function join() {
    if (!user) return;
    setJoining(true);
    try { await joinGroup(user.uid, me.name, groupId); } finally { setJoining(false); }
  }
  async function leave() {
    if (!user) return;
    if (isOwner && !confirm("أنت مالك هذه المجموعة. مغادرتك ستمحوها نهائياً. تأكيد؟")) return;
    if (!isOwner && !confirm("مغادرة المجموعة؟")) return;
    if (isOwner) { await deleteGroup(groupId); router.push("/groups"); }
    else { await leaveGroup(user.uid, groupId); router.push("/groups"); }
  }
  async function send() {
    if (!text.trim() || !isMember || !user) return;
    const t = text;
    setText("");
    await sendGroupMessage(groupId, me, t);
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-9rem)] flex-col lg:h-[calc(100dvh-4.5rem)]">
        {/* الرأس */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button onClick={() => router.push("/groups")} aria-label="رجوع" className="text-text-muted hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg font-extrabold ${color}`}>
            {group.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate font-bold">{group.name}</span>
            <span className={`text-xs font-semibold ${color.split(" ")[1]}`}>{subj?.name} · {members.length} عضو</span>
          </div>
          {isMember ? (
            <button onClick={leave} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-danger hover:bg-danger/10" aria-label="مغادرة">
              <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={join} disabled={joining} className="rounded-md bg-gradient-primary px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">
              {joining ? "..." : "انضم"}
            </button>
          )}
        </div>

        {/* تبويبات */}
        <div className="flex border-b border-border bg-surface">
          {([["chat", "النقاش", faComments], ["members", "الأعضاء", faUsers], ["files", "الملفات", faFolder]] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id as "chat" | "members")}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold ${tab === id ? "border-b-2 border-primary text-primary" : "text-text-muted"}`}
            >
              <FontAwesomeIcon icon={icon} className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* المحتوى */}
        {tab === "chat" ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && <p className="text-center text-sm text-text-muted py-6">لا رسائل بعد. ابدأ النقاش!</p>}
              {messages.map((m) => {
                const isMe = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-start flex-row-reverse" : "justify-start"} gap-2`}>
                    <LiveAvatar uid={m.senderId} name={m.senderName} size="sm" className="h-8 w-8 self-end" />
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? "bg-primary text-white" : "bg-surface border border-border"}`}>
                      {!isMe && <span className="mb-0.5 block text-[11px] font-bold text-primary">{m.senderName}</span>}
                      <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                      <span className={`mt-1 block text-[10px] ${isMe ? "text-white/70 text-left" : "text-text-muted text-right"}`}>{timeHm(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            {isMember ? (
              <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary"
                />
                <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-primary text-white disabled:opacity-50">
                  <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
                </button>
              </div>
            ) : (
              <div className="border-t border-border bg-surface px-4 py-3 text-center text-sm text-text-muted">
                انضم للمجموعة للمشاركة في النقاش
              </div>
            )}
          </>
        ) : tab === "members" ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {members.map((m) => (
              <div key={m.uid} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <LiveAvatar uid={m.uid} name={m.name} size="md" />
                <div className="flex-1">
                  <span className="font-semibold">{m.name}</span>
                </div>
                {m.role === "admin" && (
                  <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">
                    <FontAwesomeIcon icon={faCrown} className="h-3 w-3" /> مالك
                  </span>
                )}
                {isOwner && m.uid !== user.uid && (
                  <button
                    onClick={() => { if(confirm(`طرد ${m.name}؟`)) leaveGroup(m.uid, groupId); }}
                    aria-label="طرد"
                    className="text-text-muted hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <GroupFiles groupId={groupId} isOwner={isOwner} isMember={isMember} />
        )}
      </div>
    </AppShell>
  );
}
