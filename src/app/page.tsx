"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUserPlus,
  faCheckCircle,
  faFlag,
  faChevronDown,
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
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)]">
      {/* ═══════════════ الهيدر ═══════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border/70 bg-[var(--bz-surface)]/90 shadow-sm backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          {/* الشعار */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt={s.siteName || "BacZoneDZ"}
              className="h-9 w-9 shrink-0 rounded-xl object-contain sm:h-10 sm:w-10"
            />
            <span
              className={`truncate font-display text-base font-extrabold tracking-tight transition-colors sm:text-lg ${
                scrolled ? "text-[var(--bz-text)]" : "text-white"
              }`}
            >
              {s.siteName || "BacZoneDZ"}
            </span>
          </Link>

          {/* الأزرار */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div
              className={`rounded-xl p-0.5 transition ${
                scrolled ? "" : "bg-white/10 backdrop-blur-sm"
              }`}
            >
              <ThemeToggle />
            </div>

            <Link
              href="/login"
              className={`hidden text-sm font-semibold transition sm:inline-block ${
                scrolled
                  ? "text-text-muted hover:text-primary"
                  : "text-white/75 hover:text-white"
              }`}
            >
              دخول
            </Link>

            <Link
              href="/register"
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition active:scale-[0.97] sm:px-5 sm:py-2.5 ${
                scrolled
                  ? "bg-gradient-primary text-white shadow-glow"
                  : "bg-white text-slate-900 shadow-lg hover:bg-white/90"
              }`}
            >
              {loaded ? s.heroCtaPrimary || "أنشئ حسابك" : "…"}
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════ الهيرو ═══════════════ */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#07080f] text-white">
        {/* خلفية */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-16 h-[380px] w-[380px] rounded-full bg-blue-600/35 blur-[120px] sm:h-[480px] sm:w-[480px]" />
          <div className="absolute -right-16 bottom-20 h-[300px] w-[300px] rounded-full bg-emerald-500/20 blur-[100px] sm:h-[400px] sm:w-[400px]" />
          <div className="absolute left-1/2 top-[40%] h-48 w-48 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-28 sm:pt-28">
          {s.landingBadge && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-blue-300 backdrop-blur-sm sm:mb-6 sm:text-[13px]">
              <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
              {s.landingBadge}
            </span>
          )}

          <h1 className="max-w-3xl font-display text-[1.85rem] font-extrabold leading-[1.2] tracking-tight xs:text-[2.1rem] sm:text-4xl md:text-[3.15rem]">
            {s.heroTitleLine1}
            <br />
            <span className="bg-gradient-to-l from-blue-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              {s.heroTitleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-white/55 sm:mt-5 sm:text-base md:text-lg">
            {s.heroSubtitle}
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_36px_-10px_rgba(37,99,235,0.65)] transition hover:brightness-110 active:scale-[0.98] sm:px-8 sm:py-4"
            >
              {loaded ? s.heroCtaPrimary : "…"}
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="h-3.5 w-3.5 transition group-hover:-translate-x-1"
              />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-[15px] font-bold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-[0.98] sm:px-8 sm:py-4"
            >
              {s.heroCtaSecondary}
            </Link>
          </div>

          {(s.badges ?? []).length > 0 && (
            <div className="mt-10 flex max-w-lg flex-wrap items-center justify-center gap-2 sm:mt-12 sm:max-w-2xl sm:gap-2.5">
              {(s.badges ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/75 backdrop-blur-sm sm:gap-2 sm:text-[13px]"
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

        {/* منحنى سفلي */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-[var(--bz-bg)] [clip-path:ellipse(65%_100%_at_50%_100%)] sm:h-16" />
      </section>

      {/* ═══════════════ الخطوات ═══════════════ */}
      {(s.steps ?? []).length > 0 && (
        <section className="relative z-10 -mt-4 px-4 pb-16 sm:-mt-6 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center sm:mb-10">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                كيف تبدأ
              </span>
              <h2 className="mt-1.5 font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
                {s.stepsTitle}
              </h2>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3 sm:gap-4">
              {(s.steps ?? []).map((step) => (
                <div
                  key={step.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-6"
                >
                  <div className="absolute -right-3 -top-3 select-none text-[4.5rem] font-extrabold leading-none text-primary/[0.06] sm:text-[5rem]">
                    {step.n}
                  </div>
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-sm font-extrabold text-white shadow-glow sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base">
                    {step.n}
                  </span>
                  <h3 className="relative mt-3.5 font-display text-base font-bold sm:mt-4 sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="relative mt-1.5 text-[13px] leading-relaxed text-text-muted sm:mt-2 sm:text-sm">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الأدوار ═══════════════ */}
      {(s.audience ?? []).length > 0 && (
        <section className="px-4 py-14 sm:px-6 sm:py-18">
          <div className="mx-auto max-w-5xl">
            <div className="mb-9 text-center sm:mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                الأدوار
              </span>
              <h2 className="mt-1.5 font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
                {s.audienceTitle}
              </h2>
              {s.audienceSubtitle && (
                <p className="mx-auto mt-2.5 max-w-md text-sm text-text-muted sm:text-base">
                  {s.audienceSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(s.audience ?? []).map((a, idx) => (
                <article
                  key={a.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 sm:rounded-3xl sm:p-7 ${
                    idx === 0
                      ? "border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent"
                      : "border-secondary/20 bg-gradient-to-br from-secondary/[0.07] to-transparent"
                  }`}
                >
                  <div className="flex gap-4">
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl ${
                        idx === 0
                          ? "bg-gradient-primary"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600"
                      }`}
                    >
                      <DynamicIcon
                        value={a.icon}
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        emojiClass="text-xl sm:text-2xl"
                      />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-extrabold sm:text-xl">
                        {a.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-[1.8] text-text-muted sm:text-sm sm:leading-[1.85]">
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

      {/* ═══════════════ الميزات ═══════════════ */}
      {(s.features ?? []).length > 0 && (
        <section className="bg-surface px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-9 text-center sm:mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                المزايا
              </span>
              <h2 className="mt-1.5 font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
                {s.featuresTitle}
              </h2>
              {s.featuresSubtitle && (
                <p className="mx-auto mt-2.5 max-w-md text-sm text-text-muted">
                  {s.featuresSubtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3.5 xs:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {(s.features ?? []).map((f) => (
                <article
                  key={f.id}
                  className="group rounded-2xl border border-border bg-[var(--bz-bg)] p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-5"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105 group-hover:bg-gradient-primary group-hover:text-white group-hover:shadow-glow sm:h-11 sm:w-11">
                    <DynamicIcon
                      value={f.icon}
                      className="h-4.5 w-4.5 sm:h-5 sm:w-5"
                      emojiClass="text-lg sm:text-xl"
                    />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-bold sm:mt-3.5 sm:text-base">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted sm:text-[13px]">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الشفافية ═══════════════ */}
      {(s.pricingNote || (s.pricingRows ?? []).length > 0) && (
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                الشفافية
              </span>
              <h2 className="mt-1.5 font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
                {s.pricingTitle}
              </h2>
              {s.pricingNote && (
                <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-loose text-text-muted sm:mt-4 sm:text-sm">
                  {s.pricingNote}
                </p>
              )}
            </div>

            {(s.pricingRows ?? []).length > 0 && (
              <div className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
                {(s.pricingRows ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:gap-3.5 sm:p-4"
                  >
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary/15">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="h-3.5 w-3.5 text-secondary"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold sm:text-sm">{r.title}</h3>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted sm:text-sm">
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

      {/* ═══════════════ الأسئلة ═══════════════ */}
      {(s.faq ?? []).length > 0 && (
        <section className="bg-surface px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
              {s.faqTitle}
            </h2>
            <div className="mt-8 space-y-2 sm:mt-10 sm:space-y-2.5">
              {(s.faq ?? []).map((f) => (
                <FaqRow key={f.id} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[#07080f]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-56 w-[420px] -translate-x-1/2 rounded-full bg-blue-600/25 blur-[90px]" />
        </div>

        <div className="relative mx-auto max-w-xl text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.logoUrl || "/icon.svg"}
            alt=""
            className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain shadow-[0_0_36px_-6px_rgba(59,130,246,0.55)] sm:mb-6 sm:h-16 sm:w-16"
          />
          <h2 className="font-display text-xl font-extrabold sm:text-2xl md:text-3xl">
            {s.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50 sm:text-base">
            {s.ctaSubtitle}
          </p>
          <div className="mt-7 sm:mt-9">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-[15px] font-bold text-slate-900 shadow-xl transition hover:bg-white/90 active:scale-[0.98] sm:px-9 sm:py-4 sm:text-base"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/40 sm:mt-7 sm:text-sm">
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

      {/* ═══════════════ التذييل ═══════════════ */}
      <footer className="border-t border-border bg-surface px-4 py-8 text-center sm:py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2.5">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt=""
              className="h-7 w-7 rounded-lg object-contain sm:h-8 sm:w-8"
            />
            <span className="font-display text-sm font-bold sm:text-base">
              {s.siteName || "BacZoneDZ"}
            </span>
          </div>
          <p className="text-xs text-text-muted sm:text-sm">
            {s.footerText || `© ${year} BacZoneDZ`}
          </p>
          <div className="flex gap-4 text-[11px] text-text-muted sm:gap-5 sm:text-xs">
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
    <div className="overflow-hidden rounded-2xl border border-border bg-[var(--bz-bg)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-right transition hover:bg-primary/5 sm:px-4 sm:py-3.5"
      >
        <span className="flex-1 text-[13px] font-bold sm:text-sm">{q}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`h-3 w-3 shrink-0 text-text-muted transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div className={open ? "px-3.5 pb-3.5 sm:px-4 sm:pb-4" : "hidden"}>
        <p className="text-[13px] leading-loose text-text-muted sm:text-sm">
          {a}
        </p>
      </div>
    </div>
  );
}