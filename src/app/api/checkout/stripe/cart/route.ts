import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import pool, { execute } from "@/lib/db";
import { randomUUID } from "crypto";

const LICENSE_LABELS: Record<string, string> = {
  mp3: "Licence MP3",
  wav: "Licence MP3 + WAV",
  exclusive: "Licence Exclusive (ZIP)",
};

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });

  const stripe = new Stripe(secretKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";

  try {
    const body = await req.json();
    const { items, buyer_name, buyer_email, promo_code = null } = body;

    if (!buyer_name || !buyer_email || !items?.length) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const orderIds: string[] = [];
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const orderId = randomUUID();
      orderIds.push(orderId);

      if (item.product_type === "kit") {
        await execute(
          `INSERT INTO orders (id, kit_id, beat_title, buyer_name, buyer_email, amount, product_type, status, token_used, promo_code, discount_amount)
           VALUES (?,?,?,?,?,?,'kit','pending',0,?,?)`,
          [orderId, item.kit_id, item.beat_title, buyer_name, buyer_email, item.amount, promo_code, item.discount_amount ?? 0],
        );

        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: `${item.beat_title} — Kit de samples` },
            unit_amount: Math.max(50, Math.round(Number(item.amount) * 100)),
          },
          quantity: 1,
        });

      } else {
        // Vérification disponibilité beat
        if (item.license_type === "exclusive") {
          const [result] = await pool.execute<import("mysql2").ResultSetHeader>(
            "UPDATE beats SET status = 'reserved' WHERE id = ? AND status = 'available'",
            [item.beat_id],
          );
          if (result.affectedRows === 0) {
            return NextResponse.json(
              { error: `"${item.beat_title}" n'est plus disponible.` },
              { status: 409 },
            );
          }
        } else {
          const [rows] = await pool.query<import("mysql2").RowDataPacket[]>(
            "SELECT status FROM beats WHERE id = ? LIMIT 1",
            [item.beat_id],
          );
          if (!rows[0] || rows[0].status === "sold") {
            return NextResponse.json(
              { error: `"${item.beat_title}" n'est plus disponible.` },
              { status: 409 },
            );
          }
        }

        await execute(
          `INSERT INTO orders (id, beat_id, beat_title, buyer_name, buyer_email, amount, license_type, product_type, status, token_used, promo_code, discount_amount)
           VALUES (?,?,?,?,?,?,?,'beat','pending',0,?,?)`,
          [orderId, item.beat_id, item.beat_title, buyer_name, buyer_email, item.amount, item.license_type, promo_code, item.discount_amount ?? 0],
        );

        const productName = `${item.beat_title} — ${LICENSE_LABELS[item.license_type] ?? item.license_type}`;
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: productName },
            unit_amount: Math.max(50, Math.round(Number(item.amount) * 100)),
          },
          quantity: 1,
        });
      }
    }

    // Incrémente le compteur du code promo
    if (promo_code) {
      await pool.execute(
        "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?",
        [promo_code],
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: lineItems,
      metadata: { order_ids: orderIds.join(",") },
      success_url: `${siteUrl}/checkout/success`,
      cancel_url: `${siteUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout/stripe/cart]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
