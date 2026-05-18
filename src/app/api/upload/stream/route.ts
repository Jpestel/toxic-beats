/**
 * /api/upload/stream — reçoit un fichier binaire (PUT) et le sauvegarde
 * sur le système de fichiers local (/var/www/toxic-files/{bucket}/{name}).
 * Protégé par un token HMAC signé généré par /api/upload/presign.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const UPLOAD_SECRET   = process.env.UPLOAD_SECRET ?? "toxic-upload-secret-change-me";
const UPLOAD_BASE     = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";
const ALLOWED_BUCKETS = ["beats", "previews", "covers", "banners", "bio"];

// Timeout étendu pour les gros fichiers WAV/ZIP
export const maxDuration = 120;

function verifyToken(token: string, bucket: string, filename: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastPipe = decoded.lastIndexOf("|");
    const secondLastPipe = decoded.lastIndexOf("|", lastPipe - 1);
    if (lastPipe === -1 || secondLastPipe === -1) return false;

    const sig     = decoded.slice(lastPipe + 1);
    const expires = parseInt(decoded.slice(secondLastPipe + 1, lastPipe));
    const payload = decoded.slice(0, lastPipe); // "bucket|filename|expires"

    if (Date.now() > expires) return false;

    const [tBucket, ...rest] = payload.split("|");
    const tFilename = rest.slice(0, -1).join("|"); // filename peut contenir des |

    if (tBucket !== bucket || tFilename !== filename) return false;

    const expected = createHmac("sha256", UPLOAD_SECRET).update(payload).digest("hex");
    return sig === expected;
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket") ?? "";
  const name   = searchParams.get("name")   ?? "";
  const token  = searchParams.get("token")  ?? "";

  if (!bucket || !name || !token) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Bucket non autorisé" }, { status: 403 });
  }

  if (!verifyToken(token, bucket, name)) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }

  try {
    const buffer   = Buffer.from(await req.arrayBuffer());
    const filePath = join(UPLOAD_BASE, bucket, name);
    try {
      await mkdir(dirname(filePath), { recursive: true });
    } catch (e: any) {
      if (e?.code !== "EEXIST") throw e;
    }
    await writeFile(filePath, buffer);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[upload/stream]", err);
    return NextResponse.json({ error: "Erreur enregistrement" }, { status: 500 });
  }
}
