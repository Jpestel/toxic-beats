import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";

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

    if (order.status === "paid") {
      return NextResponse.json({ error: "Déjà confirmée" }, { status: 400 });
    }

    // Pour les kits, pas de vérification de disponibilité
    if (order.product_type !== "kit") {
      // Vérifier que le beat n'est pas déjà vendu (commande en double ou anomalie)
      const { data: beat } = await db
        .from("beats")
        .select("status, title")
        .eq("id", order.beat_id)
        .single();

      if (beat?.status === "sold") {
        return NextResponse.json(
          { error: `Le beat "${beat.title}" a déjà été vendu. Vérifie qu'il n'y a pas une commande en double avant de confirmer.` },
          { status: 409 }
        );
      }
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await db
      .from("orders")
      .update({
        status: "paid",
        download_token: token,
        token_expires_at: expires,
        token_used: false,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Pour les beats uniquement : mettre à jour le statut du beat
    if (order.product_type !== "kit" && order.beat_id) {
      // Licence exclusive → beat vendu définitivement
      // Licence non-exclusive (mp3/wav) → beat reste disponible
      if (order.license_type === "exclusive") {
        await db.from("beats").update({ status: "sold" }).eq("id", order.beat_id);
      } else {
        await db.from("beats").update({ status: "available" }).eq("id", order.beat_id);
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-beats.fr";
    const downloadBase = `${siteUrl}/download/${token}`;

    return NextResponse.json({ success: true, downloadUrl: downloadBase, token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
