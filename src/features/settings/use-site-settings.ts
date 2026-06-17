"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ─── نوع الإعدادات الكاملة للموقع ─── */
export interface SiteSettings {
  logoUrl?: string;           // رابط شعار مخصص (يُستبدل SVG الافتراضي)
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
