import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== "like" && action !== "unlike") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  await execute(
    action === "like"
      ? "UPDATE beats SET likes_count = likes_count + 1 WHERE id = ?"
      : "UPDATE beats SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?",
    [id],
  );

  return NextResponse.json({ ok: true });
}
