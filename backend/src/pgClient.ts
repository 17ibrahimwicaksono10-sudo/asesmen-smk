import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      _pool = new Pool({ connectionString });
    } else {
      _pool = new Pool({
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME     || 'asesmen_smk',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
    }

    _pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
    });
  }
  return _pool;
}

/** Helper: jalankan query dengan pool */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(sql, params);
}

/** Helper: ambil satu baris */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] ?? null;
}

/** Helper: ambil semua baris */
export async function queryAll<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(sql, params);
  return result.rows;
}

/** Tes koneksi saat startup */
export async function testConnection(): Promise<void> {
  try {
    await query('SELECT 1');
    console.log('[DB] ✅ Koneksi PostgreSQL berhasil.');
  } catch (err: any) {
    console.error('[DB] ❌ Gagal koneksi PostgreSQL:', err.message);
    throw err;
  }
}
