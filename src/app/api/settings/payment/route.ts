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

export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "payment_config")
    .single();

  if (!data) return NextResponse.json({ methods: [] });
  try {
    return NextResponse.json(JSON.parse(data.value));
  } catch {
    return NextResponse.json({ methods: [] });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();

  const { error } = await db.from("settings").upsert(
    { key: "payment_config", value: JSON.stringify(body) },
    { onConflict: "key" }
  );

  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ success: true });
}
