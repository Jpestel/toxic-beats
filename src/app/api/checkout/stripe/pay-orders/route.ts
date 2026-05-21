import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { queryAll } from "@/lib/db";

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
    const { order_ids, buyer_email } = await req.json();

    if (!order_ids?.length || !buyer_email) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const placeholders = order_ids.map(() => "?").join(",");
    const orders = await queryAll<{
      id: string; beat_title: string; amount: number;
      license_type: string; product_type: string;
    }>(
      `SELECT id, beat_title, amount, license_type, product_type FROM orders WHERE id IN (${placeholders}) AND status = 'pending'`,
      order_ids,
    );

    if (!orders.length) {
      return NextResponse.json({ error: "Commandes introuvables" }, { status: 404 });
    }

    const lineItems = orders.map(order => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: order.product_type === "kit"
            ? `${order.beat_title} — Kit de samples`
            : `${order.beat_title} — ${LICENSE_LABELS[order.license_type] ?? order.license_type}`,
        },
        unit_amount: Math.max(50, Math.round(Number(order.amount) * 100)),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: lineItems,
      metadata: { order_ids: orders.map(o => o.id).join(",") },
      success_url: `${siteUrl}/checkout/success`,
      cancel_url:  `${siteUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout/stripe/pay-orders]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
