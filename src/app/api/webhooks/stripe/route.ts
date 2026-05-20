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
    const orderId  = session.metadata?.order_id;

    if (!orderId) {
      console.error("[webhook/stripe] order_id manquant dans metadata");
      return NextResponse.json({ error: "order_id manquant" }, { status: 400 });
    }

    const result = await confirmOrderAndSendEmail(orderId);
    if ("error" in result) {
      console.error("[webhook/stripe]", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log("[webhook/stripe] Commande confirmée :", orderId, "→", result.downloadUrl);
  }

  return NextResponse.json({ received: true });
}
