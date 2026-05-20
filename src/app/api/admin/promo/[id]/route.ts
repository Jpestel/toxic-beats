import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import pool from "@/lib/db";

async function checkAuth(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await checkAuth(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const allowed = ["code", "type", "value", "description", "max_uses", "expires_at", "is_active"];

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    sets.push(`\`${k}\` = ?`);
    values.push(v);
  }

  if (sets.length === 0) return NextResponse.json({ success: true });

  values.push(id);
  await pool.execute(`UPDATE promo_codes SET ${sets.join(", ")} WHERE id = ?`, values as (string | number | boolean | null)[]);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await checkAuth(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await pool.execute("DELETE FROM promo_codes WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
