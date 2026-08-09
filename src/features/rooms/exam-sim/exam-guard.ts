"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamGuardOpts } from "@/features/rooms/exam-sim/exam-session";

/* ════════════════════════════════════════════════════════════
   حارس قاعة الامتحان — منقول من `simGuard` في المحاكي

   **المنطق كما هو، حرفاً بحرف**، ولم يُضعَف شيء منه:

     • `visibilitychange` → «تبديل تبويب»
     • `blur` مع استثناء الإطار → النقر داخل عارض الموضوع ليس غشّاً
     • `fullscreenchange` → «خروج من ملء الشاشة»
     • حجب Ctrl+C/P/U/S وقائمة السياق
     • مهلة سماح 1200ms تمنع العدّ المزدوج للحدث الواحد
     • مهلة سماح صريحة عند فتح الموضوع في تبويب جديد
     • تنبيه الدقائق الخمس الأخيرة + التكّة + جرس البداية والنهاية

   ما أُضيف: العدّاد يُرفَع مع ورقة الطالب فيراه الأستاذ. لا حكم ولا
   منطق اتّهام جديد — رقم كما سجّله المحرّك، والقرار للأستاذ.

   وأُزيل شيء واحد عمداً: `window.onbeforeunload` من المحاكي. داخل
   الغرفة تُدار المغادرة بحالة الغرفة نفسها، وتثبيت مستمع عامّ يكسر
   تنقّل بقيّة المنصّة.
════════════════════════════════════════════════════════════ */

const DEBOUNCE_MS = 1200;

/* ── الصوت: نغمات مولَّدة، بلا أي ملفّ أو مكتبة ── */
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const c = ctx();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* الصوت مساعد لا شرط */ }
}

function strike(delay: number, base: number) {
  tone(base, 1.1, "sine", 0.22, delay);
  tone(base * 2, 0.9, "sine", 0.10, delay);
}
export function bellStart() { strike(0, 660); strike(0.42, 660); }
export function bellEnd() { strike(0, 520); strike(0.40, 520); strike(0.80, 520); }
function tick(hi: boolean) { tone(hi ? 1500 : 1150, 0.05, "square", 0.055); }
function alarm() { tone(880, 0.16, "sawtooth", 0.16, 0); tone(660, 0.16, "sawtooth", 0.16, 0.18); }
function warn5() { tone(990, 0.20, "triangle", 0.18, 0); tone(1320, 0.28, "triangle", 0.18, 0.22); }

/** تفعيل الصوت يجب أن يقع داخل نقرة المستخدم — تقيّده كل المتصفّحات */
export function primeAudio() { ctx(); }

/* ── ملء الشاشة ── */
type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function enterFullscreen(el?: HTMLElement | null) {
  const target = (el ?? document.documentElement) as FsEl;
  try {
    if (target.requestFullscreen) await target.requestFullscreen();
    else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
  } catch { /* بعض المتصفّحات ترفض — الامتحان يستمرّ */ }
}

export async function exitFullscreen() {
  const d = document as FsDoc;
  try {
    if (d.exitFullscreen && d.fullscreenElement) await d.exitFullscreen();
    else if (d.webkitExitFullscreen && d.webkitFullscreenElement) await d.webkitExitFullscreen();
  } catch { /* تجاهل */ }
}

/* ── الحارس ── */

export interface GuardState {
  violations: number;
  lastReason: string;
  alarmOpen: boolean;
}

export function useExamGuard({
  active, opts, secondsLeft, stageRef,
}: {
  /** يعمل أثناء الامتحان الجاري فقط — وينظّف نفسه عند الخروج */
  active: boolean;
  opts: ExamGuardOpts;
  secondsLeft: number;
  /** العنصر الذي يُملأ به الشاشة */
  stageRef?: React.RefObject<HTMLElement | null>;
}) {
  const [violations, setViolations] = useState(0);
  const [lastReason, setLastReason] = useState("");
  const [alarmOpen, setAlarmOpen] = useState(false);

  const lastHit = useRef(0);
  const warned5 = useRef(false);
  const armed = useRef(false);

  armed.current = active;

  const violation = useCallback((reason: string) => {
    if (!armed.current || !opts.ac) return;
    const now = Date.now();
    if (now - lastHit.current < DEBOUNCE_MS) return;   // منع العدّ المزدوج
    lastHit.current = now;
    setViolations((v) => v + 1);
    setLastReason(reason);
    setAlarmOpen(true);
    if (opts.sfx) alarm();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([120, 70, 120]); } catch { /* غير مدعوم */ }
    }
  }, [opts.ac, opts.sfx]);

  /** النقر على «فتح الموضوع في تبويب» ليس غشّاً — مهلة سماح صريحة */
  const grace = useCallback((ms = 2500) => { lastHit.current = Date.now() + ms; }, []);

  /* ── المستمعات ── */
  useEffect(() => {
    if (!active) return;

    const onHide = () => { if (document.hidden) violation("تبديل تبويب"); };

    const onBlur = () => {
      // فقدان التركيز بسبب النقر داخل إطار الموضوع ليس مغادرة
      window.setTimeout(() => {
        const ae = document.activeElement;
        if (ae && ae.tagName === "IFRAME") return;
        if (document.hidden) return;   // visibilitychange تكفّلت بها
        violation("مغادرة النافذة");
      }, 220);
    };

    const onFsChange = () => {
      if (!opts.fs) return;
      if (!isFullscreen()) violation("خروج من ملء الشاشة");
    };

    const onKey = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "p", "u", "s"].includes(k)) e.preventDefault();
    };

    const onMenu = (e: Event) => e.preventDefault();

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onMenu);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", onMenu);
    };
  }, [active, opts.fs, violation]);

  /* ── تنبيه الدقائق الخمس + التكّة ── */
  useEffect(() => {
    if (!active || !opts.sfx) return;
    if (secondsLeft === 300 && !warned5.current) {
      warned5.current = true;
      warn5();
    }
    if (secondsLeft <= 300 && secondsLeft > 0) tick(secondsLeft % 2 === 0);
  }, [active, opts.sfx, secondsLeft]);

  /* ── ملء الشاشة عند البدء، والخروج منه عند الانتهاء ── */
  useEffect(() => {
    if (!active || !opts.fs) return;
    void enterFullscreen(stageRef?.current ?? null);
    return () => { void exitFullscreen(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, opts.fs]);

  useEffect(() => {
    if (!active) { warned5.current = false; setAlarmOpen(false); }
  }, [active]);

  const resume = useCallback(() => {
    setAlarmOpen(false);
    if (opts.fs && !isFullscreen()) void enterFullscreen(stageRef?.current ?? null);
  }, [opts.fs, stageRef]);

  return { violations, lastReason, alarmOpen, resume, grace, violation };
}

/** نصّ تقرير النزاهة — نفس صياغة المحاكي ومعناه */
export function integrityReport(violations: number, acEnabled: boolean): { tone: "ok" | "bad"; text: string } {
  if (!acEnabled) {
    return { tone: "ok", text: "المراقبة كانت معطّلة في هذه المحاكاة، فلا يوجد تقرير نزاهة." };
  }
  if (violations === 0) {
    return {
      tone: "ok",
      text: "نزاهة كاملة: لم تغادر شاشة الامتحان ولا مرّة واحدة. هذا بالضبط ما يُطلب منك يوم البكالوريا.",
    };
  }
  return {
    tone: "bad",
    text: `سُجّلت ${violations} محاولة خروج من شاشة الامتحان. في القاعة الحقيقية تكفي واحدة لسحب ورقتك.`,
  };
}
