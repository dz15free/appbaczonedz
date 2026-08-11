import type { Metadata } from "next";
import { LegalShell } from "@/features/legal/legal-shell";
import { ContactBody } from "@/features/legal/contact-body";

const TITLE = "اتصل بنا";
const DESC =
  "قنوات التواصل مع فريق BacZoneDZ: الدعم التقني، تفعيل حساب أستاذ، " +
  "استفسارات الدفع، الإبلاغ عن محتوى، وطلبات الخصوصية.";
const UPDATED = "2026-08-10";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: "/contact",
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ContactPage() {
  return (
    <LegalShell
      title={TITLE}
      path="/contact"
      updated={UPDATED}
      intro="نقرأ كل رسالة تصلنا. اختر القناة التي تريحك، واذكر تفاصيل مشكلتك لنجيبك من أوّل مرّة."
    >
      <ContactBody />
    </LegalShell>
  );
}
