"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faUserPlus, faCheckCircle, faFlag, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const { settings: s } = useSiteSettings();
  const year = new Date().getFullYear();

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
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logoUrl || "/icon.svg"} alt={s.siteName || "BacZoneDZ"} className="h-10 w-10 rounded-xl object-contain" />
          <span className="font-display text-xl font-extrabold">{s.siteName || "BacZoneDZ"}</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden text-sm font-semibold text-text-muted transition hover:text-primary sm:block">دخول</Link>
          <Link href="/register" className="rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 hover:scale-105">
            {s.heroCtaPrimary || "أنشئ حسابك"}
          </Link>
        </div>
      </header>

      {/* الهيرو */}
      <section className="bz-cosmic-bg relative px-5 pb-28 pt-20 text-center">
        {/* توهّجات خلفية */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-40 right-1/4 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="relative">
          {s.landingBadge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
              <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
              {s.landingBadge}
            </span>
          )}
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.15] md:text-6xl">
            {s.heroTitleLine1}
            <br /><span className="bz-gradient-text">{s.heroTitleLine2}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-muted md:text-lg">
            {s.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-7 py-4 font-bold text-white shadow-glow transition hover:opacity-90 hover:scale-105 sm:w-auto">
              {s.heroCtaPrimary}
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 transition group-hover:-translate-x-1" />
            </Link>
            <Link href="/login" className="w-full rounded-xl border border-border bg-surface px-7 py-4 font-bold backdrop-blur-sm transition hover:bg-primary/10 sm:w-auto">
              {s.heroCtaSecondary}
            </Link>
          </div>

          {/* الشارات السريعة */}
          <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
            {(s.badges ?? []).map((b) => (
              <div key={b.id} className="bz-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm">
                <DynamicIcon value={b.icon} className="h-4 w-4 text-primary" emojiClass="text-base" />
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الخطوات */}
      {(s.steps ?? []).length > 0 && (
        <section className="relative px-5 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">كيف تبدأ</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{s.stepsTitle}</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
            {(s.steps ?? []).map((step, i) => (
              <div key={step.id} className="group relative rounded-2xl border border-border bg-surface p-7 text-center transition hover:-translate-y-1 hover:border-primary hover:shadow-glass">
                {i < (s.steps ?? []).length - 1 && (
                  <div className="absolute left-0 top-1/2 hidden h-px w-5 -translate-x-full bg-border sm:block" />
                )}
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary font-display text-xl font-extrabold text-white shadow-glow">
                  {step.n}
                </span>
                <h3 className="mt-4 font-display font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* لمن هذه المنصّة */}
      {(s.audience ?? []).length > 0 && (
        <section className="relative px-5 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">الأدوار</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{s.audienceTitle}</h2>
            {s.audienceSubtitle && <p className="mt-3 text-text-muted">{s.audienceSubtitle}</p>}
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            {(s.audience ?? []).map((a) => (
              <article key={a.id} className="rounded-3xl border border-border bg-surface p-7 transition hover:border-primary hover:shadow-glass">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-white">
                  <DynamicIcon value={a.icon} className="h-6 w-6" emojiClass="text-2xl" />
                </span>
                <h3 className="mt-5 font-display text-xl font-extrabold">{a.title}</h3>
                <p className="mt-3 text-sm leading-loose text-text-muted">{a.desc}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* الميزات */}
      {(s.features ?? []).length > 0 && (
        <section className="relative px-5 py-20 bg-surface">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">المزايا</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{s.featuresTitle}</h2>
            {s.featuresSubtitle && <p className="mt-3 text-text-muted">{s.featuresSubtitle}</p>}
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(s.features ?? []).map((f) => (
              <article key={f.id} className="group rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-glass">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white group-hover:scale-110">
                  <DynamicIcon value={f.icon} className="h-5 w-5" emojiClass="text-xl" />
                </span>
                <h3 className="mt-4 font-display font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* التكلفة — صريحة بلا مبالغة */}
      {(s.pricingNote || (s.pricingRows ?? []).length > 0) && (
        <section className="relative px-5 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">الشفافية</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{s.pricingTitle}</h2>
            {s.pricingNote && (
              <p className="mx-auto mt-4 max-w-2xl leading-loose text-text-muted">{s.pricingNote}</p>
            )}
          </div>
          {(s.pricingRows ?? []).length > 0 && (
            <div className="mx-auto mt-10 max-w-3xl space-y-3">
              {(s.pricingRows ?? []).map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                  <FontAwesomeIcon icon={faCheckCircle} className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">{r.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* الأسئلة الشائعة */}
      {(s.faq ?? []).length > 0 && (
        <section className="relative bg-surface px-5 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">{s.faqTitle}</h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-2.5">
            {(s.faq ?? []).map((f) => <FaqRow key={f.id} q={f.q} a={f.a} />)}
          </div>
        </section>
      )}

      {/* CTA نهائي */}
      <section className="relative overflow-hidden px-5 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logoUrl || "/icon.svg"} alt="" className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain shadow-glow" />
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">{s.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-text-muted">{s.ctaSubtitle}</p>
          <div className="mt-9 flex justify-center">
            <Link href="/register" className="group flex items-center gap-2 rounded-xl bg-gradient-primary px-9 py-4 text-lg font-bold text-white shadow-glow transition hover:opacity-90 hover:scale-105">
              <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
            {["لا رسوم", "لا إعلانات", "لا بطاقة ائتمان"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-secondary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-10 text-center text-sm text-text-muted">
        <div className="flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logoUrl || "/icon.svg"} alt="" className="h-7 w-7 rounded-lg object-contain" />
          <p className="font-bold text-text-primary">{s.siteName || "BacZoneDZ"}</p>
        </div>
        <p className="mt-2">{s.footerText || `© ${year} BacZoneDZ`}</p>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <Link href="/login" className="hover:text-primary">تسجيل الدخول</Link>
          <Link href="/register" className="hover:text-primary">تسجيل جديد</Link>
        </div>
      </footer>
    </main>
  );
}

/* سؤال قابل للطي — يبقى المحتوى في DOM ليجده محرّك البحث */
function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-primary/5"
      >
        <span className="flex-1 text-sm font-bold">{q}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`h-3 w-3 shrink-0 text-text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={open ? "px-4 pb-4" : "hidden"}>
        <p className="text-sm leading-loose text-text-muted">{a}</p>
      </div>
    </div>
  );
}
