/* تحقّق بسيط من الحقول — رسائل عربية تُعرض تحت الحقل المعنيّ.
   لا نعتمد على تحقّق المتصفّح (`required`/`type=email`): رسائله تأتي
   بلغة الجهاز (غالباً الفرنسية أو الإنجليزية) وفي فقاعة تختفي. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "أدخل بريدك الإلكتروني.";
  if (!EMAIL_RE.test(v)) return "صيغة البريد غير صحيحة — مثال: name@gmail.com";
  return undefined;
}
