import type { Metadata } from "next";

/* صفحة تشخيص — لا مكان لها في نتائج البحث */
export const metadata: Metadata = {
  title: "فحص الصوت",
  robots: { index: false, follow: false },
};

export default function VoiceCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
