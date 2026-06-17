"use client";

import { useState } from "react";
import Link from "next/link";
import { registerUser, AuthError } from "@/lib/firebase/auth";
import { Input, Button } from "@/components/ui/field";
import { useSiteSettings } from "@/features/settings/use-site-settings";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { settings } = useSiteSettings();

  if (settings.allowRegistration === false) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 text-center">
        <p className="text-2xl mb-2">🔒</p>
        <h2 className="font-bold text-lg mb-1">التسجيل مغلق حالياً</h2>
        <p className="text-sm text-text-muted">التسجيل في المنصة موقوف مؤقتاً. تواصل مع الإدارة.</p>
        <Link href="/login" className="mt-4 block text-sm text-primary hover:underline">تسجيل الدخول</Link>
      </div>
    );
  }

  async function handleRegister() {
    setMsg(null);
    if (password !== confirm) return setMsg({ type: "error", text: "كلمتا المرور غير متطابقتين." });
    setLoading(true);
    try {
      await registerUser(name, email, password);
      setDone(true);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof AuthError ? err.message : "خطأ غير متوقّع." });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-extrabold">تحقّق من بريدك ✉️</h1>
        <p className="text-text-muted">
          أرسلنا رابط تفعيل إلى <span className="font-bold text-text-primary">{email}</span>.
          فعّل حسابك ثم عُد لتسجيل الدخول.
        </p>
        <Link href="/login">
          <Button className="w-full">العودة لتسجيل الدخول</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold">إنشاء حساب</h1>

      {msg && <div className="rounded-md bg-danger/10 px-4 py-2.5 text-sm text-danger">{msg.text}</div>}

      <Input label="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} />
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
        placeholder="6 أحرف على الأقل"
      />
      <Input
        label="تأكيد كلمة المرور"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
      />

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
