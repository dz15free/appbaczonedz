import { NextRequest } from "next/server";
import { dbGet, dbSet, dbUpdate, dbPush, isServerDbReady } from "@/lib/firebase/server-db";

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

/* الوضع يُقرأ من لوحة الإدارة أوّلاً ثم من البيئة.
   فالتحويل بين التجربة والإنتاج ضغطة زرّ لا إعادة نشر. */
async function resolveBase(): Promise<"live" | "test"> {
  try {
    const v = await dbGet<string>("settings/chargilyMode");
    if (v === "live" || v === "test") return v;
  } catch { /* نرجع إلى البيئة */ }
  return process.env.CHARGILY_MODE === "live" ? "live" : "test";
}

function baseUrl(mode: "live" | "test") {
  return mode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://baczone.app").replace(/\/+$/, "");

type ItemType = "library" | "room" | "course";

const ITEM_PATHS: Record<ItemType, string> = {
  library: "library",
  room: "rooms",
  course: "courses",
};

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return Response.json({ error: "الدفع الإلكتروني غير مُفعّل بعد." }, { status: 503 });
  }
  if (!isServerDbReady()) {
    // رسالة صريحة بدل 500 غامض
    return Response.json(
      { error: "إعداد الخادم ناقص (FIREBASE_DB_SECRET)." },
      { status: 503 },
    );
  }

  let body: { itemType?: string; itemId?: string; uid?: string; name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const itemType: ItemType =
    body.itemType === "room" ? "room" : body.itemType === "course" ? "course" : "library";
  const itemId = String(body.itemId ?? "").trim();
  const uid = String(body.uid ?? "").trim();
  if (!itemId || !uid) {
    return Response.json({ error: "بيانات ناقصة." }, { status: 400 });
  }

  // نقرأ العنصر من قاعدة البيانات — السعر والمالك من هناك لا من الطلب
  const path = `${ITEM_PATHS[itemType]}/${itemId}`;
  const item = await dbGet<{
    title?: string; name?: string; price?: number; isPaid?: boolean;
    uploaderId?: string; ownerId?: string; uploaderName?: string; ownerName?: string;
    teacherId?: string; teacherName?: string; type?: string; status?: string;
  }>(path);
  if (!item) {
    return Response.json({ error: "العنصر غير موجود." }, { status: 404 });
  }

  /* الدورة تحمل `type` و`status` بدل `isPaid`.
     و**المنشورة وحدها تُباع**: بيع مسوّدة يعني أن يدفع طالب مقابل
     محتوى لم يجتز المراجعة بعد. */
  if (itemType === "course") {
    if (item.type !== "paid") {
      return Response.json({ error: "هذه الدورة مجّانية." }, { status: 400 });
    }
    if (item.status !== "published") {
      return Response.json({ error: "هذه الدورة غير متاحة للشراء حالياً." }, { status: 400 });
    }
  } else if (!item.isPaid) {
    return Response.json({ error: "هذا العنصر مجّاني." }, { status: 400 });
  }
  const price = Number(item.price) || 0;
  // الحدّ الأدنى عند Chargily 75 دج — نرفضه هنا برسالة مفهومة بدل خطأ خامّ
  if (price < 75) {
    return Response.json({ error: "السعر أقلّ من الحدّ الأدنى المسموح (75 دج)." }, { status: 400 });
  }

  const title = String(item.title ?? item.name ?? "محتوى BacZone").slice(0, 120);
  const ownerId = String(item.uploaderId ?? item.ownerId ?? item.teacherId ?? "");
  const ownerName = String(item.uploaderName ?? item.ownerName ?? item.teacherName ?? "");

  /* سجلّ محلّي قبل الانتقال: الويب هوك يصل باسم هذا السجلّ، فنعرف
     **من اشترى وماذا** حتى لو تأخّر أو تكرّر. */
  const orderId = await dbPush("chargilyOrders", {
    uid, itemType, itemId, itemTitle: title,
    price, ownerId, ownerName,
    status: "pending",
    createdAt: Date.now(),
  });
  if (!orderId) {
    return Response.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  }

  const mode = await resolveBase();
  try {
    const res = await fetch(`${baseUrl(mode)}/checkouts`, {
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
      await dbSet(`chargilyOrders/${orderId}/status`, "failed");
      return Response.json(
        { error: data.message || "تعذّر إنشاء عملية الدفع." },
        { status: 502 },
      );
    }

    await dbUpdate(`chargilyOrders/${orderId}`, { checkoutId: data.id ?? "", mode });
    return Response.json({ url: data.checkout_url, orderId });
  } catch (e) {
    await dbSet(`chargilyOrders/${orderId}/status`, "failed").catch(() => {});
    // نُسجّل السبب في سجلّ الخادم: 502 وحده لا يُخبرك أين المشكلة
    console.error("[BacZone] Chargily checkout failed:", e);
    return Response.json({ error: "تعذّر الاتصال ببوابة الدفع." }, { status: 502 });
  }
}
