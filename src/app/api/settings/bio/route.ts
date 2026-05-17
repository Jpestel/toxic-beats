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

// GET — lecture publique de bio_text et bio_image_url
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["bio_text", "bio_image_url"]);

  const result: Record<string, string | null> = { bio_text: null, bio_image_url: null };
  (data ?? []).forEach((row) => { result[row.key] = row.value; });
  return NextResponse.json(result);
}

// POST — URL présignée pour uploader la photo de bio
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const db = supabaseAdmin();

  const { data: signed, error } = await db.storage
    .from("bio")
    .createSignedUploadUrl(fileName);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicData } = db.storage.from("bio").getPublicUrl(fileName);

  return NextResponse.json({ signedUrl: signed.signedUrl, publicUrl: publicData.publicUrl });
}

// PATCH — sauvegarde bio_text et/ou bio_image_url
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const updates: { key: string; value: string }[] = [];
  if (body.bio_text    !== undefined) updates.push({ key: "bio_text",      value: body.bio_text });
  if (body.bio_image_url !== undefined) updates.push({ key: "bio_image_url", value: body.bio_image_url });

  if (updates.length) {
    const { error } = await db.from("settings").upsert(updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
