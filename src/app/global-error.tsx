"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h1 style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          حدث خطأ في تحميل التطبيق
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          يرجى إعادة المحاولة أو تحديث الصفحة.
        </p>
        <button
          onClick={reset}
          style={{
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.75rem 1.5rem",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          إعادة المحاولة
        </button>
        <details style={{ marginTop: "1.5rem", maxWidth: "40rem", marginInline: "auto", textAlign: "left" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "#6b7280" }}>تفاصيل تقنية (انسخها للدعم)</summary>
          <pre dir="ltr" style={{ marginTop: "0.5rem", maxHeight: "12rem", overflow: "auto", background: "#f3f4f6", padding: "0.75rem", borderRadius: "0.375rem", fontSize: "0.7rem", color: "#dc2626" }}>
{error.message}{error.digest ? `\n\ndigest: ${error.digest}` : ""}{error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      </body>
    </html>
  );
}
