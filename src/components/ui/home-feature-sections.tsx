"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalculator, faFileLines, faArrowLeft, faChartLine, faScaleBalanced, faCalendarDays, faBullhorn, faBookOpen, faBell, faBellSlash, faGraduationCap, faCheck } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { isPushSupported, subscribePush } from "@/lib/push";
import { useAuth } from "@/features/auth/auth-provider";

/* أيقونات التواصل (SVG مضمّن — بلا حزم إضافية) */
function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}
function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* قسم حساب المعدّل + المواضيع السابقة — احترافي ومتحرّك */
export function FeatureCards() {
  const { settings } = useSiteSettings();
  const avgUrl = settings.averageCalcUrl || "https://www.baczonedz.com/p/blog-page_14.html";
  const pastUrl = settings.pastExamsUrl || "https://www.baczonedz.com/p/blog-page_9.html";
  const weightedUrl = settings.weightedCalcUrl || "https://www.baczonedz.com/p/2026.html";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* مواضيع وحلول سابقة (أولاً) */}
      <a href={pastUrl} target="_blank" rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-secondary/40 hover:shadow-glass">
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-secondary/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg transition group-hover:scale-110 group-hover:-rotate-3">
            <FontAwesomeIcon icon={faFileLines} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold">
              بكالوريات سابقة
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">مواضيع وحلول السنوات الماضية لكل الشُّعب</p>
          </div>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 shrink-0 text-text-muted transition group-hover:-translate-x-1 group-hover:text-secondary" />
        </div>
      </a>

      {/* حاسبة المعدّل */}
      <a href={avgUrl} target="_blank" rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass">
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg transition group-hover:scale-110 group-hover:rotate-3">
            <FontAwesomeIcon icon={faCalculator} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold">
              حساب معدّل البكالوريا
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">احسب معدّلك المتوقّع حسب الشعبة والمعاملات</p>
          </div>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 shrink-0 text-text-muted transition group-hover:-translate-x-1 group-hover:text-primary" />
        </div>
      </a>

      {/* حاسبة المعدّل الموزون */}
      <a href={weightedUrl} target="_blank" rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-glass">
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 text-white shadow-lg transition group-hover:scale-110 group-hover:rotate-3">
            <FontAwesomeIcon icon={faScaleBalanced} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold">
              حساب المعدّل الموزون
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">احسب معدّلك الموزون للجامعات والتخصّصات</p>
          </div>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 shrink-0 text-text-muted transition group-hover:-translate-x-1 group-hover:text-violet-500" />
        </div>
      </a>

      {/* مخطّط البكالوريا (بلانر) */}
      <Link href="/tools/planner"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-rose-400/40 hover:shadow-glass">
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-400 text-white shadow-lg transition group-hover:scale-110 group-hover:-rotate-3">
            <FontAwesomeIcon icon={faCalendarDays} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold">
              مخطّط البكالوريا للطباعة
              <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-500">جديد</span>
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">بلانر يومي احترافي جاهز للطباعة بأشكال متنوّعة</p>
          </div>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 shrink-0 text-text-muted transition group-hover:-translate-x-1 group-hover:text-rose-500" />
        </div>
      </Link>
    </div>
  );
}

/* قسم متابعتنا على وسائل التواصل */
export function SocialLinks() {
  const { settings } = useSiteSettings();
  const links = [
    { url: settings.telegramUrl, label: "تيليغرام", Icon: TelegramIcon, color: "from-sky-500 to-blue-500", hover: "hover:border-sky-400" },
    { url: settings.instagramUrl, label: "إنستغرام", Icon: InstagramIcon, color: "from-pink-500 via-rose-500 to-amber-400", hover: "hover:border-pink-400" },
    { url: settings.facebookUrl, label: "فيسبوك", Icon: FacebookIcon, color: "from-blue-600 to-indigo-500", hover: "hover:border-blue-400" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-extrabold">تابعنا وكن أوّل من يعرف</h3>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
            className={`group flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 transition hover:-translate-y-0.5 ${l.hover}`}>
            <span className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${l.color} text-white shadow-md transition group-hover:scale-110`}>
              <l.Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold">{l.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* بطاقة "أعلن معنا" */
export function AdvertiseCard() {
  const { settings } = useSiteSettings();
  const email = settings.adsEmail || "saidaouina22@gmail.com";
  const wa = (settings.adsWhatsapp || "+213657498876").replace(/[^\d]/g, "");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-l from-amber-400/10 to-orange-400/5 p-5">
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <FontAwesomeIcon icon={faBullhorn} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-extrabold">أعلن معنا 📢</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">وصّل علامتك التجارية لآلاف طلاب البكالوريا</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <a href={`mailto:${email}?subject=${encodeURIComponent("طلب إعلان على BacZone")}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 py-2.5 text-xs font-bold text-white transition hover:opacity-90">
            ✉️ راسلنا بالإيميل
          </a>
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent("مرحباً، أريد الإعلان على BacZone")}`} target="_blank" rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white transition hover:opacity-90">
            💬 واتساب
          </a>
        </div>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   بطاقات بارزة أعلى الرئيسية — وصول سريع لأهمّ الوجهات
   (دروس وملخّصات، المكتبة، الإشعارات، تيليغرام)

   لا تحذف شيئاً من الرئيسية — تُضاف فوق المحتوى الحالي.
   الروابط الخارجية قابلة للتهيئة من الإعدادات مع قيم احتياطية.
════════════════════════════════════════════════════════════ */
export function HomeHighlightCards() {
  const { settings } = useSiteSettings();
  const { user } = useAuth();

  const lessonsUrl = settings.lessonsUrl || "https://www.baczonedz.com/p/blog-page_33.html";
  const telegramUrl = settings.telegramUrl || "https://t.me/baczonedz";

  const [notifState, setNotifState] = useState<"idle" | "on" | "unsupported">("idle");
  useEffect(() => {
    if (!isPushSupported()) { setNotifState("unsupported"); return; }
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") setNotifState("on");
    } catch { /* تجاهل */ }
  }, []);

  async function enableNotifications() {
    if (!user || notifState === "on") return;
    const ok = await subscribePush(user.uid);
    if (ok) setNotifState("on");
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* دروس وملخّصات */}
      <a
        href={lessonsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass"
      >
        <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex flex-col items-start gap-2.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg transition group-hover:scale-110 group-hover:-rotate-3">
            <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-sm font-extrabold">دروس وملخّصات</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-text-muted">ملخّصات ودروس منظّمة لكل الشُّعب</p>
          </div>
        </div>
      </a>

      {/* المكتبة */}
      <Link
        href="/library"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-glass"
      >
        <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex flex-col items-start gap-2.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg transition group-hover:scale-110 group-hover:rotate-3">
            <FontAwesomeIcon icon={faBookOpen} className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-sm font-extrabold">المكتبة</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-text-muted">ملخّصات الطلبة والأساتذة في مكان واحد</p>
          </div>
        </div>
      </Link>

      {/* تفعيل الإشعارات */}
      <button
        onClick={enableNotifications}
        disabled={notifState !== "idle"}
        className={`group relative overflow-hidden rounded-2xl border p-4 text-right transition hover:-translate-y-1 hover:shadow-glass ${
          notifState === "on" ? "border-secondary/40 bg-secondary/5" : "border-border bg-surface hover:border-amber-400/40"
        } disabled:hover:translate-y-0`}
      >
        <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex flex-col items-start gap-2.5">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition group-hover:scale-110 ${
            notifState === "on" ? "bg-gradient-to-br from-emerald-500 to-teal-400" : "bg-gradient-to-br from-amber-500 to-orange-500"
          }`}>
            <FontAwesomeIcon icon={notifState === "unsupported" ? faBellSlash : notifState === "on" ? faCheck : faBell} className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-sm font-extrabold">
              {notifState === "on" ? "الإشعارات مفعّلة" : notifState === "unsupported" ? "الإشعارات" : "فعّل الإشعارات"}
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
              {notifState === "on" ? "ستصلك آخر المستجدّات فوراً" : notifState === "unsupported" ? "غير مدعومة على هذا المتصفّح" : "كن أوّل من يعرف الجديد"}
            </p>
          </div>
        </div>
      </button>

      {/* انضمّ لتيليغرام */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-glass"
      >
        <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-sky-500/10 blur-2xl transition group-hover:scale-150" />
        <div className="relative flex flex-col items-start gap-2.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg transition group-hover:scale-110 group-hover:-rotate-3">
            <TelegramIcon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-sm font-extrabold">انضمّ لتيليغرام</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-text-muted">قناتنا: كل جديد أوّلاً بأوّل</p>
          </div>
        </div>
      </a>
    </div>
  );
}
