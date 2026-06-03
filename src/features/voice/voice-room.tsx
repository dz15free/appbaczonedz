"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faPhoneSlash,
  faUserSlash,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { VoiceManager, monitorLevel, type VoiceParticipant } from "@/features/voice/voice-manager";
import { Button } from "@/components/ui/field";

function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

export function VoiceRoom({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const managerRef = useRef<VoiceManager | null>(null);
  const monitors = useRef<Record<string, () => void>>({});
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});

  async function join() {
    if (!user) return;
    setConnecting(true);
    const m = new VoiceManager(roomId, user.uid, user.displayName || "طالب", isOwner);
    m.onParticipants = setParticipants;
    m.onRemoteStream = (uid, stream) => {
      setStreams((s) => ({ ...s, [uid]: stream }));
      monitors.current[uid]?.();
      monitors.current[uid] = monitorLevel(stream, (sp) =>
        setSpeaking((p) => ({ ...p, [uid]: sp }))
      );
    };
    try {
      await m.join();
      managerRef.current = m;
      setJoined(true);
      const ls = m.getLocalStream();
      if (ls) {
        monitors.current[user.uid]?.();
        monitors.current[user.uid] = monitorLevel(ls, (sp) =>
          setSpeaking((p) => ({ ...p, [user.uid]: sp }))
        );
      }
    } catch (e) {
      console.error("[BacZone voice] فشل الانضمام:", e);
      alert("تعذّر الوصول للميكروفون أو الاتصال بخادم الصوت. تأكّد من السماح بالميكروفون.");
    } finally {
      setConnecting(false);
    }
  }

  function leave() {
    managerRef.current?.leave();
    managerRef.current = null;
    Object.values(monitors.current).forEach((stop) => stop());
    monitors.current = {};
    setJoined(false);
    setParticipants([]);
    setStreams({});
    setSpeaking({});
    setMuted(false);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    managerRef.current?.setMuted(next);
  }

  // تنظيف عند مغادرة التبويب
  useEffect(() => {
    return () => {
      managerRef.current?.leave();
      Object.values(monitors.current).forEach((stop) => stop());
    };
  }, []);

  if (!joined) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faVolumeHigh} className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-extrabold">الغرفة الصوتية</h2>
          <p className="mt-2 max-w-xs text-sm text-text-muted">
            تحدّث صوتياً مع زملائك (بدون كاميرا). تعمل على 3G و4G.
          </p>
          <Button onClick={join} loading={connecting} className="mt-5 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
            انضمام صوتي
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* عناصر الصوت المخفية */}
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} />
      ))}

      {/* المشاركون */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {participants.map((p) => {
            const isMe = p.uid === user?.uid;
            const isMuted = p.muted || p.forceMuted;
            const isSpeaking = speaking[p.uid] && !isMuted;
            return (
              <div key={p.uid} className="flex flex-col items-center text-center">
                <div
                  className={`relative grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-2xl font-extrabold text-white transition ${
                    isSpeaking ? "ring-4 ring-secondary" : "ring-0"
                  }`}
                >
                  {(p.name || "ط").charAt(0)}
                  <span className="absolute -bottom-1 -left-1 grid h-6 w-6 place-items-center rounded-full bg-surface">
                    <FontAwesomeIcon
                      icon={isMuted ? faMicrophoneSlash : faMicrophone}
                      className={`h-3 w-3 ${isMuted ? "text-danger" : "text-secondary"}`}
                    />
                  </span>
                </div>
                <span className="mt-2 max-w-[5rem] truncate text-xs font-semibold">
                  {p.name} {isMe && "(أنت)"}
                </span>

                {/* أدوات المالك على الآخرين */}
                {isOwner && !isMe && (
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => managerRef.current?.ownerToggleMute(p.uid, !p.forceMuted)}
                      aria-label="كتم"
                      className="grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-primary/10"
                    >
                      <FontAwesomeIcon icon={faMicrophoneSlash} className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => managerRef.current?.ownerKick(p.uid)}
                      aria-label="طرد"
                      className="grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger/10"
                    >
                      <FontAwesomeIcon icon={faUserSlash} className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* شريط التحكّم */}
      <div className="flex items-center justify-center gap-3 border-t border-border p-3">
        <button
          onClick={toggleMute}
          className={`grid h-12 w-12 place-items-center rounded-full transition ${
            muted ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
          }`}
          aria-label={muted ? "إلغاء الكتم" : "كتم"}
        >
          <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} className="h-5 w-5" />
        </button>
        <button
          onClick={leave}
          className="grid h-12 w-12 place-items-center rounded-full bg-danger text-white"
          aria-label="مغادرة"
        >
          <FontAwesomeIcon icon={faPhoneSlash} className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
