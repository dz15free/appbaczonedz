import { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server-auth";

export const runtime = "nodejs";

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
function dbUrl(path = "", idToken = "") {
  return `${DB}/${path.replace(/^\/+/, "")}.json?auth=${encodeURIComponent(idToken)}`;
}

async function dbGet<T>(path: string, idToken: string): Promise<T | null> {
  const response = await fetch(`${DB}/${path.replace(/^\/+/, "")}.json?auth=${encodeURIComponent(idToken)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T | null;
}

async function dbPatch(updates: Record<string, null>, idToken: string) {
  const response = await fetch(dbUrl("", idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`admin room patch failed: ${response.status}`);
}

export async function POST(req: NextRequest) {
  if (!DB) return Response.json({ error: "الخدمة الإدارية غير مهيّأة." }, { status: 503 });

  let body: { idToken?: string; roomId?: string; action?: "close" | "delete" };
  try { body = await req.json(); } catch { return Response.json({ error: "طلب غير صالح." }, { status: 400 }); }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const uid = await verifyFirebaseIdToken(idToken);
  if (!uid) return Response.json({ error: "انتهت جلسة الدخول." }, { status: 401 });

  const role = await dbGet<string>(`users/${uid}/role`, idToken);
  if (role !== "admin") return Response.json({ error: "لا تملك صلاحية هذا الإجراء." }, { status: 403 });

  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(roomId)) return Response.json({ error: "معرّف غرفة غير صالح." }, { status: 400 });

  const room = await dbGet<{ ownerId?: string }>(`rooms/${roomId}`, idToken);
  if (!room) return Response.json({ error: "الغرفة غير موجودة." }, { status: 404 });

  const updates: Record<string, null> = { [`roomLive/${roomId}`]: null };
  if (body.action === "delete") {
    const paths = [
      `rooms/${roomId}`,
      `notesDraft/${roomId}`,
      `presence/${roomId}`,
      `bannedUsers/${roomId}`,
      `roomChallengeAnswers/${roomId}`,
      `roomChallengeScores/${roomId}`,
      `roomSummaries/${roomId}`,
      `roomExamPapers/${roomId}`,
      `roomExamGrades/${roomId}`,
    ];
    paths.forEach((path) => { updates[path] = null; });

    const sessions = await dbGet<Record<string, { roomId?: string }>>("scheduledSessions", idToken);
    Object.entries(sessions ?? {}).forEach(([sessionId, session]) => {
      if (session?.roomId === roomId) {
        updates[`scheduledSessions/${sessionId}`] = null;
        updates[`sessionReminders/${sessionId}`] = null;
      }
    });
  }

  try {
    await dbPatch(updates, idToken);
    return Response.json({ ok: true, action: body.action === "delete" ? "delete" : "close", roomId, deletedPaths: Object.keys(updates) });
  } catch (error) {
    console.error("[Admin rooms] cleanup failed", error);
    return Response.json({ error: "تعذّر تنفيذ الإجراء الإداري." }, { status: 500 });
  }
}
