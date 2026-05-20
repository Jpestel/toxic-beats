import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAdminNewOrderEmail } from "@/lib/email";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Récupère le contact_email configuré dans les settings admin */
async function getAdminEmail(db: ReturnType<typeof supabaseAdmin>): Promise<string | null> {
  const { data } = await db.from("settings").select("value").eq("key", "contact_email").single();
  return data?.value ?? null;
}

/** Récupère l'URL du site (pour le lien "Voir dans l'admin") */
function getAdminUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return `${base}/admin`;
}

// POST — création d'une commande (public, pas besoin d'être connecté)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { beat_id, kit_id, beat_title, buyer_name, buyer_email, amount, license_type = "mp3", product_type = "beat", promo_code, discount_amount } = body;

    if (!buyer_name || !buyer_email || !amount) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Commande d'un Kit — pas de vérification de disponibilité (vendu à l'infini)
    if (product_type === "kit") {
      if (!kit_id) {
        return NextResponse.json({ error: "kit_id manquant" }, { status: 400 });
      }

      const { error } = await db.from("orders").insert({
        kit_id,
        beat_title,
        buyer_name,
        buyer_email,
        amount,
        product_type: "kit",
        status: "pending",
        token_used: false,
        promo_code: promo_code ?? null,
        discount_amount: discount_amount ?? 0,
      });

      if (error) throw error;

      // Incrémenter le compteur du code promo
      if (promo_code) {
        const { data: promoData } = await db.from("promo_codes").select("uses_count").eq("code", promo_code).single();
        if (promoData) {
          await db.from("promo_codes").update({ uses_count: promoData.uses_count + 1 }).eq("code", promo_code);
        }
      }

      // Notif admin
      const adminEmail = await getAdminEmail(db);
      if (adminEmail) {
        sendAdminNewOrderEmail({
          adminEmail,
          buyerName: buyer_name,
          buyerEmail: buyer_email,
          productTitle: beat_title,
          productType: "kit",
          amount,
          adminUrl: getAdminUrl(),
        }).catch(console.error);
      }

      return NextResponse.json({ success: true });
    }

    // Commande d'un Beat
    if (!beat_id) {
      return NextResponse.json({ error: "beat_id manquant" }, { status: 400 });
    }

    if (license_type === "exclusive") {
      // Réservation atomique : une seule commande exclusive à la fois
      const { data: reserved, error: reserveError } = await db
        .from("beats")
        .update({ status: "reserved" })
        .eq("id", beat_id)
        .eq("status", "available")
        .select("id")
        .single();

      if (reserveError || !reserved) {
        return NextResponse.json(
          { error: "Ce beat n'est plus disponible.", code: "BEAT_UNAVAILABLE" },
          { status: 409 }
        );
      }
    } else {
      // Licence non-exclusive : pas de réservation, juste vérifier que le beat n'est pas vendu
      const { data: beat } = await db
        .from("beats")
        .select("status")
        .eq("id", beat_id)
        .single();

      if (!beat || beat.status === "sold") {
        return NextResponse.json(
          { error: "Ce beat n'est plus disponible.", code: "BEAT_UNAVAILABLE" },
          { status: 409 }
        );
      }
    }

    const { error } = await db.from("orders").insert({
      beat_id,
      beat_title,
      buyer_name,
      buyer_email,
      amount,
      license_type,
      product_type: "beat",
      status: "pending",
      token_used: false,
      promo_code: promo_code ?? null,
      discount_amount: discount_amount ?? 0,
    });

    if (error) {
      if (license_type === "exclusive") {
        await db.from("beats").update({ status: "available" }).eq("id", beat_id);
      }
      throw error;
    }

    // Incrémenter le compteur du code promo
    if (promo_code) {
      const { data: promoData } = await db.from("promo_codes").select("uses_count").eq("code", promo_code).single();
      if (promoData) {
        await db.from("promo_codes").update({ uses_count: promoData.uses_count + 1 }).eq("code", promo_code);
      }
    }

    // Notif admin
    const adminEmail = await getAdminEmail(db);
    if (adminEmail) {
      sendAdminNewOrderEmail({
        adminEmail,
        buyerName: buyer_name,
        buyerEmail: buyer_email,
        productTitle: beat_title,
        productType: "beat",
        licenseType: license_type,
        amount,
        adminUrl: getAdminUrl(),
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET — lecture des commandes (admin uniquement)
export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("orders")
      .select("*, beats(preview_url)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Récupère les emails des acheteurs ayant un compte client (role: customer)
    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    const customerEmails = new Set(
      (usersData?.users ?? [])
        .filter(u => u.user_metadata?.role === "customer")
        .map(u => u.email?.toLowerCase())
        .filter(Boolean)
    );

    const flat = (data ?? []).map(({ beats, ...order }) => ({
      ...order,
      // beats peut être null si beat_id est null (commande kit)
      preview_url: (beats as { preview_url?: string } | null)?.preview_url ?? order.preview_url ?? null,
      has_account: customerEmails.has(order.buyer_email?.toLowerCase()),
    }));
    return NextResponse.json(flat);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
