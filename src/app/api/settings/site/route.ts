import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// GET — lecture publique des paramètres du site
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["contact_email"]);

  const result: Record<string, string | null> = { contact_email: null };
  (data ?? []).forEach((row) => { result[row.key] = row.value; });
  return NextResponse.json(result);
}

// PATCH — sauvegarde des paramètres du site (authentifié)
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const updates: { key: string; value: string }[] = [];
  if (body.contact_email !== undefined) {
    updates.push({ key: "contact_email", value: body.contact_email });
  }

  if (updates.length) {
    const { error } = await db.from("settings").upsert(updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
