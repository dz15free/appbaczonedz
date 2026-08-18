"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

/**
 * Keeps the root route visitor-only. The server may prepare Landing data, but
 * this gate never paints it until Firebase Auth has resolved the real session.
 * The global Preloader is the only loading surface; rendering a second fallback
 * here caused an unstyled "نجهّز مساحتك" layer to flash after it.
 */
export function PublicRootGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, router, user]);

  if (!loading && !user) return children;
  return null;
}
