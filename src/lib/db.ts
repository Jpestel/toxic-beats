import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST     ?? "127.0.0.1",
  user:               process.env.MYSQL_USER     ?? "toxic",
  password:           process.env.MYSQL_PASSWORD ?? "",
  database:           process.env.MYSQL_DATABASE ?? "toxic_beats",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "Z",
});

export default pool;

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
  return (rows[0] as T) ?? null;
}

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function execute(
  sql: string,
  params?: unknown[],
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, params as (string | number | boolean | null)[] | undefined);
  return result;
}

/** Upsert d'une clé dans la table settings */
export async function upsertSetting(key: string, value: string): Promise<void> {
  await pool.execute(
    "INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [key, value],
  );
}

/** Lecture d'une valeur dans settings */
export async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE `key` = ? LIMIT 1",
    [key],
  );
  return row?.value ?? null;
}
