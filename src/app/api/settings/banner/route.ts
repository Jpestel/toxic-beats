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

// GET — récupère l'URL et le mode d'affichage de la bannière (public)
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["banner_url", "banner_fit"]);

  const result: Record<string, string | null> = { banner_url: null, banner_fit: "cover" };
  (data ?? []).forEach((row) => { result[row.key] = row.value; });
  return NextResponse.json(result);
}

// POST — génère une URL présignée pour uploader la bannière
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const db = supabaseAdmin();

  const { data: signed, error } = await db.storage
    .from("banners")
    .createSignedUploadUrl(fileName);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicData } = db.storage.from("banners").getPublicUrl(fileName);

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    publicUrl: publicData.publicUrl,
  });
}

// PATCH — enregistre la nouvelle URL et/ou le mode d'affichage de la bannière
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const updates: { key: string; value: string }[] = [];
  if (body.banner_url !== undefined) updates.push({ key: "banner_url", value: body.banner_url });
  if (body.banner_fit !== undefined) updates.push({ key: "banner_fit", value: body.banner_fit });

  if (updates.length) {
    const { error } = await db.from("settings").upsert(updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
