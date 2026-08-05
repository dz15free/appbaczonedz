import { NextRequest } from "next/server";
import { ref, get, set, push } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════
   إنشاء عملية دفع عبر Chargily Pay

   ⚠️ **المفتاح السرّي لا يغادر الخادم أبداً.** لهذا يُنشأ الدفع هنا لا
   في المتصفّح: من يملك المفتاح السرّي يستطيع إنشاء عمليات ومنح وصول
   باسمك. حزمة Chargily نفسها تقول: «للخادم فقط».

   ولا نُنشئ حزمة npm جديدة: نداء `fetch` واحد إلى نقطة موثّقة أخفّ من
   تبعية كاملة، ولا يُدخلنا في ترقيات لا نحتاجها.

   **السعر يُقرأ من قاعدة البيانات لا من الطلب.** لو أخذناه من المتصفّح
   لاستطاع أي طالب تعديله إلى 10 دنانير ودفعه. هذا أخطر عيب ممكن في
   بوابة دفع، فنقرأ السعر من العنصر نفسه.
════════════════════════════════════════════════════════════ */

const SECRET = process.env.CHARGILY_SECRET_KEY;
const MODE = process.env.CHARGILY_MODE === "live" ? "live" : "test";
const BASE =
  MODE === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com").replace(/\/+$/, "");

type ItemType = "library" | "room";

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return Response.json({ error: "الدفع الإلكتروني غير مُفعّل بعد." }, { status: 503 });
  }

  let body: { itemType?: string; itemId?: string; uid?: string; name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const itemType = body.itemType === "room" ? "room" : "library";
  const itemId = String(body.itemId ?? "").trim();
  const uid = String(body.uid ?? "").trim();
  if (!itemId || !uid) {
    return Response.json({ error: "بيانات ناقصة." }, { status: 400 });
  }

  // نقرأ العنصر من قاعدة البيانات — السعر والمالك من هناك لا من الطلب
  const path = itemType === "room" ? `rooms/${itemId}` : `library/${itemId}`;
  const snap = await get(ref(rtdb, path));
  if (!snap.exists()) {
    return Response.json({ error: "العنصر غير موجود." }, { status: 404 });
  }
  const item = snap.val() as {
    title?: string; name?: string; price?: number; isPaid?: boolean;
    uploaderId?: string; ownerId?: string; uploaderName?: string; ownerName?: string;
  };

  if (!item.isPaid) {
    return Response.json({ error: "هذا العنصر مجّاني." }, { status: 400 });
  }
  const price = Number(item.price) || 0;
  // الحدّ الأدنى عند Chargily 75 دج — نرفضه هنا برسالة مفهومة بدل خطأ خامّ
  if (price < 75) {
    return Response.json({ error: "السعر أقلّ من الحدّ الأدنى المسموح (75 دج)." }, { status: 400 });
  }

  const title = String(item.title ?? item.name ?? "محتوى BacZone").slice(0, 120);
  const ownerId = String(item.uploaderId ?? item.ownerId ?? "");
  const ownerName = String(item.uploaderName ?? item.ownerName ?? "");

  /* سجلّ محلّي قبل الانتقال: الويب هوك يصل باسم هذا السجلّ، فنعرف
     **من اشترى وماذا** حتى لو تأخّر أو تكرّر. */
  const orderRef = push(ref(rtdb, "chargilyOrders"));
  const orderId = orderRef.key as string;
  await set(orderRef, {
    uid, itemType, itemId, itemTitle: title,
    price, ownerId, ownerName,
    status: "pending",
    createdAt: Date.now(),
  });

  try {
    const res = await fetch(`${BASE}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: price,
        currency: "dzd",
        success_url: `${SITE}/pay/success?order=${orderId}`,
        failure_url: `${SITE}/pay/failed?order=${orderId}`,
        webhook_endpoint: `${SITE}/api/chargily/webhook`,
        description: `${title} — BacZone`,
        locale: "ar",
        // نمرّر هويّة الطلب: الويب هوك يعيدها إلينا فنعرف ما نفتحه
        metadata: { orderId, uid, itemType, itemId },
      }),
    });

    const data = (await res.json()) as { checkout_url?: string; id?: string; message?: string };
    if (!res.ok || !data.checkout_url) {
      await set(ref(rtdb, `chargilyOrders/${orderId}/status`), "failed");
      return Response.json(
        { error: data.message || "تعذّر إنشاء عملية الدفع." },
        { status: 502 },
      );
    }

    await set(ref(rtdb, `chargilyOrders/${orderId}/checkoutId`), data.id ?? "");
    return Response.json({ url: data.checkout_url, orderId });
  } catch {
    await set(ref(rtdb, `chargilyOrders/${orderId}/status`), "failed");
    return Response.json({ error: "تعذّر الاتصال ببوابة الدفع." }, { status: 502 });
  }
}
