/**
 * POST /api/promo/validate — valide un code promo (public)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: "Code manquant" });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("promo_codes")
    .select("id, code, type, value, description, max_uses, uses_count, expires_at, is_active")
    .eq("code", String(code).toUpperCase().trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: "Code invalide" });
  }

  if (!data.is_active) {
    return NextResponse.json({ valid: false, error: "Code invalide" });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "Code expiré" });
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ valid: false, error: "Code épuisé" });
  }

  return NextResponse.json({
    valid: true,
    code: data.code,
    type: data.type,
    value: data.value,
    description: data.description,
  });
}
