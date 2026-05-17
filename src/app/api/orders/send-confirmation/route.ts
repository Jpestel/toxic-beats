import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOrderConfirmationEmail } from "@/lib/email";

// POST public — envoi de l'email de confirmation de commande au client
export async function POST(req: NextRequest) {
  try {
    const { buyerName, buyerEmail, beatTitles, total, hasExclusive } = await req.json();

    if (!buyerName || !buyerEmail || !beatTitles?.length || !total) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Récupérer les moyens de paiement et l'email de contact en parallèle
    const [{ data: paymentData }, { data: contactData }] = await Promise.all([
      db.from("settings").select("value").eq("key", "payment_config").single(),
      db.from("settings").select("value").eq("key", "contact_email").single(),
    ]);

    const contactEmail = contactData?.value ?? "contact@toxic-beats.fr";

    let paymentMethods: {
      id: string;
      type: "paypal" | "virement" | "lydia" | "sumeria" | "custom";
      label: string;
      value: string;
      active: boolean;
    }[] = [];
    try {
      const parsed = JSON.parse(paymentData?.value ?? "{}");
      paymentMethods = (parsed.methods ?? []).filter(
        (m: { active: boolean; value: string }) => m.active && m.value
      );
    } catch { /* ignore */ }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-beats.fr";

    await sendOrderConfirmationEmail({
      buyerName,
      buyerEmail,
      beatTitles,
      total,
      hasExclusive: !!hasExclusive,
      paymentMethods,
      siteUrl,
      contactEmail,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-confirmation]", err);
    return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
  }
}
