"use client";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faPlay, faPause, faRotateLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import { setRoomTimer, listenRoomTimer, type RoomTimer } from "@/features/rooms/rooms";

const PRESETS = [
  { label: "5 د", s: 300 }, { label: "10 د", s: 600 }, { label: "20 د", s: 1200 },
  { label: "30 د", s: 1800 }, { label: "45 د", s: 2700 }, { label: "ساعة", s: 3600 },
];

function playAlarm() {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    [880, 1100, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.2);
      osc.start(ctx.currentTime + i * 0.25); osc.stop(ctx.currentTime + i * 0.25 + 0.2);
    });
  } catch { /* ignore */ }
}

function fmt(secs: number) {
  return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
}

export function RoomTimer({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const [timer, setTimer] = useState<RoomTimer | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [customMin, setCustomMin] = useState("15");
  const [label, setLabel] = useState("");
  const [preset, setPreset] = useState<number | null>(null);
  const alarmFired = useRef(false);

  useEffect(() => listenRoomTimer(roomId, setTimer), [roomId]);

  useEffect(() => {
    if (!timer?.active) { setRemaining(timer ? Math.max(0, timer.duration) : 0); return; }
    alarmFired.current = false;
    const tick = () => {
      const rem = Math.max(0, timer.duration - (Date.now() - timer.startedAt) / 1000);
      setRemaining(Math.ceil(rem));
      if (rem <= 0 && !alarmFired.current) { alarmFired.current = true; playAlarm(); }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [timer]);

  async function start(seconds: number) {
    await setRoomTimer(roomId, { duration: seconds, startedAt: Date.now(), active: true, label: label || undefined });
    setShowSetup(false); setLabel("");
  }
  async function pause() { if (timer) await setRoomTimer(roomId, { ...timer, active: false, duration: remaining }); }
  async function resume() { if (timer) await setRoomTimer(roomId, { ...timer, active: true, startedAt: Date.now() }); }
  async function reset() { await setRoomTimer(roomId, null); alarmFired.current = false; }

  const pct = timer ? Math.min(100, (remaining / timer.duration) * 100) : 0;
  const danger = remaining > 0 && remaining <= 60;
  const done = !!(timer && remaining === 0);
  const R = 30; const C = 2 * Math.PI * R;

  if (!timer && !showSetup && !isOwner) return null;

  return (
    <>
      {showSetup && isOwner && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSetup(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">⏱️ ضبط المؤقّت</h3>
              <button onClick={() => setShowSetup(false)} className="text-text-muted hover:text-danger"><FontAwesomeIcon icon={faXmark} className="h-4 w-4" /></button>
            </div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="وصف المهمة (اختياري)"
              className="mb-3 h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button key={p.s} onClick={() => { setPreset(p.s); setCustomMin(String(p.s / 60)); }}
                  className={`rounded-lg py-2 text-sm font-bold transition ${preset === p.s ? "bg-gradient-primary text-white" : "border border-border hover:border-primary"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mb-4 flex items-center gap-2">
              <input type="number" value={customMin} onChange={(e) => { setCustomMin(e.target.value); setPreset(null); }} min="1" max="180"
                className="h-9 w-20 rounded-md border border-border bg-background px-3 text-center text-sm outline-none focus:border-primary" />
              <span className="text-sm text-text-muted">دقيقة مخصّصة</span>
            </div>
            <button onClick={() => start((preset ?? (parseFloat(customMin) || 15)) * 60)}
              className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white">🚀 ابدأ للجميع</button>
          </div>
        </div>
      )}
      {timer ? (
        <div className={`absolute left-1/2 top-14 z-20 -translate-x-1/2 flex flex-col items-center rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-md border ${
          done ? "bg-secondary/20 border-secondary" : danger ? "bg-danger/15 border-danger" : "bg-black/60 border-white/10"}`}
          style={{ minWidth: "170px" }}>
          <svg width="72" height="72" viewBox="0 0 72 72" className="mb-1">
            <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="36" cy="36" r={R} fill="none" stroke={done ? "#10b981" : danger ? "#ef4444" : "#6366f1"}
              strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.5s linear", transform: "rotate(-90deg)", transformOrigin: "center" }} />
            <text x="36" y="42" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">{done ? "✓" : fmt(remaining)}</text>
          </svg>
          {timer.label && <p className="mb-1.5 text-center text-xs font-semibold text-white/80">{timer.label}</p>}
          {done && <p className="mb-1.5 text-sm font-bold text-secondary animate-pulse">انتهى الوقت! 🎉</p>}
          {isOwner && (
            <div className="flex gap-1.5">
              {timer.active && !done && <button onClick={pause} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faPause} className="h-3 w-3" /></button>}
              {!timer.active && !done && <button onClick={resume} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faPlay} className="h-3 w-3" /></button>}
              <button onClick={reset} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      ) : isOwner ? (
        <button onClick={() => setShowSetup(true)} className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-2 text-sm font-semibold text-text-muted transition hover:bg-primary/10 hover:text-primary">
          <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
          <span className="hidden sm:inline">مؤقّت</span>
        </button>
      ) : null}
    </>
  );
}
