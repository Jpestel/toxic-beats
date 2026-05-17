import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const PROTECTED_GENRE = { name: "Non classé", color: "#555555" };

const DEFAULT_GENRES = [
  { name: "RAP",     color: "#b400ff" },
  { name: "Trap",    color: "#b400ff" },
  { name: "Drill",   color: "#00f5ff" },
  { name: "Electro", color: "#00f5ff" },
  { name: "RnB",     color: "#ff6b35" },
  { name: "Afro",    color: "#39ff14" },
];

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
    .eq("key", "genres_config")
    .single();
  const saved = data?.value ? JSON.parse(data.value) : DEFAULT_GENRES;
  // Toujours injecter la catégorie protégée en dernier
  const genres = [
    ...saved.filter((g: { name: string }) => g.name !== PROTECTED_GENRE.name),
    PROTECTED_GENRE,
  ];
  return NextResponse.json({ genres });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { genres } = await req.json();
  const db = supabaseAdmin();

  // Ne jamais persister la catégorie protégée (elle est toujours ajoutée dynamiquement au GET)
  const toSave = genres.filter((g: { name: string }) => g.name !== PROTECTED_GENRE.name);

  const { error } = await db
    .from("settings")
    .upsert({ key: "genres_config", value: JSON.stringify(toSave) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reclasser les beats orphelins (genre supprimé) vers "Non classé"
  const activeNames = toSave.map((g: { name: string }) => g.name);
  activeNames.push(PROTECTED_GENRE.name);

  const { data: orphans } = await db
    .from("beats")
    .select("id, genre")
    .not("genre", "in", `(${activeNames.map((n: string) => `"${n}"`).join(",")})`);

  if (orphans && orphans.length > 0) {
    await db
      .from("beats")
      .update({ genre: PROTECTED_GENRE.name })
      .in("id", orphans.map((b: { id: string }) => b.id));
  }

  return NextResponse.json({ success: true, reclassified: orphans?.length ?? 0 });
}
