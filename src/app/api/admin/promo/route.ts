/**
 * /api/admin/promo — gestion des codes promo (admin)
 */
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

// GET — liste tous les codes
export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ codes: data ?? [] });
}

// POST — crée un code promo
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("promo_codes")
    .insert({
      code:        String(body.code).toUpperCase().trim(),
      type:        body.type,
      value:       body.value ?? null,
      description: body.description?.trim() || null,
      max_uses:    body.max_uses ? parseInt(body.max_uses) : null,
      expires_at:  body.expires_at || null,
      is_active:   true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}
