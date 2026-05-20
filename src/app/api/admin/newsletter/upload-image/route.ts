import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_BASE    = process.env.UPLOAD_SERVER_PATH ?? "/var/www/toxic-files";
const FILES_BASE_URL = process.env.FILES_BASE_URL      ?? "https://toxic-files.com/files";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté (JPG, PNG, WebP, GIF uniquement)." }, { status: 400 });
  }

  const ext      = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir      = join(UPLOAD_BASE, "bio", "newsletter");
  const filePath = join(dir, filename);

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `${FILES_BASE_URL}/bio/newsletter/${filename}` });
}
