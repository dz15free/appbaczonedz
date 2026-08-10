"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { nextQuote, quoteOfDay } from "@/features/study/quotes";
import { faFire, faChevronLeft, faChevronRight, faAward, faBolt } from "@fortawesome/free-solid-svg-icons";
import { useBacExamDate, useBacResultsDate, useCountdownTo } from "@/features/settings/use-bac-date";

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] font-semibold text-white/60 sm:text-[11px]">{label}</div>
    </div>
  );
}

function FullCountdown({ d }: { d: { days: number; hours: number; minutes: number; seconds: number } }) {
  return (
    <div className="mt-3 flex items-center gap-2 sm:gap-3">
      <Cell value={d.days} label="يوم" />
      <span className="mb-3 text-lg font-bold text-white/30">:</span>
      <Cell value={d.hours} label="ساعة" />
      <span className="mb-3 text-lg font-bold text-white/30">:</span>
      <Cell value={d.minutes} label="دقيقة" />
      <span className="mb-3 text-lg font-bold text-white/30">:</span>
      <Cell value={d.seconds} label="ثانية" />
    </div>
  );
}

export function HomeHeroSlider({ name, welcomeTitle }: { name: string; welcomeTitle?: string }) {
  /* نبدأ بحكمة اليوم لأنّها متطابقة على الخادم والمتصفّح، ثم نُبدّلها
     بحكمة الزيارة بعد التركيب — فلا تحذير Hydration ولا وميض. */
  const [quote, setQuote] = useState(() => quoteOfDay());
  useEffect(() => {
    setQuote(nextQuote());
  }, []);

  const examDate = useBacExamDate();
  const resultsDate = useBacResultsDate();
  const bac = useCountdownTo(examDate, 5, 15);
  const results = useCountdownTo(resultsDate, 6, 20);

  const [idx, setIdx] = useState(0);
  const slides = 4;

  // تبديل تلقائي كل 6 ثوانٍ
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % slides), 6000);
    return () => clearInterval(id);
  }, []);

  const go = (dir: 1 | -1) => setIdx((i) => (i + dir + slides) % slides);

  return (
    /* ══ البطاقة الترحيبية ══
       كانت مستطيلاً بتدرّج فاقع وحدّ `border-white/10` يظهر خيطاً
       أبيض شاحباً على الحافّة، وتوهّجاً بنفسجياً (fuchsia) لا علاقة
       له بهويّة المنصّة الزرقاء. والأزرار ٢٨px — تحت أي حدّ لمس.

       الآن: حافّة بلا خطّ شاحب، وظلّ مصبوغ بلون البطاقة نفسها فتبدو
       مرتفعة لا ملصوقة، وشبكة خفيفة تُذكّر بورقة الامتحان، وحلقة
       داخلية ناعمة تُنهي الحافّة بدل الخطّ. */
    <div className="bz-hero">
      {/* توهّجات — بلون الهويّة */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-16 h-52 w-52 rounded-full bg-sky-300/15 blur-3xl" />
      <span className="bz-hero-grid" aria-hidden />

      {/* أزرار التنقّل — في الأسفل لتجنّب حجب الأرقام */}
      <button onClick={() => go(-1)} aria-label="الشريحة السابقة" className="bz-hero-nav right-3">
        <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
      </button>
      <button onClick={() => go(1)} aria-label="الشريحة التالية" className="bz-hero-nav left-3">
        <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
      </button>

      <div className="relative min-h-[130px] pb-2">
        <div key={idx} className="bz-slide-in">
        {/* الشريحة 0: ترحيب */}
        {idx === 0 && (
          <div>
            <p className="text-sm font-bold text-white/70">{welcomeTitle || "مرحباً بعودتك"} 👋</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">أهلاً، {name}</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
              منصّتك الشاملة للتفوّق في البكالوريا — غرف دراسة مباشرة، مساعدتك الخباشة، ومجتمع نشط.
            </p>
          </div>
        )}

        {/* الشريحة 1: عدّاد البكالوريا */}
        {idx === 1 && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-white/70">
              <FontAwesomeIcon icon={faFire} className="h-3.5 w-3.5 text-amber-400" />
              عدّاد البكالوريا
            </p>
            {bac.days > 0 ? (
              <>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-display text-5xl font-extrabold tabular-nums text-white sm:text-6xl">{bac.days}</span>
                  <span className="mb-1.5 text-base font-bold text-white/70">يوم متبقّي</span>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {bac.days > 60 ? "📚 نظّم وقتك من الآن" : bac.days > 21 ? "💪 المراجعة تتسارع، ركّز!" : "🔥 الأيام الأخيرة — كل دقيقة تُحسب"}
                </p>
              </>
            ) : (
              <>
                <FullCountdown d={bac} />
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-300">
                  <FontAwesomeIcon icon={faFire} className="h-3 w-3 animate-pulse" /> اليوم الأخير — بالتوفيق!
                </p>
              </>
            )}
          </div>
        )}

        {/* الشريحة 2: عدّاد النتائج */}
        {idx === 2 && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-white/70">
              <FontAwesomeIcon icon={faAward} className="h-3.5 w-3.5 text-emerald-400" />
              نتائج البكالوريا
            </p>
            {results.days > 0 ? (
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-5xl font-extrabold tabular-nums text-white sm:text-6xl">{results.days}</span>
                <span className="mb-1.5 text-base font-bold text-white/70">يوم على النتائج</span>
              </div>
            ) : (
              <FullCountdown d={results} />
            )}
            <p className="mt-2 text-xs text-white/50">🎯 نتمنّى لك نتائج تليق بتعبك</p>
          </div>
        )}

        {/* الشريحة 3: تحفيزية */}
        {idx === 3 && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-white/70">
              <FontAwesomeIcon icon={faBolt} className="h-3.5 w-3.5 text-yellow-400" />
              نصيحة اليوم
            </p>
            <h2 className="mt-1.5 max-w-md font-display text-xl font-extrabold leading-relaxed text-white sm:text-2xl">
              {quote.text}
            </h2>
            <p className="mt-2 text-xs text-white/50">{quote.hint}</p>
          </div>
        )}
        </div>
      </div>

      {/* نقاط المؤشّر — هدف اللمس ٢٤px حول نقطة ٦px */}
      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center">
        {Array.from({ length: slides }).map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`الشريحة ${i + 1}`}
            aria-current={i === idx ? "true" : undefined}
            className="grid h-8 w-6 place-items-center">
            <span className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/35"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
