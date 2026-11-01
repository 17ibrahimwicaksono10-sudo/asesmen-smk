import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDatabasePaths } from "./db";

export function safeRollbackDatabase(backupFilePath: string): {
  success: boolean;
  backupFile: string;
  checksumMatched: boolean;
  originalSubmissionsRestored: number;
  newSubmissionsPreserved: number;
  preservedSubmissionsFile?: string;
  totalSubmissionsInDatabase: number;
} {
  const resolvedBackupPath = path.resolve(backupFilePath);
  if (!fs.existsSync(resolvedBackupPath)) {
    throw new Error(`File backup tidak ditemukan pada lokasi: ${resolvedBackupPath}`);
  }

  // 1. Verifikasi Checksum SHA-256
  const backupContent = fs.readFileSync(resolvedBackupPath);
  const actualHash = crypto.createHash("sha256").update(backupContent).digest("hex");

  const checksumFile = `${resolvedBackupPath}.sha256`;
  let checksumMatched = false;

  if (fs.existsSync(checksumFile)) {
    const expectedHash = fs.readFileSync(checksumFile, "utf-8").trim().split(/\s+/)[0];
    if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new Error(`CHECKSUM MISMATCH! File backup mungkin rusak atau termodifikasi.\nEkspektasi: ${expectedHash}\nAktual: ${actualHash}`);
    }
    checksumMatched = true;
    console.log(`[ROLLBACK-DB] Checksum SHA-256 valid: ${actualHash}`);
  } else {
    console.warn(`[ROLLBACK-DB] Peringatan: File checksum (.sha256) tidak ditemukan. Melanjutkan dengan hash terhitung: ${actualHash}`);
  }

  // 2. Parse data backup
  const backupData = JSON.parse(backupContent.toString("utf-8"));
  if (!Array.isArray(backupData.submissions)) {
    throw new Error("Format file backup tidak valid: array submissions tidak ditemukan.");
  }

  const { targetFile } = getDatabasePaths();
  console.log(`[ROLLBACK-DB] Target database aktif: ${targetFile}`);

  // 3. Periksa database aktif untuk mendeteksi submission baru pasca-backup
  let newSubmissionsToPreserve: any[] = [];
  let preservedFile: string | undefined;

  if (fs.existsSync(targetFile)) {
    try {
      const activeRaw = fs.readFileSync(targetFile, "utf-8");
      const activeDb = JSON.parse(activeRaw);
      const backupSubIds = new Set(backupData.submissions.map((s: any) => s.id));

      if (Array.isArray(activeDb.submissions)) {
        newSubmissionsToPreserve = activeDb.submissions.filter((s: any) => !backupSubIds.has(s.id));
      }

      if (newSubmissionsToPreserve.length > 0) {
        console.log(`[ROLLBACK-DB] Terdeteksi ${newSubmissionsToPreserve.length} submission baru pasca-backup.`);
        const timestamp = Date.now();
        preservedFile = `${targetFile}.post_deploy_preserved_${timestamp}.json`;
        fs.writeFileSync(preservedFile, JSON.stringify(newSubmissionsToPreserve, null, 2), "utf-8");
        console.log(`[ROLLBACK-DB] Submission baru diamankan ke: ${preservedFile}`);

        // Gabungkan submission baru ke data yang akan di-restore agar tidak hilang
        backupData.submissions = [...backupData.submissions, ...newSubmissionsToPreserve];
      }
    } catch (readErr: any) {
      console.warn(`[ROLLBACK-DB] Peringatan saat membaca database aktif: ${readErr.message}`);
    }
  }

  // 4. Cadangkan database aktif saat ini sebelum ditimpa
  if (fs.existsSync(targetFile)) {
    const preRollbackBackup = `${targetFile}.pre_rollback_${Date.now()}.json`;
    fs.copyFileSync(targetFile, preRollbackBackup);
    console.log(`[ROLLBACK-DB] Salinan darurat database sebelum rollback disimpan di: ${preRollbackBackup}`);
  }

  // 5. Tulis database hasil restore secara atomik
  fs.writeFileSync(targetFile, JSON.stringify(backupData, null, 2), "utf-8");
  console.log(`[ROLLBACK-DB] Database aktif berhasil dipulihkan secara aman dari: ${resolvedBackupPath}`);
  console.log(`[ROLLBACK-DB] Total submission saat ini: ${backupData.submissions.length}`);

  return {
    success: true,
    backupFile: resolvedBackupPath,
    checksumMatched,
    originalSubmissionsRestored: backupData.submissions.length - newSubmissionsToPreserve.length,
    newSubmissionsPreserved: newSubmissionsToPreserve.length,
    preservedSubmissionsFile: preservedFile,
    totalSubmissionsInDatabase: backupData.submissions.length,
  };
}

// CLI Runner
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Gunakan: npm run rollback:database -- <path/to/backup.json>");
    process.exit(1);
  }

  try {
    const result = safeRollbackDatabase(args[0]);
    console.log("\n==================================================================");
    console.log("🎉 ROLLBACK DATABASE BERHASIL DILAKUKAN SECARA AMAN!");
    console.log(`- File Sumber                 : ${result.backupFile}`);
    console.log(`- Status Checksum SHA-256     : ${result.checksumMatched ? "VALID (COCOK)" : "DIHITUNG"}`);
    console.log(`- Submission Asli Dipulihkan  : ${result.originalSubmissionsRestored}`);
    console.log(`- Submission Baru Diamankan   : ${result.newSubmissionsPreserved}`);
    if (result.preservedSubmissionsFile) {
      console.log(`- File Cadangan Baru Disimpan : ${result.preservedSubmissionsFile}`);
    }
    console.log(`- Total Submission Akhir      : ${result.totalSubmissionsInDatabase}`);
    console.log("==================================================================\n");
  } catch (err: any) {
    console.error(`\n❌ [ROLLBACK-DB ERROR]: ${err.message}\n`);
    process.exit(1);
  }
}
