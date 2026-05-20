import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export async function GET() {
  const data = await queryAll(
    `SELECT id, title, slug, excerpt, cover_url, published_at
     FROM posts
     WHERE visible = 1 AND published_at <= NOW()
     ORDER BY published_at DESC`,
  );
  return NextResponse.json(data);
}
