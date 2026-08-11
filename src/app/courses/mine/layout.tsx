import type { Metadata } from "next";

/* يُلغي `canonical` الموروث من `/courses/layout.tsx`.
   بدونه تُعلن هذه الصفحة أنّ نسختها الأصلية صفحة أخرى. */
export const metadata: Metadata = {
  title: "دوراتي — BacZone",
  robots: { index: false, follow: true },
  alternates: { canonical: "/courses/mine" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
