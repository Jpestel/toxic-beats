import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { execute, getSetting } from "@/lib/db";
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
    const {
      beat_id, kit_id, beat_title, buyer_name, buyer_email, amount,
      license_type = "mp3", product_type = "beat",
      promo_code = null, discount_amount = 0,
    } = body;

    if (!buyer_name || !buyer_email || !amount || !beat_title) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const orderId = randomUUID();

    // Crée la commande en DB (pending)
    if (product_type === "kit") {
      await execute(
        `INSERT INTO orders (id, kit_id, beat_title, buyer_name, buyer_email, amount, product_type, status, token_used, promo_code, discount_amount)
         VALUES (?,?,?,?,?,?,'kit','pending',0,?,?)`,
        [orderId, kit_id, beat_title, buyer_name, buyer_email, amount, promo_code, discount_amount ?? 0],
      );
    } else {
      await execute(
        `INSERT INTO orders (id, beat_id, beat_title, buyer_name, buyer_email, amount, license_type, product_type, status, token_used, promo_code, discount_amount)
         VALUES (?,?,?,?,?,?,?,'beat','pending',0,?,?)`,
        [orderId, beat_id, beat_title, buyer_name, buyer_email, amount, license_type, promo_code, discount_amount ?? 0],
      );
    }

    const productName = product_type === "kit"
      ? `${beat_title} — Kit de samples`
      : `${beat_title} — ${LICENSE_LABELS[license_type] ?? license_type}`;

    // Crée la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: productName },
          unit_amount: Math.round(Number(amount) * 100), // centimes
        },
        quantity: 1,
      }],
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/checkout/success?order_id=${orderId}`,
      cancel_url:  `${siteUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout/stripe]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
