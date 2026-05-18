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

/**
 * Liste tous les fichiers d'un bucket (paginé, max 10 000 fichiers).
 * Retourne le total en octets.
 */
async function bucketSize(db: ReturnType<typeof supabaseAdmin>, bucket: string): Promise<number> {
  let total = 0;
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await db.storage.from(bucket).list("", {
      limit,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error || !data || data.length === 0) break;
    for (const file of data) {
      total += (file.metadata as { size?: number })?.size ?? 0;
    }
    if (data.length < limit) break;
    offset += limit;
  }

  return total;
}

/**
 * Calcule la prochaine date de remise à zéro du quota Supabase.
 * Supabase remet à zéro le même jour chaque mois (jour de création du projet).
 * D'après la capture d'écran : le 13 de chaque mois.
 */
function nextResetDate(): string {
  const RESET_DAY = 13;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  let reset: Date;
  if (day < RESET_DAY) {
    reset = new Date(year, month, RESET_DAY);
  } else {
    // Mois suivant
    reset = new Date(year, month + 1, RESET_DAY);
  }
  return reset.toISOString();
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = supabaseAdmin();

  const [beatBytes, previewBytes, coverBytes] = await Promise.all([
    bucketSize(db, "beats"),
    bucketSize(db, "previews"),
    bucketSize(db, "covers"),
  ]);

  const totalBytes = beatBytes + previewBytes + coverBytes;

  // Quota Supabase free tier : 1 GB storage
  const quotaBytes = 1 * 1024 * 1024 * 1024;

  return NextResponse.json({
    totalBytes,
    beatBytes,
    previewBytes,
    coverBytes,
    quotaBytes,
    resetDate: nextResetDate(),
  });
}
