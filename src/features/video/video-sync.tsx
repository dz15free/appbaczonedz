"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void; }
}

type SourceType = "youtube" | "gdrive" | "direct";

interface VideoState {
  sourceType: SourceType;
  videoId?: string;
  videoUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  muted?: boolean; // كتم الصوت — يتحكّم به المالك ويُطبَّق على الجميع
  updatedAt: number;
}

function detectSource(url: string): SourceType {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) return "gdrive";
  return "direct";
}

function extractYouTubeId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}

function gdriveEmbed(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return url;
}

export function VideoSync({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const [urlInput, setUrlInput] = useState("");
  const [state, setState] = useState<VideoState | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const statePath = `roomLive/${roomId}/videoState`;

  /*
   * ─── نهج معزول للـ YouTube ───────────────────────────────────────────────
   * نُنشئ حاوية ثابتة (stableWrapRef) لا يُعيد React رسمها أبداً.
   * ثم نُلصق بداخلها <div> يُنشئه YouTube ويحوّله إلى <iframe>.
   * هكذا تختفي أخطاء insertBefore لأن React لا يعرف بالـ <div> الداخلي.
   */
  const stableWrapRef = useRef<HTMLDivElement>(null); // حاوية React مستقرة
  const ytPlayerRef = useRef<any>(null);
  const ytReady = useRef(false);
  const applyingRemote = useRef(false);
  const stateRef = useRef<VideoState | null>(null);
  const mp4Ref = useRef<HTMLVideoElement>(null);
  const studentUnmuted = useRef(false); // هل فعّل الطالب الصوت يدوياً؟

  /* ── استمع لتغيّرات الحالة ── */
  useEffect(() => {
    return onValue(ref(rtdb, statePath), (snap) => {
      const raw = snap.val() as any;
      if (!raw) return;
      if (!raw.sourceType) raw.sourceType = raw.videoId ? "youtube" : "direct";
      const s = raw as VideoState;
      const prev = stateRef.current;
      stateRef.current = s;
      setState(s);
      syncToPlayer(s, prev);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function syncToPlayer(s: VideoState, prev: VideoState | null) {
    if (s.sourceType === "youtube") {
      const p = ytPlayerRef.current;
      if (!p || !ytReady.current) return;
      applyingRemote.current = true;
      if (!prev || prev.videoId !== s.videoId) {
        // الطلاب: ابدأ مكتوماً ليسمح iOS بالتشغيل التلقائي
        if (!isOwner) { try { p.mute?.(); } catch { /* ignore */ } }
        p.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
        setTimeout(() => {
          if (s.isPlaying) {
            p.playVideo?.();
            // للطلاب: نعرض زر فك الكتم (التشغيل نجح مكتوماً)
            if (!isOwner) setTimeout(() => setNeedsTap(true), 1200);
          }
        }, 1200);
      } else {
        const local = p.getCurrentTime?.() ?? 0;
        if (Math.abs(local - s.currentTime) > 2) p.seekTo(s.currentTime, true);
        if (s.isPlaying) p.playVideo?.(); else p.pauseVideo?.();
      }
      // تطبيق الكتم: مكتوم إذا كتم المالك للكل، أو إذا لم يفعّل الطالب الصوت بعد
      applyMute(s.muted ?? false);
      setTimeout(() => { applyingRemote.current = false; }, 700);
    } else if (s.sourceType === "direct") {
      const v = mp4Ref.current;
      if (!v) return;
      if (!prev || prev.videoUrl !== s.videoUrl) v.src = s.videoUrl ?? "";
      // المالك مصدر الحقيقة — لا يُعيد تطبيق حالته على نفسه (يمنع التقطيع)
      if (isOwner) { v.muted = s.muted ?? false; return; }
      // الطلاب: مكتوم إذا كتم المالك أو لم يفعّل الطالب الصوت
      v.muted = (s.muted ?? false) || !studentUnmuted.current;
      const local = v.currentTime ?? 0;
      if (Math.abs(local - s.currentTime) > 3) v.currentTime = s.currentTime;
      if (s.isPlaying && v.paused) v.play().then(() => { if (!studentUnmuted.current) setNeedsTap(true); }).catch(() => setNeedsTap(true));
      else if (!s.isPlaying && !v.paused) v.pause();
    }
  }

  // تطبيق حالة الكتم على مشغّل YouTube حسب الدور وحالة الطالب
  function applyMute(ownerMuted: boolean) {
    const p = ytPlayerRef.current;
    if (!p) return;
    try {
      if (isOwner) {
        if (ownerMuted) p.mute?.(); else p.unMute?.();
      } else {
        // الطالب: مكتوم إذا كتم المالك للكل، أو إذا لم يفعّل الصوت بعد
        if (ownerMuted || !studentUnmuted.current) p.mute?.();
        else p.unMute?.();
      }
    } catch { /* ignore */ }
  }

  /* ── تهيئة YouTube Player مرّة واحدة فقط ── */
  useEffect(() => {
    let destroyed = false;

    function initPlayer() {
      if (destroyed || !stableWrapRef.current || ytPlayerRef.current) return;

      // أنشئ div داخلي خارج سيطرة React
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      stableWrapRef.current.appendChild(host);

      ytPlayerRef.current = new window.YT.Player(host, {
        height: "100%",
        width: "100%",
        playerVars: {
          controls: isOwner ? 1 : 0,
          disablekb: isOwner ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            ytReady.current = true;
            const s = stateRef.current;
            // الطلاب: نبدأ مكتومين ليسمح iOS بالتشغيل التلقائي، ثم زر لفك الكتم
            if (!isOwner) {
              try { ytPlayerRef.current?.mute?.(); } catch { /* ignore */ }
            }
            if (!s?.videoId) return;
            ytPlayerRef.current?.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
            if (s.isPlaying) {
              setTimeout(() => {
                ytPlayerRef.current?.playVideo?.();
                // للطلاب: إن نجح التشغيل (مكتوماً) نعرض زر فك الكتم
                if (!isOwner) setTimeout(() => setNeedsTap(true), 1200);
              }, 800);
            }
          },
          onStateChange: (e: any) => {
            if (!isOwner || applyingRemote.current || destroyed) return;
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) pushYTState(true);
            else if (e.data === YT.PlayerState.PAUSED) pushYTState(false);
          },
        },
      });
    }

    function loadYTApi() {
      if (window.YT?.Player) {
        initPlayer();
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
      if (!document.getElementById("yt-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    loadYTApi();

    return () => {
      destroyed = true;
      ytReady.current = false;
      try { ytPlayerRef.current?.destroy?.(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  function pushYTState(isPlaying: boolean) {
    const s = stateRef.current;
    const vid = ytPlayerRef.current?.getVideoData?.()?.video_id ?? s?.videoId;
    if (!vid) return;
    set(ref(rtdb, statePath), {
      sourceType: "youtube", videoId: vid, isPlaying,
      currentTime: ytPlayerRef.current?.getCurrentTime?.() ?? 0,
      muted: s?.muted ?? false,
      updatedAt: Date.now(),
    });
  }

  function pushMP4State(isPlaying: boolean) {
    const v = mp4Ref.current;
    const s = stateRef.current;
    if (!s?.videoUrl) return;
    set(ref(rtdb, statePath), {
      sourceType: "direct", videoUrl: s.videoUrl,
      isPlaying, currentTime: v?.currentTime ?? 0,
      muted: s.muted ?? false,
      updatedAt: Date.now(),
    });
  }

  // المالك يكتم/يفعّل الصوت للجميع
  function toggleMuteForAll() {
    const s = stateRef.current;
    if (!s) return;
    set(ref(rtdb, statePath), { ...s, muted: !s.muted, updatedAt: Date.now() });
  }

  /* دفع دوري لتصحيح انحراف الوقت */
  useEffect(() => {
    if (!isOwner) return;
    const t = setInterval(() => {
      const s = stateRef.current;
      if (s?.sourceType === "youtube" && ytReady.current) {
        if (ytPlayerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING)
          pushYTState(true);
      } else if (s?.sourceType === "direct" && mp4Ref.current && !mp4Ref.current.paused) {
        pushMP4State(true);
      }
    }, 5000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  function loadNewVideo() {
    const url = urlInput.trim();
    if (!url) return;
    const src = detectSource(url);
    if (src === "youtube") {
      const id = extractYouTubeId(url);
      if (!id) { alert("رابط YouTube غير صالح"); return; }
      set(ref(rtdb, statePath), { sourceType: "youtube", videoId: id, isPlaying: true, currentTime: 0, updatedAt: Date.now() });
    } else if (src === "gdrive") {
      set(ref(rtdb, statePath), { sourceType: "gdrive", videoUrl: gdriveEmbed(url), isPlaying: true, currentTime: 0, updatedAt: Date.now() });
    } else {
      set(ref(rtdb, statePath), { sourceType: "direct", videoUrl: url, isPlaying: true, currentTime: 0, updatedAt: Date.now() });
    }
    setUrlInput("");
  }

  const src = state?.sourceType;
  const hasVideo = !!state;
  const showYT = src === "youtube" || !hasVideo;
  const showGD = src === "gdrive" && !!state?.videoUrl;
  const showMP4 = src === "direct" && !!state?.videoUrl;

  return (
    <div className="flex h-full flex-col">
      {isOwner && (
        <div className="border-b border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadNewVideo()}
              placeholder="YouTube / Google Drive / رابط MP4 مباشر..."
              className="flex-1"
            />
            <Button onClick={loadNewVideo} disabled={!urlInput.trim()}>تشغيل للجميع</Button>
            {hasVideo && (
              <button
                onClick={toggleMuteForAll}
                title={state?.muted ? "تفعيل الصوت للجميع" : "كتم الصوت للجميع"}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  state?.muted ? "border-danger/40 bg-danger/10 text-danger" : "border-border text-text-muted hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <FontAwesomeIcon icon={state?.muted ? faVolumeXmark : faVolumeHigh} className="h-4 w-4" />
                <span className="hidden sm:inline">{state?.muted ? "مكتوم" : "كتم للكل"}</span>
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">
            💡 للأداء الأفضل استخدم <span className="font-bold">YouTube</span>. روابط MP4 المباشرة قد تكون بطيئة حسب سرعة الاستضافة.
          </p>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden bg-black">
        {hasVideo && (
          <span className="absolute right-2 top-2 z-20 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {src === "youtube" ? "▶ YouTube" : src === "gdrive" ? "🔗 Google Drive" : "🎬 مباشر"}
          </span>
        )}

        {/* حاوية YouTube المستقرة — React لا يُعدَّل داخلها */}
        <div
          ref={stableWrapRef}
          className="absolute inset-0 h-full w-full"
          style={{ display: showYT ? "block" : "none" }}
        />

        {showGD && (
          <iframe
            src={state?.videoUrl}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay"
            title="Google Drive Video"
          />
        )}

        {showMP4 && (
          <video
            ref={mp4Ref}
            src={state?.videoUrl}
            className="absolute inset-0 h-full w-full"
            controls={isOwner}
            playsInline
            preload="metadata"
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onPlay={() => isOwner && !applyingRemote.current && pushMP4State(true)}
            onPause={() => isOwner && !applyingRemote.current && pushMP4State(false)}
            onSeeked={() => isOwner && !applyingRemote.current && pushMP4State(!mp4Ref.current?.paused)}
          />
        )}
        {showMP4 && buffering && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
            <div className="flex flex-col items-center gap-2">
              <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-white" />
              <span className="text-xs text-white/70">جارٍ التحميل...</span>
            </div>
          </div>
        )}

        {!hasVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/70">
            {isOwner
              ? "الصق رابط YouTube / Google Drive / MP4 لمشاركة الفيديو مع الجميع"
              : "في انتظار المعلّم لمشاركة فيديو..."}
          </div>
        )}

        {/* حاجب تفاعل الطلاب — مع زر "اضغط لتفعيل الصوت" (الفيديو يعمل مكتوماً تلقائياً) */}
        {!isOwner && (
          <div
            className="absolute inset-0 z-10"
            style={{ touchAction: "none" }}
            onClick={() => {
              // الفيديو يعمل مكتوماً تلقائياً — اللمسة تفعّل الصوت فقط
              if (needsTap) {
                studentUnmuted.current = true; // الطالب فعّل الصوت يدوياً
                const s = stateRef.current;
                // لا نفكّ الكتم إذا كان المالك كاتماً للجميع
                const ownerMuted = s?.muted ?? false;
                if (s?.sourceType === "youtube") {
                  ytPlayerRef.current?.playVideo?.();
                  if (!ownerMuted) { try { ytPlayerRef.current?.unMute?.(); } catch { /* ignore */ } }
                } else if (s?.sourceType === "direct" && mp4Ref.current) {
                  mp4Ref.current.muted = ownerMuted;
                  mp4Ref.current.play?.().catch(() => {});
                }
                setNeedsTap(false);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {needsTap && hasVideo && (
              <div className="absolute inset-x-0 bottom-4 grid place-items-center">
                <button className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-xl backdrop-blur-md animate-pulse">
                  <FontAwesomeIcon icon={faVolumeHigh} className="h-4 w-4" />
                  اضغط لتفعيل الصوت 🔊
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
