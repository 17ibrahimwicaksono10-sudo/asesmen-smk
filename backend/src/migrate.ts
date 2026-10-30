import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

// =============================================================================
// Pool koneksi PostgreSQL (singleton)
// =============================================================================
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
      console.error('[DB] Unexpected error on idle client:', err.message);
    });
  }
  return _pool;
}

// =============================================================================
// Jalankan file SQL migrasi
// =============================================================================
async function runSqlFile(filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`[MIGRATE] ✅ Berhasil: ${path.basename(filePath)}`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[MIGRATE] ❌ Gagal: ${path.basename(filePath)}\n`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// =============================================================================
// Entry Point – jalankan semua migration file
// =============================================================================
async function migrate(): Promise<void> {
  console.log('[MIGRATE] Memulai migrasi PostgreSQL...');
  console.log('[MIGRATE] Koneksi ke:', process.env.DATABASE_URL || `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'asesmen_smk'}`);

  const migrationsDir = path.join(__dirname, '..', 'migrations');

  const files = [
    path.join(migrationsDir, '001_schema.sql'),
    path.join(migrationsDir, '002_seed.sql'),
  ];

  for (const file of files) {
    await runSqlFile(file);
  }

  console.log('[MIGRATE] 🎉 Semua migrasi selesai!');
  await getPool().end();
}

migrate().catch((err) => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
