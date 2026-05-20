import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: "Code manquant" });

  const data = await queryOne<{
    id: string; code: string; type: string; value: number;
    description: string; max_uses: number | null; uses_count: number;
    expires_at: string | null; is_active: number;
  }>(
    `SELECT id, code, type, value, description, max_uses, uses_count, expires_at, is_active
     FROM promo_codes
     WHERE code = ? LIMIT 1`,
    [String(code).toUpperCase().trim()],
  );

  if (!data || !data.is_active) {
    return NextResponse.json({ valid: false, error: "Code invalide" });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "Code expiré" });
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ valid: false, error: "Code épuisé" });
  }

  return NextResponse.json({
    valid:       true,
    code:        data.code,
    type:        data.type,
    value:       data.value,
    description: data.description,
  });
}
