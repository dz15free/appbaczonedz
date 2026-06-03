# BacZoneDZ 🎓

أكبر مجتمع دراسي تفاعلي لطلاب البكالوريا في الجزائر — منصة تعمل **بصفر دولار**.

## الحزمة المجانية ($0، بلا بطاقة)
- **الواجهة + الخادم:** Next.js على Cloudflare Pages/Workers
- **المصادقة + قاعدة البيانات:** Firebase Auth + Firestore + RTDB (باقة Spark)
- **تخزين الملفات:** Supabase Storage / Cloudinary
- **الصوت الجماعي:** Cloudflare Realtime (SFU + TURN) — يعمل على 3G/4G
- **الذكاء الاصطناعي (Omibot):** Google Gemini (عبر Cloudflare Worker)

## التشغيل محلياً
```bash
npm install
cp .env.example .env.local   # ثم املأ مفاتيح Firebase
npm run dev                  # http://localhost:3000
```

## النشر المجاني على Cloudflare
```bash
npm run deploy
```

## هيكل المشروع
```
src/
├─ app/          # صفحات Next.js (App Router) + نظام التصميم
├─ components/   # مكوّنات الواجهة (نظام تصميم)
├─ features/     # منطق كل ميزة معزولاً (auth, rooms, whiteboard, voice, chat, files, community, omibot)
├─ lib/firebase/ # تهيئة Firebase
└─ stores/       # حالة Zustand
```

## خارطة الطريق
المرحلة 1 (الحالية): الأساس ✅ — المرحلة 2: المصادقة — المرحلة 3: غرفة الدراسة — ... (انظر وثيقة المعمارية).
