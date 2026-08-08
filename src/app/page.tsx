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

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--bz-bg)]">
      {/* ── الهيدر ── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-1.5 backdrop-blur-xl dark:bg-white/5">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.logoUrl || "/icon.svg"}
                alt={s.siteName || "BacZoneDZ"}
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="font-display text-base font-extrabold text-white sm:text-lg">
                {s.siteName || "BacZoneDZ"}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-1 backdrop-blur-xl dark:bg-white/5">
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white sm:block"
            >
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-white/90 active:scale-[0.98] sm:px-5"
            >
              {loaded ? s.heroCtaPrimary || "أنشئ حسابك" : "…"}
            </Link>
          </div>
        </div>
      </header>

      {/* ── الهيرو (قسم داكن قوي) ── */}
      <section className="relative min-h-[92vh] overflow-hidden bg-[#07080f] text-white">
        {/* تدرجات خلفية */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-blue-600/30 blur-[140px]" />
          <div className="absolute -right-20 bottom-10 h-[400px] w-[400px] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-[90px]" />
          {/* شبكة خفيفة */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[92vh] max-w-5xl flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6 sm:pt-32">
          {s.landingBadge && (
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-bold text-blue-300 backdrop-blur-sm">
              <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
              {s.landingBadge}
            </span>
          )}

          <h1 className="max-w-3xl font-display text-[2.4rem] font-extrabold leading-[1.15] tracking-tight sm:text-5xl md:text-[3.5rem]">
            {s.heroTitleLine1}
            <br />
            <span className="bg-gradient-to-l from-blue-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              {s.heroTitleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            {s.heroSubtitle}
          </p>

          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 px-8 py-4 text-[15px] font-bold text-white shadow-[0_12px_40px_-12px_rgba(37,99,235,0.7)] transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
            >
              {loaded ? s.heroCtaPrimary : "…"}
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="h-3.5 w-3.5 transition group-hover:-translate-x-1"
              />
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-bold text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
            >
              {s.heroCtaSecondary}
            </Link>
          </div>

          {/* الشارات */}
          {(s.badges ?? []).length > 0 && (
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
              {(s.badges ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-white/80 backdrop-blur-sm"
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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[var(--bz-bg)] [clip-path:ellipse(70%_100%_at_50%_100%)]" />
      </section>

      {/* ── الخطوات ── */}
      {(s.steps ?? []).length > 0 && (
        <section className="relative z-10 -mt-8 px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                كيف تبدأ
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.stepsTitle}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(s.steps ?? []).map((step, i) => (
                <div
                  key={step.id}
                  className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute -right-4 -top-4 text-[5rem] font-extrabold leading-none text-primary/5">
                    {step.n}
                  </div>
                  <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-lg font-extrabold text-white shadow-glow">
                    {step.n}
                  </span>
                  <h3 className="relative mt-4 font-display text-lg font-bold">
                    {step.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-text-muted">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── الأدوار ── */}
      {(s.audience ?? []).length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                الأدوار
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.audienceTitle}
              </h2>
              {s.audienceSubtitle && (
                <p className="mx-auto mt-3 max-w-lg text-text-muted">
                  {s.audienceSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {(s.audience ?? []).map((a, idx) => (
                <article
                  key={a.id}
                  className={`relative overflow-hidden rounded-[1.75rem] border p-7 transition hover:shadow-xl ${
                    idx === 0
                      ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                      : "border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${
                        idx === 0 ? "bg-gradient-primary" : "bg-gradient-to-br from-emerald-500 to-teal-600"
                      }`}
                    >
                      <DynamicIcon
                        value={a.icon}
                        className="h-6 w-6"
                        emojiClass="text-2xl"
                      />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-extrabold">
                        {a.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-[1.85] text-text-muted">
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

      {/* ── الميزات ── */}
      {(s.features ?? []).length > 0 && (
        <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                المزايا
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.featuresTitle}
              </h2>
              {s.featuresSubtitle && (
                <p className="mx-auto mt-3 max-w-lg text-text-muted">
                  {s.featuresSubtitle}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(s.features ?? []).map((f) => (
                <article
                  key={f.id}
                  className="group rounded-2xl border border-border bg-[var(--bz-bg)] p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-6"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-gradient-primary group-hover:text-white group-hover:shadow-glow">
                    <DynamicIcon
                      value={f.icon}
                      className="h-5 w-5"
                      emojiClass="text-xl"
                    />
                  </span>
                  <h3 className="mt-4 font-display font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── الشفافية ── */}
      {(s.pricingNote || (s.pricingRows ?? []).length > 0) && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                الشفافية
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.pricingTitle}
              </h2>
              {s.pricingNote && (
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-loose text-text-muted sm:text-base">
                  {s.pricingNote}
                </p>
              )}
            </div>

            {(s.pricingRows ?? []).length > 0 && (
              <div className="mt-10 space-y-3">
                {(s.pricingRows ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3.5 rounded-2xl border border-border bg-surface p-4 sm:p-5"
                  >
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary/15">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="h-3.5 w-3.5 text-secondary"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{r.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
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

      {/* ── الأسئلة ── */}
      {(s.faq ?? []).length > 0 && (
        <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
              {s.faqTitle}
            </h2>
            <div className="mt-10 space-y-2.5">
              {(s.faq ?? []).map((f) => (
                <FaqRow key={f.id} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[#07080f]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[500px] -translate-x-1/2 rounded-full bg-blue-600/25 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-2xl text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.logoUrl || "/icon.svg"}
            alt=""
            className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain shadow-[0_0_40px_-8px_rgba(59,130,246,0.6)]"
          />
          <h2 className="font-display text-2xl font-extrabold sm:text-4xl">
            {s.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/55">
            {s.ctaSubtitle}
          </p>
          <div className="mt-9">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-9 py-4 text-base font-bold text-slate-900 shadow-xl transition hover:bg-white/90 active:scale-[0.98]"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/45">
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

      {/* ── التذييل ── */}
      <footer className="border-t border-border bg-surface px-4 py-10 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt=""
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-display font-bold">
              {s.siteName || "BacZoneDZ"}
            </span>
          </div>
          <p className="text-sm text-text-muted">
            {s.footerText || `© ${year} BacZoneDZ`}
          </p>
          <div className="flex gap-5 text-xs text-text-muted">
            <Link href="/login" className="hover:text-primary">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="hover:text-primary">
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
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-primary/5"
      >
        <span className="flex-1 text-sm font-bold">{q}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`h-3 w-3 shrink-0 text-text-muted transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div className={open ? "px-4 pb-4" : "hidden"}>
        <p className="text-sm leading-loose text-text-muted">{a}</p>
      </div>
    </div>
  );
}