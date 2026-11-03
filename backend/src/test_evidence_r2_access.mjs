// =============================================================================
// Test Suite: Cloudflare R2 Evidence Secure Access & Multi-Tenant Authorization
// EmployaSkills Hotfix Verification
// =============================================================================

process.env.DISABLE_SERVER_LISTEN = 'true';
import assert from 'assert';
import { normalizeStorageKey, verifyEvidenceAccess } from '../dist/server.js';

console.log('--- STARTING EVIDENCE ACCESS & R2 SECURITY TESTS ---');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -------------------------------------------------------------
// Skenario 1: Normalisasi URL & Proteksi Double-Encoding (%2F)
// -------------------------------------------------------------
runTest('1.1 Normalisasi raw key berawalan /api/evidence/r2/', () => {
  const raw = '/api/evidence/r2/schools%2Fschool-general%2Fstudents%2F1001%2Fexams%2Fe1%2Fq_1%2Ffoto.jpg';
  const normalized = normalizeStorageKey(raw);
  assert.strictEqual(normalized, 'schools/school-general/students/1001/exams/e1/q_1/foto.jpg');
});

runTest('1.2 Normalisasi raw key dengan double URL encoding (%252F)', () => {
  const raw = 'schools%252Fsmkn1cimahi%252Fstudents%252F1001%252Ffoto.jpg';
  const normalized = normalizeStorageKey(raw);
  assert.strictEqual(normalized, 'schools/smkn1cimahi/students/1001/foto.jpg');
});

runTest('1.3 Normalisasi pembuangan query parameters (?fileToken=...)', () => {
  const raw = '/api/evidence/r2/schools/smkn1cimahi/students/1001/foto.jpg?fileToken=abc123xyz';
  const normalized = normalizeStorageKey(raw);
  assert.strictEqual(normalized, 'schools/smkn1cimahi/students/1001/foto.jpg');
});

// -------------------------------------------------------------
// Mock Database State untuk Pengujian Multi-Tenancy & Authorization
// -------------------------------------------------------------
const mockDb = {
  users: [
    { id: 'user-siswa-1', nis: '1001', username: '1001', role: 'siswa', schoolId: 'smkn1cimahi', name: 'Budi Santoso' },
    { id: 'user-siswa-2', nis: '1002', username: '1002', role: 'siswa', schoolId: 'smkn1cimahi', name: 'Siti Aminah' },
    { id: 'user-siswa-3', nis: '2001', username: '2001', role: 'siswa', schoolId: 'smkn2bandung', name: 'Asep Saepul' },
    { id: 'user-guru-1', role: 'guru', schoolId: 'smkn1cimahi', name: 'Pak Guru Cimahi' },
    { id: 'user-guru-2', role: 'guru', schoolId: 'smkn2bandung', name: 'Bu Guru Bandung' },
    { id: 'user-admin', role: 'admin', schoolId: 'general', name: 'Super Admin' }
  ],
  evidenceMetadata: [
    {
      id: 'ev-1',
      storageKey: 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg',
      studentNis: '1001',
      schoolId: 'smkn1cimahi',
      fileName: 'Tulisan_Budi.jpg'
    },
    {
      id: 'ev-orphan',
      // Bukti yang metadata schoolId-nya kosong / fallback school-general
      storageKey: 'schools/school-general/students/1001/exams/exam-1/q_2/1730000000_def_orphan.jpg',
      studentNis: '1001',
      schoolId: 'school-general',
      fileName: 'Orphan_Evidence.jpg'
    },
    {
      id: 'ev-2',
      storageKey: 'schools/smkn2bandung/students/2001/exams/exam-2/q_1/1730000000_ghi_tulisan.jpg',
      studentNis: '2001',
      schoolId: 'smkn2bandung',
      fileName: 'Tulisan_Asep.jpg'
    }
  ],
  exams: [
    { id: 'exam-1', schoolId: 'smkn1cimahi', title: 'Asesmen Kesiapan Kerja Cimahi' },
    { id: 'exam-2', schoolId: 'smkn2bandung', title: 'Asesmen Kesiapan Kerja Bandung' }
  ],
  submissions: []
};

// -------------------------------------------------------------
// Skenario 2: Otorisasi Siswa (Proteksi Lintas Siswa)
// -------------------------------------------------------------
runTest('2.1 Siswa pemilik diizinkan membaca fotonya sendiri', () => {
  const authSiswa1 = { id: 'user-siswa-1', role: 'siswa', nis: '1001', schoolId: 'smkn1cimahi' };
  const key = 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authSiswa1, mockDb);
  assert.strictEqual(result.allowed, true);
});

runTest('2.2 Siswa lain DITOLAK membaca foto siswa pemilik (HTTP 403 Forbidden)', () => {
  const authSiswa2 = { id: 'user-siswa-2', role: 'siswa', nis: '1002', schoolId: 'smkn1cimahi' };
  const key = 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authSiswa2, mockDb);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes('berkas siswa lain'));
});

// -------------------------------------------------------------
// Skenario 3: Otorisasi Guru Multi-Tenant & Penanganan Folder school-general
// -------------------------------------------------------------
runTest('3.1 Guru sekolah yang sama diizinkan mengakses berkas siswanya di folder spesifik sekolah', () => {
  const authGuruCimahi = { id: 'user-guru-1', role: 'guru', schoolId: 'smkn1cimahi' };
  const key = 'schools/smkn1cimahi/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authGuruCimahi, mockDb);
  assert.strictEqual(result.allowed, true);
});

runTest('3.2 Guru sekolah yang sama DIIZINKAN mengakses bukti siswanya di folder school-general', () => {
  const authGuruCimahi = { id: 'user-guru-1', role: 'guru', schoolId: 'smkn1cimahi' };
  // Key ada di folder school-general, tetapi siswa pemilik (1001) terdaftar di smkn1cimahi
  const key = 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authGuruCimahi, mockDb);
  assert.strictEqual(result.allowed, true);
});

runTest('3.3 Guru sekolah yang sama DIIZINKAN mengakses bukti jika metadata schoolId kosong/school-general via resolusi siswa di db.users', () => {
  const authGuruCimahi = { id: 'user-guru-1', role: 'guru', schoolId: 'smkn1cimahi' };
  const key = 'schools/school-general/students/1001/exams/exam-1/q_2/1730000000_def_orphan.jpg';
  const result = verifyEvidenceAccess(key, authGuruCimahi, mockDb);
  assert.strictEqual(result.allowed, true);
});

runTest('3.4 Guru lintas sekolah DITOLAK mengakses berkas sekolah lain (HTTP 403 Forbidden)', () => {
  const authGuruBandung = { id: 'user-guru-2', role: 'guru', schoolId: 'smkn2bandung' };
  // Guru Bandung mencoba mengakses bukti siswa Cimahi (1001)
  const key = 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authGuruBandung, mockDb);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes('sekolah lain'));
});

runTest('3.5 Guru lintas sekolah DITOLAK mengakses berkas pada folder sekolah spesifik lain', () => {
  const authGuruCimahi = { id: 'user-guru-1', role: 'guru', schoolId: 'smkn1cimahi' };
  // Guru Cimahi mencoba mengakses berkas siswa Bandung di folder schools/smkn2bandung
  const key = 'schools/smkn2bandung/students/2001/exams/exam-2/q_1/1730000000_ghi_tulisan.jpg';
  const result = verifyEvidenceAccess(key, authGuruCimahi, mockDb);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes('sekolah lain'));
});

// -------------------------------------------------------------
// Skenario 4: Hak Supervisi Administrator Sistem
// -------------------------------------------------------------
runTest('4.1 Administrator platform berhak mengakses seluruh bukti untuk keperluan supervisi', () => {
  const authAdmin = { id: 'user-admin', role: 'admin', schoolId: 'general' };
  const key1 = 'schools/school-general/students/1001/exams/exam-1/q_1/1730000000_abc_tulisan.jpg';
  const key2 = 'schools/smkn2bandung/students/2001/exams/exam-2/q_1/1730000000_ghi_tulisan.jpg';
  assert.strictEqual(verifyEvidenceAccess(key1, authAdmin, mockDb).allowed, true);
  assert.strictEqual(verifyEvidenceAccess(key2, authAdmin, mockDb).allowed, true);
});

console.log(`\n========================================`);
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`========================================\n`);

process.exit(0);
