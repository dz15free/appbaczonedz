"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LiveAvatar } from "@/components/ui/live-avatar";
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
    m.onMyMuteChange = (mt) => setMuted(mt);
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
    if (!user) return;
    if (isOwner) {
      managerRef.current?.ownerToggleMute(user.uid, !muted);
    } else if (!muted) {
      // الطالب يغلق ميكروفونه فقط (الفتح بيد المعلّم)
      managerRef.current?.selfMute();
    }
  }

  useEffect(() => {
    return () => {
      managerRef.current?.leave();
      Object.values(monitors.current).forEach((s) => s());
    };
  }, []);

  /* ── بطاقة الصوت العائمة (PIP) ──
     من الصورة المرجعية: بطاقة صغيرة تطفو فوق المحتوى تُظهر من يتحدّث
     الآن. بُنيت **هنا** عمداً لا كمكوّن منفصل: حالة الصوت (المشاركون،
     من يتحدّث، الاتصال) تعيش في هذا المكوّن، ومكوّن مستقلّ كان سيحتاج
     VoiceManager ثانياً — أي اتصال WebRTC ثانياً لكل طالب.

     تظهر فقط حين: انضممنا فعلاً + هناك متحدّث + اللوحة الموسّعة مغلقة
     (وإلّا كرّرنا المعلومة نفسها مرّتين على الشاشة). */
  /* ── ارتفاع الشريط يُعلَن للواجهة ──
     الزرّ العائم كان يرتفع 84 بكسل **مخمّنة**، وارتفاع هذا الشريط يتغيّر
     (منضمّ / غير منضمّ / لوحة موسّعة) فيتراكبان على الهاتف.
     الآن يقيس الشريط نفسه ويكتب ارتفاعه في متغيّر CSS، فيتبعه كل ما
     يطفو فوقه بدقّة مهما تغيّر. */
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--bz-voicebar-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--bz-voicebar-h");
    };
  }, []);

  const speakerUid = joined
    ? participants.find((p) => speaking[p.uid] && !p.muted)?.uid ?? null
    : null;
  const speaker = speakerUid ? participants.find((p) => p.uid === speakerUid) ?? null : null;

  return (
    <div ref={barRef} className="border-t border-border bg-surface">
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} />
      ))}

      {speaker && !expanded && (
        <div
          className="bz-pip pointer-events-none fixed z-[10040] flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 62px)",
            insetInlineEnd: "12px",
            background: "var(--bz-surface, #fff)",
            borderColor: "var(--bz-line)",
          }}
        >
          <span className="relative grid h-7 w-7 place-items-center">
            <LiveAvatar uid={speaker.uid} name={speaker.name || "ط"} size="md" className="h-7 w-7" />
            <span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 2px var(--bz-green)" }}
            />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[110px] truncate text-[10.5px] font-bold leading-tight text-[var(--bz-ink)]">
              {speaker.uid === user?.uid ? "أنت" : speaker.name}
            </span>
            <span className="block text-[9px] font-bold leading-tight text-[var(--bz-green)]">
              يتحدّث الآن
            </span>
          </span>
          {/* موجة صغيرة — إشارة بصرية أنّ الصوت حيّ، لا مجرّد اسم ثابت */}
          <span className="flex items-end gap-[2px]" aria-hidden="true">
            <span className="bz-wave-1 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 5 }} />
            <span className="bz-wave-2 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 10 }} />
            <span className="bz-wave-3 block w-[2px] rounded bg-[var(--bz-green)]" style={{ height: 7 }} />
          </span>
        </div>
      )}

      {/* اللوحة الموسّعة (المشاركون + أدوات المالك) */}
      {joined && expanded && (
        <div className="max-h-48 overflow-y-auto p-3" style={{ borderBottom: "1px solid var(--bz-border)" }}>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {participants.map((p) => {
              const isMe = p.uid === user?.uid;
              const isMuted = !!p.muted;
              const isSpeaking = speaking[p.uid] && !isMuted;
              return (
                <div key={p.uid} className="flex flex-col items-center text-center">
                  <div className={`relative rounded-full ${isSpeaking ? "ring-2 ring-emerald-400" : ""}`}>
                    <LiveAvatar uid={p.uid} name={p.name || "ط"} size="md" className="h-12 w-12" />
                    {isMuted && (
                      <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-[#13151f]">
                        <FontAwesomeIcon icon={faMicrophoneSlash} className="h-2.5 w-2.5 text-danger" />
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 max-w-[4rem] truncate text-[10px] font-medium" style={{ color: "var(--bz-text-muted)" }}>
                    {p.name}
                    {isMe && " (أنت)"}
                  </span>
                  {isOwner && !isMe && (
                    <div className="mt-1 flex gap-1">
                      <button
                        onClick={() => managerRef.current?.ownerToggleMute(p.uid, !isMuted)}
                        className={`grid h-6 w-6 place-items-center rounded-md transition ${!isMuted ? "bg-secondary/15 text-secondary" : "text-text-muted hover:bg-primary/10"}`}
                        aria-label={isMuted ? "فتح الميكروفون" : "كتم"}
                        title={isMuted ? "فتح الميكروفون" : "كتم"}
                      >
                        <FontAwesomeIcon icon={isMuted ? faMicrophone : faMicrophoneSlash} className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => managerRef.current?.ownerKick(p.uid)}
                        className="grid h-6 w-6 place-items-center rounded-md text-text-muted transition hover:bg-danger/10 hover:text-danger"
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
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        {!joined ? (
          <button
            id="bz-voice-join"
            onClick={join}
            disabled={connecting}
            className="shadow-glow flex items-center gap-2 rounded-xl bg-[var(--bz-blue)] hover:brightness-110 px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
            {connecting ? "جارٍ الاتصال..." : "انضمام صوتي"}
          </button>
        ) : (
          <>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-primary/10"
            >
              <FontAwesomeIcon
                icon={faChevronUp}
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              <span className="bz-live-dot" />
              المشاركون ({participants.length})
            </button>
            <div className="flex items-center gap-2">
              {!isOwner && muted && (
                <span className="text-[11px] hidden sm:inline" style={{ color: "var(--bz-text-muted)" }}>
                  المعلّم يفتح الميكروفون
                </span>
              )}
              <button
                onClick={toggleMute}
                disabled={!isOwner && muted}
                className={`grid h-10 w-10 place-items-center rounded-full transition ${
                  muted ? "bg-danger/10 text-danger" : "bg-secondary/15 text-secondary"
                } ${!isOwner && muted ? "opacity-70" : ""}`}
                aria-label={muted ? "مكتوم" : "إغلاق الميكروفون"}
                title={
                  isOwner
                    ? muted
                      ? "فتح الميكروفون"
                      : "كتم"
                    : muted
                      ? "المعلّم يفتح الميكروفون"
                      : "إغلاق ميكروفوني"
                }
              >
                <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} className="h-4 w-4" />
              </button>
              <button
                onClick={leave}
                className="grid h-10 w-10 place-items-center rounded-full bg-danger text-white transition active:scale-95"
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
