import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import pool, { queryOne } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();

  // Construction dynamique de la requête UPDATE
  const allowed = [
    "title", "genre", "bpm", "price", "preview_url", "full_file_path",
    "description", "tags", "image_url", "status", "visible",
    "wav_extra", "exclusive_price", "wav_file_path", "stems_zip_path",
    "key", "duration",
  ];

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    sets.push("`" + k + "` = ?");
    values.push(Array.isArray(v) ? JSON.stringify(v) : v);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  values.push(id);
  await pool.execute(`UPDATE beats SET ${sets.join(", ")} WHERE id = ?`, values as (string | number | boolean | null)[]);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const beat = await queryOne<{
    full_file_path: string | null;
    wav_file_path: string | null;
    stems_zip_path: string | null;
    preview_url: string | null;
  }>(
    "SELECT full_file_path, wav_file_path, stems_zip_path, preview_url FROM beats WHERE id = ?",
    [id],
  );

  await pool.execute("DELETE FROM beats WHERE id = ?", [id]);

  if (beat) {
    const tryDelete = async (sub: string, filename: string | null) => {
      if (!filename) return;
      try { await unlink(join(UPLOAD_BASE, sub, filename)); } catch {}
    };
    await tryDelete("beats", beat.full_file_path);
    await tryDelete("beats", beat.wav_file_path);
    await tryDelete("beats", beat.stems_zip_path);
    if (beat.preview_url) {
      const previewFile = beat.preview_url.split("/previews/").pop();
      if (previewFile) await tryDelete("previews", previewFile);
    }
  }

  return NextResponse.json({ success: true });
}
