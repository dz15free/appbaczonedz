"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faPlay, faPause, faRotateLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import { setRoomTimer, listenRoomTimer, type RoomTimer as RTimer } from "@/features/rooms/rooms";

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
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ─── Hook مشترك لحالة المؤقّت ─── */
function useTimerState(roomId: string) {
  const [timer, setTimer] = useState<RTimer | null>(null);
  const [remaining, setRemaining] = useState(0);
  const alarmFired = useRef(false);

  useEffect(() => listenRoomTimer(roomId, setTimer), [roomId]);

  // نعتمد على القيم الأوّلية (primitives) لا على هوية الكائن — يمنع إعادة التشغيل المتكرّرة
  const active = timer?.active ?? false;
  const duration = timer?.duration ?? 0;
  const startedAt = timer?.startedAt ?? 0;

  useEffect(() => {
    if (!timer) { setRemaining(0); return; }
    if (!active) { setRemaining(Math.max(0, duration)); return; }

    alarmFired.current = false;
    const tick = () => {
      const rem = Math.max(0, duration - (Date.now() - startedAt) / 1000);
      setRemaining(Math.ceil(rem));
      if (rem <= 0 && !alarmFired.current) { alarmFired.current = true; playAlarm(); }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, duration, startedAt]);

  return { timer, remaining };
}

/* ═══════════════════════════════════════════════
   1) زر إعداد المؤقّت — يظهر في شريط أدوات المالك فقط
═══════════════════════════════════════════════ */
export function RoomTimerButton({ roomId }: { roomId: string }) {
  const [showSetup, setShowSetup] = useState(false);
  const [customMin, setCustomMin] = useState("15");
  const [label, setLabel] = useState("");
  const [preset, setPreset] = useState<number | null>(null);
  const { timer } = useTimerState(roomId);

  async function start(seconds: number) {
    const t: RTimer = { duration: seconds, startedAt: Date.now(), active: true };
    if (label.trim()) t.label = label.trim();
    await setRoomTimer(roomId, t);
    setShowSetup(false); setLabel("");
  }

  return (
    <>
      <button onClick={() => setShowSetup(true)}
        title="مؤقّت الدرس"
        className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-semibold transition ${
          timer ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-text-muted hover:bg-primary/10 hover:text-primary"
        }`}>
        <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
        <span className="hidden sm:inline">مؤقّت</span>
      </button>

      {showSetup && createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSetup(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">⏱️ ضبط المؤقّت</h3>
              <button onClick={() => setShowSetup(false)} className="text-text-muted hover:text-danger"><FontAwesomeIcon icon={faXmark} className="h-4 w-4" /></button>
            </div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="وصف المهمة (اختياري)"
              className="mb-3 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-text-primary outline-none focus:border-primary" />
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
                className="h-9 w-20 rounded-md border border-border bg-background px-3 text-center text-sm text-text-primary outline-none focus:border-primary" />
              <span className="text-sm text-text-muted">دقيقة مخصّصة</span>
            </div>
            {timer && (
              <button onClick={() => { setRoomTimer(roomId, null); setShowSetup(false); }}
                className="mb-2 w-full rounded-md border border-danger/30 py-2 text-sm font-bold text-danger hover:bg-danger/10">
                إيقاف المؤقّت الحالي
              </button>
            )}
            <button onClick={() => start(preset ?? (parseFloat(customMin) || 15) * 60)}
              className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white">🚀 ابدأ للجميع</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   2) عرض المؤقّت العائم — يظهر للجميع داخل لوحة المحتوى
═══════════════════════════════════════════════ */
export function RoomTimerDisplay({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const { timer, remaining } = useTimerState(roomId);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  // حاوية العرض: مسرح الغرفة (ليظهر داخل الشاشة الكاملة) وإلا body
  useEffect(() => {
    const pick = () => setPortalEl(document.getElementById("bz-room-stage") ?? document.body);
    pick();
    const stage = document.getElementById("bz-room-stage");
    const obs = new MutationObserver(pick);
    if (stage) obs.observe(stage, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (!timer || !portalEl) return null;

  const pct = Math.min(100, (remaining / timer.duration) * 100);
  const danger = remaining > 0 && remaining <= 60;
  const done = remaining === 0;
  const R = 26; const C = 2 * Math.PI * R;

  async function pause() { if (timer) await setRoomTimer(roomId, { ...timer, active: false, duration: remaining }); }
  async function resume() { if (timer) await setRoomTimer(roomId, { ...timer, active: true, startedAt: Date.now() }); }
  async function reset() { await setRoomTimer(roomId, null); }

  return createPortal(
    <div className={`pointer-events-auto fixed left-1/2 top-16 z-[10050] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-md sm:top-20 ${
      done ? "border-secondary bg-secondary/20" : danger ? "border-danger bg-danger/15" : "border-white/10 bg-black/70"}`}>
      <svg width="56" height="56" viewBox="0 0 64 64" className="shrink-0">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={done ? "#10b981" : danger ? "#ef4444" : "#3b82f6"}
          strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.5s linear", transform: "rotate(-90deg)", transformOrigin: "center" }} />
        <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="bold" fill="white">{done ? "✓" : fmt(remaining)}</text>
      </svg>
      <div className="min-w-0">
        {timer.label && <p className="truncate text-xs font-semibold text-white/90 max-w-[120px]">{timer.label}</p>}
        <p className={`text-[11px] font-bold ${done ? "text-secondary" : "text-white/60"}`}>
          {done ? "انتهى الوقت! 🎉" : danger ? "الوقت ينفد!" : "مؤقّت الدرس"}
        </p>
        {isOwner && (
          <div className="mt-1 flex gap-1">
            {timer.active && !done && <button onClick={pause} className="grid h-6 w-6 place-items-center rounded bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faPause} className="h-2.5 w-2.5" /></button>}
            {!timer.active && !done && <button onClick={resume} className="grid h-6 w-6 place-items-center rounded bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faPlay} className="h-2.5 w-2.5" /></button>}
            <button onClick={reset} className="grid h-6 w-6 place-items-center rounded bg-white/10 text-white hover:bg-white/20"><FontAwesomeIcon icon={faRotateLeft} className="h-2.5 w-2.5" /></button>
          </div>
        )}
      </div>
    </div>,
    portalEl
  );
}
