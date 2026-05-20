import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

export async function GET() {
  const contact_email = await getSetting("contact_email");
  return NextResponse.json({ contact_email: contact_email ?? null });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  if (body.contact_email !== undefined) {
    await upsertSetting("contact_email", body.contact_email);
  }

  return NextResponse.json({ success: true });
}
