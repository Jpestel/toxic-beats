import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { mkdirSync, writeFileSync } from "fs";
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

  const order = await queryOne<{ id: string; status: string; product_type: string; custom_files: string | null }>(
    "SELECT id, status, product_type, custom_files FROM orders WHERE id = ? LIMIT 1",
    [id],
  );
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.product_type !== "custom") return NextResponse.json({ error: "Pas une commande sur mesure" }, { status: 400 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });

  const dir = join(UPLOAD_BASE, "custom", id);
  mkdirSync(dir, { recursive: true });

  const existing: string[] = (() => {
    try { return JSON.parse(order.custom_files ?? "[]"); } catch { return []; }
  })();

  const added: string[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    writeFileSync(join(dir, safeName), buffer);
    if (!existing.includes(safeName)) added.push(safeName);
  }

  const allFiles = [...existing, ...added];
  await execute("UPDATE orders SET custom_files = ? WHERE id = ?", [JSON.stringify(allFiles), id]);

  return NextResponse.json({ success: true, files: allFiles });
}
