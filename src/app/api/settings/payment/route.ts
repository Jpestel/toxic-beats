import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

export async function GET() {
  const raw = await getSetting("payment_config");
  if (!raw) return NextResponse.json({ methods: [] });
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ methods: [] });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  await upsertSetting("payment_config", JSON.stringify(body));
  return NextResponse.json({ success: true });
}
