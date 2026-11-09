"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, resetPassword, needsOnboarding, AuthError } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";
import { useNextDestination } from "@/features/auth/use-require-auth";
import { emailError } from "@/lib/validate";

export default function LoginPage() {
  const next = useNextDestination();
  const router = useRouter();
  /* الصفحة التالية تُجهَّز أثناء الكتابة، فتظهر فور الدخول */
  useEffect(() => { router.prefetch(next); router.prefetch("/onboarding"); }, [router, next]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  /* أخطاء الحقول تُعرض تحت الحقل نفسه؛ أعلى البطاقة للأخطاء العامّة وحدها */
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});

  async function handleLogin() {
    /* Enter أثناء التحميل كان يُرسل طلب دخول ثانياً */
    if (loading) return;
    const errs = { email: emailError(email), password: password ? undefined : "أدخل كلمة المرور." };
    setFieldErr(errs);
    if (errs.email || errs.password) { setMsg(null); return; }
    setLoading(true);
    setMsg(null);
    try {
      await loginUser(email, password);
      const current = auth.currentUser;
      if (!current) throw new AuthError("تعذّر إكمال الدخول. حاول مجدداً.");

      let goOnboarding = false;
      try {
        goOnboarding = await Promise.race([
          needsOnboarding(current),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
        ]);
      } catch (e) {
        console.error("[BacZone] فشل فحص الإعداد — تأكّد أن Firestore مُفعّل:", e);
      }
      router.push(goOnboarding ? `/onboarding?next=${encodeURIComponent(next)}` : next);
    } catch (err) {
      console.error("[BacZone] خطأ الدخول:", err);
      if (err instanceof AuthError && err.field) {
        setFieldErr({ [err.field]: err.message });
      } else {
        setMsg({
          type: "error",
          text: err instanceof AuthError ? err.message : "تعذّر الدخول. تحقّق من اتصالك وحاول مجدداً.",
        });
      }
      setLoading(false);
    }
  }

  async function handleReset() {
    const eErr = emailError(email);
    if (eErr) {
      setMsg(null);
      setFieldErr({ email: email.trim() ? eErr : "أدخل بريدك هنا أوّلاً، ثمّ اضغط «نسيت كلمة المرور»." });
      return;
    }
    setFieldErr({});
    try {
      await resetPassword(email);
      setMsg({
        type: "success",
        text: "تم إرسال رابط استعادة كلمة المرور إلى بريدك.",
      });
    } catch (err) {
      if (err instanceof AuthError && err.field === "email") setFieldErr({ email: err.message });
      else setMsg({
        type: "error",
        text: err instanceof AuthError ? err.message : "تعذّر إرسال الرابط. تحقّق من اتصالك وحاول مجدداً.",
      });
    }
  }

  return (
    <div className="w-full">
      {/* العنوان */}
      <div className="mb-6 text-center lg:text-right">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[1.65rem]">
          مرحباً بعودتك 👋
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          سجّل الدخول لمتابعة رحلتك نحو الباك.
        </p>
      </div>

      {/* البطاقة */}
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        {msg && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${
              msg.type === "error"
                ? "bg-danger/10 text-danger"
                : "bg-secondary/10 text-secondary"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (fieldErr.email) setFieldErr((f) => ({ ...f, email: undefined })); }}
            placeholder="example@email.com"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            error={fieldErr.email}
          />

          <div>
            <Input
              label="كلمة المرور"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (fieldErr.password) setFieldErr((f) => ({ ...f, password: undefined })); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              error={fieldErr.password}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-primary transition hover:underline underline-offset-2"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleLogin}
          loading={loading}
          className="mt-6 h-12 w-full text-[15px] font-bold"
        >
          دخول
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        ليس لديك حساب؟{" "}
        <Link
          href="/register"
          className="font-bold text-primary hover:underline underline-offset-2"
        >
          أنشئ حساباً
        </Link>
      </p>
    </div>
  );
}