"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightToBracket, faUserPlus, faGraduationCap, faCalculator,
  faHouse, faBookOpen, faArrowLeft, faCheckCircle, faToolbox,
  faNewspaper, faCircleInfo, faEnvelope, faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { Brand } from "@/components/ui/brand";

/* ════════════════════════════════════════════════════════════
   غلاف الصفحات العامّة

   صفحات التخصّصات وحساب المعدّل تصل إليها من Google مباشرةً، وكانت
   **بلا هيدر إطلاقاً**: لا شعار، ولا طريق إلى بقيّة المنصّة، ولا
   بابٌ للتسجيل. من يقرأ مقالاً عن تخصّصه لا يعرف أنّ خلفه منصّة.

   وفي الوقت نفسه كانت `/courses` تعرض للزائر **هيدر مستخدم مسجّل**:
   جرس إشعارات وصورة حساب فارغة — يوهمه أنّه داخل حسابه.

   هنا هيدر واحد لكل ما هو عامّ: يعرف من أنت. زائرٌ يرى «دخول» و«إنشاء
   حساب»، ومسجَّلٌ يرى صورته وطريق العودة إلى منصّته.
   ════════════════════════════════════════════════════════════ */

const PUBLIC_NAV = [
  { href: "/courses", label: "الدورات", icon: faGraduationCap },
  { href: "/tools", label: "الأدوات", icon: faToolbox },
  { href: "/guides", label: "الأدلّة", icon: faFileLines },
  { href: "/specialties", label: "التخصّصات", icon: faBookOpen },
  { href: "/blog", label: "المدونة", icon: faNewspaper },
  { href: "/calculate", label: "حساب المعدّل", icon: faCalculator },
  { href: "/about", label: "عن BacZone", icon: faCircleInfo },
  { href: "/contact", label: "تواصل معنا", icon: faEnvelope },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const { settings } = useSiteSettings();

  return (
    <header className="bz-pubheader">
      <div className="mx-auto flex h-[58px] max-w-6xl items-center gap-2 px-3 sm:px-4 lg:h-16">
        <Brand href={user ? "/home" : "/"} size="sm" beta={false} className="shrink" />

        {/* تنقّل عامّ — يظهر من `md` فصاعداً */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname?.startsWith(n.href) ? "page" : undefined}
              className={`bz-pubnav ${pathname?.startsWith(n.href) ? "is-active" : ""}`}
            >
              <FontAwesomeIcon icon={n.icon} className="h-[15px] w-[15px]" />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          {/* أثناء تحديد الجلسة لا نعرض شيئاً: عرض «دخول» ثمّ استبداله
              بالصورة بعد لحظة وميضٌ مزعج ومربك. */}
          {loading ? (
            <span className="h-10 w-24 animate-pulse rounded-xl bg-border/60" aria-hidden />
          ) : user ? (
            <>
              <Link href="/home" className="bz-hcta-ghost inline-flex">
                <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">منصّتي</span>
              </Link>
              <Link href="/profile" aria-label="حسابي"
                className="shrink-0 rounded-full ring-2 ring-primary/20 transition hover:ring-primary/45">
                <LiveAvatar uid={user.uid} name={profile?.name || user.displayName || "ط"} size="sm" className="h-9 w-9" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="bz-hcta-ghost inline-flex">
                <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 -scale-x-100" />
                <span>دخول</span>
              </Link>
              <Link href="/register" className="bz-hcta inline-flex">
                <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إنشاء حساب</span>
                <span className="sm:hidden">حساب</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* تنقّل الهاتف: رفّ أفقي أسفل الشعار بدل إخفائه كلّياً */}
      <nav className="bz-pubrail md:hidden">
        {PUBLIC_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`bz-pubchip ${pathname?.startsWith(n.href) ? "is-active" : ""}`}
          >
            <FontAwesomeIcon icon={n.icon} className="h-3 w-3" />
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/* ── شريط الدعوة ──
   يظهر للزائر وحده أسفل المحتوى: من قرأ مقالاً كاملاً عن تخصّصه هو
   بالضبط من يستحقّ أن يُدعى. ولا يظهر لمن سجّل أصلاً — الدعوة
   المتكرّرة لمن استجاب إزعاج لا تسويق. */
export function PublicCta({
  title = "أنت الآن على بعد خطوة من منصّة كاملة",
  hint = "غرف مراجعة مباشرة، دورات من أساتذة، ملخّصات ومواضيع، وحاسبة معدّل — مجّاناً.",
}: { title?: string; hint?: string }) {
  const { user, loading } = useAuth();
  if (loading || user) return null;

  return (
    <section className="bz-pubcta">
      <div className="bz-pubcta-in">
        <div className="min-w-0 flex-1">
          <h2 className="bz-pubcta-t">{title}</h2>
          <p className="bz-pubcta-d">{hint}</p>
          <ul className="bz-pubcta-list">
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> بلا رسوم اشتراك</li>
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> يعمل على الهاتف</li>
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> محتوى جزائري ١٠٠٪</li>
          </ul>
        </div>
        <div className="bz-pubcta-act">
          <Link href="/register" className="bz-pubcta-btn">
            أنشئ حسابك مجّاناً
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
          </Link>
          <Link href="/login" className="bz-pubcta-alt">لديّ حساب — دخول</Link>
        </div>
      </div>
    </section>
  );
}
