import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
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

  try {
    const body = await req.json();
    const allowed = ["title", "description", "price", "preview_url", "preview_path", "zip_path", "image_url", "status"];

    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [k, v] of Object.entries(body)) {
      if (!allowed.includes(k)) continue;
      sets.push(`\`${k}\` = ?`);
      values.push(v);
    }

    if (sets.length === 0) return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });

    values.push(id);
    await pool.execute(`UPDATE kits SET ${sets.join(", ")} WHERE id = ?`, values as (string | number | boolean | null)[]);

    const kit = await queryOne("SELECT * FROM kits WHERE id = ? LIMIT 1", [id]);
    if (!kit) return NextResponse.json({ error: "Kit introuvable" }, { status: 404 });

    return NextResponse.json(kit);
  } catch (err) {
    console.error("[kits PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const kit = await queryOne<{ preview_path: string | null; zip_path: string | null }>(
      "SELECT preview_path, zip_path FROM kits WHERE id = ? LIMIT 1",
      [id],
    );

    await pool.execute("DELETE FROM kits WHERE id = ?", [id]);

    // Nettoyage fichiers locaux (non bloquant)
    if (kit?.preview_path) {
      unlink(join(UPLOAD_BASE, "previews", kit.preview_path)).catch(() => {});
    }
    if (kit?.zip_path) {
      unlink(join(UPLOAD_BASE, "beats", kit.zip_path)).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[kits DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
