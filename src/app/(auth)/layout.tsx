import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bz-cosmic-bg flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="BacZoneDZ" className="h-10 w-10 rounded-xl shadow-glow" />
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
