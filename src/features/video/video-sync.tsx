"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

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
        p.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
        setTimeout(() => {
          if (s.isPlaying) {
            p.playVideo?.();
            // للطلاب: تحقّق إن نجح التشغيل التلقائي، وإلا اعرض زر اللمس (iOS)
            if (!isOwner) {
              setTimeout(() => {
                try {
                  const st = p.getPlayerState?.();
                  // 1 = playing, 3 = buffering. غير ذلك يعني أن iOS منع التشغيل
                  if (st !== 1 && st !== 3) setNeedsTap(true);
                } catch { setNeedsTap(true); }
              }, 1500);
            }
          }
        }, 1200);
      } else {
        const local = p.getCurrentTime?.() ?? 0;
        if (Math.abs(local - s.currentTime) > 2) p.seekTo(s.currentTime, true);
        if (s.isPlaying) p.playVideo?.(); else p.pauseVideo?.();
      }
      setTimeout(() => { applyingRemote.current = false; }, 700);
    } else if (s.sourceType === "direct") {
      const v = mp4Ref.current;
      if (!v) return;
      if (!prev || prev.videoUrl !== s.videoUrl) v.src = s.videoUrl ?? "";
      const local = v.currentTime ?? 0;
      if (Math.abs(local - s.currentTime) > 2) v.currentTime = s.currentTime;
      if (s.isPlaying && v.paused) v.play().catch(() => { if (!isOwner) setNeedsTap(true); });
      else if (!s.isPlaying && !v.paused) v.pause();
    }
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
            if (!s?.videoId) return;
            ytPlayerRef.current?.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
            if (s.isPlaying) setTimeout(() => ytPlayerRef.current?.playVideo?.(), 800);
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
      updatedAt: Date.now(),
    });
  }

  function pushMP4State(isPlaying: boolean) {
    const v = mp4Ref.current;
    if (!stateRef.current?.videoUrl) return;
    set(ref(rtdb, statePath), {
      sourceType: "direct", videoUrl: stateRef.current.videoUrl,
      isPlaying, currentTime: v?.currentTime ?? 0, updatedAt: Date.now(),
    });
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
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadNewVideo()}
            placeholder="YouTube / Google Drive / رابط MP4 مباشر..."
            className="flex-1"
          />
          <Button onClick={loadNewVideo} disabled={!urlInput.trim()}>تشغيل للجميع</Button>
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
            onPlay={() => isOwner && !applyingRemote.current && pushMP4State(true)}
            onPause={() => isOwner && !applyingRemote.current && pushMP4State(false)}
            onSeeked={() => isOwner && !applyingRemote.current && pushMP4State(!mp4Ref.current?.paused)}
          />
        )}

        {!hasVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/70">
            {isOwner
              ? "الصق رابط YouTube / Google Drive / MP4 لمشاركة الفيديو مع الجميع"
              : "في انتظار المعلّم لمشاركة فيديو..."}
          </div>
        )}

        {/* حاجب تفاعل الطلاب — مع زر "اضغط للتشغيل" لأجهزة iPhone */}
        {!isOwner && (
          <div
            className="absolute inset-0 z-10"
            style={{ touchAction: "none" }}
            onClick={() => {
              // iOS يتطلّب لمسة المستخدم لبدء التشغيل بالصوت
              if (needsTap) {
                const s = stateRef.current;
                if (s?.sourceType === "youtube") {
                  ytPlayerRef.current?.playVideo?.();
                  try { ytPlayerRef.current?.unMute?.(); } catch { /* ignore */ }
                } else if (s?.sourceType === "direct") {
                  mp4Ref.current?.play?.().catch(() => {});
                }
                setNeedsTap(false);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {needsTap && hasVideo && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-white/20 backdrop-blur-md">
                    <FontAwesomeIcon icon={faPlay} className="h-7 w-7 text-white" />
                  </span>
                  <p className="text-sm font-bold text-white">اضغط لتشغيل الفيديو 🎬</p>
                  <p className="text-xs text-white/60">(مطلوب لمرّة واحدة على أجهزة iPhone)</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
