import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[var(--bz-bg)]">
      {/* الجانب الأيسر — يظهر على الشاشات الكبيرة فقط */}
      <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[46%] flex-col justify-between overflow-hidden bg-[#07080f] p-10 xl:p-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-blue-600/30 blur-[100px]" />
          <div className="absolute bottom-10 left-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[70px]" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJkmGMz82JN543z5uysVeFEY71uvdHDH_Qq25wvcVlY_M0xyuSzDC2RfXwXovZ-2JYkNdQGsrES5QSWnvVxf7zb0h-2TezVm6aUJgtVfLIc0TLCVESOixhNH1VucRv76rVu1Cy9p52DyOgHQRxCtQkH8PmHrhxN5uHDFKa4XUlibN4pOzDIZJxCHq9Uxs/s320/BACZONEDZ%20(2).png"
              alt="BacZoneDZ"
              className="h-11 w-11 rounded-2xl object-contain shadow-lg shadow-blue-500/25 transition group-hover:scale-105"
            />
            <span className="font-display text-xl font-extrabold tracking-tight">
              BacZone <span className="text-blue-400">DZ</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h2 className="font-display text-3xl xl:text-[2.15rem] font-extrabold leading-[1.3]">
            نسعى لنكون أكبر مجتمع دراسي
            <br />
            <span className="bg-gradient-to-l from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              لطلاب البكالوريا
            </span>
          </h2>
          <p className="text-[15px] leading-relaxed text-white/55">
            منصة واحدة تجمع الطلبة والأساتذة — دروس مباشرة، تمارين، ومتابعة يومية نحو الباك.
          </p>
          <ul className="space-y-2.5 pt-1">
            {[
              "غرف دراسة مباشرة مع الأساتذة أو للمراجعة مع زملائك",
              "ملخصات و تمارين و مواضيع و حلول الباكلوريات السابقة",
              "مجتمع طلابي نشط طوال السنة",
"والمزيد لتكتشفه..",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/35">
          منصّة بكالوريا الجزائر — مجتمع دراسي واحد
        </p>
      </aside>

      {/* الجانب الأيمن — النموذج */}
      <main
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
        }}
      >
        {/* شعار الجوال فقط */}
        <Link href="/" className="mb-7 flex items-center gap-2.5 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJkmGMz82JN543z5uysVeFEY71uvdHDH_Qq25wvcVlY_M0xyuSzDC2RfXwXovZ-2JYkNdQGsrES5QSWnvVxf7zb0h-2TezVm6aUJgtVfLIc0TLCVESOixhNH1VucRv76rVu1Cy9p52DyOgHQRxCtQkH8PmHrhxN5uHDFKa4XUlibN4pOzDIZJxCHq9Uxs/s320/BACZONEDZ%20(2).png"
            alt="BacZoneDZ"
            className="h-10 w-10 rounded-xl object-contain shadow-glow"
          />
          <span className="font-display text-xl font-extrabold">
            BacZone <span className="bz-gradient-text">DZ</span>
          </span>
        </Link>

        <div className="w-full max-w-[400px]">{children}</div>

        <p className="mt-7 text-center text-[11px] text-text-muted lg:hidden">
          منصّة بكالوريا الجزائر — مجتمع دراسي واحد
        </p>
      </main>
    </div>
  );
}