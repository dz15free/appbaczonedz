/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // تحسين الأداء: ضغط، إزالة console في الإنتاج، تحسين الحزم
  compress: true,
  poweredByHeader: false,
  // خرائط المصدر في الإنتاج: تجعل أخطاء المتصفّح تُظهر اسم الملف والسطر الحقيقي
  // بدل الرموز المصغّرة مثل "i is not a function". مفيدة للتشخيص، ولا تؤثّر على المستخدم.
  productionBrowserSourceMaps: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    // تحسين استيراد المكتبات الكبيرة (الأيقونات فقط).
    // ملاحظة: أُزيل "firebase" عمداً — تحسين استيراد firebase عبر هذه الميزة
    // التجريبية يكسر بعض دوالها في الإنتاج فيظهر خطأ "i is not a function".
    optimizePackageImports: [
      "@fortawesome/react-fontawesome",
      "@fortawesome/free-solid-svg-icons",
    ],
  },
  images: {
    // على Cloudflare Workers لا نستعمل تحسين الصور المدفوع: تُعرض الصور من مصدرها مباشرة
    // (Supabase / Cloudinary / Google). remotePatterns تبقى للتوثيق ولـ next dev.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "blogger.googleusercontent.com" },
    ],
  },
  /* روابط تخصّصات قديمة لم يعد لها سطر في الدليل (أُدمجت في صفحات أخرى أو
     أُعيدت تسميتها). كانت تُجيب بـ200 وnoindex وcanonical إلى الرئيسية —
     «soft 404» يعدّه Search Console ضمن «Excluded by noindex». تحويل دائم
     إلى الصفحة الحيّة لنفس الموضوع ينقل إشاراتها بدل أن يهدرها.
     ⚠️ لا تمسّ منطق التخصّصات ولا قائمة noindex: هذه عناوين لا صفحات لها. */
  async redirects() {
    const moved = {
      "architecture": "architecture-uni",
      "autonomous-systems": "ensas",
      "biomedical-eng": "biomedical",
      "data-science": "ensia",
      "food-science": "agroalimentaire",
      "industrial-engineering": "gi",
      "logistics-engineering": "gt",
      "marine-eng": "marine",
      "political-science": "sciences-po",
      "renewable-energy": "renouvelables",
    };
    return Object.entries(moved).map(([from, to]) => ({
      source: `/specialties/${from}`,
      destination: `/specialties/${to}`,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // تخزين مؤقّت طويل للأصول الثابتة
        source: "/:path*\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
