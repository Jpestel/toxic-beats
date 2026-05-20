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

// GET — public : retourne les productions visibles
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "credits")
    .single();

  let credits = [];
  try { credits = JSON.parse(data?.value ?? "[]"); } catch { credits = []; }

  return NextResponse.json({ credits });
}

// PATCH — admin : sauvegarde la liste complète
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { credits } = await req.json();
  if (!Array.isArray(credits)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("settings")
    .upsert({ key: "credits", value: JSON.stringify(credits) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
