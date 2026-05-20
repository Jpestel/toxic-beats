import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const UPLOAD_BASE = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";

function dirSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  try {
    for (const file of readdirSync(dir)) {
      try {
        const stat = statSync(join(dir, file));
        if (stat.isFile()) total += stat.size;
      } catch { /* fichier inaccessible */ }
    }
  } catch { /* dossier inaccessible */ }
  return total;
}

function nextResetDate(): string {
  const RESET_DAY = 13;
  const now  = new Date();
  const day  = now.getDate();
  const reset = day < RESET_DAY
    ? new Date(now.getFullYear(), now.getMonth(), RESET_DAY)
    : new Date(now.getFullYear(), now.getMonth() + 1, RESET_DAY);
  return reset.toISOString();
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const beatBytes    = dirSize(join(UPLOAD_BASE, "beats"));
  const previewBytes = dirSize(join(UPLOAD_BASE, "previews"));
  const coverBytes   = dirSize(join(UPLOAD_BASE, "covers"));
  const totalBytes   = beatBytes + previewBytes + coverBytes;
  const quotaBytes   = 62 * 1024 * 1024 * 1024;

  return NextResponse.json({ totalBytes, beatBytes, previewBytes, coverBytes, quotaBytes, resetDate: nextResetDate() });
}
