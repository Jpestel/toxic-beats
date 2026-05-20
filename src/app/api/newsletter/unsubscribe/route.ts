import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?error=invalid", req.url));
  }

  const { data, error } = await db
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?error=invalid", req.url));
  }

  if (data.status === "unsubscribed") {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?already=1", req.url));
  }

  await db.from("newsletter_subscribers").update({
    status: "unsubscribed",
    unsubscribed_at: new Date().toISOString(),
  }).eq("id", data.id);

  return NextResponse.redirect(new URL("/newsletter/unsubscribed?success=1", req.url));
}
