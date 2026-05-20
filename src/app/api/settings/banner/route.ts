import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { queryAll, upsertSetting } from "@/lib/db";
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
  const rows = await queryAll<{ key: string; value: string }>(
    "SELECT `key`, value FROM settings WHERE `key` IN ('banner_url','banner_fit')",
  );
  const result: Record<string, string | null> = { banner_url: null, banner_fit: "cover" };
  rows.forEach((r) => { result[r.key] = r.value; });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { fileName } = await req.json();
  const token = makeToken("banners", fileName);

  return NextResponse.json({
    signedUrl: `${SITE_URL}/api/upload/stream?bucket=banners&name=${encodeURIComponent(fileName)}&token=${token}`,
    publicUrl: `${FILES_BASE_URL}/banners/${fileName}`,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  if (body.banner_url !== undefined) await upsertSetting("banner_url", body.banner_url);
  if (body.banner_fit !== undefined) await upsertSetting("banner_fit", body.banner_fit);

  return NextResponse.json({ success: true });
}
