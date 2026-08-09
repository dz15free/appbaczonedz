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
            "w-full rounded-control border bg-surface px-4 text-text-primary outline-none transition",
            // ١٦px إلزامي: أي حجم أصغر يجعل Safari على iPhone **يُكبّر الصفحة**
            // عند لمس الحقل، فتخرج الواجهة عن مكانها في التسجيل والدخول.
            "h-12 text-[16px]",
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

/* الزرّ — كان بدرجتَي توكيد فقط (`primary` بتدرّج ووهج، و`ghost`).
   فكان كل إجراء في الصفحة يصرخ بنفس الصوت: لا فرق بصريّ بين
   «اشترِ الدورة» و«شارك الرابط». الآن خمس درجات وثلاثة أحجام،
   والاستعمال القديم يعمل حرفياً كما هو. */
const BTN_SIZES = {
  sm: "h-9 gap-1.5 rounded-item px-3.5 text-[12.5px]",
  md: "h-11 gap-2 rounded-control px-4 text-[13.5px]",
  lg: "h-12 gap-2 rounded-control px-5 text-[15px]",
} as const;

export function Button({
  children,
  variant = "primary",
  size = "lg",
  loading,
  block,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "quiet" | "danger";
  size?: keyof typeof BTN_SIZES;
  loading?: boolean;
  /** يملأ عرض الحاوية — الشكل الصحيح لأزرار الهاتف */
  block?: boolean;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-extrabold transition duration-fast ease-bz",
        "active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100",
        BTN_SIZES[size],
        block && "w-full",
        // التوكيد الأعلى: تدرّج الهويّة بظلّ مصبوغ بلونه، لا وهج عامّ
        variant === "primary" && "bg-gradient-primary text-white shadow-brand hover:brightness-105",
        variant === "ghost" && "border border-border bg-surface text-text-primary hover:border-primary/40 hover:text-primary",
        variant === "soft" && "bg-primary/10 text-primary hover:bg-primary/15",
        variant === "quiet" && "text-text-muted hover:bg-primary/[0.08] hover:text-primary",
        variant === "danger" && "bg-danger/10 text-danger hover:bg-danger/15",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span
          className={clsx(
            "inline-block h-4 w-4 animate-spin rounded-full border-2",
            variant === "primary" ? "border-white/40 border-t-white" : "border-primary/30 border-t-primary",
          )}
        />
      ) : (
        children
      )}
    </button>
  );
}
