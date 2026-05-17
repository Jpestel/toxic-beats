import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const THEME_DEFAULTS = {
  // Identité
  site_name:        "TOXIC",
  site_tagline:     "Beatmaker",
  hero_subtitle:    "Beats RAP · Trap · Drill · Electro",
  hero_description: "Produit à 100% · Kits exclusifs · Licences disponibles",
  // Couleurs
  color_accent:  "#b400ff",
  color_accent2: "#00f5ff",
  color_accent3: "#39ff14",
  color_bg:      "#080808",
  // Cards
  card_radius: "md" as const,   // none | sm | md | lg
  // Catalogue
  beats_per_page: 4,
  grid_cols:      4,
  // Sections
  show_about:   true,
  show_contact: true,
  // Menu
  nav_order: ["beats", "kits", "about", "contact"] as string[],
};

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "theme_config")
    .single();

  if (!data) return NextResponse.json(THEME_DEFAULTS);
  try {
    return NextResponse.json({ ...THEME_DEFAULTS, ...JSON.parse(data.value) });
  } catch {
    return NextResponse.json(THEME_DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const { error } = await db.from("settings").upsert(
    { key: "theme_config", value: JSON.stringify(body) },
    { onConflict: "key" }
  );

  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ success: true });
}
