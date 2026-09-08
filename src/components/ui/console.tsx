"use client";

/* ════════════════════════════════════════════════════════════
   الكونسول — الشريط الواحد

   يستبدل: صفّي الأدوات العلويّين + اللوحتين العائمتين + شريط الصفحات.
   ثلاث مناطق: المراحل (ثابت) · الأدوات (يتبدّل بالسياق) · الغرفة (ثابت).

   الطرفان لا يتحرّكان أبدًا — فالعين تتعلّم مكانهما مرّة واحدة،
   والوسط وحده يتبدّل حسب الأداة أو العنصر المحدَّد.

   يخفت تلقائيًّا بعد ٣ ثوانٍ سكون ويعود بأوّل حركة.
════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/* ─────────── الغلاف ─────────── */

export function Console({
  children,
  idleDim = true,
  className = "",
}: {
  children: ReactNode;
  /** يخفت بعد سكون — يُعطَّل في الأوضاع التي تتطلّب حضورًا دائمًا */
  idleDim?: boolean;
  className?: string;
}) {
  const [dim, setDim] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef(false);

  useEffect(() => {
    if (!idleDim) return;
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      // على اللمس لا نُخفّت أبداً: الهاتف لا يُطلق pointermove، فالمؤقّت
      // كان يعيد التخفيت كل 3 ثوانٍ بلا نهاية وتبقى الأدوات باهتة دائماً.
      if (touch.current) return;
      timer.current = setTimeout(() => setDim(true), 3000);
    };
    const wake = () => { setDim(false); arm(); };
    const onTouch = () => {
      touch.current = true;
      setDim(false);
      if (timer.current) clearTimeout(timer.current);
    };
    wake();
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [idleDim]);

  return (
    <div
      onPointerEnter={() => setDim(false)}
      className={`bz-console-dock pointer-events-auto flex items-center gap-0.5 rounded-[14px] p-[5px]
        transition-opacity duration-200 ${dim ? "opacity-45" : "opacity-100"} ${className}`}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   الكونسول عائماً فوق اللوح

   🐛 **الأستاذ لم يكن يستطيع الرسم على هاتفه في وضع الشاشتين.**
   في اللقطة الثالثة يظهر طرفٌ أبيض وجزءٌ من زرّ أزرق من خلف مبدّل
   «السبورة / الفيديو» — هذا هو الكونسول كلّه، مدفوناً.

   وسببان اجتمعا:

   ١) الموضع: كان `bottom: calc(0.75rem + var(--bz-toolstrip-h))`،
      و`--bz-toolstrip-h` يُضبط في `PhoneToolStrip` — وهو مكوّن **مات
      منذ توحيد شريط التحكّم ولم يعد مستورداً في أي ملف**. فبقي
      المتغيّر عند صفر أبداً، والكونسول عند 12px، والمبدّل عند 8px:
      في المكان نفسه حرفياً.

   ٢) التكديس: رفع `z-index` لا يُنقذ. الكونسول داخل `Pane` الذي عليه
      `zIndex: 2` — أي **سياق تكديس مستقلّ**، فكل ما بداخله محبوس
      تحت المستوى 2 مهما كان رقمه. والمبدّل عند مستوى الشبكة نفسه.

   الحلّ لم يكن رقماً أكبر: المبدّل صار صفّاً حقيقياً في تخطيط المسرح
   (انظر `StageSwitcher`)، فخرج من فوق اللوحة إلى جانبها وسقط تنازع
   التكديس من أصله. ولذلك عاد الكونسول إلى `bottom` بسيطة: لم يعد
   فوقه شيء يتفاداه.

   ويَنشر ارتفاعه في `--bz-console-h` لأنّ فوقه ما يجب أن يتفاداه هو:
   بطاقة «تتابع الأستاذ» كانت عند `bottom-[64px]` — رقم مخمَّن
   لارتفاع الكونسول. والكونسول لا ارتفاع ثابت له: يلتفّ عند الضيق،
   ويتغيّر بحجم خطّ النظام.
   ════════════════════════════════════════════════════════════ */
export function FloatingConsole({ children, idleDim }: { children: ReactNode; idleDim?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) return;
    const publish = () => root.style.setProperty("--bz-console-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--bz-console-h", "0px");
    };
  }, []);

  return (
    <div
      ref={ref}
      /* التمرير الأفقي هنا — على مستوى الشريط كلّه لا داخل منطقة
         واحدة منه. المطلوب: «إذا أصبحت الأدوات أكثر من المساحة
         المتاحة يجب أن يظهر scrolling حتى يمكن الوصول إلى جميع
         الأدوات» — ويعمل على الحاسوب كما على الهاتف، لأنّ نافذةً
         ضيّقة على الحاسوب تضيق بالأدوات تماماً كهاتف.

         و`justify-content: safe center` في `bz-console-wrap`: التوسيط
         العادي في حاوية منزلقة يقصّ **الطرفين** حين يفيض المحتوى،
         فتضيع أوّل أداة وآخرها. `safe` تعني: وسّط ما دام يتّسع،
         وارجع إلى البداية حين يفيض. */
      className="bz-console-wrap bz-hscroll pointer-events-none absolute inset-x-2 bottom-3 z-20 flex"
    >
      <Console idleDim={idleDim}>{children}</Console>
    </div>
  );
}

/* ─────────── المناطق ─────────── */

/* 🐛 كانت منطقة الأدوات تُمرَّر **داخل** الكونسول بينما الكونسول
   نفسه يُمرَّر داخل غلافه: تمريران متداخلان في المحور نفسه. النتيجة
   على الحاسوب أنّ المنطقة الوسطى تنكمش وتُمرّر وحدها بينما يبقى
   للشريط عرضٌ فائض، فيبدو أنّ بعض الأدوات «غير موجودة» لا أنّها
   خلف تمرير — ولا أحد يُخمّن أنّ شريطاً صغيراً في الوسط قابل للسحب.

   التمرير الآن على مستوى الشريط كلّه (`FloatingConsole`)، وهذه
   المنطقة تُبقي `shrink-0` فتحافظ على عرضها الطبيعي وتدفع الفائض
   إلى تمرير الشريط الواحد.

   `scroll` بقيت في الواجهة لأنّ نداءات كثيرة تمرّرها، وصار معناها:
   «هذه المنطقة قد تطول، فلا تُضغط». */
export function ConsoleZone({
  children,
  scroll = false,
  className = "",
}: {
  children: ReactNode;
  /** منطقة قد يطول محتواها — تُمنع من الانضغاط ويتكفّل الشريط بتمريرها */
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 px-1 ${scroll ? "shrink-0" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function ConsoleDivider() {
  return <span className="mx-1 h-[22px] w-px shrink-0" style={{ background: "var(--bz-line)" }} />;
}

/* ─────────── الأزرار ─────────── */

type BtnTone = "default" | "primary" | "amber" | "red";

const TONE: Record<BtnTone, string> = {
  default: "",
  primary: "bg-[var(--bz-blue)] text-white",
  amber: "bg-[var(--bz-amber)] text-white",
  red: "bg-[var(--bz-red)] text-white",
};

export function ConsoleButton({
  icon,
  label,
  active,
  tone = "default",
  badge,
  big,
  disabled,
  onClick,
  children,
}: {
  icon?: IconName;
  /** يظهر كـ tooltip وكوصف للقارئ الصوتي */
  label: string;
  active?: boolean;
  tone?: BtnTone;
  /** رقم صغير أعلى الزرّ (رسائل غير مقروءة مثلًا) */
  badge?: number;
  /** حجم أكبر — للفعل الأساسي مثل «التقط» */
  big?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** بديل عن الأيقونة: رمز رياضي أو نصّ قصير */
  children?: ReactNode;
}) {
  const size = big ? "h-[34px] w-[34px]" : "h-[30px] w-[30px]";
  const toneCls = active ? TONE.primary : TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`relative grid ${size} shrink-0 place-items-center rounded-lg transition
        active:scale-95 disabled:opacity-35 disabled:active:scale-100
        ${toneCls || "text-[var(--bz-ink-2)] hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue)]"}`}
    >
      {icon ? <Icon name={icon} size={big ? 20 : 18} /> : children}
      {badge != null && badge > 0 && (
        <span
          className="absolute -left-0.5 -top-0.5 grid min-w-[15px] place-items-center rounded-full
            px-1 text-[9px] font-bold leading-[15px] text-white"
          style={{ background: "var(--bz-red)", border: "1.5px solid #fff" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/** نصّ صغير داخل الكونسول (عدّاد، تسمية) */
export function ConsoleLabel({ children, tone }: { children: ReactNode; tone?: "amber" | "muted" }) {
  const color =
    tone === "amber" ? "var(--bz-amber-ink)" : tone === "muted" ? "var(--bz-ink-3)" : "var(--bz-ink-2)";
  return (
    <span className="shrink-0 px-1 text-[10.5px] font-semibold tabular-nums" style={{ color }}>
      {children}
    </span>
  );
}

/* ─────────── اللون ─────────── */

export function ConsoleSwatch({
  color,
  active,
  onClick,
  label,
}: {
  color: string;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="grid h-[26px] w-[22px] shrink-0 place-items-center"
    >
      <span
        className="block h-[15px] w-[15px] rounded-full transition"
        style={{
          background: color,
          border: "1px solid rgba(19,23,34,.12)",
          boxShadow: active ? `0 0 0 1.5px #fff, 0 0 0 3px ${color}` : undefined,
        }}
      />
    </button>
  );
}

/* ─────────── مؤشّر المراحل ───────────
   يستبدل شريط تقدّم الدرس المحذوف: شرائح صغيرة، الحالية أعرض وزرقاء. */

export function StageIndicator({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect?: (i: number) => void;
}) {
  const MAX = 9; // أكثر من ذلك يصبح مزدحمًا — نعرض نافذة حول الحالية
  let from = 0;
  let to = count;
  if (count > MAX) {
    from = Math.max(0, Math.min(current - Math.floor(MAX / 2), count - MAX));
    to = from + MAX;
  }
  return (
    <span className="flex shrink-0 items-center gap-[3px] px-1.5" role="group" aria-label="مراحل الدرس">
      {Array.from({ length: to - from }, (_, k) => {
        const i = from + k;
        const isNow = i === current;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect?.(i)}
            title={`المرحلة ${i + 1}`}
            aria-label={`المرحلة ${i + 1}`}
            aria-current={isNow}
            className="h-[13px] py-[4.5px] transition-all"
            style={{ width: isNow ? 19 : 13 }}
          >
            <span
              className="block h-[4px] w-full rounded-full transition-colors"
              style={{
                background: isNow
                  ? "var(--bz-blue)"
                  : i < current
                  ? "var(--bz-blue-100)"
                  : "var(--bz-line-2)",
              }}
            />
          </button>
        );
      })}
    </span>
  );
}

/* ─────────── صور المشاركين ─────────── */

export function ConsoleAvatars({
  people,
  extra,
  onClick,
}: {
  people: { id: string; name: string; color?: string; speaking?: boolean }[];
  extra?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="المشاركون"
      aria-label="المشاركون"
      className="flex shrink-0 items-center pl-1"
    >
      {people.map((p) => (
        <span
          key={p.id}
          className="grid h-[22px] w-[22px] place-items-center rounded-full text-[8.5px] font-bold text-white
            first:ml-0 [&:not(:first-child)]:-mr-[7px]"
          style={{
            background: p.color || "var(--bz-blue)",
            border: "1.5px solid #fff",
            boxShadow: p.speaking ? "0 0 0 2px var(--bz-green)" : undefined,
          }}
        >
          {p.name.slice(0, 1)}
        </span>
      ))}
      {extra != null && extra > 0 && (
        <span
          className="-mr-[7px] grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[7.5px] font-bold"
          style={{ background: "#DDE2EA", color: "var(--bz-ink-2)", border: "1.5px solid #fff" }}
        >
          +{extra}
        </span>
      )}
    </button>
  );
}


/* ─────────── الشريط السياقي ───────────
   يظهر فوق الرصيف مباشرة عند تحديد عنصر، ويحمل إجراءات ذلك العنصر
   وحده. هذا هو «Contextual UI» من ملاحظاتك: لا نزيد الأزرار الظاهرة،
   بل نُظهر ما يخصّ اللحظة الحالية فقط ثم يختفي.

   موضعه أسفل الشاشة مقصود — قرب الإبهام، والسابق كان أعلى اللوح. */

export function ContextBar({
  label, children, onClose,
}: {
  label: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-[68px] left-1/2 z-30 max-w-[calc(100%-16px)] -translate-x-1/2">
      <div
        className="bz-ctx-in pointer-events-auto flex items-center gap-1 rounded-xl border p-1 ps-2"
        style={{
          background: "rgba(255,255,255,.98)",
          borderColor: "var(--bz-blue-100)",
          boxShadow: "0 2px 4px rgba(19,23,34,.05), 0 10px 26px rgba(19,23,34,.12)",
        }}
      >
        <span className="shrink-0 truncate text-[10.5px] font-bold text-[var(--bz-blue-700)]">
          {label}
        </span>
        <span className="mx-1 h-4 w-px shrink-0 bg-[var(--bz-line)]" />
        <div className="flex items-center gap-1 overflow-x-auto bz-noscroll">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="إلغاء التحديد"
            aria-label="إلغاء التحديد"
            className="ms-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--bz-ink-3)] transition hover:bg-[var(--bz-canvas)] hover:text-[var(--bz-ink-2)]"
          >
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/** زرّ داخل الشريط السياقي — أصغر من زرّ الرصيف لأنّ السياق مؤقّت */
export function ContextButton({
  icon, label, tone = "default", onClick, disabled,
}: {
  icon: IconName; label: string;
  tone?: "default" | "amber" | "red" | "primary";
  onClick?: () => void; disabled?: boolean;
}) {
  const tones =
    tone === "amber"
      ? "text-[var(--bz-amber)] hover:bg-[var(--bz-amber-050)]"
      : tone === "red"
        ? "text-[var(--bz-red)] hover:bg-[var(--bz-red-050)]"
        : tone === "primary"
          ? "text-[var(--bz-blue)] hover:bg-[var(--bz-blue-050)]"
          : "text-[var(--bz-ink-2)] hover:bg-[var(--bz-canvas)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold transition active:scale-95 disabled:opacity-35 ${tones}`}
    >
      <Icon name={icon} size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
