import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { getDatabasePaths } from "./db";

export function safeRollbackDatabase(backupFilePath: string, customTargetFile?: string): {
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

  // 2. Parse data backup (Akan melempar SyntaxError jika file JSON rusak)
  let backupData: any;
  try {
    backupData = JSON.parse(backupContent.toString("utf-8"));
  } catch (parseErr: any) {
    throw new Error(`FILE BACKUP RUSAK ATAU BUKAN JSON VALID: ${parseErr.message}`);
  }

  if (!Array.isArray(backupData.submissions)) {
    throw new Error("Format file backup tidak valid: array submissions tidak ditemukan.");
  }

  const { targetFile: defaultTarget } = getDatabasePaths();
  const targetFile = customTargetFile ? path.resolve(customTargetFile) : defaultTarget;
  console.log(`[ROLLBACK-DB] Target database aktif: ${targetFile}`);

  // 3. Periksa database aktif untuk mendeteksi submission dan entitas baru pasca-backup
  let newSubmissionsToPreserve: any[] = [];
  let newUsersToPreserve: any[] = [];
  let newPackagesToPreserve: any[] = [];
  let newExamsToPreserve: any[] = [];
  let newClassesToPreserve: any[] = [];
  let newTeachersToPreserve: any[] = [];
  let preservedFile: string | undefined;

  if (fs.existsSync(targetFile)) {
    try {
      const activeRaw = fs.readFileSync(targetFile, "utf-8");
      const activeDb = JSON.parse(activeRaw);
      const backupSubIds = new Set((backupData.submissions || []).map((s: any) => s.id));
      const backupUserIds = new Set((backupData.users || []).map((u: any) => u.id));
      const backupPkgIds = new Set((backupData.packages || []).map((p: any) => p.id));
      const backupExamIds = new Set((backupData.exams || []).map((e: any) => e.id));
      const backupClassIds = new Set((backupData.classes || []).map((c: any) => c.id));
      const backupTeacherIds = new Set((backupData.teachers || []).map((t: any) => t.id));

      if (Array.isArray(activeDb.submissions)) {
        newSubmissionsToPreserve = activeDb.submissions.filter((s: any) => !backupSubIds.has(s.id));
      }
      if (Array.isArray(activeDb.users)) {
        newUsersToPreserve = activeDb.users.filter((u: any) => !backupUserIds.has(u.id));
      }
      if (Array.isArray(activeDb.packages)) {
        newPackagesToPreserve = activeDb.packages.filter((p: any) => !backupPkgIds.has(p.id));
      }
      if (Array.isArray(activeDb.exams)) {
        newExamsToPreserve = activeDb.exams.filter((e: any) => !backupExamIds.has(e.id));
      }
      if (Array.isArray(activeDb.classes)) {
        newClassesToPreserve = activeDb.classes.filter((c: any) => !backupClassIds.has(c.id));
      }
      if (Array.isArray(activeDb.teachers)) {
        newTeachersToPreserve = activeDb.teachers.filter((t: any) => !backupTeacherIds.has(t.id));
      }

      const totalPreserved = newSubmissionsToPreserve.length +
        newUsersToPreserve.length +
        newPackagesToPreserve.length +
        newExamsToPreserve.length +
        newClassesToPreserve.length +
        newTeachersToPreserve.length;

      if (totalPreserved > 0) {
        console.log(`[ROLLBACK-DB] Terdeteksi entitas baru pasca-backup (Total: ${totalPreserved}):`);
        if (newSubmissionsToPreserve.length > 0) console.log(`  - Submissions baru : ${newSubmissionsToPreserve.length}`);
        if (newUsersToPreserve.length > 0) console.log(`  - Akun pengguna baru : ${newUsersToPreserve.length}`);
        if (newPackagesToPreserve.length > 0) console.log(`  - Paket soal baru   : ${newPackagesToPreserve.length}`);
        if (newExamsToPreserve.length > 0) console.log(`  - Jadwal ujian baru  : ${newExamsToPreserve.length}`);
        if (newClassesToPreserve.length > 0) console.log(`  - Kelas baru         : ${newClassesToPreserve.length}`);

        const timestamp = Date.now();
        preservedFile = `${targetFile}.post_deploy_preserved_${timestamp}.json`;
        const preservedPayload = {
          timestamp: new Date().toISOString(),
          submissions: newSubmissionsToPreserve,
          users: newUsersToPreserve,
          packages: newPackagesToPreserve,
          exams: newExamsToPreserve,
          classes: newClassesToPreserve,
          teachers: newTeachersToPreserve,
        };
        fs.writeFileSync(preservedFile, JSON.stringify(preservedPayload, null, 2), "utf-8");
        console.log(`[ROLLBACK-DB] Entitas baru pasca-backup berhasil diamankan ke: ${preservedFile}`);

        // Gabungkan seluruh entitas baru ke data yang akan di-restore agar tidak hilang
        backupData.submissions = [...(backupData.submissions || []), ...newSubmissionsToPreserve];
        backupData.users = [...(backupData.users || []), ...newUsersToPreserve];
        backupData.packages = [...(backupData.packages || []), ...newPackagesToPreserve];
        backupData.exams = [...(backupData.exams || []), ...newExamsToPreserve];
        backupData.classes = [...(backupData.classes || []), ...newClassesToPreserve];
        backupData.teachers = [...(backupData.teachers || []), ...newTeachersToPreserve];
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

  // 5. Tulis database hasil restore secara atomik (Write to tmp then rename)
  const tmpFile = `${targetFile}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(backupData, null, 2), "utf-8");
  fs.renameSync(tmpFile, targetFile);

  console.log(`[ROLLBACK-DB] Database aktif berhasil dipulihkan secara aman dan atomik dari: ${resolvedBackupPath}`);
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
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Gunakan: npm run rollback:database -- <path/to/backup.json>");
    process.exit(1);
  }

  try {
    const targetDbArg = args[1] || process.env.VOC_DATABASE_PATH;
    const result = safeRollbackDatabase(args[0], targetDbArg);
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
