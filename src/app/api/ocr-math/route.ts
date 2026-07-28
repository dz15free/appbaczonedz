import { NextRequest } from "next/server";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════
   Math Write — من خطّ اليد إلى معادلة

   الأستاذ يرسم `x + x²` بخطّ يده، فتخرج المعادلة مكتوبة رياضياً.

   لماذا هذا المسار تحديداً:
   • لا خدمة جديدة ولا تكلفة — نستعمل **نفس مفتاح `GEMINI_API_KEY`**
     ونفس النموذج الذي تعمل به «الخبّاشة». وهو متعدّد الوسائط: يقرأ
     الصور ويُخرج LaTeX.
   • لا حزمة npm — KaTeX محمّل عندنا من CDN أصلاً لعرض النتيجة.

   القصّ يتمّ **في المتصفّح** فلا نرفع اللوح كلّه، بل مستطيل المعادلة
   وحده: أخفّ على شبكة الطالب وأدقّ في القراءة.
════════════════════════════════════════════════════════════ */

const KEY = process.env.GEMINI_API_KEY;
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

/* التعليمات صارمة عمداً: أيّ شرح أو أسوار كود تُفسد الإخراج، لأنّ
   الناتج يُمرَّر مباشرة إلى KaTeX. */
const PROMPT = `أنت محرّك تعرّف على المعادلات الرياضية المكتوبة بخطّ اليد.

في الصورة معادلة أو تعبير رياضي مكتوب بخطّ اليد.

أخرج **LaTeX فقط** يمثّل ما هو مكتوب — بلا أيّ شرح، بلا مقدّمة،
بلا أسوار كود (\`\`\`)، بلا $ أو $$ حول الناتج.

قواعد:
- الأسس: x^{2} — الكسور: \\frac{a}{b} — الجذور: \\sqrt{x}
- التكامل \\int — المجموع \\sum — النهاية \\lim — الحروف اليونانية \\alpha \\beta \\theta
- إن كان المكتوب غير واضح أو ليس رياضياً، أخرج الكلمة: UNCLEAR
- لا تُصحّح المعادلة ولا تحلّها — انسخ ما هو مكتوب حرفياً.`;

export async function POST(req: NextRequest) {
  if (!KEY) {
    return Response.json({ error: "مفتاح GEMINI_API_KEY مفقود." }, { status: 500 });
  }

  let image = "";
  try {
    const body = await req.json();
    image = typeof body.image === "string" ? body.image : "";
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // نقبل data URL أو base64 خاماً
  const b64 = image.includes(",") ? image.split(",")[1] : image;
  if (!b64 || b64.length < 100) {
    return Response.json({ error: "لا صورة." }, { status: 400 });
  }
  // حارس حجم: ~6 ميغابايت بعد فكّ الترميز — يمنع إرهاق الحصّة برفعة واحدة
  if (b64.length > 8_000_000) {
    return Response.json({ error: "الصورة كبيرة جداً." }, { status: 413 });
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: "image/png", data: b64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 256 },
  };

  let lastErr = "";
  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!r.ok) {
        lastErr = `${model}: ${r.status}`;
        continue; // النموذج الأخفّ قد ينجح عند الازدحام
      }
      const data = (await r.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // تنظيف دفاعي: النموذج قد يضيف أسواراً أو $ رغم التعليمات
      const latex = raw
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/```/g, "")
        .replace(/^\$+|\$+$/g, "")
        .trim();

      if (!latex || latex === "UNCLEAR") {
        return Response.json({ error: "لم أتمكّن من قراءة المعادلة. جرّب تحديداً أدقّ أو خطّاً أوضح." }, { status: 422 });
      }
      return Response.json({ latex });
    } catch (e) {
      lastErr = String(e);
    }
  }

  return Response.json({ error: `تعذّر التعرّف (${lastErr})` }, { status: 502 });
}
