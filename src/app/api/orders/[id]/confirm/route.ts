import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import pool, { queryOne } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const order = await queryOne<{
      id: string; status: string; beat_id: string | null;
      license_type: string; product_type: string;
    }>(
      "SELECT id, status, beat_id, license_type, product_type FROM orders WHERE id = ? LIMIT 1",
      [id],
    );

    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ error: "Déjà confirmée" }, { status: 400 });

    if (order.product_type !== "kit" && order.beat_id) {
      const beat = await queryOne<{ status: string; title: string }>(
        "SELECT status, title FROM beats WHERE id = ? LIMIT 1", [order.beat_id],
      );
      if (beat?.status === "sold") {
        return NextResponse.json(
          { error: `Le beat "${beat.title}" a déjà été vendu.` },
          { status: 409 },
        );
      }
    }

    const token   = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    await pool.execute(
      "UPDATE orders SET status='paid', download_token=?, token_expires_at=?, token_used=0 WHERE id=?",
      [token, expires, id],
    );

    if (order.product_type !== "kit" && order.beat_id) {
      if (order.license_type === "exclusive") {
        await pool.execute("UPDATE beats SET status='sold' WHERE id=?", [order.beat_id]);
      } else {
        await pool.execute("UPDATE beats SET status='available' WHERE id=?", [order.beat_id]);
      }
    }

    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
    const downloadUrl = `${siteUrl}/download/${token}`;

    return NextResponse.json({ success: true, downloadUrl, token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
