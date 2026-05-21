import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { queryAll, getSetting } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

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
      license_type: string; product_type: string; buyer_name: string;
    }>(
      `SELECT id, beat_title, amount, license_type, product_type, buyer_name FROM orders WHERE id IN (${placeholders}) AND status = 'pending'`,
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

    // Email de confirmation (non bloquant)
    const beatTitles = orders.map(o => {
      if (o.product_type === "kit") return `${o.beat_title} (Kit)`;
      const labels: Record<string, string> = { mp3: "MP3", wav: "MP3 + WAV", exclusive: "ZIP Exclusif" };
      return `${o.beat_title} (${labels[o.license_type] ?? o.license_type})`;
    });
    const total = orders.reduce((s, o) => s + Number(o.amount), 0);
    const hasExclusive = orders.some(o => o.product_type === "beat" && o.license_type === "exclusive");
    const buyerName = orders[0]?.buyer_name ?? buyer_email;
    const [paymentRaw, contactEmail] = await Promise.all([getSetting("payment_config"), getSetting("contact_email")]);
    let paymentMethods: { id: string; type: string; label: string; value: string; active: boolean }[] = [];
    try { paymentMethods = (JSON.parse(paymentRaw ?? "{}").methods ?? []).filter((m: { active: boolean; value: string }) => m.active && m.value); } catch { /* ignore */ }
    sendOrderConfirmationEmail({
      buyerName, buyerEmail: buyer_email, beatTitles, total,
      hasExclusive, paymentMethods, siteUrl, contactEmail: contactEmail ?? "contact@toxic-beats.fr",
    }).catch(console.error);

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
