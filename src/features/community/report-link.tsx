"use client";

import { useState } from "react";
import { push, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { Icon } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   التبليغ عن رابط لا يعمل

   الطالب يفتح ملخّصاً فيجد الرابط ميّتاً، ثم يغادر صامتاً — فيبقى
   العطب سنوات ولا أحد يعلم. زرّ واحد يحوّل إحباطه إلى بلاغ.

   النصّ صريح: **«بلّغ إدارة الموقع»** لا «تبليغ» وحدها — كثيرون
   يظنّون التبليغ شكوى ضدّ شخص، فيتردّدون. توضيح الجهة يزيل التردّد.

   البلاغ يذهب إلى نفس مسار `reports` الذي يقرؤه الأدمن، بنوع
   `broken-link` — فلا لوحة ثانية ولا مسار موازٍ.
════════════════════════════════════════════════════════════ */

export function ReportLinkButton({
  itemId, itemTitle, url, subject, compact = false,
}: {
  itemId: string;
  itemTitle: string;
  url?: string;
  subject?: string;
  /** داخل بطاقة مزدحمة: أيقونة بلا نصّ */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function send() {
    if (!user || state !== "idle") return;
    const reason = prompt(
      "ما المشكلة في هذا الرابط؟\n(مثال: الصفحة غير موجودة · الملفّ محذوف · يطلب إذن وصول)",
      "الرابط لا يعمل",
    );
    if (reason === null) return;          // ألغى — لا نُرسل شيئاً
    setState("busy");
    try {
      await push(ref(rtdb, "reports"), {
        kind: "broken-link",
        contentRef: itemId,
        // معاينة تُغني الأدمن عن فتح الموقع ليعرف عمّاذا يتكلّم البلاغ
        // هويّة كاملة: الأدمن يجب أن يعرف **أي ملخّص** بلا بحث
        contentPreview:
          `الملخّص: ${itemTitle}` +
          (subject ? ` · المادّة: ${subject}` : "") +
          (url ? `\nالرابط: ${url.slice(0, 300)}` : ""),
        reporterId: user.uid,
        reporterName: user.displayName || "طالب",
        reason: (reason || "الرابط لا يعمل").slice(0, 300),
        createdAt: Date.now(),
      });
      setState("done");
    } catch {
      setState("idle");
      alert("تعذّر إرسال البلاغ. أعد المحاولة.");
    }
  }

  if (!user) return null;

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--bz-green)]">
        <Icon name="check" size={12} />
        وصل بلاغك — شكراً لك
      </span>
    );
  }

  return (
    /* كان زرّاً رمادياً صغيراً بلا حدود، فلا يبدو زرّاً أصلاً ولا
       يُفهم أنّه تبليغ. الآن: حدّ أحمر خفيف وأيقونة تحذير ونصّ كامل —
       بارز بما يكفي ليُرى، وهادئ بما يكفي ألّا يُغري بالضغط عبثاً. */
    <button
      onClick={send}
      disabled={state === "busy"}
      title="بلّغ إدارة الموقع أنّ هذا الرابط لا يعمل"
      className="bz-report-btn"
    >
      <Icon name="warn" size={13} />
      {state === "busy" ? "جارٍ الإرسال…" : "بلّغ: الرابط لا يعمل"}
    </button>
  );
}
