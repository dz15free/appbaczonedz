"use client";

import { DEFAULT_LOGO, DEFAULT_FAVICON } from "@/lib/brand-assets";
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

const DEFAULTS: SiteSettings = {
  siteName: "BacZone",
  logoUrl: LOGO_URL,
  faviconUrl: FAVICON_URL,
  heroTitle: "ادرس بذكاء. ونجح في البكالوريا.",
  heroSubtitle: "غرف دراسة مباشرة، مساعدة ذكية، بطاقات مراجعة، ومجتمع طلابي نشط — كل ما تحتاجه في مكان واحد.",
  footerText: `© ${new Date().getFullYear()} BacZoneDZ. جميع الحقوق محفوظة.`,
  /* «اتصل بنا» كان يخرج إلى المدوّنة (`baczonedz.com/p/contact.html`)
     مع أنّ للمنصّة صفحةً خاصّة بها الآن. والروابط القانونية لا تُكتب
     هنا: هي ثابتة في `legal-links.ts` ويرسمها الفوتر في صفٍّ لا يُحذف
     — فامتثال AdSense لا يجوز أن يتعلّق بألّا يحذف أحدٌ صفّاً سهواً. */
  footerLinks: [
    { label: "الموقع الرئيسي", href: "https://www.baczonedz.com" },
  ],
  maintenanceMode: false,
  allowRegistration: true,

  /* ── محتوى الصفحة الرئيسية ── */
  landingBadge: "صُنعت في الجزائر خصيصاً لطلاب البكالوريا",
  heroTitleLine1: "ادرس أذكى، راجع أسرع،",
  heroTitleLine2: "وانجح في البكالوريا",
  heroCtaPrimary: "أنشئ حسابك وابدأ",
  heroCtaSecondary: "دخول",
  badges: [
    { id: "b1", icon: "ban", label: "بدون إعلانات" },
    { id: "b2", icon: "signal", label: "يعمل على 3G و4G" },
    { id: "b3", icon: "users", label: "أساتذة وطلاب جزائريون" },
    { id: "b4", icon: "flag", label: "صُنعت في الجزائر 🇩🇿" },
  ],
  stepsTitle: "ابدأ في 3 خطوات",
  steps: [
    { id: "s1", n: "01", title: "أنشئ حسابك", desc: "تسجيل في 30 ثانية بالبريد الإلكتروني، ثم اختر شعبتك." },
    { id: "s2", n: "02", title: "انضم أو أنشئ غرفة/مجموعة", desc: "ابحث عن مجموعة شعبتك أو أنشئ غرفة مع أصدقائك وابدأ المراجعة." },
    { id: "s3", n: "03", title: "تعلّم، شارك، وتقدّم", desc: "استخدم السبورة والصوت والخباشة، واكسب النقاط لترقى في الترتيب." },
  ],
  audienceTitle: "لمن هذه المنصّة؟",
  audienceSubtitle: "تجربة مختلفة لكل دور",
  audience: [
    {
      id: "a1", icon: "users", title: "للطالب",
      desc: "احضر حصصاً مباشرة على سبورة تفاعلية، حلّ تحدّيات الأستاذ في مساحتك الخاصة، احفظ أي فكرة كبطاقة مراجعة بضغطة، واسأل دون أن يظهر اسمك. تابع تقدّمك وراجع بالبطاقات ومؤقّت التركيز.",
    },
    {
      id: "a2", icon: "chalkboard", title: "للأستاذ",
      desc: "أنشئ غرفة في ثوانٍ، اشرح على السبورة مع الصوت والملفات، اطرح تحدّياً وشاهد حلول كل الطلاب في لوحة واحدة، وأنهِ الحصة بملخّص تلقائي. انشر ملخّصاتك واحصل على تقييم طلابك.",
    },
  ],
  pricingTitle: "كم تكلّف؟",
  pricingNote: "إنشاء الحساب والمجتمع وأدوات المراجعة متاحة لكل الطلاب. أما الغرف والملخّصات التي يضعها الأساتذة فبعضها مدفوع بسعر يحدّده صاحبها، ويُفتح بكود وصول بعد الدفع.",
  pricingRows: [
    { id: "p1", title: "الحساب والمجتمع", desc: "التسجيل، المنشورات، الرسائل، الأصدقاء، والإشعارات." },
    { id: "p2", title: "أدوات المراجعة", desc: "بطاقات المراجعة، المهام، متتبّع الدراسة، ومؤقّت التركيز." },
    { id: "p3", title: "الغرف والملخّصات", desc: "منها المفتوح للجميع ومنها المدفوع بسعر يحدّده الأستاذ." },
  ],
  faqTitle: "أسئلة شائعة",
  faq: [
    { id: "q1", q: "هل أحتاج حاسوباً؟", a: "لا. المنصّة مصمّمة للهاتف أولاً، وتعمل على شبكات 3G و4G." },
    { id: "q2", q: "كيف أدفع مقابل غرفة أو ملخّص مدفوع؟", a: "تتواصل مع الإدارة داخل المنصّة عبر دردشة الدفع، ثم تحصل على كود وصول تُدخله ليُفتح المحتوى." },
    { id: "q3", q: "هل يمكنني أن أدرّس على المنصّة؟", a: "نعم. تواصل مع الإدارة لتفعيل حساب أستاذ، فتستطيع إنشاء الغرف ونشر الملخّصات." },
    { id: "q4", q: "ماذا يحدث لملاحظاتي بعد الحصة؟", a: "ما تحفظه أثناء الحصة يصبح بطاقات مراجعة في حسابك، ويصلك ملخّص الحصة إن نشره الأستاذ." },
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
  ctaSubtitle: "انضم إلى الطلاب والأساتذة الجزائريين — التسجيل لا يستغرق سوى 30 ثانية.",
  ctaButton: "سجّل الآن",

  /* ── محتوى مرحباً بعودتك ── */
  homeWelcomeTitle: "مرحباً بعودتك",
  homeWelcomeSubtitle: "ماذا تريد أن تفعل اليوم؟",

  /* ── روابط افتراضية ── */
  telegramUrl: "https://t.me/baczonedz",
  instagramUrl: "https://www.instagram.com/baczonedz",
  facebookUrl: "https://www.facebook.com/baczonedz",
  paymentUrl: "https://m.me/baczonedz1",
  averageCalcUrl: "https://www.baczonedz.com/p/blog-page_14.html",
  pastExamsUrl: "https://www.baczonedz.com/p/blog-page_9.html",
  weightedCalcUrl: "https://www.baczonedz.com/p/2026.html",
  adsEmail: "saidaouina22@gmail.com",
  adsWhatsapp: "+213657498876",
};

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
      if ((val as { footerLinksCleared?: boolean } | null)?.footerLinksCleared) {
        merged.footerLinks = [];
      }
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
