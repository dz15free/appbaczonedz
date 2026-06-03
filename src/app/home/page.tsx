"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { logoutUser } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user)
    return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <main className="min-h-screen">
      <header className="bz-glass sticky top-0 z-50 flex items-center justify-between px-5 py-3">
        <span className="font-display text-xl font-extrabold">
          BacZone <span className="bz-gradient-text">DZ</span>
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => logoutUser().then(() => router.push("/"))}>
            خروج
          </Button>
        </div>
      </header>

      <section className="px-5 py-10 text-center">
        <h1 className="font-display text-3xl font-extrabold">
          مرحباً، <span className="bz-gradient-text">{user.displayName || "طالب"}</span> 👋
        </h1>
        <p className="mt-3 text-text-muted">
          أهلاً بك في منصتك. غرف الدراسة والمجتمع قيد البناء في المراحل القادمة.
        </p>
      </section>
    </main>
  );
}
