// متصفّح وهمي + خادم Cloudflare SFU وهمي بتأخيرات واقعية
export const log = [];
const sessions = new Map();          // sessionId -> { pc }
const tracks = new Map();            // trackName -> { sessionId, availableAt }
let sid = 0, mid = 0;
export const sfu = { PROPAGATION_MS: 250, tracks };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

globalThis.MediaStream = class { constructor() { this.t = []; } addTrack(t) { this.t.push(t); } getTracks() { return this.t; } getAudioTracks() { return this.t; } };
globalThis.RTCSessionDescription = class { constructor(d) { Object.assign(this, d); } };
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: async () => { const s = new MediaStream(); s.addTrack({ kind: "audio", enabled: true, stop() {} }); return s; } } } });
globalThis.window = globalThis; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};

globalThis.RTCPeerConnection = class {
  constructor() { this.connectionState = "new"; this.iceConnectionState = "new"; this.signalingState = "stable"; this.tx = []; this.ls = {}; this.pendingPull = []; }
  addEventListener(t, f) { this.ls[t] ??= []; this.ls[t].push(f); }
  removeEventListener(t, f) { this.ls[t] = (this.ls[t] || []).filter((x) => x !== f); }
  emit(t) { (this.ls[t] || []).forEach((f) => f()); if (t === "connectionstatechange") this.onconnectionstatechange?.(); }
  addTransceiver(track) { const tr = { mid: null, track, sender: { replaceTrack: async () => {} }, stop() {} }; this.tx.push(tr); return tr; }
  async createOffer() { return { type: "offer", sdp: "offer" }; }
  async createAnswer() { return { type: "answer", sdp: "answer" }; }
  async setLocalDescription(d) {
    if (d.type === "rollback") { this.signalingState = "stable"; return; }
    if (d.type === "offer") { this.tx.forEach((t) => { if (!t.mid) t.mid = "L" + (++mid); }); this.signalingState = "have-local-offer"; }
    else this.signalingState = "stable";
  }
  async setRemoteDescription(d) {
    if (d.type === "answer") { this.signalingState = "stable"; this.goConnected(); }
    else { this.signalingState = "have-remote-offer"; for (const m of this.pendingPull.splice(0)) this.ontrack?.({ transceiver: { mid: m }, track: { id: m } }); this.goConnected(); }
  }
  goConnected() { if (this.connectionState === "connected") return; setTimeout(() => { this.connectionState = "connected"; this.iceConnectionState = "connected"; this.emit("connectionstatechange"); this.emit("iceconnectionstatechange"); }, 120); }
  close() { this.connectionState = "closed"; }
};

// وسيط /api/realtime الوهمي — مع خطأ «200 وفي الجسم errorCode» كما يفعل Cloudflare
globalThis.fetch = async (url, opts = {}) => {
  await sleep(15);
  const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
  if (url.endsWith("/ice")) return res(200, { iceServers: [{ urls: "stun:x" }] });
  if (url.endsWith("/sessions/new")) { const id = "sess" + (++sid) + "abcdefgh"; sessions.set(id, {}); return res(201, { sessionId: id }); }
  const m = url.match(/sessions\/([^/]+)\/(tracks\/new|renegotiate)/);
  const s = m[1]; const body = opts.body ? JSON.parse(opts.body) : {};
  if (m[2] === "renegotiate") return res(200, {});
  const t = body.tracks[0];
  if (t.location === "local") {
    // المسار يصير متاحاً للسحب فقط بعد اتصال الناشر + زمن انتشار
    tracks.set(t.trackName, { sessionId: s, availableAt: Infinity });
    const owner = globalThis.__pcBySession?.get(s);
    const mark = () => tracks.get(t.trackName).availableAt = Date.now() + sfu.PROPAGATION_MS;
    if (owner?.connectionState === "connected") mark(); else owner?.addEventListener("connectionstatechange", mark);
    log.push(["publish", t.trackName, Date.now()]);
    return res(200, { sessionDescription: { type: "answer", sdp: "a" }, tracks: [{ mid: t.mid, trackName: t.trackName }] });
  }
  const tr = tracks.get(t.trackName);
  if (!tr || Date.now() < tr.availableAt) { log.push(["pull-fail", t.trackName, Date.now()]); return res(200, { tracks: [{ errorCode: "track_not_found", errorDescription: "not ready" }] }); }
  const newMid = "R" + (++mid);
  globalThis.__pcBySession.get(s).pendingPull.push(newMid);
  log.push(["pull-ok", t.trackName, Date.now()]);
  return res(200, { tracks: [{ mid: newMid, trackName: t.trackName }], requiresImmediateRenegotiation: true, sessionDescription: { type: "offer", sdp: "o" } });
};
