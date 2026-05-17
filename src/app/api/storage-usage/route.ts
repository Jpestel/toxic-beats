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

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = supabaseAdmin();

  // On mesure les buckets audio (les covers sont négligeables)
  const [beatBytes, previewBytes] = await Promise.all([
    bucketSize(db, "beats"),
    bucketSize(db, "previews"),
  ]);

  const totalBytes = beatBytes + previewBytes;

  return NextResponse.json({
    totalBytes,
    beatBytes,
    previewBytes,
    // Quota Supabase free tier : 5 GB
    quotaBytes: 5 * 1024 * 1024 * 1024,
  });
}
