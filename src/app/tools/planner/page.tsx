"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPrint, faPalette, faMobileScreen, faDesktop, faDownload, faFileArrowDown } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { STUDY_QUOTES } from "@/features/study/quotes";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

type Template = "daily" | "weekly" | "exam" | "goals";
type Size = "a4" | "mobile";

const TEMPLATES: { id: Template; label: string; emoji: string; desc: string }[] = [
  { id: "daily", label: "مخطّط يومي", emoji: "📅", desc: "جدول اليوم + مهام + ملاحظات" },
  { id: "weekly", label: "مخطّط أسبوعي", emoji: "🗓️", desc: "نظرة شاملة على الأسبوع" },
  { id: "exam", label: "العدّ التنازلي", emoji: "⏳", desc: "خطة المراجعة قبل الباك" },
  { id: "goals", label: "أهدافي", emoji: "🎯", desc: "أهداف ومتابعة التقدّم" },
];

// مصدر واحد للحِكَم — كانت مكرّرة هنا وفي الصفحة الرئيسية فتتفرّقان
const TIPS = STUDY_QUOTES.map((q) => q.text);

export default function PlannerPage() {
  const { settings } = useSiteSettings();
  const [template, setTemplate] = useState<Template>("daily");
  const [size, setSize] = useState<Size>("a4");
  const [accent, setAccent] = useState("#2563eb");
  const logo = settings.logoUrl || DEFAULT_LOGO;

  /* النصيحة تُختار بعد التركيب لا أثناء الرسم.
     كان `Math.random()` يُنفَّذ في الرسم فيختار الخادم نصيحة والمتصفّح أخرى،
     فيقع اختلاف الترطيب (React #418). الآن الخادم والمتصفّح يبدآن بالقيمة نفسها. */
  const [tip, setTip] = useState(TIPS[0]);
  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  const ACCENTS = ["#2563eb", "#059669", "#db2777", "#ea580c", "#7c3aed", "#0891b2"];

  function printPlanner() { window.print(); }

  const [exporting, setExporting] = useState(false);

  /* تصدير المخطّط صورة PNG بدقّة عالية — بلا أي مكتبة خارجية.

     لماذا لا ننسخ أوراق الأنماط؟ لأنّ نسخ كل قواعد Tailwind داخل الـSVG
     يُدخل صيغاً حديثة (oklch, @supports, @layer) لا يفهمها مُحلّل SVG،
     فيفشل تحميل الصورة صامتاً. الحلّ الأمتن: نُثبّت الأنماط **المحسوبة**
     لكل عنصر مباشرةً في خاصيّة style، فلا نحتاج أي ورقة أنماط. */
  async function exportPng() {
    const node = document.getElementById("planner-sheet");
    if (!node || exporting) return;
    setExporting(true);
    try {
      /* 🐛 القصّ من الأسفل على الهاتف: `getBoundingClientRect().height`
         يُرجع الارتفاع **المرئي**، فإن كان المخطّط أطول من حاويته
         (وهو الغالب على شاشة ضيّقة) ضاع ما تحته.
         `scrollHeight`/`scrollWidth` يُرجعان المحتوى **كاملاً** بما
         يتجاوز الإطار، فنأخذ الأكبر منهما ضماناً. */
      const rect = node.getBoundingClientRect();
      const w = Math.round(Math.max(rect.width, node.scrollWidth));
      const h = Math.round(Math.max(rect.height, node.scrollHeight));
      const scale = 3; // دقّة عالية للطباعة والمشاركة

      // الخصائص التي تكفي لإعادة إنتاج المظهر بدقّة
      const PROPS = [
        "display","position","top","right","bottom","left","width","height",
        "minWidth","minHeight","maxWidth","maxHeight","margin","marginTop","marginRight",
        "marginBottom","marginLeft","padding","paddingTop","paddingRight","paddingBottom",
        "paddingLeft","boxSizing","flexDirection","flexWrap","justifyContent","alignItems",
        "alignContent","gap","rowGap","columnGap","flexGrow","flexShrink","flexBasis",
        "gridTemplateColumns","gridTemplateRows","gridColumn","gridRow",
        "fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing",
        "textAlign","textDecoration","textTransform","whiteSpace","wordBreak","direction",
        "color","backgroundColor","backgroundImage","backgroundSize","backgroundPosition",
        "border","borderTop","borderRight","borderBottom","borderLeft","borderRadius",
        "borderColor","borderStyle","borderWidth","opacity","overflow","verticalAlign",
      ] as const;

      function inlineStyles(src: Element, dst: Element) {
        const cs = window.getComputedStyle(src);
        const decl: string[] = [];
        for (const prop of PROPS) {
          const v = cs.getPropertyValue(
            prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
          );
          if (v && v !== "none" && v !== "normal" && v !== "auto") {
            decl.push(`${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`);
          }
        }
        (dst as HTMLElement).setAttribute("style", decl.join(";"));

        const sKids = Array.from(src.children);
        const dKids = Array.from(dst.children);
        for (let i = 0; i < sKids.length && i < dKids.length; i++) {
          inlineStyles(sKids[i], dKids[i]);
        }
      }

      const clone = node.cloneNode(true) as HTMLElement;
      inlineStyles(node, clone);
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";
      clone.style.width = `${w}px`;
      clone.style.height = `${h}px`;

      /* الصور الخارجية (الشعار من نطاق آخر) تمنع تحويل الـSVG لصورة.
         نحذفها كليّاً — والنصّ «BacZone» موجود بجانبها أصلاً في الترويسة،
         فلا يتكرّر الاسم مرّتين. */
      clone.querySelectorAll("img").forEach((im) => im.remove());

      const xml = new XMLSerializer().serializeToString(clone);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="width:${w}px;height:${h}px;background:#fff">` +
        xml +
        `</div></foreignObject></svg>`;

      // data: URL أكثر موثوقيّة من blob: هنا (لا قيود أصل)
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("svg-load-failed"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-unsupported");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const a = document.createElement("a");
      a.download = `مخطط-البكالوريا-${template}-${size}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      alert("تعذّر حفظ الصورة على هذا المتصفّح. استعمل زر «طباعة / حفظ PDF» ثم اختر «حفظ كصورة» إن أردت.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PublicHeader />
      {/* أدوات التحكّم — تختفي عند الطباعة */}
      <div className="no-print mx-auto max-w-5xl px-4 py-4">
        <button onClick={() => history.back()} className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" /> رجوع
        </button>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h1 className="font-display text-xl font-extrabold">مخطّط البكالوريا للطباعة</h1>
          <p className="mt-1 text-sm text-text-muted">اختر التصميم والحجم، ثم اطبعه واملأه يدوياً أو استعمله رقمياً.</p>

          {/* بلانرات جاهزة: من يريد التنظيم اليوم لا يريد تصميماً — يريد
              ملفّاً يطبعه الآن. فنعرضهما قبل أدوات التخصيص. */}
          <div className="mt-4 rounded-xl border border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] p-3">
            <p className="mb-2 text-[12px] font-extrabold text-[var(--bz-blue-700)]">
              أو حمّل بلانراً جاهزاً بصيغة PDF
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a href="https://www.baczonedz.com/2026/07/planner-2027.html"
                target="_blank" rel="noreferrer" className="bz-plan-dl">
                <span className="bz-plan-ico">
                  <FontAwesomeIcon icon={faFileArrowDown} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-extrabold">بلانر تنظيم الوقت</span>
                  <span className="block text-[11px] text-text-muted">بكالوريا 2027 · PDF</span>
                </span>
              </a>
              <a href="https://www.baczonedz.com/2026/07/pdf-2027_0355167680.html"
                target="_blank" rel="noreferrer" className="bz-plan-dl">
                <span className="bz-plan-ico">
                  <FontAwesomeIcon icon={faFileArrowDown} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-extrabold">أقوى بلانر للمراجعة</span>
                  <span className="block text-[11px] text-text-muted">تنظيم وقت الدراسة · PDF</span>
                </span>
              </a>
            </div>
          </div>

          {/* اختيار القالب */}
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold text-text-muted"><FontAwesomeIcon icon={faPalette} className="h-3.5 w-3.5" /> التصميم</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`rounded-xl border p-3 text-right transition ${template === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className="text-2xl">{t.emoji}</div>
                  <div className="mt-1 text-sm font-bold">{t.label}</div>
                  <div className="text-[10px] text-text-muted">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* الحجم + اللون */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="mb-2 text-xs font-bold text-text-muted">الحجم</p>
              <div className="flex gap-2">
                <button onClick={() => setSize("a4")}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${size === "a4" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                  <FontAwesomeIcon icon={faDesktop} className="h-3.5 w-3.5" /> A4 (حاسوب)
                </button>
                <button onClick={() => setSize("mobile")}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${size === "mobile" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                  <FontAwesomeIcon icon={faMobileScreen} className="h-3.5 w-3.5" /> هاتف
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-text-muted">اللون</p>
              <div className="flex gap-1.5">
                {ACCENTS.map((c) => (
                  <button key={c} onClick={() => setAccent(c)} aria-label="لون"
                    className={`h-8 w-8 rounded-full transition ${accent === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`}
                    style={{ backgroundColor: c, boxShadow: accent === c ? `0 0 0 2px ${c}` : undefined }} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button onClick={printPlanner}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90 sm:px-8">
              <FontAwesomeIcon icon={faPrint} className="h-4 w-4" /> طباعة / حفظ PDF
            </button>
            <button onClick={exportPng} disabled={exporting}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-bold text-text-primary transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60 sm:px-8">
              <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
              {exporting ? "جارٍ التحضير…" : "تحميل صورة PNG"}
            </button>
          </div>
        </div>
      </div>

      {/* منطقة المعاينة + الطباعة */}
      <div className="no-print-bg mx-auto flex justify-center px-4 pb-10">
        <div id="planner-sheet" className={`planner-sheet ${size === "a4" ? "planner-a4" : "planner-mobile"}`} style={{ ["--accent" as string]: accent }}>
          <PlannerContent template={template} logo={logo} tip={tip} />
        </div>
      </div>

      <style jsx global>{`
        .planner-sheet {
          background: #fff;
          color: #1a1a2e;
          box-shadow: 0 8px 40px rgba(0,0,0,0.12);
          border-radius: 12px;
          overflow: hidden;
        }
        .planner-a4 { width: 100%; max-width: 760px; aspect-ratio: 1 / 1.414; }
        .planner-mobile { width: 100%; max-width: 380px; aspect-ratio: 9 / 16; }
        .pl-line { border-bottom: 1.5px dotted #cbd5e1; height: 30px; }
        .pl-box { border: 1.5px solid #e2e8f0; border-radius: 10px; }
        .pl-check { width: 18px; height: 18px; border: 2px solid var(--accent); border-radius: 5px; flex-shrink: 0; }
        @media print {
          @page { size: ${size === "a4" ? "A4" : "A5"}; margin: 0; }
          body * { visibility: hidden; }
          #planner-sheet, #planner-sheet * { visibility: visible; }
          #planner-sheet {
            position: absolute; left: 0; top: 0;
            width: 100%; max-width: none; box-shadow: none; border-radius: 0;
            aspect-ratio: auto; min-height: 100vh;
          }
          .no-print, .no-print * { display: none !important; }
        }
      `}      </style>
      <SiteFooter />
    </>
  );
}

/* محتوى المخطّط حسب القالب */
function PlannerContent({ template, logo, tip }: { template: Template; logo?: string; tip: string }) {
  if (template === "daily") return <DailyTemplate logo={logo} tip={tip} />;
  if (template === "weekly") return <WeeklyTemplate logo={logo} tip={tip} />;
  if (template === "exam") return <ExamTemplate logo={logo} tip={tip} />;
  return <GoalsTemplate logo={logo} tip={tip} />;
}

function Header({ logo, title, subtitle }: { logo?: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 px-6 py-4" style={{ borderColor: "var(--accent)" }}>
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="BacZone" className="h-10 w-10 rounded-lg object-contain" />}
        <span className="text-sm font-extrabold" style={{ color: "var(--accent)" }}>BacZone</span>
      </div>
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div className="mb-2">
      <span className="text-[11px] font-bold text-slate-400">{label}</span>
      <div className="pl-line" />
    </div>
  );
}

function DailyTemplate({ logo, tip }: { logo?: string; tip: string }) {
  const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  return (
    <div className="flex h-full flex-col">
      <Header logo={logo} title="مخطّطي اليومي" subtitle="يوم مثمر يبدأ بخطّة واضحة" />
      <div className="grid flex-1 grid-cols-2 gap-4 p-6">
        {/* العمود الأيمن */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1"><Field label="التاريخ" /></div>
            <div className="flex-1"><Field label="اليوم" /></div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>⏰ المخطّط الزمني</p>
            <div className="pl-box p-2">
              {hours.map((h) => (
                <div key={h} className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
                  <span className="w-10 text-[10px] font-bold text-slate-400">{h}</span>
                  <div className="h-4 flex-1 border-b border-dotted border-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* العمود الأيسر */}
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>✅ واجبات اليوم</p>
            <div className="pl-box p-2.5">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className="pl-check" />
                  <div className="h-4 flex-1 border-b border-dotted border-slate-200" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>📝 ملاحظات</p>
            <div className="pl-box p-2.5">
              {[1,2,3].map((i) => <div key={i} className="pl-line" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
        💡 {tip}
      </div>
    </div>
  );
}

function WeeklyTemplate({ logo, tip }: { logo?: string; tip: string }) {
  const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  return (
    <div className="flex h-full flex-col">
      <Header logo={logo} title="مخطّطي الأسبوعي" subtitle="نظرة شاملة على أسبوعك الدراسي" />
      <div className="flex-1 space-y-2 p-6">
        {days.map((d) => (
          <div key={d} className="flex items-stretch gap-2">
            <div className="flex w-20 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-white" style={{ background: "var(--accent)" }}>{d}</div>
            <div className="pl-box flex-1 p-2">
              <div className="h-4 border-b border-dotted border-slate-200" />
              <div className="mt-2 h-4 border-b border-dotted border-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
        💡 {tip}
      </div>
    </div>
  );
}

function ExamTemplate({ logo, tip }: { logo?: string; tip: string }) {
  return (
    <div className="flex h-full flex-col">
      <Header logo={logo} title="العدّ التنازلي للباك" subtitle="خطّة المراجعة النهائية" />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex gap-3">
          <div className="pl-box flex-1 p-3 text-center">
            <p className="text-[11px] font-bold text-slate-400">الأيام المتبقية</p>
            <div className="mx-auto mt-1 h-10 w-20 rounded-lg border-2 border-dashed" style={{ borderColor: "var(--accent)" }} />
          </div>
          <div className="pl-box flex-1 p-3 text-center">
            <p className="text-[11px] font-bold text-slate-400">هدف اليوم</p>
            <div className="mt-2 h-4 border-b border-dotted border-slate-200" />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>📚 المواد للمراجعة اليوم</p>
          <div className="pl-box p-2.5">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="pl-check" />
                <div className="h-4 flex-1 border-b border-dotted border-slate-200" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>🎯 ما أنجزته</p>
          <div className="pl-box p-2.5">{[1,2,3].map((i) => <div key={i} className="pl-line" />)}</div>
        </div>
      </div>
      <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
        💪 {tip}
      </div>
    </div>
  );
}

function GoalsTemplate({ logo, tip }: { logo?: string; tip: string }) {
  return (
    <div className="flex h-full flex-col">
      <Header logo={logo} title="أهدافي" subtitle="حدّد أهدافك وتابع تقدّمك" />
      <div className="flex-1 space-y-4 p-6">
        <div>
          <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>🎯 هدفي الكبير في الباك</p>
          <div className="pl-box p-3"><div className="pl-line" /></div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>📈 أهداف هذا الشهر</p>
          <div className="pl-box p-2.5">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="pl-check" />
                <div className="h-4 flex-1 border-b border-dotted border-slate-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["معدّلي الحالي", "معدّلي المستهدف", "مادتي الأقوى"].map((l) => (
            <div key={l} className="pl-box p-2 text-center">
              <p className="text-[10px] font-bold text-slate-400">{l}</p>
              <div className="mx-auto mt-2 h-8 w-full rounded border border-dashed border-slate-300" />
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>📝 ملاحظاتي</p>
          <div className="pl-box p-2.5">{[1,2,3].map((i) => <div key={i} className="pl-line" />)}</div>
        </div>
      </div>
      <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
        ⭐ {tip}
      </div>
    </div>
  );
}
