import { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server-auth";

export const runtime = "nodejs";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const MAX_HISTORY = 12;
const MAX_INLINE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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
- جنس الطالب غير معروف افتراضياً، لذا خاطبيه دائماً بصيغة **المذكّر** كقاعدة عامة (مثل: "هل تريد"، "هل أنت متأكد", "أرسل لي سؤالك")، وليس بصيغة المؤنّث ("تريدين", "متأكدة"...).
- استثناء وحيد: إن كتب الطالب عن نفسه بصيغة المؤنّث بوضوح (مثل "أنا متأكدة", "درستُ" بتاء التأنيث، أو صرّح أنه أنثى)، فحينها خاطبيه بصيغة المؤنّث في بقية الحوار.
- لا تخمّني الجنس من الاسم أبداً؛ الأسماء لا تضمن الجنس بدقّة.

التنسيق (مهم جداً للوضوح):
- استعملي تنسيق Markdown: **عريض** للمصطلحات المهمة، عناوين بـ ## و ###، وقوائم نقطية (-) أو مرقّمة (1.).
- للمعادلات والرموز الرياضية استعملي LaTeX دائماً:
  - معادلة داخل السطر: $x^2 + y^2 = r^2$ مثل $x^2 + y^2 = r^2$
  - معادلة في سطر مستقل ومركزّة: $$\\Delta = b^2 - 4ac$$
  - استعملي رموز LaTeX الصحيحة: \\frac{a}{b} للكسور، \\sqrt{x} للجذر، x^{2} للأسس، \\int للتكامل، \\sum للمجموع، \\lim للنهاية، \\alpha \\beta \\theta للحروف اليونانية، \\times \\div \\pm، إلخ.
- للأكواد أو الصيغ استعملي \`code\` المحاطة بعلامات backtick.
- نظّمي الشرح الطويل في خطوات واضحة ومرقّمة.
- اجعلي إجاباتك جميلة الشكل وسهلة القراءة بصرياً.`;

interface StoredMessage {
  id?: string;
  role: "user" | "assistant";
  text?: string;
  createdAt?: number;
  attachments?: StoredAttachment[];
}

interface StoredAttachment {
  id: string;
  type: "image" | "pdf" | "docx" | "file";
  fileName: string;
  mimeType: string;
  source: "rtdb-base64" | "drive";
  driveId?: string;
}

interface RequestAttachment extends StoredAttachment {
  dataUrl?: string;
}

function dbUrl(path: string, idToken: string) {
  return `${DB}/${path.replace(/^\/+/, "")}.json?auth=${encodeURIComponent(idToken)}`;
}

async function dbGet<T>(path: string, idToken: string): Promise<T | null> {
  if (!DB) return null;
  const response = await fetch(dbUrl(path, idToken), { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T | null;
}

function stripDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/s);
  if (!match) return { mimeType: "image/png", data: value };
  return { mimeType: match[1], data: match[2] };
}

function validMime(mimeType: string) {
  return ALLOWED_MIMES.has(mimeType);
}

async function loadAttachmentPart(
  uid: string,
  conversationId: string,
  attachment: StoredAttachment | RequestAttachment,
  idToken: string,
  driveAccessToken: string,
): Promise<{ inline_data: { mime_type: string; data: string } } | null> {
  if (!validMime(attachment.mimeType)) return null;
  let encoded = "";
  let mimeType = attachment.mimeType;

  if (attachment.source === "rtdb-base64") {
    if ("dataUrl" in attachment && attachment.dataUrl) {
      encoded = attachment.dataUrl;
    } else {
      encoded = (await dbGet<string>(`khabbashaAttachments/${uid}/${conversationId}/${attachment.id}/dataUrl`, idToken)) ?? "";
    }
    const parsed = stripDataUrl(encoded);
    if (!parsed) return null;
    mimeType = parsed.mimeType || mimeType;
    encoded = parsed.data;
  } else if (attachment.source === "drive" && attachment.driveId && driveAccessToken) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(attachment.driveId)}?alt=media`,
      { headers: { Authorization: `Bearer ${driveAccessToken}` }, cache: "no-store" },
    );
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_INLINE_BYTES) return null;
    encoded = Buffer.from(buffer).toString("base64");
  }

  if (!encoded || encoded.length > 12_000_000) return null;
  return { inline_data: { mime_type: mimeType, data: encoded } };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: NextRequest) {
  if (!KEY) return Response.json({ error: "AiBot غير مُعدّ حالياً." }, { status: 500 });

  let body: {
    idToken?: string;
    conversationId?: string;
    currentMessageId?: string;
    text?: string;
    track?: string;
    library?: { title: string; subject: string; chapter?: string; uploaderName?: string }[];
    attachments?: RequestAttachment[];
    driveAccessToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "تعذّر فهم الطلب." }, { status: 400 });
  }

  const uid = await verifyFirebaseIdToken(typeof body.idToken === "string" ? body.idToken : "");
  if (!uid) return Response.json({ error: "انتهت جلسة الدخول. أعد تسجيل الدخول." }, { status: 401 });

  const conversationId = typeof body.conversationId === "string" ? body.conversationId.slice(0, 120) : "";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 20_000) : "";
  if (!conversationId || (!text && !body.attachments?.length)) {
    return Response.json({ error: "اكتب رسالة أو أرفق ملفاً أولاً." }, { status: 400 });
  }

  const conversation = await dbGet<Record<string, unknown>>(`khabbashaConversations/${uid}/${conversationId}`, body.idToken!);
  if (!conversation) return Response.json({ error: "هذه المحادثة غير متاحة." }, { status: 403 });

  const stored = await dbGet<Record<string, StoredMessage>>(`khabbashaMessages/${uid}/${conversationId}`, body.idToken!);
  const storedMessages = Object.entries(stored ?? {})
    .map(([id, item]) => ({ id, ...item }))
    .filter((item) => item.role === "user" || item.role === "assistant")
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const history = storedMessages.filter((item) => item.id !== body.currentMessageId).slice(-(MAX_HISTORY - 1));
  const requestAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];
  const currentStored = storedMessages.find((item) => item.id === body.currentMessageId);
  const currentAttachments = requestAttachments.length ? requestAttachments : (currentStored?.attachments ?? []);
  const driveAccessToken = typeof body.driveAccessToken === "string" ? body.driveAccessToken : "";

  const library = Array.isArray(body.library) ? body.library.slice(0, 80) : [];
  const libraryText = library.length
    ? `\n\nمكتبة الموقع الحالية (الملخّصات والملفّات المنشورة):\n${library.map((e) => `- "${e.title}" | المادة: ${e.subject}${e.chapter ? ` | الفصل: ${e.chapter}` : ""}${e.uploaderName ? ` | الناشر: ${e.uploaderName}` : ""}`).join("\n")}\n\nعند طلب الطالب أفضل ملخّص أو مصدر، اقترحي من هذه القائمة فقط حسب المادة/الشعبة المطلوبة، واذكري العناوين بدقّة. لا تختلقي ملخّصات غير موجودة في القائمة.`
    : "";
  const systemText = (body.track ? `${SYSTEM}\n\nشعبة الطالب الحالية: ${body.track}` : SYSTEM) + libraryText;

  const contents: { role: "user" | "model"; parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] }[] = [];
  for (const message of history) {
    const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [];
    if (message.text?.trim()) parts.push({ text: message.text });
    for (const attachment of message.attachments ?? []) {
      const part = await loadAttachmentPart(uid, conversationId, attachment, body.idToken!, driveAccessToken);
      if (part) parts.push(part);
    }
    if (parts.length) contents.push({ role: message.role === "assistant" ? "model" : "user", parts });
  }

  const currentParts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [];
  if (text) currentParts.push({ text });
  for (const attachment of currentAttachments) {
    const part = await loadAttachmentPart(uid, conversationId, attachment, body.idToken!, driveAccessToken);
    if (part) currentParts.push(part);
  }
  if (currentParts.length) contents.push({ role: "user", parts: currentParts });
  if (!contents.length) return Response.json({ error: "لا توجد رسالة قابلة للتحليل." }, { status: 400 });

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
  });

  async function callGemini(model: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
      body: requestBody,
    });
    const data: any = await response.json();
    return { response, data };
  }

  try {
    let lastErr = "";
    for (const model of [MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash"]) {
      const { response, data } = await callGemini(model);
      if (response.ok) {
        const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
        if (reply.trim()) return Response.json({ text: reply });
        const reason = data?.candidates?.[0]?.finishReason;
        if (reason === "SAFETY" || reason === "RECITATION") {
          return Response.json({ text: "عذراً، لا أستطيع الإجابة عن هذا الطلب. جرّب سؤالاً آخر متعلّقاً بدراستك 📚" });
        }
        lastErr = "empty";
      } else {
        const raw = String(data?.error?.message ?? "").toLowerCase();
        lastErr = response.status === 429 ? "quota" : raw || "transient";
        const transient = response.status === 429 || response.status === 503 || /quota|rate limit|overload|demand|unavailable/.test(raw);
        console.error("[AiBot] Gemini error:", model, response.status, raw.slice(0, 120));
        if (!transient) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return Response.json({ text: lastErr === "quota" ? "⏳ الخباشة مشغولة بطلبات كثيرة الآن. انتظر دقيقة وأعد المحاولة!" : "⏳ خدمة الخباشة مزدحمة لحظياً. حاول مجدداً بعد ثوانٍ قليلة 🙏" });
  } catch (error) {
    console.error("[AiBot] fetch error:", error);
    return Response.json({ text: "تعذّر الاتصال بالخباشة الآن. تحقّق من اتصالك وأعد المحاولة 🙏" });
  }
}
