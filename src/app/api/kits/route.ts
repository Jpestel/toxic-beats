import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { execute, queryAll } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    const adminView = user && isAdmin(user);
    const data = await queryAll(
      adminView
        ? "SELECT * FROM kits ORDER BY created_at DESC"
        : "SELECT * FROM kits WHERE status = 'available' ORDER BY created_at DESC",
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("[kits GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, price, preview_url, preview_path, zip_path, image_url, status } = body;

    if (!title || !price) {
      return NextResponse.json({ error: "Champs manquants (title, price)" }, { status: 400 });
    }

    const id = randomUUID();
    await execute(
      `INSERT INTO kits (id, title, description, price, preview_url, preview_path, zip_path, image_url, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id, title, description ?? "", price,
        preview_url ?? "", preview_path ?? "",
        zip_path ?? null, image_url ?? null,
        status ?? "available",
      ],
    );

    return NextResponse.json({ id, title, description, price, preview_url, preview_path, zip_path, image_url, status });
  } catch (err) {
    console.error("[kits POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
