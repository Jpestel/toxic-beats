/**
 * GET /api/account/orders — retourne les commandes du client connecté
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const db = supabaseAdmin();

    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // Récupérer les commandes correspondant à l'email du client
    const { data: orders, error } = await db
      .from("orders")
      .select(`
        id, beat_title, product_type, license_type, amount, discount_amount,
        status, download_token, token_expires_at, token_used, created_at,
        beats(title, image_url),
        kits(title, image_url)
      `)
      .eq("buyer_email", user.email!)
      .in("status", ["paid", "pending"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: orders ?? [] });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
