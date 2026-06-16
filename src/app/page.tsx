import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardUser, faMicrophoneLines, faRobot, faTrophy,
  faUsers, faArrowLeft, faGift, faBan, faSignal, faFlag,
  faLayerGroup, faFolder, faBell, faClock, faComments,
  faUserPlus, faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

const badges = [
  { icon: faGift, label: "مجاني 100%" },
  { icon: faBan, label: "بدون إعلانات" },
  { icon: faSignal, label: "يعمل على 3G و4G" },
  { icon: faFlag, label: "صُنعت في الجزائر 🇩🇿" },
];

const features = [
  { icon: faChalkboardUser, title: "غرف دراسة تفاعلية", desc: "سبورة ذكية بأدوات الأستاذ، فيديو YouTube متزامن، دردشة جماعية، ورفع الملفات." },
  { icon: faMicrophoneLines, title: "صوت جماعي احترافي", desc: "صوت جماعي شبيه بـ Discord يعمل على 3G/4G. الأستاذ يتحكّم في ميكروفونات الطلاب." },
  { icon: faLayerGroup, title: "مجموعات المواد", desc: "مجموعة لكل مادة أو شعبة فيها نقاش مستمر، قائمة أعضاء، وملفات مشتركة." },
  { icon: faFolder, title: "مشاركة الملفات بـ Google Drive", desc: "ارفع ملفاتك PDF/Word/Excel/PPT واعرضها داخل المنصّة مباشرةً بلا تحميل." },
  { icon: faRobot, title: "مروة — رفيقتك الذكية", desc: "يطرح أسئلة توضيحية، يضع خطط مراجعة مخصّصة حسب شعبتك، ويطمئنك ويشجّعك." },
  { icon: faTrophy, title: "نظام إنجازات ومنافسة", desc: "نقاط على كل نشاط، مستويات متصاعدة، أوسمة، وترتيب يومي بين الطلاب." },
  { icon: faUsers, title: "مجتمع دراسي حقيقي", desc: "منشورات، تعليقات، صداقات، رسائل خاصّة، ومشاركة ملفات الدراسة." },
  { icon: faBell, title: "إشعارات فورية", desc: "يصلك إشعار على هاتفك فور وصول رسالة أو طلب صداقة حتى حين يكون التطبيق مغلقاً." },
  { icon: faClock, title: "مؤقّت بومودورو", desc: "ادرس بتركيز 25 دقيقة ثم استرح 5 دقائق. أثبتت الدراسات أنه يضاعف الإنتاجية." },
];

const steps = [
  { n: "01", title: "أنشئ حسابك مجاناً", desc: "تسجيل في 30 ثانية بالبريد الإلكتروني، بلا بطاقة ائتمان ولا رسوم." },
  { n: "02", title: "انضم أو أنشئ غرفة/مجموعة", desc: "ابحث عن مجموعة شعبتك أو أنشئ غرفة مع أصدقائك وابدأ المراجعة." },
  { n: "03", title: "تعلّم، شارك، وتقدّم", desc: "استخدم السبورة والصوت ومروة، واكسب النقاط لترقى في الترتيب." },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* الشريط العلوي */}
      <header className="bz-glass sticky top-0 z-50 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="BacZoneDZ" className="h-9 w-9 rounded-xl shadow-glow" />
          <span className="font-display text-xl font-extrabold">BacZone <span className="bz-gradient-text">DZ</span></span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden text-sm font-semibold text-text-muted hover:text-primary sm:block">دخول</Link>
          <Link href="/register" className="rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
            ابدأ مجاناً
          </Link>
        </div>
      </header>

      {/* الهيرو */}
      <section className="bz-cosmic-bg relative px-5 pb-24 pt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
          <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
          صُنعت في الجزائر خصيصاً لطلاب البكالوريا
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          ادرس أذكى، راجع أسرع،
          <br /><span className="bz-gradient-text">وانجح في البكالوريا</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-text-muted md:text-lg">
          منصّة تفاعلية شاملة: غرف دراسة بالصوت والسبورة، مجموعات المواد، مساعد ذكاء اصطناعي، وإنجازات تحفّزك يومياً — كل شيء مجاني وبدون إعلانات.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="flex items-center gap-2 rounded-md bg-gradient-primary px-7 py-3.5 font-bold text-white shadow-glow transition hover:opacity-90">
            ابدأ رحلتك الآن — مجاناً
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </Link>
          <Link href="/login" className="rounded-md border border-border bg-surface px-7 py-3.5 font-bold transition hover:bg-primary/10">
            دخول
          </Link>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-3">
          {badges.map((b) => (
            <div key={b.label} className="bz-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <FontAwesomeIcon icon={b.icon} className="h-4 w-4 text-primary" />
              {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* كيف تعمل */}
      <section className="px-5 py-16 bg-surface/50">
        <h2 className="text-center font-display text-3xl font-extrabold">
          ابدأ في <span className="bz-gradient-text">3 خطوات</span>
        </h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-xl border border-border bg-surface p-6 text-center">
              <span className="block font-display text-5xl font-extrabold text-primary/10">{s.n}</span>
              <h3 className="mt-2 font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* الميزات */}
      <section className="px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold">
          كل ما تحتاجه <span className="bz-gradient-text">للنجاح</span>
        </h2>
        <p className="mt-3 text-center text-text-muted">9 أدوات احترافية في مكان واحد</p>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="group rounded-xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-glass">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-white">
                <FontAwesomeIcon icon={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA نهائي */}
      <section className="relative overflow-hidden px-5 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">
            جاهز للانطلاق نحو <span className="bz-gradient-text">البكالوريا</span>؟
          </h2>
          <p className="mx-auto mt-4 max-w-md text-text-muted">
            انضم لآلاف الطلاب الجزائريين — التسجيل مجاني تماماً ولا يستغرق سوى 30 ثانية.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="flex items-center gap-2 rounded-md bg-gradient-primary px-8 py-4 text-lg font-bold text-white shadow-glow transition hover:opacity-90">
              <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
              سجّل الآن — مجاناً
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
            {["لا رسوم", "لا إعلانات", "لا بطاقة ائتمان"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-secondary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-text-muted">
        <p className="font-bold">BacZone <span className="bz-gradient-text">DZ</span></p>
        <p className="mt-1">© {new Date().getFullYear()} — مجاني 100% للطلاب الجزائريين 🇩🇿</p>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <Link href="/login" className="hover:text-primary">تسجيل الدخول</Link>
          <Link href="/register" className="hover:text-primary">تسجيل جديد</Link>
        </div>
      </footer>
    </main>
  );
}
