"use client";

import { useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { STUDY_QUOTES } from "@/features/study/quotes";

/* ════════════════════════════════════════════════════════════
   تذكيرات الدراسة — سلسة وغير مزعجة

   الإشعار التحفيزي سلاح ذو حدّين: القليل منه يدفع، والكثير منه يجعل
   الطالب يُطفئ الإشعارات **كلّها** فيخسر حتى تنبيهات الغرف المهمّة.

   لذلك بُنيت على قيود صارمة، كلّ واحد منها يمنع سبباً حقيقياً للإزعاج:

   1. **مرّة واحدة كل 24 ساعة** — لا أكثر مهما فتح التطبيق.
   2. **بين 4 مساءً و9 مساءً فقط** — وقت المراجعة عند أغلب الطلبة،
      ولا إشعار يوقظ أحداً أو يقاطع حصّة صباحية.
   3. **للطالب وحده** — الأستاذ والإداري لا يُذكَّران بالمراجعة.
   4. **لا يظهر لمن دخل اليوم فعلاً** — من يدرس الآن لا يحتاج من
      يذكّره بالدراسة؛ التذكير له إهانة لا تحفيز.
   5. **يتوقّف بعد ثلاث مرّات متجاهَلة** — إن لم يتفاعل، فالرسالة لا
      تصله. الإصرار بعدها إزعاج محض.

   والنصّ من نفس بنك الحِكَم في الموقع، فلا تتفرّق نبرة المنصّة.
════════════════════════════════════════════════════════════ */

/* ⚠️ لا نكتب داخل `users/{uid}` إطلاقاً.

   العقدة `users/{uid}` تحمل **هويّة المستخدم ودوره**، وقاعدة الكتابة
   عليها تقارن الدور القديم بالجديد. وكل كتابة عليها تُطلق مستمع الملفّ
   الشخصي من جديد.

   وبمقارنة النسخة العاملة بالمُعطِبة كان هذا **التغيير الوظيفي الوحيد**
   بينهما: كتابتان على عقدة الهويّة عند كل فتح للرئيسية.

   فبيانات النشاط انتقلت إلى مسار مستقلّ `activity/{uid}` — لا تمسّ
   الهويّة، ولا تُطلق مستمع الدور، ولا تخضع لقاعدة تقارن الأدوار.
   وهي بيانات ثانوية أصلاً: مكانها ليس مع الهويّة. */

const ACTIVITY = "activity";

const KEY = "bz-nudge";              // آخر ظهور محلّياً
const DAY = 86_400_000;
const START_HOUR = 16;
const END_HOUR = 21;
const MAX_IGNORED = 3;

type Local = { last: number; ignored: number };

function readLocal(): Local {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { last: 0, ignored: 0 };
    const v = JSON.parse(raw) as Local;
    return { last: Number(v.last) || 0, ignored: Number(v.ignored) || 0 };
  } catch {
    return { last: 0, ignored: 0 };
  }
}

function writeLocal(v: Local) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* معطّل */ }
}

/** رسالة اليوم: حكمة + دعوة قصيرة لفعل واحد */
function pickMessage() {
  const q = STUDY_QUOTES[Math.floor(Math.random() * STUDY_QUOTES.length)] ?? STUDY_QUOTES[0];
  return { title: q.text, body: q.hint };
}

export function useStudyNudge(uid?: string, role?: string) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (!uid) return;
    // الأستاذ والإداري لا يُذكَّران بالمراجعة
    if (role && role !== "student") return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // لا نطلب الإذن أبداً من هنا: الطلب غير المتوقّع أسوأ من عدم الإشعار
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const hour = now.getHours();
    if (hour < START_HOUR || hour >= END_HOUR) return;

    const local = readLocal();
    if (Date.now() - local.last < DAY) return;
    if (local.ignored >= MAX_IGNORED) return;

    done.current = true;
    let alive = true;

    (async () => {
      try {
        /* من درس اليوم لا يحتاج تذكيراً بالدراسة. نقرأ آخر نشاط
           مسجّل؛ وإن تعذّرت القراءة نُكمل بدل أن نحرمه الرسالة. */
        const snap = await get(ref(rtdb, `${ACTIVITY}/${uid}/lastActiveDay`));
        const today = new Date().toDateString();
        if (snap.exists() && snap.val() === today) return;
        if (!alive) return;

        const { title, body } = pickMessage();
        const n = new Notification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-72.png",
          tag: "bz-study-nudge",     // يستبدل السابق بدل أن يتكدّس
          silent: true,              // بلا صوت: تذكير لا إنذار
          requireInteraction: false, // يختفي وحده
        });

        // تفاعل = الرسالة تصل؛ نُصفّر عدّاد التجاهل
        n.onclick = () => {
          writeLocal({ last: Date.now(), ignored: 0 });
          window.focus();
          n.close();
        };

        const cur = readLocal();
        writeLocal({ last: Date.now(), ignored: cur.ignored + 1 });
        void set(ref(rtdb, `${ACTIVITY}/${uid}/lastNudge`), Date.now()).catch(() => {});
      } catch { /* لا نُزعج المستخدم بخطأ تذكير */ }
    })();

    return () => { alive = false; };
  }, [uid, role]);
}

/** يُسجّل أنّ الطالب نشط اليوم — يمنع تذكير من يدرس أصلاً */
export async function markActiveToday(uid: string) {
  try {
    await set(ref(rtdb, `${ACTIVITY}/${uid}/lastActiveDay`), new Date().toDateString());
  } catch { /* غير حرج */ }
}
