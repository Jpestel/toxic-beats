import { NextRequest, NextResponse } from "next/server";
import { getSetting, upsertSetting } from "@/lib/db";
import { getAuthedUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const raw = await getSetting("share_config");
  try {
    return NextResponse.json(JSON.parse(raw ?? "{}"));
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  await upsertSetting("share_config", JSON.stringify(body));
  return NextResponse.json({ success: true });
}
