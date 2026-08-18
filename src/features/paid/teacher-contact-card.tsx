"use client";

import { useEffect, useState } from "react";
import { listenTeacherContact, type TeacherContact, type TeacherContactVisibility } from "@/features/paid/teacher-sales";

/* ════════════════════════════════════════════════════════════
   عرض وسائل تواصل الأستاذ

   🐛 **سبب اختفاء الرابط**: بنيت المحرّر ولم أبنِ العرض إطلاقاً — كان
   الأستاذ يحفظ رابطه ولا يظهر لأحد. هذا الملفّ هو الجزء الناقص.

   **قواعد الظهور** — تُطبَّق في مكان واحد فلا تتناقض:
   • عامّة  → يراها كل من يفتح صفحته.
   • خاصّة → **الإدارة وحدها**، ولا تظهر للطالب ولا للأستاذ الآخر.
   • صاحب الحساب يرى بياناته دائماً (وإلّا ظنّ أنّها لم تُحفظ).

   وكل شبكة بشعارها ولونها: الأيقونة تُقرأ قبل النصّ، والطالب يميّز
   فيسبوك من تيليغرام بلمحة.
════════════════════════════════════════════════════════════ */

export type ContactKey = "phone" | "facebook" | "instagram" | "telegram" | "whatsapp" | "youtube" | "website";

export const CONTACT_META: Record<ContactKey, {
  label: string;
  color: string;
  placeholder: string;
  /** مسار الشعار داخل 24×24 */
  path: string;
  /** الشعارات مملوءة لا محدّدة — هكذا تُعرف */
  filled?: boolean;
}> = {
  phone: {
    label: "الهاتف", color: "#1E8A5F", placeholder: "0X XX XX XX XX", filled: true,
    path: "M6.6 2.9c.5-.4 1.2-.3 1.6.2l1.9 2.6c.3.5.3 1.1-.1 1.5L8.7 8.5c-.3.3-.4.7-.2 1a10 10 0 0 0 6 6c.4.2.8 0 1-.2l1.3-1.3c.4-.4 1-.4 1.5-.1l2.6 1.9c.5.4.6 1.1.2 1.6l-1.2 1.4c-.6.7-1.6 1-2.5.7A18 18 0 0 1 4.5 6.6c-.3-.9 0-1.9.7-2.5z",
  },
  facebook: {
    label: "فيسبوك", color: "#1877F2", placeholder: "facebook.com/…", filled: true,
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
  },
  instagram: {
    label: "إنستغرام", color: "#E1306C", placeholder: "instagram.com/…",
    path: "M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3z M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z M17.3 6.9v.01",
  },
  telegram: {
    label: "تيليغرام", color: "#2AABEE", placeholder: "t.me/…", filled: true,
    path: "M21.6 4.3 18.4 19c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.4-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.6 12.8 2 11.4c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.4 1.3z",
  },
  whatsapp: {
    label: "واتساب", color: "#25D366", placeholder: "wa.me/213…", filled: true,
    path: "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.3 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a12 12 0 0 1-5.9-5.2c-.4-.7-.7-1.5-.7-2.2 0-.8.4-1.5.8-1.8.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6a8 8 0 0 0 3.6 3.1c.3.1.5.1.7-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.4z",
  },
  youtube: {
    label: "يوتيوب", color: "#FF0000", placeholder: "youtube.com/@…", filled: true,
    path: "M22.5 7.2a2.7 2.7 0 0 0-1.9-1.9C18.9 4.8 12 4.8 12 4.8s-6.9 0-8.6.5A2.7 2.7 0 0 0 1.5 7.2 28 28 0 0 0 1 12a28 28 0 0 0 .5 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 8.6.5 8.6.5s6.9 0 8.6-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 23 12a28 28 0 0 0-.5-4.8zM9.8 15.3V8.7l5.7 3.3z",
  },
  website: {
    label: "موقع", color: "#5A6274", placeholder: "example.com",
    path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21 M12 3C9.5 5.5 8.2 8.6 8.2 12S9.5 18.5 12 21",
  },
};

export const CONTACT_ORDER: ContactKey[] = [
  "phone", "facebook", "instagram", "telegram", "whatsapp", "youtube", "website",
];

export function ContactIcon({ k, size = 18 }: { k: ContactKey; size?: number }) {
  const m = CONTACT_META[k];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false"
      fill={m.filled ? "currentColor" : "none"}
      stroke={m.filled ? "none" : "currentColor"}
      strokeWidth={m.filled ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={m.path} />
    </svg>
  );
}

/** الرابط الذي يُفتح فعلاً — الهاتف يفتح المتّصل لا المتصفّح */
export function hrefFor(k: ContactKey, value: string): string {
  const v = value.trim();
  if (k === "phone") return `tel:${v.replace(/\s+/g, "")}`;
  if (k === "whatsapp" && /^[+\d\s]+$/.test(v)) {
    return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  }
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function normalizedVisibility(value: TeacherContactVisibility | undefined): "admin" | "students" | "all" {
  if (value === "public" || value === "all") return "all";
  if (value === "students") return "students";
  return "admin";
}

export function TeacherContactCard({
  uid, viewerUid, viewerIsAdmin, viewerRole,
}: {
  uid: string;
  viewerUid?: string;
  viewerIsAdmin?: boolean;
  viewerRole?: string;
}) {
  const [c, setC] = useState<TeacherContact | null>(null);

  useEffect(() => {
    const unsub = listenTeacherContact(uid, setC);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  if (!c) return null;

  const isOwner = Boolean(viewerUid && viewerUid === uid);
  const visibility = normalizedVisibility(c.visibility);
  const canView = isOwner || viewerIsAdmin || visibility === "all" || (visibility === "students" && viewerRole === "student");
  // قرار الظهور في مكان واحد فلا يتناقض بين الأسطح
  if (!canView) return null;

  const items = (c.links ?? [])
    .map((l) => ({ k: (l.label as ContactKey), url: l.url }))
    .filter((x) => x.url && CONTACT_META[x.k]);

  if (c.phone) items.unshift({ k: "phone", url: c.phone });
  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-4 max-w-md px-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-extrabold">تواصل مع الأستاذ</h2>
            <p className="mt-1 text-[10.5px] text-text-muted">اختر الوسيلة المناسبة للتواصل معه خارج المنصّة.</p>
          </div>
          {isOwner && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
              {visibility === "admin" ? "للإدارة" : visibility === "students" ? "للطلاب" : "للجميع"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((x, i) => {
            const m = CONTACT_META[x.k];
            return (
              <a
                key={`${x.k}-${i}`}
                href={hrefFor(x.k, x.url)}
                target={x.k === "phone" ? undefined : "_blank"}
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border p-2.5 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ borderColor: `${m.color}33` }}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${m.color}1A`, color: m.color }}
                >
                  <ContactIcon k={x.k} size={17} />
                </span>
                <span className="min-w-0 flex-1 text-xs font-bold">{m.label}</span>
              </a>
            );
          })}
        </div>

        <p className="mt-2.5 text-[10.5px] leading-relaxed text-text-muted">
          يمكنك أيضاً مراسلته داخل المنصّة مباشرة.
        </p>
      </div>
    </section>
  );
}
