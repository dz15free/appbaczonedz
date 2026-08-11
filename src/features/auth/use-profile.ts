"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface Profile {
  name?: string;
  email?: string;
  track?: string | null;
  teachSubject?: string | null; // المادة التي يدرّسها الأستاذ
  wilaya?: string | null;
  role?: string;
  points?: number;
  level?: number;
  streak?: number;
  quizCount?: number;
  postCount?: number;
  commentCount?: number;
  avatarUrl?: string | null;
}

/* ════════════════════════════════════════════════════════════
   🐛 «الأدمن يظهر كطالب حتى أُحدّث الصفحة مرّات»

   السبب: الخطّاف كان يبدأ بـ`null` دائماً، وقراءة الدور من قاعدة
   البيانات تستغرق مئات الأجزاء من الثانية. وفي تلك الفجوة تُصيَّر
   الواجهة بـ`profile?.role === "admin" ? … : …` — والنتيجة **فرع
   الطالب**، لأنّ «لم يصل بعد» و«ليس أدمن» كانا يبدوان سواءً.

   فليست المشكلة في الصلاحيات بل في **الحالة الوسيطة**.

   الإصلاح من طبقتين:

   1. **ذاكرة محلّية للملفّ الشخصي** مفتاحها المعرّف: يُعرض الدور
      **فوراً** من آخر قراءة معروفة، ثم تُصحّحه قاعدة البيانات. فلا
      وميض أصلاً — وهذا يُصلح المواضع الثمانية عشر كلّها بلا لمسها.

   2. **`loading` صريحة** لمن يحتاج التمييز فعلاً (حارس، إعادة توجيه):
      «لا أعرف بعد» ليست «طالب».

   الذاكرة **مربوطة بالمعرّف**: عند تبديل الحساب لا تُقرأ نسخة الحساب
   السابق. وتُقرأ مرّة واحدة عند التركيب لا في كل تصيير.
════════════════════════════════════════════════════════════ */

const CACHE_PREFIX = "bz-profile:";

function readCache(uid?: string): Profile | null {
  if (!uid || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCache(uid: string, p: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(p));
    else localStorage.removeItem(CACHE_PREFIX + uid);
  } catch {
    /* التخزين قد يكون ممتلئاً أو معطّلاً — لا يضرّ */
  }
}

export function useProfileState(uid?: string) {
  // لا نقرأ التخزين هنا مباشرة: التصيير على الخادم لا يراه، فيختلف
  // ناتج الخادم عن المتصفّح (Hydration mismatch). نبدأ فارغين ونملأ
  // من الذاكرة فور التركيب.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /* 🐛 **سبب اختفاء صفحة «إنشاء دورة»** — سباق حالة لا صلاحيات.

     حين تكون المصادقة قيد التحميل يصل `uid` غير معرّف، فكنّا نضع
     `loading=false` → أي `ready=true` بينما `profile=null` → `isStaff`
     خطأ. ثم تصل المصادقة، وفي **التصيير الذي يلي وصول المستخدم مباشرة**
     — قبل أن يُعيد هذا الخطّاف اشتراكه — تبقى الحالة القديمة، فيرى
     الحارس «جاهز ولستَ أستاذاً» ويُعيد التوجيه.

     الحلّ: `ready` تعني **«حمّلتُ هذا المعرّف بعينه»** لا «لستُ
     مشغولاً». نحفظ المعرّف الذي اكتملت قراءته، فتُصبح الجاهزية
     **متزامنة مع الـuid** ولا يمكن أن تسبقه. ويُصلح هذا كل حارس في
     الموقع لا صفحة الدورات وحدها. */
  const [loadedUid, setLoadedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setLoadedUid(null);
      return;
    }
    // معرّف جديد: نعود إلى «قيد التحميل» حتى تصل بياناته
    setLoading(true);

    const cached = readCache(uid);
    if (cached) setProfile(cached);   // العرض فوري بلا وميض

    const unsub = onValue(
      ref(rtdb, `users/${uid}`),
      (snap) => {
        const raw = (snap.val() as Profile) ?? null;

        /* 🛡️ شبكة أمان: **الدور لا يختفي أبداً**.

           لو وصلت لقطة بلا دور — لأي سبب: قراءة جزئية، تراجع عن كتابة
           مرفوضة، أو تعارض بين مستمعين على مسارات متداخلة — نحتفظ
           بالدور المعروف بدل إسقاط الأستاذ إلى واجهة الطالب.

           والدور لا يتغيّر إلّا بقرار إداري، فالإبقاء عليه أصحّ من
           تصديق لقطة ناقصة. ولو غيّرته الإدارة فعلاً وصلت اللقطة
           بالدور الجديد فيُكتب فوقه. */
        const prev = readCache(uid);
        const next: Profile | null =
          raw && !raw.role && prev?.role ? { ...raw, role: prev.role } : raw;

        setProfile(next);
        setLoading(false);
        setLoadedUid(uid);
        // لا نكتب null فوق نسخة صالحة: قد تكون قراءة عابرة فاشلة
        if (next) writeCache(uid, next);
      },
      () => {
        /* 🐛 ثغرة أُغلقت: كنّا نُعلن الجاهزية هنا حتى بلا ملفّ، فتصير
           `ready=true` و`profile=null` → `isStaff=false` → **يُطرد
           الأستاذ من صفحته**.

           القاعدة: **الجاهزية تعني «عرفتُ الدور»**، لا «توقّفت عن
           المحاولة». فإن كانت لدينا نسخة محفوظة أعلنّا الجاهزية بها،
           وإلّا بقينا غير جاهزين — والحارس يعرض «جارٍ التحميل» بدل أن
           يطرد صاحب الحقّ. */
        setLoading(false);
        const cached = readCache(uid);
        if (cached) { setProfile(cached); setLoadedUid(uid); }
      },
    );
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  /* الجاهزية تُقارن بالمعرّف الحالي: في التصيير العالق (uid جديد
     وحالة قديمة) تكون `loadedUid !== uid` فتبقى غير جاهزة — ولا
     يُعيد الحارس التوجيه. */
  /* الجاهزية = «حمّلتُ هذا المعرّف **وأعرف دوره**».
     بلا الشرط الثاني يستطيع حارسٌ أن يتّخذ قراراً نهائياً على ملفّ
     فارغ — وهو بالضبط ما كان يطرد الأستاذ. */
  const ready = uid ? loadedUid === uid && Boolean(profile) : !loading;

  return { profile, loading: uid ? !ready : loading, ready };
}

/** التوقيع القديم — يستعمله 18 موضعاً بلا تعديل */
export function useProfile(uid?: string) {
  return useProfileState(uid).profile;
}

/** الدور مع تمييز «لم يُعرف بعد» — للحرّاس وإعادة التوجيه */
export function useRole(uid?: string) {
  const { profile, loading, ready } = useProfileState(uid);
  return {
    role: profile?.role,
    loading,
    isAdmin: profile?.role === "admin",
    isTeacher: profile?.role === "teacher",
    isStaff: profile?.role === "admin" || profile?.role === "teacher",
    /** لا تتّخذ قراراً نهائياً قبل أن تصير true */
    ready,
  };
}

/** يُمسح عند الخروج حتى لا يرى الحساب التالي دور السابق */
export function clearProfileCache(uid?: string) {
  if (uid) writeCache(uid, null);
}
