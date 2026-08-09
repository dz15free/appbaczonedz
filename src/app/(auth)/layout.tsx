import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bz-cosmic-bg flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 sm:px-5 sm:py-10"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
      }}
    >
      {/* الشعار */}
      <Link href="/" className="mb-6 flex items-center gap-2.5 sm:mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJkmGMz82JN543z5uysVeFEY71uvdHDH_Qq25wvcVlY_M0xyuSzDC2RfXwXovZ-2JYkNdQGsrES5QSWnvVxf7zb0h-2TezVm6aUJgtVfLIc0TLCVESOixhNH1VucRv76rVu1Cy9p52DyOgHQRxCtQkH8PmHrhxN5uHDFKa4XUlibN4pOzDIZJxCHq9Uxs/s320/BACZONEDZ%20(2).png"
          alt="BacZoneDZ"
          className="h-11 w-11 rounded-2xl object-contain shadow-glow"
        />
        <span className="font-display text-2xl font-extrabold">
          BacZone <span className="bz-gradient-text">DZ</span>
        </span>
      </Link>

      {/* البطاقة */}
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-glass sm:p-8">
        {children}
      </div>

      {/* تذييل صغير */}
      <p className="mt-6 text-center text-[11px] text-text-muted">
        منصّة بكالوريا الجزائر — مجتمع دراسي واحد
      </p>
    </div>
  );
}
