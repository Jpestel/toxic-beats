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

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { previewName, fullName, wavName, zipName, coverName, kitPreviewName, kitZipName } = await req.json();
  const db = supabaseAdmin();

  let previewSignedUrl = null;
  let previewPublicUrl = null;
  if (previewName) {
    const { data: previewSigned, error: prevErr } = await db.storage
      .from("previews")
      .createSignedUploadUrl(previewName);
    if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });
    previewSignedUrl = previewSigned.signedUrl;
    const { data: publicData } = db.storage.from("previews").getPublicUrl(previewName);
    previewPublicUrl = publicData.publicUrl;
  }

  let fullSignedUrl = null;
  if (fullName) {
    const { data: fullSigned, error: fullErr } = await db.storage
      .from("beats")
      .createSignedUploadUrl(fullName);
    if (fullErr) return NextResponse.json({ error: fullErr.message }, { status: 500 });
    fullSignedUrl = fullSigned.signedUrl;
  }

  let wavSignedUrl = null;
  if (wavName) {
    const { data: wavSigned, error: wavErr } = await db.storage
      .from("beats")
      .createSignedUploadUrl(wavName);
    if (wavErr) return NextResponse.json({ error: wavErr.message }, { status: 500 });
    wavSignedUrl = wavSigned.signedUrl;
  }

  let zipSignedUrl = null;
  if (zipName) {
    const { data: zipSigned, error: zipErr } = await db.storage
      .from("beats")
      .createSignedUploadUrl(zipName);
    if (zipErr) return NextResponse.json({ error: zipErr.message }, { status: 500 });
    zipSignedUrl = zipSigned.signedUrl;
  }

  let coverSignedUrl = null;
  let coverPublicUrl = null;
  if (coverName) {
    const { data: coverSigned, error: coverErr } = await db.storage
      .from("covers")
      .createSignedUploadUrl(coverName);
    if (coverErr) return NextResponse.json({ error: coverErr.message }, { status: 500 });
    coverSignedUrl = coverSigned.signedUrl;
    const { data: coverPublic } = db.storage.from("covers").getPublicUrl(coverName);
    coverPublicUrl = coverPublic.publicUrl;
  }

  let kitPreviewSignedUrl = null;
  let kitPreviewPublicUrl = null;
  if (kitPreviewName) {
    const { data: kitPreviewSigned, error: kitPrevErr } = await db.storage
      .from("previews")
      .createSignedUploadUrl(kitPreviewName);
    if (kitPrevErr) return NextResponse.json({ error: kitPrevErr.message }, { status: 500 });
    kitPreviewSignedUrl = kitPreviewSigned.signedUrl;
    const { data: kitPreviewPublic } = db.storage.from("previews").getPublicUrl(kitPreviewName);
    kitPreviewPublicUrl = kitPreviewPublic.publicUrl;
  }

  let kitZipSignedUrl = null;
  if (kitZipName) {
    const { data: kitZipSigned, error: kitZipErr } = await db.storage
      .from("beats")
      .createSignedUploadUrl(kitZipName);
    if (kitZipErr) return NextResponse.json({ error: kitZipErr.message }, { status: 500 });
    kitZipSignedUrl = kitZipSigned.signedUrl;
  }

  return NextResponse.json({
    previewSignedUrl,
    fullSignedUrl,
    wavSignedUrl,
    zipSignedUrl,
    previewPublicUrl,
    coverSignedUrl,
    coverPublicUrl,
    kitPreviewSignedUrl,
    kitPreviewPublicUrl,
    kitZipSignedUrl,
  });
}
