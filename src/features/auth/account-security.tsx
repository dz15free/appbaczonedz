"use client";

import { useEffect, useState } from "react";
import { reload } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faEnvelope, faKey, faRotate, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import {
  AuthError,
  changePassword,
  sendEmailChangeVerification,
  sendVerificationEmail,
} from "@/lib/firebase/auth";
import {
  ensureAccountVerificationNotification,
  removeAccountVerificationNotification,
} from "@/features/notifications/account-verification";

export function AccountSecurity() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(Boolean(user?.emailVerified));
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<"verify" | "email" | "password" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void reload(user)
      .then(() => {
        if (!active) return;
        const isVerified = Boolean(user.emailVerified);
        setVerified(isVerified);
        if (isVerified) {
          void removeAccountVerificationNotification(user.uid).catch(() => {});
        } else {
          void ensureAccountVerificationNotification(user.uid).catch(() => {});
        }
      })
      .catch(() => {
        if (active) setVerified(Boolean(user.emailVerified));
      });
    return () => { active = false; };
  }, [user]);

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  async function verifyEmail() {
    if (!user) return;
    setBusy("verify");
    resetFeedback();
    try {
      await sendVerificationEmail(user);
      setMessage("أرسلنا رابط تأكيد جديداً إلى بريدك الإلكتروني. افتح الرابط لإكمال حماية الحساب.");
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "تعذّر إرسال رسالة التأكيد.");
    } finally {
      setBusy(null);
    }
  }

  async function changeEmail() {
    if (!user) return;
    const value = newEmail.trim().toLowerCase();
    if (!value) {
      setError("أدخل البريد الإلكتروني الجديد أولاً.");
      return;
    }
    if (value === user.email?.toLowerCase()) {
      setError("استخدم بريداً مختلفاً عن بريد الحساب الحالي.");
      return;
    }
    setBusy("email");
    resetFeedback();
    try {
      await sendEmailChangeVerification(user, value);
      setNewEmail("");
      setMessage("أرسلنا رابط التأكيد إلى البريد الجديد. يبقى بريدك الحالي فعالاً حتى تفتح الرابط.");
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "تعذّر بدء تغيير البريد.");
    } finally {
      setBusy(null);
    }
  }

  async function changeCurrentPassword() {
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("أكمل حقول كلمة السر الثلاثة.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا السر الجديدتان غير متطابقتين.");
      return;
    }
    setBusy("password");
    resetFeedback();
    try {
      await changePassword(user, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("تم تغيير كلمة السر بنجاح. استخدمها في تسجيل دخولك القادم.");
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "تعذّر تغيير كلمة السر.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  return (
    <section id="account-security" className="mt-4 scroll-mt-24 rounded-2xl border border-border bg-surface p-4 text-right shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${verified ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
          <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-extrabold">أمان الحساب</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${verified ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
              {verified ? "الحساب مؤكد" : "يحتاج إلى تأكيد"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            أدر بريدك الإلكتروني وكلمة السر من مكان واحد، مع بقاء حسابك متاحاً أثناء إكمال التأكيد.
          </p>
        </div>
      </div>

      {!verified && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <FontAwesomeIcon icon={faEnvelope} className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-semibold leading-relaxed text-amber-800">أكّد بريدك الإلكتروني لحماية الحساب واستعادة الوصول إليه بسهولة.</p>
          </div>
          <button type="button" onClick={verifyEmail} disabled={busy !== null} className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50">
            {busy === "verify" ? "جارٍ الإرسال…" : "إرسال رسالة التأكيد"}
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold">تغيير البريد الإلكتروني</h3>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">لن يتغير البريد الحالي حتى تؤكد العنوان الجديد من الرسالة التي ستصلك.</p>
          <label className="mt-3 block text-[11px] font-bold text-text-muted" htmlFor="security-new-email">البريد الجديد</label>
          <input id="security-new-email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" autoComplete="email" inputMode="email" dir="ltr" placeholder="name@example.com" className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary" disabled={busy !== null} />
          <button type="button" onClick={changeEmail} disabled={busy !== null || !newEmail.trim()} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-white disabled:opacity-50">
            {busy === "email" ? "جارٍ الإرسال…" : "إرسال رابط التغيير"}
            <FontAwesomeIcon icon={faRotate} className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background p-3.5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold">تغيير كلمة السر</h3>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">لأمانك، نتحقق من كلمة السر الحالية قبل حفظ الجديدة.</p>
          <div className="mt-3 space-y-2">
            <input aria-label="كلمة السر الحالية" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="كلمة السر الحالية" className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary" disabled={busy !== null} />
            <input aria-label="كلمة السر الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="كلمة السر الجديدة — 6 أحرف على الأقل" className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary" disabled={busy !== null} />
            <input aria-label="تأكيد كلمة السر الجديدة" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="تأكيد كلمة السر الجديدة" className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary" disabled={busy !== null} />
          </div>
          <button type="button" onClick={changeCurrentPassword} disabled={busy !== null || !currentPassword || !newPassword || !confirmPassword} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 py-2.5 text-xs font-bold text-primary disabled:opacity-50">
            {busy === "password" ? "جارٍ الحفظ…" : "حفظ كلمة السر الجديدة"}
            <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs font-semibold leading-relaxed ${error ? "bg-danger/10 text-danger" : "bg-emerald-500/10 text-emerald-700"}`} role="status">
          {error || message}
        </div>
      )}
    </section>
  );
}
