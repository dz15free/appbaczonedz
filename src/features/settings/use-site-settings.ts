"use client";

import { DEFAULT_LOGO, DEFAULT_FAVICON } from "@/lib/brand-assets";
import { DEFAULTS } from "@/features/settings/site-settings-defaults";
export { DEFAULTS };
export { DEFAULT_LOGO, DEFAULT_FAVICON };
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

export interface FaqItem { id: string; q: string; a: string }

/* ════════════════════════════════════════════════════════════
   الشريط الجانبي للمدوّنة

   ⚠️ كان `blog-sidebar-admin.tsx` يستورد هذين النوعين من هنا ولم
   يكونا معرَّفين — فيفشل البناء عند فحص الأنواع.

   كل كتلة مستقلّة بذاتها: يمكن إخفاؤها بلا حذفها (`enabled`)،
   وترتيبها برقم لا بموضعها في المصفوفة — فالسحب والإفلات لا يُعيد
   بناء البيانات كلّها.

   ⚠️ و`html` يُحقن كما هو، وهو مقبول **لأنّ الكاتب هو مالك الموقع
   وحده** وقاعدة الكتابة تحصره بالأدمن. لا تُتِح هذا المسار لغيره.
   ════════════════════════════════════════════════════════════ */

export type BlogSidebarKind = "html" | "recent" | "labels" | "tools";

export interface BlogSidebarBlock {
  id: string;
  /** نوع الكتلة — `html` كتلة حرّة، والبقيّة كتل جاهزة */
  kind: BlogSidebarKind;
  title?: string;
  /** محتوى الكتلة الحرّة */
  html?: string;
  /** مخفيّة بلا حذف: التجربة بلا فقدان ما كتبته */
  enabled?: boolean;
  /** الأصغر أوّلاً */
  order?: number;
}

export interface BlogSidebarSettings {
  blocks?: BlogSidebarBlock[];
  /** يُخفي الشريط كلّه دون مسّ كتلِه */
  enabled?: boolean;
  /** فُرِّغ عمداً — Firebase يحذف المصفوفة الفارغة فلا نُميّزها بلا راية */
  cleared?: boolean;
}

export type SidebarPlacement = "global" | "blog" | "tools" | "guides";

export interface SidebarWidget {
  id: string;
  title?: string;
  html: string;
  css?: string;
  js?: string;
  enabled?: boolean;
  order?: number;
  placement?: SidebarPlacement;
}

export interface SidebarSettings {
  enabled?: boolean;
  widgets?: SidebarWidget[];
}

export type SidebarArticleMode = "latest" | "label";

export interface SidebarArticlesSettings {
  enabled?: boolean;
  mode?: SidebarArticleMode;
  label?: string;
  limit?: number;
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
  /* راية «فُرِّغت عمداً»: Firebase يحذف المصفوفة الفارغة، فبدونها لا
     نُميّز «حذف الأدمن كل الروابط» عن «لم تُضبط بعد» فتعود الافتراضية.
     ولا بدّ من تعريفها هنا وإلّا رفض `saveSetting` المفتاح (النوع
     `keyof SiteSettings`). */
  footerLinksCleared?: boolean;
  /** الشريط الجانبي للمدوّنة — يُحرَّر من لوحة الإدارة */
  blogSidebar?: BlogSidebarSettings;
  /** Widgets عامة قابلة للإدارة من لوحة الأدمن */
  sidebar?: SidebarSettings;
  /** مقالات منشورة مختارة تظهر بعد المصادر الإضافية في الشريط الجانبي */
  sidebarArticles?: SidebarArticlesSettings;
  /** إظهار بطاقة التواصل للإعلانات في الصفحة الرئيسية */
  advertiseEnabled?: boolean;
  maintenanceMode?: boolean;  // وضع الصيانة
  maintenanceMsg?: string;    // رسالة الصيانة
  bacExamDate?: string;       // تاريخ البكالوريا
  bacResultsDate?: string;    // تاريخ نتائج البكالوريا
  siteBanner?: { text: string; active: boolean }; // البانر
  allowRegistration?: boolean; // السماح بالتسجيل الجديد
  lessonsUrl?: string;         // رابط صفحة الدروس والملخّصات (خارجي)
  bacSimUrl?: string;          // رابط محاكاة البكالوريا (خارجي)

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
  audienceTitle?: string;         // عنوان قسم "لمن هذه المنصّة"
  audienceSubtitle?: string;
  audience?: LandingCard[];        // بطاقة للطالب وأخرى للأستاذ
  pricingTitle?: string;           // عنوان قسم التكلفة
  pricingNote?: string;            // شرح صريح لما هو مجاني وما هو مدفوع
  pricingRows?: { id: string; title: string; desc: string }[];
  faqTitle?: string;               // عنوان الأسئلة الشائعة
  faq?: FaqItem[];
  ctaTitle?: string;              // عنوان CTA النهائي
  ctaSubtitle?: string;           // وصف CTA النهائي
  ctaButton?: string;             // نص زر CTA

  /* ── محتوى صفحة "مرحباً بعودتك" (بعد الدخول) ── */
  homeWelcomeTitle?: string;      // "مرحباً بعودتك"
  homeWelcomeSubtitle?: string;   // النص أسفله
  homeCards?: HomeCard[];         // بطاقات الوصول السريع

  /* ── روابط التواصل الاجتماعي (قابلة للتعديل من الأدمن) ── */
  telegramUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  /* ── رابط التواصل للدفع (ميسنجر) ── */
  paymentUrl?: string;
  /* ── روابط الأقسام الخارجية ── */
  averageCalcUrl?: string;        // حاسبة المعدّل
  pastExamsUrl?: string;          // مواضيع وحلول سابقة
  weightedCalcUrl?: string;       // حاسبة المعدّل الموزون
  /* ── جهات التواصل للإعلانات ── */
  adsEmail?: string;
  adsWhatsapp?: string;
  /* ── إعلانات قابلة للتحكّم (HTML/صورة) حسب الموضع ── */
  ads?: Record<string, AdSlotConfig>;
}

export interface AdSlotConfig {
  enabled: boolean;
  type: "html" | "image";
  html?: string;        // كود HTML/AdSense
  imageUrl?: string;    // رابط الصورة
  linkUrl?: string;     // رابط عند الضغط (للصورة)
}

export interface FooterLink { label: string; href: string }

/* 🐛 **هنا كان سرّ «الأيقونة القديمة على أندرويد والجديدة على iPhone».**

   كان الافتراضيّ صورةً مستضافة على Blogger — وهي الشعار القديم:

     const LOGO_URL = "https://blogger.googleusercontent.com/.../BACZONEDZ (2).png"

   وصفحة الهبوط تأخذ `faviconUrl` وتكتبه في `<link rel="icon">` وقت
   التشغيل. فكانت النتيجة انقساماً بين النظامين لا صدفةً فيه:

   • أندرويد (Chrome) يأخذ أيقونة التبويب والاختصار من `rel="icon"` —
     أي من الصورة القديمة التي كتبها الجافاسكربت. ⇒ القديمة.
   • iOS يأخذ أيقونة الشاشة الرئيسية من `apple-touch-icon` ولا يمسّها
     ذلك الجافاسكربت إطلاقاً. ⇒ الجديدة.

   ولذلك صارت الافتراضيّات ملفّات `public` المحلّية: مصدر واحد للأيقونة
   على كل الأجهزة. ويبقى بإمكان الأدمن رفع شعار مخصّص من لوحة الإعدادات
   — الفرق أنّ الافتراضيّ لم يعد شعاراً قديماً على خادم غريب.

   وفائدة ثانية: الشعار لم يعد يُحمَّل من نطاق خارجي في أوّل رسم
   للصفحة، فلا يتعلّق ظهوره بخادم Blogger ولا بسرعته. */
/* الشعار يأتي من `@/lib/brand-assets` — الملفّ الوحيد الذي يعرّفه.

   كان مكتوباً بيده في ثلاثة ملفّات (`preloader.tsx` و`(auth)/layout.tsx`
   مرّتين) وبفواصل احتياطية متفرّقة في خمسة أخرى. ونتيجة ذلك المتوقّعة:
   بقي الشعار **القديم** في شاشة التحميل وفي صفحتَي الدخول والتسجيل بعد
   تغييره في بقيّة الموقع. أيّ توحيد لا يبدأ بمصدر واحد يُستورَد هو
   توحيد يُنقَض عند أوّل تعديل. */
const LOGO_URL = DEFAULT_LOGO;
const FAVICON_URL = DEFAULT_FAVICON;

/* تصحيح الشعار القديم المحفوظ في قاعدة البيانات.

   تغيير الافتراضيّ وحده لا يكفي: إن كان الشعار القديم قد **حُفظ** في
   `settings` من قبل (وهو الأرجح، فلوحة الأدمن تحفظ كل الحقول معاً)
   فالقيمة المحفوظة تغلب الافتراضيّ وتبقى الأيقونة القديمة على أندرويد
   إلى الأبد. فنُحيّد المصدر القديم وحده — أيّ شعار آخر يرفعه الأدمن
   يُحترم كما هو. */
const LEGACY_LOGO_HOST = "blogger.googleusercontent.com";

function normalizeBranding(s: SiteSettings): SiteSettings {
  const stale = (v?: string) => !v || v.includes(LEGACY_LOGO_HOST);
  return {
    ...s,
    logoUrl: stale(s.logoUrl) ? LOGO_URL : s.logoUrl,
    faviconUrl: stale(s.faviconUrl) ? FAVICON_URL : s.faviconUrl,
  };
}

/* ─── Hook: قراءة الإعدادات الكاملة ─── */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, "settings"), (snap) => {
      const val = snap.val() as SiteSettings | null;

      /* 🐛 **سبب عودة رابط الفوتر بعد حذفه.**

         حذف آخر رابط يجعل المصفوفة فارغة، **وFirebase لا يخزّن القيم
         الفارغة — يحذف المفتاح كلّه**. فتغيب `footerLinks` من القراءة،
         فيملأها الدمج من `DEFAULTS` ويعود «الموقع الرئيسي».

         وهذه علّة عامّة في هذا الدمج: أي إعداد يُفرَّغ عمداً يعود إلى
         افتراضيّه. فنُميّز **«محذوف عمداً»** عن **«لم يُضبط بعد»**
         براية صريحة، ونطبّقها على كل قائمة قابلة للتفريغ. */
      const merged = normalizeBranding({ ...DEFAULTS, ...(val ?? {}) }) as SiteSettings & {
        footerLinksCleared?: boolean;
      };
      const rawSidebar = (val as { sidebar?: SiteSettings["sidebar"] } | null)?.sidebar;
      const rawWidgets = rawSidebar?.widgets;
      const widgetList = Array.isArray(rawWidgets)
        ? rawWidgets
        : rawWidgets && typeof rawWidgets === "object"
          ? Object.values(rawWidgets)
          : [];
      merged.sidebar = {
        enabled: rawSidebar?.enabled === true,
        widgets: widgetList.filter((w): w is NonNullable<typeof w> => Boolean(w && typeof w === "object")) as SidebarWidget[],
      };
      if ((val as { footerLinksCleared?: boolean } | null)?.footerLinksCleared) {
        merged.footerLinks = [];
      }
      const rawArticles = (val as { sidebarArticles?: SiteSettings["sidebarArticles"] } | null)?.sidebarArticles;
      const rawLimit = Number(rawArticles?.limit ?? DEFAULTS.sidebarArticles?.limit ?? 4);
      merged.advertiseEnabled = (val as { advertiseEnabled?: boolean } | null)?.advertiseEnabled !== false;
      merged.sidebarArticles = {
        enabled: rawArticles?.enabled !== false,
        mode: rawArticles?.mode === "label" ? "label" : "latest",
        label: typeof rawArticles?.label === "string" ? rawArticles.label : "",
        limit: Number.isFinite(rawLimit) ? Math.min(8, Math.max(2, Math.round(rawLimit))) : 4,
      };
      setSettings(merged);
      setLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); };
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
