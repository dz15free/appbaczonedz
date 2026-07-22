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
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "blogger.googleusercontent.com" },
    ],
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
