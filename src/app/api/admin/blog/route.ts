import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll, execute } from "@/lib/db";
import { randomUUID } from "crypto";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await queryAll(
    "SELECT id, title, slug, excerpt, cover_url, published_at, visible, created_at FROM posts ORDER BY published_at DESC",
  );
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, slug, content_html, excerpt, cover_url, published_at, visible } = await req.json();

  if (!title?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "Titre et slug requis." }, { status: 400 });
  }

  const id = randomUUID();
  try {
    await execute(
      `INSERT INTO posts (id, title, slug, content_html, excerpt, cover_url, published_at, visible)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        title.trim(),
        slug.trim(),
        content_html ?? "",
        excerpt ?? "",
        cover_url ?? null,
        published_at ?? new Date().toISOString().replace("T", " ").replace("Z", ""),
        visible ?? 1,
      ],
    );
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Ce slug existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ id, title, slug, content_html, excerpt, cover_url, published_at, visible });
}
