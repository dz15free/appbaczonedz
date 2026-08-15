"use client";

import Link from "next/link";
import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faChalkboardUser, faGraduationCap, faBookOpen, faRobot, faUsers, faPeopleGroup,
  faClipboardCheck, faFileLines, faCalculator, faScaleBalanced, faArrowLeft,
  faCompass, faShareNodes, faBullhorn, faAnglesDown, faPaperPlane, faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings } from "@/features/settings/use-site-settings";

/* ════════════════════════════════════════════════════════════
   الوصول السريع — كل الوجهات في مكان واحد

   كانت الوجهات مبعثرة في ثلاثة أقسام أسفل الصفحة: «وجهات مهمّة»
   و«بطاقات المزايا» و«مصادر إضافية». ثلاثة عناوين وثلاثة تصاميم
   لشيء واحد — والطالب لا يصل إليها أصلاً بعد أن تكثر المنشورات.

   الآن كتلة واحدة أعلى الصفحة بثلاث طبقات واضحة:
     ١. **أقسام المنصّة** — أيقونات، ما تعيش داخله يومياً.
     ٢. **وجهات البكالوريا** — دروس ومواضيع، بكالوريات سابقة،
        الحاسبتان، محاكاة البكالوريا، التخصّصات، وقناة تيليغرام.
        شبكة واحدة بلغة واحدة.

   والتخطيط عمود واحد على الهاتف وعمودان من `sm` وثلاثة من `xl`،
   فلا يتكسّر شيء بين ٣٢٠px وشاشة عريضة.
   ════════════════════════════════════════════════════════════ */

/* ── أقسام المنصّة ── */
const SECTIONS = [
  { href: "/rooms", label: "غرف الدراسة", icon: faChalkboardUser, tone: "indigo" },
  { href: "/courses", label: "الدورات", icon: faGraduationCap, tone: "blue" },
  { href: "/library", label: "المكتبة", icon: faBookOpen, tone: "emerald" },
  { href: "/aibot", label: "الخباشة", icon: faRobot, tone: "violet" },
  { href: "/community", label: "المجتمع", icon: faUsers, tone: "sky" },
  { href: "/groups", label: "المجموعات", icon: faPeopleGroup, tone: "teal" },
] as const;

/* ── أزرار القفز إلى أقسام ذيل الصفحة (هاتف) ── */
const JUMPS: { id: string; label: string; icon: IconDefinition; studentOnly: boolean }[] = [
  { id: "bz-res", label: "مصادر إضافية", icon: faCompass, studentOnly: false },
  { id: "bz-tools", label: "أدوات الباكلوريا", icon: faListCheck, studentOnly: true },
  { id: "bz-social", label: "تابعنا", icon: faShareNodes, studentOnly: false },
  { id: "bz-ads", label: "أعلن معنا", icon: faBullhorn, studentOnly: false },
];
interface Dest {
  key: string;
  href: string;
  label: string;
  desc: string;
  icon: IconDefinition;
  tone: string;
  external?: boolean;
}

/* ── شبكة الأقسام ── */
const SectionsRow = memo(function SectionsRow() {
  return (
    <div className="bz-qa-sections">
      {SECTIONS.map((s) => (
        <Link key={s.href} href={s.href} className="bz-qa-sec" data-tone={s.tone}>
          <span className="bz-qa-sec-ic">
            <FontAwesomeIcon icon={s.icon} className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
          </span>
          <span className="bz-qa-sec-l">{s.label}</span>
        </Link>
      ))}
    </div>
  );
});

/* بطاقة المحاكاة لم تبقَ شكلاً خاصّاً: صارت بطاقة وجهة مثل بقيّة
   البطاقات وموضعها بعد «حساب معدّل البكالوريا» — فالقسم كلّه بلغة
   واحدة، وهو ما يجعله يبدو مصنوعاً لا مجموعاً. */

/* ── بطاقة وجهة ── */
function DestCard({ d }: { d: Dest }) {
  const inner = (
    <>
      <span className="bz-qa-ic" data-tone={d.tone}>
        <FontAwesomeIcon icon={d.icon} className="h-[19px] w-[19px]" />
      </span>
      <span className="bz-qa-txt">
        <span className="bz-qa-t">{d.label}</span>
        <span className="bz-qa-d">{d.desc}</span>
      </span>
      <FontAwesomeIcon icon={faArrowLeft} className="bz-qa-arrow h-3.5 w-3.5" />
    </>
  );
  return d.external ? (
    <a href={d.href} target="_blank" rel="noopener noreferrer" className="bz-qa-card">{inner}</a>
  ) : (
    <Link href={d.href} className="bz-qa-card">{inner}</Link>
  );
}

/* ── أزرار القفز ── */
function JumpRow({ isTeacher, showAdvertise }: { isTeacher: boolean; showAdvertise: boolean }) {
  const items = JUMPS.filter((j) => (!j.studentOnly || !isTeacher) && (j.id !== "bz-ads" || showAdvertise));
  return (
    <div className="bz-jumps lg:hidden" aria-label="انتقال سريع لأقسام الصفحة">
      {items.map((j) => (
        <a key={j.id} href={`#${j.id}`} className="bz-jump">
          <FontAwesomeIcon icon={j.icon} className="h-3 w-3" />
          <span>{j.label}</span>
          <FontAwesomeIcon icon={faAnglesDown} className="h-2.5 w-2.5 opacity-55" />
        </a>
      ))}
    </div>
  );
}

export function QuickAccess({ isTeacher }: { isTeacher: boolean }) {
  const { settings } = useSiteSettings();

  /* الروابط كلّها من إعدادات الأدمن، والافتراضي هو الرابط القائم —
     فلا يتغيّر شيء عمّا كان يعمل، ويبقى تحكّمه كاملاً. */
  const dests: Dest[] = [
    {
      key: "lessons",
      href: settings.lessonsUrl || "https://www.baczonedz.com/p/blog-page_33.html",
      label: "دروس ومواضيع",
      desc: "ملخّصات ومواضيع مُصحَّحة لكل الشُّعب",
      icon: faGraduationCap, tone: "indigo", external: true,
    },
    {
      key: "past",
      href: settings.pastExamsUrl || "https://www.baczonedz.com/p/blog-page_9.html",
      label: "بكالوريات سابقة",
      desc: "مواضيع وحلول السنوات الماضية",
      icon: faFileLines, tone: "emerald", external: true,
    },
    {
      key: "avg",
      href: settings.averageCalcUrl || "/calculate",
      label: "حساب معدّل البكالوريا",
      desc: "معدّلك المتوقّع حسب الشعبة والمعاملات",
      icon: faCalculator, tone: "blue",
      external: /^https?:\/\//i.test(settings.averageCalcUrl || ""),
    },
    {
      key: "sim",
      href: settings.bacSimUrl || "/tools/exam-simulator",
      label: "محاكاة البكالوريا",
      desc: "امتحان بتوقيت رسمي ومواضيع حقيقية",
      icon: faClipboardCheck, tone: "rose", external: true,
    },
    {
      key: "weighted",
      href: settings.weightedCalcUrl || "https://www.baczonedz.com/p/2026.html",
      label: "حساب المعدّل الموزون",
      desc: "معدّلك الموزون للجامعات والتخصّصات",
      icon: faScaleBalanced, tone: "violet", external: true,
    },
    {
      key: "specialties",
      href: "/specialties",
      label: "التخصّصات الجامعية",
      desc: "اعرف تخصّصك قبل أن تملأ رغباتك",
      icon: faCompass, tone: "amber",
    },
    {
      key: "telegram",
      href: settings.telegramUrl || "https://t.me/baczonedz",
      label: "انضمّ لقناتنا",
      desc: "كل جديد أوّلاً بأوّل على تيليغرام",
      icon: faPaperPlane, tone: "sky", external: true,
    },
  ];

  return (
    <div className="bz-qa">
      <SectionsRow />
      <div className="bz-qa-grid">
        {dests.map((d) => <DestCard key={d.key} d={d} />)}
      </div>
      <JumpRow isTeacher={isTeacher} showAdvertise={settings.advertiseEnabled !== false} />
    </div>
  );
}
