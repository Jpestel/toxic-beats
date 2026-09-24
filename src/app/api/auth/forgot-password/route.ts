import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const user = await queryOne<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE email = ? LIMIT 1",
    [email.toLowerCase().trim()],
  );

  // Réponse identique que l'utilisateur existe ou non (sécurité)
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await execute(
    "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
    [token, user.id, expiresAt.toISOString().slice(0, 19).replace("T", " ")],
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
  const resetUrl = `${siteUrl}/reset-password/${token}`;

  const { ok, reason } = await sendMail({
    to: user.email,
    subject: "Réinitialisation de ton mot de passe",
    html: `
      <div style="font-family:monospace;background:#080808;color:#fff;padding:40px;max-width:480px;margin:0 auto;border-radius:16px;">
        <h1 style="color:#b400ff;font-size:20px;margin-bottom:8px;">TOXIC FILES</h1>
        <p style="color:#aaa;margin-bottom:24px;">Tu as demandé à réinitialiser ton mot de passe.</p>
        <a href="${resetUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#b400ff,#9000cc);color:#fff;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:14px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#555;font-size:12px;margin-top:24px;">Ce lien est valable <strong style="color:#aaa;">1 heure</strong>. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      </div>
    `,
  });

  if (!ok) {
    console.error("[forgot-password] Erreur envoi email:", reason);
    return NextResponse.json({ error: "Erreur d'envoi d'email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
