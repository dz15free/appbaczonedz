"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { listenMessages, sendMessage, type ChatMessage } from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";

export function ChatPanel({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => listenMessages(roomId, setMessages), [roomId]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText("");
    await sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName || "طالب",
      text: trimmed,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-text-muted">
            لا رسائل بعد — كن أول من يكتب 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user?.uid;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-start" : "items-start"}`}>
              <span className="text-xs font-bold text-primary">{m.userName}</span>
              <div
                className={`mt-1 max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  mine ? "bg-gradient-primary text-white" : "bg-background text-text-primary"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="اكتب رسالتك..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          aria-label="إرسال"
          className="grid h-10 w-10 place-items-center rounded-md bg-gradient-primary text-white transition hover:opacity-90"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
        </button>
      </div>
    </div>
  );
}
