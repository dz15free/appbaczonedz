// استدعاءات Cloudflare Realtime عبر الخادم الوسيط /api/realtime
const API = "/api/realtime";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function newSession(): Promise<string> {
  const res = await fetch(`${API}/sessions/new`, { method: "POST" });
  if (!res.ok) throw new Error(`newSession failed: ${res.status}`);
  const data = await res.json();
  return data.sessionId as string;
}

export async function pushTracks(sessionId: string, body: any): Promise<any> {
  const res = await fetch(`${API}/sessions/${sessionId}/tracks/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`tracks/new failed: ${res.status}`);
  return res.json();
}

export async function renegotiate(sessionId: string, sessionDescription: any): Promise<any> {
  const res = await fetch(`${API}/sessions/${sessionId}/renegotiate`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDescription }),
  });
  if (!res.ok) throw new Error(`renegotiate failed: ${res.status}`);
  return res.json();
}
