"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  reload,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
  type ActionCodeInfo,
} from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faCircleExclamation, faKey, faRotate, faShieldHalved, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { auth } from "@/lib/firebase/config";
import { DEFAULT_LOGO } from "@/lib/brand-assets";
import { removeAccountVerificationNotification } from "@/features/notifications/account-verification";

type ActionMode = "resetPassword" | "verifyEmail" | "verifyAndChangeEmail" | "recoverEmail" | "invalid";
type Screen = "loading" | "reset" | "success" | "error";

function readableAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/expired-action-code": "انتهت صلاحية هذا الرابط. اطلب رسالة جديدة ثم حاول مرة أخرى.",
    "auth/invalid-action-code": "هذا الرابط غير صالح أو تم استخدامه من قبل.",
    "auth/user-disabled": "هذا الحساب موقوف حالياً. تواصل مع إدارة BacZone.",
    "auth/weak-password": "كلمة السر ضعيفة. استخدم 6 أحرف على الأقل مع مزيج يصعب تخمينه.",
    "auth/password-does-not-meet-requirements": "كلمة السر لا تستوفي شروط الأمان المطلوبة.",
    "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "auth/too-many-requests": "حدثت محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
    "auth/requires-recent-login": "لأمان حسابك، سجّل الدخول من جديد ثم أعد العملية.",
    "auth/email-already-in-use": "هذا البريد مستخدم في حساب آخر.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
  };
  return messages[code] ?? "تعذر إكمال العملية. اطلب رابطاً جديداً وحاول مرة أخرى.";
}

function safeTarget(raw: string | null): string {
  if (!raw) return "/home";
  try {
    const origin = typeof window === "undefined" ? "https://baczone.app" : window.location.origin;
    const parsed = new URL(raw, origin);
    if (parsed.origin !== origin) return "/home";
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/home";
  } catch {
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/home";
  }
}

function modeFromQuery(value: string | null): ActionMode {
  if (value === "resetPassword" || value === "verifyEmail" || value === "verifyAndChangeEmail" || value === "recoverEmail") return value;
  return "invalid";
}

function modeTitle(mode: ActionMode): string {
  if (mode === "resetPassword") return "غيّر كلمة سرك بأمان";
  if (mode === "verifyAndChangeEmail") return "تأكيد البريد الإلكتروني الجديد";
  if (mode === "recoverEmail") return "استرجاع البريد الإلكتروني";
  return "تأكيد بريدك الإلكتروني";
}

export function ActionsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = useMemo(() => modeFromQuery(params.get("mode")), [params]);
  const code = params.get("oobCode");
  const target = useMemo(() => safeTarget(params.get("continueUrl")), [params]);
  const [screen, setScreen] = useState<Screen>("loading");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoSignedIn, setAutoSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAction() {
      setScreen("loading");
      setError("");
      setMessage("");
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setAutoSignedIn(false);

      if (mode === "invalid" || !code) {
        setError("الرابط غير مكتمل. افتح الرابط الذي وصلك عبر بريدك الإلكتروني أو اطلب رسالة جديدة.");
        setScreen("error");
        return;
      }

      try {
        if (mode === "resetPassword") {
          const accountEmail = await verifyPasswordResetCode(auth, code);
          if (cancelled) return;
          setEmail(accountEmail);
          setScreen("reset");
          return;
        }

        if (mode === "recoverEmail") {
          const info: ActionCodeInfo = await checkActionCode(auth, code);
          await applyActionCode(auth, code);
          if (cancelled) return;
          setMessage(`تم استرجاع البريد ${info.data.email || "الإلكتروني"} بنجاح.`);
          setScreen("success");
          return;
        }

        await applyActionCode(auth, code);
        if (auth.currentUser) await reload(auth.currentUser);
        if ((mode === "verifyEmail" || mode === "verifyAndChangeEmail") && auth.currentUser?.emailVerified) {
          await removeAccountVerificationNotification(auth.currentUser.uid).catch(() => {});
        }
        if (cancelled) return;
        setMessage(mode === "verifyAndChangeEmail" ? "تم تأكيد بريدك الإلكتروني الجديد وتحديث الحساب." : "تم تأكيد بريدك الإلكتروني بنجاح.");
        setScreen("success");
      } catch (caught) {
        if (cancelled) return;
        setError(readableAuthError(caught));
        setScreen("error");
      }
    }

    void verifyAction();
    return () => { cancelled = true; };
  }, [code, mode]);

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code || !email) return;
    if (newPassword.length < 6) {
      setError("كلمة السر يجب أن تحتوي على 6 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا السر غير متطابقتين.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(auth, code, newPassword);
      try {
        await signInWithEmailAndPassword(auth, email, newPassword);
        setAutoSignedIn(true);
      } catch {
        setAutoSignedIn(false);
      }
      setMessage("تم تغيير كلمة السر بنجاح.");
      setScreen("success");
    } catch (caught) {
      setError(readableAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  function continueToApp() {
    router.push(target);
  }

  const title = screen === "reset" ? modeTitle(mode) : screen === "success" ? "تمت العملية بنجاح" : screen === "error" ? "نحتاج إلى رابط صالح" : "نراجع الرابط بأمان";

  return (
    <main className="bz-actions-page" dir="rtl">
      <div className="bz-actions-orbit bz-actions-orbit-a" aria-hidden="true" />
      <div className="bz-actions-orbit bz-actions-orbit-b" aria-hidden="true" />
      <section className="bz-actions-shell" aria-live="polite">
        <div className="bz-actions-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_LOGO} alt="BacZone" width={58} height={58} />
          <div><strong>BacZone</strong><span>مساحتك الدراسية في مكان واحد</span></div>
        </div>

        <div className={`bz-actions-card ${screen === "error" ? "is-error" : ""}`}>
          <div className={`bz-actions-icon ${screen === "error" ? "is-error" : screen === "success" ? "is-success" : ""}`}>
            <FontAwesomeIcon icon={screen === "reset" ? faKey : screen === "error" ? faCircleExclamation : screen === "success" ? faCheck : faShieldHalved} />
          </div>
          <h1>{title}</h1>

          {screen === "loading" && (
            <div className="bz-actions-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>نتحقق من صلاحية الرابط ونجهز الخطوة التالية…</p>
            </div>
          )}

          {screen === "reset" && (
            <form className="bz-actions-form" onSubmit={submitPassword}>
              <p className="bz-actions-intro">الرابط مرتبط بالحساب:</p>
              <div className="bz-actions-email">{email}</div>
              <label htmlFor="new-password">كلمة السر الجديدة</label>
              <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 أحرف على الأقل" required minLength={6} disabled={busy} />
              <label htmlFor="confirm-password">تأكيد كلمة السر</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة السر" required minLength={6} disabled={busy} />
              {error && <p className="bz-actions-error">{error}</p>}
              <button type="submit" className="bz-actions-primary" disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ كلمة السر الجديدة"}<FontAwesomeIcon icon={faArrowLeft} /></button>
            </form>
          )}

          {screen === "success" && (
            <div className="bz-actions-result">
              <p>{message}</p>
              {autoSignedIn && <span className="bz-actions-success-note">تم تسجيل دخولك تلقائياً.</span>}
              <button type="button" className="bz-actions-primary" onClick={continueToApp}>{autoSignedIn ? "المتابعة إلى BacZone" : "العودة إلى المنصة"}<FontAwesomeIcon icon={faArrowLeft} /></button>
            </div>
          )}

          {screen === "error" && (
            <div className="bz-actions-result">
              <p className="bz-actions-error">{error}</p>
              <button type="button" className="bz-actions-secondary" onClick={() => router.push("/login")}><FontAwesomeIcon icon={faRotate} /> العودة إلى تسجيل الدخول</button>
            </div>
          )}
        </div>

        <p className="bz-actions-footnote">إذا لم تطلب هذه العملية، تجاهل الرسالة ولا تشارك رابطها مع أي شخص.</p>
      </section>
    </main>
  );
}
