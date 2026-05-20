import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const data = await queryOne(
    "SELECT * FROM posts WHERE slug = ? AND visible = 1 AND published_at <= NOW() LIMIT 1",
    [slug],
  );

  if (!data) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  return NextResponse.json(data);
}
