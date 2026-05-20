import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const { data: existing } = await db
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      if (existing.status === "confirmed") {
        return NextResponse.json({ error: "Cet email est déjà inscrit." }, { status: 409 });
      }
      if (existing.status === "pending") {
        // Resend confirmation email
        await sendConfirmEmail(normalizedEmail, existing.id);
        return NextResponse.json({ message: "Email de confirmation renvoyé." });
      }
      if (existing.status === "unsubscribed") {
        // Re-subscribe: reset status to pending with new token
        const confirmToken = crypto.randomBytes(32).toString("hex");
        await db.from("newsletter_subscribers").update({
          status: "pending",
          confirm_token: confirmToken,
          subscribed_at: new Date().toISOString(),
          confirmed_at: null,
          unsubscribed_at: null,
        }).eq("id", existing.id);
        await sendConfirmEmail(normalizedEmail, confirmToken);
        return NextResponse.json({ message: "ok" });
      }
    }

    // New subscriber
    const confirmToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    const { error } = await db.from("newsletter_subscribers").insert({
      email: normalizedEmail,
      status: "pending",
      confirm_token: confirmToken,
      unsubscribe_token: unsubscribeToken,
    });

    if (error) throw error;

    await sendConfirmEmail(normalizedEmail, confirmToken);

    return NextResponse.json({ message: "ok" });
  } catch (err) {
    console.error("subscribe error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

async function sendConfirmEmail(email: string, token: string) {
  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://toxic-files.com"}/newsletter/confirm?token=${token}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@toxic-files.com",
    to: email,
    subject: "Confirme ton inscription à la newsletter TOXIC 🎵",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a001a,#0d0d0d);padding:40px 40px 32px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#b400ff;font-weight:700;">◆ TOXIC ◆</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Beatmaker</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#aaaaaa;line-height:1.6;">
            Une dernière étape — clique sur le bouton ci-dessous pour confirmer ton inscription à la newsletter et recevoir en avant-première les nouveaux beats, promos et actus de Lucas.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="${confirmUrl}" style="display:inline-block;background:#b400ff;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 40px;border-radius:12px;">
                ✓ Confirmer mon inscription
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
            Si tu n'as pas demandé cette inscription, ignore cet email. Le lien expire dans 48h.<br>
            <a href="${confirmUrl}" style="color:#666;word-break:break-all;">${confirmUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333;">© ${new Date().getFullYear()} TOXIC — toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
