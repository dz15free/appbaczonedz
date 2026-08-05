"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   زرّ الدفع عبر Chargily

   لا يُلغي الدفع بالتواصل مع الإدارة — يقف بجانبه. بعض الطلبة لا
   يملكون بطاقة، وبعضهم يفضّل الدفع الفوري؛ إغلاق أحد البابين يخسر
   قسماً منهم.

   الزرّ **لا يعرف المفتاح السرّي ولا السعر**: يرسل معرّف العنصر فقط،
   والخادم يقرأ السعر من قاعدة البيانات. لو أرسلنا السعر من هنا
   لاستطاع أي طالب تعديله قبل الإرسال.
════════════════════════════════════════════════════════════ */

export function ChargilyPayButton({
  itemType, itemId, price, uid, className = "",
}: {
  itemType: "library" | "room";
  itemId: string;
  /** للعرض فقط — الخادم لا يثق به */
  price: number;
  uid: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pay() {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/chargily/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, uid }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErr(data.error || "تعذّر بدء الدفع.");
        setBusy(false);
        return;
      }
      // انتقال كامل لا نافذة منبثقة: النوافذ تُحجب على الهواتف كثيراً
      window.location.href = data.url;
    } catch {
      setErr("تعذّر الاتصال. تحقّق من الإنترنت.");
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button onClick={pay} disabled={busy} className="bz-pay-btn">
        <span className="bz-pay-ico"><Icon name="lock" size={15} /></span>
        <span className="min-w-0 flex-1 text-right">
          <span className="block text-[13px] font-extrabold">ادفع الآن بالبطاقة</span>
          <span className="block text-[10.5px] opacity-80">
            ذهبية بريد الجزائر أو CIB — {price} دج
          </span>
        </span>
        {busy ? (
          <span className="text-[11px] font-bold">جارٍ التحويل…</span>
        ) : (
          <Icon name="chevLeft" size={14} className="shrink-0 opacity-80" />
        )}
      </button>
      {err && <p className="mt-1.5 text-[11px] font-bold text-danger">{err}</p>}
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-muted">
        الدفع يتمّ على صفحة Chargily الآمنة — لا نرى بيانات بطاقتك ولا نحفظها.
      </p>
    </div>
  );
}
