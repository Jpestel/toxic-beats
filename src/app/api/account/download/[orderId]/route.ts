/**
 * GET /api/account/download/[orderId]?file=mp3|wav|zip
 * Téléchargement permanent pour les acheteurs connectés.
 * Pas de token expirable — authentification par session Supabase.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

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
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const fileType = req.nextUrl.searchParams.get("file") ?? "mp3";

  // Vérifier la session
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const db = supabaseAdmin();

  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  // Récupérer la commande — vérifier qu'elle appartient bien à cet acheteur
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("*, beats(title, full_file_path, wav_file_path, stems_zip_path), kits(title, zip_path)")
    .eq("id", orderId)
    .eq("buyer_email", user.email!)
    .eq("status", "paid")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Commande introuvable ou non payée" }, { status: 404 });
  }

  try {
    // ── ZIP (Kit ou stems exclusif) ──────────────────────────────────────────
    if (fileType === "zip") {
      let zipPath: string | null = null;
      let zipFilename = "kit.zip";

      if (order.product_type === "kit" && order.kit_id) {
        zipPath = order.kits?.zip_path ?? null;
        zipFilename = `${(order.kits?.title ?? "kit").replace(/\s+/g, "_")}-kit.zip`;
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

      return streamFile(localPath, zipFilename, "application/zip");
    }

    // ── MP3 / WAV ────────────────────────────────────────────────────────────
    const licenseType = order.license_type ?? "mp3";
    const hasWav = licenseType === "wav" || licenseType === "exclusive";
    const beatTitle = (order.beats?.title ?? order.beat_title).replace(/\s+/g, "_");

    if (fileType === "wav" && hasWav && order.beats?.wav_file_path) {
      const filePath = join(UPLOAD_BASE, "beats", order.beats.wav_file_path);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
      }
      return streamFile(filePath, `${beatTitle}_WAV.wav`, "audio/wav");
    }

    // MP3 par défaut
    const fp = order.beats?.full_file_path ?? order.beat_title;
    const ext = fp.split(".").pop() ?? "mp3";
    const filePath = join(UPLOAD_BASE, "beats", fp);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
    }

    return streamFile(filePath, `${beatTitle}_MP3.${ext}`, "audio/mpeg");

  } catch (err) {
    console.error("[account/download]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
