"use client";

import { useState } from "react";
import { useMediaQuery } from "@/lib/use-media";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon, type IconName } from "@/components/ui/icon";
import { StatusDot } from "@/components/ui/status-dot";
import type { RoomTool } from "@/features/rooms/use-active-tool";
import type { OwnerStatus } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   شريط التحكّم — مدخل واحد لكل فعل في الغرفة

   ── ما كان قبله ──
   كان الفعل الواحد له أبواب كثيرة متفرّقة: رفّ أيقونات على
   الحاسوب (`IconRail`)، وشريط أدوات على الهاتف (`PhoneToolStrip`)،
   وزرّ عائم (`FloatingAssistant`)، ودرج «إجراءات الحصة»، ودرج
   «وظائف الطالب»، وأزرار في الشريط العلوي. «الملفّات» وحدها كان
   لها سبعة مداخل، اثنان منها يفعلان **أمرين مختلفين** تحت الاسم
   نفسه: بثّ الملفّ للصفّ، أو فتحه لنفسك.

   وكان طالب الهاتف بلا تنقّل أصلاً: الرفّ والشريط كلاهما للمالك،
   وزرّ «+» مخفيّ تحت 640px.

   ── القاعدة الآن ──
   شريط واحد أسفل الشاشة، هو نفسه للأستاذ وللتلميذ وعلى كل
   المقاسات. الدور يُغيّر **ما هو مُفعَّل** لا ما هو موجود:

     يمين  → الصوت (شريط الصوت نفسه مُدمَجاً، فالميكروفون لا يغيب)
     وسط   → الأسطح للأستاذ (بثّ للصفّ) · أدوات التلميذ الخاصّة به
     يسار  → الصفّ · الدردشة · «كل الأدوات»

   ── ولا شيء مخفيّ ──
   «كل الأدوات» ورقة تسرد **كل** ميزة في الغرفة مقسومة بعناوين
   مسمّاة، لا زرّ «المزيد» غامضاً. كل زرّ فيها له أيقونة واسم
   مكتوب، وما لا يخصّ الدور لا يظهر أصلاً بدل أن يظهر معطّلاً —
   فالزرّ الذي لا يعمل يُربك ولا يُفيد.
   ════════════════════════════════════════════════════════════ */

export interface CtlAction {
  id: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
  tone?: "default" | "primary" | "amber" | "danger" | "green";
  /** يُعرض في الشريط نفسه لا في الورقة وحدها */
  primary?: boolean;
  /** أهميّته: الأصغر يبقى في الشريط على الهاتف الضيّق (1 = الأهمّ) */
  rank?: number;
  hint?: string;
}

const TONE: Record<string, string> = {
  default: "border-border bg-background text-[var(--bz-ink)] hover:border-primary/40 hover:bg-primary/5",
  primary: "border-[var(--bz-blue)] bg-[var(--bz-blue)] text-white hover:brightness-110",
  amber: "border-[var(--bz-amber)]/50 bg-[var(--bz-amber-050)] text-[var(--bz-amber)] hover:bg-[var(--bz-amber)]/15",
  danger: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/15",
  green: "border-[var(--bz-green)]/50 bg-[var(--bz-green)]/10 text-[var(--bz-green)] hover:bg-[var(--bz-green)]/15",
};

export function CtlButton({ a, compact }: { a: CtlAction; compact?: boolean }) {
  const tone = a.active ? "primary" : (a.tone ?? "default");
  return (
    <button
      type="button"
      onClick={a.onClick}
      title={a.hint ?? a.label}
      aria-label={a.label}
      /* `bz-ctl-btn`: القياس يُضبط في CSS بحسب نوع المؤشّر والارتفاع
         (44px على اللمس، مضغوط على الفأرة، أيقونة وحدها في الوضع
         الأفقي القصير) — بلا فرعٍ في الشيفرة لكل جهاز. */
      className={`bz-ctl-btn relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 transition active:scale-95 ${TONE[tone]} ${
        compact ? "min-w-[48px] sm:min-w-[52px]" : "min-w-[56px]"
      }`}
    >
      <Icon name={a.icon} size={compact ? 17 : 18} />
      <span className="max-w-[68px] truncate text-[10px] font-extrabold leading-none sm:max-w-none">{a.label}</span>
      {!!a.badge && a.badge > 0 && (
        <span className="absolute -top-1.5 -left-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white ring-2 ring-[var(--bz-surface)]">
          {a.badge}
        </span>
      )}
    </button>
  );
}

function SheetRow({ a, onDone }: { a: CtlAction; onDone: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { a.onClick(); onDone(); }}
      className={`relative flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition active:scale-[0.98] sm:min-h-[74px] ${
        a.active ? TONE.primary : TONE[a.tone ?? "default"]
      }`}
    >
      <Icon name={a.icon} size={20} />
      <span className="text-[11.5px] font-extrabold leading-tight">{a.label}</span>
      {!!a.badge && a.badge > 0 && (
        <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">
          {a.badge}
        </span>
      )}
    </button>
  );
}

export interface RoomControlBarProps {
  isOwner: boolean;
  isPrivileged: boolean;
  tool: RoomTool;
  onPickTool: (t: RoomTool) => void;
  /** شريط الصوت نفسه — يُدمَج هنا فلا يبقى شريطاً ثانياً أسفل الشاشة */
  voiceSlot: React.ReactNode;
  /* الصفّ والتواصل */
  memberCount: number;
  handsCount: number;
  myHand: boolean;
  onToggleHand: () => void;
  onOpenClass: () => void;
  onOpenChat: () => void;
  unreadChat: number;
  chatDisabled?: boolean;
  /* أنشطة الأستاذ */
  onPoll?: () => void;
  onChallenge?: () => void;
  hasChallenge?: boolean;
  onTimer?: () => void;
  onAnon?: () => void;
  unansweredAnon?: number;
  onExamSim?: () => void;
  hasExam?: boolean;
  onGradePapers?: () => void;
  ownerStatus?: OwnerStatus;
  /** اختيار مباشر للحالة — لا زرّ يدور على ثلاث قيم */
  onPickStatus?: (s: OwnerStatus) => void;
  /* الغرفة */
  onShare?: () => void;
  onInvite?: () => void;
  onAccessCode?: () => void;
  onFocus: () => void;
  focusActive: boolean;
  /* أدوات التلميذ */
  onStudentFiles?: () => void;
  onStudentNotes?: () => void;
  onStudentCards?: () => void;
  onAskAnon?: () => void;
  onRateTeacher?: () => void;
  onRateRoom?: () => void;
  /** حفظ بطاقة مراجعة من الغرفة — كانت متاحة في وضع التركيز وحده */
  onSaveCard?: () => void;
  /** حالة الغرفة — كانت `hidden md:block` أي غائبة عن الهاتف تماماً */
  roomState?: string;
  roomStates?: { id: string; label: string }[];
  onRoomState?: (id: string) => void;
}

/* ترتيب الأسطح: السبورة أوّلاً لأنّها سطح التدريس الفعليّ، و«مرحباً»
   آخراً لأنّها شاشة انتظار تُترك مرّة ولا يُعاد إليها. الترتيب واحد
   على كل الأجهزة، فما يعتاده الأستاذ على الحاسوب يجده في مكانه على
   الهاتف — وعلى الهاتف الضيّق أوّل ما يظهر في الشريط هو الأهمّ. */
const TOOL_META: { id: RoomTool; label: string; icon: IconName }[] = [
  { id: "whiteboard", label: "السبورة", icon: "layers" },
  { id: "notes", label: "ملاحظات", icon: "note" },
  { id: "files", label: "ملفّات", icon: "file" },
  { id: "video", label: "فيديو", icon: "video" },
  { id: "welcome", label: "مرحباً", icon: "home" },
];

export function RoomControlBar(p: RoomControlBarProps) {
  const [allOpen, setAllOpen] = useState(false);
  const close = () => setAllOpen(false);

  /* ── الأسطح ── قرار الأستاذ يُبثّ للصفّ */
  const surfaces: CtlAction[] = TOOL_META.map((t) => ({
    id: `tool-${t.id}`,
    icon: t.icon,
    label: t.label,
    active: p.tool === t.id,
    primary: true,
    rank: { whiteboard: 1, notes: 2, files: 5, video: 9, welcome: 10 }[t.id as string] ?? 8,
    hint: `${t.label} — يُعرض على شاشة الصفّ كلّه`,
    onClick: () => p.onPickTool(t.id),
  }));

  /* ── أنشطة الحصّة ── */
  const activities: CtlAction[] = p.isOwner
    ? [
        { id: "poll", icon: "poll", label: "استفتاء", onClick: p.onPoll ?? (() => {}), primary: true, rank: 6 },
        { id: "challenge", icon: "target", label: p.hasChallenge ? "لوحة التحدّي" : "تحدٍّ", active: p.hasChallenge, onClick: p.onChallenge ?? (() => {}), primary: true, rank: 7 },
        { id: "timer", icon: "timer", label: "وقت التمرين", onClick: p.onTimer ?? (() => {}), primary: true, rank: 8 },
        { id: "anon", icon: "anon", label: "أسئلة مجهولة", badge: p.unansweredAnon, onClick: p.onAnon ?? (() => {}) },
        { id: "exam", icon: "book", label: p.hasExam ? "أوراق الامتحان" : "محاكاة البكالوريا", active: p.hasExam, onClick: p.onExamSim ?? (() => {}) },
        ...(!p.hasExam && p.onGradePapers
          ? [{ id: "grade", icon: "check" as IconName, label: "تصحيح الأوراق", onClick: p.onGradePapers }]
          : []),
      ]
    : [];

  /* ── أدوات التلميذ ── خاصّة به لا تُبثّ لأحد */
  const studentTools: CtlAction[] = !p.isOwner
    ? [
        { id: "s-files", icon: "file", label: "ملفّات الغرفة", onClick: p.onStudentFiles ?? (() => {}), primary: true, rank: 3 },
        { id: "s-notes", icon: "note", label: "ملاحظات الدرس", onClick: p.onStudentNotes ?? (() => {}), primary: true, rank: 4 },
        { id: "s-ask", icon: "anon", label: "سؤال مجهول", onClick: p.onAskAnon ?? (() => {}), primary: true, rank: 5 },
        { id: "s-cards", icon: "layers", label: "بطاقاتي", onClick: p.onStudentCards ?? (() => {}) },
        ...(p.onSaveCard ? [{ id: "s-save", icon: "plus" as IconName, label: "احفظ بطاقة", onClick: p.onSaveCard }] : []),
        ...(p.onRateTeacher ? [{ id: "s-rate-t", icon: "star" as IconName, label: "قيّم الأستاذ", onClick: p.onRateTeacher }] : []),
        ...(p.onRateRoom ? [{ id: "s-rate-r", icon: "star" as IconName, label: "قيّم الغرفة", onClick: p.onRateRoom }] : []),
      ]
    : [];

  /* ── الصفّ والتواصل ── */
  const people: CtlAction[] = [
    { id: "class", icon: "users", label: `الصفّ (${p.memberCount})`, badge: p.handsCount, onClick: p.onOpenClass, primary: true, rank: p.isOwner ? 3 : 6 },
    ...(p.chatDisabled
      ? []
      : [{ id: "chat", icon: "chat" as IconName, label: "الدردشة", badge: p.unreadChat, onClick: p.onOpenChat, primary: true, rank: 2 }]),
    ...(!p.isOwner
      ? [{ id: "hand", icon: "hand" as IconName, label: p.myHand ? "أنزل يدك" : "ارفع يدك", active: p.myHand, tone: "amber" as const, onClick: p.onToggleHand, primary: true, rank: 1 }]
      : []),
  ];

  /* ── الغرفة ── */
  const roomActions: CtlAction[] = [
    { id: "focus", icon: p.focusActive ? "collapse" : "expand", label: p.focusActive ? "إنهاء التركيز" : "وضع التركيز", active: p.focusActive, onClick: p.onFocus },
    ...(p.onShare ? [{ id: "share", icon: "share" as IconName, label: "مشاركة الرابط", onClick: p.onShare }] : []),
    ...(p.onInvite ? [{ id: "invite", icon: "users" as IconName, label: "دعوة أصدقاء", onClick: p.onInvite }] : []),
    ...(p.onAccessCode ? [{ id: "code", icon: "lock" as IconName, label: "كود وصول", tone: "amber" as const, onClick: p.onAccessCode }] : []),
    ...(p.isOwner && p.onSaveCard ? [{ id: "save", icon: "plus" as IconName, label: "احفظ بطاقة", onClick: p.onSaveCard }] : []),
  ];

  /* ما يظهر في الشريط: الأساسيّات. والبقيّة في «كل الأدوات» —
     ولا شيء يختفي: الورقة تسرد الكل بأسمائه. */
  /* ── ترتيب الشريط ──
     صفّ واحد منزلق يجمع كل الأفعال الأساسية، ولا يُثبَّت في الطرفين
     إلّا ما لا يجوز أن يغيب: الصوت أوّلاً و«كل الأدوات» آخراً.

     🐛 قبله كانت ثلاث مجموعات ثابتة، فعلى هاتف 390px كانت مجموعة
     الطرف تأكل العرض وتُقصّ أزرار التلميذ (ملفّات وملاحظات) خلفها. */
  const all: CtlAction[] = p.isOwner
    ? [...surfaces, ...activities.filter((a) => a.primary), ...people.filter((a) => a.primary)]
    : [...studentTools.filter((a) => a.primary), ...people.filter((a) => a.primary)];

  /* ── كم زرّاً يبقى في الشريط ──
     قياس لا تخمين: العرض المتاح = عرض الشاشة − زرّ الصوت (≈64)
     − «كل الأدوات» (≈64) − الحشوات (≈20)، والزرّ 52+6.

       360px → 212 متاحة → 3 أزرار
       375px → 227 متاحة → 4 أزرار
       ≥640px → الكلّ (والفائض ينزلق)

     والبقيّة ليست مخفيّة: «كل الأدوات» ورقة تسرد كل شيء بأسمائه.
     شريطٌ ينزلق أفقياً على الهاتف يخفي الأزرار فعلياً — لأنّ أحداً
     لا يُخمّن أنّ شريط الأسفل قابل للسحب. */
  const desktop = useMediaQuery("(min-width: 1024px)");
  const tablet = useMediaQuery("(min-width: 640px)");
  const roomy = useMediaQuery("(min-width: 375px)");
  /* 360→3 · 375→4 · 640→8 · 1024→الكلّ. الأرقام مقيسة على العرض
     المتبقّي بعد زرّ الصوت و«كل الأدوات» والحشوات. */
  const keep = desktop ? all.length : tablet ? 8 : roomy ? 4 : 3;
  const kept = new Set(
    [...all].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, keep).map((a) => a.id),
  );
  const scroller = all.filter((a) => kept.has(a.id));

  return (
    <>
      <div className="bz-ctlbar flex shrink-0 items-center gap-1.5 border-t border-border bg-surface py-1.5 sm:gap-2">
        {/* الصوت — أوّل ما تصل إليه اليد، ولا يُخفى في أيّ وضع */}
        <div className="shrink-0">{p.voiceSlot}</div>

        <div /* على الهاتف يبدأ الصفّ من الحافّة فلا يُقصّ أوّل زرّ (التوسيط في
             صفٍّ منزلق يقصّ الطرفين)، وعلى الحاسوب يتوسّط فيبدو مقصوداً. */
          className="bz-rail flex min-w-0 flex-1 items-center justify-start gap-1.5 overflow-x-auto lg:justify-center">
          {scroller.map((a) => <CtlButton key={a.id} a={a} compact />)}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            title="كل أدوات الغرفة"
            className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background px-2 py-1.5 text-[var(--bz-ink)] transition hover:border-primary/40 hover:bg-primary/5 active:scale-95"
          >
            <Icon name="grid" size={16} />
            <span className="text-[9.5px] font-extrabold leading-none">كل الأدوات</span>
          </button>
        </div>
      </div>

      {/* ══ فهرس الغرفة الكامل ══ */}
      <BottomSheet open={allOpen} onClose={close} title="كل أدوات الغرفة" maxHeight="88dvh">
        {/* على اللوح والحاسوب لا تُترك الورقة بعرض 1440px: تُوسَّط
            بعرض قراءة مريح، وعلى الهاتف تأخذ العرض كلّه. */}
        <div className="mx-auto w-full max-w-3xl space-y-5 pb-2 lg:max-w-4xl">
          {p.isOwner && (
            <Section title="ما يراه الصفّ" hint="اختيارك يُعرض على شاشة كل تلميذ">
              {surfaces.map((a) => <SheetRow key={a.id} a={a} onDone={close} />)}
            </Section>
          )}

          {activities.length > 0 && (
            <Section title="أنشطة الحصّة" hint="الاستفتاء والتحدّي والوقت والامتحان">
              {activities.map((a) => <SheetRow key={a.id} a={a} onDone={close} />)}
            </Section>
          )}

          {studentTools.length > 0 && (
            <Section title="أدواتك" hint="خاصّة بك — لا يراها أحد غيرك">
              {studentTools.map((a) => <SheetRow key={a.id} a={a} onDone={close} />)}
            </Section>
          )}

          <Section title="الصفّ والتواصل" hint="من في الغرفة، والدردشة، ورفع اليد">
            {people.map((a) => <SheetRow key={a.id} a={a} onDone={close} />)}
          </Section>

          {p.isOwner && p.roomStates && p.onRoomState && (
            <Section title="حالة الحصّة" hint="تُغيّر ما يراه الصفّ كلّه">
              {p.roomStates.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => { p.onRoomState?.(st.id); close(); }}
                  className={`flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition active:scale-[0.98] sm:min-h-[74px] ${
                    p.roomState === st.id ? TONE.primary : TONE.default
                  }`}
                >
                  <Icon name={st.id === "exam" ? "timer" : st.id === "review" ? "file" : st.id === "focus" ? "target" : "book"} size={20} />
                  <span className="text-[11.5px] font-extrabold leading-tight">{st.label}</span>
                </button>
              ))}
            </Section>
          )}

          <Section title="الغرفة" hint="العرض والدعوة والمشاركة">
            {roomActions.map((a) => <SheetRow key={a.id} a={a} onDone={close} />)}
          </Section>

          {/* 🐛 كانت الحالة زرّاً **يدور** على ثلاث قيم: للرجوع خطوة
              تضغط مرّتين، ولا ترى الخيارات المتاحة أصلاً. صارت
              الخيارات الثلاثة ظاهرة والحاليّ منها مميّز. */}
          {p.isOwner && p.ownerStatus && p.onPickStatus && (
            <Section title="حالتك عند الطلبة" hint="تظهر إلى جانب اسمك في الغرفة">
              {(["available", "busy", "brb"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { p.onPickStatus?.(st); close(); }}
                  className={`flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition active:scale-[0.98] sm:min-h-[74px] ${
                    p.ownerStatus === st ? TONE.primary : TONE.default
                  }`}
                >
                  <StatusDot status={st} size={14} />
                  <span className="text-[11.5px] font-extrabold leading-tight">
                    {st === "available" ? "متفرّغ" : st === "busy" ? "مشغول" : "سأعود"}
                  </span>
                </button>
              ))}
            </Section>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h4 className="text-xs font-extrabold text-text-primary">{title}</h4>
        {hint && <span className="text-[10px] text-text-muted">{hint}</span>}
      </div>
      {/* 3 أعمدة على 375px (≈107px للزرّ) ثمّ تتوسّع مع الشاشة */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
    </section>
  );
}
