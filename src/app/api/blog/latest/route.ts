import { NextResponse } from "next/server";
import { getPublishedEntries } from "@/features/blog/blog-server";

export const revalidate = 600;

export async function GET() {
  const entries = await getPublishedEntries();
  return NextResponse.json(entries.slice(0, 3), {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
