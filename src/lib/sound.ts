// أصوات تنبيه قصيرة عبر WebAudio (بدون ملفات صوتية)
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function playBeep(freq = 660, durationMs = 150, volume = 0.05) {
  const audio = getCtx();
  if (!audio) return;
  // بعض المتصفحات تعلّق السياق حتى أول تفاعل
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audio.destination);
  const now = audio.currentTime;
  osc.start(now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.stop(now + durationMs / 1000);
}

// نغمة رسالة (نقرة لطيفة)
export const playMessageSound = () => playBeep(720, 120, 0.04);
// نغمة رفع اليد (نغمتان صاعدتان)
export const playHandRaiseSound = () => {
  playBeep(600, 120, 0.05);
  setTimeout(() => playBeep(880, 160, 0.05), 130);
};
