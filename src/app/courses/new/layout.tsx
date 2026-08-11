import type { Metadata } from "next";

/* يُلغي `canonical` الموروث من `/courses/layout.tsx`.
   بدونه تُعلن هذه الصفحة أنّ نسختها الأصلية صفحة أخرى. */
export const metadata: Metadata = {
  title: "إنشاء دورة — BacZone",
  robots: { index: false, follow: true },
  alternates: { canonical: "/courses/new" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
