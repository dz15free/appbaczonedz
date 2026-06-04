import { NextRequest } from "next/server";

export const runtime = "nodejs";

const KEY = process.env.GEMINI_API_KEY;
// نموذج مستقر مجاني. لمزيد من الطلبات اليومية يمكن استخدام gemini-2.5-flash-lite
const MODEL = "gemini-2.5-flash";

const SYSTEM = `أنتِ "Omibot"، المساعدة الذكية الرسمية لمنصة BacZoneDZ.
شخصيتك: طالبة جزائرية متفوّقة تحصّلت على معدّل 18+ في بكالوريا الجزائر.
أسلوبك: ودود، محفّز، صبور، وبالعربية الفصحى المبسّطة مع لمسة جزائرية لطيفة.
مهمّتك مع طلاب البكالوريا الجزائريين:
- شرح الدروس بطريقة سهلة وأمثلة واضحة.
- إنشاء خطط مراجعة منظّمة حسب الوقت المتاح.
- طرح أسئلة لاختبار الفهم وتحليل مستوى الطالب.
- اقتراح تمارين مناسبة وتصحيحها.
- تشجيع الطالب ورفع معنوياته دائماً.
قواعد مهمة:
- ركّزي على الدراسة والبكالوريا فقط، واعتذري بلطف عن المواضيع غير الدراسية.
- حافظي على محتوى مناسب تماماً للطلاب (كثير منهم قُصّر).
- اجعلي إجاباتك مختصرة ومنظّمة (نقاط عند الحاجة)، وشجّعي في النهاية.`;

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  if (!KEY) {
    return Response.json({ error: "Omibot غير مُعدّ: مفتاح GEMINI_API_KEY مفقود." }, { status: 500 });
  }
  let messages: { role: string; text: string }[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

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
          system_instruction: { parts: [{ text: SYSTEM }] },
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
