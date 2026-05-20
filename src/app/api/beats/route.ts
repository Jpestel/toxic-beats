import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll, execute } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  const adminView = user && isAdmin(user);

  const beats = await queryAll<Record<string, unknown>>(
    adminView
      ? "SELECT * FROM beats ORDER BY created_at DESC"
      : "SELECT * FROM beats WHERE visible != 0 ORDER BY created_at DESC",
  );

  const parsed = beats.map(b => ({
    ...b,
    price: Number(b.price),
    wav_extra: b.wav_extra != null ? Number(b.wav_extra) : null,
    exclusive_price: b.exclusive_price != null ? Number(b.exclusive_price) : null,
    bpm: b.bpm != null ? Number(b.bpm) : null,
    duration: b.duration != null ? Number(b.duration) : null,
    tags: typeof b.tags === "string" ? (() => { try { return JSON.parse(b.tags as string); } catch { return []; } })() : (b.tags ?? []),
  }));

  return NextResponse.json(parsed);
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title, genre, bpm, price, preview_url, full_file_path,
    wav_file_path = null, stems_zip_path = null, image_url = null,
    description = null, tags = null, key = null, duration = null,
    wav_extra = null, exclusive_price = null,
  } = body;

  if (!title || !genre || !bpm || !price || !preview_url || !full_file_path) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

  await execute(
    `INSERT INTO beats
      (id, title, genre, bpm, price, preview_url, full_file_path,
       wav_file_path, stems_zip_path, image_url, description, tags,
       \`key\`, duration, wav_extra, exclusive_price, status, visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1)`,
    [id, title, genre, bpm, price, preview_url, full_file_path,
     wav_file_path, stems_zip_path, image_url, description, tagsJson,
     key, duration, wav_extra, exclusive_price],
  );

  return NextResponse.json({ id }, { status: 201 });
}
