import type { Metadata } from "next";

/* المجموعات صفحات داخل الحساب (الصفحة نفسها «use client» وتطلب الدخول):
   الزائر وGoogle يريان قشرةً فارغة. كانت بلا noindex — الوحيدة بين صفحات
   التطبيق المفتوحة للزحف (robots.txt يمنع `/groups/` لا `/groups`)، فقد
   تُفهرس صفحةً بلا محتوى. نفس سياسة `/community` و`/home`. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  alternates: { canonical: "/groups" },
};

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
