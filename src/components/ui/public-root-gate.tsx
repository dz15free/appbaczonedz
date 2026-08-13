"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

/**
 * Keeps the root route visitor-only. The server may prepare Landing data, but
 * this gate never paints it until Firebase Auth has resolved the real session.
 */
export function PublicRootGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, router, user]);

  if (!loading && !user) return children;

  return (
    <div className="bz-auth-gate" role="status" aria-live="polite" aria-label="جارٍ فتح BacZone">
      <div className="bz-auth-gate-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_LOGO} alt="BacZone" width={56} height={56} className="bz-auth-gate-logo" />
        <span className="bz-auth-gate-line" aria-hidden="true"><i /></span>
        <p>نجهّز مساحتك</p>
      </div>
    </div>
  );
}
