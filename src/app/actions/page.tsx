import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionsClient } from "@/features/auth/actions-client";

export const metadata: Metadata = {
  title: "تأكيد الحساب وإدارة كلمة السر",
  description: "صفحة BacZone الآمنة لإعادة كلمة السر وتأكيد البريد الإلكتروني وإتمام عمليات الحساب.",
  robots: { index: false, follow: false },
};

function ActionsFallback() {
  return (
    <main className="bz-actions-page" dir="rtl">
      <section className="bz-actions-shell bz-actions-shell-fallback" aria-live="polite">
        <div className="bz-actions-loading"><span className="bz-actions-fallback-dot" /><p>نفتح لك خطوة الحساب بأمان…</p></div>
      </section>
    </main>
  );
}

export default function ActionsPage() {
  return (
    <Suspense fallback={<ActionsFallback />}>
      <ActionsClient />
    </Suspense>
  );
}
