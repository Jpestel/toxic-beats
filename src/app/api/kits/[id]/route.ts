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

// PATCH admin — modifie un kit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("kits")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Kit introuvable" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[kits PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE admin — supprime un kit
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const db = supabaseAdmin();

    // Récupérer les chemins pour supprimer les fichiers storage
    const { data: kit } = await db.from("kits").select("preview_path, zip_path, image_url").eq("id", id).single();

    const { error } = await db.from("kits").delete().eq("id", id);
    if (error) throw error;

    // Nettoyage storage (non bloquant)
    if (kit?.preview_path) {
      await db.storage.from("previews").remove([kit.preview_path]);
    }
    if (kit?.zip_path) {
      await db.storage.from("beats").remove([kit.zip_path]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[kits DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
