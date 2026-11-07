# سجلّ التغييرات — BacZone

## المرحلة 0 — الانتقال إلى Cloudflare Workers (فرع `cloudflare-migration`)

### 2026-11-07
- **Cloudflare Builds:** ملفّ `.env.production` بالمتغيّرات العامّة فقط (11 متغيّراً، كلّها ظاهرة أصلاً
  في كود الموقع) كي يُبنى الموقع على Cloudflare دون إدخالها يدوياً. لا أسرار فيه، وأُبعد عنه ما لا يستعمله
  الكود (Supabase وCloudinary). جُرّب بناءٌ كامل بهذا الملفّ وحده دون `.env.local`.
- **السرعة:** ذاكرة إقليمية فوق R2 (`withRegionalCache`، وضع long-lived) واعتراض الكاش
  (`enableCacheInterception`) في `open-next.config.ts`. زمن أوّل استجابة من الجزائر صار قريباً
  من Vercel (فارق 20–80 ms بدل 80–490 ms)، وصفحة المقالات أسرع منه.
- **الصوت:** تفعيل TURN على Cloudflare (سرّان على الـ worker: `CLOUDFLARE_TURN_KEY_ID` و
  `CLOUDFLARE_TURN_KEY_API_TOKEN`). يمرّر الصوت عبر المنفذ 443 في الشبكات التي تحجب UDP. مجّاني مع Realtime.
- **تحقّق:** `createECDH` و`hkdf` وAES-128-GCM تعمل على workerd، فالإشعارات لا تحتاج إعادة كتابة.
  ويب هوك Chargily يتحقّق من التوقيع على الجسم الخام كما على Vercel (403 للتوقيع المزوّر).

### 2026-11-05
- إعداد OpenNext (`@opennextjs/cloudflare` 1.20.16) وwrangler 4، وترقية Next إلى 15.5.29.
- R2 ‏`baczone-next-cache` للكاش، وD1 ‏`baczone-next-tag-cache` لـ `revalidatePath`، وطابور Durable Object لـ ISR.
- `public/_headers` لرؤوس `sw.js` والأصول الثابتة، و`images.unoptimized`.
- النشر التجريبي على `cf.baczone.app`. ‏`baczone.app` يبقى على Vercel حتى التحويل.
