import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bz-cosmic-bg flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJkmGMz82JN543z5uysVeFEY71uvdHDH_Qq25wvcVlY_M0xyuSzDC2RfXwXovZ-2JYkNdQGsrES5QSWnvVxf7zb0h-2TezVm6aUJgtVfLIc0TLCVESOixhNH1VucRv76rVu1Cy9p52DyOgHQRxCtQkH8PmHrhxN5uHDFKa4XUlibN4pOzDIZJxCHq9Uxs/s320/BACZONEDZ%20(2).png" alt="BacZoneDZ" className="h-10 w-10 rounded-xl object-contain shadow-glow" />
        <span className="font-display text-2xl font-extrabold">
          BacZone <span className="bz-gradient-text">DZ</span>
        </span>
      </Link>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-glass sm:p-8">
        {children}
      </div>
    </div>
  );
}
