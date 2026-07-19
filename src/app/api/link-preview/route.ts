import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════
   معاينة الروابط — يجلب بيانات Open Graph من الصفحة

   لماذا مسار خادم؟ المتصفّح يمنع قراءة صفحات نطاقات أخرى (CORS)،
   فلا سبيل لقراءة العنوان والصورة إلا من الخادم.

   التكلفة: النتيجة تُخزَّن على حافة Vercel لسبعة أيام
   (s-maxage=604800)، فالرابط الواحد يُجلب مرّة واحدة مهما تكرّر
   عرضه — وهذا يبقي الاستهلاك ضمن الطبقة المجانية.

   الأمان (SSRF): من دون هذه القيود يصبح المسار أداة لمسح الشبكة
   الداخلية للخادم. لذلك:
     • http/https فقط
     • رفض العناوين المحلية والشبكات الخاصة
     • مهلة 6 ثوانٍ
     • قراءة 256KB الأولى فقط (الوسوم في الرأس دائماً)
════════════════════════════════════════════════════════════ */

const TIMEOUT_MS = 6000;
const MAX_BYTES = 256 * 1024;

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal",
]);

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (BLOCKED_HOSTS.has(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // نطاقات IPv4 الخاصة
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local (بيانات السحابة)
  }
  return false;
}

function pick(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v) return decodeEntities(v).slice(0, 300);
    }
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function metaRe(prop: string): RegExp[] {
  return [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
  ];
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }
  if (isPrivateHost(target.hostname)) {
    return NextResponse.json({ error: "blocked host" }, { status: 400 });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(target.toString(), {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        // بعض المواقع لا ترسل وسوم OG لعملاء مجهولين
        "user-agent": "Mozilla/5.0 (compatible; BacZoneDzBot/1.0; +https://baczonedz.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    // نتحقّق بعد التحويلات أيضاً — قد يُحوَّل الرابط إلى عنوان داخلي
    const finalUrl = new URL(res.url || target.toString());
    if (isPrivateHost(finalUrl.hostname)) {
      return NextResponse.json({ error: "blocked host" }, { status: 400 });
    }

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) {
      return jsonCached({ url: finalUrl.toString(), siteName: finalUrl.hostname });
    }

    // نقرأ رأس الصفحة فقط — الوسوم هناك دائماً
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));

    const title =
      pick(html, metaRe("og:title")) ??
      pick(html, metaRe("twitter:title")) ??
      pick(html, [/<title[^>]*>([^<]*)<\/title>/i]);

    const description =
      pick(html, metaRe("og:description")) ??
      pick(html, metaRe("twitter:description")) ??
      pick(html, metaRe("description"));

    let image = pick(html, metaRe("og:image")) ?? pick(html, metaRe("twitter:image"));
    if (image && !/^https?:\/\//i.test(image)) {
      try { image = new URL(image, finalUrl).toString(); } catch { image = undefined; }
    }
    // لا نعرض صوراً من مصادر غير آمنة
    if (image && !image.startsWith("https://")) image = undefined;

    return jsonCached({
      url: finalUrl.toString(),
      siteName: pick(html, metaRe("og:site_name")) ?? finalUrl.hostname,
      title,
      description,
      image,
    });
  } catch {
    // فشل الجلب ليس خطأ في التطبيق — نُرجع الحد الأدنى ونخزّنه مدّة قصيرة
    return NextResponse.json(
      { url: target.toString(), siteName: target.hostname },
      { headers: { "cache-control": "public, s-maxage=3600" } }
    );
  } finally {
    clearTimeout(timer);
  }
}

function jsonCached(data: Record<string, unknown>) {
  return NextResponse.json(data, {
    headers: {
      // أسبوع على الحافة + شهر للاستعمال أثناء إعادة التحقّق
      "cache-control": "public, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
