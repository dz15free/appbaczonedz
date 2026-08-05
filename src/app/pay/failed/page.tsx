"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/* صفحة الفشل: لا نلوم الطالب ولا نُخيفه — نعطيه الخطوة التالية.
   أكثر أسباب الفشل شيوعاً رصيد غير كافٍ أو إلغاء، وكلاهما لا يستدعي
   نبرة إنذار. */

export default function PayFailedPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-lg place-items-center px-4">
      <div className="w-full rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--bz-amber-050)] text-[var(--bz-amber)]">
          <Icon name="warn" size={26} />
        </span>
        <h1 className="mt-4 font-display text-xl font-extrabold">لم تكتمل عملية الدفع</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          لم يُخصم منك شيء. قد يكون السبب إلغاء العملية أو رصيداً غير كافٍ.
          يمكنك المحاولة مرّة أخرى، أو الدفع بالتواصل مع الإدارة.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/library" className="flex-1 rounded-xl bg-[var(--bz-blue)] py-2.5 text-sm font-bold text-white">
            العودة والمحاولة
          </Link>
          <Link href="/home" className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-text-muted">
            الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
