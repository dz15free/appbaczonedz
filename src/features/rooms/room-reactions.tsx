"use client";

import { useEffect, useRef, useState } from "react";
import { sendReaction, listenReactions, type RoomReaction } from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";

const REACTIONS: {
  type: RoomReaction["type"];
  emoji: string;
  label: string;
  color: string;
}[] = [
  { type: "got_it",   emoji: "👍", label: "فهمت",       color: "#10b981" },
  { type: "question", emoji: "❓", label: "سؤال",       color: "#f59e0b" },
  { type: "confused", emoji: "😕", label: "محتاج شرح", color: "#ef4444" },
  { type: "ready",    emoji: "🚀", label: "جاهز",       color: "#6366f1" },
];

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  createdAt: number;
}

interface Props { roomId: string; isOwner: boolean; }

export function RoomReactions({ roomId, isOwner }: Props) {
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => listenReactions(roomId, (r) => {
    setReactions(r);
  }), [roomId]);

  // تنظيف الإيموجي العائمة القديمة كل 500ms
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFloating((prev) => prev.filter((f) => Date.now() - f.createdAt < 2800));
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // حين تصل ردود فعل جديدة → أضف إيموجي عائمة
  const prevLen = useRef(0);
  useEffect(() => {
    if (reactions.length > prevLen.current) {
      const newOnes = reactions.slice(prevLen.current);
      newOnes.forEach((r) => {
        const meta = REACTIONS.find((x) => x.type === r.type);
        if (!meta) return;
        setFloating((prev) => [
          ...prev,
          { id: r.id, emoji: meta.emoji, x: 10 + Math.random() * 80, createdAt: r.sentAt },
        ]);
      });
    }
    prevLen.current = reactions.length;
  }, [reactions]);

  async function react(type: RoomReaction["type"]) {
    if (!user || cooldown) return;
    setCooldown(true);
    await sendReaction(roomId, user.uid, profile?.name || user.displayName || "طالب", type);
    setTimeout(() => setCooldown(false), 2000); // cooldown 2 ثانية
  }

  // إحصاء الأستاذ
  const counts = REACTIONS.map((r) => ({
    ...r,
    count: reactions.filter((x) => x.type === r.type).length,
  }));
  const total = reactions.length;

  return (
    <>
      {/* ─── إيموجي عائمة (للجميع) ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 15 }}>
        {floating.map((f) => {
          const age = Date.now() - f.createdAt;
          const progress = Math.min(age / 2800, 1);
          return (
            <div
              key={f.id}
              className="absolute text-3xl select-none"
              style={{
                left: `${f.x}%`,
                bottom: `${10 + progress * 70}%`,
                opacity: 1 - progress,
                transform: `scale(${1.3 - progress * 0.3})`,
                transition: "none",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
              }}
            >
              {f.emoji}
            </div>
          );
        })}
      </div>

      {/* ─── ملخّص الأستاذ ─── */}
      {isOwner && total > 0 && (
        <div
          className="absolute left-3 top-14 z-20 flex flex-col gap-1.5 rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
            ردود الطلاب
          </p>
          {counts.filter((c) => c.count > 0).map((c) => (
            <div key={c.type} className="flex items-center gap-2">
              <span className="text-lg leading-none">{c.emoji}</span>
              <span className="font-bold text-white">{c.count}</span>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.max(4, (c.count / total) * 80)}px`,
                  background: c.color,
                }}
              />
            </div>
          ))}
          <p className="mt-1 text-[10px] text-white/40">{total} طالب استجابوا</p>
        </div>
      )}

      {/* ─── أزرار الردود (للطلاب وللجميع) ─── */}
      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)" }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => react(r.type)}
              disabled={cooldown}
              title={r.label}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
              style={{ minWidth: "48px" }}
            >
              <span className="text-2xl leading-none">{r.emoji}</span>
              <span className="text-[9px] font-bold text-white/70">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
