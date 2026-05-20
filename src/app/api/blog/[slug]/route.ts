import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("visible", true)
    .lte("published_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }
  return NextResponse.json(data);
}
