"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";

export function AuthAwareCtaLink({
  guestHref,
  guestLabel,
  authHref = "/home",
  authLabel = "متابعة الدراسة",
  className,
  icon,
}: {
  guestHref: string;
  guestLabel: string;
  authHref?: string;
  authLabel?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const href = loading ? "#" : user ? authHref : guestHref;

  return (
    <Link
      href={href}
      aria-busy={loading ? true : undefined}
      onClick={(event) => { if (loading) event.preventDefault(); }}
      className={className}
    >
      {icon}
      <span>{user ? authLabel : guestLabel}</span>
    </Link>
  );
}
