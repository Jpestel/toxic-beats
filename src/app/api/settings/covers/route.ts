import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getSetting, upsertSetting } from "@/lib/db";

type CoverEntry   = { url: string; category: string };
type CoverLibrary = { categories: string[]; covers: CoverEntry[] };

function parse(raw: string | null | undefined): CoverLibrary {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    if (Array.isArray(parsed?.covers)) {
      return { categories: parsed.categories ?? [], covers: parsed.covers };
    }
    if (Array.isArray(parsed)) {
      return { categories: [], covers: parsed.map((url: string) => ({ url, category: "" })) };
    }
  } catch { /* ignore */ }
  return { categories: [], covers: [] };
}

export async function GET() {
  const raw     = await getSetting("cover_library");
  const library = parse(raw);
  return NextResponse.json({
    urls:       library.covers.map(c => c.url),
    covers:     library.covers,
    categories: library.categories,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();

  if (body.covers !== undefined) {
    const covers: CoverEntry[] = (body.covers ?? []).slice(0, 100);
    const categories: string[] = body.categories ?? [];
    await upsertSetting("cover_library", JSON.stringify({ categories, covers }));
    return NextResponse.json({ success: true });
  }

  if (body.urls !== undefined) {
    const existingRaw = await getSetting("cover_library");
    const library     = parse(existingRaw);
    const newCovers: CoverEntry[] = (body.urls as string[]).map(url => {
      const existing = library.covers.find(c => c.url === url);
      return { url, category: existing?.category ?? "" };
    });
    await upsertSetting("cover_library", JSON.stringify({ categories: library.categories, covers: newCovers }));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Format invalide" }, { status: 400 });
}
