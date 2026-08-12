"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";

export function AuthAwareLink({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const { user, loading } = useAuth();
  const href = !loading && user ? "/home" : "/";

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={loading ? true : undefined}
      onClick={(event) => {
        if (loading) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
