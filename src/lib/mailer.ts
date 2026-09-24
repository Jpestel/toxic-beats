import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.MAIL_FROM
  ?? `${process.env.RESEND_FROM_NAME ?? "TOXIC Beatmaker"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@toxic-files.com"}>`;

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    await transporter.sendMail({ from: FROM, ...opts });
    return { ok: true };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[mailer]", reason);
    return { ok: false, reason };
  }
}
