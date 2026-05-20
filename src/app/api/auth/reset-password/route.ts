import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, new_password } = await req.json();

  if (!token || !new_password) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères" }, { status: 400 });
  }

  const row = await queryOne<{ user_id: string; expires_at: string; used: number }>(
    "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1",
    [token],
  );

  if (!row) return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  if (row.used) return NextResponse.json({ error: "Ce lien a déjà été utilisé" }, { status: 400 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "Ce lien a expiré" }, { status: 400 });

  const newHash = await hashPassword(new_password);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, row.user_id]);
  await execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", [token]);

  return NextResponse.json({ ok: true });
}
