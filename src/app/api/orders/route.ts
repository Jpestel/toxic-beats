import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import pool, { execute, getSetting, queryAll } from "@/lib/db";
import { sendAdminNewOrderEmail } from "@/lib/email";
import { randomUUID } from "crypto";

function getAdminUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
  return `${base}/admin`;
}

// POST — création d'une commande (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      beat_id, kit_id, beat_title, buyer_name, buyer_email, amount,
      license_type = "mp3", product_type = "beat", promo_code, discount_amount,
    } = body;

    if (!buyer_name || !buyer_email || !amount) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const adminEmail = await getSetting("contact_email");

    if (product_type === "kit") {
      if (!kit_id) return NextResponse.json({ error: "kit_id manquant" }, { status: 400 });

      await execute(
        `INSERT INTO orders
           (id, kit_id, beat_title, buyer_name, buyer_email, amount,
            product_type, status, token_used, promo_code, discount_amount)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(), kit_id, beat_title, buyer_name, buyer_email, amount,
          "kit", "pending", 0,
          promo_code ?? null, discount_amount ?? 0,
        ],
      );

      if (promo_code) {
        await pool.execute(
          "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?",
          [promo_code],
        );
      }

      if (adminEmail) {
        sendAdminNewOrderEmail({
          adminEmail, buyerName: buyer_name, buyerEmail: buyer_email,
          productTitle: beat_title, productType: "kit", amount, adminUrl: getAdminUrl(),
        }).catch(console.error);
      }

      return NextResponse.json({ success: true });
    }

    // ── Beat ──────────────────────────────────────────────────────────────────
    if (!beat_id) return NextResponse.json({ error: "beat_id manquant" }, { status: 400 });

    if (license_type === "exclusive") {
      // Réservation atomique
      const [result] = await pool.execute<import("mysql2").ResultSetHeader>(
        "UPDATE beats SET status = 'reserved' WHERE id = ? AND status = 'available'",
        [beat_id],
      );
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { error: "Ce beat n'est plus disponible.", code: "BEAT_UNAVAILABLE" },
          { status: 409 },
        );
      }
    } else {
      const [rows] = await pool.query<import("mysql2").RowDataPacket[]>(
        "SELECT status FROM beats WHERE id = ? LIMIT 1",
        [beat_id],
      );
      const beat = rows[0];
      if (!beat || beat.status === "sold") {
        return NextResponse.json(
          { error: "Ce beat n'est plus disponible.", code: "BEAT_UNAVAILABLE" },
          { status: 409 },
        );
      }
    }

    try {
      await execute(
        `INSERT INTO orders
           (id, beat_id, beat_title, buyer_name, buyer_email, amount,
            license_type, product_type, status, token_used, promo_code, discount_amount)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(), beat_id, beat_title, buyer_name, buyer_email, amount,
          license_type, "beat", "pending", 0,
          promo_code ?? null, discount_amount ?? 0,
        ],
      );
    } catch (err) {
      if (license_type === "exclusive") {
        await pool.execute("UPDATE beats SET status = 'available' WHERE id = ?", [beat_id]);
      }
      throw err;
    }

    if (promo_code) {
      await pool.execute(
        "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?",
        [promo_code],
      );
    }

    if (adminEmail) {
      sendAdminNewOrderEmail({
        adminEmail, buyerName: buyer_name, buyerEmail: buyer_email,
        productTitle: beat_title, productType: "beat", licenseType: license_type,
        amount, adminUrl: getAdminUrl(),
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET — liste des commandes (admin)
export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const orders = await queryAll<Record<string, unknown>>(
      `SELECT o.*,
              b.preview_url AS beat_preview_url
       FROM orders o
       LEFT JOIN beats b ON b.id = o.beat_id
       ORDER BY o.created_at DESC`,
    );

    // Emails des clients ayant un compte
    const customers = await queryAll<{ email: string }>(
      "SELECT email FROM users WHERE role = 'customer'",
    );
    const customerEmails = new Set(customers.map(u => u.email.toLowerCase()));

    const flat = orders.map(({ beat_preview_url, ...order }) => ({
      ...order,
      preview_url: (order.preview_url ?? beat_preview_url) ?? null,
      has_account: customerEmails.has(String(order.buyer_email ?? "").toLowerCase()),
    }));

    return NextResponse.json(flat);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
