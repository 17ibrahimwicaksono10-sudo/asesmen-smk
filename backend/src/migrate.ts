import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      _pool = new Pool({
        connectionString,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
      });
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

export function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Memastikan schema employa dan tabel schema_migrations tersedia sebelum menjalankan migrasi apa pun.
 */
async function ensureMigrationTable(client: pg.PoolClient): Promise<void> {
  const sql = `
    CREATE SCHEMA IF NOT EXISTS employa;
    CREATE TABLE IF NOT EXISTS employa.schema_migrations (
        version     VARCHAR(50) PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum    VARCHAR(64) NOT NULL
    );
  `;
  await client.query(sql);
}

/**
 * Mendapatkan daftar versi migrasi yang telah terpasang di database.
 */
async function getAppliedMigrations(client: pg.PoolClient): Promise<Map<string, string>> {
  const result = await client.query<{ version: string; checksum: string }>(
    'SELECT version, checksum FROM employa.schema_migrations ORDER BY version ASC'
  );
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.version, row.checksum);
  }
  return map;
}

export interface MigrationFile {
  version: string;
  filename: string;
  filePath: string;
  content: string;
  checksum: string;
}

/**
 * Menemukan dan mengurutkan seluruh file migrasi SQL di folder migrations (mengabaikan legacy)
 */
export function discoverMigrations(migrationsDir: string): MigrationFile[] {
  const entries = readdirSync(migrationsDir);
  const migrationFiles: MigrationFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(migrationsDir, entry);
    const stat = statSync(fullPath);

    // Hanya ambil file .sql di level root migrationsDir (subfolder seperti 'legacy' diabaikan)
    if (stat.isFile() && entry.endsWith('.sql')) {
      const match = entry.match(/^(\d+[\w-]*)\.sql$/);
      if (match) {
        const version = match[1];
        const content = readFileSync(fullPath, 'utf8');
        const checksum = computeChecksum(content);
        migrationFiles.push({
          version,
          filename: entry,
          filePath: fullPath,
          content,
          checksum,
        });
      }
    }
  }

  // Urutkan secara alfabetikal / numerik versi
  return migrationFiles.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
}

/**
 * Menjalankan migrasi secara terkontrol dan aman dengan pencatatan schema_migrations.
 */
export async function runMigrations(customPool?: pg.Pool): Promise<{ applied: string[]; skipped: string[] }> {
  const pool = customPool || getPool();
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await ensureMigrationTable(client);
    const appliedMap = await getAppliedMigrations(client);

    const migrationsDir = path.resolve(__dirname, '..', 'migrations');
    const availableMigrations = discoverMigrations(migrationsDir);

    console.log(`[MIGRATE] Ditemukan ${availableMigrations.length} file migrasi di ${migrationsDir}`);

    for (const mig of availableMigrations) {
      if (appliedMap.has(mig.version)) {
        const existingChecksum = appliedMap.get(mig.version);
        if (existingChecksum !== mig.checksum) {
          console.warn(`[MIGRATE] ⚠️ Peringatan: Checksum migrasi ${mig.version} berbeda dari yang tercatat! (File telah diedit setelah dieksekusi)`);
        }
        console.log(`[MIGRATE] ⏩ Dilewati (sudah terpasang): ${mig.filename}`);
        skipped.push(mig.version);
        continue;
      }

      console.log(`[MIGRATE] 🚀 Menjalankan migrasi: ${mig.filename} ...`);
      await client.query('BEGIN');
      try {
        await client.query(mig.content);
        await client.query(
          'INSERT INTO employa.schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [mig.version, mig.filename, mig.checksum]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATE] ✅ Berhasil diterapkan: ${mig.filename}`);
        applied.push(mig.version);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[MIGRATE] ❌ Gagal menerapkan ${mig.filename}:`, err.message);
        throw err;
      }
    }

    return { applied, skipped };
  } finally {
    client.release();
  }
}

// Eksekusi CLI bila dijalankan langsung
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  console.log('[MIGRATE] Memulai runner migrasi PostgreSQL...');
  runMigrations()
    .then(({ applied, skipped }) => {
      console.log(`[MIGRATE] 🎉 Selesai. Diterapkan: ${applied.length}, Dilewati: ${skipped.length}`);
      getPool().end();
    })
    .catch((err) => {
      console.error('[MIGRATE] Fatal error:', err);
      process.exit(1);
    });
}
