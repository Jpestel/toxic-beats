import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// PATCH — modifier le statut d'une commande (admin uniquement)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { status, notes, archived_at } = body;

  const allowed = ["pending", "cancelled", "deleted"];
  if (status && !allowed.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Mise à jour d'archivage seule — pas besoin de logique métier supplémentaire
  if (typeof archived_at !== "undefined" && !status) {
    const db = supabaseAdmin();
    const { error } = await db.from("orders").update({ archived_at: archived_at ?? null }).eq("id", id);
    if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const db = supabaseAdmin();

  const { data: order, error: fetchError } = await db
    .from("orders")
    .select("beat_id, status, beat_title, license_type")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // Construire la mise à jour
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (status) update.status = status;
  if (typeof notes === "string") update.notes = notes;

  // Remettre en attente depuis "paid" → effacer le token de téléchargement
  if (status === "pending" && order.status === "paid") {
    update.download_token = null;
    update.token_expires_at = null;
    update.token_used = false;
  }

  const { error } = await db.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

  const isExclusive = order.license_type === "exclusive";

  // Synchroniser le statut du beat
  if (status === "cancelled") {
    // Annulation → beat disponible uniquement pour les commandes exclusives
    if (isExclusive) {
      const { data: beat } = await db.from("beats").select("status").eq("id", order.beat_id).single();
      if (beat?.status !== "sold") {
        await db.from("beats").update({ status: "available" }).eq("id", order.beat_id);
      }
    }

  } else if (status === "pending" && order.status === "paid") {
    // Annulation d'une confirmation de paiement
    if (isExclusive) {
      // Exclusif annulé depuis paid → beat repasse réservé
      await db.from("beats").update({ status: "reserved" }).eq("id", order.beat_id);
    }
    // Non-exclusif : beat reste available, rien à faire

  } else if (status === "deleted" && order.status !== "cancelled") {
    return NextResponse.json(
      { error: "Seules les commandes annulées peuvent être supprimées." },
      { status: 400 }
    );
  } else if (status === "cancelled" && order.status === "deleted") {
    // Restauration depuis supprimée → annulée (pas de changement de statut du beat)
  } else if (status === "pending" && order.status === "cancelled") {
    // Restauration d'une commande annulée
    if (isExclusive) {
      const { data: beat } = await db.from("beats").select("status, title").eq("id", order.beat_id).single();
      if (beat?.status === "sold") {
        return NextResponse.json(
          { error: `Impossible de restaurer : le beat "${beat.title}" a déjà été vendu à un autre client.` },
          { status: 409 }
        );
      }
      await db.from("beats").update({ status: "reserved" }).eq("id", order.beat_id);
    }
    // Non-exclusif : pas de changement de statut du beat
  }

  return NextResponse.json({ success: true });
}

// DELETE — suppression définitive (admin uniquement, commandes déjà soft-deleted)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = supabaseAdmin();

  const { data: order, error: fetchError } = await db
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (order.status !== "deleted") {
    return NextResponse.json(
      { error: "Seules les commandes supprimées peuvent être effacées définitivement." },
      { status: 400 }
    );
  }

  const { error } = await db.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

  return NextResponse.json({ success: true });
}

