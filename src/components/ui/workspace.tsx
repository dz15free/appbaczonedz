"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   عناصر قشرة مساحة الدراسة (Study Workspace)

   قواعد مأخوذة حرفياً من ملاحظاتك:
   • لا نزيد عدد الأزرار الظاهرة — نغيّر طريقة ظهورها.
   • شريط جانبي **واحد** بتبويبات، لا أربع قوائم.
   • الأدوات الثانوية داخل قوائم، والأدوات تختفي حتى يحتاجها المستخدم.
   • الهاتف أوّلاً: كل شيء في متناول الإبهام، ولا أدوات مهمّة في الأعلى.

   كلّها مكوّنات عرض خالصة بلا حالة عالمية، فيمكن إعادة استعمالها
   في الغرفة ووضع التركيز ووضع الامتحان دون تكرار.
════════════════════════════════════════════════════════════ */

/* ─── الشريط العلوي ─────────────────────────────────────── */

export function WorkspaceBar({ children }: { children: ReactNode }) {
  return (
    /* `min-w-0` + `overflow-x-auto`: الشريط يمرّر أفقياً عند الضيق بدل
       أن يفرض عرضه على الصفحة. وبدونهما كان يكسر التخطيط كلّه. */
    <div className="bz-hide-scrollbar flex h-12 w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--bz-line)] bg-[var(--bz-surface,#fff)] px-2.5 sm:px-3.5">
      {children}
    </div>
  );
}

export function WorkspaceTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[13.5px] font-extrabold leading-tight text-[var(--bz-ink)]">{title}</div>
      {subtitle && (
        <div className="truncate text-[10.5px] leading-tight text-[var(--bz-ink-3)]">{subtitle}</div>
      )}
    </div>
  );
}

export function LiveBadge({ label = "مباشر" }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--bz-red-050,#FDEEED)] px-2 py-[3px] text-[10.5px] font-bold text-[var(--bz-red)]">
      <span className="bz-live-pulse block h-[5px] w-[5px] rounded-full bg-[var(--bz-red)]" />
      {label}
    </span>
  );
}

/** ساعة أحادية العرض حتى لا يرتجّ الشريط كل ثانية */
export function WorkspaceClock({ text }: { text: string }) {
  return (
    <span className="shrink-0 rounded-lg border border-[var(--bz-line)] bg-[var(--bz-canvas)] px-2 py-[3px] font-mono text-[11.5px] tabular-nums text-[var(--bz-ink)]">
      {text}
    </span>
  );
}

export interface BarButtonProps {
  icon?: IconName;
  label?: string;
  /** إخفاء التسمية على الشاشات الضيّقة مع إبقائها لقارئ الشاشة */
  hideLabelOnMobile?: boolean;
  tone?: "default" | "primary" | "danger";
  active?: boolean;
  badge?: number;
  title?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function BarButton({
  icon, label, hideLabelOnMobile = true, tone = "default",
  active = false, badge, title, disabled, onClick,
}: BarButtonProps) {
  const base =
    "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-semibold transition disabled:opacity-40";
  const tones =
    tone === "primary"
      ? "border-[var(--bz-blue)] bg-[var(--bz-blue)] text-white hover:brightness-110"
      : tone === "danger"
        ? "border-[#F3C9C6] bg-[var(--bz-red-050,#FDEEED)] text-[var(--bz-red)] hover:brightness-95"
        : active
          ? "border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
          /* الخلفية هنا **canvas** لا surface: الشريط نفسه أبيض، فزرّ أبيض
             عليه يختفي ولا يفصله إلا حدّ باهت — وهو ما جعل «إجراءات
             الحصة» يبدو غير موجود. */
          : "border-[var(--bz-line)] bg-[var(--bz-canvas)] text-[var(--bz-ink-2)] hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue-700)] hover:border-[var(--bz-blue-100)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active || undefined}
      className={`${base} ${tones}`}
    >
      {icon && <Icon name={icon} size={13} />}
      {label && <span className={hideLabelOnMobile ? "hidden sm:inline" : ""}>{label}</span>}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full border-2 border-[var(--bz-surface,#fff)] bg-[var(--bz-red)] px-[3px] text-[8.5px] font-extrabold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/* ─── مبدّل حالات الغرفة ─────────────────────────────────── */

export interface SegmentedItem<T extends string> {
  id: T; label: string; icon?: IconName; hint?: string;
}

export function Segmented<T extends string>({
  items, value, onChange, disabled = false, compact = false,
}: {
  items: SegmentedItem<T>[]; value: T; onChange?: (id: T) => void;
  /** الطالب يرى الحالة ولا يغيّرها */
  disabled?: boolean; compact?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="حالة الغرفة"
      className="inline-flex shrink-0 items-center gap-[2px] rounded-xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-[2px]"
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={disabled}
            title={it.hint ?? it.label}
            onClick={() => onChange?.(it.id)}
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] font-bold transition disabled:cursor-default ${
              on
                ? "bg-[var(--bz-surface,#fff)] text-[var(--bz-blue-700)] shadow-sm"
                : "text-[var(--bz-ink-3)] hover:text-[var(--bz-ink-2)]"
            }`}
          >
            {it.icon && <Icon name={it.icon} size={12} />}
            <span className={compact ? "hidden md:inline" : ""}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── شريط الأيقونات الجانبي ─────────────────────────────── */

export function IconRail({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="أدوات الغرفة"
      className="hidden w-12 shrink-0 flex-col items-center gap-1 border-l border-[var(--bz-line)] bg-[var(--bz-surface,#fff)] py-2 lg:flex"
    >
      {children}
    </nav>
  );
}

export function RailButton({
  icon, label, active = false, badge, tone = "default", onClick,
}: {
  icon: IconName; label: string; active?: boolean; badge?: number;
  tone?: "default" | "amber"; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`relative grid h-8 w-8 place-items-center rounded-lg transition ${
        active
          ? "bg-[var(--bz-blue-050)] text-[var(--bz-blue)]"
          : tone === "amber"
            ? "text-[var(--bz-amber)] hover:bg-[var(--bz-amber-050)]"
            : "text-[var(--bz-ink-3)] hover:bg-[var(--bz-canvas)] hover:text-[var(--bz-ink-2)]"
      }`}
    >
      <Icon name={icon} size={18} />
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-[2px] -top-[2px] grid h-[15px] min-w-[15px] place-items-center rounded-full border-2 border-[var(--bz-surface,#fff)] bg-[var(--bz-red)] px-[3px] text-[8.5px] font-extrabold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function RailDivider() {
  return <span className="my-1.5 h-px w-5 bg-[var(--bz-line)]" />;
}

export function RailSpacer() {
  return <span className="flex-1" />;
}

/* ─── الشريط الجانبي الواحد ──────────────────────────────── */

export interface DockTab {
  id: string; label: string; badge?: number;
}

export function SideDock({
  tabs, active, onSelect, children, open = true, padded = true,
}: {
  tabs: DockTab[]; active: string; onSelect: (id: string) => void;
  children: ReactNode; open?: boolean;
  /** أطفئها للوحات التي تُدير تمريرها بنفسها (الدردشة، قائمة المشاركين) */
  padded?: boolean;
}) {
  if (!open) return null;
  return (
    <aside
      aria-label="لوحة الصفّ"
      /* كان `xl:flex` (1280px+). بين 1024 و1280 كان زرّ الدردشة مخفيّاً
        (lg:hidden) واللوحة غير ظاهرة — فلا دردشة إطلاقاً في هذا المدى،
        وهو مقاس أغلب شاشات المحمول. صار `lg:flex` فانسدّت الفجوة. */
      className="hidden w-[272px] shrink-0 flex-col overflow-hidden border-r border-[var(--bz-line)] bg-[var(--bz-surface,#fff)] lg:flex"
    >
      <div role="tablist" className="flex shrink-0 gap-px border-b border-[var(--bz-line)] px-2 pt-2">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(t.id)}
              className={`relative flex-1 border-b-2 px-1 py-1.5 text-[10.5px] font-bold transition ${
                on
                  ? "border-[var(--bz-blue)] text-[var(--bz-blue)]"
                  : "border-transparent text-[var(--bz-ink-3)] hover:text-[var(--bz-ink-2)]"
              }`}
            >
              {t.label}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className="mr-1 inline-grid h-[14px] min-w-[14px] place-items-center rounded-full bg-[var(--bz-red)] px-[3px] align-[1px] text-[8px] font-extrabold text-white">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className={
          padded
            ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        {children}
      </div>
    </aside>
  );
}

/** بطاقة داخل الشريط الجانبي — قابلة للطيّ لأن المساحة ثمينة */
export function DockPanel({
  icon, title, meta, children, defaultOpen = true, collapsible = true,
}: {
  icon?: IconName; title: string; meta?: string; children: ReactNode;
  defaultOpen?: boolean; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = collapsible ? open : true;
  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-[var(--bz-line)]">
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        aria-expanded={shown}
        className="flex w-full items-center gap-1.5 bg-[var(--bz-canvas)] px-2.5 py-[7px] text-right text-[11px] font-bold text-[var(--bz-ink)]"
      >
        {icon && <Icon name={icon} size={13} className="text-[var(--bz-ink-2)]" />}
        <span className="truncate">{title}</span>
        <span className="flex-1" />
        {meta && <span className="font-mono text-[9.5px] font-normal text-[var(--bz-ink-3)]">{meta}</span>}
        {collapsible && (
          <Icon
            name="chevDown"
            size={12}
            className={`text-[var(--bz-ink-3)] transition-transform ${shown ? "" : "-rotate-90"}`}
          />
        )}
      </button>
      {shown && <div className="flex flex-col gap-1.5 p-2">{children}</div>}
    </section>
  );
}

/* ─── الرصيف العائم مع الإخفاء التلقائي ──────────────────── */

/**
 * «الأدوات لا تكون دائماً ظاهرة، بل تختفي تلقائياً بعد ثوانٍ ثم تظهر
 * عند تحريك الماوس» — من ملاحظاتك.
 *
 * نُخفّت ولا نُخفي: الاختفاء الكامل يجعل الأستاذ يبحث عن أدواته.
 * ولا نُخفّت أبداً على اللمس، لأنّ الهاتف بلا pointermove فتبقى
 * الأدوات باهتة إلى الأبد.
 */
export function useIdleDim(delayMs = 4000) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef(false);

  useEffect(() => {
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      if (touch.current) return;
      timer.current = setTimeout(() => setIdle(true), delayMs);
    };
    const wake = () => {
      setIdle(false);
      arm();
    };
    const onTouch = () => {
      touch.current = true;
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", onTouch, { passive: true });
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [delayMs]);

  return idle;
}


/* ════════════════════════════════════════════════════════════
   شريط الأدوات على الهاتف

   شريط الأيقونات الجانبي مخفيّ تحت `lg`، فكان طالب الهاتف **لا يجد
   الفيديو ولا الملفّات ولا الملاحظات إطلاقاً** — لا مجرّد صعوبة، بل
   انعدام وصول.

   القائمة السابقة كانت تغطّي زرّ «انضمام صوتي». الحلّ ليس إعادتها فوقه
   بل **رفعها عنه**: ترتفع بارتفاع شريط الصوت الحقيقي عبر المتغيّر الذي
   ينشره الشريط نفسه (`--bz-voicebar-h`)، فلا تتراكبان مهما تغيّر
   ارتفاعه — منضمّاً كان أو غير منضمّ.

   وتُخفى في الشاشة الكاملة لأنّ الغرض منها إخلاء الشاشة للمحتوى.
════════════════════════════════════════════════════════════ */

export function PhoneToolStrip({ children, hidden = false }: {
  children: ReactNode;
  hidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* ينشر ارتفاعه كما يفعل شريط الصوت، فيرتفع فوقه المساعد العائم بدقّة.
     نُصفّره عند الإخفاء أو التفكيك، وإلّا بقي الزرّ العائم معلّقاً في
     الهواء بعد اختفاء الشريط. */
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (hidden || !el) {
      root.style.setProperty("--bz-toolstrip-h", "0px");
      return;
    }
    const publish = () => root.style.setProperty("--bz-toolstrip-h", `${el.offsetHeight + 8}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--bz-toolstrip-h", "0px");
    };
  }, [hidden]);

  if (hidden) return null;
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 z-[40] flex justify-center px-2 lg:hidden"
      style={{
        bottom:
          "calc(env(safe-area-inset-bottom, 0px) + var(--bz-voicebar-h, 0px) + 8px)",
      }}
    >
      <div
        className="bz-hide-scrollbar pointer-events-auto flex max-w-full items-center gap-1
          overflow-x-auto rounded-2xl border border-[var(--bz-line)] p-1"
        style={{
          background: "rgba(255,255,255,.94)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          backdropFilter: "saturate(180%) blur(14px)",
          boxShadow:
            "0 0 0 1px rgba(19,23,34,.05), 0 10px 28px -10px rgba(19,23,34,.28)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** زرّ داخل شريط الهاتف — أيقونة فوق تسمية، مقاس لمس 56×48 */
export function PhoneToolButton({
  icon, label, active = false, badge, onClick,
}: {
  icon: IconName; label: string; active?: boolean; badge?: number; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`relative flex h-12 min-w-[58px] shrink-0 flex-col items-center justify-center gap-0.5
        rounded-xl px-2 text-[10px] font-bold transition active:scale-95 ${
          active
            ? "bg-[var(--bz-blue)] text-white"
            : "text-[var(--bz-ink-2)] hover:bg-[var(--bz-canvas)]"
        }`}
    >
      <Icon name={icon} size={17} />
      <span className="leading-none">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute right-1 top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full border-2 border-white bg-[var(--bz-red)] px-[3px] text-[8px] font-extrabold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
