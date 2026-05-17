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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("beat_id, buyer_name, beat_title")
    .eq("id", id)
    .single();
  if (orderErr || !order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const { data: beat, error: beatErr } = await db
    .from("beats")
    .select("stems_zip_path, title")
    .eq("id", order.beat_id)
    .single();
  if (beatErr || !beat) return NextResponse.json({ error: "Beat introuvable" }, { status: 404 });
  if (!beat.stems_zip_path) return NextResponse.json({ error: "Pas de ZIP de pistes pour ce beat" }, { status: 404 });

  const { data: signed, error: signErr } = await db.storage
    .from("beats")
    .createSignedUrl(beat.stems_zip_path, 60 * 60 * 24 * 7, {
      download: `${beat.title}-stems.zip`,
    });
  if (signErr || !signed) return NextResponse.json({ error: signErr?.message ?? "Erreur" }, { status: 500 });

  return NextResponse.json({ zipUrl: signed.signedUrl, beatTitle: beat.title });
}
