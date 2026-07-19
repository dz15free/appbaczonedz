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
    setLoading(true);
    setMsg(null);
    try {
      await loginUser(email, password);
      const current = auth.currentUser;
      if (!current) throw new AuthError("تعذّر إكمال الدخول. حاول مجدداً.");

      // فحص الإعداد عبر Firestore — مع مهلة حتى لا يتجمّد الدخول إن تأخّر
      let goOnboarding = false;
      try {
        goOnboarding = await Promise.race([
          needsOnboarding(current),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
        ]);
      } catch (e) {
        console.error("[BacZone] فشل فحص الإعداد — تأكّد أن Firestore مُفعّل:", e);
      }
      // نمرّر الوجهة إلى الإعداد الأولي أيضاً حتى لا تضيع
      router.push(goOnboarding ? `/onboarding?next=${encodeURIComponent(next)}` : next);
    } catch (err) {
      console.error("[BacZone] خطأ الدخول:", err);
      setMsg({ type: "error", text: err instanceof AuthError ? err.message : "خطأ غير متوقّع." });
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) return setMsg({ type: "error", text: "أدخل بريدك أولاً ثم اضغط نسيت كلمة المرور." });
    try {
      await resetPassword(email);
      setMsg({ type: "success", text: "تم إرسال رابط الاستعادة إلى بريدك." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof AuthError ? err.message : "فشل الإرسال." });
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold">تسجيل الدخول</h1>

      {msg && (
        <div
          className={`rounded-md px-4 py-2.5 text-sm ${
            msg.type === "error" ? "bg-danger/10 text-danger" : "bg-secondary/10 text-secondary"
          }`}
        >
          {msg.text}
        </div>
      )}

      <Input
        label="البريد الإلكتروني"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="example@email.com"
      />
      <Input
        label="كلمة المرور"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />

      <button onClick={handleReset} className="text-sm text-primary hover:underline">
        نسيت كلمة المرور؟
      </button>

      <Button onClick={handleLogin} loading={loading} className="w-full">
        دخول
      </Button>

      <p className="text-center text-sm text-text-muted">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          أنشئ حساباً
        </Link>
      </p>
    </div>
  );
}
