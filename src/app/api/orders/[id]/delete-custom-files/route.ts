import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { unlinkSync, existsSync, rmdirSync, readdirSync } from "fs";
import { join } from "path";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // filename optionnel : si fourni, supprime seulement ce fichier ; sinon, supprime tout
  const { filename } = body as { filename?: string };

  const order = await queryOne<{ id: string; product_type: string; custom_files: string | null }>(
    "SELECT id, product_type, custom_files FROM orders WHERE id = ? LIMIT 1",
    [id],
  );
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const dir = join(UPLOAD_BASE, "custom", id);
  let remaining: string[] = [];

  try {
    const existing: string[] = JSON.parse(order.custom_files ?? "[]");

    if (filename) {
      // Suppression d'un seul fichier
      const filePath = join(dir, filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
      if (existsSync(filePath)) unlinkSync(filePath);
      remaining = existing.filter(f => f !== filename);
    } else {
      // Suppression de tous les fichiers
      if (existsSync(dir)) {
        for (const f of readdirSync(dir)) {
          try { unlinkSync(join(dir, f)); } catch { /* ignore */ }
        }
        try { rmdirSync(dir); } catch { /* ignore */ }
      }
      remaining = [];
    }
  } catch {
    remaining = [];
  }

  await execute(
    "UPDATE orders SET custom_files = ? WHERE id = ?",
    [remaining.length ? JSON.stringify(remaining) : null, id],
  );

  return NextResponse.json({ success: true, files: remaining });
}
