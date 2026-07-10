import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import pool, { queryOne, getSetting } from "@/lib/db";
import { sendDownloadLinkEmail } from "@/lib/email";
import mysql from "mysql2/promise";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const order = await queryOne<{
      status: string; download_token: string | null;
      buyer_name: string; buyer_email: string; beat_title: string;
      product_type: string; license_type: string;
      files_sent_history: string[] | null;
    }>(
      "SELECT status, download_token, buyer_name, buyer_email, beat_title, product_type, license_type, files_sent_history FROM orders WHERE id = ? LIMIT 1",
      [id],
    );

    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (order.status !== "paid") return NextResponse.json({ error: "La commande n'est pas encore payée" }, { status: 400 });
    if (!order.download_token) return NextResponse.json({ error: "Aucun token — confirmez d'abord le paiement" }, { status: 400 });

    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
    const downloadUrl = `${siteUrl}/download/${order.download_token}`;
    const contactEmail = (await getSetting("contact_email")) ?? "contact@toxic-beats.fr";
    const licenseType  = order.product_type === "kit" ? "kit" : (order.license_type ?? "mp3");

    const [accountRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [order.buyer_email],
    );
    const hasAccount = accountRows.length > 0;

    await sendDownloadLinkEmail({
      buyerName:       order.buyer_name,
      buyerEmail:      order.buyer_email,
      beatTitle:       order.beat_title,
      licenseType,
      downloadPageUrl: downloadUrl,
      contactEmail,
      siteUrl,
      hasAccount,
    });

    const now      = new Date().toISOString();
    const history  = Array.isArray(order.files_sent_history) ? order.files_sent_history : [];

    await pool.execute(
      "UPDATE orders SET files_sent_at = ?, files_sent_history = ? WHERE id = ?",
      [now.replace("T", " ").replace("Z", ""), JSON.stringify([...history, now]), id],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-files]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
