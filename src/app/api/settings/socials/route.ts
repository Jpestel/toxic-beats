import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";
import { createHmac } from "crypto";

const UPLOAD_SECRET  = process.env.UPLOAD_SECRET  ?? "toxic-upload-secret-change-me";
const FILES_BASE_URL = process.env.FILES_BASE_URL  ?? "https://toxic-files.com/files";
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";

function makeToken(bucket: string, filename: string): string {
  const expires = Date.now() + 30 * 60 * 1000;
  const payload = `${bucket}|${filename}|${expires}`;
  const sig = createHmac("sha256", UPLOAD_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export async function GET() {
  const raw = await getSetting("socials_config");
  return NextResponse.json({ config: raw ? JSON.parse(raw) : null });
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const path = `social-icons/${fileName}`;
  const token = makeToken("bio", path);

  return NextResponse.json({
    signedUrl: `${SITE_URL}/api/upload/stream?bucket=bio&name=${encodeURIComponent(path)}&token=${token}`,
    publicUrl: `${FILES_BASE_URL}/bio/${path}`,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { config } = await req.json();
  await upsertSetting("socials_config", JSON.stringify(config));
  return NextResponse.json({ success: true });
}
