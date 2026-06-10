"use client";

export default function GlobalError({
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
      </body>
    </html>
  );
}
