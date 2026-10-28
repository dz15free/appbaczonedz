import { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server-auth";

/* ════════════════════════════════════════════════════════════
   خادم وسيط لـ Cloudflare Realtime — يبقي الأسرار في الخادم فقط

   متغيّرات البيئة (Vercel → Settings → Environment Variables):

     CLOUDFLARE_REALTIME_APP_ID        إلزامي — من لوحة Cloudflare › Realtime › SFU
     CLOUDFLARE_REALTIME_APP_SECRET    إلزامي — يظهر مرّة واحدة عند إنشاء التطبيق
     CLOUDFLARE_TURN_KEY_ID            اختياري — Cloudflare › Realtime › TURN
     CLOUDFLARE_TURN_KEY_API_TOKEN     اختياري — مع السابق: يمرّر الصوت عبر الشبكات
                                        التي تحجب UDP (مدارس، شركات)
     REALTIME_REQUIRE_AUTH=1           اختياري — يشترط تسجيل الدخول لفتح جلسة صوت

   نقاط مساعدة:
     GET /api/realtime/health  → هل الصوت مُعدّ؟ (افتحها في المتصفّح للتشخيص)
     GET /api/realtime/ice     → خوادم STUN/TURN للعميل
   ════════════════════════════════════════════════════════════ */
const BASE = "https://rtc.live.cloudflare.com/v1";
const APP_ID = process.env.CLOUDFLARE_REALTIME_APP_ID;
const APP_SECRET = process.env.CLOUDFLARE_REALTIME_APP_SECRET;
const TURN_ID = process.env.CLOUDFLARE_TURN_KEY_ID;
const TURN_TOKEN = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
const REQUIRE_AUTH = process.env.REALTIME_REQUIRE_AUTH === "1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STUN: RTCIceServer = { urls: "stun:stun.cloudflare.com:3478" };

/* 🐛 كان الوسيط يُمرّر **أيّ** مسار إلى حساب Cloudflare بسرّك:
   `/api/realtime/<أيّ شيء>`. الآن قائمة بيضاء بما يحتاجه الصوت فعلاً. */
const SID = "[A-Za-z0-9_-]{8,128}";
const ALLOWED: { method: string; re: RegExp }[] = [
  { method: "POST", re: new RegExp(`^sessions/new$`) },
  { method: "POST", re: new RegExp(`^sessions/${SID}/tracks/new$`) },
  { method: "PUT", re: new RegExp(`^sessions/${SID}/renegotiate$`) },
  { method: "PUT", re: new RegExp(`^sessions/${SID}/tracks/close$`) },
  { method: "GET", re: new RegExp(`^sessions/${SID}$`) },
];

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function proxy(req: NextRequest, path: string[]) {
  if (!APP_ID || !APP_SECRET) {
    return json({
      error: "Realtime not configured",
      code: "not_configured",
      hint: "أضف CLOUDFLARE_REALTIME_APP_ID و CLOUDFLARE_REALTIME_APP_SECRET في Vercel ثمّ أعد النشر.",
    }, 503);
  }
  const joined = path.join("/");
  if (!ALLOWED.some((a) => a.method === req.method && a.re.test(joined))) {
    return json({ error: "Not allowed", code: "forbidden_path" }, 404);
  }

  if (REQUIRE_AUTH && joined === "sessions/new") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const uid = token ? await verifyFirebaseIdToken(token) : null;
    if (!uid) return json({ error: "Unauthorized", code: "unauthorized" }, 401);
  }

  const body = req.method === "GET" ? undefined : await req.text();
  try {
    const res = await fetch(`${BASE}/apps/${APP_ID}/${joined}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${APP_SECRET}`,
        "Content-Type": "application/json",
      },
      body: body && body.length ? body : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      return json({
        error: "Cloudflare rejected the credentials",
        code: "bad_credentials",
        hint: "تحقّق من صحّة CLOUDFLARE_REALTIME_APP_ID و CLOUDFLARE_REALTIME_APP_SECRET.",
      }, 502);
    }
    return new Response(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return json({ error: "Cannot reach Cloudflare Realtime", code: "upstream_unreachable" }, 502);
  }
}

/* ── خوادم ICE ──
   المتصفّحات تحجب المنفذ 53، ومحاولته تُبطئ الاتصال ثوانٍ قبل أن
   تفشل، فيُستبعد كما توصي Cloudflare. */
function dropPort53(servers: RTCIceServer[]): RTCIceServer[] {
  return servers
    .map((s) => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u));
      return urls.length ? { ...s, urls } : null;
    })
    .filter(Boolean) as RTCIceServer[];
}

async function iceServers(): Promise<RTCIceServer[]> {
  if (!TURN_ID || !TURN_TOKEN) return [STUN];
  const base = `${BASE}/turn/keys/${TURN_ID}/credentials`;
  const headers = { Authorization: `Bearer ${TURN_TOKEN}`, "Content-Type": "application/json" };
  try {
    const r = await fetch(`${base}/generate-ice-servers`, {
      method: "POST", headers, body: JSON.stringify({ ttl: 86400 }), cache: "no-store",
    });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d?.iceServers) && d.iceServers.length) return dropPort53([STUN, ...d.iceServers]);
    }
    /* الصيغة الأقدم: كائن واحد لا مصفوفة */
    const r2 = await fetch(`${base}/generate`, {
      method: "POST", headers, body: JSON.stringify({ ttl: 86400 }), cache: "no-store",
    });
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2?.iceServers?.urls) return dropPort53([STUN, d2.iceServers]);
    }
  } catch { /* نرجع إلى STUN */ }
  return [STUN];
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function GET(req: NextRequest, ctx: Ctx) {
  const path = (await ctx.params).path;
  if (path.length === 1 && path[0] === "health") {
    return json({
      voice: Boolean(APP_ID && APP_SECRET) ? "configured" : "missing CLOUDFLARE_REALTIME_APP_ID / CLOUDFLARE_REALTIME_APP_SECRET",
      turn: Boolean(TURN_ID && TURN_TOKEN) ? "configured" : "not configured (optional)",
      authRequired: REQUIRE_AUTH,
    });
  }
  if (path.length === 1 && path[0] === "ice") {
    return json({ iceServers: await iceServers() });
  }
  return proxy(req, path);
}
