"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faRotateLeft, faArrowRight, faBrain, faMugHot, faBed } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

type Phase = "work" | "short" | "long";

const DURATIONS: Record<Phase, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Phase, string> = { work: "وقت الدراسة", short: "استراحة قصيرة", long: "استراحة طويلة" };
const COLORS: Record<Phase, string> = { work: "stroke-primary", short: "stroke-secondary", long: "stroke-warning" };
const BG: Record<Phase, string> = { work: "from-primary/5 to-transparent", short: "from-secondary/5 to-transparent", long: "from-warning/5 to-transparent" };
const ICON: Record<Phase, any> = { work: faBrain, short: faMugHot, long: faBed };
const R = 90;
const CIRC = 2 * Math.PI * R;

function playBell() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const times = [0, 0.3, 0.6];
    times.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.8);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.9);
    });
  } catch { /* صامت */ }
}

export default function PomodoroPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("work");
  const [seconds, setSeconds] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(1); // 1-4
  const [custom, setCustom] = useState<Record<Phase, number>>({ work: 25, short: 5, long: 15 });
  const [showSettings, setShowSettings] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = custom[phase] * 60;
  const progress = seconds / total;
  const dashOffset = CIRC * (1 - progress);

  function format(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  const nextPhase = useCallback(() => {
    playBell();
    setRunning(false);
    if (phase === "work") {
      if (session >= 4) { setSession(1); setPhase("long"); setSeconds(custom.long * 60); }
      else { setSession((s) => s + 1); setPhase("short"); setSeconds(custom.short * 60); }
    } else { setPhase("work"); setSeconds(custom.work * 60); }
  }, [phase, session, custom]);

  useEffect(() => {
    if (!running) { if (tickRef.current) clearInterval(tickRef.current); return; }
    tickRef.current = setInterval(() => {
      setSeconds((s) => { if (s <= 1) { nextPhase(); return 0; } return s - 1; });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, nextPhase]);

  function reset() { setRunning(false); setSeconds(custom[phase] * 60); }
  function switchPhase(p: Phase) { setRunning(false); setPhase(p); setSeconds(custom[p] * 60); }

  function applyCustom() {
    setShowSettings(false);
    setRunning(false);
    setSeconds(custom[phase] * 60);
  }

  return (
    <AppShell>
      <section className={`flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-gradient-to-b ${BG[phase]} px-4 py-8 transition-all duration-700`}>
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 self-start text-sm text-text-muted">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" /> رجوع
        </button>
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-extrabold">مؤقّت التركيز</h1>
          <p className="mt-1 text-xs text-text-muted">جلسات قصيرة تساعدك على الدراسة بتركيز واستراحات محسوبة.</p>
        </div>

        {/* أزرار المرحلة */}
        <div className="mb-8 flex gap-2 rounded-full border border-border bg-surface p-1">
          {(["work", "short", "long"] as Phase[]).map((p) => (
            <button key={p} onClick={() => switchPhase(p)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${phase === p ? "bg-gradient-primary text-white shadow" : "text-text-muted hover:text-primary"}`}>
              {LABELS[p]}
            </button>
          ))}
        </div>

        {/* الدائرة */}
        <div className="relative mb-8">
          <svg viewBox="0 0 200 200" className="h-56 w-56 -rotate-90">
            <circle cx="100" cy="100" r={R} strokeWidth="8" className="stroke-border fill-none" />
            <circle cx="100" cy="100" r={R} strokeWidth="8" strokeLinecap="round"
              className={`fill-none transition-all duration-1000 ${COLORS[phase]}`}
              strokeDasharray={CIRC} strokeDashoffset={dashOffset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <FontAwesomeIcon icon={ICON[phase]} className="mb-1 h-6 w-6 text-text-muted" />
            <span className="font-display text-4xl font-extrabold tabular-nums">{format(seconds)}</span>
            <span className="mt-1 text-xs text-text-muted">{LABELS[phase]}</span>
          </div>
        </div>

        {/* أزرار التحكّم */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={reset} aria-label="إعادة" className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-text-muted hover:border-primary hover:text-primary">
            <FontAwesomeIcon icon={faRotateLeft} className="h-5 w-5" />
          </button>
          <button onClick={() => setRunning((r) => !r)}
            className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-white shadow-glow hover:scale-105 transition">
            <FontAwesomeIcon icon={running ? faPause : faPlay} className="h-7 w-7" />
          </button>
          <button onClick={() => setShowSettings((s) => !s)}
            className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-text-muted hover:border-primary hover:text-primary text-xs font-bold">
            ضبط
          </button>
        </div>

        {/* عداد الجلسة */}
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full ${i < (phase === "work" ? session - 1 : session) ? "bg-primary" : "bg-border"}`} />
          ))}
          <span className="text-xs text-text-muted">جلسة {session} من 4</span>
        </div>

        {/* إعدادات المدة */}
        {showSettings && (
          <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-center text-sm font-bold">تخصيص المدد (دقيقة)</h3>
            {(["work", "short", "long"] as Phase[]).map((p) => (
              <div key={p} className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm">{LABELS[p]}</label>
                <input type="number" min={1} max={90} value={custom[p]}
                  onChange={(e) => setCustom((c) => ({ ...c, [p]: Math.max(1, +e.target.value) }))}
                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:border-primary" />
              </div>
            ))}
            <button onClick={applyCustom} className="mt-2 w-full rounded-md bg-gradient-primary py-2 text-sm font-bold text-white">تطبيق</button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
