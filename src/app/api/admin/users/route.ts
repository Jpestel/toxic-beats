import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isAdmin } from "@/lib/auth";
import { queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const users = await queryAll<{
    id: string; email: string; role: string; created_at: string;
    order_count: number; total_spent: number; last_order_at: string | null;
  }>(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.created_at,
       COUNT(o.id)               AS order_count,
       COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END), 0) AS total_spent,
       MAX(o.created_at)         AS last_order_at
     FROM users u
     LEFT JOIN orders o ON o.buyer_email = u.email
     GROUP BY u.id, u.email, u.role, u.created_at
     ORDER BY u.created_at DESC`,
  );

  const ordersRaw = await queryAll<{
    buyer_email: string; id: string; beat_title: string;
    amount: number; status: string; license_type: string | null;
    product_type: string; created_at: string;
  }>(
    `SELECT buyer_email, id, beat_title, amount, status, license_type, product_type, created_at
     FROM orders
     WHERE buyer_email IN (SELECT email FROM users WHERE role = 'customer')
     ORDER BY created_at DESC`,
  );

  const ordersByEmail: Record<string, typeof ordersRaw> = {};
  for (const o of ordersRaw) {
    (ordersByEmail[o.buyer_email] ??= []).push(o);
  }

  const result = users.map(u => ({
    ...u,
    order_count: Number(u.order_count),
    total_spent: Number(u.total_spent),
    orders: ordersByEmail[u.email] ?? [],
  }));

  return NextResponse.json({ users: result });
}
