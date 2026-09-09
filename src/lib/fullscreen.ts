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
