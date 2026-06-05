// مدير غرفة الصوت — Cloudflare Realtime SFU + تنسيق عبر RTDB
import { ref, onValue, set, remove, update, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { newSession, pushTracks, renegotiate } from "@/lib/realtime/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VoiceParticipant {
  uid: string;
  name: string;
  sessionId?: string;
  trackName?: string;
  muted?: boolean;
  kicked?: boolean;
}

const STUN = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] };

export class VoiceManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private sessionId = "";
  private subscribed = new Set<string>();
  private midToUid = new Map<string, string>();
  private remoteStreams = new Map<string, MediaStream>();
  private chain: Promise<void> = Promise.resolve();
  private unsub?: () => void;

  onRemoteStream?: (uid: string, stream: MediaStream) => void;
  onParticipants?: (list: VoiceParticipant[]) => void;
  onMyMuteChange?: (muted: boolean) => void;
  onLeave?: () => void;

  constructor(
    private roomId: string,
    private uid: string,
    private name: string,
    private isOwner: boolean
  ) {}

  private voicePath() {
    return `roomLive/${this.roomId}/voice`;
  }

  async join() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.sessionId = await newSession();

    this.pc = new RTCPeerConnection(STUN);
    this.pc.ontrack = (e) => {
      const mid = e.transceiver?.mid ?? "";
      const uid = this.midToUid.get(mid);
      if (!uid) return;
      let stream = this.remoteStreams.get(uid);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(uid, stream);
      }
      stream.addTrack(e.track);
      this.onRemoteStream?.(uid, stream);
    };

    // نشر الميكروفون (sendonly)
    const track = this.localStream.getAudioTracks()[0];
    const tr = this.pc.addTransceiver(track, { direction: "sendonly" });
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    const trackName = `mic-${this.uid}`;
    const res = await pushTracks(this.sessionId, {
      sessionDescription: { type: "offer", sdp: offer.sdp },
      tracks: [{ location: "local", mid: tr.mid, trackName }],
    });
    await this.pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));

    // افتراضياً: مايك المالك مفتوح، والمنضمّون مكتومون
    const initialMuted = !this.isOwner;
    this.localStream.getAudioTracks().forEach((t) => (t.enabled = !initialMuted));

    // أعلن وجودي في RTDB + حذف تلقائي عند قطع الاتصال
    const myRef = ref(rtdb, `${this.voicePath()}/${this.uid}`);
    await set(myRef, { name: this.name, sessionId: this.sessionId, trackName, muted: initialMuted });
    onDisconnect(myRef).remove();

    // راقب المشاركين واشترك في الجدد
    this.unsub = onValue(ref(rtdb, this.voicePath()), (snap) => {
      const val = (snap.val() as Record<string, VoiceParticipant>) ?? {};
      const list = Object.entries(val).map(([id, v]) => ({ ...v, uid: id }));
      this.onParticipants?.(list);

      const me = val[this.uid];
      if (me?.kicked) {
        this.leave();
        return;
      }
      // حالة الكتم يتحكّم بها المالك (وتُطبَّق فوراً على ميكروفوني)
      if (me) {
        const muted = !!me.muted;
        this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
        this.onMyMuteChange?.(muted);
      }

      for (const p of list) {
        if (p.uid !== this.uid && p.sessionId && p.trackName && !this.subscribed.has(p.uid)) {
          this.subscribed.add(p.uid);
          this.subscribeTo(p);
        }
      }
    });
  }

  private subscribeTo(p: VoiceParticipant) {
    this.chain = this.chain
      .then(async () => {
        if (!this.pc) return;
        const res = await pushTracks(this.sessionId, {
          tracks: [{ location: "remote", sessionId: p.sessionId, trackName: p.trackName }],
        });
        if (Array.isArray(res.tracks)) {
          for (const t of res.tracks) if (t.mid) this.midToUid.set(t.mid, p.uid);
        }
        if (res.requiresImmediateRenegotiation && res.sessionDescription) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await renegotiate(this.sessionId, { type: "answer", sdp: answer.sdp });
        }
      })
      .catch((e) => console.error("[BacZone voice] خطأ الاشتراك:", e));
  }

  getLocalStream() {
    return this.localStream;
  }

  // أوامر المالك
  ownerToggleMute(uid: string, muted: boolean) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), { muted });
  }
  ownerKick(uid: string) {
    if (!this.isOwner) return;
    update(ref(rtdb, `${this.voicePath()}/${uid}`), { kicked: true });
  }

  async leave() {
    this.unsub?.();
    try {
      await remove(ref(rtdb, `${this.voicePath()}/${this.uid}`));
    } catch {}
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStreams.clear();
    this.subscribed.clear();
    this.onLeave?.();
  }
}

// مراقب مستوى الصوت (مؤشّر "يتكلّم الآن")
export function monitorLevel(stream: MediaStream, cb: (speaking: boolean) => void): () => void {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let last = false;
  const tick = () => {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const speaking = avg > 12;
    if (speaking !== last) {
      last = speaking;
      cb(speaking);
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    ctx.close().catch(() => {});
  };
}
