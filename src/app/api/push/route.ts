import { NextRequest } from "next/server";
import { sendWebPush, type PushSubscription } from "@/lib/webpush-native";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════
   إرسال إشعار متصفّح

   التصميم السابق كان يقبل كائن الاشتراك من المتصفّح مباشرة.
   ولأن users مقروء لكل مسجّل، كان أي حساب يستطيع قراءة اشتراك
   أي مستخدم ثم إرسال إشعار بأي نص إليه — أداة تصيّد جاهزة
   تظهر باسم موقعك.

   الآن:
     • المُرسِل يثبت هويته برمز Firebase (يُتحقّق منه لدى جوجل)
     • لا يمرّر اشتراكاً — يمرّر معرّف المستلم فقط، والخادم يجلبه
     • النصوص محدودة الطول، والرابط داخلي إجبارياً
     • حدّ للمعدّل لكل مُرسِل
════════════════════════════════════════════════════════════ */

const MAX_TITLE = 80;
const MAX_BODY = 150;
const RATE_LIMIT = 30;              // إشعاراً
const RATE_WINDOW = 10 * 60 * 1000; // كل عشر دقائق

// ذاكرة النسخة الحيّة. لا تدوم عبر إعادة التشغيل، فهي حاجز أوّلي
// لا حماية كاملة — لكنها توقف الإساءة الآلية المتكرّرة.
const recent = new Map<string, number[]>();

function rateLimited(uid: string): boolean {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < RATE_WINDOW);
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 5000) recent.clear(); // حارس ذاكرة
  return hits.length > RATE_LIMIT;
}

/** يتحقّق من رمز الدخول لدى جوجل ويُرجع هوية صاحبه */
async function verifyIdToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { localId?: string }[] };
    return data.users?.[0]?.localId ?? null;
  } catch { return null; }
}

/** يجلب اشتراك المستلم من قاعدة البيانات بصلاحية المُرسِل نفسه */
async function fetchSubscription(toUid: string, idToken: string): Promise<PushSubscription | null> {
  const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!dbUrl) return null;
  try {
    const res = await fetch(
      `${dbUrl}/users/${encodeURIComponent(toUid)}/pushSub.json?auth=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    return (await res.json()) as PushSubscription | null;
  } catch { return null; }
}

function safeLink(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  if (!s.startsWith("/") || s.startsWith("//")) return "/notifications";
  return s.slice(0, 300);
}

export async function POST(req: NextRequest) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@baczonedz.com";

  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ ok: false, error: "VAPID keys not configured" });
  }

  let body: { idToken?: string; toUid?: string; title?: string; body?: string; link?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false }); }

  const { idToken = "", toUid = "" } = body;
  if (!idToken || !toUid) return Response.json({ ok: false });

  const senderUid = await verifyIdToken(idToken);
  if (!senderUid) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  if (rateLimited(senderUid)) {
    return Response.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  const subscription = await fetchSubscription(toUid, idToken);
  if (!subscription?.endpoint || !subscription?.keys?.p256dh) {
    return Response.json({ ok: false, error: "no subscription" });
  }

  const payload = {
    title: String(body.title ?? "BacZoneDz").slice(0, MAX_TITLE),
    body: String(body.body ?? "لديك إشعار جديد").slice(0, MAX_BODY),
    link: safeLink(body.link),
  };

  try {
    await sendWebPush(subscription, payload, vapidPublic, vapidPrivate, vapidEmail);
    return Response.json({ ok: true });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    // 410 = اشتراك منتهٍ (المستخدم أزال الإذن). صاحبه وحده يملك حذفه.
    if (e?.statusCode === 410) return Response.json({ ok: false, gone: true });
    console.error("[BacZone push]", e?.message);
    return Response.json({ ok: false });
  }
}
