"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, AuthError } from "@/lib/firebase/auth";
import { Input, Button } from "@/components/ui/field";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { useNextDestination } from "@/features/auth/use-require-auth";
import { SupportChatSheet } from "@/features/support/support-chat";
import { useAuth } from "@/features/auth/auth-provider";

export default function RegisterPage() {
  const next = useNextDestination();
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [supportOpen, setSupportOpen] = useState(false);
  const { settings } = useSiteSettings();

  // حالة إغلاق التسجيل — واجهة احترافية بدل رسالة عابرة
  if (settings.allowRegistration === false) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-warning/15 text-3xl">
          🔒
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold">التسجيل مغلق مؤقتاً</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            نفتح التسجيل على دفعات للحفاظ على جودة المجتمع. تواصل مع الإدارة لطلب دعوة،
            أو سجّل الدخول إن كان لديك حساب.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setSupportOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white shadow-glow transition active:scale-[0.98]"
          >
            💬 تواصل مع الإدارة
          </button>
        )}
        <Link
          href="/login"
          className="block rounded-xl border border-border py-3 text-sm font-bold text-text-primary transition hover:bg-primary/10"
        >
          تسجيل الدخول
        </Link>
        <SupportChatSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      </div>
    );
  }

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 6;

  async function handleRegister() {
    setMsg(null);
    if (!name.trim()) return setMsg("الرجاء إدخال اسمك الكامل.");
    if (!email.trim()) return setMsg("الرجاء إدخال بريدك الإلكتروني.");
    if (password.length < 6) return setMsg("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    if (password !== confirm) return setMsg("كلمتا المرور غير متطابقتين.");
    setLoading(true);
    try {
      await registerUser(name, email, password, accountType);
      router.push(`/onboarding?next=${encodeURIComponent(next)}`);
    } catch (err) {
      setMsg(err instanceof AuthError ? err.message : "خطأ غير متوقّع.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">أنشئ حسابك 🎓</h1>
        <p className="mt-1 text-sm text-text-muted">انضمّ إلى مجتمع طلبة الباك في دقيقة واحدة.</p>
      </div>

      {msg && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{msg}</div>
      )}

      {/* نوع الحساب — عنصر تحكّم مقسّم */}
      <div>
        <label className="mb-2 block text-sm font-semibold">نوع الحساب</label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setAccountType("student")}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition ${
              accountType === "student"
                ? "border-primary bg-primary/5 shadow-glow"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span className="text-2xl">🎓</span>
            <span className="text-sm font-bold">طالب</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("teacher")}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition ${
              accountType === "teacher"
                ? "border-secondary bg-secondary/5"
                : "border-border hover:border-secondary/40"
            }`}
          >
            <span className="text-2xl">👨‍🏫</span>
            <span className="text-sm font-bold">أستاذ</span>
          </button>
        </div>
        {accountType === "teacher" && (
          <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
            سيتمكّن الأساتذة من إنشاء غرف تدريس بشارة مميّزة واستقبال تقييمات الطلبة.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Input
          label="الاسم الكامل"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: أمين بلحاج"
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
        />
        <Input
          label="كلمة المرور"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6 أحرف على الأقل"
          error={passwordTooShort ? "كلمة المرور قصيرة جداً" : undefined}
        />
        <Input
          label="تأكيد كلمة المرور"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          error={passwordMismatch ? "كلمتا المرور غير متطابقتين" : undefined}
        />
      </div>

      <Button onClick={handleRegister} loading={loading} className="w-full">
        إنشاء الحساب
      </Button>

      <p className="text-center text-sm text-text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}
