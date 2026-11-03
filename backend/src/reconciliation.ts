/**
 * EmployaSkills - Historical Data Reconciliation & Quarantine Manager
 * File: backend/src/reconciliation.ts
 *
 * Modul audit-ready untuk merekonsiliasi anomali historis pada database.json:
 * 1. 51 submission tanpa schoolId (pemetaan audit berbasis schoolName)
 * 2. 28 ujian dengan referensi sekolah/kelas historis (preservasi denormalisasi)
 * 3. 5 paket E2E duplikat kode PKG-E2E-05 (karantina & penonaktifan is_active=false)
 * 4. 1 paket tanpa ID/kode (karantina dengan ID deterministik tanpa mengubah JSON sumber)
 * 5. 1 submission tanpa maxRawScore (pencatatan audit rubrik & evaluasi komponen)
 *
 * ATURAN MUTLAK:
 * - Dilarang merekayasa/membuat data nilai akademik sintetis
 * - Dilarang menghapus riwayat akademik historis
 * - Semua keputusan pemetaan tercatat dalam audit trail transparan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SubmissionReconciliationItem {
  submissionId: string;
  examId?: string;
  studentName?: string;
  studentNis?: string;
  schoolNameRecorded?: string;
  classNameRecorded?: string;
  reconciliationStatus: 'PENDING_ADMIN_SCHOOL_MAPPING' | 'QUARANTINE_RUBRIC_TEST_ARTIFACT' | 'RECONCILED';
  suggestedSchoolCode?: string;
  maxRawScore?: number;
  auditNotes: string;
}

export interface ExamReconciliationItem {
  examId: string;
  examTitle: string;
  legacySchoolId?: string;
  schoolNameRecorded: string;
  legacyClassId?: string;
  classNameRecorded: string;
  packageId?: string;
  reconciliationStatus: 'HISTORICAL_REFERENCE_PRESERVED';
  auditNotes: string;
}

export interface PackageQuarantineItem {
  originalId?: string;
  canonicalId: string;
  originalCode?: string;
  canonicalCode: string;
  title: string;
  isActive: boolean;
  quarantineStatus: 'TEST_ARTIFACT_VERSIONED' | 'QUARANTINE_UNIDENTIFIED_TEST_DRAFT';
  auditNotes: string;
}

export interface HistoricalReconciliationReport {
  generatedAt: string;
  totalSubmissionsAudited: number;
  unassignedSubmissionsCount: number;
  unassignedSubmissions: SubmissionReconciliationItem[];
  historicalExamsCount: number;
  historicalExams: ExamReconciliationItem[];
  quarantinedPackagesCount: number;
  quarantinedPackages: PackageQuarantineItem[];
  quarantinedSubmissionsCount: number;
  quarantinedSubmissions: SubmissionReconciliationItem[];
}

export function buildHistoricalReconciliation(db: any): HistoricalReconciliationReport {
  const submissions: any[] = Array.isArray(db.submissions) ? db.submissions : [];
  const exams: any[] = Array.isArray(db.exams) ? db.exams : [];
  const packages: any[] = Array.isArray(db.packages) ? db.packages : [];
  const schools: any[] = Array.isArray(db.schools) ? db.schools : [];
  const classes: any[] = Array.isArray(db.classes) ? db.classes : [];

  const activeSchoolIds = new Set(schools.map(s => s.id));
  const activeClassIds = new Set(classes.map(c => c.id));
  const activePackageIds = new Set(packages.filter(p => p.id).map(p => p.id));

  // 1. REKONSILIASI 51 SUBMISSION TANPA SCHOOL_ID
  const unassignedSubmissions: SubmissionReconciliationItem[] = [];
  const quarantinedSubmissions: SubmissionReconciliationItem[] = [];

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
  const historicalExams: ExamReconciliationItem[] = [];
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
  const quarantinedPackages: PackageQuarantineItem[] = [];
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
