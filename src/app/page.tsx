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
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-200 selection:bg-blue-500/30">
      
      {/* ═══════════════ الهيدر الطافي ═══════════════ */}
      <header
        className={`fixed inset-x-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "top-4 mx-auto max-w-5xl px-4 sm:px-6"
            : "top-0 w-full px-4 sm:px-6 py-2"
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-3 overflow-hidden transition-all duration-500 ${
            scrolled
              ? "h-14 rounded-2xl border border-white/10 bg-slate-950/60 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/40"
              : "h-16 border-b border-transparent bg-transparent px-2"
          }`}
        >
          {/* الشعار + الاسم */}
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 outline-none"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.logoUrl || "/icon.svg"}
                alt={s.siteName || "BacZoneDZ"}
                className="h-6 w-6 object-contain brightness-0 invert"
              />
            </div>
            <span className="truncate font-display text-[17px] font-extrabold tracking-tight text-white transition-colors group-hover:text-blue-400">
              {s.siteName || "BacZoneDZ"}
            </span>
          </Link>

          {/* الأزرار */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeToggle />

            <Link
              href="/login"
              className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:inline-block"
            >
              تسجيل الدخول
            </Link>

            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 hover:ring-2 hover:ring-blue-500/50 hover:ring-offset-2 hover:ring-offset-[#030712] active:scale-95"
            >
              <span className="relative z-10">
                {loaded ? s.heroCtaPrimary || "ابدأ مجاناً" : "..."}
              </span>
              <div className="absolute inset-0 z-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════ الهيرو ═══════════════ */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pt-20">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="absolute top-[-10%] h-[600px] w-[800px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 text-center sm:px-6">
          
          {s.landingBadge && (
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 backdrop-blur-md">
              <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
              {s.landingBadge}
            </div>
          )}

          <h1 className="mx-auto max-w-4xl font-display text-4xl font-extrabold leading-[1.4] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.5rem]">
            <span className="block text-slate-100 drop-shadow-sm pb-2">
              {s.heroTitleLine1}
            </span>
            <span className="relative mt-2 block pb-4 pt-2">
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent blur-2xl filter opacity-40" />
              <span className="relative bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-sm">
                {s.heroTitleLine2}
              </span>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            {s.heroSubtitle}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-slate-900 transition-all hover:bg-slate-100 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] active:scale-95 sm:w-auto"
            >
              {loaded ? s.heroCtaPrimary : "…"}
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="transition-transform group-hover:-translate-x-1.5"
              />
            </Link>
            
            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-95 sm:w-auto"
            >
              {s.heroCtaSecondary}
            </Link>
          </div>

          {(s.badges ?? []).length > 0 && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-3 border-t border-white/5 pt-8 sm:gap-6">
              <p className="w-full text-sm font-medium text-slate-500 sm:w-auto sm:me-4">
                انضم إلى مجتمع التميز:
              </p>
              {(s.badges ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                >
                  <DynamicIcon
                    value={b.icon}
                    className="h-4 w-4 text-emerald-400"
                    emojiClass="text-base"
                  />
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
      </section>

      {/* ═══════════════ الخطوات ═══════════════ */}
      {(s.steps ?? []).length > 0 && (
        <section className="relative z-10 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-16 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
              </div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {s.stepsTitle}
              </h2>
            </div>

            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="absolute left-1/2 top-1/2 -z-10 hidden w-full -translate-x-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/10 md:block" />
              
              {(s.steps ?? []).map((step, idx) => (
                <div
                  key={step.id}
                  className="group relative flex flex-col items-center rounded-3xl border border-white/5 bg-slate-900/50 p-8 text-center backdrop-blur-sm transition-all hover:-translate-y-2 hover:border-blue-500/30 hover:bg-slate-800/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]"
                >
                  <div className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg ring-4 ring-[#030712] transition-transform group-hover:scale-110 group-hover:rotate-3">
                    {step.n}
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الميزات (Bento Grid) ═══════════════ */}
      {(s.features ?? []).length > 0 && (
        <section className="relative py-24 sm:py-32">
          <div className="absolute inset-y-0 right-1/2 -z-10 w-full max-w-3xl translate-x-1/2 bg-[radial-gradient(closest-side,rgba(37,99,235,0.05)_0%,transparent_100%)]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-16 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-blue-500">
                ترسانة الطالب
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {s.featuresTitle}
              </h2>
              {s.featuresSubtitle && (
                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
                  {s.featuresSubtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {(s.features ?? []).map((f, idx) => (
                <article
                  key={f.id}
                  className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-8 transition-all hover:border-white/20 hover:bg-slate-800/60 ${
                    idx === 0 || idx === 3 ? "lg:col-span-2" : "col-span-1"
                  }`}
                >
                  <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-blue-500/10 blur-3xl transition-opacity group-hover:bg-blue-500/20" />
                  
                  <div className="relative z-10 flex h-full flex-col">
                    <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-blue-400 ring-1 ring-white/10 transition-transform group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white group-hover:ring-blue-500">
                      <DynamicIcon
                        value={f.icon}
                        className="h-5 w-5"
                        emojiClass="text-xl"
                      />
                    </span>
                    <h3 className="font-display text-xl font-bold text-white">
                      {f.title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                      {f.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ الأدوار ═══════════════ */}
      {(s.audience ?? []).length > 0 && (
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-16 text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {s.audienceTitle}
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {(s.audience ?? []).map((a, idx) => (
                <article
                  key={a.id}
                  className="group relative overflow-hidden rounded-3xl p-[1px] transition-all hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.5)]"
                >
                  <span
                    className={`absolute inset-0 z-0 bg-gradient-to-br ${
                      idx === 0
                        ? "from-blue-500/40 via-transparent to-transparent"
                        : "from-emerald-500/40 via-transparent to-transparent"
                    }`}
                  />
                  <div className="relative z-10 flex h-full flex-col gap-5 rounded-3xl bg-slate-950 p-8 sm:flex-row sm:items-start">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
                        idx === 0
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                          : "bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
                      }`}
                    >
                      <DynamicIcon
                        value={a.icon}
                        className="h-6 w-6"
                        emojiClass="text-2xl"
                      />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-white">
                        {a.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-400">
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

      {/* ═══════════════ الأسئلة الشائعة ═══════════════ */}
      {(s.faq ?? []).length > 0 && (
        <section className="relative border-t border-white/5 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {s.faqTitle}
            </h2>
            <div className="mt-12 space-y-4">
              {(s.faq ?? []).map((f) => (
                <FaqRow key={f.id} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[800px] rounded-full bg-blue-600/20 blur-[100px]" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-2xl shadow-blue-500/20">
             {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt=""
              className="h-full w-full object-contain brightness-0 invert"
            />
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {s.ctaTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
            {s.ctaSubtitle}
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-lg font-bold text-slate-950 shadow-xl transition-all hover:scale-105 hover:bg-slate-100 hover:shadow-blue-500/20 active:scale-95"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
              {s.ctaButton}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-400">
            {["لا رسوم خفية", "بدون إعلانات مزعجة", "مجتمع متفاعل"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="h-4 w-4 text-emerald-400"
                />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ التذييل ═══════════════ */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4">
          <div className="flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoUrl || "/icon.svg"}
              alt=""
              className="h-8 w-8 object-contain opacity-50 grayscale"
            />
            <span className="font-display text-lg font-bold text-white">
              {s.siteName || "BacZoneDZ"}
            </span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <Link href="/login" className="transition-colors hover:text-white">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="transition-colors hover:text-white">
              حساب جديد
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            {s.footerText || `© ${year} ${s.siteName || "BacZoneDZ"}. جميع الحقوق محفوظة.`}
          </p>
        </div>
      </footer>
    </main>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        open ? "border-blue-500/30 bg-blue-500/5" : "border-white/10 bg-slate-900/30 hover:bg-slate-800/50"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-right sm:p-6"
      >
        <span className="text-base font-bold text-slate-200">{q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${
            open ? "rotate-180 bg-blue-500/20 text-blue-400" : "bg-white/5 text-slate-400"
          }`}
        >
          <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
        </span>
      </button>
      
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400 sm:px-6 sm:pb-6">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}