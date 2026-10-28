// استدعاءات Cloudflare Realtime عبر الخادم الوسيط /api/realtime
import { auth } from "@/lib/firebase/config";

const API = "/api/realtime";


/** خطأ من خادم الصوت — `code` يميّز «غير مُعدّ» عن أخطاء الشبكة */
export class RealtimeError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
    this.name = "RealtimeError";
  }
}

/* ════════════════════════════════════════════════════════════
   🐛 Cloudflare يُرجع أخطاء المسارات **بحالة HTTP 200**:

     { "tracks": [{ "errorCode": "...", "errorDescription": "..." }] }

   فـ`res.ok` وحده يقول «نجح» والمسار لم يُنشر ولم يُسحب. كان هذا
   أحد أسباب «الميكروفون أخضر ولا أحد يسمع». نفحص الآن الجسم كلّه.
   ════════════════════════════════════════════════════════════ */
async function parse(res: Response, what: string): Promise<any> {
  let data: any = null;
  try { data = await res.json(); } catch { /* جسم فارغ */ }
  if (!res.ok) {
    const msg = data?.error || data?.errorDescription || `${what} failed: ${res.status}`;
    throw new RealtimeError(msg, data?.code || data?.errorCode, res.status);
  }
  if (data?.errorCode) {
    throw new RealtimeError(data.errorDescription || data.errorCode, data.errorCode, res.status);
  }
  if (Array.isArray(data?.tracks)) {
    const bad = data.tracks.find((t: any) => t?.errorCode);
    if (bad) throw new RealtimeError(bad.errorDescription || bad.errorCode, bad.errorCode, res.status);
  }
  return data;
}

export async function newSession(): Promise<string> {
  /* رمز الدخول يُرسل إن وُجد — يستعمله الخادم فقط إن فُعّل
     `REALTIME_REQUIRE_AUTH`، ولا يضرّ إن لم يُفعَّل. */
  let token = "";
  try { token = (await auth?.currentUser?.getIdToken()) ?? ""; } catch { /* بلا رمز */ }
  const res = await fetch(`${API}/sessions/new`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const data = await parse(res, "newSession");
  if (!data?.sessionId) throw new RealtimeError("no sessionId");
  return data.sessionId as string;
}

export async function pushTracks(sessionId: string, body: any): Promise<any> {
  const res = await fetch(`${API}/sessions/${sessionId}/tracks/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(res, "tracks/new");
}

export async function renegotiate(sessionId: string, sessionDescription: any): Promise<any> {
  const res = await fetch(`${API}/sessions/${sessionId}/renegotiate`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDescription }),
  });
  return parse(res, "renegotiate");
}

/* ════════════════════════════════════════════════════════════
   خوادم ICE — STUN دائماً، وTURN إن أُعدّ على الخادم

   STUN يكفي أغلب الشبكات لأنّ خادم Cloudflare عنوانه عامّ. لكنّ
   شبكات المدارس والشركات وبعض شبكات Wi-Fi العامّة تحجب UDP كلّه،
   وهناك لا يمرّ الصوت إلّا عبر TURN على المنفذ 443. تُجلب مرّة
   واحدة لكل صفحة.
   ════════════════════════════════════════════════════════════ */
let icePromise: Promise<RTCIceServer[]> | null = null;

export function getIceServers(): Promise<RTCIceServer[]> {
  if (!icePromise) {
    icePromise = fetch(`${API}/ice`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d?.iceServers) ? (d.iceServers as RTCIceServer[]) : [];
        return list.length ? list : [{ urls: "stun:stun.cloudflare.com:3478" }];
      })
      .catch(() => {
        icePromise = null;   // فشلٌ عابر لا يُحفظ
        return [{ urls: "stun:stun.cloudflare.com:3478" }];
      });
  }
  return icePromise;
}
