import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const SECRET = process.env.FIREBASE_DB_SECRET || "";

async function isAdmin(uid: string): Promise<boolean> {
  if (!uid || !DB || !SECRET) return false;
  try {
    const response = await fetch(`${DB}/users/${encodeURIComponent(uid)}/role.json?auth=${encodeURIComponent(SECRET)}`, { cache: "no-store" });
    return response.ok && (await response.json()) === "admin";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: { uid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const uid = (body.uid ?? "").trim();
  if (!(await isAdmin(uid))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const paths = [
    "/",
    "/blog",
    "/tools",
    "/guides",
    "/specialties",
    "/sitemap.xml",
    "/blog/sitemap.xml",
  ];
  for (const path of paths) {
    try { revalidatePath(path); } catch { /* المسار قد لا يكون مبنيًا بعد */ }
  }

  return NextResponse.json({ ok: true, revalidated: paths });
}
