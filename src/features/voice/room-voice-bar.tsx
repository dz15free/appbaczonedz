"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faPhoneSlash,
  faUserSlash,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { VoiceManager, monitorLevel, type VoiceParticipant } from "@/features/voice/voice-manager";

function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

export function RoomVoiceBar({ roomId, isOwner }: { roomId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const managerRef = useRef<VoiceManager | null>(null);
  const monitors = useRef<Record<string, () => void>>({});
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [expanded, setExpanded] = useState(false);

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
      alert("تعذّر الوصول للميكروفون. تأكّد من السماح به في المتصفح.");
    } finally {
      setConnecting(false);
    }
  }

  function leave() {
    managerRef.current?.leave();
    managerRef.current = null;
    Object.values(monitors.current).forEach((s) => s());
    monitors.current = {};
    setJoined(false);
    setParticipants([]);
    setStreams({});
    setSpeaking({});
    setMuted(false);
    setExpanded(false);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    managerRef.current?.setMuted(next);
  }

  useEffect(() => {
    return () => {
      managerRef.current?.leave();
      Object.values(monitors.current).forEach((s) => s());
    };
  }, []);

  return (
    <div className="border-t border-border bg-surface">
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} />
      ))}

      {/* اللوحة الموسّعة (المشاركون + أدوات المالك) */}
      {joined && expanded && (
        <div className="max-h-48 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {participants.map((p) => {
              const isMe = p.uid === user?.uid;
              const isMuted = p.muted || p.forceMuted;
              const isSpeaking = speaking[p.uid] && !isMuted;
              return (
                <div key={p.uid} className="flex flex-col items-center text-center">
                  <div
                    className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-lg font-extrabold text-white ${
                      isSpeaking ? "ring-4 ring-secondary" : ""
                    }`}
                  >
                    {(p.name || "ط").charAt(0)}
                    {isMuted && (
                      <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-surface">
                        <FontAwesomeIcon icon={faMicrophoneSlash} className="h-2.5 w-2.5 text-danger" />
                      </span>
                    )}
                  </div>
                  <span className="mt-1 max-w-[4rem] truncate text-[10px]">{p.name}</span>
                  {isOwner && !isMe && (
                    <div className="mt-0.5 flex gap-1">
                      <button
                        onClick={() => managerRef.current?.ownerToggleMute(p.uid, !p.forceMuted)}
                        className="grid h-6 w-6 place-items-center rounded text-text-muted hover:bg-primary/10"
                        aria-label="كتم"
                      >
                        <FontAwesomeIcon icon={faMicrophoneSlash} className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => managerRef.current?.ownerKick(p.uid)}
                        className="grid h-6 w-6 place-items-center rounded text-danger hover:bg-danger/10"
                        aria-label="طرد"
                      >
                        <FontAwesomeIcon icon={faUserSlash} className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* الشريط المضغوط الدائم */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {!joined ? (
          <button
            onClick={join}
            disabled={connecting}
            className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
            {connecting ? "جارٍ الاتصال..." : "انضمام صوتي"}
          </button>
        ) : (
          <>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-2 text-sm font-semibold text-text-muted"
            >
              <FontAwesomeIcon
                icon={faChevronUp}
                className={`h-3 w-3 transition ${expanded ? "rotate-180" : ""}`}
              />
              المشاركون ({participants.length})
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`grid h-10 w-10 place-items-center rounded-full ${
                  muted ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                }`}
                aria-label={muted ? "إلغاء الكتم" : "كتم"}
              >
                <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} className="h-4 w-4" />
              </button>
              <button
                onClick={leave}
                className="grid h-10 w-10 place-items-center rounded-full bg-danger text-white"
                aria-label="مغادرة الصوت"
              >
                <FontAwesomeIcon icon={faPhoneSlash} className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
