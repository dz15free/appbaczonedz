import type { Metadata } from "next";
import { getPublishedEntries } from "@/features/blog/blog-server";
import LandingPage from "@/components/landing/landing-page-client";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BacZone — منصة دراسة وأدوات البكالوريا في الجزائر",
  description: "منصة دراسة تفاعلية ومجتمع دراسي وأدوات عملية لطلبة البكالوريا في الجزائر: حساب المعدل، محاكاة الامتحان، برامج المراجعة، المدونة ودليل التخصصات.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "/",
    title: "BacZone — منصة دراسة وأدوات البكالوريا في الجزائر",
    description: "منصة دراسة تفاعلية ومجتمع دراسي وأدوات عملية لطلبة البكالوريا في الجزائر.",
  },
};

export default async function HomePage() {
  const latestPosts = (await getPublishedEntries()).slice(0, 3);
  return <LandingPage latestPosts={latestPosts} />;
}
