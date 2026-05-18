/**
 * /api/download/[token] — sert les fichiers depuis le système de fichiers local.
 * Valide le token, vérifie l'expiration, streame le fichier avec le bon nom.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

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

function streamFile(filePath: string, filename: string, mimeType: string): NextResponse {
  const stat = statSync(filePath);
  const stream = createReadStream(filePath);
  const readable = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(readable, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
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

    // ── ZIP (Kit ou stems exclusif) ──────────────────────────────────────────
    if (fileType === "zip") {
      let zipPath: string | null = null;
      let zipFilename = "kit.zip";

      if (order.product_type === "kit" && order.kit_id) {
        const { data: kitData } = await db
          .from("kits")
          .select("zip_path, title")
          .eq("id", order.kit_id)
          .single();
        zipPath = kitData?.zip_path ?? null;
        zipFilename = `${(kitData?.title ?? "kit").replace(/\s+/g, "_")}-kit.zip`;
      } else if (order.beats?.stems_zip_path) {
        zipPath = order.beats.stems_zip_path;
        zipFilename = `${(order.beats?.title ?? order.beat_title).replace(/\s+/g, "_")}-stems.zip`;
      }

      if (!zipPath) {
        return NextResponse.json({ error: "Fichier ZIP introuvable" }, { status: 404 });
      }

      const localPath = join(UPLOAD_BASE, "beats", zipPath);
      if (!existsSync(localPath)) {
        return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
      }

      await recordDownload(db, token, order.downloaded_at ?? null, "zip");
      return streamFile(localPath, zipFilename, "application/zip");
    }

    // ── MP3 / WAV ────────────────────────────────────────────────────────────
    const licenseType = order.license_type ?? "mp3";
    const hasWav = licenseType === "wav" || licenseType === "exclusive";
    const beatTitle = (order.beats?.title ?? order.beat_title).replace(/\s+/g, "_");

    let filePath: string;
    let downloadFilename: string;
    let mimeType: string;
    let trackedType: string;

    if (fileType === "wav" && hasWav && order.beats?.wav_file_path) {
      filePath = join(UPLOAD_BASE, "beats", order.beats.wav_file_path);
      downloadFilename = `${beatTitle}_WAV.wav`;
      mimeType = "audio/wav";
      trackedType = "wav";
    } else {
      const fp = order.beats?.full_file_path ?? order.beat_title;
      const ext = fp.split(".").pop() ?? "mp3";
      filePath = join(UPLOAD_BASE, "beats", fp);
      downloadFilename = `${beatTitle}_MP3.${ext}`;
      mimeType = "audio/mpeg";
      trackedType = "mp3";
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
    }

    await recordDownload(db, token, order.downloaded_at ?? null, trackedType);
    return streamFile(filePath, downloadFilename, mimeType);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
