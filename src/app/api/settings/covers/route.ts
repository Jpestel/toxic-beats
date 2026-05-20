import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

type CoverEntry = { url: string; category: string };
type CoverLibrary = { categories: string[]; covers: CoverEntry[] };

function parse(raw: string | null | undefined): CoverLibrary {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    // Nouveau format { categories, covers }
    if (Array.isArray(parsed?.covers)) {
      return { categories: parsed.categories ?? [], covers: parsed.covers };
    }
    // Ancien format : tableau de strings
    if (Array.isArray(parsed)) {
      return { categories: [], covers: parsed.map((url: string) => ({ url, category: "" })) };
    }
  } catch { /* ignore */ }
  return { categories: [], covers: [] };
}

// GET — lecture publique
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "cover_library")
    .single();

  const library = parse(data?.value);
  return NextResponse.json({
    // Rétrocompat : tableau d'URLs pour les beatcards
    urls: library.covers.map(c => c.url),
    covers: library.covers,
    categories: library.categories,
  });
}

// PATCH — mise à jour (authentifié)
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  // Nouveau format
  if (body.covers !== undefined) {
    const covers: CoverEntry[] = (body.covers ?? []).slice(0, 100);
    const categories: string[] = body.categories ?? [];
    const library: CoverLibrary = { categories, covers };
    const { error } = await db
      .from("settings")
      .upsert({ key: "cover_library", value: JSON.stringify(library) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Ancien format (rétrocompat)
  if (body.urls !== undefined) {
    const existing = await db.from("settings").select("value").eq("key", "cover_library").single();
    const library = parse(existing.data?.value);
    const newUrls: string[] = body.urls;
    // Remplace juste les URLs en conservant les catégories si possible
    const newCovers: CoverEntry[] = newUrls.map(url => {
      const existing = library.covers.find(c => c.url === url);
      return { url, category: existing?.category ?? "" };
    });
    const { error } = await db
      .from("settings")
      .upsert({ key: "cover_library", value: JSON.stringify({ categories: library.categories, covers: newCovers }) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Format invalide" }, { status: 400 });
}
