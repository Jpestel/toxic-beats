import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll } from "@/lib/db";

async function checkAdmin(req: NextRequest) {
  const user = await getAuthedUser(req);
  return user && isAdmin(user) ? user : null;
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await queryAll(
    "SELECT * FROM beat_requests ORDER BY created_at DESC",
  );
  return NextResponse.json(data);
}
