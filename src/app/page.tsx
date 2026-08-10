"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUserPlus,
  faCheckCircle,
  faFlag,
  faChevronDown,
  faShieldHalved,
  faBolt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const { settings: s, loaded } = useSiteSettings();
  const year = new Date().getFullYear();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!s.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = s.faviconUrl;
  }, [s.faviconUrl]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)] text-[var(--bz-text)] antialiased selection:bg-blue-500/30">
      {/* ═══════════════ HEADER ═══════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-white/10 bg-[#0a0c14]/80 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.25rem] sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt={s.siteName || "BacZoneDZ"}
              className="h-9 w-9 shrink-0 rounded-xl object-contain ring-1 ring-white/10 transition group-hover:ring-white/25 sm:h-10 sm:w-10"
            />
            <span className="truncate font-display text-[15px] font-bold tracking-tight text-white sm:text-lg">
              {s.siteName || "BacZoneDZ"}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-white/95 active:scale-[0.97] sm:px-5 sm:text-sm"
            >
              {loaded ? s.heroCtaPrimary || "أنشئ حسابك" : "…"}
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#07080f]">
        {/* Atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-blue-600/25 blur-[140px]" />
          <div className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          {/* Soft radial vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#07080f_75%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center px-5 pb-28 pt-28 text-center sm:px-6 sm:pb-32 sm:pt-32">
          {s.landingBadge && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12px] font-semibold text-blue-200/90 backdrop-blur-md sm:mb-7 sm:text-[13px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20">
                <FontAwesomeIcon icon={faFlag} className="h-2.5 w-2.5 text-blue-300" />
              </span>
              {s.landingBadge}
            </div>
          )}

          <h1 className="max-w-3xl font-display text-[2rem] font-extrabold leading-[1.35] tracking-tight text-white xs:text-[2.25rem] sm:text-5xl sm:leading-[1.25] md:text-[3.35rem] md:leading-[1.2]">
            <span className="block">{s.heroTitleLine1}</span>
            <span className="mt-2 block bg-gradient-to-l from-blue-400 via-sky-300 to-emerald-300 bg-clip-text pb-3 pt-1 text-transparent sm:mt-3">
              {s.heroTitleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 sm:mt-6 sm:text-lg">
            {s.heroSubtitle}
          </p>

          <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:mt-11 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/register"
              className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 px-7 py-4 text-[15px] font-bold text-white shadow-[0_16px_40px_-12px_rgba(37,99,235,0.7)] transition hover:brightness-110 active:scale-[0.98] sm:px-9 sm:py-[1.15rem]"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10 opacity-0 transition group-hover:opacity-100" />
              {loaded ? s.heroCtaPrimary : "…"}
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="h-3.5 w-3.5 transition group-hover:-translate-x-1"
              />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-7 py-4 text-[15px] font-bold text-white backdrop-blur-sm transition hover:bg-white/[0.08] active:scale-[0.98] sm:px-9 sm:py-[1.15rem]"
            >
              {s.heroCtaSecondary}
            </Link>
          </div>

          {(s.badges ?? []).length > 0 && (
            <div className="mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-2.5 sm:mt-14 sm:gap-3">
              {(s.badges ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm sm:text-[13px]"
                >
                  <DynamicIcon
                    value={b.icon}
                    className="h-3.5 w-3.5 text-blue-300"
                    emojiClass="text-sm"
                  />
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom curve */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-[var(--bz-bg)] [clip-path:ellipse(70%_100%_at_50%_100%)] sm:h-20" />
      </section>

      {/* ═══════════════ STEPS ═══════════════ */}
      {(s.steps ?? []).length > 0 && (
        <section className="relative z-10 -mt-6 px-5 pb-20 sm:-mt-8 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center sm:mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                كيف تبدأ
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                {s.stepsTitle}
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
              {(s.steps ?? []).map((step, i) => (
                <div
                  key={step.id}
                  className="group relative overflow-hidden rounded-3xl border border-border/60 bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 sm:p-7"
                >
                  <div className="absolute -right-4 -top-4 select-none text-[5.5rem] font-black leading-none text-primary/[0.04] transition group-hover:text-primary/[0.07]">
                    {step.n}
                  </div>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-base font-extrabold text-white shadow-lg shadow-blue-500/25">
                    {step.n}
                  </div>
                  <h3 className="relative mt-5 font-display text-lg font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="relative mt-2 text-[13.5px] leading-relaxed text-text-muted sm:text-sm">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ AUDIENCE ═══════════════ */}
      {(s.audience ?? []).length > 0 && (
        <section className="px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center sm:mb-16">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                الأدوار
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                {s.audienceTitle}
              </h2>
              {s.audienceSubtitle && (
                <p className="mx-auto mt-3 max-w-lg text-[15px] text-text-muted sm:text-base">
                  {s.audienceSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {(s.audience ?? []).map((a, idx) => (
                <article
                  key={a.id}
                  className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-0.5 sm:p-8 ${
                    idx === 0
                      ? "border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-transparent to-transparent"
                      : "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent"
                  }`}
                >
                  <div className="flex gap-5">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:h-16 sm:w-16 ${
                        idx === 0
                          ? "bg-gradient-to-br from-blue-600 to-blue-500 shadow-blue-500/30"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                      }`}
                    >
                      <DynamicIcon
                        value={a.icon}
                        className="h-6 w-6 sm:h-7 sm:w-7"
                        emojiClass="text-2xl sm:text-3xl"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-extrabold tracking-tight">
                        {a.title}
                      </h3>
                      <p className="mt-2.5 text-[14px] leading-[1.85] text-text-muted sm:text-[15px]">
                        {a.desc}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ FEATURES ═══════════════ */}
      {(s.features ?? []).length > 0 && (
        <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center sm:mb-16">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                المزايا
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                {s.featuresTitle}
              </h2>
              {s.featuresSubtitle && (
                <p className="mx-auto mt-3 max-w-lg text-[15px] text-text-muted">
                  {s.featuresSubtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              {(s.features ?? []).map((f) => (
                <article
                  key={f.id}
                  className="group rounded-2xl border border-border/50 bg-[var(--bz-bg)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:rounded-3xl sm:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/25">
                    <DynamicIcon
                      value={f.icon}
                      className="h-5 w-5"
                      emojiClass="text-xl"
                    />
                  </div>
                  <h3 className="mt-4 font-display text-[15px] font-bold tracking-tight sm:text-base">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted sm:text-[13.5px]">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ TRANSPARENCY ═══════════════ */}
      {(s.pricingNote || (s.pricingRows ?? []).length > 0) && (
        <section className="px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                الشفافية
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                {s.pricingTitle}
              </h2>
              {s.pricingNote && (
                <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-loose text-text-muted sm:text-[15px]">
                  {s.pricingNote}
                </p>
              )}
            </div>

            {(s.pricingRows ?? []).length > 0 && (
              <div className="mt-10 space-y-3 sm:mt-12">
                {(s.pricingRows ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-4 transition hover:border-primary/20 sm:p-5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="h-3.5 w-3.5 text-emerald-500"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold sm:text-[15px]">{r.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-text-muted sm:text-[13.5px]">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ FAQ ═══════════════ */}
      {(s.faq ?? []).length > 0 && (
        <section className="bg-surface/60 px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
              {s.faqTitle}
            </h2>
            <div className="mt-10 space-y-3 sm:mt-12">
              {(s.faq ?? []).map((f) => (
                <FaqRow key={f.id} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative overflow-hidden px-5 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[#07080f]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-72 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-xl text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.logoUrl || "/icon.svg"}
            alt=""
            className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain shadow-[0_0_48px_-8px_rgba(59,130,246,0.6)] sm:mb-7 sm:h-[4.5rem] sm:w-[4.5rem]"
          />
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            {s.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-white/50 sm:text-base">
            {s.ctaSubtitle}
          </p>

          <div className="mt-9">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-[15px] font-bold text-slate-900 shadow-2xl transition hover:bg-white/95 active:scale-[0.98] sm:px-10 sm:py-[1.15rem] sm:text-base"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              {s.ctaButton}
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13px] text-white/40">
            {["لا رسوم", "لا إعلانات", "لا بطاقة ائتمان"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="h-3.5 w-3.5 text-emerald-400"
                />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-border/60 bg-surface px-5 py-10 sm:py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt=""
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-display text-base font-bold">
              {s.siteName || "BacZoneDZ"}
            </span>
          </div>
          <p className="text-[13px] text-text-muted">
            {s.footerText || `© ${year} BacZoneDZ`}
          </p>
          <div className="flex gap-6 text-[12px] text-text-muted">
            <Link href="/login" className="transition hover:text-primary">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="transition hover:text-primary">
              تسجيل جديد
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        open
          ? "border-primary/25 bg-[var(--bz-bg)] shadow-sm"
          : "border-border/60 bg-[var(--bz-bg)]"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-4 text-right transition hover:bg-primary/[0.03] sm:px-5 sm:py-[1.15rem]"
      >
        <span className="flex-1 text-[14px] font-bold leading-snug sm:text-[15px]">
          {q}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-5 text-[13.5px] leading-loose text-text-muted sm:px-5 sm:text-[14px]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}