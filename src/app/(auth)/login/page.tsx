"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, resetPassword, needsOnboarding, AuthError } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Input, Button } from "@/components/ui/field";
import { useNextDestination } from "@/features/auth/use-require-auth";

export default function LoginPage() {
  const next = useNextDestination();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setMsg({ type: "error", text: "الرجاء إدخال البريد وكلمة المرور." });
      return;
    }
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
      setMsg({
        type: "error",
        text: err instanceof AuthError ? err.message : "خطأ غير متوقّع.",
      });
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      return setMsg({
        type: "error",
        text: "أدخل بريدك أولاً ثم اضغط نسيت كلمة المرور.",
      });
    }
    try {
      await resetPassword(email);
      setMsg({
        type: "success",
        text: "تم إرسال رابط استعادة كلمة المرور إلى بريدك.",
      });
    } catch (err) {
      setMsg({
        type: "error",
        text: err instanceof AuthError ? err.message : "فشل الإرسال.",
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <div>
            <Input
              label="كلمة المرور"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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