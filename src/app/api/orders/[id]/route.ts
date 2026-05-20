import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import pool, { queryOne } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  // Mise à jour d'archivage seule
  if (typeof archived_at !== "undefined" && !status) {
    await pool.execute(
      "UPDATE orders SET archived_at = ? WHERE id = ?",
      [archived_at ?? null, id],
    );
    return NextResponse.json({ success: true });
  }

  const order = await queryOne<{
    beat_id: string; status: string; beat_title: string; license_type: string;
  }>(
    "SELECT beat_id, status, beat_title, license_type FROM orders WHERE id = ? LIMIT 1",
    [id],
  );

  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const sets: string[] = [];
  const values: unknown[] = [];

  if (status) { sets.push("status = ?");  values.push(status); }
  if (typeof notes === "string") { sets.push("notes = ?"); values.push(notes); }

  if (status === "pending" && order.status === "paid") {
    sets.push("download_token = NULL", "token_expires_at = NULL", "token_used = 0");
  }

  if (sets.length) {
    values.push(id);
    await pool.execute(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`, values as (string | number | boolean | null)[]);
  }

  const isExclusive = order.license_type === "exclusive";

  if (status === "cancelled" && isExclusive) {
    const beat = await queryOne<{ status: string }>(
      "SELECT status FROM beats WHERE id = ? LIMIT 1", [order.beat_id],
    );
    if (beat?.status !== "sold") {
      await pool.execute("UPDATE beats SET status = 'available' WHERE id = ?", [order.beat_id]);
    }
  } else if (status === "pending" && order.status === "paid" && isExclusive) {
    await pool.execute("UPDATE beats SET status = 'reserved' WHERE id = ?", [order.beat_id]);
  } else if (status === "deleted" && order.status !== "cancelled") {
    return NextResponse.json(
      { error: "Seules les commandes annulées peuvent être supprimées." },
      { status: 400 },
    );
  } else if (status === "pending" && order.status === "cancelled" && isExclusive) {
    const beat = await queryOne<{ status: string; title: string }>(
      "SELECT status, title FROM beats WHERE id = ? LIMIT 1", [order.beat_id],
    );
    if (beat?.status === "sold") {
      return NextResponse.json(
        { error: `Impossible de restaurer : le beat "${beat.title}" a déjà été vendu.` },
        { status: 409 },
      );
    }
    await pool.execute("UPDATE beats SET status = 'reserved' WHERE id = ?", [order.beat_id]);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const order = await queryOne<{ status: string }>(
    "SELECT status FROM orders WHERE id = ? LIMIT 1", [id],
  );

  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  if (order.status !== "deleted") {
    return NextResponse.json(
      { error: "Seules les commandes supprimées peuvent être effacées définitivement." },
      { status: 400 },
    );
  }

  await pool.execute("DELETE FROM orders WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
