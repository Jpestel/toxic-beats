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

// GET public — liste les kits disponibles
export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("kits")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[kits GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST admin — crée un kit
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, price, preview_url, preview_path, zip_path, image_url, status } = body;

    if (!title || !price) {
      return NextResponse.json({ error: "Champs manquants (title, price)" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("kits")
      .insert({
        title,
        description: description ?? "",
        price,
        preview_url: preview_url ?? "",
        preview_path: preview_path ?? "",
        zip_path: zip_path ?? null,
        image_url: image_url ?? null,
        status: status ?? "available",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[kits POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
