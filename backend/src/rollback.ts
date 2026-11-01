import fs from 'fs';
import path from 'path';
import { getDatabasePaths } from './db.js';
import { runEvidenceRollback } from './evidenceMigration.js';

function main() {
  console.log('================================================================');
  console.log('🔄 EMPLOYASKILLS - PROSEDUR ROLLBACK DATABASE RESMI (VPS / DOCKER)');
  console.log('================================================================');

  const { targetDir, targetFile } = getDatabasePaths();

  // Parse arguments if specified: --backup=/path/to/backup.json
  const args = process.argv.slice(2);
  let backupArg = args.find(a => a.startsWith('--backup='))?.split('=')[1];

  if (!backupArg) {
    // Cari backup otomatis terbaru di targetDir
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir)
        .filter(f => f.startsWith('database.pre_migration_') && f.endsWith('.backup.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        backupArg = path.join(targetDir, files[0]);
        console.log(`[ROLLBACK] Menemukan file backup pra-migrasi terbaru: ${files[0]}`);
      }
    }
  }

  if (!backupArg || !fs.existsSync(backupArg)) {
    console.error(`[ROLLBACK] ❌ File backup tidak ditemukan!`);
    console.error(`Gunakan: npm run rollback:evidence -- --backup=/path/ke/database.backup.json`);
    process.exit(1);
  }

  console.log(`[ROLLBACK] Target database : ${targetFile}`);
  console.log(`[ROLLBACK] Sumber backup   : ${backupArg}`);

  try {
    const report = runEvidenceRollback(targetFile, backupArg);
    console.log('\n[ROLLBACK] HASIL PEMULIHAN:');
    console.log(`- Status          : ${report.success ? 'BERHASIL (100% IDENTIK)' : 'GAGAL'}`);
    console.log(`- SHA-256 Backup  : ${report.backupHash}`);
    console.log(`- SHA-256 Pulih   : ${report.restoredHash}`);
    console.log(`- Ukuran Pulih    : ${report.bytesRestored.toLocaleString()} bytes`);
    if (report.newSubmissionsPreserved && report.newSubmissionsPreserved > 0) {
      console.log(`- Data Baru Terjaga : ${report.newSubmissionsPreserved} submission pasca-migrasi berhasil diintegrasikan`);
      console.log(`- File Cadangan Baru: ${report.preservedSubmissionsFile}`);
    }
    console.log(`- Catatan         : ${report.message}`);

    if (report.success) {
      console.log('\n================================================================');
      console.log('✅ DATABASE TELAH PULIH KE KONDISI SEBELUM MIGRASI!');
      console.log('================================================================');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[ROLLBACK] ❌ Terjadi kesalahan saat memulihkan:`, err.message);
    process.exit(1);
  }
}

main();
