// =============================================================================
// Automated Verification Suite: Employability 18-Item 9-Aspect Hotfix Audit
// EmployaSkills - Branch: migration/supabase-staging
// =============================================================================
process.env.DISABLE_SERVER_LISTEN = 'true';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIST_PATH = path.resolve(__dirname, '../dist/server.js');

const serverModule = await import(`file://${SERVER_DIST_PATH}`);
const {
  calculateEmployabilityScore,
  evaluateSubmissionServerSide,
  verifySubmissionTeacherAccess,
  NON_TEST_QUESTIONS_18,
  EMPLOYABILITY_ASPECTS
} = serverModule;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 18 Answers chosen to produce:
// Komunikasi (EMP-01=B:5, EMP-02=A:5) -> 10 (100%)
// Kerjasama (EMP-03=C:1, EMP-04=C:2) -> 3 (30%)
// Pemecahan Masalah (EMP-05=A:3, EMP-06=C:3) -> 6 (60%)
// Inisiatif (EMP-07=C:5, EMP-08=B:4) -> 9 (90%)
// Perencanaan (EMP-09=B:5, EMP-10=B:2) -> 7 (70%)
// Manajemen Diri (EMP-11=A:5, EMP-12=A:4) -> 9 (90%)
// Belajar (EMP-13=C:4, EMP-14=C:2) -> 6 (60%)
// Teknologi (EMP-15=C:5, EMP-16=B:2) -> 7 (70%)
// K3 (EMP-17=C:2, EMP-18=A:2) -> 4 (40%)
const TARGET_ANSWERS = {
  'nt-1': { questionId: 'nt-1', selectedOption: 'B' },
  'nt-2': { questionId: 'nt-2', selectedOption: 'A' },
  'nt-3': { questionId: 'nt-3', selectedOption: 'C' },
  'nt-4': { questionId: 'nt-4', selectedOption: 'C' },
  'nt-5': { questionId: 'nt-5', selectedOption: 'A' },
  'nt-6': { questionId: 'nt-6', selectedOption: 'C' },
  'nt-7': { questionId: 'nt-7', selectedOption: 'C' },
  'nt-8': { questionId: 'nt-8', selectedOption: 'B' },
  'nt-9': { questionId: 'nt-9', selectedOption: 'B' },
  'nt-10': { questionId: 'nt-10', selectedOption: 'B' },
  'nt-11': { questionId: 'nt-11', selectedOption: 'A' },
  'nt-12': { questionId: 'nt-12', selectedOption: 'A' },
  'nt-13': { questionId: 'nt-13', selectedOption: 'C' },
  'nt-14': { questionId: 'nt-14', selectedOption: 'C' },
  'nt-15': { questionId: 'nt-15', selectedOption: 'C' },
  'nt-16': { questionId: 'nt-16', selectedOption: 'B' },
  'nt-17': { questionId: 'nt-17', selectedOption: 'C' },
  'nt-18': { questionId: 'nt-18', selectedOption: 'A' }
};

const EXPECTED_RAW_SCORES = [10, 3, 6, 9, 7, 9, 6, 7, 4];
const EXPECTED_PERCENTAGES = [100, 30, 60, 90, 70, 90, 60, 70, 40];
const ASPECT_KEYS = [
  'komunikasi',
  'kerjasama',
  'pemecahan_masalah',
  'inisiatif_kewirausahaan',
  'perencanaan_pengorganisasian',
  'manajemen_diri',
  'belajar',
  'teknologi',
  'k3'
];

console.log('======================================================================');
console.log('TEST SUITE: EMPLOYABILITY 18-ITEM 9-ASPECT HOTFIX AUDIT');
console.log('======================================================================\n');

// -------------------------------------------------------------------------
// TEST GROUP 1: Unit Test calculateEmployabilityScore Algorithm
// -------------------------------------------------------------------------
console.log('--- TEST GROUP 1: calculateEmployabilityScore Algorithm ---');
const scoreResult = calculateEmployabilityScore(TARGET_ANSWERS, NON_TEST_QUESTIONS_18);

assert(scoreResult.totalRawScore === 61, `Total Raw Score is 61/90 (Actual: ${scoreResult.totalRawScore})`);
assert(scoreResult.finalPercentage === 68, `Final Percentage is 68% (Actual: ${scoreResult.finalPercentage}%)`);
assert(scoreResult.category === 'Tinggi', `Category is 'Tinggi' (Actual: ${scoreResult.category})`);

scoreResult.aspectResults.forEach((ar, idx) => {
  const expectedRaw = EXPECTED_RAW_SCORES[idx];
  const expectedPct = EXPECTED_PERCENTAGES[idx];
  assert(
    ar.rawScore === expectedRaw && ar.percentage === expectedPct,
    `Aspek ${idx + 1} (${ar.aspectName}): raw=${ar.rawScore}/10 (target: ${expectedRaw}), pct=${ar.percentage}% (target: ${expectedPct}%)`
  );
});

// -------------------------------------------------------------------------
// TEST GROUP 2: Server-Side evaluateSubmissionServerSide Normalization
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: evaluateSubmissionServerSide Normalization ---');
const mockSub = {
  id: 'sub-test-emp-01',
  examId: 'ex-emp-test',
  packageId: 'pkg-employability-18',
  examTitle: 'Instrumen Non-Tes Employability Skills Siswa SMK Kimia',
  answers: TARGET_ANSWERS,
  studentId: 'usr-student-01',
  studentName: 'Siswa Uji Employability'
};

evaluateSubmissionServerSide(mockSub, NON_TEST_QUESTIONS_18);

assert(mockSub.employabilityScore === 68, `Submission employabilityScore set to 68% (Actual: ${mockSub.employabilityScore})`);
assert(mockSub.totalScore === 68, `Submission totalScore set to 68% (Actual: ${mockSub.totalScore})`);
assert(mockSub.technicalScore === 0, `Submission technicalScore is 0 for employability`);
assert(mockSub.dimensionScores && Object.keys(mockSub.dimensionScores).length === 9, 'All 9 dimensions present in dimensionScores');

ASPECT_KEYS.forEach((key, idx) => {
  const dim = mockSub.dimensionScores[key];
  const expectedRaw = EXPECTED_RAW_SCORES[idx];
  const expectedPct = EXPECTED_PERCENTAGES[idx];
  assert(
    dim && dim.raw === expectedRaw && dim.percentage === expectedPct,
    `Server Dimension ${key}: raw=${dim?.raw} (target: ${expectedRaw}), pct=${dim?.percentage}% (target: ${expectedPct}%)`
  );
});

// -------------------------------------------------------------------------
// TEST GROUP 3: Konsistensi Laporan Guru & Siswa untuk Submission yang Sama
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Konsistensi Nilai pada Laporan Guru vs Siswa ---');

// Simulasi logika WorkReadinessProfile pada Siswa (dengan answers & dimensionScores)
const studentViewDims = mockSub.dimensionScores;
const studentRadarData = EMPLOYABILITY_ASPECTS.map(asp => {
  const dim = studentViewDims[asp.id];
  return {
    aspect: asp.id,
    fullName: asp.name,
    Student: dim.percentage,
    rawScore: `${dim.raw}/10`,
    isCalculated: true
  };
});

// Simulasi logika WorkReadinessProfile pada Guru (di mana answers di-strip oleh bootstrap,
// namun dimensionScores otoritatif telah disimpan dan dikirimkan oleh server)
const teacherViewSub = {
  id: mockSub.id,
  examId: mockSub.examId,
  studentId: mockSub.studentId,
  totalScore: 68,
  employabilityScore: 68,
  technicalScore: 0,
  answers: undefined, // di-strip oleh bootstrap
  dimensionScores: mockSub.dimensionScores // otoritatif dari server
};

const authoritativeTeacherDims = (teacherViewSub.dimensionScores && Object.keys(teacherViewSub.dimensionScores).length >= 9)
  ? teacherViewSub.dimensionScores
  : null;

const teacherRadarData = EMPLOYABILITY_ASPECTS.map(asp => {
  let scoreVal = 0;
  let rawVal = 'Belum dapat dihitung';
  let isCalculated = false;

  if (authoritativeTeacherDims && authoritativeTeacherDims[asp.id]) {
    const dim = authoritativeTeacherDims[asp.id];
    scoreVal = dim.percentage;
    rawVal = `${dim.raw}/10`;
    isCalculated = true;
  }

  return {
    aspect: asp.id,
    fullName: asp.name,
    Student: scoreVal,
    rawScore: rawVal,
    isCalculated
  };
});

let radarIdentical = true;
let hasAnyFlatFallback = false;

EMPLOYABILITY_ASPECTS.forEach((asp, idx) => {
  const sItem = studentRadarData[idx];
  const tItem = teacherRadarData[idx];
  const expRaw = EXPECTED_RAW_SCORES[idx];
  const expPct = EXPECTED_PERCENTAGES[idx];

  if (tItem.Student === 68 && expPct !== 68) {
    hasAnyFlatFallback = true;
  }

  if (sItem.Student !== tItem.Student || sItem.rawScore !== tItem.rawScore) {
    radarIdentical = false;
  }

  assert(
    tItem.Student === expPct && tItem.rawScore === `${expRaw}/10`,
    `Guru Dashboard Aspek ${asp.name}: Skor ${tItem.Student}% (${tItem.rawScore}) persis sama dengan Siswa (${sItem.Student}%)`
  );
});

assert(radarIdentical, 'Laporan Guru dan Siswa 100% IDENTIK di seluruh 9 aspek.');
assert(!hasAnyFlatFallback, 'TIDAK ADA fallback flat studentEmpScore (68%) pada aspek-aspek individual di tampilan Guru.');

// -------------------------------------------------------------------------
// TEST GROUP 4: Otorisasi & Pencegahan Akses Lintas Sekolah (Multi-Tenant)
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Isolasi Hak Akses Guru Lintas Sekolah (Cross-Tenant) ---');

const mockDb = {
  schools: [
    { id: 'sch-alpha', name: 'SMK Negeri 1 Alpha' },
    { id: 'sch-beta', name: 'SMK Negeri 2 Beta' }
  ],
  classes: [
    { id: 'cls-alpha-1', name: 'XII-KA-1', schoolId: 'sch-alpha', schoolName: 'SMK Negeri 1 Alpha', teacherId: 'usr-teacher-alpha' },
    { id: 'cls-beta-1', name: 'XII-KB-1', schoolId: 'sch-beta', schoolName: 'SMK Negeri 2 Beta', teacherId: 'usr-teacher-beta' }
  ],
  users: [
    { id: 'usr-student-alpha', schoolId: 'sch-alpha', schoolName: 'SMK Negeri 1 Alpha', classId: 'cls-alpha-1', className: 'XII-KA-1' }
  ]
};

const subAlpha = {
  id: 'sub-emp-alpha-01',
  examId: 'exam-01',
  studentId: 'usr-student-alpha',
  studentName: 'Siswa Alpha',
  schoolId: 'sch-alpha',
  schoolName: 'SMK Negeri 1 Alpha',
  classId: 'cls-alpha-1',
  className: 'XII-KA-1'
};

const teacherAlpha = {
  userId: 'usr-teacher-alpha',
  role: 'guru',
  schoolId: 'sch-alpha',
  schoolName: 'SMK Negeri 1 Alpha',
  assignedClassIds: ['cls-alpha-1']
};

const teacherBeta = {
  userId: 'usr-teacher-beta',
  role: 'guru',
  schoolId: 'sch-beta',
  schoolName: 'SMK Negeri 2 Beta',
  assignedClassIds: ['cls-beta-1']
};

const authSameSchool = verifySubmissionTeacherAccess(subAlpha, teacherAlpha, mockDb);
assert(authSameSchool.authorized === true, 'Guru Alpha (sekolah sama) DIIZINKAN mengakses detail submission');

const authDiffSchool = verifySubmissionTeacherAccess(subAlpha, teacherBeta, mockDb);
assert(authDiffSchool.authorized === false, 'Guru Beta (sekolah berbeda) DITOLAK mengakses submission Siswa Alpha (Cross-tenant denial)');

console.log('\n======================================================================');
console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}
