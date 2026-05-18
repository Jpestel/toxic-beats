import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHmac } from "crypto";

const UPLOAD_SECRET  = process.env.UPLOAD_SECRET ?? "toxic-upload-secret-change-me";
const FILES_BASE_URL = process.env.FILES_BASE_URL ?? "https://toxic-files.com/files";
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Génère un token HMAC valide 30 minutes */
function makeToken(bucket: string, filename: string): string {
  const expires = Date.now() + 30 * 60 * 1000;
  const payload = `${bucket}|${filename}|${expires}`;
  const sig = createHmac("sha256", UPLOAD_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
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

// POST — génère une URL d'upload signée vers le serveur local
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const token = makeToken("banners", fileName);

  return NextResponse.json({
    signedUrl: `${SITE_URL}/api/upload/stream?bucket=banners&name=${encodeURIComponent(fileName)}&token=${token}`,
    publicUrl: `${FILES_BASE_URL}/banners/${fileName}`,
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
