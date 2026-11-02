import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawn } from 'child_process';

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const SANITIZED_DB_PATH = path.resolve('backend', 'backend', 'data', 'test_sanitized_production_db.json');

// 1. Siapkan Database Uji Terpisah yang Disanitasi (Sesuai Bukti Database Produksi)
const SANITIZED_DATA = {
  schools: [
    { id: 'sch-1', name: 'SMK Negeri 1 Kimia Industri Bandung' },
    { id: 'sch-2', name: 'SMK Negeri 2 Kimia Surabaya' },
    { id: 'sch-3', name: 'SMK Negeri 1 Cirebon' }
  ],
  classes: [
    {
      id: 'cls-1',
      name: 'XII Kimia Analitik 1',
      teacherId: 'usr-guru-1',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      studentCount: 30
    },
    {
      id: 'cls-2',
      name: 'XII Proses Kimia 2',
      teacherId: 'usr-guru-1',
      schoolId: '', // Kosong di database produksi
      schoolName: '', // Kosong di database produksi
      studentCount: 28
    },
    {
      id: 'cls-surabaya-1',
      name: 'XII Kimia Industri Surabaya',
      teacherId: 'usr-guru-surabaya',
      schoolId: 'sch-2',
      schoolName: 'SMK Negeri 2 Kimia Surabaya',
      studentCount: 25
    }
  ],
  users: [
    {
      id: 'usr-guru-1',
      name: 'Drs. Budi Santoso, M.Pd.',
      email: 'guru.kimia@smk.sch.id',
      role: 'guru',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      identityNo: '198001012005011001',
      password: 'password123'
    },
    {
      id: 'usr-guru-surabaya',
      name: 'Dra. Endang Rahayu, M.Pd.',
      email: 'guru.surabaya@smk.sch.id',
      role: 'guru',
      schoolId: 'sch-2',
      schoolName: 'SMK Negeri 2 Kimia Surabaya',
      identityNo: '198104252005012001',
      password: 'password123'
    },
    {
      id: 'usr-admin',
      name: 'Administrator Pusat',
      email: 'admin@smk.sch.id',
      role: 'admin',
      password: 'admin123'
    },
    {
      id: 'usr-siswa-1',
      name: 'Ahmad Rizki',
      email: 'ahmad@siswa.smk.sch.id',
      identityNo: '1029384756',
      role: 'siswa',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-1',
      className: 'XII Kimia Analitik 1',
      password: 'siswa123'
    },
    {
      id: 'usr-siswa-2',
      name: 'Siti Nurhaliza',
      email: 'siti@siswa.smk.sch.id',
      identityNo: '1029384757',
      role: 'siswa',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-2',
      className: 'XII Proses Kimia 2',
      password: 'siswa123'
    },
    {
      id: 'usr-siswa-3',
      name: 'Budi Santoso Siswa',
      email: 'budi.siswa@siswa.smk.sch.id',
      identityNo: '1029384758',
      role: 'siswa',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-1',
      className: 'XII Kimia Analitik 1',
      password: 'siswa123'
    },
    {
      id: 'usr-siswa-sby',
      name: 'Dewi Lestari',
      email: 'dewi@sby.smk.sch.id',
      identityNo: '2029384759',
      role: 'siswa',
      schoolId: 'sch-2',
      schoolName: 'SMK Negeri 2 Kimia Surabaya',
      classId: 'cls-surabaya-1',
      className: 'XII Kimia Industri Surabaya',
      password: 'siswa123'
    }
  ],
  teachers: [
    {
      id: 'usr-guru-1',
      name: 'Drs. Budi Santoso, M.Pd.',
      email: 'guru.kimia@smk.sch.id',
      nip: '198001012005011001',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      password: 'password123'
    },
    {
      id: 'usr-guru-surabaya',
      name: 'Dra. Endang Rahayu, M.Pd.',
      email: 'guru.surabaya@smk.sch.id',
      nip: '198104252005012001',
      schoolId: 'sch-2',
      schoolName: 'SMK Negeri 2 Kimia Surabaya',
      password: 'password123'
    }
  ],
  packages: [
    {
      id: 'pkg-tech-01',
      title: 'Ujian Teknis Kimia Komprehensif',
      category: 'Teknis Kimia',
      totalQuestions: 2,
      durationMinutes: 60,
      passingScore: 75,
      questions: [
        {
          id: 'q-1',
          type: 'pilihan_ganda',
          question: 'Alat ukur volume presisi tinggi adalah?',
          options: ['Buret', 'Gelas Kimia', 'Erlenmeyer', 'Gelas Ukur'],
          correctAnswer: 'A',
          rubricGuide: 'Akurasi pembacaan meniskus',
          weight: 50
        },
        {
          id: 'q-2',
          type: 'esai',
          question: 'Jelaskan prosedur standardisasi larutan NaOH dengan asam oksalat.',
          rubricGuide: 'Menyebutkan indikator pp dan titik akhir merah muda pucat',
          weight: 50
        }
      ]
    }
  ],
  exams: [
    {
      id: 'ex-1',
      title: 'Ujian Analisis Kimia Dasar',
      packageId: 'pkg-tech-01',
      teacherId: 'usr-guru-1',
      teacherName: 'Drs. Budi Santoso, M.Pd.',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-1',
      className: 'XII Kimia Analitik 1',
      status: 'selesai',
      startTime: '2026-10-20T08:00:00Z',
      endTime: '2026-10-20T10:00:00Z'
    },
    {
      id: 'ex-2',
      title: 'Ujian K3LH dan Keselamatan Laboratorium',
      packageId: 'pkg-tech-01',
      teacherId: 'usr-guru-1',
      teacherName: 'Drs. Budi Santoso, M.Pd.',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-2',
      className: 'XII Proses Kimia 2',
      status: 'selesai',
      startTime: '2026-10-21T08:00:00Z',
      endTime: '2026-10-21T10:00:00Z'
    },
    {
      id: 'ex-3',
      title: 'Ujian Kejuruan Surabaya',
      packageId: 'pkg-tech-01',
      teacherId: 'usr-guru-surabaya',
      teacherName: 'Dra. Endang Rahayu, M.Pd.',
      schoolId: 'sch-2',
      schoolName: 'SMK Negeri 2 Kimia Surabaya',
      classId: 'cls-1793537600489',
      className: 'Kelas Khusus Surabaya',
      status: 'berjalan',
      startTime: '2026-10-22T08:00:00Z',
      endTime: '2026-10-22T10:00:00Z'
    }
  ],
  submissions: [
    // 1 submission dengan schoolId sch-1
    {
      id: 'sub-bandung-01',
      examId: 'ex-1',
      examTitle: 'Ujian Analisis Kimia Dasar',
      studentId: 'usr-siswa-1',
      studentName: 'Ahmad Rizki',
      studentNis: '1029384756',
      studentEmail: 'ahmad@siswa.smk.sch.id',
      schoolId: 'sch-1',
      schoolName: 'SMK Negeri 1 Kimia Industri Bandung',
      classId: 'cls-1',
      className: 'XII Kimia Analitik 1',
      submitTime: '2026-10-20T09:30:00Z',
      status: 'dinilai',
      totalScore: 88,
      technicalScore: 90,
      employabilityScore: 86
    },
    // 20 submission dengan schoolName Bandung tetapi schoolId KOSONG, dan 22 examId historis
    ...Array.from({ length: 20 }, (_, i) => {
      const idx = i + 2;
      const isStudent1 = i % 2 === 0;
      return {
        id: `sub-hist-bandung-${idx.toString().padStart(2, '0')}`,
        examId: `ex-historical-${i + 1}`, // examId ini TIDAK ADA di db.exams aktif!
        examTitle: `Ujian Historis Kejuruan Paket ${String.fromCharCode(65 + (i % 5))}`,
        studentId: isStudent1 ? 'usr-siswa-1' : 'usr-siswa-2',
        studentName: isStudent1 ? 'Ahmad Rizki' : 'Siti Nurhaliza',
        studentNis: isStudent1 ? '1029384756' : '1029384757',
        studentEmail: isStudent1 ? 'ahmad@siswa.smk.sch.id' : 'siti@siswa.smk.sch.id',
        schoolId: '', // Kosong di database produksi!
        schoolName: i % 2 === 0 ? 'SMK Negeri 1 Kimia Industri Bandung' : 'Bandung',
        classId: '', // Kosong di database produksi!
        className: '',
        submitTime: `2026-10-${10 + (i % 8)}T10:00:00Z`,
        status: i % 3 === 0 ? 'perlu_pemeriksaan' : 'dinilai',
        totalScore: 75 + (i % 20),
        technicalScore: 80,
        employabilityScore: 75
      };
    }),
    // 3 submission TANPA schoolId dan TANPA schoolName:
    // 1 dapat diverifikasi via student user record (usr-siswa-3)
    {
      id: 'sub-no-school-verified',
      examId: 'ex-historical-orphan-1',
      examTitle: 'Ujian Arsip Tanpa Header',
      studentId: 'usr-siswa-3',
      studentName: 'Budi Santoso Siswa',
      studentNis: '1029384758',
      studentEmail: 'budi.siswa@siswa.smk.sch.id',
      schoolId: '',
      schoolName: '',
      classId: '',
      className: '',
      submitTime: '2026-10-05T08:00:00Z',
      status: 'dinilai',
      totalScore: 82
    },
    // 2 tidak dapat dibuktikan kepemilikannya (akan ditandai rekonsiliasi admin, DILARANG bocor ke guru)
    {
      id: 'sub-unverified-orphan-1',
      examId: 'ex-unknown-x',
      examTitle: 'Ujian Tanpa Pemilik X',
      studentId: 'usr-unknown-1',
      studentName: 'Siswa Misterius 1',
      studentNis: '999901',
      schoolId: '',
      schoolName: '',
      classId: '',
      className: '',
      submitTime: '2026-10-01T08:00:00Z',
      status: 'dinilai',
      totalScore: 70
    },
    {
      id: 'sub-unverified-orphan-2',
      examId: 'ex-unknown-y',
      examTitle: 'Ujian Tanpa Pemilik Y',
      studentId: 'usr-unknown-2',
      studentName: 'Siswa Misterius 2',
      studentNis: '999902',
      schoolId: '',
      schoolName: '',
      classId: '',
      className: '',
      submitTime: '2026-10-02T08:00:00Z',
      status: 'dinilai',
      totalScore: 72
    }
  ],
  archives: [
    {
      id: 'ex-historical-archive-1',
      type: 'exam',
      title: 'Ujian Arsip Laboratorium',
      schoolId: 'sch-1',
      data: { id: 'ex-historical-archive-1', title: 'Ujian Arsip Laboratorium', schoolId: 'sch-1' }
    }
  ],
  settings: {
    systemName: 'EmployaSkills Test Environment',
    maintenanceMode: false
  },
  portfolios: [],
  lastUpdated: new Date().toISOString()
};

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

let serverProcess = null;

function startTestServer(isRestart = false) {
  return new Promise((resolve, reject) => {
    // Tulis database simulasi produksi HANYA pada start pertama (jangan timpa saat restart)
    if (!isRestart) {
      fs.mkdirSync(path.dirname(SANITIZED_DB_PATH), { recursive: true });
      fs.writeFileSync(SANITIZED_DB_PATH, JSON.stringify(SANITIZED_DATA, null, 2), 'utf8');
    }

    serverProcess = spawn('node', ['backend/dist/server.js'], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        VOC_DATABASE_PATH: SANITIZED_DB_PATH
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('berjalan di port') || msg.includes('Server')) {
        setTimeout(resolve, 800);
      }
    });

    serverProcess.stderr.on('data', (d) => {
      // console.error('[Server Err]:', d.toString());
    });

    serverProcess.on('error', reject);

    // Fallback timer jika stdout tidak terdeteksi
    setTimeout(resolve, 2000);
  });
}

function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 PENGUJIAN OTOMATIS COMPREHENSIVE: CRITICAL HOTFIX EMPLOYASKILLS');
  console.log(' Database Pengujian Terpisah:', SANITIZED_DB_PATH);
  console.log(' Target Test Server:', BASE_URL);
  console.log('================================================================\n');

  await startTestServer();

  let passed = 0;
  let failed = 0;

  async function test(title, fn) {
    try {
      await fn();
      console.log(`  ✅ [LULUS] ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [GAGAL] ${title}`);
      console.error(`     Penyebab: ${err.message}`);
      if (err.stack) {
        console.error(`     Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`);
      }
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // UJI 1: Guru Bandung login dan dua kelas binaannya muncul
    // -------------------------------------------------------------
    console.log('--- Uji 1: Guru Bandung Login & Verifikasi Kelas Binaan ---');
    let guruBandungToken = '';
    let guruBandungUser = null;
    let guruBandungBootstrap = null;

    await test('Guru Bandung berhasil login dan mendapatkan token otentikasi', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'guru.kimia@smk.sch.id', password: 'password123' })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      guruBandungToken = res.body.token;
      guruBandungUser = res.body.user;
      assert.strictEqual(guruBandungUser.role, 'guru');
      assert.strictEqual(guruBandungUser.schoolId, 'sch-1');
    });

    await test('Dua kelas binaan (cls-1 dan cls-2) teridentifikasi via relasi otoritatif classes.teacherId', async () => {
      const res = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruBandungToken}` }
      });
      assert.strictEqual(res.status, 200);
      guruBandungBootstrap = res.body.data;

      // Filter kelas binaan guru: otoritatif classes.teacherId === user.userId
      const assignedClasses = (guruBandungBootstrap.classes || []).filter(c =>
        c.teacherId === guruBandungUser.id || (guruBandungUser.assignedClassIds && guruBandungUser.assignedClassIds.includes(c.id))
      );

      console.log(`     Total Kelas di DB: ${guruBandungBootstrap.classes.length}`);
      console.log(`     Kelas Binaan Terdeteksi: ${assignedClasses.length} (${assignedClasses.map(c => c.name).join(', ')})`);
      assert.strictEqual(assignedClasses.length, 2, 'Guru Bandung HARUS memiliki tepat 2 kelas binaan (cls-1 dan cls-2)');
      assert(assignedClasses.some(c => c.id === 'cls-1'), 'Harus memuat cls-1');
      assert(assignedClasses.some(c => c.id === 'cls-2'), 'Harus memuat cls-2 (walaupun schoolId di cls-2 kosong di DB!)');
    });

    // -------------------------------------------------------------
    // UJI 2: Refresh berulang, jumlah kelas dan submission tidak berubah
    // -------------------------------------------------------------
    console.log('\n--- Uji 2: Refresh Berulang (Invariance Kelas & Submission) ---');
    await test('Simulasi refresh browser 5x berturut-turut: Kelas dan submission tidak berubah', async () => {
      const initialClassesCount = guruBandungBootstrap.classes.filter(c => c.teacherId === guruBandungUser.id).length;
      const initialSubmissionsCount = guruBandungBootstrap.submissions.length;

      for (let i = 1; i <= 5; i++) {
        // Step A: Pemulihan token (/api/auth/restore-token)
        const restoreRes = await request('/api/auth/restore-token', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${guruBandungToken}` },
          body: JSON.stringify({ token: guruBandungToken })
        });
        assert.strictEqual(restoreRes.status, 200);

        // Step B: Re-bootstrap (/api/bootstrap)
        const bootRes = await request('/api/bootstrap', {
          headers: { 'Authorization': `Bearer ${guruBandungToken}` }
        });
        assert.strictEqual(bootRes.status, 200);

        const currentClassesCount = bootRes.body.data.classes.filter(c => c.teacherId === guruBandungUser.id).length;
        const currentSubmissionsCount = bootRes.body.data.submissions.length;

        assert.strictEqual(currentClassesCount, initialClassesCount, `Iterasi ${i}: Jumlah kelas berubah`);
        assert.strictEqual(currentSubmissionsCount, initialSubmissionsCount, `Iterasi ${i}: Jumlah berkas berubah`);
      }
      console.log(`     5x refresh berhasil: Kelas=${initialClassesCount}, Submissions=${initialSubmissionsCount}`);
    });

    // -------------------------------------------------------------
    // UJI 3: Logout dan login ulang, data tetap tersedia
    // -------------------------------------------------------------
    console.log('\n--- Uji 3: Logout dan Login Ulang ---');
    await test('Logout dan login ulang: Seluruh kelas binaan dan berkas tetap konsisten', async () => {
      // Login ulang
      const reloginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'guru.kimia@smk.sch.id', password: 'password123' })
      });
      assert.strictEqual(reloginRes.status, 200);
      const newToken = reloginRes.body.token;

      const bootRes = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });
      assert.strictEqual(bootRes.status, 200);
      const myClasses = bootRes.body.data.classes.filter(c => c.teacherId === guruBandungUser.id);
      assert.strictEqual(myClasses.length, 2);
      assert.strictEqual(bootRes.body.data.submissions.length, guruBandungBootstrap.submissions.length);
    });

    // -------------------------------------------------------------
    // UJI 4: Submission lama tanpa schoolId tetap dipertahankan & diverifikasi
    // -------------------------------------------------------------
    console.log('\n--- Uji 4: Submission Historis Tanpa schoolId & Resolusi Efektif ---');
    await test('Submission lama tanpa schoolId dinormalisasi dengan relasi terverifikasi', async () => {
      const subs = guruBandungBootstrap.submissions;
      // Cari submission historis yang awalnya memiliki schoolId kosong di DB
      const histSub = subs.find(s => s.id.startsWith('sub-hist-bandung-'));
      assert(histSub, 'Submission historis bandung harus ditemukan');
      assert.strictEqual(histSub.schoolId, 'sch-1', 'effectiveSchoolId harus dinormalisasi menjadi sch-1');
      assert.strictEqual(histSub.schoolName, 'SMK Negeri 1 Kimia Industri Bandung', 'effectiveSchoolName harus dinormalisasi');
      assert(histSub.examTitle, 'effectiveExamTitle harus memiliki judul ujian');
      console.log(`     Sample Normalisasi: ID=${histSub.id}, schoolId=${histSub.schoolId}, Title=${histSub.examTitle}`);
    });

    await test('Submission tanpa schoolId & schoolName milik siswa terdaftar (sub-no-school-verified) berhasil diatribusikan', async () => {
      const subs = guruBandungBootstrap.submissions;
      const verifiedSub = subs.find(s => s.id === 'sub-no-school-verified');
      assert(verifiedSub, 'Submission sub-no-school-verified harus berhasil diatribusikan via data siswa di db.users');
      assert.strictEqual(verifiedSub.schoolId, 'sch-1');
      assert.strictEqual(verifiedSub.className, 'XII Kimia Analitik 1');
    });

    // -------------------------------------------------------------
    // UJI 5: Submission yang merujuk ujian historis tidak hilang dari arsip
    // -------------------------------------------------------------
    console.log('\n--- Uji 5: Submission Merujuk Ujian Historis Tetap Tersedia ---');
    await test('22 submission historis yang merujuk ujian tidak aktif tetap tampil di panel guru', async () => {
      const subs = guruBandungBootstrap.submissions;
      const activeExamIds = new Set(guruBandungBootstrap.exams.map(e => e.id));
      const historicalSubs = subs.filter(s => !activeExamIds.has(s.examId));

      console.log(`     Total Berkas Guru Bandung: ${subs.length}`);
      console.log(`     Berkas Merujuk Ujian Historis: ${historicalSubs.length}`);
      assert.strictEqual(historicalSubs.length, 21, 'Harus memuat 20 historis + 1 sub-no-school-verified');
      assert.strictEqual(subs.length, 22, 'Total berkas guru Bandung harus tepat 22 berkas');
    });

    // -------------------------------------------------------------
    // UJI 6: Guru sekolah lain tidak dapat melihat data Bandung (Zero Leakage)
    // -------------------------------------------------------------
    console.log('\n--- Uji 6: Isolasi Multi-Tenant Lintas Sekolah (Zero Leakage) ---');
    let guruSurabayaToken = '';
    await test('Guru Surabaya login dan TIDAK BISA melihat berkas maupun kelas Bandung', async () => {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'guru.surabaya@smk.sch.id', password: 'password123' })
      });
      assert.strictEqual(loginRes.status, 200);
      guruSurabayaToken = loginRes.body.token;

      const bootRes = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruSurabayaToken}` }
      });
      assert.strictEqual(bootRes.status, 200);

      const sbyClasses = bootRes.body.data.classes.filter(c => c.teacherId === 'usr-guru-surabaya');
      const sbySubs = bootRes.body.data.submissions;

      console.log(`     Kelas Binaan Guru Surabaya: ${sbyClasses.length}`);
      console.log(`     Berkas Terlihat oleh Guru Surabaya: ${sbySubs.length}`);

      // Pastikan ZERO LEAKAGE
      assert.strictEqual(sbySubs.length, 0, 'Guru Surabaya TIDAK BOLEH melihat submission Bandung');
      assert.strictEqual(sbyClasses.length, 1, 'Guru Surabaya hanya boleh melihat 1 kelas binaannya');
      assert.strictEqual(sbyClasses[0].name, 'XII Kimia Industri Surabaya');
    });

    await test('Guru Surabaya DITOLAK saat mencoba membaca rincian submission Bandung via GET /api/submissions/:id', async () => {
      const res = await request('/api/submissions/sub-bandung-01', {
        headers: { 'Authorization': `Bearer ${guruSurabayaToken}` }
      });
      assert.strictEqual(res.status, 403, 'Akses lintas sekolah harus menghasilkan HTTP 403 Forbidden');
    });

    await test('Admin dapat melihat seluruh 24 berkas termasuk flag needsReconciliation pada 2 berkas yatim tak terverifikasi', async () => {
      const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@smk.sch.id', password: 'admin123' })
      });
      assert.strictEqual(adminLogin.status, 200);

      const adminBoot = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${adminLogin.body.token}` }
      });
      assert.strictEqual(adminBoot.status, 200);
      assert.strictEqual(adminBoot.body.data.submissions.length, 24, 'Admin harus melihat seluruh 24 submission');

      const reconciliationItems = adminBoot.body.data.submissions.filter(s => s.needsReconciliation === true);
      assert.strictEqual(reconciliationItems.length, 2, '2 berkas yatim harus ditandai needsReconciliation untuk admin');
      console.log(`     Berkas Rekonsiliasi Admin: ${reconciliationItems.map(s => s.id).join(', ')}`);
    });

    // -------------------------------------------------------------
    // UJI 7: Siswa mengirim jawaban baru dan hasilnya muncul di panel guru
    // -------------------------------------------------------------
    console.log('\n--- Uji 7: Siswa Submit Jawaban Baru -> Muncul di Panel Guru ---');
    await test('Siswa Bandung mengirim ujian baru -> Berkas langsung bertambah di panel Guru Bandung', async () => {
      const siswaLogin = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'siti@siswa.smk.sch.id', password: 'siswa123' })
      });
      assert.strictEqual(siswaLogin.status, 200);
      const siswaToken = siswaLogin.body.token;

      const newSubmissionId = `sub-fresh-${Date.now()}`;
      const submitRes = await request('/api/submissions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${siswaToken}` },
        body: JSON.stringify({
          id: newSubmissionId,
          examId: 'ex-2',
          answers: [
            { questionId: 'q-1', answer: 'A' },
            { questionId: 'q-2', answer: 'Standardisasi dilakukan dengan asam oksalat menggunakan indikator pp' }
          ],
          totalScore: 85,
          technicalScore: 85,
          status: 'perlu_pemeriksaan'
        })
      });
      assert.strictEqual(submitRes.status, 200);

      // Periksa panel Guru Bandung
      const guruBoot = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruBandungToken}` }
      });
      assert.strictEqual(guruBoot.status, 200);
      assert.strictEqual(guruBoot.body.data.submissions.length, 23, 'Jumlah berkas Guru Bandung harus bertambah dari 22 menjadi 23');
      const found = guruBoot.body.data.submissions.find(s => s.id === newSubmissionId);
      assert(found, 'Submission baru harus ditemukan di antrean Guru Bandung');
      assert.strictEqual(found.className, 'XII Proses Kimia 2');

      // Pastikan Guru Surabaya TETAP 0
      const sbyBoot = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruSurabayaToken}` }
      });
      assert.strictEqual(sbyBoot.body.data.submissions.length, 0, 'Guru Surabaya tetap 0 berkas');
    });

    // -------------------------------------------------------------
    // UJI 8: Restart backend, database dan tampilan tetap konsisten
    // -------------------------------------------------------------
    console.log('\n--- Uji 8: Ketahanan Restart Backend & Persistensi Atomik ---');
    await test('Restart backend: Database persisten tidak ter-reset atau korup', async () => {
      // Matikan server
      stopTestServer();
      await new Promise(r => setTimeout(r, 1000));

      // Jalankan kembali server dengan database yang sama (isRestart = true)
      await startTestServer(true);

      // Periksa integritas data Guru Bandung
      const bootRes = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruBandungToken}` }
      });
      assert.strictEqual(bootRes.status, 200);
      assert.strictEqual(bootRes.body.data.submissions.length, 23, '23 submission (termasuk submission baru) harus tetap utuh setelah restart');
      
      const assignedClasses = bootRes.body.data.classes.filter(c => c.teacherId === guruBandungUser.id);
      assert.strictEqual(assignedClasses.length, 2, '2 kelas binaan harus tetap utuh setelah restart');
      console.log('     Restart berhasil: Database tetap persisten tanpa data loss.');
    });

    // -------------------------------------------------------------
    // UJI 9: Status loading, empty state, dan API error dapat dibedakan
    // -------------------------------------------------------------
    console.log('\n--- Uji 9: Pembedaan Status Loading, Empty State, dan Error ---');
    await test('Token palsu/rusak menghasilkan HTTP 401 eksplisit (Bukan data 0 hening)', async () => {
      const res = await request('/api/bootstrap', {
        headers: { 'Authorization': 'Bearer token_rusak_palsu_123' }
      });
      // Dengan token rusak pada endpoint optionalAuth, user dianggap unauthenticated
      // dan tidak mendapatkan berkas submission
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.submissions.length, 0);

      // Sedangkan endpoint requireAuth menghasilkan 401
      const secureRes = await request('/api/submissions', {
        headers: { 'Authorization': 'Bearer token_rusak_palsu_123' }
      });
      assert.strictEqual(secureRes.status, 401, 'Endpoint privat harus menghasilkan HTTP 401');
    });

    await test('GET /api/submissions/:id untuk ID yang tidak ada menghasilkan HTTP 404 eksplisit', async () => {
      const res = await request('/api/submissions/sub-tidak-ada-999', {
        headers: { 'Authorization': `Bearer ${guruBandungToken}` }
      });
      assert.strictEqual(res.status, 404, 'Harus menghasilkan HTTP 404');
    });

  } finally {
    stopTestServer();
    // Bersihkan file database uji coba sementara
    try {
      if (fs.existsSync(SANITIZED_DB_PATH)) {
        fs.unlinkSync(SANITIZED_DB_PATH);
      }
    } catch {}
  }

  console.log('\n================================================================');
  console.log(` HASIL PENGUJIAN OTOMATIS: ${passed} LULUS, ${failed} GAGAL`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes gagal.`);
  }
}

runTests().catch(err => {
  console.error('\nFatal Test Error:', err);
  process.exit(1);
});
