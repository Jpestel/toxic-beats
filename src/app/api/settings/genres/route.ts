import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting, execute } from "@/lib/db";

export const PROTECTED_GENRE = { name: "Non classé", color: "#555555" };

const DEFAULT_GENRES = [
  { name: "RAP",     color: "#b400ff" },
  { name: "Trap",    color: "#b400ff" },
  { name: "Drill",   color: "#00f5ff" },
  { name: "Electro", color: "#00f5ff" },
  { name: "RnB",     color: "#ff6b35" },
  { name: "Afro",    color: "#39ff14" },
];

export async function GET() {
  const raw   = await getSetting("genres_config");
  const saved = raw ? JSON.parse(raw) : DEFAULT_GENRES;
  const genres = [
    ...saved.filter((g: { name: string }) => g.name !== PROTECTED_GENRE.name),
    PROTECTED_GENRE,
  ];
  return NextResponse.json({ genres });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { genres } = await req.json();
  const toSave = genres.filter((g: { name: string }) => g.name !== PROTECTED_GENRE.name);

  await upsertSetting("genres_config", JSON.stringify(toSave));

  // Reclasser les beats orphelins vers "Non classé"
  const activeNames = [...toSave.map((g: { name: string }) => g.name), PROTECTED_GENRE.name];
  const placeholders = activeNames.map(() => "?").join(",");

  const [orphans] = await (await import("@/lib/db")).default.query<import("mysql2").RowDataPacket[]>(
    `SELECT id FROM beats WHERE genre NOT IN (${placeholders})`,
    activeNames,
  );

  if (orphans.length > 0) {
    const ids = orphans.map((b) => b.id);
    const idPlaceholders = ids.map(() => "?").join(",");
    await execute(
      `UPDATE beats SET genre = ? WHERE id IN (${idPlaceholders})`,
      [PROTECTED_GENRE.name, ...ids],
    );
  }

  return NextResponse.json({ success: true, reclassified: orphans.length });
}
