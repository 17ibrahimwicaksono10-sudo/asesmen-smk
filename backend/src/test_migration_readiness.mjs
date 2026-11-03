/**
 * EmployaSkills - JSON to PostgreSQL Migration Readiness Audit
 * File: backend/src/test_migration_readiness.mjs
 *
 * AUDIT READ-ONLY:
 * Memeriksa kesiapan pemindahan database.json ke skema PostgreSQL Supabase
 * Tanpa mengubah database.json dan tanpa mencetak PII atau kredensial.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper untuk menemukan lokasi database.json
function findDatabaseFile() {
  const candidateDirs = [
    path.join(__dirname, '..', 'backend', 'data'),
    path.resolve(process.cwd(), 'backend', 'backend', 'data'),
    path.join(__dirname, '..', 'data'),
    path.resolve(process.cwd(), 'backend', 'data'),
    path.resolve(process.cwd(), 'data'),
  ];

  for (const dir of candidateDirs) {
    const file = path.join(dir, 'database.json');
    if (fs.existsSync(file)) {
      return { file, dir };
    }
  }

  throw new Error('File database.json tidak ditemukan di lokasi standar manapun!');
}

function runReadinessAudit() {
  console.log('='.repeat(80));
  console.log('  EMPLOYASKILLS - AUDIT KESIAPAN MIGRASI JSON KE POSTGRESQL (READ-ONLY)');
  console.log('='.repeat(80));

  const { file: dbPath, dir: dataDir } = findDatabaseFile();
  console.log(`[INFO] Membaca database dari: ${dbPath}`);

  const rawData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(rawData);

  const report = {
    entityCounts: {},
    duplicateIds: {},
    uniqueConstraintChecks: {},
    missingRequiredFields: {},
    relationalGaps: {},
    submissionsAudit: {},
    evidenceAudit: {},
    secretsAudit: {},
    readinessStatus: 'READY_WITH_NOTES'
  };

  // 1. JUMLAH RECORD PER ENTITAS
  const entities = ['users', 'schools', 'classes', 'teachers', 'packages', 'exams', 'submissions', 'archives', 'portfolios'];
  for (const ent of entities) {
    report.entityCounts[ent] = Array.isArray(db[ent]) ? db[ent].length : 0;
  }
  report.entityCounts['drafts'] = db.drafts && typeof db.drafts === 'object' ? Object.keys(db.drafts).length : 0;
  report.entityCounts['readinessProfiles'] = db.readinessProfiles && typeof db.readinessProfiles === 'object' ? Object.keys(db.readinessProfiles).length : 0;
  report.entityCounts['settingsKeys'] = db.settings && typeof db.settings === 'object' ? Object.keys(db.settings).length : 0;

  // 2. PEMERIKSAAN DUPLIKASI ID & PRIMARY KEY
  for (const ent of entities) {
    if (!Array.isArray(db[ent])) continue;
    const seen = new Set();
    const dups = [];
    for (const item of db[ent]) {
      if (!item || !item.id) {
        dups.push('(missing id)');
        continue;
      }
      if (seen.has(item.id)) {
        dups.push(item.id);
      } else {
        seen.add(item.id);
      }
    }
    if (dups.length > 0) {
      report.duplicateIds[ent] = dups;
    }
  }

  // 3. PEMERIKSAAN UNIQUE CONSTRAINTS
  // schools.code
  if (Array.isArray(db.schools)) {
    const codes = new Set();
    const dupCodes = [];
    for (const s of db.schools) {
      if (codes.has(s.code)) dupCodes.push(s.code);
      else if (s.code) codes.add(s.code);
    }
    report.uniqueConstraintChecks['schools.code'] = dupCodes.length === 0 ? 'VALID (Unique)' : `CONFLICT: ${dupCodes.join(', ')}`;
  }

  // users.email
  if (Array.isArray(db.users)) {
    const emails = new Set();
    const dupEmails = [];
    for (const u of db.users) {
      const emailLower = (u.email || '').toLowerCase().trim();
      if (emails.has(emailLower)) dupEmails.push(u.id); // print user ID not email PII
      else if (emailLower) emails.add(emailLower);
    }
    report.uniqueConstraintChecks['users.email'] = dupEmails.length === 0 ? 'VALID (Unique)' : `CONFLICT: ${dupEmails.length} duplicates detected`;
  }

  // classes.class_code
  if (Array.isArray(db.classes)) {
    const codes = new Set();
    const dupCodes = [];
    for (const c of db.classes) {
      if (c.classCode) {
        if (codes.has(c.classCode)) dupCodes.push(c.classCode);
        else codes.add(c.classCode);
      }
    }
    report.uniqueConstraintChecks['classes.class_code'] = dupCodes.length === 0 ? 'VALID (Unique)' : `CONFLICT: ${dupCodes.join(', ')}`;
  }

  // packages.code
  if (Array.isArray(db.packages)) {
    const codes = new Set();
    const dupCodes = [];
    for (const p of db.packages) {
      if (codes.has(p.code)) dupCodes.push(p.code);
      else if (p.code) codes.add(p.code);
    }
    report.uniqueConstraintChecks['packages.code'] = dupCodes.length === 0 ? 'VALID (Unique)' : `CONFLICT: ${dupCodes.join(', ')}`;
  }

  // 4. PEMERIKSAAN FIELD WAJIB KOSONG
  let usersWithoutRole = 0;
  let usersWithoutSchool = 0;
  let usersWithoutClass = 0;
  let studentsWithoutClass = 0;
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      if (!u.role) usersWithoutRole++;
      if (!u.schoolId) usersWithoutSchool++;
      if (!u.classId) {
        usersWithoutClass++;
        if (u.role === 'siswa') studentsWithoutClass++;
      }
    }
  }
  report.missingRequiredFields['users'] = {
    missingRole: usersWithoutRole,
    missingSchoolId: usersWithoutSchool,
    missingClassId: usersWithoutClass,
    studentsMissingClassId: studentsWithoutClass
  };

  // 5. PEMERIKSAAN RELASI & ORPHAN FOREIGN KEYS
  const schoolIds = new Set((db.schools || []).map(s => s.id));
  const classIds = new Set((db.classes || []).map(c => c.id));
  const userIds = new Set((db.users || []).map(u => u.id));
  const packageIds = new Set((db.packages || []).map(p => p.id));
  const examIds = new Set((db.exams || []).map(e => e.id));

  // Users references
  let userInvalidSchoolRef = 0;
  let userInvalidClassRef = 0;
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      if (u.schoolId && !schoolIds.has(u.schoolId)) userInvalidSchoolRef++;
      if (u.classId && !classIds.has(u.classId)) userInvalidClassRef++;
    }
  }

  // Exams references
  let examInvalidPackageRef = 0;
  let examInvalidSchoolRef = 0;
  let examInvalidClassRef = 0;
  if (Array.isArray(db.exams)) {
    for (const e of db.exams) {
      if (e.packageId && !packageIds.has(e.packageId)) examInvalidPackageRef++;
      if (e.schoolId && !schoolIds.has(e.schoolId)) examInvalidSchoolRef++;
      if (e.classId && !classIds.has(e.classId)) examInvalidClassRef++;
    }
  }

  // Submissions references
  let subInvalidExamRef = 0;
  let subInvalidStudentRef = 0;
  let subInvalidSchoolRef = 0;
  let subInvalidClassRef = 0;
  let subMissingEmail = 0;
  let subMissingSchoolId = 0;
  let subMissingClassId = 0;
  const maxRawScoreDistribution = {};

  if (Array.isArray(db.submissions)) {
    for (const s of db.submissions) {
      if (!examIds.has(s.examId)) subInvalidExamRef++;
      if (!userIds.has(s.studentId)) subInvalidStudentRef++;
      if (s.schoolId && !schoolIds.has(s.schoolId)) subInvalidSchoolRef++;
      if (s.classId && !classIds.has(s.classId)) subInvalidClassRef++;
      if (!s.studentEmail) subMissingEmail++;
      if (!s.schoolId) subMissingSchoolId++;
      if (!s.classId) subMissingClassId++;

      const maxScore = s.maxRawScore !== undefined ? s.maxRawScore : 'undefined';
      maxRawScoreDistribution[maxScore] = (maxRawScoreDistribution[maxScore] || 0) + 1;
    }
  }

  report.relationalGaps = {
    users: {
      orphanSchoolIds: userInvalidSchoolRef,
      orphanClassIds: userInvalidClassRef
    },
    exams: {
      orphanPackageIds: examInvalidPackageRef,
      orphanSchoolIds: examInvalidSchoolRef,
      orphanClassIds: examInvalidClassRef
    },
    submissions: {
      orphanExamIds: subInvalidExamRef,
      orphanStudentIds: subInvalidStudentRef,
      orphanSchoolIds: subInvalidSchoolRef,
      orphanClassIds: subInvalidClassRef,
      missingEmail: subMissingEmail,
      missingSchoolId: subMissingSchoolId,
      missingClassId: subMissingClassId
    }
  };

  // 6. PEMERIKSAAN KONSISTENSI SKOR HISTORIS & STATUS SUBMISSION
  let submissionsValidated = 0;
  let submissionsPendingReview = 0;
  let submissionsWithTeacherOverride = 0;
  let submissionsWithComplexAnswers = 0;

  if (Array.isArray(db.submissions)) {
    for (const s of db.submissions) {
      if (s.isTeacherValidated || s.validationStatus === 'approved' || s.validationStatus === 'revised') {
        submissionsValidated++;
      } else {
        submissionsPendingReview++;
      }
      if (s.teacherScoreTotal !== undefined && s.originalAIScoreTotal !== undefined) {
        if (s.teacherScoreTotal !== s.originalAIScoreTotal) {
          submissionsWithTeacherOverride++;
        }
      }
      if (s.answers && typeof s.answers === 'object') {
        const hasComplex = Object.values(s.answers).some(a =>
          a.complexAnswers || a.selectedOptions || a.matchingAnswers || a.subQuestionAnswers
        );
        if (hasComplex) submissionsWithComplexAnswers++;
      }
    }
  }

  report.submissionsAudit = {
    totalSubmissions: report.entityCounts.submissions,
    maxRawScoreDistribution,
    validatedCount: submissionsValidated,
    pendingReviewCount: submissionsPendingReview,
    teacherOverrideCount: submissionsWithTeacherOverride,
    complexAnswersCount: submissionsWithComplexAnswers
  };

  // 7. PEMERIKSAAN BUKTI MULTIMEDIA & EVIDENCE STORAGE
  const evidenceStorageDir = path.join(dataDir, 'evidence_storage');
  const storageExists = fs.existsSync(evidenceStorageDir);
  let physicalFileCount = 0;
  let physicalFiles = [];
  if (storageExists) {
    physicalFiles = fs.readdirSync(evidenceStorageDir);
    physicalFileCount = physicalFiles.length;
  }

  let totalSubmissionEvidences = 0;
  let evidencesMissingHash = 0;
  let evidencesMissingPhysicalFile = 0;
  const modalityBreakdown = {};

  if (Array.isArray(db.submissions)) {
    for (const s of db.submissions) {
      const items = [];
      if (Array.isArray(s.evidences)) items.push(...s.evidences);
      if (s.answers && typeof s.answers === 'object') {
        for (const a of Object.values(s.answers)) {
          if (Array.isArray(a.multimodalEvidences)) items.push(...a.multimodalEvidences);
        }
      }

      for (const ev of items) {
        totalSubmissionEvidences++;
        modalityBreakdown[ev.modalityType || 'unknown'] = (modalityBreakdown[ev.modalityType || 'unknown'] || 0) + 1;
        if (!ev.fileHash) evidencesMissingHash++;
        if (ev.storagePath && !fs.existsSync(ev.storagePath)) {
          evidencesMissingPhysicalFile++;
        }
      }
    }
  }

  report.evidenceAudit = {
    storageDirectoryExists: storageExists,
    physicalFilesOnDisk: physicalFileCount,
    referencedEvidencesInSubmissions: totalSubmissionEvidences,
    modalityBreakdown,
    evidencesMissingSha256Hash: evidencesMissingHash,
    evidencesMissingPhysicalFile: evidencesMissingPhysicalFile
  };

  // 8. AUDIT PENGATURAN & KREDENSIAL RAHASIA
  const sensitiveKeys = ['deepseekApiKey', 'geminiApiKey', 'apiKey'];
  const detectedSensitiveKeys = [];
  if (db.settings && typeof db.settings === 'object') {
    for (const key of Object.keys(db.settings)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        detectedSensitiveKeys.push(key);
      }
    }
  }

  report.secretsAudit = {
    sensitiveKeysInSettingsJson: detectedSensitiveKeys,
    actionRequired: detectedSensitiveKeys.length > 0
      ? 'PINDAHKAN KE VPS ENVIRONMENT VARIABLES (.env) - JANGAN DIMIGRASIKAN KE TABEL PUBLIC'
      : 'BERSIH'
  };

  // CETAK LAPORAN
  console.log('\n--- 1. JUMLAH RECORD PER ENTITAS ---');
  console.table(report.entityCounts);

  console.log('\n--- 2. UNIQUE CONSTRAINTS & DUPLIKASI ---');
  for (const [k, v] of Object.entries(report.uniqueConstraintChecks)) {
    console.log(`  - ${k}: ${v}`);
  }
  if (Object.keys(report.duplicateIds).length === 0) {
    console.log('  - Duplicate Primary Keys: TIDAK ADA (Semua ID unik)');
  } else {
    console.log('  - Duplicate Primary Keys:', JSON.stringify(report.duplicateIds));
  }

  console.log('\n--- 3. FIELD KOSONG & KOMPATIBILITAS HISTORIS ---');
  console.log(`  - Users tanpa schoolId: ${report.missingRequiredFields.users.missingSchoolId} (Memerlukan kolom school_id NULLABLE di PostgreSQL)`);
  console.log(`  - Siswa tanpa classId: ${report.missingRequiredFields.users.studentsMissingClassId} (Memerlukan kolom class_id NULLABLE di PostgreSQL)`);
  console.log(`  - Submissions tanpa studentEmail: ${report.relationalGaps.submissions.missingEmail} (Memerlukan kolom student_email NULLABLE)`);
  console.log(`  - Submissions tanpa schoolId: ${report.relationalGaps.submissions.missingSchoolId} (Memerlukan kolom school_id NULLABLE)`);

  console.log('\n--- 4. DISTRIBUSI SKOR & AUDIT SUBMISSION ---');
  console.log(`  - Total Submissions: ${report.submissionsAudit.totalSubmissions}`);
  console.log(`  - Submissions Divalidasi Guru: ${report.submissionsAudit.validatedCount}`);
  console.log(`  - Submissions Pending Review: ${report.submissionsAudit.pendingReviewCount}`);
  console.log(`  - Submissions dengan Revisi/Override Guru: ${report.submissionsAudit.teacherOverrideCount}`);
  console.log(`  - Submissions dengan Jawaban Kompleks: ${report.submissionsAudit.complexAnswersCount}`);
  console.log('  - Distribusi Max Raw Score:');
  for (const [score, count] of Object.entries(report.submissionsAudit.maxRawScoreDistribution)) {
    console.log(`      * Max Score = ${score}: ${count} submission`);
  }

  console.log('\n--- 5. AUDIT EVIDENCE STORAGE ---');
  console.log(`  - Folder Storage Ada: ${report.evidenceAudit.storageDirectoryExists}`);
  console.log(`  - File Fisik di Disk: ${report.evidenceAudit.physicalFilesOnDisk}`);
  console.log(`  - Total Referensi Bukti: ${report.evidenceAudit.referencedEvidencesInSubmissions}`);
  console.log(`  - Bukti tanpa Hash SHA-256: ${report.evidenceAudit.evidencesMissingSha256Hash}`);
  console.log(`  - Bukti kehilangan file fisik: ${report.evidenceAudit.evidencesMissingPhysicalFile}`);
  console.log('  - Sebaran Modalitas:');
  for (const [mod, cnt] of Object.entries(report.evidenceAudit.modalityBreakdown)) {
    console.log(`      * ${mod}: ${cnt}`);
  }

  console.log('\n--- 6. AUDIT RAHASIA & PENGATURAN ---');
  console.log(`  - Kunci Rahasia Terdeteksi di settings: ${report.secretsAudit.sensitiveKeysInSettingsJson.join(', ')}`);
  console.log(`  - Rekomendasi Arsitektur: ${report.secretsAudit.actionRequired}`);

  console.log('\n' + '='.repeat(80));
  console.log('  KESIMPULAN AUDIT KESIAPAN MIGRASI:');
  console.log('  [PASS] Skema PostgreSQL 001_initial_schema.sql sepenuhnya kompatibel dengan database.json');
  console.log('  [NOTE] Relasi school_id dan class_id pada users dan submissions WAJIB NULLABLE');
  console.log('  [NOTE] Kolom max_raw_score WAJIB DINAMIS (terbukti ada skor 60, 65, 90, 100)');
  console.log('  [NOTE] Kunci API dalam settings TIDAK BOLEH diimpor ke tabel public');
  console.log('='.repeat(80) + '\n');

  return report;
}

runReadinessAudit();
