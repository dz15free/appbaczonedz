"use client";

/* ════════════════════════════════════════════════════════════
   ملء الشاشة — وحدة واحدة لكل المنصّة، تعمل على iPhone

   🐛 **زرّ ملء الشاشة في السبورة كان ميّتاً تماماً على الـiPhone.**
   السبب في سطر واحد: `Element.requestFullscreen` **غير موجود** في
   Safari على iPhone — لا هو ولا `webkitRequestFullscreen` (يوجد
   `webkitEnterFullscreen` على عنصر `<video>` وحده). فكان الكود:

       if (el.requestFullscreen) await el.requestFullscreen();
       else await el.webkitRequestFullscreen?.();

   يجد الاثنين `undefined`، فلا يفعل شيئاً ولا يرمي خطأً — ضغطة تذهب
   في الهواء. ولأنّ الحالة تُقرأ من `document.fullscreenElement` فقط،
   بقيت `false` أبداً فما تغيّرت الأيقونة حتّى. زرٌّ يوهم ولا يعمل.

   والحلّ ليس اختراعاً: المشروع يملكه أصلاً في قاعة الامتحان
   (`exam-guard.ts`) وفي صفحة الغرفة — طبقة `bz-fullscreen` بالتنسيق.
   جُمع هنا في وحدة واحدة يستعملها الجميع بدل أن يكتب كل ملفّ نسخته
   ويُخطئ فيها من جديد.

   القاعدة: نطلب ملء الشاشة الحقيقي، وإن لم يكن مدعوماً نُطبّق البديل
   بالتنسيق. النتيجة عند المستخدم واحدة — الشاشة تُملأ.
════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const PSEUDO_CLASS = "bz-fullscreen";
const BODY_CLASS = "bz-fullscreen-active";
/** يُضاف حين يكون الممتلئ سطحاً **داخل** الغرفة لا الغرفة نفسها */
const BODY_CLASS_INNER = "bz-fullscreen-inner";

/** العنصر الموضوع في ملء الشاشة البديل — واحد على الأكثر في الصفحة */
let pseudoEl: HTMLElement | null = null;

/** مشتركو التغيير: البديل بالتنسيق لا يُطلق `fullscreenchange`، فنُطلقه نحن */
const subs = new Set<() => void>();
function emit() { subs.forEach((f) => { try { f(); } catch { /* مشترك معطوب لا يُسقط الباقين */ } }); }

/** هل ملء الشاشة الحقيقي مدعوم على عنصر عادي؟ (لا على iPhone) */
export function nativeFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as FsEl;
  return Boolean(
    (document.fullscreenEnabled && el.requestFullscreen) || el.webkitRequestFullscreen,
  );
}

/** ملء شاشة فعليّ **أو** بديلٌ بالتنسيق — كلاهما ملء شاشة عند المستخدم */
export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement || pseudoEl);
}

/** هل نحن في البديل بالتنسيق؟ (يحتاجه من يريد تكييف تخطيطه) */
export function isPseudoFullscreen(): boolean {
  return Boolean(pseudoEl);
}

export function onFullscreenChange(fn: () => void): () => void {
  subs.add(fn);
  if (typeof document !== "undefined") {
    document.addEventListener("fullscreenchange", fn);
    document.addEventListener("webkitfullscreenchange", fn);
  }
  return () => {
    subs.delete(fn);
    if (typeof document !== "undefined") {
      document.removeEventListener("fullscreenchange", fn);
      document.removeEventListener("webkitfullscreenchange", fn);
    }
  };
}

/* ════════════════════════════════════════════════════════════
   لماذا مراقبٌ على السمة `class`؟

   🐛 البديل يعمل بإضافة كلاس **مباشرةً على الـDOM**، والعنصر الذي
   يُضاف إليه عنصرٌ تديره React. وReact تكتب `className` كاملةً كلّما
   تغيّرت قيمتها بين رسمتين — فتمحو الكلاس المضاف يدوياً بلا أن
   يشعر أحد.

   ومثاله الحيّ في هذا المشروع (`solo-simulator.tsx`):

       className={`bz-exam-running ... ${urgent ? "is-urgent" : ""}`}

   فحين يبلغ العدّاد آخر خمس دقائق تنقلب `urgent`، وتُعيد React كتابة
   السمة، **فيسقط ملء الشاشة من نفسه في أحرج لحظة في الامتحان**. ولا
   يظهر العطب على Android إطلاقاً لأنّ الـAPI الحقيقي هناك لا يعتمد
   على كلاس أصلاً — وهذا وحده يفسّر «تعمل على Android ولا تعمل على
   iPhone».

   الحلّ ألّا نأتمن أحداً على السمة: نراقبها ونُعيد الكلاس إن سقط.
   وهذا يُبقي واجهة الوحدة كما هي فلا يحتاج أيّ نداء إلى تعديل.
   ════════════════════════════════════════════════════════════ */
let pseudoGuard: MutationObserver | null = null;
/** الأسلاف الذين رُفعوا لأجل البديل — تُعاد حالتهم عند الخروج */
let raisedAncestors: HTMLElement[] = [];

/* ════════════════════════════════════════════════════════════
   لماذا لا يكفي `position: fixed` وحده — سبب بقاء iPhone معطوباً

   ملء الشاشة الحقيقي يرفع العنصر إلى **الطبقة العليا** (top layer):
   طبقة خارج شجرة التكديس كلّها، لا يعلوها شيء بحكم المواصفة. ولهذا
   «يعمل على Android» بلا أن يحتاج أحدٌ إلى التفكير في `z-index`.

   والبديل بالتنسيق **لا طبقة عليا له**. فالعنصر يصير `position: fixed`
   بمقاس الشاشة فعلاً — لكنّه يبقى محبوساً في شجرة التكديس حيث هو.
   وفي هذه الغرفة تحديداً:

       main.bz-room
         └ section#bz-room-stage
             └ div.bz-stage            (شبكة)
                 └ div.bz-pane         ← zIndex: 2 ⇒ **سياق تكديس**
                     └ div.bz-room-exam-stage.bz-fullscreen  z-index: 9999

   الـ9999 لا قيمة لها خارج سياقها: العنصر كلّه يُرسم عند المستوى 2
   من منظور إخوة اللوحة. وشريط التحكّم `z-index: var(--z-chrome)`
   وشريط الغرفة العلوي إخوةٌ **أعلى** في الشجرة — فيُرسمان فوق قاعة
   الامتحان «الممتلئة». والنتيجة عند المستخدم: ضغطة تبدو بلا أثر.

   وهذا هو نفس صنف الخطأ الذي دفن كونسول السبورة خلف مبدّل الشاشتين.
   السياقات المتداخلة تُبطل الأرقام الكبيرة بصمت.

   فنصنع للبديل طبقةً عليا يدوياً: نرفع كل سلف بين العنصر و`body`.
   و`transform`/`filter`/`contain` تُلغى معها لأنّها — إن وُجدت على
   أيّ سلف — تجعل `position: fixed` نسبةً إلى ذلك السلف لا إلى
   الشاشة، فيمتلئ العنصر لوحته بدل شاشته.

   (`z-index` يعمل على عناصر الشبكة والـflex بلا `position` — وكل ما
   في هذا المسار عنصر شبكة أو flex، فلا نحتاج إلى المساس بتموضعها.)
   ════════════════════════════════════════════════════════════ */
const ANCESTOR_CLASS = "bz-fs-ancestor";

function raiseAncestors(el: HTMLElement) {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    node.classList.add(ANCESTOR_CLASS);
    raisedAncestors.push(node);
    node = node.parentElement;
  }
}

function restoreAncestors() {
  raisedAncestors.forEach((n) => n.classList.remove(ANCESTOR_CLASS));
  raisedAncestors = [];
}

function applyPseudo(el: HTMLElement) {
  pseudoEl = el;
  el.classList.add(PSEUDO_CLASS);
  document.body.classList.add(BODY_CLASS);
  /* سطحٌ داخل الغرفة (قاعة الامتحان، السبورة) لا الغرفة نفسها ⇒
     أخفِ أشرطة الغرفة. رفع الأسلاف يجعل السطح يعلوها في الرسم، لكنّ
     «يعلوها» ليس «يحلّ محلّها»: يبقى شريط التحكّم يلتقط اللمس عند
     حافّته، ويبقى الشريط العلوي مرئياً على الأجهزة التي تُخفق فيها
     مقارنة `z-index` عبر سياقات متداخلة. الإخفاء الصريح لا يعتمد على
     ترتيب رسمٍ يُخطئ. */
  if (!el.classList.contains("bz-room")) {
    document.body.classList.add(BODY_CLASS_INNER);
  }
  raiseAncestors(el);

  pseudoGuard?.disconnect();
  if (typeof MutationObserver === "undefined") return;
  pseudoGuard = new MutationObserver(() => {
    if (pseudoEl && !pseudoEl.classList.contains(PSEUDO_CLASS)) {
      pseudoEl.classList.add(PSEUDO_CLASS);
    }
    if (pseudoEl && !document.body.classList.contains(BODY_CLASS)) {
      document.body.classList.add(BODY_CLASS);
    }
  });
  pseudoGuard.observe(el, { attributes: true, attributeFilter: ["class"] });
  pseudoGuard.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

function clearPseudo() {
  pseudoGuard?.disconnect();
  pseudoGuard = null;
  restoreAncestors();
  document.body.classList.remove(BODY_CLASS_INNER);
  if (!pseudoEl) return;
  pseudoEl.classList.remove(PSEUDO_CLASS);
  document.body.classList.remove(BODY_CLASS);
  pseudoEl = null;
}

/* ── تثبيت الاتجاه أفقياً ──
   مدعوم على Chrome/Android (وفي التطبيق المثبَّت خاصّةً)، وغير مدعوم
   في Safari على iOS إطلاقاً — لا API له. فلا نُبنى عليه: نطلبه ونمضي.

   وشرطان كثيراً ما يُنسيان فيبدو القفل «معطوباً»:
   ١) لا يُقبل إلّا **داخل** ملء الشاشة الحقيقي — فيجب أن يأتي بعده.
   ٢) `orientation` في المانيفست إن كانت `portrait` فهي تُلغي القفل في
      التطبيق المثبَّت. (كانت كذلك في هذا المشروع — صُحّحت.) */
export function orientationLockSupported(): boolean {
  if (typeof screen === "undefined") return false;
  const so = screen.orientation as (ScreenOrientation & { lock?: unknown }) | undefined;
  return typeof so?.lock === "function";
}

async function lockLandscape() {
  const so = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  try { await so?.lock?.("landscape"); } catch { /* غير مدعوم أو مرفوض — لا يضرّ */ }
}

function unlockOrientation() {
  const so = screen.orientation as (ScreenOrientation & { unlock?: () => void }) | undefined;
  try { so?.unlock?.(); } catch { /* تجاهل */ }
}

export async function enterFullscreen(el?: HTMLElement | null, opts?: { landscape?: boolean }) {
  const target = (el ?? document.documentElement) as FsEl;
  let native = false;
  try {
    if (document.fullscreenEnabled && target.requestFullscreen) {
      await target.requestFullscreen();
      native = true;
    } else if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
      native = true;
    }
  } catch {
    /* المتصفّح رفض (iOS على عنصر عادي، أو منع بلا تفاعل مستخدم) */
  }

  /* هذا هو جوهر الإصلاح: إن لم ينجح الحقيقي، **نُكمل** بالبديل بدل
     أن نستسلم صامتين كما كان يحدث على الـiPhone. */
  if (!native && el) applyPseudo(el);

  if (opts?.landscape && native && typeof window !== "undefined"
      && window.innerHeight > window.innerWidth) {
    await lockLandscape();
  }
  emit();
  return isFullscreen();
}

export async function exitFullscreen() {
  unlockOrientation();
  clearPseudo();
  const d = document as FsDoc;
  try {
    if (d.exitFullscreen && d.fullscreenElement) await d.exitFullscreen();
    else if (d.webkitExitFullscreen && d.webkitFullscreenElement) await d.webkitExitFullscreen();
  } catch { /* تجاهل */ }
  emit();
  return isFullscreen();
}

export async function toggleFullscreen(el?: HTMLElement | null, opts?: { landscape?: boolean }) {
  if (isFullscreen()) return exitFullscreen();
  return enterFullscreen(el, opts);
}

/* ════════════════════════════════════════════════════════════
   الحالة في React

   🐛 الأزرار كانت تستمع لـ`fullscreenchange` وحده. والبديل بالتنسيق
   **لا يُطلق هذا الحدث أبداً** — فعلى الـiPhone كانت الشاشة تُملأ
   فعلاً بينما تبقى الأيقونة على «ادخل» والحالة `false`. زرّ يكذب.

   `onFullscreenChange` هنا يجمع الاثنين: حدث المتصفّح للحقيقي،
   و`emit()` للبديل. فمصدر الحقيقة واحد على الجهازين.
   ════════════════════════════════════════════════════════════ */
export function useFullscreenState(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    sync();
    return onFullscreenChange(sync);
  }, []);
  return on;
}


/* ════════════════════════════════════════════════════════════
   الحقيقة عن ملء الشاشة على iPhone — وحدود ما يمكن وعده

   بعد ثلاث محاولات إصلاح يجب أن يُقال صريحاً: **لا توجد وسيلة تجعل
   Safari على iPhone يُخفي شريط العنوان وشريط التنقّل.** ليست مسألة
   شيفرة أفضل:

     • `Element.requestFullscreen` غير موجود على iPhone إطلاقاً.
     • `webkitRequestFullscreen` غير موجود على العناصر — يوجد
       `webkitEnterFullscreen` على `<video>` وحده، ولا يقبل غيره.
     • ولا واجهة أخرى تمسّ واجهة المتصفّح.

   وهذا هو الفرق الحقيقي عن Android: هناك يُخفي `requestFullscreen`
   واجهة Chrome كاملةً؛ هنا لا شيء يفعلها. فالبديل بالتنسيق يُعطي كل
   ما يمكن إعطاؤه — الصفحة تملأ **مساحتها** كلّها وتختفي أشرطة
   التطبيق — لكنّ شريطي Safari يبقيان.

   والطريق الوحيد إلى ملء شاشة حقيقي على iPhone هو تثبيت التطبيق على
   الشاشة الرئيسية: في الوضع المستقلّ (standalone) لا واجهة متصفّح
   أصلاً، فتكون الشاشة كاملةً للامتحان.

   ولذلك نكشف الحالة بدل أن ندّعي النجاح: الواجهة تعرض للطالب على
   iPhone سطراً واحداً يشرح الحدّ ويدلّه على التثبيت، بدل زرٍّ يُضغط
   فلا يبدو أنّه فعل شيئاً — وهذا أسوأ ما في التجربة: لا العطب، بل
   الوعد الذي لا يُوفَّى.
   ════════════════════════════════════════════════════════════ */

/** التطبيق مُثبَّت ويعمل بلا واجهة متصفّح؟ */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(
    iosStandalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches,
  );
}

/** iPhone/iPad داخل Safari (لا كتطبيق مثبَّت) */
export function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ يتنكّر في هيئة Mac — تمييزه باللمس
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  return isIos && !isStandalone();
}

/**
 * هل يستطيع هذا المتصفّح إخفاء واجهته فعلاً؟
 *
 * تُستعمل لتقرير ما يُقال للمستخدم، لا لتعطيل شيء: البديل يعمل في
 * الحالتين، لكنّ الوعد يختلف.
 */
export function canHideBrowserChrome(): boolean {
  return isStandalone() || nativeFullscreenSupported();
}


/* ════════════════════════════════════════════════════════════
   أين تُسقَط الطبقات العائمة أثناء ملء الشاشة

   🐛 **«كل الأدوات» و«الدردشة» و«الصفّ» لا تفتح في وضع الشاشة
   الكاملة.** والسبب ليس في الأوراق نفسها بل في مكان إسقاطها:

       const portalRoot = document.body;   // في bottom-sheet.tsx

   وملء الشاشة الحقيقي يضع عنصره في **الطبقة العليا** (top layer).
   وقاعدة هذه الطبقة قاطعة: كل ما ليس داخل العنصر الممتلئ **لا
   يُعرض إطلاقاً** — لا يُغطّى بل يُستبعد من الرسم، ولا ينفع معه
   `z-index` مهما بلغ. فورقةٌ في `body` بينما الغرفة ممتلئة ورقةٌ
   موجودة في الـDOM لا يراها أحد. تُفتح فعلاً ولا تظهر.

   ولهذا لم يظهر العطب على الـiPhone: هناك البديل بالتنسيق لا طبقة
   عليا فيه، فالورقة تُرى. عطبٌ يخصّ **الأجهزة التي يعمل عليها ملء
   الشاشة الحقيقي** — أي عكس ما اعتدناه في هذا المشروع.

   القاعدة: الطبقة العائمة تُسقَط داخل ما هو ممتلئ الآن. و`overflow`
   عليه لا يقصّها لأنّها `position: fixed`، و`fixed` داخل عنصر ممتلئ
   يقيس من حدوده — وهي الشاشة نفسها.
   ════════════════════════════════════════════════════════════ */
export function getFullscreenHost(): HTMLElement {
  if (typeof document === "undefined") return null as unknown as HTMLElement;
  const d = document as FsDoc;
  const native = (d.fullscreenElement ?? d.webkitFullscreenElement) as HTMLElement | null;
  return native ?? pseudoEl ?? document.body;
}
