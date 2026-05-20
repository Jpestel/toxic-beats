import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { existsSync } from "fs";
import { join } from "path";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const order = await queryOne<{
    beat_id: string; download_token: string | null;
  }>(
    "SELECT beat_id, download_token FROM orders WHERE id = ? LIMIT 1",
    [id],
  );
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const beat = await queryOne<{ stems_zip_path: string | null; title: string }>(
    "SELECT stems_zip_path, title FROM beats WHERE id = ? LIMIT 1",
    [order.beat_id],
  );
  if (!beat) return NextResponse.json({ error: "Beat introuvable" }, { status: 404 });
  if (!beat.stems_zip_path) return NextResponse.json({ error: "Pas de ZIP de pistes pour ce beat" }, { status: 404 });

  const localPath = join(UPLOAD_BASE, "beats", beat.stems_zip_path);
  if (!existsSync(localPath)) {
    return NextResponse.json({ error: "Fichier ZIP introuvable sur le serveur" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";
  const zipUrl  = order.download_token
    ? `${siteUrl}/download/${order.download_token}?file=zip`
    : null;

  return NextResponse.json({ zipUrl, beatTitle: beat.title });
}
