import { NextRequest } from "next/server";

// خادم وسيط لـ Cloudflare Realtime — يبقي APP_SECRET في الخادم فقط
const BASE = "https://rtc.live.cloudflare.com/v1";
const APP_ID = process.env.CLOUDFLARE_REALTIME_APP_ID;
const APP_SECRET = process.env.CLOUDFLARE_REALTIME_APP_SECRET;

export const runtime = "nodejs";

async function proxy(req: NextRequest, path: string[]) {
  if (!APP_ID || !APP_SECRET) {
    return Response.json({ error: "Realtime not configured" }, { status: 500 });
  }
  const url = `${BASE}/apps/${APP_ID}/${path.join("/")}`;
  const body = req.method === "GET" ? undefined : await req.text();
  const res = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${APP_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body && body.length ? body : undefined,
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
