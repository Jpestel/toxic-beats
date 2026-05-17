import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendDownloadLinkEmail } from "@/lib/email";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();

    const { data: order, error: fetchError } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.status !== "paid") {
      return NextResponse.json({ error: "La commande n'est pas encore payée" }, { status: 400 });
    }

    if (!order.download_token) {
      return NextResponse.json({ error: "Aucun token de téléchargement disponible — confirmez d'abord le paiement" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-beats.fr";
    const downloadBase = `${siteUrl}/download/${order.download_token}`;

    // Email de contact de Lucas
    const { data: contactData } = await db
      .from("settings").select("value").eq("key", "contact_email").single();
    const contactEmail = contactData?.value ?? "contact@toxic-beats.fr";

    // Toutes les commandes (beat ou kit) reçoivent un seul bouton
    // pointant vers la page /download/TOKEN — les téléchargements individuels
    // (MP3, WAV, ZIP) se font depuis cette page via l'API, ce qui garantit
    // que chaque téléchargement est bien tracké.
    const licenseType = order.product_type === "kit" ? "kit" : (order.license_type ?? "mp3");

    await sendDownloadLinkEmail({
      buyerName:       order.buyer_name,
      buyerEmail:      order.buyer_email,
      beatTitle:       order.beat_title,
      licenseType,
      downloadPageUrl: downloadBase,
      contactEmail,
      siteUrl,
    });

    // Enregistrer la date d'envoi (last + historique complet)
    const now = new Date().toISOString();
    const { data: currentOrder } = await db.from("orders").select("files_sent_history").eq("id", id).single();
    const history: string[] = currentOrder?.files_sent_history ?? [];
    await db.from("orders").update({
      files_sent_at: now,
      files_sent_history: [...history, now],
    }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-files]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
