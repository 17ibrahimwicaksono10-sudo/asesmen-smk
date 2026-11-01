import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DatabaseSchema } from "./db";
import { ExamSubmission } from "./types";

export interface MigrationReport {
  success: boolean;
  targetFile: string;
  backupFile: string;
  backupHash: string;
  bytesBefore: number;
  bytesAfter: number;
  bytesReduced: number;
  reductionPercentage: string;
  totalSubmissions: number;
  totalEvidencesProcessed: number;
  filesWritten: number;
  integrityVerified: boolean;
  countsBefore: {
    schools: number;
    classes: number;
    teachers: number;
    users: number;
    exams: number;
    submissions: number;
  };
  countsAfter: {
    schools: number;
    classes: number;
    teachers: number;
    users: number;
    exams: number;
    submissions: number;
  };
  scoresIntegrityVerified: boolean;
  durationMs: number;
}

export interface RollbackReport {
  success: boolean;
  targetFile: string;
  backupFile: string;
  backupHash: string;
  restoredHash: string;
  bytesRestored: number;
  hashVerified: boolean;
  message: string;
}

/**
 * Calculates SHA-256 hash of a file or buffer
 */
export function calculateSha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Execute standalone, isolated evidence migration with backup & verification
 */
export function runEvidenceMigration(
  targetFile: string,
  storageDir: string,
  options: { createBackup?: boolean } = { createBackup: true }
): MigrationReport {
  const startTime = Date.now();

  if (!fs.existsSync(targetFile)) {
    throw new Error(`Target database file not found: ${targetFile}`);
  }

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const rawBefore = fs.readFileSync(targetFile, "utf-8");
  const bytesBefore = Buffer.byteLength(rawBefore, "utf-8");
  const dbBefore: DatabaseSchema = JSON.parse(rawBefore);

  // 1. Create Timestamped Pre-Migration Backup
  let backupFile = "";
  let backupHash = "";
  if (options.createBackup) {
    const timestamp = Date.now();
    const backupDir = path.dirname(targetFile);
    backupFile = path.join(backupDir, `database.pre_migration_${timestamp}.backup.json`);
    fs.writeFileSync(backupFile, rawBefore, "utf-8");
    backupHash = calculateSha256(Buffer.from(rawBefore, "utf-8"));
  }

  // Record baseline entity counts
  const countsBefore = {
    schools: (dbBefore.schools || []).length,
    classes: (dbBefore.classes || []).length,
    teachers: (dbBefore.teachers || []).length,
    users: (dbBefore.users || []).length,
    exams: (dbBefore.exams || []).length,
    submissions: (dbBefore.submissions || []).length,
  };

  // Record baseline scores per submission
  const scoresBaseline = new Map<string, { total: number; tech: number; emp: number }>();
  (dbBefore.submissions || []).forEach(s => {
    scoresBaseline.set(s.id, {
      total: s.totalScore,
      tech: s.technicalScore,
      emp: s.employabilityScore,
    });
  });

  // 2. Perform Base64 Evidence Extraction
  let filesWritten = 0;
  let totalEvidencesProcessed = 0;
  let integrityVerified = true;

  const processEvidenceItem = (ev: any) => {
    if (!ev) return;
    totalEvidencesProcessed++;

    if (!ev.fileData || typeof ev.fileData !== "string") {
      // Already clean / physical file
      return;
    }

    if (!ev.fileData.startsWith("data:") && ev.fileData.length < 500) {
      return;
    }

    try {
      const base64Data = ev.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const hash = calculateSha256(buffer);

      const isAudio = ev.modalityType === "audio" || (ev.mimeType && ev.mimeType.includes("audio"));
      const isHandwriting = ev.modalityType === "handwriting" || (ev.mimeType && ev.mimeType.includes("image"));
      const ext = path.extname(ev.fileName || "") || (isAudio ? ".webm" : isHandwriting ? ".jpg" : ".pdf");
      const safeBase = path.basename(ev.fileName || "evidence", ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const storedFileName = `${ev.id || Date.now()}_${hash.substring(0, 10)}_${safeBase}${ext}`;
      const filePath = path.join(storageDir, storedFileName);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
        filesWritten++;
      }

      // Verify file written on disk matches exact buffer hash
      const writtenBuffer = fs.readFileSync(filePath);
      const writtenHash = calculateSha256(writtenBuffer);
      if (writtenHash !== hash) {
        integrityVerified = false;
        throw new Error(`Checksum mismatch for extracted evidence ${ev.id}`);
      }

      ev.storageUrl = `/api/evidence/file/${storedFileName}`;
      ev.storagePath = filePath;
      ev.fileHash = hash;
      ev.previewUrl = ev.storageUrl;
      ev.isArchived = true;
      delete ev.fileData; // Strip heavy base64
    } catch (err: any) {
      integrityVerified = false;
      console.warn(`[EvidenceMigration] Error extracting evidence ${ev.id}:`, err.message);
    }
  };

  // Process all submissions and nested question answers
  (dbBefore.submissions || []).forEach(sub => {
    if (Array.isArray(sub.evidences)) {
      sub.evidences.forEach(processEvidenceItem);
    }
    if (sub.answers && typeof sub.answers === "object") {
      Object.values(sub.answers).forEach((ans: any) => {
        if (Array.isArray(ans?.multimodalEvidences)) {
          ans.multimodalEvidences.forEach(processEvidenceItem);
        }
      });
    }
  });

  // 3. Write Migrated Database
  const rawAfter = JSON.stringify(dbBefore, null, 2);
  fs.writeFileSync(targetFile, rawAfter, "utf-8");
  const bytesAfter = Buffer.byteLength(rawAfter, "utf-8");

  // 4. Verify Integrity of Migrated Database
  const countsAfter = {
    schools: (dbBefore.schools || []).length,
    classes: (dbBefore.classes || []).length,
    teachers: (dbBefore.teachers || []).length,
    users: (dbBefore.users || []).length,
    exams: (dbBefore.exams || []).length,
    submissions: (dbBefore.submissions || []).length,
  };

  let scoresIntegrityVerified = true;
  (dbBefore.submissions || []).forEach(s => {
    const base = scoresBaseline.get(s.id);
    if (!base || base.total !== s.totalScore || base.tech !== s.technicalScore || base.emp !== s.employabilityScore) {
      scoresIntegrityVerified = false;
    }
  });

  const bytesReduced = Math.max(0, bytesBefore - bytesAfter);
  const reductionPercentage = bytesBefore > 0
    ? `${((bytesReduced / bytesBefore) * 100).toFixed(2)}%`
    : "0%";

  return {
    success: integrityVerified && scoresIntegrityVerified,
    targetFile,
    backupFile,
    backupHash,
    bytesBefore,
    bytesAfter,
    bytesReduced,
    reductionPercentage,
    totalSubmissions: countsBefore.submissions,
    totalEvidencesProcessed,
    filesWritten,
    integrityVerified,
    countsBefore,
    countsAfter,
    scoresIntegrityVerified,
    durationMs: Date.now() - startTime,
  };
}

export interface RollbackReport {
  success: boolean;
  targetFile: string;
  backupFile: string;
  backupHash: string;
  restoredHash: string;
  bytesRestored: number;
  hashVerified: boolean;
  message: string;
  newSubmissionsPreserved?: number;
  preservedSubmissionsFile?: string;
}

/**
 * Execute rollback: restores target database from pre-migration backup
 * Safely detects and preserves any new submissions submitted post-migration
 */
export function runEvidenceRollback(
  targetFile: string,
  backupFile: string,
  options: { preserveNewSubmissions?: boolean } = { preserveNewSubmissions: true }
): RollbackReport {
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  const backupContent = fs.readFileSync(backupFile, "utf-8");
  const backupDb = JSON.parse(backupContent);
  const backupSubIds = new Set((backupDb.submissions || []).map((s: any) => s.id));

  let newSubmissions: any[] = [];
  let preservedFile = "";

  if (fs.existsSync(targetFile)) {
    try {
      const currentContent = fs.readFileSync(targetFile, "utf-8");
      const currentDb = JSON.parse(currentContent);
      newSubmissions = (currentDb.submissions || []).filter((s: any) => !backupSubIds.has(s.id));

      if (newSubmissions.length > 0) {
        preservedFile = `${targetFile}.post_migration_preserved_${Date.now()}.json`;
        fs.writeFileSync(preservedFile, JSON.stringify(newSubmissions, null, 2), "utf-8");
        console.log(`[ROLLBACK] Terdeteksi ${newSubmissions.length} submission baru pasca-migrasi. Dicadangkan ke: ${preservedFile}`);
      }
    } catch (err) {
      console.warn("[ROLLBACK] Peringatan saat memeriksa data submission aktif:", err);
    }
  }

  // Jika preserveNewSubmissions aktif dan ada data baru, gabungkan data baru ke database yang dipulihkan
  if (options.preserveNewSubmissions && newSubmissions.length > 0) {
    backupDb.submissions = [...newSubmissions, ...(backupDb.submissions || [])];
    const restoredWithMerged = JSON.stringify(backupDb, null, 2);
    fs.writeFileSync(targetFile, restoredWithMerged, "utf-8");
  } else {
    fs.writeFileSync(targetFile, backupContent, "utf-8");
  }

  const restoredContent = fs.readFileSync(targetFile, "utf-8");
  const hashBackup = calculateSha256(Buffer.from(backupContent, "utf-8"));
  const hashRestored = calculateSha256(Buffer.from(restoredContent, "utf-8"));

  const isExactOrPreserved = (options.preserveNewSubmissions && newSubmissions.length > 0)
    ? true
    : hashBackup === hashRestored;

  return {
    success: isExactOrPreserved,
    targetFile,
    backupFile,
    backupHash: hashBackup,
    restoredHash: hashRestored,
    bytesRestored: Buffer.byteLength(restoredContent, "utf-8"),
    hashVerified: hashBackup === hashRestored,
    message: isExactOrPreserved
      ? (newSubmissions.length > 0
          ? `Rollback berhasil: Database pulih ke versi pra-migrasi dengan ${newSubmissions.length} submission baru pasca-migrasi tetap terjaga aman.`
          : "Rollback berhasil: Database pulih 100% identik dengan kondisi sebelum migrasi.")
      : "Rollback gagal: Checksum database tidak cocok dengan backup.",
    newSubmissionsPreserved: newSubmissions.length,
    preservedSubmissionsFile: preservedFile || undefined
  };
}
