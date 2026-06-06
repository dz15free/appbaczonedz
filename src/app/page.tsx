import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardUser,
  faMicrophoneLines,
  faBookOpen,
  faRobot,
  faTrophy,
  faUsers,
  faArrowLeft,
  faGift,
  faBan,
  faSignal,
  faFlag,
} from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

// مزايا حقيقية صادقة (المنصة جديدة — لا أرقام وهمية)
const badges = [
  { icon: faGift, label: "مجاني 100%" },
  { icon: faBan, label: "بدون إعلانات" },
  { icon: faSignal, label: "يعمل على 3G و4G" },
  { icon: faFlag, label: "صُنعت في الجزائر" },
];

const features = [
  { icon: faChalkboardUser, title: "غرف دراسة تفاعلية", desc: "ادرس وراجع جماعياً مع فيديو متزامن وسبورة ذكية." },
  { icon: faMicrophoneLines, title: "صوت جماعي", desc: "غرفة صوت شبيهة بـ Discord تعمل حتى على 3G/4G." },
  { icon: faBookOpen, title: "مكتبة ضخمة", desc: "آلاف الملفات والدروس مرتّبة حسب الشعبة." },
  { icon: faRobot, title: "Omibot — مساعد ذكي", desc: "يشرح الدروس ويضع خطط مراجعة ويحلّل مستواك." },
  { icon: faTrophy, title: "نظام إنجازات", desc: "نقاط ومستويات وأوسمة وتحديات يومية." },
  { icon: faUsers, title: "مجتمع دراسي", desc: "اسأل، شارك، وتعلّم مع آلاف الطلاب." },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* الشريط العلوي */}
      <header className="bz-glass sticky top-0 z-50 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-primary font-display text-lg font-extrabold text-white">
            B
          </span>
          <span className="font-display text-xl font-extrabold">
            BacZone <span className="bz-gradient-text">DZ</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
          >
            تسجيل الدخول
          </Link>
        </div>
      </header>

      {/* الهيرو */}
      <section className="bz-cosmic-bg relative px-5 pb-20 pt-16 text-center">
        <p className="animate-fade-up text-sm font-semibold text-primary">
          منصة دراسية جزائرية جديدة لطلاب البكالوريا
        </p>
        <h1 className="animate-fade-up mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          أكبر <span className="bz-gradient-text">مجتمع دراسي تفاعلي</span>
          <br /> لطلاب البكالوريا
        </h1>
        <p className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-text-muted md:text-lg">
          ادرس، راجع، وتعاون في مكان واحد — غرف دراسة، سبورة ذكية، صوت جماعي،
          ومساعد ذكاء اصطناعي يرافقك نحو النجاح.
        </p>
        <div className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-md bg-gradient-primary px-7 py-3 font-bold text-white shadow-glow transition hover:opacity-90"
          >
            ابدأ رحلتك الآن
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border bg-surface px-7 py-3 font-bold text-text-primary transition hover:bg-primary/10"
          >
            استكشف المنصة
          </Link>
        </div>

        {/* مزايا حقيقية بدل أرقام وهمية */}
        <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-3">
          {badges.map((b) => (
            <div
              key={b.label}
              className="bz-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            >
              <FontAwesomeIcon icon={b.icon} className="h-4 w-4 text-primary" />
              {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* الميزات */}
      <section className="px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold">
          كل ما تحتاجه <span className="bz-gradient-text">للنجاح</span>
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group rounded-lg border border-border bg-surface p-6 transition hover:-translate-y-1 hover:shadow-glass"
            >
              <span className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white">
                <FontAwesomeIcon icon={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-text-muted">
        © {new Date().getFullYear()} BacZoneDZ — مجاني 100% للطلاب الجزائريين.
      </footer>
    </main>
  );
}
