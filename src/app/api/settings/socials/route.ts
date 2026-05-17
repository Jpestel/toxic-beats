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

// GET — lecture publique de la config socials
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "socials_config")
    .single();
  return NextResponse.json({ config: data?.value ? JSON.parse(data.value) : null });
}

// POST — URL présignée pour uploader une icône custom (bucket bio, sous-dossier social-icons)
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const db = supabaseAdmin();
  const path = `social-icons/${fileName}`;

  const { data: signed, error } = await db.storage.from("bio").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicData } = db.storage.from("bio").getPublicUrl(path);
  return NextResponse.json({ signedUrl: signed.signedUrl, publicUrl: publicData.publicUrl });
}

// PATCH — sauvegarde toute la config socials
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { config } = await req.json();
  const db = supabaseAdmin();

  const { error } = await db
    .from("settings")
    .upsert({ key: "socials_config", value: JSON.stringify(config) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
