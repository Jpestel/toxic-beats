import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?error=invalid", req.url));
  }

  const sub = await queryOne<{ id: string; status: string }>(
    "SELECT id, status FROM newsletter_subscribers WHERE unsubscribe_token = ? LIMIT 1",
    [token],
  );

  if (!sub) {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?error=invalid", req.url));
  }

  if (sub.status === "unsubscribed") {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?already=1", req.url));
  }

  await execute(
    "UPDATE newsletter_subscribers SET status='unsubscribed', unsubscribed_at=NOW() WHERE id=?",
    [sub.id],
  );

  return NextResponse.redirect(new URL("/newsletter/unsubscribed?success=1", req.url));
}
