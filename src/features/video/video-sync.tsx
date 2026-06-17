"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";

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
  const statePath = `roomLive/${roomId}/videoState`;
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReady = useRef(false);
  const applyingRemote = useRef(false);
  const mp4Ref = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<VideoState | null>(null);

  useEffect(() => {
    return onValue(ref(rtdb, statePath), (snap) => {
      const s = snap.val() as VideoState | null;
      if (!s) return;
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
        setTimeout(() => { if (s.isPlaying) p.playVideo?.(); }, 1000);
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
      if (s.isPlaying && v.paused) v.play().catch(() => {});
      else if (!s.isPlaying && !v.paused) v.pause();
    }
  }

  useEffect(() => {
    function createYTPlayer() {
      if (!ytHostRef.current || ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytHostRef.current, {
        height: "100%", width: "100%",
        playerVars: {
          controls: isOwner ? 1 : 0, disablekb: isOwner ? 0 : 1,
          modestbranding: 1, rel: 0, playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            ytReady.current = true;
            const s = stateRef.current;
            if (!s?.videoId) return;
            ytPlayerRef.current?.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
            if (s.isPlaying) setTimeout(() => ytPlayerRef.current?.playVideo?.(), 800);
          },
          onStateChange: (e: any) => {
            if (!isOwner || applyingRemote.current) return;
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) pushYTState(true);
            else if (e.data === YT.PlayerState.PAUSED) pushYTState(false);
          },
        },
      });
    }
    if (window.YT?.Player) { createYTPlayer(); }
    else {
      window.onYouTubeIframeAPIReady = createYTPlayer;
      if (!document.getElementById("yt-api")) {
        const t = document.createElement("script");
        t.id = "yt-api"; t.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(t);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  function pushYTState(isPlaying: boolean) {
    const vid = ytPlayerRef.current?.getVideoData?.()?.video_id ?? stateRef.current?.videoId;
    if (!vid) return;
    set(ref(rtdb, statePath), { sourceType: "youtube", videoId: vid, isPlaying, currentTime: ytPlayerRef.current?.getCurrentTime?.() ?? 0, updatedAt: Date.now() });
  }

  function pushMP4State(isPlaying: boolean) {
    const v = mp4Ref.current;
    if (!stateRef.current?.videoUrl) return;
    set(ref(rtdb, statePath), { sourceType: "direct", videoUrl: stateRef.current.videoUrl, isPlaying, currentTime: v?.currentTime ?? 0, updatedAt: Date.now() });
  }

  useEffect(() => {
    if (!isOwner) return;
    const t = setInterval(() => {
      const s = stateRef.current;
      if (s?.sourceType === "youtube" && ytReady.current) {
        if (ytPlayerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) pushYTState(true);
      } else if (s?.sourceType === "direct" && mp4Ref.current && !mp4Ref.current.paused) {
        pushMP4State(true);
      }
    }, 5000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  function loadNewVideo() {
    const url = urlInput.trim(); if (!url) return;
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

  return (
    <div className="flex h-full flex-col">
      {isOwner && (
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadNewVideo()}
            placeholder="YouTube / Google Drive / رابط MP4 مباشر..." className="flex-1" />
          <Button onClick={loadNewVideo} disabled={!urlInput.trim()}>تشغيل للجميع</Button>
        </div>
      )}
      <div className="relative flex-1 overflow-hidden bg-black">
        {hasVideo && (
          <span className="absolute right-2 top-2 z-20 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {src === "youtube" ? "▶ YouTube" : src === "gdrive" ? "🔗 Google Drive" : "🎬 مباشر"}
          </span>
        )}
        <div ref={ytHostRef} className="absolute inset-0 h-full w-full"
          style={{ display: src === "youtube" || !hasVideo ? "block" : "none" }} />
        {src === "gdrive" && state?.videoUrl && (
          <iframe src={state.videoUrl} className="absolute inset-0 h-full w-full border-0" allow="autoplay" title="Google Drive Video" />
        )}
        {src === "direct" && state?.videoUrl && (
          <video ref={mp4Ref} src={state.videoUrl} className="absolute inset-0 h-full w-full"
            controls={isOwner} playsInline
            onPlay={() => isOwner && !applyingRemote.current && pushMP4State(true)}
            onPause={() => isOwner && !applyingRemote.current && pushMP4State(false)}
            onSeeked={() => isOwner && !applyingRemote.current && pushMP4State(!mp4Ref.current?.paused)} />
        )}
        {!hasVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-white/70 p-4">
            {isOwner ? "الصق رابط YouTube / Google Drive / MP4 لمشاركة الفيديو مع الجميع" : "في انتظار المعلّم لمشاركة فيديو..."}
          </div>
        )}
        {!isOwner && (
          <div className="absolute inset-0 z-10" style={{ touchAction: "none" }}
            onClick={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()} />
        )}
      </div>
    </div>
  );
}
