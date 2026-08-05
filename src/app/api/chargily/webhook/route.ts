import { NextRequest } from "next/server";
import crypto from "crypto";
import { dbGet, dbSet, dbUpdate, isServerDbReady } from "@/lib/firebase/server-db";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════
   ويب هوك Chargily — منح الوصول بعد الدفع

   **هذه أخطر نقطة في النظام كلّه**: من يستطيع تزوير نداء إليها يمنح
   نفسه كل المحتوى المدفوع مجّاناً. ولذلك:

   1. **نتحقّق من التوقيع أوّلاً** — HMAC-SHA256 للجسم الخامّ بالمفتاح
      السرّي. بلا توقيع صحيح لا نقرأ الجسم أصلاً.
   2. **نقرأ الجسم خامّاً** (`req.text()`) لا مُحلَّلاً: أي إعادة ترتيب
      أو تنسيق تُغيّر البايتات فيفشل التوقيع الصحيح.
   3. **`timingSafeEqual`** لا `===`: المقارنة العادية تنتهي عند أوّل
      اختلاف، وفرق الزمن يسمح نظرياً بتخمين التوقيع حرفاً حرفاً.
   4. **السعر والعنصر من سجلّ الطلب** لا من حمولة الويب هوك.
   5. **إعادة الإرسال آمنة**: Chargily قد يُعيد الإرسال عند تأخّر
      الردّ، فنتجاهل الطلب المُعالَج مسبقاً بدل منح وصول مرّتين.
════════════════════════════════════════════════════════════ */

const SECRET = process.env.CHARGILY_SECRET_KEY;

function verify(rawBody: string, signature: string): boolean {
  if (!SECRET || !signature) return false;
  const computed = crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  // الطولان يجب أن يتساويا قبل timingSafeEqual وإلّا رمى استثناءً
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!SECRET) return new Response("not configured", { status: 503 });
  /* الويب هوك يناديه Chargily لا المستخدم — فلا هويّة إطلاقاً.
     بلا سرّ قاعدة البيانات لا يستطيع منح الوصول، و**503 مقصودة** كي
     يُعيد Chargily الإرسال بدل أن تضيع عملية مدفوعة. */
  if (!isServerDbReady()) return new Response("db not configured", { status: 503 });

  const signature = req.headers.get("signature") ?? "";
  const raw = await req.text();

  if (!verify(raw, signature)) {
    // 403 بلا تفصيل: لا نُعلم المهاجم أين أخطأ
    return new Response("invalid signature", { status: 403 });
  }

  let event: { type?: string; data?: { metadata?: Record<string, unknown>; status?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // نتعامل مع الدفع الناجح فقط؛ الباقي نردّ عليه 200 كي لا يُعيد الإرسال
  if (event.type !== "checkout.paid") return new Response("ignored", { status: 200 });

  const meta = (event.data?.metadata ?? {}) as {
    orderId?: string; uid?: string; itemType?: string; itemId?: string;
  };
  const orderId = String(meta.orderId ?? "");
  if (!orderId) return new Response("no order", { status: 200 });

  try {
    const order = await dbGet<{
      uid: string; itemType: "library" | "room"; itemId: string; itemTitle: string;
      price: number; ownerId?: string; ownerName?: string; status?: string;
    }>(`chargilyOrders/${orderId}`);
    if (!order) return new Response("unknown order", { status: 200 });

    // إعادة إرسال: مُعالَج مسبقاً — نردّ 200 ولا نمنح مرّتين
    if (order.status === "paid") return new Response("already handled", { status: 200 });

    /* منح الوصول: نكتب في `purchases` بنفس شكل نظام الأكواد القائم،
       فيقرأه كل ما هو مبنيّ عليه بلا تعديل. */
    const grantId = `chargily_${orderId}`;
    await dbSet(`purchases/${order.uid}/${order.itemType}/${order.itemId}`, grantId);
    /* ⚠️ المسار `userAccess` لا `access`: هذا ما تقرؤه الواجهة فعلاً
       (`listenHasAccess`). كتابته في مسار آخر تعني أن يدفع الطالب
       ولا يُفتح له شيء — وهو أسوأ عطب ممكن هنا. */
    await dbSet(`userAccess/${order.uid}/${order.itemType}/${order.itemId}`, grantId);

    // سجلّ للأستاذ والإدارة: من اشترى وبكم ومتى
    await dbSet(`chargilyPayments/${orderId}`, {
      uid: order.uid,
      itemType: order.itemType,
      itemId: order.itemId,
      itemTitle: order.itemTitle,
      price: order.price,
      ownerId: order.ownerId ?? "",
      ownerName: order.ownerName ?? "",
      method: "chargily",
      paidAt: Date.now(),
    });

    await dbUpdate(`chargilyOrders/${orderId}`, { status: "paid", paidAt: Date.now() });

    return new Response("ok", { status: 200 });
  } catch {
    /* 500 مقصود: Chargily يُعيد الإرسال عند الفشل، فلا تضيع عملية دفع
       بسبب انقطاع مؤقّت في قاعدة البيانات. */
    return new Response("retry", { status: 500 });
  }
}
