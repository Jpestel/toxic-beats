import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** Enregistre un téléchargement dans l'historique.
 *  Format stocké : "ISO_TIMESTAMP|filetype" (ex: "2024-01-15T10:30:00.000Z|mp3")
 */
async function recordDownload(
  db: ReturnType<typeof supabaseAdmin>,
  token: string,
  existingDownloads: string[] | null,
  fileType: string,
) {
  try {
    const entry = `${new Date().toISOString()}|${fileType}`;
    const history = existingDownloads ?? [];
    await db.from("orders").update({
      token_used: true,
      downloaded_at: [...history, entry],
    }).eq("download_token", token);
  } catch (e) {
    console.error("[recordDownload]", e);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const fileType = req.nextUrl.searchParams.get("file") ?? "mp3";

  try {
    const db = supabaseAdmin();

    const { data: order, error } = await db
      .from("orders")
      .select("*, beats(title, full_file_path, wav_file_path, stems_zip_path), downloaded_at")
      .eq("download_token", token)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (order.status !== "paid") {
      return NextResponse.json({ error: "Commande non confirmée" }, { status: 403 });
    }

    if (new Date(order.token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Ce lien a expiré" }, { status: 410 });
    }

    // Téléchargement ZIP pour Kit ou exclusive
    if (fileType === "zip") {
      let zipPath: string | null = null;
      let zipFilename = "kit.zip";

      if (order.product_type === "kit" && order.kit_id) {
        // Kit : chercher le zip_path dans la table kits
        const { data: kitData } = await db
          .from("kits")
          .select("zip_path, title")
          .eq("id", order.kit_id)
          .single();
        zipPath = kitData?.zip_path ?? null;
        zipFilename = `${(kitData?.title ?? "kit").replace(/\s+/g, "_")}-kit.zip`;
      } else if (order.beats?.stems_zip_path) {
        // Beat exclusive : stems zip
        zipPath = order.beats.stems_zip_path;
        zipFilename = `${(order.beats?.title ?? order.beat_title).replace(/\s+/g, "_")}-stems.zip`;
      }

      if (!zipPath) {
        return NextResponse.json({ error: "Fichier ZIP introuvable" }, { status: 404 });
      }

      const { data: signedData, error: signError } = await db.storage
        .from("beats")
        .createSignedUrl(zipPath, 60, { download: zipFilename });

      if (signError || !signedData) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
      }

      await recordDownload(db, token, order.downloaded_at ?? null, "zip");
      return NextResponse.redirect(signedData.signedUrl, { status: 302 });
    }

    const licenseType = order.license_type ?? "mp3";
    const hasWav = licenseType === "wav" || licenseType === "exclusive";
    const beatTitle = (order.beats?.title ?? order.beat_title).replace(/\s+/g, "_");

    let filePath: string;
    let downloadFilename: string;

    if (fileType === "wav" && hasWav && order.beats?.wav_file_path) {
      filePath = order.beats.wav_file_path;
      downloadFilename = `${beatTitle}_WAV.wav`;
    } else {
      filePath = order.beats?.full_file_path ?? order.beat_title;
      const ext = filePath.split(".").pop() ?? "mp3";
      downloadFilename = `${beatTitle}_MP3.${ext}`;
    }

    // Signed URL valide 60s avec téléchargement forcé
    const { data: signedData, error: signError } = await db.storage
      .from("beats")
      .createSignedUrl(filePath, 60, { download: downloadFilename });

    if (signError || !signedData) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    const downloadedFileType = (fileType === "wav" && hasWav && order.beats?.wav_file_path) ? "wav" : "mp3";
    await recordDownload(db, token, order.downloaded_at ?? null, downloadedFileType);
    return NextResponse.redirect(signedData.signedUrl, { status: 302 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
