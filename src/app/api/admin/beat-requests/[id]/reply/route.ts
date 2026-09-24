import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import pool, { queryOne } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }             = await params;
  const { subject, body }  = await req.json();

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Sujet et message requis." }, { status: 400 });
  }

  const request = await queryOne<{ name: string; email: string }>(
    "SELECT name, email FROM beat_requests WHERE id = ? LIMIT 1",
    [id],
  );

  if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@toxic-files.com";

  const { error } = await resend.emails.send({
    from:    fromEmail,
    to:      request.email,
    subject: subject.trim(),
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1a001a,#0d0d0d);padding:28px 40px;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#b400ff;font-weight:700;">◆ TOXIC ◆</p>
          <p style="margin:0;font-size:13px;color:#888;">Beat sur mesure</p>
        </td></tr>
        <tr><td style="padding:32px 40px;color:#cccccc;font-size:15px;line-height:1.8;white-space:pre-wrap;">${body.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333;">toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  if (error) {
    console.error("reply send error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
  }

  const now = new Date().toISOString().replace("T", " ").replace("Z", "");
  await pool.execute(
    "UPDATE beat_requests SET status = 'in_progress', replied_at = ? WHERE id = ? AND status = 'new'",
    [now, id],
  );

  return NextResponse.json({ ok: true });
}
