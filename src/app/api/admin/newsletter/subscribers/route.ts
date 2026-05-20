import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import pool from "@/lib/db";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscribers = await queryAll(
    "SELECT id, email, status, subscribed_at, confirmed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC",
  );
  return NextResponse.json({ subscribers });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await pool.execute("DELETE FROM newsletter_subscribers WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
