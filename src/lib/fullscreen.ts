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

function applyPseudo(el: HTMLElement) {
  pseudoEl = el;
  el.classList.add(PSEUDO_CLASS);
  document.body.classList.add(BODY_CLASS);
}

function clearPseudo() {
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
