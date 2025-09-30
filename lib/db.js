import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
export async function query(sql, params){ const c = await pool.connect(); try{ return await c.query(sql, params); } finally{ c.release(); } }
