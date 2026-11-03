/**
 * Run and Generate Historical Reconciliation & Quarantine Map
 * File: backend/src/run_reconciliation_audit.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findDatabase() {
  const candidates = [
    path.join(__dirname, '..', 'backend', 'data', 'database.json'),
    path.join(__dirname, '..', 'data', 'database.json'),
    path.resolve('backend', 'data', 'database.json'),
    path.resolve('backend', 'backend', 'data', 'database.json'),
    path.resolve('data', 'database.json')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('database.json tidak ditemukan!');
}

function buildHistoricalReconciliation(db) {
  const submissions = Array.isArray(db.submissions) ? db.submissions : [];
  const exams = Array.isArray(db.exams) ? db.exams : [];
  const packages = Array.isArray(db.packages) ? db.packages : [];
  const schools = Array.isArray(db.schools) ? db.schools : [];
  const classes = Array.isArray(db.classes) ? db.classes : [];

  const activeSchoolIds = new Set(schools.map(s => s.id));
  const activeClassIds = new Set(classes.map(c => c.id));
  const activePackageIds = new Set(packages.filter(p => p.id).map(p => p.id));

  // 1. REKONSILIASI 51 SUBMISSION TANPA SCHOOL_ID
  const unassignedSubmissions = [];
  const quarantinedSubmissions = [];

  for (const sub of submissions) {
    if (!sub.schoolId) {
      if (sub.id === 'sub-res-mixed-1793568189017') {
        quarantinedSubmissions.push({
          submissionId: sub.id,
          examId: sub.examId,
          studentName: sub.studentName || '(Pengujian Anonim Rubrik)',
          studentNis: sub.studentNis || '(Tanpa NIS)',
          schoolNameRecorded: sub.schoolName,
          classNameRecorded: sub.className,
          reconciliationStatus: 'QUARANTINE_RUBRIC_TEST_ARTIFACT',
          maxRawScore: 6.00, // Dihitung eksak dari total maxScore butir jawaban (q-k3-01: 1 pt + q-k3-09: 5 pt = 6 pt)
          auditNotes: 'Submission artefak pengujian rubrik manual guru tanpa pembungkus ujian. Komponen riil: q-k3-01 (1/1) dan q-k3-09 (4/5). Nilai konversi guru 85 dipertahankan dalam karantina.'
        });
      } else {
        let suggestedCode = 'UNASSIGNED';
        if (sub.schoolName === 'SMK Negeri 1 Cimahi') suggestedCode = 'SMKN1-CMA';
        else if (sub.schoolName === 'SMK Mitra Industri') suggestedCode = 'SMK-MITRA';
        else if (sub.schoolName === 'SMK Negeri 1 Surabaya') suggestedCode = 'SMKN1-SBY';

        unassignedSubmissions.push({
          submissionId: sub.id,
          examId: sub.examId,
          studentName: sub.studentName,
          studentNis: sub.studentNis,
          schoolNameRecorded: sub.schoolName || 'Tidak Tercatat',
          classNameRecorded: sub.className || 'Tidak Tercatat',
          reconciliationStatus: 'PENDING_ADMIN_SCHOOL_MAPPING',
          suggestedSchoolCode: suggestedCode,
          maxRawScore: sub.maxRawScore,
          auditNotes: `Submission memiliki schoolName='${sub.schoolName}', namun schoolId kosong. Ditempatkan di status penugasan sekolah terbuka (school_id NULL) dengan nama sekolah denormalisasi terlindungi.`
        });
      }
    }
  }

  // 2. REKONSILIASI 28 UJIAN DENGAN REFERENSI HISTORIS
  const historicalExams = [];
  for (const ex of exams) {
    const hasOrphanSchool = ex.schoolId && !activeSchoolIds.has(ex.schoolId);
    const hasOrphanClass = ex.classId && !activeClassIds.has(ex.classId);
    const hasOrphanPkg = ex.packageId && !activePackageIds.has(ex.packageId);

    if (hasOrphanSchool || hasOrphanClass || hasOrphanPkg) {
      historicalExams.push({
        examId: ex.id,
        examTitle: ex.title,
        legacySchoolId: ex.schoolId,
        schoolNameRecorded: ex.schoolName || 'Tidak Tercatat',
        legacyClassId: ex.classId,
        classNameRecorded: ex.className || 'Tidak Tercatat',
        packageId: ex.packageId,
        reconciliationStatus: 'HISTORICAL_REFERENCE_PRESERVED',
        auditNotes: `Ujian merujuk pada referensi historis (sekolah: ${ex.schoolId || 'none'}, kelas: ${ex.classId || 'none'}). Pada PostgreSQL, school_id disetel NULL untuk integritas FK sementara nama institusi dan question_snapshot tetap utuh.`
      });
    }
  }

  // 3. REKONSILIASI PAKET E2E DUPLIKAT & TANPA ID
  const quarantinedPackages = [];
  let e2eIndex = 1;

  packages.forEach((pkg, idx) => {
    // Paket tanpa ID & tanpa kode
    if (!pkg.id || !pkg.code) {
      quarantinedPackages.push({
        originalId: pkg.id,
        canonicalId: `pkg-quarantine-e2e-modified`,
        originalCode: pkg.code,
        canonicalCode: `PKG-QUARANTINE-01`,
        title: pkg.title || 'Paket Tanpa Identitas (Draft Modifikasi)',
        isActive: false, // Dinonaktifkan agar tidak muncul di live dropdown guru
        quarantineStatus: 'QUARANTINE_UNIDENTIFIED_TEST_DRAFT',
        auditNotes: `Paket urutan index ${idx} tidak memiliki id dan code. Diberi ID deterministik karantina 'pkg-quarantine-e2e-modified' dengan status non-aktif.`
      });
    } else if (pkg.code === 'PKG-E2E-05') {
      quarantinedPackages.push({
        originalId: pkg.id,
        canonicalId: pkg.id,
        originalCode: pkg.code,
        canonicalCode: `PKG-E2E-05-v${e2eIndex}`,
        title: pkg.title,
        isActive: false, // Diberi status non-aktif agar tidak dobel pada live scheduling
        quarantineStatus: 'TEST_ARTIFACT_VERSIONED',
        auditNotes: `Paket pengujian E2E duplikat kode PKG-E2E-05. Diberikan tag versi audit PKG-E2E-05-v${e2eIndex} dan disetel is_active=false untuk menjaga kebersihan bank soal.`
      });
      e2eIndex++;
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    totalSubmissionsAudited: submissions.length,
    unassignedSubmissionsCount: unassignedSubmissions.length,
    unassignedSubmissions,
    historicalExamsCount: historicalExams.length,
    historicalExams,
    quarantinedPackagesCount: quarantinedPackages.length,
    quarantinedPackages,
    quarantinedSubmissionsCount: quarantinedSubmissions.length,
    quarantinedSubmissions
  };
}

function main() {
  console.log('='.repeat(80));
  console.log('  EMPLOYASKILLS - GENERASI AUDIT REKONSILIASI HISTORIS & KARANTINA');
  console.log('='.repeat(80));

  const dbPath = findDatabase();
  console.log(`[INFO] Sumber Data: ${dbPath}`);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const report = buildHistoricalReconciliation(db);

  const targetDir = path.dirname(dbPath);
  const outputPath = path.join(targetDir, 'historical_reconciliation_map.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[SUKSES] Laporan rekonsiliasi tersimpan di: ${outputPath}\n`);
  console.log('--- REKAPITULASI STATUS AUDIT & REKONSILIASI ---');
  console.log(`1. Submissions Menunggu Pemetaan Sekolah : ${report.unassignedSubmissionsCount} berkas`);
  console.log(`2. Riwayat Ujian Preservasi Historis     : ${report.historicalExamsCount} sesi`);
  console.log(`3. Paket Karantina (E2E & Draft)         : ${report.quarantinedPackagesCount} paket`);
  console.log(`4. Submissions Karantina (Rubrik Uji)    : ${report.quarantinedSubmissionsCount} berkas`);

  console.log('\n--- RINCIAN PENANGANAN 51 SUBMISSION TANPA SCHOOL_ID ---');
  const bySchoolName = {};
  for (const sub of report.unassignedSubmissions) {
    const sc = sub.schoolNameRecorded || 'Tidak Tercatat';
    bySchoolName[sc] = (bySchoolName[sc] || 0) + 1;
  }
  for (const [sc, cnt] of Object.entries(bySchoolName)) {
    console.log(`  - Institusi '${sc}': ${cnt} submission (school_id: NULL, school_name: Preserved)`);
  }

  console.log('\n--- RINCIAN PAKET TERKARANTINA ---');
  for (const qp of report.quarantinedPackages) {
    console.log(`  - [${qp.quarantineStatus}] Canonical ID: ${qp.canonicalId} | Code: ${qp.canonicalCode} | is_active: ${qp.isActive}`);
  }

  console.log('\n--- RINCIAN SUBMISSION TERKARANTINA ---');
  for (const qs of report.quarantinedSubmissions) {
    console.log(`  - ID: ${qs.submissionId} | maxRawScore: ${qs.maxRawScore} | Status: ${qs.reconciliationStatus}`);
    console.log(`    Catatan: ${qs.auditNotes}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('  REKONSILIASI HISTORIS SELESAI: ZERO SYNTHETIC DATA CREATED');
  console.log('='.repeat(80) + '\n');
}

main();
