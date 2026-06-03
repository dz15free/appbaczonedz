import { clsx } from "clsx";
import type { InputHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Input({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold">{label}</span>}
      <input
        className={clsx(
          "w-full rounded-md border border-border bg-background px-4 py-2.5 text-text-primary outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          className
        )}
        {...props}
      />
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
        "rounded-md px-5 py-2.5 font-bold transition disabled:opacity-60",
        variant === "primary" && "bg-gradient-primary text-white shadow-glow hover:opacity-90",
        variant === "ghost" && "border border-border bg-surface text-text-primary hover:bg-primary/10",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "..." : children}
    </button>
  );
}
