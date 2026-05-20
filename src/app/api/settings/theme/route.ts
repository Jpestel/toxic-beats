import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

export const THEME_DEFAULTS = {
  site_name:        "TOXIC",
  site_tagline:     "Beatmaker",
  hero_subtitle:    "Beats RAP · Trap · Drill · Electro",
  hero_description: "Produit à 100% · Kits exclusifs · Licences disponibles",
  color_accent:     "#b400ff",
  color_accent2:    "#00f5ff",
  color_accent3:    "#39ff14",
  color_bg:         "#080808",
  card_radius:      "md" as const,
  beats_per_page:   4,
  grid_cols:        4,
  show_about:       true,
  show_contact:     true,
  nav_order:        ["beats", "kits", "about", "contact"] as string[],
};

export async function GET() {
  const raw = await getSetting("theme_config");
  if (!raw) return NextResponse.json(THEME_DEFAULTS);
  try {
    return NextResponse.json({ ...THEME_DEFAULTS, ...JSON.parse(raw) });
  } catch {
    return NextResponse.json(THEME_DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  await upsertSetting("theme_config", JSON.stringify(body));
  return NextResponse.json({ success: true });
}
