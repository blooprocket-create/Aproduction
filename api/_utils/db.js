import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
export async function query(q, params = []) {
  const client = await pool.connect();
  try { return await client.query(q, params); }
  finally { client.release(); }
}
