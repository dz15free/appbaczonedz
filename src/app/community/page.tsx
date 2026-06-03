"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { AppShell } from "@/components/app-shell";

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="grid place-items-center px-5 py-20 text-center">
        <div>
          <FontAwesomeIcon icon={faGlobe} className="h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-xl font-extrabold">المجتمع الدراسي</h1>
          <p className="mt-2 max-w-sm text-sm text-text-muted">
            المنشورات والأسئلة والمجموعات قيد البناء في مرحلة قادمة.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
