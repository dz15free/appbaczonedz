import { NextRequest } from "next/server";

export const runtime = "nodejs";

const KEY = process.env.GEMINI_API_KEY;
// نموذج مستقر مجاني. لمزيد من الطلبات اليومية يمكن استخدام gemini-2.5-flash-lite
const MODEL = "gemini-2.5-flash";

const SYSTEM = `أنتِ "الخباشة"، المساعدة الآلية الرسمية لمنصة BacZoneDZ.
شخصيتك: مساعدة ذكية متخصّصة في دعم طلاب البكالوريا الجزائرية، ذكية ومحترفة ودودة جداً، خبيرة بكل مواد البكالوريا.
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
- لا تكرّري السؤال نفسه إن كان الطالب قد أجاب، وتابعي بسلاسة.

قاعدة مهمّة جداً — مخاطبة الطالب:
- جنس الطالب غير معروف افتراضياً، لذا خاطبيه دائماً بصيغة **المذكّر** كقاعدة عامة (مثل: "هل تريد"، "هل أنت متأكد"، "أرسل لي سؤالك")، وليس بصيغة المؤنّث ("تريدين"، "متأكدة"...).
- استثناء وحيد: إن كتب الطالب عن نفسه بصيغة المؤنّث بوضوح (مثل "أنا متأكدة"، "درستُ" بتاء التأنيث، أو صرّح أنه أنثى)، فحينها خاطبيه بصيغة المؤنّث في بقية الحوار.
- لا تخمّني الجنس من الاسم أبداً؛ الأسماء لا تضمن الجنس بدقّة.

التنسيق (مهم جداً للوضوح):
- استعملي تنسيق Markdown: **عريض** للمصطلحات المهمة، عناوين بـ ## و ###، وقوائم نقطية (-) أو مرقّمة (1.).
- للمعادلات والرموز الرياضية استعملي LaTeX دائماً:
  - معادلة داخل السطر: $...$ مثل $x^2 + y^2 = r^2$
  - معادلة في سطر مستقل ومركزّة: $$...$$ مثل:
    $$\\Delta = b^2 - 4ac$$
  - استعملي رموز LaTeX الصحيحة: \\frac{a}{b} للكسور، \\sqrt{x} للجذر، x^{2} للأسس، \\int للتكامل، \\sum للمجموع، \\lim للنهاية، \\alpha \\beta \\theta للحروف اليونانية، \\times \\div \\pm، إلخ.
- للأكواد أو الصيغ استعملي \`code\` المحاطة بعلامات backtick.
- نظّمي الشرح الطويل في خطوات واضحة ومرقّمة.
- اجعلي إجاباتك جميلة الشكل وسهلة القراءة بصرياً.`;

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  if (!KEY) {
    return Response.json({ error: "Omibot غير مُعدّ: مفتاح GEMINI_API_KEY مفقود." }, { status: 500 });
  }
  let messages: { role: string; text: string }[] = [];
  let track = "";
  let library: { title: string; subject: string; chapter?: string; uploaderName?: string }[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    track = typeof body.track === "string" ? body.track : "";
    library = Array.isArray(body.library) ? body.library.slice(0, 80) : [];
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // بناء فهرس المكتبة لإدراجه في تعليمات النظام
  let libraryText = "";
  if (library.length > 0) {
    const lines = library.map((e) =>
      `- "${e.title}" | المادة: ${e.subject}${e.chapter ? ` | الفصل: ${e.chapter}` : ""}${e.uploaderName ? ` | الناشر: ${e.uploaderName}` : ""}`
    ).join("\n");
    libraryText = `\n\nمكتبة الموقع الحالية (الملخّصات والملفّات المنشورة):\n${lines}\n\nعند طلب الطالب أفضل ملخّص أو مصدر، اقترحي من هذه القائمة فقط حسب المادة/الشعبة المطلوبة، واذكري العناوين بدقّة. إن لم تكن لديك تفاصيل كافية (الشعبة/المادة) اسأليه أولاً. لا تختلقي ملخّصات غير موجودة في القائمة، ووجّهيه لصفحة المكتبة لتحميلها.`;
  }

  const systemText = (track
    ? `${SYSTEM}\n\nشعبة الطالب الحالية: ${track} — استعمليها لتخصيص إجاباتك دون سؤاله عن شعبته.`
    : SYSTEM) + libraryText;

  const contents = messages
    .filter((m) => m.text?.trim())
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));

  if (contents.length === 0) return Response.json({ error: "لا رسالة." }, { status: 400 });

  // نماذج بالترتيب: الأساسي ثم بديل أخف عند الازدحام
  const MODELS = [MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  async function callGemini(model: string) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
        body,
      }
    );
    const data: any = await res.json();
    return { res, data };
  }

  try {
    let lastErr = "";
    // حتى 3 محاولات عبر نماذج متعدّدة مع مهلة قصيرة بينها
    for (let attempt = 0; attempt < MODELS.length; attempt++) {
      const model = MODELS[attempt];
      const { res, data } = await callGemini(model);

      if (res.ok) {
        const text =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
        if (text.trim()) return Response.json({ text });

        // رد فارغ: إن كان بسبب الحظر لا نعيد المحاولة
        const finishReason = data?.candidates?.[0]?.finishReason;
        if (finishReason === "SAFETY" || finishReason === "RECITATION")
          return Response.json({ text: "عذراً، لا أستطيع الإجابة عن هذا الطلب. جرّب سؤالاً آخر متعلّقاً بدراستك 📚" });
        // رد فارغ لسبب آخر: جرّب النموذج التالي
        lastErr = "empty";
      } else {
        const raw = (data?.error?.message as string ?? "").toLowerCase();
        const transient = res.status === 429 || res.status === 503 ||
          raw.includes("quota") || raw.includes("rate limit") ||
          raw.includes("overload") || raw.includes("demand") || raw.includes("unavailable");
        console.error("[Omibot] Gemini error:", model, res.status, raw.slice(0, 120));
        lastErr = res.status === 429 ? "quota" : "transient";
        if (!transient) break; // خطأ غير عابر: لا فائدة من إعادة المحاولة
      }

      // مهلة قصيرة قبل المحاولة التالية
      if (attempt < MODELS.length - 1) await new Promise((r) => setTimeout(r, 600));
    }

    // فشلت كل المحاولات
    const msg = lastErr === "quota"
      ? "⏳ الخباشة مشغولة بطلبات كثيرة الآن. انتظر دقيقة وأعد المحاولة!"
      : "⏳ خدمة الخباشة مزدحمة لحظياً. حاول مجدداً بعد ثوانٍ قليلة 🙏";
    return Response.json({ text: msg });
  } catch (e) {
    console.error("[Omibot] fetch error:", e);
    return Response.json({ text: "تعذّر الاتصال بالخباشة الآن. تحقّق من اتصالك وأعد المحاولة 🙏" });
  }
}
