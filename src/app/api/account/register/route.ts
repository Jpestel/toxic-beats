/**
 * POST /api/account/register — crée un compte client
 * Utilise l'admin API pour ne pas nécessiter de confirmation email.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Vérifier si un compte existe déjà avec cet email
    const { data: existing } = await db.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some(u => u.email === email.toLowerCase());

    if (alreadyExists) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    // Créer le compte sans nécessiter de confirmation email
    const { data, error } = await db.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { role: "customer" },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
