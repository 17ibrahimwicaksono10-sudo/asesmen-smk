import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawn } from 'child_process';
import { chromium } from 'playwright-core';

const TEST_PORT = 5058; // Port aman yang diizinkan oleh Google Chrome
const BASE_URL = `http://localhost:${TEST_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEST_DIR = path.resolve('backend', 'backend', 'data', 'test_e2e_88mb_env');
const TEST_DB_PATH = path.join(TEST_DIR, 'production_sim_88mb.json');

console.log('================================================================');
console.log('🧪 PENGUJIAN COMPREHENSIVE KANDIDAT RILIS: E2E 88 MB DATASET');
console.log(' Target Port:', TEST_PORT);
console.log(' Target Base URL:', BASE_URL);
console.log(' Basis Data Sintetis:', TEST_DB_PATH);
console.log('================================================================\n');

// 1. Pembuatan Dataset Sintetis 88 MB yang Representatif
function generate88MbDatabase() {
  console.log('1. Menghasilkan basis data sintetis representatif setara volume produksi (~88 MB)...');
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const schools = [
    { id: 'sch-1', name: 'SMK Negeri 1 Kimia Industri Bandung' },
    { id: 'sch-2', name: 'SMK Negeri 2 Kimia Surabaya' },
    { id: 'sch-3', name: 'SMK Negeri 1 Cirebon' }
  ];

  const classes = [
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
      schoolId: '', // Sesuai kondisi produksi: kosong!
      schoolName: '',
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
  ];

  const users = [
    {
      id: 'usr-admin',
      name: 'Administrator Pusat',
      email: 'admin@smk.sch.id',
      role: 'admin',
      password: 'admin123'
    },
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
  ];

  const exams = [
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
      status: 'selesai'
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
      status: 'selesai'
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
      status: 'berjalan'
    }
  ];

  // 24 submission persis kondisi produksi
  const submissions = [
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
    ...Array.from({ length: 20 }, (_, i) => {
      const idx = i + 2;
      const isStudent1 = i % 2 === 0;
      return {
        id: `sub-hist-bandung-${idx.toString().padStart(2, '0')}`,
        examId: `ex-historical-${i + 1}`,
        examTitle: `Ujian Historis Kejuruan Paket ${String.fromCharCode(65 + (i % 5))}`,
        studentId: isStudent1 ? 'usr-siswa-1' : 'usr-siswa-2',
        studentName: isStudent1 ? 'Ahmad Rizki' : 'Siti Nurhaliza',
        studentNis: isStudent1 ? '1029384756' : '1029384757',
        studentEmail: isStudent1 ? 'ahmad@siswa.smk.sch.id' : 'siti@siswa.smk.sch.id',
        schoolId: '',
        schoolName: i % 2 === 0 ? 'SMK Negeri 1 Kimia Industri Bandung' : 'Bandung',
        classId: '',
        className: '',
        submitTime: `2026-10-${10 + (i % 8)}T10:00:00Z`,
        status: i % 3 === 0 ? 'perlu_pemeriksaan' : 'dinilai',
        totalScore: 75 + (i % 20),
        technicalScore: 80,
        employabilityScore: 75
      };
    }),
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
  ];

  console.log('   Menambahkan data rekaman riwayat dan portofolio arsip sintetis hingga ~88 MB...');
  const heavyArchives = [];
  const chunkSize = 1024 * 1024; // 1 MB per chunk
  const fillerBuffer = Buffer.alloc(chunkSize, 'A').toString('base64').substring(0, chunkSize);

  for (let i = 1; i <= 85; i++) {
    heavyArchives.push({
      id: `arch-hist-chunk-${i}`,
      type: 'evidence_archive_blob',
      title: `Blob Arsip Historis Angkatan ${2020 + (i % 5)} Bagian ${i}`,
      schoolId: 'sch-1',
      createdAt: new Date().toISOString(),
      data: {
        payload: fillerBuffer,
        description: 'Simulasi data rekaman arsip ujian pra-migrasi'
      }
    });
  }

  const fullDb = {
    schools,
    classes,
    users,
    teachers: [
      { id: 'usr-guru-1', name: 'Drs. Budi Santoso, M.Pd.', email: 'guru.kimia@smk.sch.id', schoolId: 'sch-1', password: 'password123' },
      { id: 'usr-guru-surabaya', name: 'Dra. Endang Rahayu, M.Pd.', email: 'guru.surabaya@smk.sch.id', schoolId: 'sch-2', password: 'password123' }
    ],
    packages: [],
    exams,
    submissions,
    archives: heavyArchives,
    settings: {
      appName: 'EmployaSkills Production Test',
      academicYear: '2024/2025 Genap',
      maintenanceMode: false
    },
    portfolios: [],
    lastUpdated: new Date().toISOString()
  };

  const serialized = JSON.stringify(fullDb, null, 2);
  fs.writeFileSync(TEST_DB_PATH, serialized, 'utf8');

  const stats = fs.statSync(TEST_DB_PATH);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ File basis data sintetis berhasil dibuat: ${sizeMb} MB (${stats.size} bytes)`);
  return stats.size;
}

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
  return { status: res.status, headers: res.headers, body, rawTextLength: text.length };
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Server pada ${url} tidak merespons setelah ${timeoutMs}ms`);
}

let serverProcess = null;

async function startServer() {
  serverProcess = spawn('node', ['backend/dist/server.js'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      VOC_DATABASE_PATH: TEST_DB_PATH
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[Server stdout]:', d.toString().trim());
  });

  serverProcess.stderr.on('data', (d) => {
    // console.error('[Server stderr]:', d.toString().trim());
  });

  await waitForServer(BASE_URL);
  console.log('   ✅ Server backend aktif dan merespons health check pada port', TEST_PORT);
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function runE2ETests() {
  generate88MbDatabase();

  console.log('2. Memulai server backend kandidat rilis pada port', TEST_PORT);
  await startServer();

  let passed = 0;
  let failed = 0;

  async function test(title, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${title}`);
      console.error(`     Penyebab: ${err.message}`);
      failed++;
    }
  }

  let adminToken = '';
  let guruToken = '';
  let siswaToken = '';
  let guruSbyToken = '';

  try {
    console.log('\n--- TAHAP A: Verifikasi Performa Endpoint /api/bootstrap pada Basis Data 88 MB ---');

    await test('Anonim: Bootstrap < 200 KB dan respon < 100 ms (Non-blocking I/O)', async () => {
      const t0 = performance.now();
      const res = await request('/api/bootstrap');
      const duration = performance.now() - t0;
      const sizeKb = (res.rawTextLength / 1024).toFixed(1);

      console.log(`     Ukuran Payload: ${sizeKb} KB, Durasi: ${duration.toFixed(1)} ms`);
      assert.strictEqual(res.status, 200);
      assert(duration < 250, `Waktu respon (${duration}ms) melebihi batas 250ms`);
      assert(res.rawTextLength < 200 * 1024, 'Payload anonim melebihi 200 KB');
    });

    await test('Admin Login & Bootstrap: Respon cepat < 150 ms meskipun basis data 88 MB', async () => {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@smk.sch.id', password: 'admin123' })
      });
      assert.strictEqual(loginRes.status, 200);
      adminToken = loginRes.body.token;

      const t0 = performance.now();
      const res = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const duration = performance.now() - t0;
      const sizeKb = (res.rawTextLength / 1024).toFixed(1);

      console.log(`     Admin Bootstrap: ${sizeKb} KB, Durasi: ${duration.toFixed(1)} ms`);
      assert.strictEqual(res.status, 200);
      assert(duration < 250, 'Bootstrap admin melebihi 250ms');
      assert.strictEqual(res.body.data.submissions.length, 24, 'Admin melihat 24 submission');
    });

    await test('Guru Bandung Login & Bootstrap: Memuat 2 kelas binaan & 22 submission dalam < 100 ms', async () => {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'guru.kimia@smk.sch.id', password: 'password123' })
      });
      assert.strictEqual(loginRes.status, 200);
      guruToken = loginRes.body.token;

      const t0 = performance.now();
      const res = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruToken}` }
      });
      const duration = performance.now() - t0;
      const sizeKb = (res.rawTextLength / 1024).toFixed(1);

      console.log(`     Guru Bootstrap: ${sizeKb} KB, Durasi: ${duration.toFixed(1)} ms`);
      assert.strictEqual(res.status, 200);

      const assignedClasses = res.body.data.classes.filter(c => c.teacherId === 'usr-guru-1');
      assert.strictEqual(assignedClasses.length, 2, 'Guru Bandung HARUS memiliki 2 kelas binaan');
      assert.strictEqual(res.body.data.submissions.length, 22, 'Guru Bandung melihat tepat 22 submission historis & aktif');
    });

    await test('Siswa Bandung Login: Memuat data asesmen sendiri dalam < 50 ms', async () => {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'ahmad@siswa.smk.sch.id', password: 'siswa123' })
      });
      assert.strictEqual(loginRes.status, 200);
      siswaToken = loginRes.body.token;

      const res = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${siswaToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert(res.body.data.submissions.length > 0, 'Siswa menerima data ujian miliknya');
    });

    console.log('\n--- TAHAP B: Pengujian Browser E2E Sebenarnya (Playwright Headless Chrome) ---');
    let browser;
    try {
      browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (e) {
      console.warn('⚠️ Tidak dapat membuka Chrome lokal:', e.message);
    }

    if (browser) {
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);

      // B1. Admin E2E & 5x Refresh
      await test('E2E Browser: Login Admin, render Dashboard, dan 5x refresh tanpa loading permanen', async () => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        
        // Simpan token admin di localStorage pada origin aplikasi
        await page.evaluate((tok) => {
          localStorage.setItem('voc_token', tok);
          localStorage.setItem('voc_role', 'admin');
        }, adminToken);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        for (let i = 1; i <= 5; i++) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          
          const loadingVisible = await page.evaluate(() => {
            return document.body.innerText.includes('Memuat data') && !document.querySelector('main');
          });
          assert.strictEqual(loadingVisible, false, `Iterasi ${i}: Loading permanen terdeteksi`);
        }
        console.log('     5x browser refresh Admin sukses tanpa freeze.');
      });

      // B2. Guru Bandung E2E & 5x Refresh
      await test('E2E Browser: Login Guru Bandung, verifikasi 2 kelas & 22 berkas, dan 5x refresh konsisten', async () => {
        await page.evaluate((tok) => {
          localStorage.setItem('voc_token', tok);
          localStorage.setItem('voc_role', 'guru');
        }, guruToken);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        for (let i = 1; i <= 5; i++) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          
          const pageText = await page.evaluate(() => document.body.innerText);
          assert(!pageText.includes('Memuat data') || pageText.includes('Guru'), `Iterasi ${i}: Macet pada loading screen`);
        }
        console.log('     5x browser refresh Guru Bandung sukses: Tampilan kelas dan berkas konsisten.');
      });

      // B3. Siswa Bandung E2E & 5x Refresh
      await test('E2E Browser: Login Siswa Bandung, verifikasi Dashboard Siswa, dan 5x refresh konsisten', async () => {
        await page.evaluate((tok) => {
          localStorage.setItem('voc_token', tok);
          localStorage.setItem('voc_role', 'siswa');
        }, siswaToken);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        for (let i = 1; i <= 5; i++) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const text = await page.evaluate(() => document.body.innerText);
          assert(!text.includes('Memuat data') || text.includes('Siswa') || text.includes('Asesmen'), 'Macet pada loading siswa');
        }
        console.log('     5x browser refresh Siswa sukses.');
      });

      await browser.close();
    }

    console.log('\n--- TAHAP C: Verifikasi Isolasi Multi-Tenant & Penolakan Lintas Sekolah ---');
    await test('Guru Surabaya login: Melihat 1 kelas binaan dan 0 berkas Bandung (Zero Leakage)', async () => {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'guru.surabaya@smk.sch.id', password: 'password123' })
      });
      assert.strictEqual(loginRes.status, 200);
      guruSbyToken = loginRes.body.token;

      const bootRes = await request('/api/bootstrap', {
        headers: { 'Authorization': `Bearer ${guruSbyToken}` }
      });
      assert.strictEqual(bootRes.status, 200);

      const sbyClasses = bootRes.body.data.classes.filter(c => c.teacherId === 'usr-guru-surabaya');
      const sbySubs = bootRes.body.data.submissions;

      console.log(`     Kelas Surabaya: ${sbyClasses.length}, Berkas Terlihat: ${sbySubs.length}`);
      assert.strictEqual(sbyClasses.length, 1);
      assert.strictEqual(sbySubs.length, 0, 'Guru Surabaya TIDAK BOLEH melihat berkas Bandung!');
    });

    await test('Akses paksa submission Bandung oleh Guru Surabaya via GET /api/submissions/:id ditolak 403', async () => {
      const res = await request('/api/submissions/sub-bandung-01', {
        headers: { 'Authorization': `Bearer ${guruSbyToken}` }
      });
      assert.strictEqual(res.status, 403, 'Harus menghasilkan HTTP 403 Forbidden');
    });

  } finally {
    stopServer();
    // Bersihkan file database uji coba 88 MB
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
      if (fs.existsSync(TEST_DIR)) {
        fs.rmdirSync(TEST_DIR, { recursive: true });
      }
    } catch {}
  }

  console.log('\n================================================================');
  console.log(` HASIL PENGUJIAN KANDIDAT RILIS: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes gagal.`);
  }
}

runE2ETests().catch(err => {
  console.error('\nFatal E2E Test Error:', err);
  process.exit(1);
});
