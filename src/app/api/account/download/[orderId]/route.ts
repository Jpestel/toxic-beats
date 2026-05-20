/**
 * GET /api/account/download/[orderId]?file=mp3|wav|zip
 * Téléchargement permanent pour les acheteurs connectés (pas de token expirable).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

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
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const fileType    = req.nextUrl.searchParams.get("file") ?? "mp3";

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const order = await queryOne<{
    status: string; product_type: string; license_type: string; kit_id: string | null;
    beat_title: string;
    full_file_path: string | null; wav_file_path: string | null; stems_zip_path: string | null;
    beat_title2: string | null;
    kit_zip_path: string | null; kit_title: string | null;
  }>(
    `SELECT o.status, o.product_type, o.license_type, o.kit_id, o.beat_title,
            b.title AS beat_title2, b.full_file_path, b.wav_file_path, b.stems_zip_path,
            k.zip_path AS kit_zip_path, k.title AS kit_title
     FROM orders o
     LEFT JOIN beats b ON b.id = o.beat_id
     LEFT JOIN kits  k ON k.id = o.kit_id
     WHERE o.id = ? AND o.buyer_email = ? AND o.status = 'paid' LIMIT 1`,
    [orderId, user.email],
  );

  if (!order) return NextResponse.json({ error: "Commande introuvable ou non payée" }, { status: 404 });

  try {
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

      return streamFile(localPath, zipFilename, "application/zip");
    }

    const licenseType = order.license_type ?? "mp3";
    const hasWav      = licenseType === "wav" || licenseType === "exclusive";
    const beatTitle   = (order.beat_title2 ?? order.beat_title).replace(/\s+/g, "_");

    if (fileType === "wav" && hasWav && order.wav_file_path) {
      const filePath = join(UPLOAD_BASE, "beats", order.wav_file_path);
      if (!existsSync(filePath)) return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
      return streamFile(filePath, `${beatTitle}_WAV.wav`, "audio/wav");
    }

    const fp       = order.full_file_path ?? order.beat_title;
    const ext      = fp.split(".").pop() ?? "mp3";
    const filePath = join(UPLOAD_BASE, "beats", fp);

    if (!existsSync(filePath)) return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
    return streamFile(filePath, `${beatTitle}_MP3.${ext}`, "audio/mpeg");

  } catch (err) {
    console.error("[account/download]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
