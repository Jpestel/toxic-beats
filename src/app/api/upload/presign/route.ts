/**
 * /api/upload/presign — génère des URLs d'upload locales signées.
 * Remplace les anciennes URLs Supabase Storage signées.
 * Le client fait ensuite un PUT sur /api/upload/stream?bucket=...&name=...&token=...
 */

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

/** URL d'upload vers notre propre API */
function uploadUrl(bucket: string, name: string): string {
  const token = makeToken(bucket, name);
  return `${SITE_URL}/api/upload/stream?bucket=${encodeURIComponent(bucket)}&name=${encodeURIComponent(name)}&token=${token}`;
}

/** URL publique du fichier servi par Nginx */
function publicUrl(bucket: string, name: string): string {
  return `${FILES_BASE_URL}/${bucket}/${name}`;
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const {
    previewName, fullName, wavName, zipName, coverName,
    kitPreviewName, kitZipName,
  } = await req.json();

  return NextResponse.json({
    // Preview
    previewSignedUrl:    previewName    ? uploadUrl("previews", previewName)    : null,
    previewPublicUrl:    previewName    ? publicUrl("previews",  previewName)    : null,
    // MP3 complet
    fullSignedUrl:       fullName       ? uploadUrl("beats",    fullName)        : null,
    // WAV
    wavSignedUrl:        wavName        ? uploadUrl("beats",    wavName)         : null,
    // ZIP stems
    zipSignedUrl:        zipName        ? uploadUrl("beats",    zipName)         : null,
    // Cover
    coverSignedUrl:      coverName      ? uploadUrl("covers",   coverName)       : null,
    coverPublicUrl:      coverName      ? publicUrl("covers",    coverName)       : null,
    // Kit preview
    kitPreviewSignedUrl: kitPreviewName ? uploadUrl("previews", kitPreviewName)  : null,
    kitPreviewPublicUrl: kitPreviewName ? publicUrl("previews",  kitPreviewName)  : null,
    // Kit ZIP
    kitZipSignedUrl:     kitZipName     ? uploadUrl("beats",    kitZipName)      : null,
  });
}
