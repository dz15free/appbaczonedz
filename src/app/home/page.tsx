"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faGlobe, faChalkboardUser } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";

const QUICK = [
  { href: "/rooms", label: "غرف الدراسة", desc: "ادرس وراجع جماعياً", icon: faUsers },
  { href: "/community", label: "المجتمع", desc: "اسأل وشارك", icon: faGlobe },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold">
          مرحباً، <span className="bz-gradient-text">{profile?.name || user.displayName || "طالب"}</span> 👋
        </h1>
        <p className="mt-1 text-text-muted">ماذا تريد أن تفعل اليوم؟</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-glass"
            >
              <span className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
              </span>
              <div>
                <span className="block font-bold">{q.label}</span>
                <span className="text-sm text-text-muted">{q.desc}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-border p-5 text-text-muted">
          <FontAwesomeIcon icon={faChalkboardUser} className="h-5 w-5" />
          <span className="text-sm">الإنجازات والتحديات والمساعد الذكي Omibot قادمة قريباً.</span>
        </div>
      </section>
    </AppShell>
  );
}
