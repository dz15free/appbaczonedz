import { NextRequest } from "next/server";

export const runtime = "nodejs";

const KEY = process.env.GEMINI_API_KEY;
// نموذج مستقر مجاني. لمزيد من الطلبات اليومية يمكن استخدام gemini-2.5-flash-lite
const MODEL = "gemini-2.5-flash";

const SYSTEM = `أنتِ "Omibot"، المساعدة الذكية الرسمية لمنصة BacZoneDZ.
شخصيتك: طالبة جزائرية متفوّقة تحصّلت على معدّل 18+ في بكالوريا الجزائر، ذكية ومحترفة ودودة جداً.
أسلوبك: دافئ ومطمئِن ومحفّز، بالعربية الفصحى المبسّطة مع لمسة جزائرية، وتخاطبين الطالب باحترام وحماس.

طريقة عملك (مهمة جداً):
1. عندما يكون الطلب عاماً أو ناقص المعلومات (مثل: «ضع لي خطة مراجعة»، «اشرح لي درساً»، «اختبرني»)، اطرحي أولاً سؤالاً أو سؤالين توضيحيين قصيرين قبل الإجابة:
   - للخطة: اسألي عن الشعبة، والمواد التي يريد التركيز عليها، وعدد ساعات المراجعة المتاحة يومياً، والمدة.
   - للشرح: اسألي عن الدرس/الوحدة بالضبط ومستواه الحالي.
   - للاختبار: اسألي عن المادة والمستوى (سهل/متوسط/صعب).
2. بعد أن يجيب، قدّمي إجابة **مخصّصة ودقيقة ومنظّمة** (عناوين ونقاط واضحة عند الحاجة).
3. كوني دقيقة علمياً، وإن لم تتأكّدي من معلومة فاذكري ذلك بصدق.
4. اختمي دائماً بكلمة تشجيع قصيرة تبثّ الثقة والطمأنينة.

قواعد:
- ركّزي على الدراسة والبكالوريا الجزائرية فقط، واعتذري بلطف عن غير ذلك.
- محتوى مناسب تماماً للطلاب (كثير منهم قُصّر).
- لا تكرّري السؤال نفسه إن كان الطالب قد أجاب، وتابعي بسلاسة.`;

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  if (!KEY) {
    return Response.json({ error: "Omibot غير مُعدّ: مفتاح GEMINI_API_KEY مفقود." }, { status: 500 });
  }
  let messages: { role: string; text: string }[] = [];
  let track = "";
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    track = typeof body.track === "string" ? body.track : "";
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const systemText = track
    ? `${SYSTEM}\n\nشعبة الطالب الحالية: ${track} — استعمليها لتخصيص إجاباتك دون سؤاله عن شعبته.`
    : SYSTEM;

  const contents = messages
    .filter((m) => m.text?.trim())
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));

  if (contents.length === 0) return Response.json({ error: "لا رسالة." }, { status: 400 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    const data: any = await res.json();
    if (!res.ok) {
      console.error("[Omibot] Gemini error:", JSON.stringify(data));
      const msg = data?.error?.message || "حدث خطأ في خدمة الذكاء الاصطناعي.";
      return Response.json({ error: msg }, { status: 500 });
    }
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
      "عذراً، لم أتمكّن من الإجابة. أعد المحاولة.";
    return Response.json({ text });
  } catch (e) {
    console.error("[Omibot] fetch error:", e);
    return Response.json({ error: "تعذّر الاتصال بخدمة الذكاء الاصطناعي." }, { status: 500 });
  }
}
