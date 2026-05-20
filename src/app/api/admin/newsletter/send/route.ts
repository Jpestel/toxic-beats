import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

async function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return false;
  return user.user_metadata?.role !== "customer";
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, body_html, recipient_ids } = await req.json();
  if (!subject?.trim() || !body_html?.trim()) {
    return NextResponse.json({ error: "Sujet et contenu requis." }, { status: 400 });
  }

  // Get confirmed subscribers (filtered by IDs if provided)
  let query = db
    .from("newsletter_subscribers")
    .select("id, email, unsubscribe_token")
    .eq("status", "confirmed");

  if (recipient_ids?.length > 0) {
    query = query.in("id", recipient_ids);
  }

  const { data: subscribers, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscribers?.length) {
    return NextResponse.json({ error: "Aucun abonné confirmé." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://toxic-files.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@toxic-files.com";

  // Send in batches of 50 (Resend rate limit)
  const batchSize = 50;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((sub) => {
        const unsubUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
        const htmlWithFooter = `${body_html}
<br><br>
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="border-top:1px solid #1a1a1a;padding-top:20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#555;font-family:Helvetica,Arial,sans-serif;">
      Tu reçois cet email car tu es inscrit(e) à la newsletter TOXIC.<br>
      <a href="${unsubUrl}" style="color:#777;text-decoration:underline;">Se désinscrire</a>
    </p>
  </td></tr>
</table>`;
        return resend.emails.send({
          from: fromEmail,
          to: sub.email,
          subject,
          html: wrapInTemplate(htmlWithFooter),
        });
      })
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") sent++;
      else errors.push(`${batch[idx].email}: ${r.reason}`);
    });

    // Small delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Save campaign to history
  await db.from("newsletter_campaigns").insert({
    subject,
    body_html,
    recipient_count: sent,
  });

  return NextResponse.json({
    sent,
    total: subscribers.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function wrapInTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1a001a,#0d0d0d);padding:32px 40px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#b400ff;font-weight:700;">◆ TOXIC ◆</p>
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">Beatmaker</h1>
        </td></tr>
        <tr><td style="padding:40px;color:#cccccc;font-size:15px;line-height:1.7;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333;">© ${new Date().getFullYear()} TOXIC — toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
