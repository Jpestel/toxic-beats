import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";

export async function GET() {
  try {
    const row = await queryOne("SELECT value FROM settings WHERE `key` = 'likes_config'");
    const config = row ? JSON.parse(row.value as string) : { enabled: false };
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const config = JSON.stringify({ enabled: !!body.enabled });
  await execute(
    "INSERT INTO settings (`key`, value) VALUES ('likes_config', ?) ON DUPLICATE KEY UPDATE value = ?",
    [config, config],
  );
  return NextResponse.json({ ok: true });
}
