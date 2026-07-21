"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BacZone Error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger">
        <FontAwesomeIcon icon={faTriangleExclamation} className="h-8 w-8" />
      </span>
      <h2 className="font-display text-xl font-extrabold">حدث خطأ غير متوقّع</h2>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        تعذّر تحميل هذه الصفحة. يمكنك إعادة المحاولة أو العودة للرئيسية.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
          إعادة المحاولة
        </button>
        <a
          href="/home"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-bold transition hover:bg-surface"
        >
          الرئيسية
        </a>
      </div>
      {/* تفاصيل الخطأ — متاحة دائماً (قابلة للطي) لتسهيل الإبلاغ والإصلاح */}
      <details className="mt-6 max-w-lg text-left">
        <summary className="cursor-pointer text-xs text-text-muted">تفاصيل تقنية (انسخها للدعم)</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface p-3 text-xs text-danger" dir="ltr">
{error.message}{error.digest ? `\n\ndigest: ${error.digest}` : ""}{error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      </details>
    </main>
  );
}
