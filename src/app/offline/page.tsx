import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        direction: "rtl",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📡</div>
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          display: "grid",
          placeItems: "center",
          fontSize: "1.5rem",
          fontWeight: 900,
          color: "#fff",
          marginBottom: "1.5rem",
        }}
      >
        BZ
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
        لا يوجد اتصال بالإنترنت
      </h1>
      <p style={{ color: "#6b7280", maxWidth: "320px", lineHeight: 1.7, marginBottom: "2rem", fontSize: "0.95rem" }}>
        تحقّق من اتصالك بالشبكة وحاول مجدداً. يمكنك الاستمرار في الدراسة بدون إنترنت باستخدام البطاقات والمؤقّت.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff",
          border: "none",
          borderRadius: "0.6rem",
          padding: "0.85rem 2rem",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: "0.95rem",
          marginBottom: "0.75rem",
          width: "100%",
          maxWidth: "260px",
        }}
      >
        🔄 إعادة المحاولة
      </button>
      <Link
        href="/tools/flashcards"
        style={{
          color: "#4f46e5",
          fontSize: "0.85rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        → ادرس بالبطاقات بدون إنترنت
      </Link>
    </main>
  );
}
