import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { buyerName, buyerEmail, beatTitles, total, hasExclusive } = await req.json();

    if (!buyerName || !buyerEmail || !beatTitles?.length || !total) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const [paymentRaw, contactEmail] = await Promise.all([
      getSetting("payment_config"),
      getSetting("contact_email"),
    ]);

    let paymentMethods: {
      id: string; type: "paypal" | "virement" | "lydia" | "sumeria" | "custom";
      label: string; value: string; active: boolean;
    }[] = [];
    try {
      const parsed = JSON.parse(paymentRaw ?? "{}");
      paymentMethods = (parsed.methods ?? []).filter(
        (m: { active: boolean; value: string }) => m.active && m.value,
      );
    } catch { /* ignore */ }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";

    await sendOrderConfirmationEmail({
      buyerName,
      buyerEmail,
      beatTitles,
      total,
      hasExclusive: !!hasExclusive,
      paymentMethods,
      siteUrl,
      contactEmail: contactEmail ?? "contact@toxic-beats.fr",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-confirmation]", err);
    return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
  }
}
