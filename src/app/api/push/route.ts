import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@baczonedz.com";

  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ ok: false, error: "VAPID keys not configured" });
  }

  let body: { subscription: any; title: string; body: string; link?: string };
  try { body = await req.json(); } catch {
    return Response.json({ ok: false });
  }

  const { subscription, title, body: msg, link = "/notifications" } = body;
  if (!subscription?.endpoint) return Response.json({ ok: false });

  try {
    // استيراد web-push ديناميكي (Node-only)
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body: msg, link }));
    return Response.json({ ok: true });
  } catch (err: any) {
    // 410 Gone: المشترك ألغى — ليس خطأ حقيقياً
    if (err?.statusCode === 410) return Response.json({ ok: false, gone: true });
    console.error("[BacZone push]", err?.message);
    return Response.json({ ok: false });
  }
}
