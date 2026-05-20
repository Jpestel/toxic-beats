import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { signJWT, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const user = await queryOne<{ id: string; email: string; password_hash: string; role: "admin" | "customer" }>(
      "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase().trim()],
    );

    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const expiresIn = user.role === "admin" ? "7d" : "30d";
    const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, expiresIn);

    return NextResponse.json({
      token,
      email: user.email,
      role: user.role,
      isAdmin: user.role === "admin",
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
