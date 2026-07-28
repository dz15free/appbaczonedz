"use client";

import { useEffect, useRef, useState } from "react";
import { setTyping, listenTyping } from "@/features/rooms/rooms";

/** Hook لإدارة مؤشّر "يكتب الآن" — يرسل حالتي ويستمع للآخرين */
export function useTypingIndicator(roomId: string, uid?: string, name?: string) {
  const [typers, setTypers] = useState<{ uid: string; name: string }[]>([]);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    const unsub = listenTyping(roomId, setTypers);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

  function notifyTyping() {
    if (!uid || !name) return;
    if (!isTyping.current) {
      isTyping.current = true;
      setTyping(roomId, uid, name, true);
    }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      isTyping.current = false;
      setTyping(roomId, uid, name, false);
    }, 3000);
  }

  function stopTyping() {
    if (!uid || !name) return;
    isTyping.current = false;
    if (timeout.current) clearTimeout(timeout.current);
    setTyping(roomId, uid, name, false);
  }

  // استبعد نفسي من قائمة العرض
  const othersTyping = typers.filter((t) => t.uid !== uid);

  return { othersTyping, notifyTyping, stopTyping };
}

/** عرض مؤشّر الكتابة */
export function TypingIndicator({ typers }: { typers: { uid: string; name: string }[] }) {
  if (typers.length === 0) return null;
  const text =
    typers.length === 1
      ? `${typers[0].name} يكتب`
      : typers.length === 2
        ? `${typers[0].name} و ${typers[1].name} يكتبان`
        : `${typers.length} أشخاص يكتبون`;
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs text-text-muted">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
      </span>
      {text}...
    </div>
  );
}
