"use client";

import { clsx } from "clsx";
import { useState } from "react";
import type { InputHTMLAttributes, ButtonHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

/* حقل إدخال — متوافق مع الاستعمال القديم (label/className فقط)،
   ويضيف اختيارياً: رسالة خطأ أسفل الحقل، وأيقونة قبل النص،
   وزر إظهار/إخفاء كلمة المرور يظهر تلقائياً حين type="password". */
export function Input({
  label,
  error,
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (show ? "text" : "password") : type;

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-text-primary">{label}</span>}
      <div className="relative">
        <input
          type={effectiveType}
          className={clsx(
            "w-full rounded-xl border bg-background px-4 text-text-primary outline-none transition",
            "h-12 text-[15px]", // ارتفاع مريح للمس على الهاتف
            isPassword && "pl-11", // مساحة لزر العين (الواجهة RTL: العين يسار)
            error
              ? "border-danger/60 focus:border-danger focus:ring-2 focus:ring-danger/20"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 grid w-11 place-items-center text-text-muted transition hover:text-primary"
          >
            <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
  loading,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  loading?: boolean;
}) {
  return (
    <button
      className={clsx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100",
        variant === "primary" && "bg-gradient-primary text-white shadow-glow hover:opacity-90",
        variant === "ghost" && "border border-border bg-surface text-text-primary hover:bg-primary/10",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        children
      )}
    </button>
  );
}
