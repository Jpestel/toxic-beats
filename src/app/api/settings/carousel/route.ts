import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

const DEFAULTS = {
  visible:       true,
  title:         "DERNIÈRES SORTIES",
  subtitle:      "◆ NEW RELEASES ◆",
  badge_text:    "NEW",
  count:         8,
  speed:         "normal" as const,
  show_kits:     false,
  kit_count:     4,
  kit_badge_text: "KIT",
};

export async function GET() {
  const raw = await getSetting("carousel_config");
  if (!raw) return NextResponse.json(DEFAULTS);
  try {
    return NextResponse.json({ ...DEFAULTS, ...JSON.parse(raw) });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  await upsertSetting("carousel_config", JSON.stringify(body));
  return NextResponse.json({ success: true });
}
