"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUserPlus,
  faCheckCircle,
  faFlag,
  faChevronDown,
  faArrowRight,
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
    <main className="relative min-h-screen bg-[var(--bz-bg)]">
      {/* ═══════════════ الشريط العلوي ═══════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-[var(--bz-surface)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt={s.siteName || "BacZoneDZ"}
              className="h-9 w-9 shrink-0 rounded-xl object-contain sm:h-10 sm:w-10"
            />
            <span className="truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">
              {s.siteName || "BacZoneDZ"}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-text-muted transition hover:text-primary sm:inline-block"
            >
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-primary px-3.5 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90 active:scale-[0.98] sm:px-5 sm:py-2.5"
            >
              {loaded ? (
                s.heroCtaPrimary || "أنشئ حسابك"
              ) : (
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/40" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════ الهيرو ═══════════════ */}
      <section className="relative overflow-hidden">
        {/* خلفية هادئة */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-secondary/8 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          {s.landingBadge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-[13px] font-bold text-primary">
              <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
              {s.landingBadge}
            </span>
          )}

          <h1 className="mt-6 font-display text-[2rem] font-extrabold leading-[1.2] tracking-tight sm:text-5xl md:text-[3.25rem]">
            {s.heroTitleLine1}
            <br />
            <span className="bz-gradient-text">{s.heroTitleLine2}</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-text-muted sm:text-lg">
            {s.heroSubtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-primary px-7 py-3.5 text-[15px] font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98] sm:w-auto sm:px-8 sm:py-4"
            >
              {loaded ? (
                s.heroCtaPrimary
              ) : (
                <span className="inline-block h-5 w-36 animate-pulse rounded bg-white/40" />
              )}
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="h-3.5 w-3.5 transition group-hover:-translate-x-1"
              />
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl border border-border bg-surface px-7 py-3.5 text-[15px] font-bold transition hover:bg-primary/5 sm:w-auto sm:px-8 sm:py-4"
            >
              {s.heroCtaSecondary}
            </Link>
          </div>

          {/* الشارات */}
          {(s.badges ?? []).length > 0 && (
            <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {(s.badges ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold shadow-sm"
                >
                  <DynamicIcon
                    value={b.icon}
                    className="h-3.5 w-3.5 text-primary"
                    emojiClass="text-sm"
                  />
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ الخطوات ═══════════════ */}
      {(s.steps ?? []).length > 0 && (
        <section className="border-t border-border/50 bg-surface px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
                كيف تبدأ
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.stepsTitle}
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {(s.steps ?? []).map((step, i) => (
                <div
                  key={step.id}
                  className="relative rounded-2xl border border-border bg-[var(--bz-bg)] p-6 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-sm font-extrabold text-white shadow-glow">
                      {step.n}
                    </span>
                    <h3 className="font-display text-base font-bold">{step.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {step.desc}
                  </p>
                  {i < (s.steps ?? []).length - 1 && (
                    <div className="absolute -left-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-border sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الأدوار ═══════════════ */}
      {(s.audience ?? []).length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
                الأدوار
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.audienceTitle}
              </h2>
              {s.audienceSubtitle && (
                <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
                  {s.audienceSubtitle}
                </p>
              )}
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {(s.audience ?? []).map((a) => (
                <article
                  key={a.id}
                  className="group flex gap-5 rounded-3xl border border-border bg-surface p-6 transition hover:border-primary/30 hover:shadow-lg sm:p-7"
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white">
                    <DynamicIcon
                      value={a.icon}
                      className="h-6 w-6"
                      emojiClass="text-2xl"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-extrabold">
                      {a.title}
                    </h3>
                    <p className="mt-2 text-sm leading-loose text-text-muted">
                      {a.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الميزات ═══════════════ */}
      {(s.features ?? []).length > 0 && (
        <section className="border-t border-border/50 bg-surface px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
                المزايا
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                {s.featuresTitle}
              </h2>
              {s.featuresSubtitle && (
                <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
                  {s.featuresSubtitle}
                </p>
              )}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(s.features ?? []).map((f) => (
                <article
                  key={f.id}
                  className="group rounded-2xl border border-border bg-[var(--bz-bg)] p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-6"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white">
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

      {/* ═══════════════ التسعير / الشفافية ═══════════════ */}
      {(s.pricingNote || (s.pricingRows ?? []).length > 0) && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
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
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                    />
                    <div className="min-w-0">
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

      {/* ═══════════════ الأسئلة الشائعة ═══════════════ */}
      {(s.faq ?? []).length > 0 && (
        <section className="border-t border-border/50 bg-surface px-4 py-16 sm:px-6 sm:py-20">
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

      {/* ═══════════════ CTA نهائي ═══════════════ */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5" />
        <div className="relative mx-auto max-w-2xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.logoUrl || "/icon.svg"}
            alt=""
            className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain shadow-glow"
          />
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            {s.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-text-muted sm:text-base">
            {s.ctaSubtitle}
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-primary px-8 py-3.5 text-base font-bold text-white shadow-glow transition hover:opacity-95 active:scale-[0.98]"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-text-muted">
            {["لا رسوم", "لا إعلانات", "لا بطاقة ائتمان"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="h-3.5 w-3.5 text-secondary"
                />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ التذييل ═══════════════ */}
      <footer className="border-t border-border bg-surface px-4 py-10 text-center sm:px-6">
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

/* سؤال قابل للطي — يبقى المحتوى في DOM لمحركات البحث */
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