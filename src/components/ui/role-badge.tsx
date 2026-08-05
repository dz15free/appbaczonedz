"use client";

import { useRole } from "@/features/auth/use-profile";

/* ════════════════════════════════════════════════════════════
   شارة الدور

   🐛 **سبب «الأستاذ يعود طالباً عند التنقّل»** كان هنا:

   ```ts
   const r = liveRole ?? role ?? "student";   // المجهول = طالب
   ```

   وذاكرة الدور كانت `Map` في الذاكرة الحيّة — **تُمسح مع كل تحميل
   صفحة**. فبعد الدخول تكون ممتلئة فيظهر «أستاذ»، وما إن ينتقل إلى
   صفحة تُعيد التحميل حتى تفرغ، فيُعرض «طالب» حتى تعود القراءة.

   إصلاحان:
   1. **مصدر واحد**: `useRole` بذاكرته المحفوظة في المتصفّح ومربوطة
      بالمعرّف — تبقى بين الصفحات وبعد إغلاق التبويب.
   2. **المجهول لا يُعرض طالباً**: نُخفي الشارة حتى نعرف. غياب شارة
      للحظة أهون بكثير من نسبة الأستاذ إلى غير صفته.
════════════════════════════════════════════════════════════ */

export function RoleBadge({ uid, role }: { uid?: string; role?: string }) {
  const { role: liveRole, ready } = useRole(uid);

  // القيمة المُمرّرة لها الأولوية: المستدعي يعرف الدور أحياناً يقيناً
  const r = role ?? liveRole;

  // لا نعرف بعد ولا قيمة مُمرّرة → لا شارة (لا «طالب» افتراضية)
  if (!r) {
    if (!ready) return null;
    return null;
  }

  if (r === "teacher") {
    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary">
        أستاذ
      </span>
    );
  }
  if (r === "admin") {
    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
        إدارة BacZoneDZ
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-border px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
      طالب
    </span>
  );
}
