import { NextResponse } from "next/server";
import { Pool } from "pg";

const getPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  return new Pool({
    connectionString,
    ssl: connectionString.includes("rlwy.net") ? { rejectUnauthorized: false } : undefined,
    max: 2,
  });
};

export async function GET() {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL não configurada" }, { status: 501 });
  }

  try {
    const result = await pool.query("select 1 as ok");
    return NextResponse.json({ ok: true, result: result.rows?.[0]?.ok ?? 1 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao conectar no Postgres";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  } finally {
    await pool.end();
  }
}

