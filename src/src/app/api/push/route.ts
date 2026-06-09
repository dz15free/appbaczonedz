import { NextRequest } from "next/server";
import { sendWebPush, type PushSubscription } from "@/lib/webpush-native";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@baczonedz.com";

  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ ok: false, error: "VAPID keys not configured" });
  }

  let body: { subscription: PushSubscription; title: string; body: string; link?: string };
  try { body = await req.json(); } catch {
    return Response.json({ ok: false });
  }

  const { subscription, title, body: msg, link = "/notifications" } = body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh) {
    return Response.json({ ok: false });
  }

  try {
    await sendWebPush(subscription, { title, body: msg, link }, vapidPublic, vapidPrivate, vapidEmail);
    return Response.json({ ok: true });
  } catch (err: any) {
    if (err?.statusCode === 410) return Response.json({ ok: false, gone: true });
    console.error("[BacZone push]", err?.message);
    return Response.json({ ok: false });
  }
}
