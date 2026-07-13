import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { execute, queryOne } from "@/lib/db";

function getIpHash(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== "like" && action !== "unlike") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const ipHash = getIpHash(req);

  if (action === "like") {
    const existing = await queryOne(
      "SELECT id FROM item_likes WHERE item_type = 'beat' AND item_id = ? AND ip_hash = ?",
      [id, ipHash],
    );
    if (existing) return NextResponse.json({ ok: true, already_liked: true });

    await execute(
      "INSERT IGNORE INTO item_likes (item_type, item_id, ip_hash) VALUES ('beat', ?, ?)",
      [id, ipHash],
    );
    await execute("UPDATE beats SET likes_count = likes_count + 1 WHERE id = ?", [id]);
  } else {
    const deleted = await execute(
      "DELETE FROM item_likes WHERE item_type = 'beat' AND item_id = ? AND ip_hash = ?",
      [id, ipHash],
    );
    if ((deleted as { affectedRows: number }).affectedRows > 0) {
      await execute("UPDATE beats SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?", [id]);
    }
  }

  return NextResponse.json({ ok: true });
}
