import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, verifyPassword, hashPassword } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { current_password, new_password } = await req.json();

  if (!current_password || !new_password) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères" }, { status: 400 });
  }

  const row = await queryOne<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
    [user.sub],
  );
  if (!row) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const valid = await verifyPassword(current_password, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });

  const newHash = await hashPassword(new_password);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.sub]);

  return NextResponse.json({ success: true });
}
