import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

export async function GET() {
  const raw = await getSetting("credits");
  let credits = [];
  try { credits = JSON.parse(raw ?? "[]"); } catch { credits = []; }
  return NextResponse.json({ credits });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { credits } = await req.json();
  if (!Array.isArray(credits)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });

  await upsertSetting("credits", JSON.stringify(credits));
  return NextResponse.json({ success: true });
}
