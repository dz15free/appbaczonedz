
import type { Metadata } from "next";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "مؤقّت التركيز للبكالوريا — ادرس بتركيز";
const DESC = "مؤقّت تركيز بسيط لطلاب البكالوريا: وقت دراسة واضح، استراحات قصيرة، وإيقاع يساعدك على الاستمرار دون تعقيد.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/tools/pomodoro" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools/pomodoro"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function PomodoroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
