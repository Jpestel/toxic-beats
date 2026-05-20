import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { confirmOrderAndSendEmail } from "@/lib/confirmOrder";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const secretKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook/stripe] Signature invalide", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const orderId  = session.metadata?.order_id;   // achat unitaire (BuyModal)
    const orderIds = session.metadata?.order_ids;  // panier (CartModal)

    if (!orderId && !orderIds) {
      console.error("[webhook/stripe] order_id(s) manquant dans metadata");
      return NextResponse.json({ error: "order_id manquant" }, { status: 400 });
    }

    // Achat unitaire
    if (orderId) {
      const result = await confirmOrderAndSendEmail(orderId);
      if ("error" in result) {
        console.error("[webhook/stripe]", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      console.log("[webhook/stripe] Commande confirmée :", orderId, "→", result.downloadUrl);
    }

    // Panier multi-articles
    if (orderIds) {
      for (const id of orderIds.split(",")) {
        const result = await confirmOrderAndSendEmail(id.trim());
        if ("error" in result) {
          console.error("[webhook/stripe] Erreur confirmation", id.trim(), result.error);
        } else {
          console.log("[webhook/stripe] Commande confirmée :", id.trim(), "→", result.downloadUrl);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
