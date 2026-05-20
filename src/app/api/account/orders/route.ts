import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const orders = await queryAll(
      `SELECT
         o.id, o.beat_title, o.product_type, o.license_type, o.amount, o.discount_amount,
         o.status, o.download_token, o.token_expires_at, o.token_used, o.created_at,
         b.title AS beat_title_rel, b.image_url AS beat_image_url,
         k.title AS kit_title_rel,  k.image_url AS kit_image_url
       FROM orders o
       LEFT JOIN beats b ON b.id = o.beat_id
       LEFT JOIN kits  k ON k.id = o.kit_id
       WHERE o.buyer_email = ? AND o.status IN ('paid','pending')
       ORDER BY o.created_at DESC`,
      [user.email],
    );

    const mapped = orders.map((o: Record<string, unknown>) => ({
      ...o,
      beats: o.beat_title_rel ? { title: o.beat_title_rel, image_url: o.beat_image_url } : null,
      kits:  o.kit_title_rel  ? { title: o.kit_title_rel,  image_url: o.kit_image_url  } : null,
    }));

    return NextResponse.json({ orders: mapped });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
