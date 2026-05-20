/**
 * GET /api/auth/me — retourne les infos de l'utilisateur connecté
 * isAdmin = true si le compte n'a pas le metadata role "customer"
 * (les admins sont créés directement dans Supabase, sans ce metadata)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const db = supabaseAdmin();

  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const isAdmin = user.user_metadata?.role !== "customer";

  return NextResponse.json({
    email: user.email,
    isAdmin,
  });
}
