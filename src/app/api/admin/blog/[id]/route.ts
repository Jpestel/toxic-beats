import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import pool from "@/lib/db";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const allowed = ["title", "slug", "content_html", "excerpt", "cover_url", "published_at", "visible"];

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    sets.push(`\`${k}\` = ?`);
    values.push(v);
  }

  if (sets.length) {
    values.push(id);
    await pool.execute(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`, values as (string | number | boolean | null)[]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await pool.execute("DELETE FROM posts WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
