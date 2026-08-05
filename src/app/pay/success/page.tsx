"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { Icon } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   بعد الدفع الناجح

   ⚠️ **لا نمنح الوصول من هنا.** هذه الصفحة يفتحها المتصفّح، ومن يعرف
   رابطها يفتحه بلا دفع. الوصول يُمنح في الويب هوك وحده — الطرف الذي
   يتحقّق من توقيع Chargily.

   ولهذا ننتظر: قد يصل الويب هوك بعد ثانية أو ثلاث. فنستمع لحالة الطلب
   بدل أن نُخبر الطالب بشيء غير مؤكّد.
════════════════════════════════════════════════════════════ */

export default function PaySuccessPage() {
  const [status, setStatus] = useState<"waiting" | "paid" | "slow">("waiting");

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!orderId) { setStatus("slow"); return; }

    const unsub = onValue(ref(rtdb, `chargilyOrders/${orderId}/status`), (snap) => {
      if (snap.val() === "paid") setStatus("paid");
    });
    // بعد 20 ثانية نطمئنه بدل أن نتركه أمام دوّارة لا تنتهي
    const t = setTimeout(() => setStatus((s) => (s === "paid" ? s : "slow")), 20000);
    return () => {
      if (typeof unsub === "function") unsub();
      clearTimeout(t);
    };
  }, []);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-lg place-items-center px-4">
      <div className="w-full rounded-2xl border border-border bg-surface p-6 text-center">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
          status === "paid" ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
                            : "bg-[var(--bz-blue-050)] text-[var(--bz-blue)]"}`}>
          <Icon name={status === "paid" ? "check" : "timer"} size={26} />
        </span>

        <h1 className="mt-4 font-display text-xl font-extrabold">
          {status === "paid" ? "تمّ الدفع بنجاح" : "نؤكّد عملية الدفع…"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {status === "paid"
            ? "فُتح لك المحتوى. يمكنك الوصول إليه الآن من مكانه."
            : status === "slow"
              ? "قد يستغرق التأكيد دقيقة. إن لم يُفتح المحتوى بعدها، تواصل مع الإدارة ومعك رقم العملية."
              : "لحظة من فضلك — نتلقّى تأكيد البنك."}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/library" className="flex-1 rounded-xl bg-[var(--bz-blue)] py-2.5 text-sm font-bold text-white">
            إلى المكتبة
          </Link>
          <Link href="/home" className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-text-muted">
            الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
