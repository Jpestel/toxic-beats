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

// GET — lecture publique de la bibliothèque de covers
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "cover_library")
    .single();

  let urls: string[] = [];
  try { urls = JSON.parse(data?.value ?? "[]"); } catch { urls = []; }
  return NextResponse.json({ urls });
}

// PATCH — mise à jour de la bibliothèque (authentifié)
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { urls } = await req.json();
  if (!Array.isArray(urls)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("settings")
    .upsert({ key: "cover_library", value: JSON.stringify(urls.slice(0, 12)) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
