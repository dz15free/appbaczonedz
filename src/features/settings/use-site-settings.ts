"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ─── نوع الإعدادات الكاملة للموقع ─── */
export interface LandingCard {
  id: string;
  icon: string;   // معرّف أيقونة أو إيموجي
  title: string;
  desc: string;
}

export interface LandingStep {
  id: string;
  n: string;      // رقم الخطوة "01"
  title: string;
  desc: string;
}

export interface HomeCard {
  id: string;
  icon: string;   // معرّف أيقونة أو إيموجي
  label: string;
  desc: string;
  href: string;
}

export interface SiteSettings {
  logoUrl?: string;           // رابط شعار مخصص (يُستبدل SVG الافتراضي)
  faviconUrl?: string;        // رابط favicon مخصص (أيقونة تبويب المتصفح)
  siteName?: string;          // اسم الموقع يظهر في الهيدر
  heroTitle?: string;         // عنوان الهيرو في الرئيسية
  heroSubtitle?: string;      // وصف الهيرو
  accentColor?: string;       // لون التمييز الأساسي hex
  footerText?: string;        // نص الفوتر
  footerLinks?: FooterLink[]; // روابط الفوتر
  maintenanceMode?: boolean;  // وضع الصيانة
  maintenanceMsg?: string;    // رسالة الصيانة
  bacExamDate?: string;       // تاريخ البكالوريا
  siteBanner?: { text: string; active: boolean }; // البانر
  allowRegistration?: boolean; // السماح بالتسجيل الجديد

  /* ── محتوى الصفحة الرئيسية (قبل التسجيل) ── */
  landingBadge?: string;          // الشارة أعلى الهيرو
  heroTitleLine1?: string;        // السطر الأول من عنوان الهيرو
  heroTitleLine2?: string;        // السطر الثاني (ملوّن)
  heroCtaPrimary?: string;        // نص الزر الأساسي
  heroCtaSecondary?: string;      // نص الزر الثانوي
  badges?: { id: string; icon: string; label: string }[]; // شارات المزايا السريعة
  stepsTitle?: string;            // عنوان قسم الخطوات
  steps?: LandingStep[];          // بطاقات الخطوات
  featuresTitle?: string;         // عنوان قسم المزايا
  featuresSubtitle?: string;      // وصف قسم المزايا
  features?: LandingCard[];       // بطاقات المزايا
  ctaTitle?: string;              // عنوان CTA النهائي
  ctaSubtitle?: string;           // وصف CTA النهائي
  ctaButton?: string;             // نص زر CTA

  /* ── محتوى صفحة "مرحباً بعودتك" (بعد الدخول) ── */
  homeWelcomeTitle?: string;      // "مرحباً بعودتك"
  homeWelcomeSubtitle?: string;   // النص أسفله
  homeCards?: HomeCard[];         // بطاقات الوصول السريع
}

export interface FooterLink { label: string; href: string }

const DEFAULTS: SiteSettings = {
  siteName: "BacZoneDZ",
  heroTitle: "ادرس بذكاء. ونجح في البكالوريا.",
  heroSubtitle: "غرف دراسة مباشرة، مساعدة ذكية، بطاقات مراجعة، ومجتمع طلابي نشط — كل ما تحتاجه في مكان واحد.",
  footerText: `© ${new Date().getFullYear()} BacZoneDZ. جميع الحقوق محفوظة.`,
  footerLinks: [
    { label: "الموقع الرئيسي", href: "https://www.baczonedz.com" },
    { label: "اتصل بنا", href: "https://www.baczonedz.com/p/contact.html" },
  ],
  maintenanceMode: false,
  allowRegistration: true,

  /* ── محتوى الصفحة الرئيسية ── */
  landingBadge: "صُنعت في الجزائر خصيصاً لطلاب البكالوريا",
  heroTitleLine1: "ادرس أذكى، راجع أسرع،",
  heroTitleLine2: "وانجح في البكالوريا",
  heroCtaPrimary: "ابدأ رحلتك الآن — مجاناً",
  heroCtaSecondary: "دخول",
  badges: [
    { id: "b1", icon: "gift", label: "مجاني 100%" },
    { id: "b2", icon: "ban", label: "بدون إعلانات" },
    { id: "b3", icon: "signal", label: "يعمل على 3G و4G" },
    { id: "b4", icon: "flag", label: "صُنعت في الجزائر 🇩🇿" },
  ],
  stepsTitle: "ابدأ في 3 خطوات",
  steps: [
    { id: "s1", n: "01", title: "أنشئ حسابك مجاناً", desc: "تسجيل في 30 ثانية بالبريد الإلكتروني، بلا بطاقة ائتمان ولا رسوم." },
    { id: "s2", n: "02", title: "انضم أو أنشئ غرفة/مجموعة", desc: "ابحث عن مجموعة شعبتك أو أنشئ غرفة مع أصدقائك وابدأ المراجعة." },
    { id: "s3", n: "03", title: "تعلّم، شارك، وتقدّم", desc: "استخدم السبورة والصوت والخباشة، واكسب النقاط لترقى في الترتيب." },
  ],
  featuresTitle: "كل ما تحتاجه للنجاح",
  featuresSubtitle: "أدوات احترافية في مكان واحد",
  features: [
    { id: "f1", icon: "chalkboard", title: "غرف دراسة تفاعلية", desc: "سبورة ذكية بأدوات الأستاذ، فيديو YouTube متزامن، دردشة جماعية، ورفع الملفات." },
    { id: "f2", icon: "microphone", title: "صوت جماعي احترافي", desc: "صوت جماعي شبيه بـ Discord يعمل على 3G/4G. الأستاذ يتحكّم في ميكروفونات الطلاب." },
    { id: "f3", icon: "layers", title: "مجموعات المواد", desc: "مجموعة لكل مادة أو شعبة فيها نقاش مستمر، قائمة أعضاء، وملفات مشتركة." },
    { id: "f4", icon: "folder", title: "مشاركة الملفات بـ Google Drive", desc: "ارفع ملفاتك PDF/Word/Excel/PPT واعرضها داخل المنصّة مباشرةً بلا تحميل." },
    { id: "f5", icon: "robot", title: "الخباشة — مساعدتك الآلية", desc: "يطرح أسئلة توضيحية، يضع خطط مراجعة مخصّصة حسب شعبتك، ويطمئنك ويشجّعك." },
    { id: "f6", icon: "trophy", title: "نظام إنجازات ومنافسة", desc: "نقاط على كل نشاط، مستويات متصاعدة، أوسمة، وترتيب يومي بين الطلاب." },
    { id: "f7", icon: "users", title: "مجتمع دراسي حقيقي", desc: "منشورات، تعليقات، صداقات، رسائل خاصّة، ومشاركة ملفات الدراسة." },
    { id: "f8", icon: "bell", title: "إشعارات فورية", desc: "يصلك إشعار على هاتفك فور وصول رسالة أو طلب صداقة حتى حين يكون التطبيق مغلقاً." },
    { id: "f9", icon: "clock", title: "مؤقّت بومودورو", desc: "ادرس بتركيز 25 دقيقة ثم استرح 5 دقائق. أثبتت الدراسات أنه يضاعف الإنتاجية." },
  ],
  ctaTitle: "جاهز للانطلاق نحو البكالوريا؟",
  ctaSubtitle: "انضم لآلاف الطلاب الجزائريين — التسجيل مجاني تماماً ولا يستغرق سوى 30 ثانية.",
  ctaButton: "سجّل الآن — مجاناً",

  /* ── محتوى مرحباً بعودتك ── */
  homeWelcomeTitle: "مرحباً بعودتك",
  homeWelcomeSubtitle: "ماذا تريد أن تفعل اليوم؟",
};

/* ─── Hook: قراءة الإعدادات الكاملة ─── */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return onValue(ref(rtdb, "settings"), (snap) => {
      const val = snap.val() as SiteSettings | null;
      setSettings({ ...DEFAULTS, ...(val ?? {}) });
      setLoaded(true);
    });
  }, []);

  return { settings, loaded };
}

/* ─── حفظ جزء من الإعدادات ─── */
export async function saveSiteSettings(partial: Partial<SiteSettings>) {
  await update(ref(rtdb, "settings"), partial);
}

/* ─── حفظ إعداد واحد ─── */
export async function saveSetting<K extends keyof SiteSettings>(
  key: K,
  value: SiteSettings[K]
) {
  await set(ref(rtdb, `settings/${key}`), value ?? null);
}
