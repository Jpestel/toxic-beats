import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { execute, queryOne, getSetting } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { title, amount } = await req.json();

  if (!title || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Titre et montant requis" }, { status: 400 });
  }

  const beatRequest = await queryOne<{
    id: string; name: string; email: string; project_type: string;
  }>(
    "SELECT id, name, email, project_type FROM beat_requests WHERE id = ? LIMIT 1",
    [id],
  );

  if (!beatRequest) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const orderId = randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toxic-files.com";

  await execute(
    `INSERT INTO orders
       (id, beat_title, buyer_name, buyer_email, amount, product_type, license_type, status, token_used)
     VALUES (?,?,?,?,?,'custom',NULL,'pending',0)`,
    [orderId, title, beatRequest.name, beatRequest.email, Number(amount)],
  );

  // Mise à jour du statut de la demande → in_progress si encore "new"
  await execute(
    "UPDATE beat_requests SET status = 'in_progress' WHERE id = ? AND status = 'new'",
    [id],
  );

  // Envoi de l'email de paiement
  const [paymentRaw, contactEmail] = await Promise.all([
    getSetting("payment_config"),
    getSetting("contact_email"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paymentMethods: any[] = [];
  try {
    paymentMethods = (JSON.parse(paymentRaw ?? "{}").methods ?? [])
      .filter((m: { active: boolean; value: string }) => m.active && m.value);
  } catch { /* ignore */ }

  sendOrderConfirmationEmail({
    buyerName:      beatRequest.name,
    buyerEmail:     beatRequest.email,
    beatTitles:     [`${title} (Beat sur mesure)`],
    total:          Number(amount),
    hasExclusive:   false,
    paymentMethods,
    siteUrl,
    contactEmail:   contactEmail ?? "contact@toxic-beats.fr",
  }).catch(console.error);

  return NextResponse.json({ success: true, orderId });
}
