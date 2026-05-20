import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { name, email, message, honeypot } = await req.json();

  // Anti-bot honeypot — si le champ caché est rempli, c'est un bot
  if (honeypot) {
    return NextResponse.json({ ok: true }); // silencieux pour ne pas alerter le bot
  }

  // Validation basique
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (message.trim().length < 10) {
    return NextResponse.json({ error: "Message trop court." }, { status: 400 });
  }

  // Récupérer l'email de Lucas depuis les settings (jamais exposé côté client)
  const { data: siteSetting } = await db
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();

  const toEmail: string = siteSetting?.value?.contact_email
    || process.env.RESEND_FROM_EMAIL
    || "noreply@toxic-files.com";

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@toxic-files.com";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: email,
    subject: `[Contact TOXIC] ${name}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1a001a,#0d0d0d);padding:28px 40px;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#b400ff;font-weight:700;">◆ TOXIC ◆</p>
          <p style="margin:0;font-size:13px;color:#888;">Nouveau message depuis le site</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:8px;overflow:hidden;border:1px solid #1a1a1a;">
            <tr>
              <td style="padding:10px 14px;background:#151515;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;width:80px;">Nom</td>
              <td style="padding:10px 14px;background:#111;color:#ffffff;font-size:14px;font-weight:600;">${name.trim()}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#151515;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:2px;border-top:1px solid #1a1a1a;">Email</td>
              <td style="padding:10px 14px;background:#111;color:#b400ff;font-size:14px;border-top:1px solid #1a1a1a;">
                <a href="mailto:${email.trim()}" style="color:#b400ff;text-decoration:none;">${email.trim()}</a>
              </td>
            </tr>
          </table>
          <div style="background:#111;border-left:3px solid #b400ff;padding:20px 24px;border-radius:0 8px 8px 0;">
            <p style="margin:0;color:#cccccc;font-size:15px;line-height:1.8;white-space:pre-wrap;">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <p style="margin:20px 0 0;font-size:11px;color:#444;font-family:Helvetica,Arial,sans-serif;">
            Réponds directement à cet email pour contacter <strong style="color:#666;">${name.trim()}</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333;">toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("contact send error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi. Réessaie plus tard." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
