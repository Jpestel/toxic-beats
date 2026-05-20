import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const existing = await queryOne(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase().trim()],
    );

    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    const id   = randomUUID();
    const hash = await hashPassword(password);

    await execute(
      "INSERT INTO users (id, email, password_hash, role) VALUES (?,?,?,?)",
      [id, email.toLowerCase().trim(), hash, "customer"],
    );

    return NextResponse.json({ success: true, userId: id });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
