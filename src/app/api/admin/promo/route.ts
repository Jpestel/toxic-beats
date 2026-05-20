import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll, execute } from "@/lib/db";
import { randomUUID } from "crypto";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const codes = await queryAll(
    "SELECT * FROM promo_codes ORDER BY created_at DESC",
  );
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const id   = randomUUID();

  try {
    await execute(
      `INSERT INTO promo_codes (id, code, type, value, description, max_uses, expires_at, is_active)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        String(body.code).toUpperCase().trim(),
        body.type,
        body.value ?? null,
        body.description?.trim() || null,
        body.max_uses ? parseInt(body.max_uses) : null,
        body.expires_at || null,
        1,
      ],
    );
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ code: { id, code: String(body.code).toUpperCase().trim(), ...body } });
}
