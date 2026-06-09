import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseChimney, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      {/* شعار */}
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary font-display text-2xl font-extrabold text-white">
        BZ
      </div>

      {/* الرقم */}
      <h1 className="font-display text-8xl font-extrabold leading-none">
        4<span className="bz-gradient-text">0</span>4
      </h1>

      <h2 className="mt-4 text-xl font-bold">الصفحة غير موجودة</h2>
      <p className="mt-2 max-w-sm text-text-muted">
        يبدو أن هذه الصفحة اختفت! تحقّق من الرابط أو عُد للرئيسية.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/home"
          className="flex items-center justify-center gap-2 rounded-md bg-gradient-primary px-6 py-3 font-bold text-white shadow-glow transition hover:opacity-90"
        >
          <FontAwesomeIcon icon={faHouseChimney} className="h-4 w-4" />
          الصفحة الرئيسية
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 font-bold transition hover:bg-primary/10"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          الواجهة العامة
        </Link>
      </div>
    </main>
  );
}
