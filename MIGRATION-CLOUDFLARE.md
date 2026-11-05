# BacZone — الانتقال من Vercel إلى Cloudflare Workers

> **لـ Claude Code:** اقرأ هذا الملف كاملاً قبل أيّ تعديل. هو خلاصة فحص سابق لكود المشروع.
> المالك يتواصل بالعربية — أجبه بالعربية.

## الهدف والقواعد

- نقل baczone.app من Vercel إلى **Cloudflare Workers** عبر **OpenNext** (`@opennextjs/cloudflare`)، ثمّ الانسحاب من Vercel نهائياً.
- **المرحلة 1 لا تغيّر أيّ شيء في الواجهة.** نفس الشكل، نفس السلوك. أيّ عطل بعد الانتقال يجب أن يكون سببه الانتقال وحده.
- العمل على فرع **`cloudflare-migration`** فقط. لا دمج في `main` قبل نجاح كلّ قائمة الاختبار.
- النشر التجريبي على **`cf.baczone.app`**، ويبقى Vercel شغّالاً على `baczone.app` حتى التحويل.
- **لا تكتب أيّ سرّ في الكود أو في الـ commits.** الأسرار عبر `wrangler secret put` أو لوحة Cloudflare.
- الخطّة المطلوبة: **Workers Paid (5 دولارات شهرياً)**. الخطّة المجانية تحدّ وقت المعالجة بـ 10 ms لكلّ طلب، وصفحات Next.js المولّدة على الخادم تتجاوزه فتظهر أخطاء عشوائية.

## ما نعرفه عن المشروع (من الفحص)

- **Next.js 15.5** App Router، TypeScript، Tailwind، Firebase Auth + RTDB (من جهة العميل)، Cloudflare Realtime للصوت.
- **`wrangler.toml` موجود** (`nodejs_compat`، `main = ".open-next/worker.js"`)، لكن `@opennextjs/cloudflare` **غير مثبّت** بعد.
- **لا `firebase-admin`، ولا `fs`، ولا `child_process`** في `src/` — أكبر عائقين غائبان.
- **12 مسار API** في `src/app/api/`:
  `admin/rooms`، `aibot`، `omibot`، `ocr-math`، `link-preview`، `realtime/[...path]`، `chargily/checkout`، `chargily/webhook`، `push`، `indexnow`، `blog/revalidate`، `public/revalidate`.
  أغلبها `export const runtime = "nodejs"` — يعمل على Workers مع `nodejs_compat`.
- **التشفير:**
  - `chargily/webhook` يستعمل `crypto.createHmac` و`crypto.timingSafeEqual` — مدعومان في workerd.
  - ⚠️ **`src/lib/webpush-native.ts`** يستعمل `createECDH` و`createCipheriv` و`hkdf` من `node:crypto`. **غير مؤكَّد دعم `createECDH` في workerd.** اختبره (القسم 5). إن لم يُدعم: انقله إلى WebCrypto (ECDH P-256 + HKDF + AES-128-GCM عبر `crypto.subtle`) — الملفّ يستعمل `crypto.subtle` جزئياً أصلاً.
- **ISR / إعادة التحقّق** في 10 ملفّات:
  `app/page.tsx`، `app/blog/page.tsx`، `app/blog/[slug]/page.tsx`، `app/blog/sitemap.ts`، `app/specialties/page.tsx`، `app/specialties/[slug]/page.tsx`، `app/author/[slug]/page.tsx`، `app/indexnow-key.txt/route.ts`، `app/api/blog/revalidate/route.ts`، `app/api/public/revalidate/route.ts`.
  → يحتاج **incremental cache على R2**. وإعادة التحقّق عند الطلب (`revalidatePath`/`revalidateTag` من مساري revalidate) تحتاج إعداد OpenNext الخاصّ بها — **راجع توثيق OpenNext Cloudflare الحاليّ** (queue + tag cache). إن تعقّد: اكتفِ مؤقّتاً بـ `revalidate` الزمني.
- **`next/image`** في ملفّين فقط، والصور من Supabase وCloudinary وGoogle. → `images: { unoptimized: true }` (تحسين الصور على Cloudflare مدفوع ولا حاجة له هنا).
- **PWA موجود:** `public/manifest.json`، `public/sw.js`، `src/components/ui/install-app-banner.tsx` (يستعمل `beforeinstallprompt`). رؤوس `sw.js` معرّفة في `next.config` → تحقّق أنّها تُطبَّق على Workers (قد تحتاج `public/_headers`).

## متغيّرات البيئة (كاملة)

**عامّة — يجب أن تكون متوفّرة وقت البناء** (`NEXT_PUBLIC_*` تُحقن في الحزمة):
```
NEXT_PUBLIC_FIREBASE_API_KEY  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY  NEXT_PUBLIC_GOOGLE_CLIENT_ID
NEXT_PUBLIC_VAPID_PUBLIC_KEY  NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_GA_ID  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION      ← ⚠️ غير موجودين في .env.example
```
**أسرار الخادم** (`wrangler secret put`):
```
CLOUDFLARE_REALTIME_APP_ID  CLOUDFLARE_REALTIME_APP_SECRET  CLOUDFLARE_TURN_KEY_ID  CLOUDFLARE_TURN_KEY_API_TOKEN
REALTIME_REQUIRE_AUTH  GEMINI_API_KEY  VAPID_PRIVATE_KEY  VAPID_EMAIL
CHARGILY_SECRET_KEY  CHARGILY_MODE  FIREBASE_DB_SECRET
INDEXNOW_KEY                                                  ← ⚠️ غير موجود في .env.example
```
→ أضف الثلاثة الناقصة إلى `.env.example`. انسخ القيم من لوحة Vercel (Settings → Environment Variables).

## الخطوات

### 1. التحضير
- [ ] `git checkout -b cloudflare-migration`
- [ ] `npm i -D @opennextjs/cloudflare wrangler` ثمّ `npx wrangler login`
- [ ] حدّث `compatibility_date` في `wrangler.toml` إلى تاريخ حديث يدعمه OpenNext، مع إبقاء `nodejs_compat`.

### 2. إعداد OpenNext
- [ ] أنشئ `open-next.config.ts` حسب توثيق `@opennextjs/cloudflare` الحاليّ، مع incremental cache على R2.
- [ ] `npx wrangler r2 bucket create baczone-next-cache` وأضف الربط في `wrangler.toml`.
- [ ] سكربتات `package.json`: `preview` (بناء + `wrangler dev`)، `deploy`، `cf-typegen`.
- [ ] `next.config`: `images.unoptimized = true`.
- [ ] `.gitignore`: `.open-next/`، `.wrangler/`، `.dev.vars`.

### 3. التشغيل المحلّي
- [ ] `.dev.vars` بالأسرار (لا يُرفع).
- [ ] `npm run preview` — افتح الصفحات الرئيسية والمسارات وتأكّد من غياب أخطاء workerd.

### 4. القياس قبل النشر
- [ ] حجم الـ worker بعد الضغط ضمن حدّ الخطّة.
- [ ] لا مكتبة تتطلّب Node غير مدعوم (راقب أخطاء `wrangler dev`).

### 5. نقاط الخطر — اختبرها صراحةً
- [ ] **الإشعارات:** أرسل إشعاراً تجريبياً عبر `/api/push`. إن فشل `createECDH` ← انقل `webpush-native.ts` إلى WebCrypto.
- [ ] **Chargily webhook:** تحقّق أنّ قراءة الجسم الخام (`rawBody`) والتوقيع يعملان (استعمل وضع الاختبار `CHARGILY_MODE=test`).
- [ ] **revalidate:** نشر مقال من لوحة الأدمن يجب أن يظهر في `/blog` (فوراً أو بعد مدّة `revalidate`).
- [ ] **رؤوس `sw.js`:** `Service-Worker-Allowed: /` و`no-cache`.

### 6. النشر التجريبي على `cf.baczone.app`
- [ ] في لوحة Cloudflare: Workers & Pages ← الـ worker ← **Settings ← Builds ← اربط مستودع GitHub**، فرع `cloudflare-migration`، أمر البناء `npx opennextjs-cloudflare build`، وأمر النشر `npx wrangler deploy`. أضف `NEXT_PUBLIC_*` كمتغيّرات بناء.
- [ ] أضف **Custom Domain** `cf.baczone.app` للـ worker.
- [ ] ⚠️ **Firebase Console ← Authentication ← Settings ← Authorized domains:** أضف `cf.baczone.app`، وإلّا يفشل تسجيل الدخول على نطاق التجربة.
- [ ] ⚠️ **Google Cloud Console ← OAuth client:** أضف `https://cf.baczone.app` إلى Authorized JavaScript origins (تسجيل الدخول بـ Google).

## قائمة الاختبار على `cf.baczone.app` (كلّها قبل التحويل)

| # | الاختبار | النتيجة |
|---|---|---|
| 1 | الصفحة الرئيسية، المقالات، مقال مفرد، التخصّصات، تخصّص مفرد، الأدوات | |
| 2 | `sitemap.xml` و`robots.txt` و`ads.txt` و`indexnow-key.txt` | |
| 3 | إنشاء حساب، دخول بالبريد، دخول بـ Google، خروج | |
| 4 | المجتمع: نشر، تعليق، تصويت، صورة/ملف | |
| 5 | **غرفة دراسة: صوت جماعي بين جهازين حقيقيين** (واحد على بيانات الهاتف) | |
| 6 | السبورة، الدردشة، الفيديو المتزامن، الملفّات داخل الغرفة | |
| 7 | المساعد الذكي (`aibot`/`omibot`) و`ocr-math` | |
| 8 | الدفع بوضع الاختبار + وصول الـ webhook + فتح المحتوى | |
| 9 | إشعار push على أندرويد وعلى الحاسوب | |
| 10 | تثبيت التطبيق (PWA) وعمل `sw.js` | |
| 11 | لوحة الأدمن: نشر مقال جديد يظهر في الموقع | |
| 12 | سرعة الصفحات على الهاتف (PageSpeed) — لا تراجع مقارنة بـ Vercel | |

## التحويل النهائي

- [ ] دمج `cloudflare-migration` في `main`، وتحويل Builds إلى `main`.
- [ ] إضافة `baczone.app` (و`www`) كـ Custom Domain للـ worker، وإزالتهما من Vercel.
- [ ] **Chargily:** تحديث رابط الـ webhook إن تغيّر.
- [ ] Search Console: لا تغيير (النطاق نفسه). أعد إرسال `sitemap.xml`.
- [ ] **إبقاء مشروع Vercel متوقّفاً لا محذوفاً لمدّة 7 أيّام** للتراجع: التراجع = إعادة ربط النطاق بـ Vercel.
- [ ] بعد 7 أيّام دون مشاكل: فصل GitHub عن Vercel وحذف المشروع.

## ما بعد الانتقال (مراحل لاحقة — لا تبدأها في المرحلة 1)

1. **رفع الفيديو المباشر للدورات عبر R2:** رفع من المتصفّح مباشرة برابط موقَّع (presigned PUT)، ورسائل مؤقّتة للدورات المدفوعة. التكلفة: 10 GB مجّاناً ثمّ 0.015$/GB، والمشاهدة مجّانية (لا رسوم نقل).
2. **مشغّل موحّد** (Plyr أو Vidstack — مفتوحا المصدر) في الدورات والغرف لـ YouTube وMP4، مع الحفاظ على منطق التزامن في `src/features/video/video-sync.tsx`. **Google Drive يبقى بمشغّل Google داخل إطار المنصّة** — لا توجد طريقة رسمية للتحكّم فيه.
3. **التصميم الجديد وتجربة التثبيت:** تطوير `install-app-banner.tsx` — زرّ تثبيت حقيقي على أندرويد والحاسوب، ونافذة تعليمات مصوّرة لآيفون (Apple لا تسمح بزرّ تثبيت مباشر).

## مراجع المرحلة السابقة

- `SPECIALTIES-DAILY.md` — دليل التخصّصات (اكتمل 260/260)، وقائمة الصفحات المخفية عمداً في `GENERAL_SOURCE_ONLY_NOINDEX` (`src/features/guide/guide-merge.ts`).
- لا تضف مجلّد `src/app/demo-video/` إن صادفته في نسخة قديمة: صفحات تصوير محلّية للإعلان فقط.
