import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return false;
  return user.user_metadata?.role !== "customer";
}

export async function GET(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await db
    .from("posts")
    .select("id, title, slug, excerpt, cover_url, published_at, visible, created_at")
    .order("published_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, slug, content_html, excerpt, cover_url, published_at, visible } = await req.json();

  if (!title?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "Titre et slug requis." }, { status: 400 });
  }

  const { data, error } = await db
    .from("posts")
    .insert({
      title: title.trim(),
      slug: slug.trim(),
      content_html: content_html ?? "",
      excerpt: excerpt ?? "",
      cover_url: cover_url ?? null,
      published_at: published_at ?? new Date().toISOString(),
      visible: visible ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
