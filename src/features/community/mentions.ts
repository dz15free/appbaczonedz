/* ════════════════════════════════════════════════════════════
   الإشارة إلى الأشخاص (@) — الشكل والتخزين

   لم يكن في المنصّة منشن إطلاقاً: لا في المنشورات ولا في التعليقات ولا
   في المجموعات، ولا نوع إشعار له.

   ── لماذا `mentions` خريطةٌ منفصلة لا رمزٌ داخل النصّ ──

   الطريقة الشائعة أن يُخزَّن الرمز في النصّ نفسه: `@[أمين](uid123)`.
   ورفضتُها لسببين:

   ١) أيّ سطح يعرض النصّ **خاماً** — إشعار، أو معاينة رابط، أو تصدير،
      أو نسخة قديمة من التطبيق — يُظهر `@[أمين](uid123)` أمام الطالب.
      وأسطح العرض الخام في هذا المشروع كثيرة.
   ٢) الاعتماد على الاسم وحده (`@أمين` ثمّ البحث عن صاحبه وقت العرض)
      يُخطئ حين يتشابه اسمان، ويكسر الرابط كلّه إذا غيّر الشخص اسمه.

   فالنصّ يبقى نظيفاً (`@أمين`)، وتُخزَّن معه خريطة `{ uid: name }`.
   يجتمع بذلك: عرضٌ سليم في كل مكان، وربطٌ بالمعرّف لا بالاسم.

   وقواعد RTDB تسمح بهذا الحقل بلا تعديل: كاتب المنشور يكتب كائنه
   كاملاً، والتعليق يُقبل بأيّ حقول ما دام `authorId` هو صاحبه.

   ── من أين يأتي المعرّف ──
   من **المنتقي** وقت الاختيار لا من تحليل النصّ بعده. المستخدم يكتب
   `@` فيختار من قائمة، فنسجّل معرّفه في تلك اللحظة — وهو المصدر
   الموثوق. وعند الإرسال نُبقي من بقي اسمُه في النصّ فقط، فمن حذف
   الإشارة لا يُشعَر.
   ════════════════════════════════════════════════════════════ */

/** خريطة الإشارات المحفوظة مع المنشور/التعليق: معرّف ← اسم */
export type MentionMap = Record<string, string>;

/** الحرف الذي يبدأ الإشارة */
export const MENTION_CHAR = "@";

/**
 * تنقية الخريطة قبل الحفظ: لا نُبقي إلّا من بقيت إشارته في النصّ.
 * (المستخدم يختار شخصاً ثمّ يمحو اسمه — فلا يجوز أن يُشعَر.)
 */
export function pruneMentions(text: string, picked: MentionMap): MentionMap {
  const out: MentionMap = {};
  for (const [uid, name] of Object.entries(picked)) {
    if (!name) continue;
    if (text.includes(`${MENTION_CHAR}${name}`)) out[uid] = name;
  }
  return out;
}

export interface MentionSegment {
  text: string;
  /** معرّف الشخص إن كان هذا المقطع إشارةً */
  uid?: string;
}

/**
 * تقطيع النصّ إلى مقاطع عادية ومقاطع إشارة — للعرض.
 *
 * الأسماء تُطابَق **الأطول أوّلاً**: بلا هذا يُطابق «@أمين» داخل
 * «@أمين بن علي» فيُقطع الاسم نصفين ويُربط بالشخص الخطأ.
 */
export function splitMentions(text: string, mentions?: MentionMap | null): MentionSegment[] {
  if (!text) return [];
  const entries = Object.entries(mentions ?? {}).filter(([, n]) => Boolean(n));
  if (entries.length === 0) return [{ text }];

  entries.sort((a, b) => b[1].length - a[1].length);

  const out: MentionSegment[] = [];
  let i = 0;

  outer: while (i < text.length) {
    if (text[i] === MENTION_CHAR) {
      for (const [uid, name] of entries) {
        if (text.startsWith(name, i + 1)) {
          out.push({ text: `${MENTION_CHAR}${name}`, uid });
          i += name.length + 1;
          continue outer;
        }
      }
    }
    /* تجميع النصّ العادي في مقطع واحد بدل حرفٍ حرف */
    const last = out[out.length - 1];
    if (last && !last.uid) last.text += text[i];
    else out.push({ text: text[i] });
    i++;
  }

  return out;
}

/** معرّفات من يجب إشعارهم — بلا صاحب النصّ نفسه */
export function mentionTargets(mentions: MentionMap | undefined, authorUid: string): string[] {
  return Object.keys(mentions ?? {}).filter((uid) => uid && uid !== authorUid);
}

/**
 * الكلمة الجزئية بعد `@` عند موضع المؤشّر — يستعملها المنتقي.
 * تُرجع `null` إن لم يكن المستخدم داخل إشارة.
 */
export function activeMentionQuery(text: string, caret: number): { query: string; at: number } | null {
  /* نرجع للخلف حتى نجد `@` أو فاصلاً. الحدّ عشرون حرفاً: الاسم الطويل
     يُلتقط، ولا نمسح السطر كلّه بحثاً عن `@` بعيدة. */
  const start = Math.max(0, caret - 20);
  for (let i = caret - 1; i >= start; i--) {
    const ch = text[i];
    if (ch === MENTION_CHAR) {
      /* `@` يجب أن تكون في بداية النصّ أو بعد فراغ — وإلّا فهي جزء من
         بريد إلكتروني (`name@site.com`) ولا يُفتح لها منتقٍ. */
      const before = i > 0 ? text[i - 1] : " ";
      if (!/\s/.test(before) && i !== 0) return null;
      return { query: text.slice(i + 1, caret), at: i };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

/** إدراج الاسم المختار مكان الإشارة الجزئية */
export function applyMention(
  text: string,
  at: number,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const before = text.slice(0, at);
  const after = text.slice(caret);
  /* المسافة بعد الاسم تُضاف **إلّا** إن كان ما بعد المؤشّر يبدأ بفراغ
     أصلاً — وإلّا صار «قال @سارة  للجميع» بمسافتين عند الإدراج في
     منتصف جملة. */
  const needsSpace = !/^\s/.test(after);
  const inserted = `${MENTION_CHAR}${name}${needsSpace ? " " : ""}`;
  return { text: before + inserted + after, caret: before.length + inserted.length };
}
