"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePageOverride } from "@/features/admin/page-overrides";

/* ════════════════════════════════════════════════════════════
   غلاف المحتوى القابل للتعديل

   يلفّ المحتوى الافتراضي لصفحة. إن فعّل الأدمن تعديلاً، عُرض HTML
   الخاصّ به بدلاً منه — وإلّا بقي الأصل كما هو.

   **الافتراضي هو الأصل لا الفراغ**: لو تعذّرت القراءة أو لم يُفعَّل
   التعديل، يرى الزائر الصفحة الأصلية كاملة. صفحة فارغة أسوأ من صفحة
   لم تُعدَّل.
════════════════════════════════════════════════════════════ */

export function EditablePage({
  pageKey, children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  const { override, loading } = usePageOverride(pageKey);

  // أثناء القراءة نعرض الأصل: الوميض إلى فراغ ثم عودة أسوأ من انتظار قصير
  if (loading || !override) return <>{children}</>;

  if (override.disabled) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-xl font-extrabold">هذه الصفحة غير متاحة حالياً</h1>
          <p className="mt-2 text-sm text-text-muted">عد قريباً، أو تصفّح بقيّة أقسام الموقع.</p>
          <Link href="/home" className="mt-5 inline-block rounded-xl bg-[var(--bz-blue)] px-4 py-2.5 text-sm font-bold text-white">
            الرئيسية
          </Link>
        </div>
      </main>
    );
  }

  if (override.enabled && override.html?.trim()) {
    return (
      <main className="bz-guide min-h-screen">
        <div className="bz-page-html mx-auto w-full max-w-3xl px-4 py-8">
          {/* يُحقن كما هو: الكاتب هو مالك الموقع، والكتابة محصورة به
              في قواعد قاعدة البيانات. */}
          <div dangerouslySetInnerHTML={{ __html: override.html }} />
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
