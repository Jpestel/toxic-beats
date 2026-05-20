/**
 * /api/download/[token] — sert les fichiers depuis le système de fichiers local.
 */
import { NextRequest, NextResponse } from "next/server";
import pool, { queryOne } from "@/lib/db";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

async function recordDownload(
  token: string,
  existingDownloads: string[] | null,
  fileType: string,
) {
  try {
    const entry   = `${new Date().toISOString()}|${fileType}`;
    const history = existingDownloads ?? [];
    await pool.execute(
      "UPDATE orders SET token_used = 1, downloaded_at = ? WHERE download_token = ?",
      [JSON.stringify([...history, entry]), token],
    );
  } catch (e) {
    console.error("[recordDownload]", e);
  }
}

function streamFile(filePath: string, filename: string, mimeType: string): NextResponse {
  const stat     = statSync(filePath);
  const stream   = createReadStream(filePath);
  const readable = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(readable, {
    headers: {
      "Content-Type":        mimeType,
      "Content-Length":      String(stat.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control":       "no-store",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token }  = await params;
  const fileType   = req.nextUrl.searchParams.get("file") ?? "mp3";

  try {
    const order = await queryOne<{
      status: string; token_expires_at: string; license_type: string;
      product_type: string; kit_id: string | null; beat_title: string;
      downloaded_at: string[] | null;
      beat_title2: string; full_file_path: string | null;
      wav_file_path: string | null; stems_zip_path: string | null;
      kit_zip_path: string | null; kit_title: string | null;
    }>(
      `SELECT o.status, o.token_expires_at, o.license_type, o.product_type,
              o.kit_id, o.beat_title, o.downloaded_at,
              b.title AS beat_title2, b.full_file_path, b.wav_file_path, b.stems_zip_path,
              k.zip_path AS kit_zip_path, k.title AS kit_title
       FROM orders o
       LEFT JOIN beats b ON b.id = o.beat_id
       LEFT JOIN kits  k ON k.id = o.kit_id
       WHERE o.download_token = ? LIMIT 1`,
      [token],
    );

    if (!order)                              return NextResponse.json({ error: "Lien invalide" },          { status: 404 });
    if (order.status !== "paid")             return NextResponse.json({ error: "Commande non confirmée" }, { status: 403 });
    if (new Date(order.token_expires_at) < new Date())
                                             return NextResponse.json({ error: "Ce lien a expiré" },       { status: 410 });

    // ── ZIP ──────────────────────────────────────────────────────────────────
    if (fileType === "zip") {
      let zipPath: string | null = null;
      let zipFilename = "kit.zip";

      if (order.product_type === "kit" && order.kit_id) {
        zipPath     = order.kit_zip_path;
        zipFilename = `${(order.kit_title ?? "kit").replace(/\s+/g, "_")}-kit.zip`;
      } else if (order.stems_zip_path) {
        zipPath     = order.stems_zip_path;
        zipFilename = `${(order.beat_title2 ?? order.beat_title).replace(/\s+/g, "_")}-stems.zip`;
      }

      if (!zipPath) return NextResponse.json({ error: "Fichier ZIP introuvable" }, { status: 404 });

      const localPath = join(UPLOAD_BASE, "beats", zipPath);
      if (!existsSync(localPath)) return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });

      await recordDownload(token, order.downloaded_at, "zip");
      return streamFile(localPath, zipFilename, "application/zip");
    }

    // ── MP3 / WAV ────────────────────────────────────────────────────────────
    const licenseType = order.license_type ?? "mp3";
    const hasWav      = licenseType === "wav" || licenseType === "exclusive";
    const beatTitle   = (order.beat_title2 ?? order.beat_title).replace(/\s+/g, "_");

    if (fileType === "wav" && hasWav && order.wav_file_path) {
      const filePath = join(UPLOAD_BASE, "beats", order.wav_file_path);
      if (!existsSync(filePath)) return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
      await recordDownload(token, order.downloaded_at, "wav");
      return streamFile(filePath, `${beatTitle}_WAV.wav`, "audio/wav");
    }

    const fp       = order.full_file_path ?? order.beat_title;
    const ext      = fp.split(".").pop() ?? "mp3";
    const filePath = join(UPLOAD_BASE, "beats", fp);

    if (!existsSync(filePath)) return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });

    await recordDownload(token, order.downloaded_at, "mp3");
    return streamFile(filePath, `${beatTitle}_MP3.${ext}`, "audio/mpeg");

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
