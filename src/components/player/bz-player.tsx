"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

/* ════════════════════════════════════════════════════════════
   BacZone Player — مشغّل المنصّة الموحّد

   واجهة واحدة بهويّة المنصّة فوق محرّكين موجودين أصلاً:
     • عنصر <video> للمتصفّح (MP4 / WebM / فيديو BacZone / Drive عبر الخادم)
     • واجهة YouTube الرسمية (IFrame API) — نفسها التي تستعملها الغرف
   بلا أيّ مكتبة خارجية: لا وزن إضافي على هواتف التلاميذ.

   لماذا شريط التحكّم من اليسار إلى اليمين في صفحة عربية؟
   الزمن في الفيديو يتقدّم يساراً→يميناً عالمياً، وتوصيات Material
   للواجهات ثنائية الاتّجاه تنصّ على **عدم عكس** أزرار التشغيل وشريط
   التقدّم. النصوص والقوائم تبقى عربية من اليمين.

   الغرف تستعمل `PlayerChrome` وحده فوق مشغّلها: الواجهة تتبدّل،
   ومنطق التزامن في `video-sync.tsx` لا يُمسّ — أزرارنا تنادي الدوال
   نفسها التي كانت تناديها أزرار YouTube.
   ════════════════════════════════════════════════════════════ */

/* ── محوِّل المحرّك: كلّ محرّك يقدّم هذه الواجهة نفسها ── */
export interface MediaAdapter {
  play(): void;
  pause(): void;
  seek(t: number): void;
  time(): number;
  duration(): number;
  /** نهاية الجزء المحمَّل بالثواني */
  buffered(): number;
  paused(): boolean;
  waiting(): boolean;
  rate(): number;
  setRate(r: number): void;
  muted(): boolean;
  setMuted(m: boolean): void;
  volume(): number;
  setVolume(v: number): void;
  /** عنصر الفيديو إن وُجد — لصورة داخل صورة وملء الشاشة على iPhone */
  video?: HTMLVideoElement | null;
}

export function html5Adapter(v: HTMLVideoElement | null): MediaAdapter | null {
  if (!v) return null;
  return {
    play: () => { void v.play().catch(() => {}); },
    pause: () => v.pause(),
    seek: (t) => { v.currentTime = Math.max(0, Math.min(t, v.duration || t)); },
    time: () => v.currentTime || 0,
    duration: () => (Number.isFinite(v.duration) ? v.duration : 0),
    buffered: () => {
      const b = v.buffered;
      for (let i = b.length - 1; i >= 0; i--) if (b.start(i) <= v.currentTime + 0.5) return b.end(i);
      return 0;
    },
    paused: () => v.paused,
    waiting: () => !v.paused && v.readyState < 3,
    rate: () => v.playbackRate,
    setRate: (r) => { v.playbackRate = r; },
    muted: () => v.muted,
    setMuted: (m) => { v.muted = m; },
    volume: () => v.volume,
    setVolume: (x) => { v.volume = Math.max(0, Math.min(1, x)); if (x > 0) v.muted = false; },
    video: v,
  };
}

export function youtubeAdapter(p: any): MediaAdapter | null {
  if (!p?.getCurrentTime) return null;
  const st = () => { try { return p.getPlayerState?.(); } catch { return -1; } };
  return {
    play: () => p.playVideo?.(),
    pause: () => p.pauseVideo?.(),
    seek: (t) => p.seekTo?.(Math.max(0, t), true),
    time: () => p.getCurrentTime?.() ?? 0,
    duration: () => p.getDuration?.() ?? 0,
    buffered: () => (p.getVideoLoadedFraction?.() ?? 0) * (p.getDuration?.() ?? 0),
    paused: () => st() !== 1 && st() !== 3,          // 1=يعمل · 3=يحمّل
    waiting: () => st() === 3,
    rate: () => p.getPlaybackRate?.() ?? 1,
    setRate: (r) => p.setPlaybackRate?.(r),
    muted: () => !!p.isMuted?.(),
    setMuted: (m) => (m ? p.mute?.() : p.unMute?.()),
    volume: () => (p.getVolume?.() ?? 100) / 100,
    setVolume: (x) => { p.setVolume?.(Math.round(Math.max(0, Math.min(1, x)) * 100)); if (x > 0) p.unMute?.(); },
  };
}

/* ── تحميل واجهة YouTube مرّة واحدة للصفحة ── */
let ytApi: Promise<void> | null = null;
export function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve();
  if (!ytApi) {
    ytApi = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      if (!document.getElementById("yt-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    });
  }
  return ytApi;
}

/* ── أدوات ── */
export function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface Snap { t: number; d: number; b: number; paused: boolean; waiting: boolean; rate: number; muted: boolean; vol: number }

function snap(a: MediaAdapter | null): Snap {
  if (!a) return { t: 0, d: 0, b: 0, paused: true, waiting: false, rate: 1, muted: false, vol: 1 };
  return { t: a.time(), d: a.duration(), b: a.buffered(), paused: a.paused(), waiting: a.waiting(), rate: a.rate(), muted: a.muted(), vol: a.volume() };
}

/* ── أيقونات المشغّل: خطوط مستديرة بهويّة المنصّة، بلا مكتبة ── */
function Ico({ d, size = 20, fill = false }: { d: string; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const I = {
  play: "M7 4.9v14.2a1 1 0 0 0 1.5.86l11.6-7.1a1 1 0 0 0 0-1.72L8.5 4.04A1 1 0 0 0 7 4.9z",
  pause: "M7 4h3.2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm6.8 0H17a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  back10: "M11.5 5.5 8 8.5l3.5 3M8 8.5h6.5a5.5 5.5 0 1 1-5.2 7.3",
  fwd10: "M12.5 5.5 16 8.5l-3.5 3M16 8.5H9.5a5.5 5.5 0 1 0 5.2 7.3",
  vol: "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  mute: "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM16 9.5l5 5M21 9.5l-5 5",
  full: "M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4",
  exitFull: "M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4",
  pip: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12.5 12.5h5v4h-5z",
  restart: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
};

/* ════════════════════════════════════════════════════════════
   الواجهة فوق أيّ محرّك
   ════════════════════════════════════════════════════════════ */
export function PlayerChrome({
  adapter, containerRef, title, resumeKey, allowSpeed = true, onSeekCommit, onUserPlayPause, children, header = true,
}: {
  adapter: MediaAdapter | null;
  containerRef: RefObject<HTMLDivElement | null>;
  title?: string;
  /** مفتاح «متابعة من حيث توقّفت» — بلا مفتاح لا حفظ */
  resumeKey?: string;
  /** في الغرف: السرعة للمالك وحده تُفسد التزامن، فتُخفى */
  allowSpeed?: boolean;
  /** بعد أن يقفز المستخدم بنفسه (الغرف تبثّه للصفّ) */
  onSeekCommit?: (t: number) => void;
  onUserPlayPause?: (playing: boolean) => void;
  children?: ReactNode;
  /** شريط الشعار والعنوان أعلى المشغّل. YouTube يعرض عنوانه هناك ولا يجوز
      إخفاؤه، فيُنقل شعارنا إلى شريط الأزرار بدل التراكب فوقه. */
  header?: boolean;
}) {
  const [s, setS] = useState<Snap>(() => snap(adapter));
  const [visible, setVisible] = useState(true);
  const [menu, setMenu] = useState(false);
  const [fs, setFs] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [ripple, setRipple] = useState<{ side: "l" | "r"; k: number } | null>(null);
  const [resume, setResume] = useState<number | null>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const resumed = useRef(false);

  /* حالة المحرّك: ربع ثانية تكفي لشريط سلس وتكلفة لا تُذكر */
  useEffect(() => {
    setS(snap(adapter));
    const t = setInterval(() => setS(snap(adapter)), 250);
    return () => clearInterval(t);
  }, [adapter]);

  /* إظهار الأزرار ثمّ إخفاؤها بعد سكون أثناء التشغيل */
  const poke = useCallback(() => {
    setVisible(true);
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setVisible(false), 2600);
  }, []);
  const showUi = visible || s.paused || menu || scrub !== null;

  /* ── متابعة المشاهدة ── */
  useEffect(() => {
    if (!resumeKey || !adapter || resumed.current || !(s.d > 0)) return;
    resumed.current = true;
    let saved = 0;
    try { saved = Number(localStorage.getItem(`bz-resume:${resumeKey}`)) || 0; } catch { /* */ }
    if (saved > 15 && saved < s.d - 20) {
      adapter.seek(saved);
      setResume(saved);
      setTimeout(() => setResume(null), 7000);
    }
  }, [resumeKey, adapter, s.d]);

  useEffect(() => {
    if (!resumeKey || !(s.d > 0)) return;
    try {
      if (s.t > s.d * 0.95) localStorage.removeItem(`bz-resume:${resumeKey}`);
      else if (s.t > 5 && Math.floor(s.t) % 5 === 0) localStorage.setItem(`bz-resume:${resumeKey}`, String(Math.floor(s.t)));
    } catch { /* التخزين محجوب */ }
  }, [resumeKey, s.t, s.d]);

  /* ملء صفحة بديل (iPhone + YouTube): يُطبَّق على حاوية المشغّل نفسها */
  useEffect(() => {
    containerRef.current?.classList.toggle("bzp-pseudo-fs", fs && !document.fullscreenElement);
  }, [fs, containerRef]);

  /* ── ملء الشاشة ── */
  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggleFs = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => {}); return; }
    if (el.requestFullscreen) { void el.requestFullscreen().catch(() => setFs((x) => !x)); return; }
    /* iPhone: لا ملء شاشة لعنصر عامّ — فيديو المتصفّح يملك ملء شاشته، و YouTube يأخذ ملء الصفحة */
    const v = adapter?.video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null | undefined;
    if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen();
    else setFs((x) => !x);
  }, [adapter, containerRef]);

  const canPip = typeof document !== "undefined" && !!adapter?.video && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
  const togglePip = () => {
    const v = adapter?.video;
    if (!v) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {});
    else void v.requestPictureInPicture?.().catch(() => {});
  };

  const togglePlay = useCallback(() => {
    if (!adapter) return;
    if (adapter.paused()) { adapter.play(); onUserPlayPause?.(true); } else { adapter.pause(); onUserPlayPause?.(false); }
    poke();
  }, [adapter, onUserPlayPause, poke]);

  const jump = useCallback((dt: number) => {
    if (!adapter) return;
    const t = Math.max(0, Math.min(adapter.time() + dt, adapter.duration() || Infinity));
    adapter.seek(t);
    onSeekCommit?.(t);
    poke();
  }, [adapter, onSeekCommit, poke]);

  /* ── لوحة المفاتيح (حين يكون المشغّل في التركيز) ── */
  const onKey = (e: React.KeyboardEvent) => {
    if (!adapter || (e.target as HTMLElement).closest("input,textarea,select")) return;
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      " ": togglePlay, k: togglePlay,
      arrowright: () => jump(5), arrowleft: () => jump(-5),
      l: () => jump(10), j: () => jump(-10),
      m: () => adapter.setMuted(!adapter.muted()),
      f: toggleFs,
      arrowup: () => adapter.setVolume(adapter.volume() + 0.1),
      arrowdown: () => adapter.setVolume(adapter.volume() - 0.1),
      ">": () => allowSpeed && adapter.setRate(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(adapter.rate()) + 1)] ?? 1),
      "<": () => allowSpeed && adapter.setRate(SPEEDS[Math.max(0, SPEEDS.indexOf(adapter.rate()) - 1)] ?? 1),
    };
    if (/^[0-9]$/.test(k) && adapter.duration()) { e.preventDefault(); const t = adapter.duration() * Number(k) / 10; adapter.seek(t); onSeekCommit?.(t); poke(); return; }
    const fn = map[k];
    if (fn) { e.preventDefault(); fn(); poke(); }
  };

  /* ── اللمس: نقرة تُظهر الأزرار، ونقرتان على الجانب تقفزان 10 ثوانٍ ── */
  const onSurface = (e: React.PointerEvent<HTMLDivElement>) => {
    if (menu) { setMenu(false); return; }
    /* الفأرة: نقرة = تشغيل/إيقاف، ونقرتان = ملء الشاشة (onDoubleClick) */
    if (e.pointerType === "mouse") { if (e.button === 0) togglePlay(); return; }
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (now - lastTap.current < 300) {
      if (x < 0.35) { jump(-10); setRipple({ side: "l", k: now }); }
      else if (x > 0.65) { jump(10); setRipple({ side: "r", k: now }); }
      else toggleFs();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    if (!showUi) poke(); else if (s.paused) togglePlay(); else setVisible(false);
  };

  /* ── شريط التقدّم ── */
  const posFrom = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || !s.d) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * s.d;
  };
  const onBarDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrub(posFrom(e.clientX));
  };
  const onBarMove = (e: React.PointerEvent) => {
    const t = posFrom(e.clientX);
    const r = bar.current!.getBoundingClientRect();
    setHover({ x: Math.max(24, Math.min(r.width - 24, e.clientX - r.left)), t });
    if (scrub !== null) setScrub(t);
  };
  const onBarUp = () => {
    if (scrub === null || !adapter) return;
    adapter.seek(scrub);
    onSeekCommit?.(scrub);
    setScrub(null);
    poke();
  };

  const shown = scrub ?? s.t;
  const pct = s.d ? (shown / s.d) * 100 : 0;
  const bpct = s.d ? Math.min(100, (s.b / s.d) * 100) : 0;

  return (
    <div
      className={`bzp absolute inset-0 z-[5] select-none outline-none ${showUi ? "" : "cursor-none"}`}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={(e) => { if (e.pointerType === "mouse") poke(); }}
      aria-label={title ? `مشغّل الفيديو: ${title}` : "مشغّل الفيديو"}
    >
      {children}

      {/* سطح النقر */}
      <div className="absolute inset-0" onPointerUp={onSurface} onDoubleClick={toggleFs} />

      {/* الهويّة والعنوان */}
      {header && <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-8 pt-2.5 transition-opacity duration-300 ${showUi ? "opacity-100" : "opacity-0"}`} dir="rtl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_LOGO} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-md" />
        <span className="text-[11px] font-extrabold tracking-wide text-white/90">BacZone</span>
        {title && <span className="min-w-0 truncate border-s border-white/25 ps-2 text-[12px] font-bold text-white/85">{title}</span>}
      </div>}

      {/* التحميل */}
      {s.waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        </div>
      )}

      {/* زرّ التشغيل الكبير */}
      {s.paused && !s.waiting && (
        <button type="button" onClick={togglePlay} aria-label="تشغيل"
          className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#3044E0] text-white shadow-[0_8px_30px_rgba(48,68,224,.55)] ring-4 ring-white/15 transition hover:scale-105 active:scale-95 sm:h-[72px] sm:w-[72px]">
          <span className="ms-1"><Ico d={I.play} size={28} fill /></span>
        </button>
      )}

      {/* نقرتان: تموّج +10 / −10 */}
      {ripple && (
        <div key={ripple.k} className={`bzp-ripple pointer-events-none absolute top-1/2 grid h-24 w-24 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-sm font-extrabold text-white ${ripple.side === "l" ? "left-[8%]" : "right-[8%]"}`}
          onAnimationEnd={() => setRipple(null)}>
          {ripple.side === "l" ? "‏−10 ث" : "+10 ث"}
        </div>
      )}

      {/* متابعة المشاهدة */}
      {resume !== null && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/75 py-1.5 pe-1.5 ps-3.5 text-[12px] font-bold text-white backdrop-blur" dir="rtl">
          تابعتَ من {fmtTime(resume)}
          <button type="button" onClick={() => { adapter?.seek(0); onSeekCommit?.(0); setResume(null); }}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-white/15 px-3 text-[11.5px] hover:bg-white/25">
            <Ico d={I.restart} size={14} /> من البداية
          </button>
        </div>
      )}

      {/* شريط التحكّم */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2.5 pb-2 pt-10 transition-opacity duration-300 sm:px-4 ${showUi ? "opacity-100" : "pointer-events-none opacity-0"}`} dir="ltr">
        {/* التقدّم */}
        <div
          ref={bar}
          className="group relative flex h-5 cursor-pointer touch-none items-center"
          role="slider" aria-label="موضع التشغيل" aria-valuemin={0} aria-valuemax={Math.round(s.d)} aria-valuenow={Math.round(shown)}
          aria-valuetext={`${fmtTime(shown)} من ${fmtTime(s.d)}`} tabIndex={-1}
          onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={onBarUp} onPointerLeave={() => setHover(null)}
        >
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-1.5">
            <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${bpct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#3044E0]" style={{ width: `${pct}%` }} />
          </div>
          <span className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow ring-[3px] ring-[#3044E0] transition-transform group-hover:scale-110"
            style={{ left: `${pct}%` }} />
          {hover && s.d > 0 && (
            <span className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-black/85 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white" style={{ left: hover.x }}>
              {fmtTime(hover.t)}
            </span>
          )}
        </div>

        {/* الأزرار */}
        <div className="mt-0.5 flex items-center gap-0.5 text-white sm:gap-1">
          <Btn label={s.paused ? "تشغيل (K)" : "إيقاف (K)"} onClick={togglePlay}><Ico d={s.paused ? I.play : I.pause} size={22} fill /></Btn>
          <Btn label="رجوع 10 ثوانٍ (J)" onClick={() => jump(-10)}><Ico d={I.back10} /></Btn>
          <Btn label="تقدّم 10 ثوانٍ (L)" onClick={() => jump(10)}><Ico d={I.fwd10} /></Btn>
          <div className="group/vol flex items-center">
            <Btn label={s.muted ? "إلغاء الكتم (M)" : "كتم (M)"} onClick={() => adapter?.setMuted(!s.muted)}>
              <Ico d={s.muted || s.vol === 0 ? I.mute : I.vol} />
            </Btn>
            <input type="range" min={0} max={1} step={0.05} value={s.muted ? 0 : s.vol}
              onChange={(e) => adapter?.setVolume(Number(e.target.value))} aria-label="مستوى الصوت"
              className="bzp-vol hidden w-0 opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:block" />
          </div>
          <span className="ms-1 text-[12px] font-bold tabular-nums text-white/90">
            {fmtTime(shown)} <span className="text-white/50">/ {fmtTime(s.d)}</span>
          </span>

          <span className="flex-1" />

          {allowSpeed && (
            <div className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} title="سرعة التشغيل"
                className={`min-h-[40px] min-w-[44px] rounded-lg px-2 text-[12.5px] font-extrabold tabular-nums transition hover:bg-white/15 ${s.rate !== 1 ? "text-[#AAB6FF]" : ""}`}>
                {s.rate}×
              </button>
              {menu && (
                <div role="menu" className="absolute bottom-11 right-0 z-10 w-32 overflow-hidden rounded-xl bg-[#141933]/95 py-1 shadow-xl ring-1 ring-white/10 backdrop-blur" dir="rtl">
                  <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-bold text-white/50">السرعة</p>
                  {SPEEDS.map((r) => (
                    <button key={r} type="button" role="menuitemradio" aria-checked={s.rate === r}
                      onClick={() => { adapter?.setRate(r); setMenu(false); poke(); }}
                      className={`flex min-h-[36px] w-full items-center justify-between px-3 text-[12.5px] font-bold tabular-nums hover:bg-white/10 ${s.rate === r ? "text-[#AAB6FF]" : "text-white"}`}>
                      <span>{r === 1 ? "عادية" : `${r}×`}</span>{s.rate === r && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canPip && <Btn label="صورة داخل صورة" onClick={togglePip}><Ico d={I.pip} /></Btn>}
          {!header && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={DEFAULT_LOGO} alt="BacZone" width={20} height={20} className="mx-1 h-5 w-5 rounded-md opacity-90" />
          )}
          <Btn label={fs ? "خروج من ملء الشاشة (F)" : "ملء الشاشة (F)"} onClick={toggleFs}><Ico d={fs ? I.exitFull : I.full} /></Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="grid h-10 w-10 place-items-center rounded-lg transition hover:bg-white/15 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AAB6FF]">
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   المشغّل الكامل — للدورات وكلّ مكان يعرض فيديو واحداً
   ════════════════════════════════════════════════════════════ */
export type PlayerSource =
  | { kind: "file"; url: string; type?: string }
  | { kind: "youtube"; id: string };

export function BzPlayer({
  source, title, resumeKey, onError, onEnded,
}: {
  source: PlayerSource;
  title?: string;
  resumeKey?: string;
  onError?: (currentTime: number) => void;
  onEnded?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const [adapter, setAdapter] = useState<MediaAdapter | null>(null);

  /* المحرّك: عنصر الفيديو */
  useEffect(() => {
    if (source.kind !== "file") return;
    setAdapter(html5Adapter(vid.current));
  }, [source]);

  /* المحرّك: YouTube — بلا أزرار YouTube؛ أزرارنا فوقه */
  useEffect(() => {
    if (source.kind !== "youtube" || !ytHost.current) return;
    let player: { destroy?: () => void } | null = null;
    let dead = false;
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    ytHost.current.appendChild(host);
    void loadYouTubeApi().then(() => {
      if (dead) return;
      const YT = (window as any).YT;
      const p = new YT.Player(host, {
        videoId: source.id, width: "100%", height: "100%",
        playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (!dead) setAdapter(youtubeAdapter(p)); },
          onStateChange: (e: { data: number }) => { if (e.data === 0) onEnded?.(); },
        },
      });
      player = p;
    });
    return () => {
      dead = true;
      setAdapter(null);
      try { player?.destroy?.(); } catch { /* */ }
      host.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind === "youtube" ? source.id : ""]);

  return (
    <div ref={wrap} className="bzp-root relative aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-[0_10px_40px_-12px_rgba(21,26,48,.45)] ring-1 ring-black/5">
      {source.kind === "file" ? (
        <video
          ref={vid}
          key={source.url}
          className="absolute inset-0 h-full w-full"
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={() => setAdapter(html5Adapter(vid.current))}
          onError={() => onError?.(vid.current?.currentTime ?? 0)}
          onEnded={onEnded}
        >
          <source src={source.url} type={source.type} />
        </video>
      ) : (
        <div ref={ytHost} className="absolute inset-0 [&_iframe]:pointer-events-none" />
      )}
      <PlayerChrome adapter={adapter} containerRef={wrap} title={title} resumeKey={resumeKey} header={source.kind === "file"} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Google Drive — لا واجهة رسمية للتحكّم فيه، فيبقى مشغّل Google
   داخل إطار بهويّة المنصّة. لا محاولة لتجاوز قيود Google.
   ════════════════════════════════════════════════════════════ */
export function BrandedEmbed({ url, title, note }: { url: string; title: string; note?: string }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-black shadow-[0_10px_40px_-12px_rgba(21,26,48,.45)] ring-1 ring-black/5">
      <div className="flex items-center gap-2 bg-[#141933] px-3 py-2" dir="rtl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_LOGO} alt="" width={20} height={20} className="h-5 w-5 rounded-md" />
        <span className="text-[11px] font-extrabold text-white/90">BacZone</span>
        <span className="min-w-0 truncate border-s border-white/20 ps-2 text-[12px] font-bold text-white/80">{title}</span>
      </div>
      <iframe src={url} title={title} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen className="aspect-video w-full border-0" />
      {note && <p className="bg-[#141933] px-3 py-1.5 text-[10.5px] text-white/55" dir="rtl">{note}</p>}
    </div>
  );
}
