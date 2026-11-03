import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 5058;
const MOCK_AI_PORT = 5097;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SYNTHETIC_DIR = path.resolve(__dirname, '../data/synthetic_test_hotfix');
const SYNTHETIC_DB_PATH = path.join(SYNTHETIC_DIR, 'database.json');
const SERVER_DIST_PATH = path.resolve(__dirname, '../dist/server.js');

// Mock AI Provider Controller
let mockResponseHandler = (req, res, body) => {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'DeepSeek mock server default offline' } }));
};

let mockAiServer = null;
function startMockAiServer() {
  return new Promise((resolve) => {
    mockAiServer = http.createServer((req, res) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        let body = {};
        try { body = JSON.parse(data); } catch {}
        if (mockResponseHandler) {
          mockResponseHandler(req, res, body);
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'No mock handler configured' } }));
        }
      });
    });
    mockAiServer.listen(MOCK_AI_PORT, '127.0.0.1', () => {
      resolve();
    });
  });
}

function stopMockAiServer() {
  if (mockAiServer) {
    mockAiServer.close();
    mockAiServer = null;
  }
}

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function recordTest(passed, name, detail = '') {
  if (passed) {
    passedCount++;
    testResults.push({ name, status: 'PASS', detail });
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedCount++;
    testResults.push({ name, status: 'FAIL', detail });
    console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, headers: res.headers, body: json };
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex').substring(0, 12);
}

// -------------------------------------------------------------
// Setup Synthetic Database (No Mutation to Production Database)
// -------------------------------------------------------------
function setupSyntheticDatabase() {
  if (fs.existsSync(SYNTHETIC_DIR)) {
    fs.rmSync(SYNTHETIC_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SYNTHETIC_DIR, { recursive: true });

  const schools = [
    { id: 'sch-cirebon-01', name: 'SMK Negeri 1 Cirebon', npsn: '20222001', address: 'Jl. Perjuangan No. 1, Cirebon' },
    { id: 'sch-bandung-02', name: 'SMK Negeri 2 Bandung', npsn: '20222002', address: 'Jl. Cihampelas No. 2, Bandung' },
    { id: 'sch-jakarta-03', name: 'SMK Kimia Industri Jakarta', npsn: '20222003', address: 'Jl. Industri Kimia No. 3, Jakarta' }
  ];

  const classes = [
    { id: 'cls-ka-12-1', name: 'XII Kimia Analitik 1', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', major: 'Kimia Analisis' },
    { id: 'cls-ki-12-2', name: 'XII Kimia Industri 2', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', major: 'Kimia Industri' },
    { id: 'cls-fi-12-1', name: 'XII Farmasi Industri 1', schoolId: 'sch-jakarta-03', schoolName: 'SMK Kimia Industri Jakarta', major: 'Farmasi Industri' }
  ];

  const teachers = [
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', email: 'nurul@smkn1cirebon.sch.id', nip: '197505122000032001', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', password: 'password123' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', email: 'bambang@smkn2bandung.sch.id', nip: '198008152005011004', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', password: 'password123' }
  ];

  const users = [
    { id: 'usr-admin-1', name: 'Ibrahim Wicaksono, S.Pd.', email: 'admin@app.com', role: 'admin', identityNo: '197603152002121001', password: 'password' },
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', email: 'nurul@smkn1cirebon.sch.id', role: 'guru', identityNo: '197505122000032001', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', password: 'password123' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', email: 'bambang@smkn2bandung.sch.id', role: 'guru', identityNo: '198008152005011004', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', password: 'password123' },
    { id: 'usr-std-01', name: 'Ahmad Fadhilah', email: 'ahmad.f@example.com', role: 'siswa', identityNo: 'NIS-2024-001', schoolId: 'sch-cirebon-01', schoolName: 'SMK Negeri 1 Cirebon', classId: 'cls-ka-12-1', className: 'XII Kimia Analitik 1', password: 'password123' },
    { id: 'usr-std-02', name: 'Siti Aisyah', email: 'siti.a@example.com', role: 'siswa', identityNo: 'NIS-2024-002', schoolId: 'sch-bandung-02', schoolName: 'SMK Negeri 2 Bandung', classId: 'cls-ki-12-2', className: 'XII Kimia Industri 2', password: 'password123' },
    { id: 'usr-std-03', name: 'Budi Santoso', email: 'budi.s@example.com', role: 'siswa', identityNo: 'NIS-2024-003', schoolId: 'sch-jakarta-03', schoolName: 'SMK Kimia Industri Jakarta', classId: 'cls-fi-12-1', className: 'XII Farmasi Industri 1', password: 'password123' }
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
    },
    {
      id: 'pkg-teknis-kimia-24',
      code: 'PKG-TK-24',
      title: 'Uji Kompetensi Teknis Kimia Analisis & Industri',
      category: 'teknis',
      durationMinutes: 90,
      totalQuestions: 24,
      questions: [
        {
          id: 'q-chem-1',
          questionText: 'Jelaskan prinsip dasar titrasi asidimetri pada penentuan kadar asam cuka perdagangan!',
          type: 'essay',
          points: 20,
          rubricGuide: 'Rubrik kesesuaian stoikiometri, pemilihan indikator PP, dan teknik pembacaan buret'
        }
      ],
      isActive: true
    }
  ];

  const exams = [
    {
      id: 'ex-ka-01',
      title: 'Ujian Kimia Analisis - Cirebon',
      packageId: 'pkg-teknis-kimia-24',
      schoolId: 'sch-cirebon-01',
      classId: 'cls-ka-12-1',
      teacherId: 'tch-01',
      durationMinutes: 90,
      passingGrade: 75,
      status: 'active'
    },
    {
      id: 'ex-ki-02',
      title: 'Ujian Kimia Industri - Bandung',
      packageId: 'pkg-teknis-kimia-24',
      schoolId: 'sch-bandung-02',
      classId: 'cls-ki-12-2',
      teacherId: 'tch-02',
      durationMinutes: 90,
      passingGrade: 75,
      status: 'active'
    }
  ];

  // 24 Historic Submissions: Persistensi harus mempertahankan semua 24 submission ini
  const submissions = [];
  for (let i = 1; i <= 24; i++) {
    const isCirebon = i % 2 !== 0;
    submissions.push({
      id: `sub-hist-${i.toString().padStart(2, '0')}`,
      examId: isCirebon ? 'ex-ka-01' : 'ex-ki-02',
      examTitle: isCirebon ? 'Ujian Kimia Analisis - Cirebon' : 'Ujian Kimia Industri - Bandung',
      studentId: isCirebon ? 'usr-std-01' : 'usr-std-02',
      studentName: isCirebon ? 'Ahmad Fadhilah' : 'Siti Aisyah',
      studentNis: isCirebon ? 'NIS-2024-001' : 'NIS-2024-002',
      schoolId: isCirebon ? 'sch-cirebon-01' : 'sch-bandung-02',
      schoolName: isCirebon ? 'SMK Negeri 1 Cirebon' : 'SMK Negeri 2 Bandung',
      classId: isCirebon ? 'cls-ka-12-1' : 'cls-ki-12-2',
      className: isCirebon ? 'XII Kimia Analitik 1' : 'XII Kimia Industri 2',
      score: 75 + (i % 20),
      status: 'submitted',
      aiEvaluationStatus: 'completed',
      isTeacherValidated: true,
      submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
      answers: {
        'q-chem-1': {
          questionId: 'q-chem-1',
          answerText: `Jawaban historis nomor ${i}: Titrasi dilakukan dengan larutan standar NaOH sekunder yang telah distandarisasi menggunakan asam oksalat.`,
          multimodalEvidences: []
        }
      }
    });
  }

  // Generate 1 submission with heavy multimodal data (5 MB Base64) to test payload strip
  const dummyHeavyBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(50000); // 50 KB dummy image
  submissions[0].answers['q-chem-1'].multimodalEvidences = [
    {
      id: 'evi-heavy-1',
      fileName: 'grafik_titrasi_berat.jpg',
      mimeType: 'image/jpeg',
      fileData: dummyHeavyBase64,
      storageUrl: '/api/evidence/files/grafik_titrasi_berat.jpg'
    }
  ];

  const syntheticDb = {
    users,
    schools,
    classes,
    teachers,
    packages,
    exams,
    submissions,
    archives: [],
    settings: {
      appName: 'EmployaSkills Test Environment',
      academicYear: '2024/2025',
      allowRegistration: true,
      activeAiProvider: 'deepseek',
      deepseekEnabled: true,
      deepseekApiKey: 'sk-test-deepseek-initial-key-xyz123',
      geminiApiKey: 'AIzaSyTestGeminiInitialKey-abc456',
      geminiModel: 'gemini-2.5-flash',
      deepseekModel: 'deepseek-chat',
      providers: [
        { id: 'deepseek', name: 'DeepSeek', enabled: true, apiKey: 'sk-test-deepseek-initial-key-xyz123' },
        { id: 'gemini', name: 'Gemini', enabled: true, apiKey: 'AIzaSyTestGeminiInitialKey-abc456' }
      ]
    },
    portfolios: [
      {
        id: 'port-1',
        studentId: 'usr-std-01',
        title: 'Laporan Praktikum Titrasi Kompleksometri',
        fileData: 'data:application/pdf;base64,' + 'B'.repeat(30000), // 30 KB
        isValidatedByTeacher: true
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(SYNTHETIC_DB_PATH, JSON.stringify(syntheticDb, null, 2), 'utf8');
  console.log(`[Setup] Basis data sintetis berhasil dibuat di: ${SYNTHETIC_DB_PATH}`);
  console.log(`[Setup] Jumlah entitas awal: Users=${users.length}, Schools=${schools.length}, Classes=${classes.length}, Submissions=${submissions.length}`);
}

// -------------------------------------------------------------
// Process Management for Dedicated Test Server
// -------------------------------------------------------------
let serverProcess = null;

async function startTestServer() {
  console.log(`[Server] Menjalankan backend terbaru (dist/server.js) pada port terisolasi ${TEST_PORT}...`);
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [SERVER_DIST_PATH], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        VOC_DATABASE_PATH: SYNTHETIC_DB_PATH,
        JWT_SECRET: 'super_secure_test_signing_secret_32bytes_long',
        AUTH_SECRET: 'super_secure_test_signing_secret_32bytes_long',
        DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_AI_PORT}`,
        NODE_ENV: 'test'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let resolved = false;

    serverProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      if (!resolved && (stdoutData.includes(`http://localhost:${TEST_PORT}`) || stdoutData.includes('Backend API Server running'))) {
        resolved = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server stderr] ${data.toString().trim()}`);
    });

    serverProcess.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`Server exited prematurely with code ${code}. Output: ${stdoutData}`));
      }
    });

    // Timeout fallback (10 detik)
    setTimeout(async () => {
      if (!resolved) {
        try {
          const res = await fetch(`${BASE_URL}/api/health`);
          if (res.ok) {
            resolved = true;
            resolve();
            return;
          }
        } catch {}
        reject(new Error(`Timeout waiting for test server on port ${TEST_PORT}`));
      }
    }, 10000);
  });
}

function stopTestServer() {
  if (serverProcess) {
    console.log('[Server] Menghentikan server proses uji...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// -------------------------------------------------------------
// Main Test Runner
// -------------------------------------------------------------
async function runAllTests() {
  console.log('======================================================================');
  console.log('🧪 PENGUJIAN OTOMATIS SUITE: PERSISTENSI, INTEGRITAS SEKOLAH & AI');
  console.log(`   Port Terisolasi : ${TEST_PORT}`);
  console.log(`   Basis Data      : Sintetis Terisolasi (${SYNTHETIC_DB_PATH})`);
  console.log('======================================================================\n');

  setupSyntheticDatabase();
  await startMockAiServer();
  await startTestServer();

  try {
    // ------------------------------------------------------------------
    // TAHAP 1: PERSISTENSI DATABASE & PERLINDUNGAN SECRET KEY
    // ------------------------------------------------------------------
    console.log('--- 1. Uji Persistensi CRUD Admin & Proteksi Masked Secret ---');

    // 1.1 Login Admin
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@app.com', password: 'password' }
    });
    recordTest(adminLogin.status === 200 && Boolean(adminLogin.body.token), 'Admin login berhasil pada port terisolasi');
    const adminToken = adminLogin.body.token;

    // 1.2 Admin Menambahkan Sekolah Baru (SMK PGRI 1 Madiun)
    const newSchoolId = 'sch-madiun-persist';
    const addSchoolRes = await request('/api/schools', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: newSchoolId,
        name: 'SMK PGRI 1 Madiun',
        npsn: '20534123',
        address: 'Jl. Mastrip No. 1, Madiun',
        city: 'Madiun'
      }
    });
    recordTest(addSchoolRes.status === 200 && addSchoolRes.body.success, 'Admin sukses membuat sekolah baru via POST /api/schools');

    // 1.3 Admin Menambahkan Kelas Baru
    const newClassId = 'cls-madiun-persist';
    const addClassRes = await request('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: newClassId,
        name: 'XII Kimia Industri Madiun 1',
        schoolId: newSchoolId,
        schoolName: 'SMK PGRI 1 Madiun',
        major: 'Kimia Industri'
      }
    });
    recordTest(addClassRes.status === 200 && addClassRes.body.success, 'Admin sukses membuat kelas baru via POST /api/classes');

    // 1.4 Admin Menambahkan Guru Baru
    const newTeacherEmail = 'guru.madiun.persist@smkpgri1madiun.sch.id';
    const addTeacherRes = await request('/api/teachers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: 'tch-madiun-persist',
        name: 'Drs. Joko Sutrisno, M.T.',
        email: newTeacherEmail,
        nip: '197902152003121002',
        schoolId: newSchoolId,
        schoolName: 'SMK PGRI 1 Madiun',
        password: 'passwordGuruMadiun123'
      }
    });
    recordTest(addTeacherRes.status === 200 && addTeacherRes.body.success, 'Admin sukses membuat guru baru via POST /api/teachers');

    // 1.5 Update Pengaturan API Key dengan Kunci Rahasia Asli
    const testSecretDeepSeek = 'sk-test-deepseek-live-secret-key-abcdef';
    const testSecretGemini = 'AIzaSyTestGeminiLiveKey-1234567890';
    const initialDeepSeekHash = hashSecret(testSecretDeepSeek);
    const initialGeminiHash = hashSecret(testSecretGemini);

    const updateSettingsRes = await request('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        appName: 'EmployaSkills Persisten Live',
        deepseekApiKey: testSecretDeepSeek,
        geminiApiKey: testSecretGemini,
        activeAiProvider: 'deepseek',
        deepseekEnabled: true
      }
    });
    recordTest(updateSettingsRes.status === 200, 'Admin sukses memperbarui konfigurasi API key via PUT /api/settings');

    // 1.6 GET /api/settings: Verifikasi Kunci Dimasking dan Tidak Bocor
    const getSettingsRes = await request('/api/settings', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const maskedSettings = getSettingsRes.body.settings;
    const isMaskedOrHidden = (key) => !key || key.includes('***') || key === '********';
    recordTest(
      isMaskedOrHidden(maskedSettings.geminiApiKey) && isMaskedOrHidden(maskedSettings.deepseekApiKey),
      'GET /api/settings memasking API keys sehingga rahasia tidak bocor ke publik'
    );

    // 1.7 Simpan Form Pengaturan Umum dengan Nilai Masking '********'
    const updateGeneralRes = await request('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        appName: 'EmployaSkills Terverifikasi Anti-Overwrite',
        geminiApiKey: '********',
        deepseekApiKey: '********'
      }
    });
    recordTest(updateGeneralRes.status === 200, 'Simulasi penyimpanan form admin dengan masked key berhasil');

    // 1.8 Restart Server: Hentikan server lalu jalankan kembali untuk uji persistensi disk
    console.log('\n[Restart Server] Memulai ulang proses backend untuk memverifikasi pembacaan dari database disk...');
    stopTestServer();
    await new Promise(r => setTimeout(r, 1000));
    await startTestServer();

    // 1.9 Verifikasi Disk Persistence Setelah Restart
    const dbOnDisk = JSON.parse(fs.readFileSync(SYNTHETIC_DB_PATH, 'utf8'));
    const schoolFound = dbOnDisk.schools.find(s => s.id === newSchoolId);
    const classFound = dbOnDisk.classes.find(c => c.id === newClassId);
    const teacherFound = dbOnDisk.teachers.find(t => t.email === newTeacherEmail);
    const teacherUserFound = dbOnDisk.users.find(u => u.email === newTeacherEmail);

    recordTest(Boolean(schoolFound), 'Sekolah baru persisten di disk setelah restart backend');
    recordTest(Boolean(classFound), 'Kelas baru persisten di disk setelah restart backend');
    recordTest(Boolean(teacherFound && teacherUserFound), 'Guru baru & akun user login persisten di disk setelah restart backend');

    // Verifikasi proteksi secret key tanpa mencetak kunci asli
    const diskDeepSeekKey = dbOnDisk.settings?.deepseekApiKey || '';
    const diskGeminiKey = dbOnDisk.settings?.geminiApiKey || '';
    const deepSeekHashMatch = hashSecret(diskDeepSeekKey) === initialDeepSeekHash;
    const geminiHashMatch = hashSecret(diskGeminiKey) === initialGeminiHash;

    recordTest(
      deepSeekHashMatch && geminiHashMatch,
      'Kunci API asli DeepSeek & Gemini di disk tidak tertimpa oleh masked value "********"',
      `deepseekHashMatch=${deepSeekHashMatch}, geminiHashMatch=${geminiHashMatch}`
    );

    // ------------------------------------------------------------------
    // TAHAP 2: AUTENTIKASI API & RBAC GURU (ELIMINASI HTTP 401)
    // ------------------------------------------------------------------
    console.log('\n--- 2. Uji Autentikasi Guru & Eliminasi Galat HTTP 401 ---');

    // Login dengan guru yang baru dibuat dan dipersistenkan
    const teacherLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: newTeacherEmail, password: 'passwordGuruMadiun123' }
    });
    recordTest(teacherLogin.status === 200 && Boolean(teacherLogin.body.token), 'Guru baru login berhasil dengan kredensial persisten');
    const teacherToken = teacherLogin.body.token;

    // GET /api/schools
    const tSchoolsRes = await request('/api/schools', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(tSchoolsRes.status === 200 && Array.isArray(tSchoolsRes.body.schools), 'Guru dapat mengakses GET /api/schools tanpa 401');

    // GET /api/classes
    const tClassesRes = await request('/api/classes', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(tClassesRes.status === 200 && Array.isArray(tClassesRes.body.classes), 'Guru dapat mengakses GET /api/classes tanpa 401');

    // GET /api/teachers
    const tTeachersRes = await request('/api/teachers', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(tTeachersRes.status === 200 && Array.isArray(tTeachersRes.body.teachers), 'Guru dapat mengakses GET /api/teachers tanpa 401');

    // GET /api/settings
    const tSettingsRes = await request('/api/settings', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(tSettingsRes.status === 200 && Boolean(tSettingsRes.body.settings), 'Guru dapat mengakses GET /api/settings tanpa 401');

    // Penolakan Akses Siswa pada Endpoint Khusus Admin (HTTP 403)
    const stdLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'ahmad.f@example.com', password: 'password123' }
    });
    const stdToken = stdLogin.body.token;

    const stdForbiddenSchool = await request('/api/schools', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stdToken}` },
      body: { id: 'sch-illegal', name: 'Sekolah Ilegal' }
    });
    recordTest(stdForbiddenSchool.status === 403, 'Siswa ditolak (HTTP 403) saat mencoba membuat sekolah (RBAC Enforced)');

    // ------------------------------------------------------------------
    // TAHAP 3: RELASI SEKOLAH & KELAS SISWA (REKONSILIASI SISWA YATIM)
    // ------------------------------------------------------------------
    console.log('\n--- 3. Uji Relasi Sekolah/Kelas & Rekonsiliasi Siswa Yatim ---');

    // 3.1 Daftarkan akun siswa dengan relasi kelas yatim (tanpa sekolah sah)
    const orphanEmail = 'dewi.sartika.madiun@example.com';
    const orphanClassId = 'cls-orphan-1793636832069';
    const regOrphanRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Dewi Sartika (Siswa Madiun Asal)',
        email: orphanEmail,
        identityNo: 'NIS-MADIUN-888',
        schoolId: null,
        schoolName: null,
        classId: orphanClassId,
        className: 'XII Kimia Mandiri',
        password: 'passwordDewi123'
      }
    });
    recordTest(regOrphanRes.status === 200 && Boolean(regOrphanRes.body.token), 'Registrasi siswa dengan rombel yatim berhasil');
    const orphanToken = regOrphanRes.body.token;
    const orphanUserId = regOrphanRes.body.user.id;

    // 3.2 Periksa Bootstrap Siswa Yatim
    const orphanBootstrap = await request('/api/bootstrap', {
      headers: { Authorization: `Bearer ${orphanToken}` }
    });
    const orphanData = orphanBootstrap.body.data || orphanBootstrap.body;
    const orphanInBootstrap = (orphanData.users || []).find(u => u.id === orphanUserId);

    recordTest(
      orphanInBootstrap?.className !== 'XII Kimia Analitik 1',
      'Siswa yatim TIDAK otomatis fallback ke kelas Bandung (XII Kimia Analitik 1)'
    );
    recordTest(
      orphanInBootstrap?.schoolName !== 'SMK Negeri 1 Kimia Industri Bandung' &&
      orphanInBootstrap?.schoolName !== 'SMK Negeri 2 Bandung',
      'Siswa yatim TIDAK otomatis fallback ke sekolah Bandung'
    );
    recordTest(
      Boolean(orphanInBootstrap?.needsReconciliation || orphanInBootstrap?.isOrphanClass),
      'Siswa yatim ditandai needsReconciliation / isOrphanClass untuk rekonsiliasi admin'
    );

    // 3.3 Buat Ujian Khusus Bandung dan Ujian Khusus Madiun
    const madiunExamId = 'ex-madiun-persist-01';
    await request('/api/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: madiunExamId,
        title: 'Ujian Kimia Analisis Madiun',
        packageId: 'pkg-teknis-kimia-24',
        schoolId: newSchoolId,
        classId: newClassId,
        durationMinutes: 45,
        passingGrade: 75,
        status: 'active'
      }
    });

    // Siswa yatim belum terekonsiliasi tidak boleh melihat ujian khusus kelas Bandung
    const examsInBootstrap = orphanData.exams || [];
    const leaksBandungExam = examsInBootstrap.some(e => e.classId === 'cls-ki-12-2' && e.schoolId === 'sch-bandung-02');
    recordTest(!leaksBandungExam, 'Siswa belum terekonsiliasi TIDAK dapat melihat ujian khusus kelas/sekolah lain');

    // 3.4 Admin Melakukan Rekonsiliasi Siswa ke SMK PGRI 1 Madiun
    const reconcileRes = await request(`/api/auth/users/${orphanUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        schoolId: newSchoolId,
        schoolName: 'SMK PGRI 1 Madiun',
        classId: newClassId,
        className: 'XII Kimia Industri Madiun 1'
      }
    });
    recordTest(reconcileRes.status === 200 && reconcileRes.body.success, 'Admin sukses merekonsiliasi siswa via PUT /api/auth/users/:id');

    // 3.5 Verifikasi Bootstrap Siswa Setelah Rekonsiliasi
    const studentReLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: orphanEmail, password: 'passwordDewi123' }
    });
    const reconciledToken = studentReLogin.body.token;

    const reconciledBootstrap = await request('/api/bootstrap', {
      headers: { Authorization: `Bearer ${reconciledToken}` }
    });
    const reconciledData = reconciledBootstrap.body.data || reconciledBootstrap.body;
    const reconciledUser = (reconciledData.users || []).find(u => u.id === orphanUserId);

    recordTest(
      reconciledUser?.schoolId === newSchoolId && reconciledUser?.classId === newClassId,
      'Profil siswa setelah rekonsiliasi memiliki sekolah & kelas sah',
      `schoolId=${reconciledUser?.schoolId}, classId=${reconciledUser?.classId}`
    );

    // ------------------------------------------------------------------
    // TAHAP 4: OPTIMASI PAYLOAD BOOTSTRAP SISWA (< 150 KB)
    // ------------------------------------------------------------------
    console.log('\n--- 4. Uji Reduksi Ukuran Payload /api/bootstrap (< 150 KB) ---');

    const bootstrapRaw = JSON.stringify(reconciledBootstrap.body);
    const bootstrapSizeBytes = Buffer.byteLength(bootstrapRaw, 'utf8');
    const bootstrapSizeKB = (bootstrapSizeBytes / 1024).toFixed(2);
    console.log(`   Ukuran payload /api/bootstrap: ${bootstrapSizeKB} KB (${bootstrapSizeBytes} bytes)`);

    recordTest(
      bootstrapSizeBytes < 500 * 1024,
      `Payload bootstrap di bawah batas aman 500 KB (${bootstrapSizeKB} KB)`
    );
    recordTest(
      bootstrapSizeBytes < 150 * 1024,
      `Payload bootstrap memenuhi target optimasi ramping < 150 KB (${bootstrapSizeKB} KB)`
    );

    // Pastikan berkas Base64 pada portofolio dan multimodal evidence di-strip dari bootstrap
    const sampleSub = (reconciledData.submissions || []).find(s => s.id === 'sub-hist-01');
    const eviItem = sampleSub?.answers?.['q-chem-1']?.multimodalEvidences?.[0];
    recordTest(
      !eviItem?.fileData || eviItem.fileData === '',
      'fileData Base64 pada multimodal evidence di-strip dari respons bootstrap'
    );

    // ------------------------------------------------------------------
    // TAHAP 5: ISOLASI MULTI-TENANT SUBMISSION & AKSES GURU
    // ------------------------------------------------------------------
    console.log('\n--- 5. Uji Isolasi Multi-Tenant Submission Antar Sekolah ---');

    // Siswa Madiun membuat submission untuk ujian Madiun (memiliki butir esai riil)
    const madiunSubId = 'sub-madiun-live-01';
    const makeSubRes = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${reconciledToken}` },
      body: {
        id: madiunSubId,
        examId: madiunExamId,
        examTitle: 'Ujian Kimia Analisis Madiun',
        answers: {
          'q-chem-1': {
            questionId: 'q-chem-1',
            essayAnswer: 'Analisis stoikiometri titrasi asam-basa menggunakan larutan standar NaOH sekunder yang distandarisasi.',
            answerText: 'Analisis stoikiometri titrasi asam-basa menggunakan larutan standar NaOH sekunder yang distandarisasi.',
            multimodalEvidences: []
          }
        },
        status: 'submitted',
        isTeacherValidated: false
      }
    });
    recordTest(makeSubRes.status === 200, 'Siswa Madiun sukses membuat submission dengan jawaban esai riil');

    // Guru Bandung mencoba mengakses submission siswa Madiun via GET /api/submissions/:id
    const bandungTeacherLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'bambang@smkn2bandung.sch.id', password: 'password123' }
    });
    const bandungTeacherToken = bandungTeacherLogin.body.token;

    const crossSchoolAccess = await request(`/api/submissions/${madiunSubId}`, {
      headers: { Authorization: `Bearer ${bandungTeacherToken}` }
    });
    recordTest(
      crossSchoolAccess.status === 403,
      `Guru Bandung DITOLAK (HTTP 403) saat mengakses submission siswa Madiun (Status: ${crossSchoolAccess.status})`
    );

    // Guru Madiun mengakses submission siswa Madiun
    const validSchoolAccess = await request(`/api/submissions/${madiunSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(
      validSchoolAccess.status === 200 && Boolean(validSchoolAccess.body.submission),
      'Guru Madiun DIIZINKAN (HTTP 200) mengakses submission siswanya sendiri'
    );

    // ------------------------------------------------------------------
    // TAHAP 6: PIPELINE AI SCORING & ZERO FAKE SCORES
    // ------------------------------------------------------------------
    console.log('\n--- 6. Uji Integritas AI Scoring & Larangan Skor Palsu ---');

    // 6.1 Uji Endpoint Evaluasi Esai saat Provider Gagal (DeepSeek HTTP 500)
    mockResponseHandler = (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'DeepSeek internal 500 error simulation' } }));
    };

    const essayEvalRes = await request('/api/ai/evaluate-essay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        questionId: 'q-chem-1',
        questionText: 'Jelaskan prinsip dasar titrasi asidimetri pada penentuan kadar asam cuka perdagangan!',
        studentAnswer: 'Titrasi dilakukan dengan menambahkan larutan standar basa NaOH ke dalam sampel asam hingga mencapai titik ekivalen yang ditandai perubahan warna fenolftalein dari tak berwarna menjadi merah muda pucat.',
        rubricGuide: 'Rubrik kesesuaian stoikiometri dan teknik titrasi asam basa',
        maxScore: 20
      }
    });
    recordTest(
      essayEvalRes.status === 200 &&
      essayEvalRes.body.success === false &&
      essayEvalRes.body.evaluation?.status === 'failed',
      'Endpoint evaluate-essay mengembalikan success=false dan status=failed saat provider offline/error'
    );
    recordTest(
      essayEvalRes.body.evaluation?.estimatedScore === undefined &&
      Array.isArray(essayEvalRes.body.evaluation?.rubricScores) &&
      essayEvalRes.body.evaluation.rubricScores.length === 0,
      'Endpoint evaluate-essay TIDAK menghasilkan skor estimasi palsu atau rincian indikator palsu saat error'
    );

    // 6.2 Uji Evaluasi Submission saat Provider Gagal (HTTP 500 / 401 / Timeout)
    const subAiRes = await request(`/api/ai/evaluate-submission/${madiunSubId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { forceSync: true }
    });
    recordTest(
      subAiRes.status === 200 || subAiRes.status === 202,
      `Permintaan evaluasi AI submission diterima dengan baik (Status: ${subAiRes.status})`
    );

    // Verifikasi Ketat Kegagalan AI: status failed, score undefined, status perlu_pemeriksaan
    const checkSub = await request(`/api/submissions/${madiunSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const subRecord = checkSub.body.submission;
    recordTest(
      subRecord?.aiGradingStatus === 'failed',
      'Submission dengan kegagalan esai AI secara tegas berstatus aiGradingStatus="failed"'
    );
    recordTest(
      subRecord?.requiresTeacherReview === true && subRecord?.isScoreFinal === false,
      'Kegagalan AI ditandai requiresTeacherReview=true dan isScoreFinal=false'
    );
    recordTest(
      subRecord?.status === 'perlu_pemeriksaan' && subRecord?.hasPendingComponents === true,
      'Submission dengan kegagalan AI otomatis berstatus perlu_pemeriksaan dan hasPendingComponents=true'
    );
    recordTest(
      subRecord?.answers?.['q-chem-1']?.score === undefined && subRecord?.answers?.['q-chem-1']?.isPendingEvaluation === true,
      'Kegagalan AI TIDAK menghasilkan nilai angka buatan/palsu (score: undefined, isPendingEvaluation: true)'
    );

    // 6.3 Uji Kegagalan Sebagian (Partial Failure Multi-Komponen: 1 Sukses, 1 Gagal)
    console.log('\n--- 6.3 Uji Kegagalan Sebagian pada Submission Multi-Komponen Esai ---');
    const multiExamId = 'ex-multi-essay-madiun';
    await request('/api/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: multiExamId,
        title: 'Ujian Komprehensif Analisis & K3 Madiun',
        packageId: 'pkg-teknis-kimia-24',
        schoolId: newSchoolId,
        classId: newClassId,
        questionSnapshot: [
          {
            id: 'q-multi-1',
            type: 'essay',
            questionText: 'Soal 1 Teori Reaksi Netralisasi Asam Basa',
            points: 10,
            maxScore: 10,
            rubricGuide: 'Rubrik konsep reaksi'
          },
          {
            id: 'q-multi-2',
            type: 'essay',
            questionText: 'Soal 2 Prosedur K3 dan Penanganan Limbah',
            points: 10,
            maxScore: 10,
            rubricGuide: 'Rubrik kepatuhan K3'
          }
        ],
        durationMinutes: 60,
        passingGrade: 75,
        status: 'active'
      }
    });

    const multiSubId = 'sub-multi-partial-01';
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${reconciledToken}` },
      body: {
        id: multiSubId,
        examId: multiExamId,
        examTitle: 'Ujian Komprehensif Analisis & K3 Madiun',
        answers: {
          'q-multi-1': {
            questionId: 'q-multi-1',
            essayAnswer: 'Reaksi netralisasi menghasilkan garam dan air dengan pelepasan kalor netralisasi.',
            multimodalEvidences: []
          },
          'q-multi-2': {
            questionId: 'q-multi-2',
            essayAnswer: 'Limbah sisa titrasi dinetralkan dalam bak penampung sebelum dibuang ke saluran IPAL.',
            multimodalEvidences: []
          }
        },
        status: 'submitted',
        isTeacherValidated: false
      }
    });

    // Mock: Soal 1 Sukses (HTTP 200 skor 8), Soal 2 Gagal (HTTP 500)
    mockResponseHandler = (req, res, body) => {
      const userMsg = body.messages?.find(m => m.role === 'user')?.content || '';
      if (userMsg.includes('Soal 1')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  total_score: 8,
                  scoring_reason: 'Konsep netralisasi dijelaskan dengan tepat',
                  feedback: 'Bagus, penjelasan reaksi eksoterm tepat',
                  rubric_scores: [{ indicator: 'Konsep', score: 8, maxScore: 10, feedback: 'Tepat' }],
                  requires_teacher_review: false
                })
              }
            }
          ]
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'DeepSeek downstream error pada Soal 2' } }));
      }
    };

    await request(`/api/ai/evaluate-submission/${multiSubId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { forceSync: true }
    });

    const checkMultiSub = await request(`/api/submissions/${multiSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const multiRecord = checkMultiSub.body.submission;
    recordTest(
      multiRecord?.aiGradingStatus === 'failed',
      'Submission dengan kegagalan sebagian DILARANG ditandai completed (aiGradingStatus="failed")'
    );
    recordTest(
      multiRecord?.hasPendingComponents === true && multiRecord?.isScoreFinal === false,
      'Submission kegagalan sebagian mempertahankan hasPendingComponents=true dan isScoreFinal=false'
    );
    recordTest(
      multiRecord?.answers?.['q-multi-1']?.score === 8 && multiRecord?.answers?.['q-multi-1']?.isPendingEvaluation === false,
      'Komponen yang berhasil dinilai mempertahankan skor sah (Soal 1: skor 8, isPendingEvaluation=false)'
    );
    recordTest(
      multiRecord?.answers?.['q-multi-2']?.score === undefined && multiRecord?.answers?.['q-multi-2']?.isPendingEvaluation === true,
      'Komponen yang gagal TIDAK menerima skor palsu (Soal 2: score undefined, isPendingEvaluation=true)'
    );

    // 6.4 Uji Keberhasilan Penuh Provider (Seluruh Komponen Berhasil Dinilai)
    console.log('\n--- 6.4 Uji Keberhasilan Provider Penuh (Seluruh Komponen Sukses) ---');
    mockResponseHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                total_score: 18,
                scoring_reason: 'Semua indikator rubrik dipenuhi secara komprehensif',
                feedback: 'Analisis stoikiometri dan buret sangat tepat',
                rubric_scores: [
                  { indicator: 'Stoikiometri', score: 9, maxScore: 10, feedback: 'Sangat baik' },
                  { indicator: 'K3 & Buret', score: 9, maxScore: 10, feedback: 'Sangat teliti' }
                ],
                requires_teacher_review: false
              })
            }
          }
        ]
      }));
    };

    const successExamId = 'ex-madiun-success-01';
    await request('/api/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: successExamId,
        title: 'Ujian Kimia Analisis Sukses Madiun',
        packageId: 'pkg-teknis-kimia-24',
        schoolId: newSchoolId,
        classId: newClassId,
        durationMinutes: 45,
        passingGrade: 75,
        status: 'active'
      }
    });

    const successSubId = 'sub-madiun-success-01';
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${reconciledToken}` },
      body: {
        id: successSubId,
        examId: successExamId,
        examTitle: 'Ujian Kimia Analisis Sukses Madiun',
        answers: {
          'q-chem-1': {
            questionId: 'q-chem-1',
            essayAnswer: 'Standarisasi larutan NaOH menggunakan asam oksalat baku primer dengan indikator PP.',
            multimodalEvidences: []
          }
        },
        status: 'submitted',
        isTeacherValidated: false
      }
    });

    await request(`/api/ai/evaluate-submission/${successSubId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { forceSync: true }
    });

    const checkSuccessSub = await request(`/api/submissions/${successSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const successRecord = checkSuccessSub.body.submission;
    recordTest(
      successRecord?.aiGradingStatus === 'completed',
      'Status aiGradingStatus="completed" HANYA diberikan jika seluruh komponen esai berhasil dinilai sah'
    );
    recordTest(
      successRecord?.answers?.['q-chem-1']?.score === 18 && successRecord?.hasPendingComponents === false,
      'Skor esai sah tercatat persisten (skor: 18) dan hasPendingComponents=false'
    );

    // 6.5 Validasi Skor oleh Guru (Manual Override & Approval)
    const updateScoreRes = await request(`/api/submissions/${madiunSubId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        ...subRecord,
        score: 88,
        isTeacherValidated: true,
        teacherNotes: 'Validasi guru: Argumen stoikiometri dan indikator tepat.'
      }
    });
    recordTest(updateScoreRes.status === 200, 'Guru sukses memvalidasi dan mengesahkan skor submission');

    const verifyValidatedSub = await request(`/api/submissions/${madiunSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest(
      verifyValidatedSub.body.submission?.isTeacherValidated === true && verifyValidatedSub.body.submission?.score === 88,
      'Status validasi guru dan skor tervalidasi tersimpan secara persisten'
    );

    // ------------------------------------------------------------------
    // TAHAP 7: UJI OTORISASI & PEMULIHAN DRAFT AUTOSAVE SERVER
    // ------------------------------------------------------------------
    console.log('\n--- 7. Uji Otorisasi & Pemulihan Endpoint Autosave Draft ---');

    const draftExamId = 'ex-madiun-draft-01';
    await request('/api/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: draftExamId,
        title: 'Ujian Autosave Draft Madiun',
        packageId: 'pkg-teknis-kimia-24',
        schoolId: newSchoolId,
        classId: newClassId,
        durationMinutes: 45,
        passingGrade: 75,
        status: 'active'
      }
    });

    // 7.1 Tanpa Login: Ditolak HTTP 401
    const unauthPostDraft = await request(`/api/exams/${draftExamId}/draft`, {
      method: 'POST',
      body: { answers: { 'q-01': { selectedOption: 'A' } } }
    });
    recordTest(unauthPostDraft.status === 401, 'POST /api/exams/:id/draft tanpa login ditolak HTTP 401');

    const unauthGetDraft = await request(`/api/exams/${draftExamId}/draft`);
    recordTest(unauthGetDraft.status === 401, 'GET /api/exams/:id/draft tanpa login ditolak HTTP 401');

    // 7.2 Isolasi Antar-Siswa / Antar-Sekolah: Siswa Cirebon akses Ujian Bandung ditolak HTTP 403
    const stdCirebonLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'ahmad.f@example.com', password: 'password123' }
    });
    const stdCirebonToken = stdCirebonLogin.body.token;

    const crossSchoolDraft = await request('/api/exams/ex-ki-02/draft', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stdCirebonToken}` },
      body: { answers: { 'q-01': { selectedOption: 'B' } } }
    });
    recordTest(
      crossSchoolDraft.status === 403,
      `Siswa Cirebon DITOLAK (HTTP 403) saat menyimpan draf ke ujian sekolah Bandung (Status: ${crossSchoolDraft.status})`
    );

    // 7.3 Guru Sekolah Lain DITOLAK (HTTP 403) saat mengintip draf siswa sekolah binaan lain
    const teacherCrossDraft = await request(`/api/exams/${draftExamId}/draft?studentId=usr-std-01`, {
      headers: { Authorization: `Bearer ${bandungTeacherToken}` }
    });
    recordTest(
      teacherCrossDraft.status === 403,
      `Guru Bandung DITOLAK (HTTP 403) saat mengakses draf siswa sekolah lain (Status: ${teacherCrossDraft.status})`
    );

    // 7.4 Siswa Madiun Menyimpan & Memulihkan Draf Pilihan Ganda Kompleks (2 Opsi Terpilih)
    const complexDraftAnswers = {
      'q-complex-1': {
        questionId: 'q-complex-1',
        selectedOptions: [
          'A. Memakai kacamata pelindung (goggles)',
          'B. Menyalakan blower exhaust fan laboratorium'
        ]
      }
    };
    const saveDraftRes = await request(`/api/exams/${draftExamId}/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${reconciledToken}` },
      body: {
        answers: complexDraftAnswers,
        currentQuestionIndex: 2
      }
    });
    recordTest(saveDraftRes.status === 200 && saveDraftRes.body.success, 'Siswa Madiun sukses autosave draf Pilihan Ganda Kompleks ke server');

    const getDraftRes = await request(`/api/exams/${draftExamId}/draft`, {
      headers: { Authorization: `Bearer ${reconciledToken}` }
    });
    const restoredOptions = getDraftRes.body?.draft?.answers?.['q-complex-1']?.selectedOptions;
    recordTest(
      Array.isArray(restoredOptions) &&
      restoredOptions.length === 2 &&
      restoredOptions.includes('A. Memakai kacamata pelindung (goggles)') &&
      restoredOptions.includes('B. Menyalakan blower exhaust fan laboratorium'),
      'Kedua opsi Pilihan Ganda Kompleks pulih 100% utuh dari server draft autosave'
    );

    // ------------------------------------------------------------------
    // TAHAP 8: PERLINDUNGAN SUBMISSION HISTORIS (24 DATA HISTORIS)
    // ------------------------------------------------------------------
    console.log('\n--- 8. Uji Perlindungan Data Submission Historis (24 Submissions) ---');

    const finalBootstrap = await request('/api/bootstrap', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const finalData = finalBootstrap.body.data || finalBootstrap.body;
    const totalSubmissions = (finalData.submissions || []).length;
    
    // Harus mempertahankan 24 submission historis + 1 submission baru yang dibuat saat pengujian
    recordTest(
      totalSubmissions >= 25,
      `Seluruh 24 submission historis terlindungi dan tetap utuh di database (Total sekarang: ${totalSubmissions})`
    );

    // Periksa konsistensi submission historis pertama
    const hist01 = (finalData.submissions || []).find(s => s.id === 'sub-hist-01');
    recordTest(
      Boolean(hist01 && hist01.score > 0 && hist01.studentName === 'Ahmad Fadhilah'),
      'Integritas data siswa dan nilai pada submission historis tidak hilang atau termutasi'
    );

  } finally {
    stopTestServer();
    stopMockAiServer();
  }

  // ------------------------------------------------------------------
  // RINGKASAN HASIL PENGUJIAN
  // ------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`🎉 SELURUH PENGUJIAN LULUS DENGAN SUKSES!`);
  console.log(`   Total Pengujian Lulus : ${passedCount}`);
  console.log(`   Total Pengujian Gagal : ${failedCount}`);
  console.log('======================================================================\n');

  return { passedCount, failedCount, testResults };
}

runAllTests().catch(err => {
  stopTestServer();
  stopMockAiServer();
  console.error('\n❌ Pengujian Terhenti dengan Galat:', err);
  process.exit(1);
});
