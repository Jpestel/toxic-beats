import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import pool, { queryAll, getSetting, execute } from "@/lib/db";
import { Resend } from "resend";
import { randomUUID } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, body_html, recipient_ids } = await req.json();
  if (!subject?.trim() || !body_html?.trim()) {
    return NextResponse.json({ error: "Sujet et contenu requis." }, { status: 400 });
  }

  let subscribers: { id: string; email: string; unsubscribe_token: string }[];

  if (recipient_ids?.length > 0) {
    const placeholders = recipient_ids.map(() => "?").join(",");
    subscribers = await queryAll(
      `SELECT id, email, unsubscribe_token FROM newsletter_subscribers WHERE status='confirmed' AND id IN (${placeholders})`,
      recipient_ids,
    ) as { id: string; email: string; unsubscribe_token: string }[];
  } else {
    subscribers = await queryAll(
      "SELECT id, email, unsubscribe_token FROM newsletter_subscribers WHERE status='confirmed'",
    ) as { id: string; email: string; unsubscribe_token: string }[];
  }

  if (!subscribers.length) {
    return NextResponse.json({ error: "Aucun abonné confirmé." }, { status: 400 });
  }

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || "https://toxic-files.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL    || "noreply@toxic-files.com";
  const ccEmail   = await getSetting("contact_email");

  const batchSize = 50;
  let sent        = 0;
  const errors: string[] = [];

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((sub) => {
        const unsubUrl       = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
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
          from: fromEmail, to: sub.email, subject,
          html: wrapInTemplate(htmlWithFooter),
        });
      }),
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") sent++;
      else errors.push(`${batch[idx].email}: ${r.reason}`);
    });

    if (i + batchSize < subscribers.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  await execute(
    "INSERT INTO newsletter_campaigns (id, subject, body_html, recipient_count) VALUES (?,?,?,?)",
    [randomUUID(), subject, body_html, sent],
  );

  if (ccEmail) {
    const recapHtml = `
<p style="margin:0 0 16px;padding:12px 16px;background:#1a001a;border-left:3px solid #b400ff;border-radius:4px;font-size:13px;color:#b400ff;">
  📋 <strong>Copie admin</strong> — Cette newsletter a été envoyée à <strong>${sent}</strong> abonné${sent !== 1 ? "s" : ""}.
  ${errors.length > 0 ? `<br><span style="color:#f59e0b;">${errors.length} erreur(s) d'envoi.</span>` : ""}
</p>
<hr style="border:none;border-top:1px solid #1a1a1a;margin:20px 0;" />
${body_html}`;
    await resend.emails.send({
      from: fromEmail, to: ccEmail,
      subject: `[COPIE] ${subject}`,
      html: wrapInTemplate(recapHtml),
    }).catch(() => {});
  }

  return NextResponse.json({ sent, total: subscribers.length, errors: errors.length > 0 ? errors : undefined });
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
        <tr><td style="padding:40px;color:#cccccc;font-size:15px;line-height:1.7;">${content}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333;">© ${new Date().getFullYear()} TOXIC — toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
