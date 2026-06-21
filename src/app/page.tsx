"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faUserPlus, faCheckCircle, faFlag } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  const { settings: s } = useSiteSettings();
  const year = new Date().getFullYear();

  // تطبيق favicon المخصّص
  useEffect(() => {
    if (!s.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = s.faviconUrl;
  }, [s.faviconUrl]);

  return (
    <main className="relative overflow-hidden">
      {/* الشريط العلوي */}
      <header className="bz-glass sticky top-0 z-50 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logoUrl || "/icon.svg"} alt={s.siteName || "BacZoneDZ"} className="h-9 w-9 rounded-xl shadow-glow object-cover" />
          <span className="font-display text-xl font-extrabold">{s.siteName || "BacZoneDZ"}</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden text-sm font-semibold text-text-muted hover:text-primary sm:block">دخول</Link>
          <Link href="/register" className="rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
            ابدأ مجاناً
          </Link>
        </div>
      </header>

      {/* الهيرو */}
      <section className="bz-cosmic-bg relative px-5 pb-24 pt-16 text-center">
        {s.landingBadge && (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
            <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
            {s.landingBadge}
          </span>
        )}
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          {s.heroTitleLine1}
          <br /><span className="bz-gradient-text">{s.heroTitleLine2}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-text-muted md:text-lg">
          {s.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="flex items-center gap-2 rounded-md bg-gradient-primary px-7 py-3.5 font-bold text-white shadow-glow transition hover:opacity-90">
            {s.heroCtaPrimary}
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </Link>
          <Link href="/login" className="rounded-md border border-border bg-surface px-7 py-3.5 font-bold transition hover:bg-primary/10">
            {s.heroCtaSecondary}
          </Link>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-3">
          {(s.badges ?? []).map((b) => (
            <div key={b.id} className="bz-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <DynamicIcon value={b.icon} className="h-4 w-4 text-primary" emojiClass="text-base" />
              {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* الخطوات */}
      {(s.steps ?? []).length > 0 && (
        <section className="px-5 py-16 bg-surface/50">
          <h2 className="text-center font-display text-3xl font-extrabold">{s.stepsTitle}</h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-3">
            {(s.steps ?? []).map((step) => (
              <div key={step.id} className="relative rounded-xl border border-border bg-surface p-6 text-center">
                <span className="block font-display text-5xl font-extrabold text-primary/10">{step.n}</span>
                <h3 className="mt-2 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* الميزات */}
      {(s.features ?? []).length > 0 && (
        <section className="px-5 py-16">
          <h2 className="text-center font-display text-3xl font-extrabold">{s.featuresTitle}</h2>
          {s.featuresSubtitle && <p className="mt-3 text-center text-text-muted">{s.featuresSubtitle}</p>}
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(s.features ?? []).map((f) => (
              <article key={f.id} className="group rounded-xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-glass">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white">
                  <DynamicIcon value={f.icon} className="h-5 w-5" emojiClass="text-xl" />
                </span>
                <h3 className="mt-4 font-display font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CTA نهائي */}
      <section className="relative overflow-hidden px-5 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">{s.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-text-muted">{s.ctaSubtitle}</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="flex items-center gap-2 rounded-md bg-gradient-primary px-8 py-4 text-lg font-bold text-white shadow-glow transition hover:opacity-90">
              <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
            {["لا رسوم", "لا إعلانات", "لا بطاقة ائتمان"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-secondary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-text-muted">
        <p className="font-bold">{s.siteName || "BacZoneDZ"}</p>
        <p className="mt-1">© {year} — مجاني 100% للطلاب الجزائريين 🇩🇿</p>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <Link href="/login" className="hover:text-primary">تسجيل الدخول</Link>
          <Link href="/register" className="hover:text-primary">تسجيل جديد</Link>
        </div>
      </footer>
    </main>
  );
}
