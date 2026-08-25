import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};
/* الشعار من المصدر الوحيد — كان مكتوباً بيده هنا مرّتين */
import { DEFAULT_LOGO } from "@/lib/brand-assets";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[var(--bz-bg)]">
      {/* ═══════════════ LEFT PANEL — Desktop only ═══════════════ */}
      <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[46%] flex-col justify-between overflow-hidden bg-[#07080f] p-10 xl:p-14 text-white">
        {/* Atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-blue-600/25 blur-[120px]" />
          <div className="absolute bottom-0 -left-16 h-96 w-96 rounded-full bg-emerald-500/12 blur-[130px]" />
          <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[90px]" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DEFAULT_LOGO}
              alt="BacZoneDZ"
              className="h-11 w-11 rounded-2xl object-contain shadow-[0_8px_24px_-4px_rgba(59,130,246,0.45)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_28px_-4px_rgba(59,130,246,0.55)]"
            />
            <span className="font-display text-xl font-extrabold tracking-tight">
              BacZone{" "}
              <span className="bg-gradient-to-l from-blue-400 to-sky-300 bg-clip-text text-transparent">
                DZ
              </span>
            </span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="font-display text-[1.85rem] xl:text-[2.2rem] font-extrabold leading-[1.35] tracking-tight">
            نسعى لنكون أكبر مجتمع دراسي
            <br />
            <span className="bg-gradient-to-l from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              لطلاب البكالوريا
            </span>
          </h2>

          <p className="text-[15px] leading-relaxed text-white/55">
            منصة واحدة تجمع الطلبة والأساتذة — دروس مباشرة، تمارين، ومتابعة يومية نحو الباك.
          </p>

          <ul className="space-y-3 pt-1">
            {[
              "غرف دراسة مباشرة مع الأساتذة أو للمراجعة مع زملائك",
              "ملخصات وتمارين ومواضيع وحلول الباكلوريات السابقة",
              "مجتمع طلابي نشط طوال السنة",
              "والمزيد لتكتشفه..",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[13.5px] leading-snug text-white/70"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-[12px] text-white/35">
          منصّة بكالوريا الجزائر — مجتمع دراسي واحد
        </p>
      </aside>

      {/* ═══════════════ RIGHT PANEL — Form ═══════════════ */}
      <main
        className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
        }}
      >
        {/* Soft background accents (mobile + desktop) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        </div>

        {/* Mobile logo only */}
        <Link
          href="/"
          className="relative z-10 mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-90 lg:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_LOGO}
            alt="BacZoneDZ"
            className="h-11 w-11 rounded-2xl object-contain shadow-[0_8px_24px_-4px_rgba(59,130,246,0.35)]"
          />
          <span className="font-display text-xl font-extrabold tracking-tight">
            BacZone{" "}
            <span className="bg-gradient-to-l from-blue-500 to-sky-400 bg-clip-text text-transparent">
              DZ
            </span>
          </span>
        </Link>

        {/* Form container */}
        <div className="relative z-10 w-full max-w-[400px]">{children}</div>

        {/* Mobile footer note */}
        <p className="relative z-10 mt-8 text-center text-[11.5px] text-text-muted lg:hidden">
          منصّة بكالوريا الجزائر — مجتمع دراسي واحد
        </p>
      </main>
    </div>
  );
}