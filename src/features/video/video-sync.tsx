"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface VideoState {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

function extractVideoId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}

export function VideoSync({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const stateRef = useRef<VideoState | null>(null);
  const applyingRemote = useRef(false);
  const [ready, setReady] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const statePath = `roomLive/${roomId}/videoState`;

  // تحميل YouTube IFrame API وإنشاء المشغّل
  useEffect(() => {
    let cancelled = false;

    function createPlayer() {
      if (cancelled || !hostRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        height: "100%",
        width: "100%",
        playerVars: {
          controls: isOwner ? 1 : 0,
          disablekb: isOwner ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: onPlayerStateChange,
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existing = document.getElementById("yt-iframe-api");
      if (!existing) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  // المالك: ادفع الحالة عند التشغيل/الإيقاف
  function onPlayerStateChange(e: any) {
    if (!isOwner || applyingRemote.current) return;
    const YT = window.YT;
    if (e.data === YT.PlayerState.PLAYING) pushState(true);
    else if (e.data === YT.PlayerState.PAUSED) pushState(false);
  }

  function pushState(isPlaying: boolean) {
    const vid = stateRef.current?.videoId;
    if (!vid) return;
    set(ref(rtdb, statePath), {
      videoId: vid,
      isPlaying,
      currentTime: playerRef.current?.getCurrentTime?.() ?? 0,
      updatedAt: Date.now(),
    });
  }

  function loadNewVideo() {
    const id = extractVideoId(urlInput);
    if (!id) return;
    set(ref(rtdb, statePath), { videoId: id, isPlaying: true, currentTime: 0, updatedAt: Date.now() });
    setUrlInput("");
  }

  // المالك: ادفع الوقت دورياً لتصحيح الانحراف لدى الجميع
  useEffect(() => {
    if (!isOwner || !ready) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      const YT = window.YT;
      if (p?.getPlayerState?.() === YT?.PlayerState?.PLAYING) pushState(true);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, ready]);

  // الجميع: استمع وزامن
  useEffect(() => {
    if (!ready) return;
    const unsub = onValue(ref(rtdb, statePath), (snap) => {
      const s = snap.val() as VideoState | null;
      if (!s) return;
      const prev = stateRef.current;
      stateRef.current = s;
      setHasVideo(true);
      const p = playerRef.current;
      if (!p) return;

      applyingRemote.current = true;
      if (!prev || prev.videoId !== s.videoId) {
        p.loadVideoById({ videoId: s.videoId, startSeconds: s.currentTime });
      } else {
        const local = p.getCurrentTime?.() ?? 0;
        if (Math.abs(local - s.currentTime) > 2) p.seekTo(s.currentTime, true);
        if (s.isPlaying) p.playVideo?.();
        else p.pauseVideo?.();
      }
      setTimeout(() => {
        applyingRemote.current = false;
      }, 700);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, roomId]);

  return (
    <div className="flex h-full flex-col">
      {isOwner && (
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadNewVideo()}
            placeholder="ألصق رابط فيديو يوتيوب..."
            className="flex-1"
          />
          <Button onClick={loadNewVideo} disabled={!urlInput.trim()}>
            تشغيل للجميع
          </Button>
        </div>
      )}

      <div className="relative flex-1 bg-black">
        <div ref={hostRef} className="absolute inset-0 h-full w-full" />
        {!hasVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-white/70">
            {isOwner ? "ألصق رابط فيديو لبدء المشاهدة الجماعية" : "بانتظار مالك الغرفة لتشغيل فيديو..."}
          </div>
        )}
        {/* حاجب تفاعل شفّاف — يمنع الطلاب نهائياً من التحكّم بالمشغّل (تشغيل/إيقاف/تقديم)
            هذه طبقة أقوى من pointer-events لأنها تعمل بشكل موحّد مع iframes عبر كل المتصفحات */}
        {!isOwner && (
          <div
            className="absolute inset-0 z-10"
            style={{ touchAction: "none" }}
            onClick={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      {!isOwner && (
        <p className="border-t border-border p-2 text-center text-xs text-text-muted">
          المشاهدة متزامنة — يتحكّم مالك الغرفة في التشغيل.
        </p>
      )}
    </div>
  );
}
