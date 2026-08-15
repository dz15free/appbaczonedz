import { redirect } from "next/navigation";

/**
 * المسار القديم لخباشة. نُبقيه صالحًا للروابط المحفوظة ونوحّده مع
 * صفحة `/aibot` التي تحتوي على persistence المحادثة.
 */
export default function OmibotRedirectPage() {
  redirect("/aibot");
}
