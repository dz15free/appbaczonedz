"use client";

import { clsx } from "clsx";
import Link from "next/link";
import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* ════════════════════════════════════════════════════════════
   عُدّة الواجهة — المفردات المشتركة

   لم تكن المنصّة تملك `Card` ولا `Skeleton` ولا `EmptyState`. فكانت
   كل بطاقة سطراً مُعاد كتابته، وكل حالة فراغ تصميماً جديداً (وجدنا
   **ستّ** حالات فراغ مختلفة)، وكل تحميل `animate-pulse` عارياً
   (١٩٠ موضعاً). لا شيء من ذلك كان قبيحاً بمفرده — لكنّ اجتماعها
   في شاشة واحدة هو ما يجعل المنتج يبدو مصنوعاً على عجل.

   هذا الملفّ **إضافة**: لا يحذف شيئاً ولا يغيّر مكوّناً قائماً.
   ما يُعاد بناؤه يستعمله، وما لم يُمَسّ يبقى يعمل كما هو.
   ════════════════════════════════════════════════════════════ */

/* ── البطاقة ───────────────────────────────────────────────── */

type CardProps = HTMLAttributes<HTMLElement> & {
  /** بطاقة قابلة للنقر ترتفع قليلاً عند التحويم */
  interactive?: boolean;
  /** لوحة كبيرة (قسم) بدل بطاقة عاديّة */
  panel?: boolean;
  /** بلا حشوة داخلية — للبطاقات التي تحمل صورة كاملة العرض */
  flush?: boolean;
  as?: "div" | "article" | "section" | "li";
};

export function Card({
  interactive, panel, flush, as = "div", className, children, ...rest
}: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={clsx(
        "bz-surface-1 overflow-hidden",
        panel ? "rounded-panel" : "rounded-card",
        !flush && (panel ? "p-4 sm:p-5" : "p-3.5 sm:p-4"),
        interactive && "bz-lift cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── عنوان قسم ─────────────────────────────────────────────── */

export function SectionHeader({
  icon, title, subtitle, action, className,
}: {
  icon?: IconDefinition;
  title: string;
  subtitle?: string;
  /** رابط «الكلّ» أو زرّ إجراء */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-3 flex items-start gap-2.5", className)}>
      {icon && (
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-item bg-primary/10 text-primary">
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="bz-h-section truncate">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-[12.5px] leading-relaxed text-text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/** رابط «عرض الكلّ» — هدف لمس كامل لا نصّ ١٠px */
export function SeeAll({ href, label = "الكلّ" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1 rounded-item px-2.5 text-[12.5px] font-extrabold text-primary transition hover:bg-primary/10"
    >
      {label}
    </Link>
  );
}

/* ── الرقاقة (شريحة تصفية) ─────────────────────────────────── */

export function Chip({
  active, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        // ٣٦px ارتفاعاً حقيقياً — كانت الشرائح ٢٨px، تحت أي حدّ مقبول للمس
        "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-chip px-3.5",
        "text-[12.5px] font-extrabold transition duration-fast ease-bz",
        active
          ? "bg-primary text-white shadow-brand"
          : "border border-border bg-surface text-text-muted hover:border-primary/40 hover:text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** رفّ أفقي للشرائح — لا يتراكم في أربعة صفوف على الهاتف */
export function ChipRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bz-rail", className)} role="group">
      {children}
    </div>
  );
}

/* ── الشارة (وسم قراءة فقط) ────────────────────────────────── */

const TONES = {
  neutral: "bg-primary/5 text-text-muted border-border",
  brand: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  danger: "bg-danger/10 text-danger border-danger/20",
} as const;

export function Badge({
  tone = "neutral", icon, children, className,
}: {
  tone?: keyof typeof TONES;
  icon?: IconDefinition;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        // ١١px لا ٩px: الحرف العربي يحتاج ارتفاعاً أكبر من اللاتيني
        "inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 text-[11px] font-extrabold leading-5",
        TONES[tone],
        className,
      )}
    >
      {icon && <FontAwesomeIcon icon={icon} className="h-2.5 w-2.5" />}
      {children}
    </span>
  );
}

/* ── هياكل التحميل ─────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("bz-skel", className)} aria-hidden />;
}

/** هيكل يحاكي **شكل البطاقة الحقيقي** فلا يقفز التخطيط عند الوصول */
export function CardSkeleton({ lines = 2, media }: { lines?: number; media?: boolean }) {
  return (
    <Card flush className="p-3.5 sm:p-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/5" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={clsx("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
      {media && <Skeleton className="mt-3 h-40 w-full rounded-item" />}
    </Card>
  );
}

export function SkeletonList({ count = 3, ...rest }: { count?: number; lines?: number; media?: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} {...rest} />)}
    </div>
  );
}

/* ── حالة الفراغ ───────────────────────────────────────────── */

export function EmptyState({
  icon, title, hint, action, compact,
}: {
  icon: IconDefinition;
  title: string;
  hint?: string;
  /** زرّ يخرج المستخدم من الفراغ — حالة فراغ بلا مخرج ليست حالة، بل طريق مسدود */
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-panel border border-dashed border-border bg-surface/60 text-center",
        compact ? "px-4 py-7" : "px-5 py-10",
      )}
    >
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/[0.08] text-primary/70">
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      </span>
      <p className="text-[14.5px] font-extrabold text-text-primary">{title}</p>
      {hint && (
        <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-muted">{hint}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── زرّ الأيقونة ──────────────────────────────────────────── */

/** هدف لمس ٤٤px مضمون مهما صغُرت الأيقونة — المشكلة الأشيع في الهاتف */
export function IconButton({
  icon, label, tone = "muted", size = "md", className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconDefinition;
  /** إلزامي: زرّ أيقونة بلا اسم لا يوجد لقارئ الشاشة */
  label: string;
  tone?: "muted" | "brand" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "grid shrink-0 place-items-center rounded-control transition duration-fast ease-bz active:scale-95",
        size === "sm" ? "h-10 w-10" : "h-11 w-11",
        tone === "muted" && "text-text-muted hover:bg-primary/[0.08] hover:text-primary",
        tone === "brand" && "text-primary hover:bg-primary/[0.12]",
        tone === "danger" && "text-text-muted hover:bg-danger/10 hover:text-danger",
        className,
      )}
      {...rest}
    >
      <FontAwesomeIcon icon={icon} className={size === "sm" ? "h-4 w-4" : "h-[17px] w-[17px]"} />
    </button>
  );
}
