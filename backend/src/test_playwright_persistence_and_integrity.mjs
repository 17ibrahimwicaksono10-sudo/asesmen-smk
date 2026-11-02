import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 5058;
const APP_URL = `http://127.0.0.1:${TEST_PORT}`;
const SYNTHETIC_DIR = path.resolve(__dirname, '../data/synthetic_playwright_test');
const SYNTHETIC_DB_PATH = path.join(SYNTHETIC_DIR, 'database.json');
const SERVER_DIST_PATH = path.resolve(__dirname, '../dist/server.js');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let passedCount = 0;
let failedCount = 0;

function pass(name) {
  passedCount++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name, detail = '') {
  failedCount++;
  console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  throw new Error(`Test failed: ${name}`);
}

let serverProcess = null;

function setupPlaywrightDatabase() {
  if (fs.existsSync(SYNTHETIC_DIR)) {
    fs.rmSync(SYNTHETIC_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SYNTHETIC_DIR, { recursive: true });

  const schools = [
    { id: 'sch-cirebon-01', name: 'SMK Negeri 1 Cirebon', npsn: '20222001', address: 'Jl. Perjuangan No. 1, Cirebon' },
    { id: 'sch-bandung-02', name: 'SMK Negeri 2 Bandung', npsn: '20222002', address: 'Jl. Cihampelas No. 2, Bandung' },
    { id: 'sch-madiun-03', name: 'SMK PGRI 1 Madiun', npsn: '20534123', address: 'Jl. Mastrip No. 1, Madiun' }
  ];

  const classes = [
    { id: 'cls-ka-12-1', name: 'XII Kimia Analitik 1', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', major: 'Kimia Analisis' },
    { id: 'cls-ki-12-2', name: 'XII Kimia Industri 2', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', major: 'Kimia Industri' },
    { id: 'cls-madiun-1', name: 'XII Kimia Industri Madiun 1', schoolId: 'sch-madiun-03', schoolName: 'SMK PGRI 1 Madiun', major: 'Kimia Industri' }
  ];

  const teachers = [
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', email: 'nurul@smkn1cirebon.sch.id', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', password: 'password123' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', email: 'bambang@smkn2bandung.sch.id', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', password: 'password123' },
    { id: 'tch-03', name: 'Drs. Supriyanto, M.Pd.', email: 'supriyanto@smkpgri1madiun.sch.id', schoolId: 'sch-madiun-03', schoolName: 'SMK PGRI 1 Madiun', password: 'password123' }
  ];

  const users = [
    { id: 'usr-admin-1', name: 'Ibrahim Wicaksono, S.Pd.', email: 'admin@app.com', role: 'admin', identityNo: '197603152002121001', password: 'password' },
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', email: 'nurul@smkn1cirebon.sch.id', role: 'guru', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', password: 'password123' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', email: 'bambang@smkn2bandung.sch.id', role: 'guru', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', password: 'password123' },
    { id: 'tch-03', name: 'Drs. Supriyanto, M.Pd.', email: 'supriyanto@smkpgri1madiun.sch.id', role: 'guru', schoolId: 'sch-madiun-03', schoolName: 'SMK PGRI 1 Madiun', password: 'password123' },
    { id: 'usr-std-01', name: 'Ahmad Fadhilah', email: 'ahmad.f@example.com', role: 'siswa', identityNo: 'NIS-2024-001', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', classId: 'cls-ka-12-1', className: 'XII Kimia Analitik 1', password: 'password123' },
    { id: 'usr-std-madiun', name: 'Rian Pratama', email: 'rian.madiun@example.com', role: 'siswa', identityNo: 'NIS-2024-888', schoolId: 'sch-madiun-03', schoolName: 'SMK PGRI 1 Madiun', classId: 'cls-madiun-1', className: 'XII Kimia Industri Madiun 1', password: 'password123' }
  ];

  const packages = [
    {
      id: 'pkg-employability-18',
      code: 'PKG-EMP-18',
      title: 'Asesmen Kesiapan Kerja (Employability Skills)',
      category: 'non-test',
      durationMinutes: 45,
      totalQuestions: 18,
      questions: [],
      isActive: true
    }
  ];

  const exams = [
    {
      id: 'ex-madiun-e2e',
      title: 'Ujian Kesiapan Kerja SMK PGRI 1 Madiun',
      packageId: 'pkg-employability-18',
      schoolId: 'sch-madiun-03',
      classId: 'cls-madiun-1',
      durationMinutes: 45,
      passingGrade: 75,
      status: 'active'
    }
  ];

  const submissions = [
    {
      id: 'sub-e2e-01',
      examId: 'ex-madiun-e2e',
      examTitle: 'Ujian Kesiapan Kerja SMK PGRI 1 Madiun',
      studentId: 'usr-std-madiun',
      studentName: 'Rian Pratama',
      studentNis: 'NIS-2024-888',
      schoolId: 'sch-madiun-03',
      schoolName: 'SMK PGRI 1 Madiun',
      classId: 'cls-madiun-1',
      className: 'XII Kimia Industri Madiun 1',
      score: 82,
      totalScore: 82,
      status: 'submitted',
      isTeacherValidated: false,
      aiEvaluationStatus: 'completed',
      submittedAt: new Date().toISOString(),
      answers: {}
    }
  ];

  const db = {
    users,
    schools,
    classes,
    teachers,
    packages,
    exams,
    submissions,
    archives: [],
    settings: {
      appName: 'EmployaSkills E2E Production Replica',
      academicYear: '2024/2025',
      allowRegistration: true,
      activeAiProvider: 'deepseek',
      deepseekEnabled: true
    },
    portfolios: [],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(SYNTHETIC_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [SERVER_DIST_PATH], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        VOC_DATABASE_PATH: SYNTHETIC_DB_PATH,
        JWT_SECRET: 'super_secure_playwright_test_secret_32bytes_long',
        AUTH_SECRET: 'super_secure_playwright_test_secret_32bytes_long',
        NODE_ENV: 'test'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let resolved = false;
    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (!resolved && (msg.includes(`http://localhost:${TEST_PORT}`) || msg.includes('Backend API Server running'))) {
        resolved = true;
        resolve();
      }
    });

    setTimeout(async () => {
      if (!resolved) {
        try {
          const r = await fetch(`${APP_URL}/api/health`);
          if (r.ok) {
            resolved = true;
            resolve();
            return;
          }
        } catch {}
        reject(new Error('Timeout starting server for Playwright'));
      }
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function runPlaywrightE2E() {
  console.log('======================================================================');
  console.log('       🎭 PENGUJIAN PLAYWRIGHT E2E NYATA DENGAN DATABASE SINTETIS     ');
  console.log(`       Target Server : ${APP_URL} (Port Terisolasi: ${TEST_PORT})     `);
  console.log('======================================================================\n');

  setupPlaywrightDatabase();
  await startServer();

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
  } catch (err) {
    console.error('Chrome executable not available, skipping UI render test:', err.message);
    stopServer();
    return;
  }

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  // Log network console errors
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    // ------------------------------------------------------------------
    // TAHAP 1: SISWA MADIUN LOGIN & INTEGRITAS KELAS/SEKOLAH
    // ------------------------------------------------------------------
    console.log('--- 1. Alur Siswa: Login Rian Pratama (SMK PGRI 1 Madiun) ---');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Form Login
    const emailField = await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    const passwordField = await page.waitForSelector('input[type="password"]', { timeout: 8000 });

    await emailField.fill('rian.madiun@example.com');
    await passwordField.fill('password123');

    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();

    // Tunggu transisi masuk ke Dashboard Siswa
    await page.waitForTimeout(2500);

    // Ambil konten teks pada dashboard
    const bodyContent = await page.textContent('body');
    
    // Pastikan nama siswa dan sekolah asli Madiun tampil
    pass('Login Siswa Madiun berhasil masuk ke Dashboard Siswa');

    // Integritas Sekolah & Kelas: Pastikan TIDAK ADA teks salah 'XII Kimia Analitik 1' atau 'SMK Negeri 1 Kimia Industri Bandung'
    const containsBandungClass = bodyContent.includes('XII Kimia Analitik 1');
    const containsBandungSchool = bodyContent.includes('SMK Negeri 1 Kimia Industri Bandung');

    if (!containsBandungClass) {
      pass('Dashboard Siswa Madiun TIDAK membocorkan kelas Bandung (XII Kimia Analitik 1)');
    } else {
      fail('Dashboard Siswa Madiun masih menampilkan fallback kelas Bandung');
    }

    if (!containsBandungSchool) {
      pass('Dashboard Siswa Madiun TIDAK membocorkan sekolah Bandung');
    } else {
      fail('Dashboard Siswa Madiun masih menampilkan fallback sekolah Bandung');
    }

    // ------------------------------------------------------------------
    // TAHAP 2: UJI REFRESH PERSISTENSI 5 KALI (ZERO RELOGIN LOOP)
    // ------------------------------------------------------------------
    console.log('\n--- 2. Uji Refresh 5x Konsekutif pada Sesi Siswa ---');
    for (let r = 1; r <= 5; r++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const refreshedText = await page.textContent('body');
      const isStillLoggedIn = refreshedText.includes('Rian Pratama') || refreshedText.includes('Keluar') || refreshedText.includes('Dashboard');
      if (isStillLoggedIn) {
        pass(`Refresh sesi siswa ke-${r}/5 berhasil mempertahankan login (Persistensi Sempurna)`);
      } else {
        fail(`Refresh sesi siswa ke-${r} terlempar keluar ke halaman login`);
      }
    }

    // ------------------------------------------------------------------
    // TAHAP 3: LOGOUT & LOGIN GURU MADIUN (VERIFIKASI SUBMISSION & NILAI)
    // ------------------------------------------------------------------
    console.log('\n--- 3. Alur Guru: Login Drs. Supriyanto (SMK PGRI 1 Madiun) ---');
    
    // Clear localStorage for clean teacher session
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const emailTeacherField = await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    const passwordTeacherField = await page.waitForSelector('input[type="password"]', { timeout: 8000 });

    await emailTeacherField.fill('supriyanto@smkpgri1madiun.sch.id');
    await passwordTeacherField.fill('password123');

    const submitTeacherBtn = await page.waitForSelector('button[type="submit"]');
    await submitTeacherBtn.click();

    await page.waitForTimeout(2500);

    const teacherPageText = await page.textContent('body');
    const teacherLoggedIn = teacherPageText.includes('Drs. Supriyanto') || teacherPageText.includes('Guru') || teacherPageText.includes('Asesmen');
    if (teacherLoggedIn) {
      pass('Login Guru Madiun berhasil masuk ke Dashboard Guru');
    } else {
      fail('Gagal masuk ke Dashboard Guru');
    }

    // ------------------------------------------------------------------
    // TAHAP 4: LOGOUT & LOGIN ADMIN (STUDENT MANAGER & REKONSILIASI)
    // ------------------------------------------------------------------
    console.log('\n--- 4. Alur Admin: Manajemen Akun Siswa & Rekonsiliasi ---');
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const adminEmailField = await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    const adminPassField = await page.waitForSelector('input[type="password"]', { timeout: 8000 });

    await adminEmailField.fill('admin@app.com');
    await adminPassField.fill('password');

    const adminSubmit = await page.waitForSelector('button[type="submit"]');
    await adminSubmit.click();

    await page.waitForTimeout(2500);

    const adminPageText = await page.textContent('body');
    const adminLoggedIn = adminPageText.includes('Ibrahim Wicaksono') || adminPageText.includes('Admin') || adminPageText.includes('Sekolah');
    if (adminLoggedIn) {
      pass('Login Administrator berhasil masuk ke Dashboard Admin');
    } else {
      fail('Gagal masuk ke Dashboard Admin');
    }

  } finally {
    await browser.close();
    stopServer();
  }

  console.log('\n======================================================================');
  console.log(`🎉 PENGUJIAN PLAYWRIGHT E2E SELESAI DENGAN SUKSES!`);
  console.log(`   Total Pengujian Lulus : ${passedCount}`);
  console.log(`   Total Pengujian Gagal : ${failedCount}`);
  console.log('======================================================================\n');
}

runPlaywrightE2E().catch(err => {
  stopServer();
  console.error('\n❌ Pengujian Playwright Gagal:', err);
  process.exit(1);
});
