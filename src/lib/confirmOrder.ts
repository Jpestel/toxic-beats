import pool, { queryOne, getSetting } from "@/lib/db";
import { sendDownloadLinkEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function confirmOrderAndSendEmail(orderId: string): Promise<{ downloadUrl: string } | { error: string }> {
  const order = await queryOne<{
    id: string; status: string; beat_id: string | null; kit_id: string | null;
    license_type: string; product_type: string;
    buyer_name: string; buyer_email: string; beat_title: string;
  }>(
    "SELECT id, status, beat_id, kit_id, license_type, product_type, buyer_name, buyer_email, beat_title FROM orders WHERE id = ? LIMIT 1",
    [orderId],
  );

  if (!order) return { error: "Commande introuvable" };
  if (order.status === "paid") return { error: "Déjà confirmée" };

  if (order.product_type !== "kit" && order.beat_id) {
    const beat = await queryOne<{ status: string; title: string }>(
      "SELECT status, title FROM beats WHERE id = ? LIMIT 1", [order.beat_id],
    );
    if (beat?.status === "sold") return { error: `Le beat "${beat.title}" a déjà été vendu.` };
  }

  const token   = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000)
    .toISOString().replace("T", " ").replace("Z", "");

  await pool.execute(
    "UPDATE orders SET status='paid', download_token=?, token_expires_at=?, token_used=0 WHERE id=?",
    [token, expires, orderId],
  );

  if (order.product_type !== "kit" && order.beat_id) {
    if (order.license_type === "exclusive") {
      await pool.execute("UPDATE beats SET status='sold' WHERE id=?", [order.beat_id]);
    } else {
      await pool.execute("UPDATE beats SET status='available' WHERE id=?", [order.beat_id]);
    }
  }

  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
  const downloadUrl = `${siteUrl}/download/${token}`;
  const contactEmail = (await getSetting("contact_email")) ?? "";
  const licenseType  = order.product_type === "kit" ? "kit" : (order.license_type ?? "mp3");

  await sendDownloadLinkEmail({
    buyerName: order.buyer_name, buyerEmail: order.buyer_email,
    beatTitle: order.beat_title, licenseType,
    downloadPageUrl: downloadUrl, contactEmail, siteUrl,
  });

  const now = new Date().toISOString();
  await pool.execute(
    "UPDATE orders SET files_sent_at=?, files_sent_history=? WHERE id=?",
    [now.replace("T", " ").replace("Z", ""), JSON.stringify([now]), orderId],
  );

  return { downloadUrl };
}
