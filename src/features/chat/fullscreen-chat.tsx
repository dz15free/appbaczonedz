"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listenMessages, sendMessage, type ChatMessage } from "@/features/rooms/rooms";

/* ─── لوحة ألوان دراسية لكل مرسل ─── */
const CHIPS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500",  "bg-sky-500",    "bg-rose-500",
  "bg-purple-500", "bg-cyan-500",
];
function chipColor(uid: string) {
  const h = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHIPS[h % CHIPS.length];
}

interface Props { roomId: string; isOwner: boolean; }

export function FullscreenChatOverlay({ roomId, isOwner }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop sidebar toggle
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const initRef   = useRef(false);
  const lastRef   = useRef(0);

  useEffect(() => listenMessages(roomId, (msgs) => {
    setMessages(msgs);
    initRef.current = true;
    lastRef.current = msgs.length;
  }), [roomId]);

  // تمرير للأسفل عند رسائل جديدة (desktop فقط)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !user) return;
    const t = text; setText("");
    await sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName || "طالب",
      text: t,
    });
  }

  const textMsgs = messages.filter((m) => m.type === "text");
  /* آخر 7 رسائل للعرض العائم على الجوال */
  const floating = textMsgs.slice(-7);

  return (
    <>
      {/* ══════════════════════════════════════
          الحاسوب — شريط جانبي شفاف
      ══════════════════════════════════════ */}
      <div
        className={`absolute inset-y-0 right-0 hidden flex-col transition-all duration-300 lg:flex ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
        style={{ background: "rgba(10,10,20,0.72)", backdropFilter: "blur(12px)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* رأس الشريط */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">الدردشة</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-md text-white/50 hover:text-white hover:bg-white/10">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto space-y-2 px-3 py-3
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          {textMsgs.length === 0 && (
            <p className="py-8 text-center text-xs text-white/30">لا رسائل بعد</p>
          )}
          {textMsgs.map((m) => {
            const isMe = m.userId === user?.uid;
            return (
              <div key={m.id} className="flex flex-col gap-0.5 animate-msg-in">
                <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${chipColor(m.userId)}`}>
                  {m.userName}
                </span>
                <p className={`rounded-xl px-3 py-1.5 text-sm leading-snug text-white ${
                  isMe ? "bg-indigo-600/70" : "bg-white/10"
                }`}>
                  {m.text}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* حقل الإدخال */}
        <div className="flex shrink-0 items-center gap-2 border-t px-3 py-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="اكتب رسالة..."
            className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <button onClick={send} disabled={!text.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-400 transition">
            <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5 -scale-x-100" />
          </button>
        </div>
      </div>

      {/* زر إعادة فتح الشريط — حاسوب */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="absolute bottom-20 right-3 z-10 hidden lg:flex items-center gap-2 rounded-full bg-indigo-500/80 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm hover:bg-indigo-500">
          <FontAwesomeIcon icon={faComments} className="h-4 w-4" />
          الدردشة
        </button>
      )}

      {/* ══════════════════════════════════════
          الجوال — نمط Rave Watch Party
      ══════════════════════════════════════ */}

      {/* الرسائل العائمة */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 flex flex-col gap-1.5 px-3 pb-1 lg:hidden"
        style={{ maxHeight: "55vh", justifyContent: "flex-end" }}>
        {floating.map((m, idx) => {
          const isMe = m.userId === user?.uid;
          /* الأقدم أكثر شفافية */
          const opacity = 0.45 + (idx / floating.length) * 0.55;
          return (
            <div key={m.id} className="flex w-fit max-w-[85%] items-end gap-2 animate-msg-in"
              style={{ opacity }}>
              {/* رقاقة الاسم */}
              <span className={`shrink-0 self-end rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${chipColor(m.userId)}`}>
                {m.userName.split(" ")[0]}
              </span>
              {/* فقاعة الرسالة */}
              <span
                className="rounded-2xl px-3 py-1.5 text-sm font-medium text-white leading-snug"
                style={{
                  background: isMe
                    ? "rgba(99,102,241,0.75)"
                    : "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {m.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* شريط الإدخال — جوال */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2 lg:hidden"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 70%, transparent)",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="💬 شارك برأيك..."
          className="flex-1 rounded-full py-2.5 px-4 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition"
          style={{ background: "rgba(99,102,241,0.9)" }}
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
        </button>
      </div>
    </>
  );
}
