/**
 * TEST AI MOCK PIPELINE - EMPLOYASKILLS
 * 
 * Pengujian komprehensif alur penilaian AI dengan Mock Provider:
 * 1. DeepSeek Evaluator (Positive, Negative 500/401, Irrelevant Text)
 * 2. Gemini Vision OCR -> DeepSeek Scoring (2-Stage Pipeline)
 * 3. Gemini STT Audio -> DeepSeek Scoring (2-Stage Pipeline)
 * 4. Jaminan Zero Fake Score saat Provider Gagal
 * 5. Jaminan Status 'completed' hanya saat Evaluasi Benar-Benar Berhasil
 * 6. Perlindungan Rahasia API Key (Masking)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import assert from 'assert';

const MOCK_PORT = 5098;
const TEST_BACKEND_PORT = 5059;
const BACKEND_BASE = `http://127.0.0.1:${TEST_BACKEND_PORT}`;

// State Provider Mock
const mockState = {
  deepseekMode: 'SUCCESS_TEXT', // 'SUCCESS_TEXT' | 'FAIL_500' | 'FAIL_401' | 'IRRELEVANT'
  geminiMode: 'SUCCESS_OCR',     // 'SUCCESS_OCR' | 'FAIL_OCR_UNREADABLE' | 'FAIL_503' | 'SUCCESS_STT' | 'FAIL_STT_INAUDIBLE'
  calls: {
    deepseek: [],
    gemini: []
  }
};

function resetMockCalls() {
  mockState.calls.deepseek = [];
  mockState.calls.gemini = [];
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plain, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

// -------------------------------------------------------------
// HTTP Mock Server untuk DeepSeek dan Gemini
// -------------------------------------------------------------
const mockServer = http.createServer((req, res) => {
  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(bodyChunks).toString('utf8');
    let parsedBody = {};
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {}

    const url = req.url || '';

    // 1. MOCK DEEPSEEK (/chat/completions)
    if (url.includes('/chat/completions')) {
      mockState.calls.deepseek.push({
        method: req.method,
        headers: req.headers,
        body: parsedBody
      });

      if (mockState.deepseekMode === 'FAIL_500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'DeepSeek internal upstream 500 error' } }));
      }

      if (mockState.deepseekMode === 'FAIL_401') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Authentication error: Invalid DeepSeek API Key' } }));
      }

      if (mockState.deepseekMode === 'IRRELEVANT') {
        const irrelevantReply = {
          total_score: 0,
          scoring_reason: 'Jawaban siswa sama sekali tidak relevan dengan konteks kimia analitik dan K3.',
          feedback: 'Jawaban menyimpang dari materi titrasi dan SOP laboratorium.',
          rubric_scores: [
            { indicator: 'Ketepatan Konsep', score: 0, maxScore: 4, feedback: 'Konsep tidak sesuai' },
            { indicator: 'Prosedur & K3', score: 0, maxScore: 3, feedback: 'Tidak ada prosedur K3' },
            { indicator: 'Analisis & Kesimpulan', score: 0, maxScore: 3, feedback: 'Tidak ada analisis' }
          ],
          requires_teacher_review: true
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          id: 'mock-ds-irrelevant',
          choices: [{ message: { role: 'assistant', content: JSON.stringify(irrelevantReply) } }]
        }));
      }

      // Default: SUCCESS_TEXT
      const successReply = {
        total_score: 9,
        scoring_reason: 'Penjelasan prinsip titrasi asidimetri, titik akhir, dan larutan standar NaOH akurat.',
        feedback: 'Pemahaman konsep sangat baik. Lengkapi dengan detail rumus normalitas.',
        rubric_scores: [
          { indicator: 'Ketepatan Konsep', score: 4, maxScore: 4, feedback: 'Sangat tepat' },
          { indicator: 'Prosedur & K3', score: 3, maxScore: 3, feedback: 'Prosedur sesuai SOP' },
          { indicator: 'Analisis & Kesimpulan', score: 2, maxScore: 3, feedback: 'Cukup tajam' }
        ],
        requires_teacher_review: false
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        id: 'mock-ds-success',
        choices: [{ message: { role: 'assistant', content: JSON.stringify(successReply) } }]
      }));
    }

    // 2. MOCK GEMINI (:generateContent)
    if (url.includes(':generateContent')) {
      mockState.calls.gemini.push({
        method: req.method,
        url,
        body: parsedBody
      });

      if (mockState.geminiMode === 'FAIL_503') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Gemini service temporarily overloaded (503)' } }));
      }

      if (mockState.geminiMode === 'FAIL_OCR_UNREADABLE') {
        const unreadableReply = {
          extracted_text: '',
          is_readable: false,
          unreadable_reason: 'Foto lembar jawaban buram, gelap, dan tulisan tangan tidak terbaca'
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(unreadableReply) }] } }]
        }));
      }

      if (mockState.geminiMode === 'FAIL_STT_INAUDIBLE') {
        const inaudibleReply = {
          transcript: '',
          audio_clarity: 'inaudible',
          is_inaudible: true,
          inaudible_reason: 'Rekaman hanya memuat suara bising statis tanpa percakapan yang jelas'
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(inaudibleReply) }] } }]
        }));
      }

      if (mockState.geminiMode === 'SUCCESS_STT') {
        const sttReply = {
          transcript: 'Prinsip asidimetri adalah penentuan kadar basa menggunakan larutan standar asam seperti HCl yang telah distandarisasi.',
          audio_clarity: 'clear',
          is_inaudible: false,
          inaudible_reason: null
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(sttReply) }] } }]
        }));
      }

      // Default: SUCCESS_OCR
      const ocrReply = {
        extracted_text: 'CH3COOH + NaOH -> CH3COONa + H2O. V_titrasi = 10.2 mL, N_NaOH = 0.100 N.',
        is_readable: true,
        unreadable_reason: null
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(ocrReply) }] } }]
      }));
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint mock tidak ditemukan' }));
  });
});

async function request(path, options = {}) {
  const url = `${BACKEND_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMockAIPipelineTests() {
  console.log('======================================================================');
  console.log('🧪 PENGUJIAN MOCK PROVIDER AI: DEEPSEEK & GEMINI 2-STAGE PIPELINE');
  console.log('======================================================================\n');

  // 1. Jalankan Mock Server
  await new Promise(resolve => mockServer.listen(MOCK_PORT, '127.0.0.1', resolve));
  console.log(`[Mock Server] Berjalan pada http://127.0.0.1:${MOCK_PORT}`);

  // 2. Siapkan direktori data sintetis terisolasi untuk backend uji
  const testDir = path.resolve('data_synthetic_ai_mock_' + Date.now());
  const evidenceDir = path.join(testDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const standardQuestionSnapshot = [
    {
      id: 'q-01',
      type: 'essay',
      questionText: 'Jelaskan prinsip titrasi asidimetri pada penetapan kadar asam cuka perdagangan!',
      maxScore: 10,
      rubricComponents: [
        { name: 'Ketepatan Konsep', maxPoints: 4, criteria: 'Konsep titrasi' },
        { name: 'Prosedur & K3', maxPoints: 3, criteria: 'Prosedur K3' },
        { name: 'Analisis & Kesimpulan', maxPoints: 3, criteria: 'Analisis' }
      ]
    }
  ];

  const templateDbPath = path.resolve('data', 'database.json');
  let syntheticDb = {};
  if (fs.existsSync(templateDbPath)) {
    syntheticDb = JSON.parse(fs.readFileSync(templateDbPath, 'utf8'));
  }

  // Daftarkan entitas dasar
  syntheticDb.schools = [
    {
      id: 'sch-bandung-02',
      name: 'SMK Negeri 2 Bandung',
      address: 'Jl. Ciliwung No. 4 Bandung',
      city: 'Bandung',
      province: 'Jawa Barat'
    }
  ];

  syntheticDb.classes = [
    {
      id: 'cls-ki-12-1',
      name: 'XII Kimia Industri 1',
      schoolId: 'sch-bandung-02',
      schoolName: 'SMK Negeri 2 Bandung',
      teacherId: 'usr-guru-bambang',
      teacherName: 'Drs. Bambang Sutrisno, M.Pd.'
    }
  ];

  syntheticDb.teachers = [
    {
      id: 'usr-guru-bambang',
      name: 'Drs. Bambang Sutrisno, M.Pd.',
      email: 'bambang@smkn2bandung.sch.id',
      identityNo: 'NIP-19720315-BANDUNG',
      schoolId: 'sch-bandung-02',
      schoolName: 'SMK Negeri 2 Bandung'
    }
  ];

  syntheticDb.users = [
    {
      id: 'usr-admin-001',
      name: 'Administrator EmployaSkills',
      email: 'admin@app.com',
      password: hashPassword('password'),
      role: 'admin'
    },
    {
      id: 'usr-guru-bambang',
      name: 'Drs. Bambang Sutrisno, M.Pd.',
      email: 'bambang@smkn2bandung.sch.id',
      password: hashPassword('password123'),
      role: 'guru',
      identityNo: 'NIP-19720315-BANDUNG',
      schoolId: 'sch-bandung-02',
      schoolName: 'SMK Negeri 2 Bandung',
      assignedClassIds: ['cls-ki-12-1']
    }
  ];

  // 8 Ujian Terpisah untuk setiap skenario modalitas
  const examIds = {
    typedPos: 'ex-mock-typed-pos',
    typed500: 'ex-mock-typed-500',
    typed401: 'ex-mock-typed-401',
    typedIrr: 'ex-mock-typed-irr',
    imgPos: 'ex-mock-img-pos',
    imgUnread: 'ex-mock-img-unread',
    audPos: 'ex-mock-aud-pos',
    audInaud: 'ex-mock-aud-inaud'
  };

  syntheticDb.exams = Object.entries(examIds).map(([k, id]) => ({
    id,
    title: `Ujian Mock AI - ${k}`,
    packageId: 'pkg-employability-18',
    schoolId: 'sch-bandung-02',
    schoolName: 'SMK Negeri 2 Bandung',
    classId: 'cls-ki-12-1',
    className: 'XII Kimia Industri 1',
    teacherId: 'usr-guru-bambang',
    teacherName: 'Drs. Bambang Sutrisno, M.Pd.',
    questionSnapshot: standardQuestionSnapshot,
    status: 'berjalan'
  }));

  syntheticDb.packages = syntheticDb.packages || [];
  syntheticDb.submissions = [];
  syntheticDb.archives = [];
  syntheticDb.portfolios = [];

  // Konfigurasi Mock URL & Kunci Uji pada settings sintetis
  syntheticDb.settings = {
    ...(syntheticDb.settings || {}),
    deepseekApiKey: 'mock-deepseek-key-12345',
    deepseekBaseUrl: `http://127.0.0.1:${MOCK_PORT}`,
    deepseekModel: 'deepseek-chat',
    geminiApiKey: 'mock-gemini-key-12345',
    geminiBaseUrl: `http://127.0.0.1:${MOCK_PORT}`
  };

  const syntheticDbPath = path.join(testDir, 'database.json');
  fs.writeFileSync(syntheticDbPath, JSON.stringify(syntheticDb, null, 2), 'utf8');

  // 3. Jalankan Backend Uji
  console.log(`[Backend Uji] Menjalankan server pada port ${TEST_BACKEND_PORT}...`);
  const backendProc = spawn('node', ['dist/server.js'], {
    cwd: path.resolve('.'),
    env: {
      ...process.env,
      PORT: String(TEST_BACKEND_PORT),
      VOC_DATABASE_PATH: syntheticDbPath,
      DB_FILE_PATH: syntheticDbPath,
      EVIDENCE_DIR: evidenceDir,
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
      DEEPSEEK_API_KEY: 'mock-deepseek-key-12345',
      GEMINI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
      GEMINI_API_KEY: 'mock-gemini-key-12345'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProc.stdout.on('data', () => {});
  backendProc.stderr.on('data', data => {
    const msg = data.toString().trim();
    if (!msg.includes('node:internal') && !msg.includes('ExperimentalWarning')) {
      console.error('[Backend Log]', msg);
    }
  });

  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const h = await fetch(`${BACKEND_BASE}/api/health`);
      if (h.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await sleep(300);
  }

  if (!serverReady) {
    backendProc.kill();
    mockServer.close();
    throw new Error('Backend uji tidak dapat dimulai pada port ' + TEST_BACKEND_PORT);
  }
  console.log(`[Backend Uji] Siap merespons pada ${BACKEND_BASE}\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  try {
    // Autentikasi Pengguna
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@app.com', password: 'password' }
    });
    assert.strictEqual(adminLogin.status, 200, 'Login admin harus sukses');
    const adminToken = adminLogin.body.token;

    const teacherLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'bambang@smkn2bandung.sch.id', password: 'password123' }
    });
    assert.strictEqual(teacherLogin.status, 200, 'Login guru Bambang harus sukses');
    const teacherToken = teacherLogin.body.token;

    // Siswa Uji
    const studentReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Siswa Mock AI',
        email: 'siswa.mock@smkn2bandung.sch.id',
        identityNo: 'NIS-MOCK-001',
        schoolId: 'sch-bandung-02',
        schoolName: 'SMK Negeri 2 Bandung',
        classId: 'cls-ki-12-1',
        className: 'XII Kimia Industri 1',
        password: 'password123'
      }
    });
    assert.strictEqual(studentReg.status, 200, 'Registrasi siswa harus sukses');
    const studentToken = studentReg.body.token;

    // -------------------------------------------------------------
    // UJI 1: Positive Typed Essay (DeepSeek Strict Pipeline)
    // -------------------------------------------------------------
    console.log('--- 1. Uji Positif: Jawaban Esai Ketikan via DeepSeek ---');
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const sub1Id = `sub-mock-typed-pos-${Date.now()}`;
    const makeSub1 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub1Id,
        examId: examIds.typedPos,
        examTitle: 'Ujian Mock AI - typedPos',
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            essayAnswer: 'Titrasi asidimetri menggunakan larutan standar NaOH untuk menentukan kadar asam.'
          }
        }
      }
    });
    assert.strictEqual(makeSub1.status, 200, `POST submission sub1 harus 200 (dapat: ${makeSub1.status})`);

    // Minta evaluasi AI
    const evalSub1 = await request(`/api/ai/evaluate-submission/${sub1Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(evalSub1.status, 200, `Evaluasi sub1 harus 200 (dapat: ${evalSub1.status})`);

    // Verifikasi pemanggilan: DeepSeek dipanggil, Gemini TIDAK dipanggil!
    assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek harus dipanggil untuk teks ketikan');
    assert.strictEqual(mockState.calls.gemini.length, 0, 'Gemini DILARANG dipanggil untuk teks ketikan siswa');

    const checkSub1 = await request(`/api/submissions/${sub1Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s1 = checkSub1.body.submission;
    await test('Esai ketikan berhasil dinilai DeepSeek: status completed & skor sesuai rubrik', async () => {
      assert(s1, 'Submission s1 harus ditemukan');
      assert.strictEqual(s1.aiGradingStatus, 'completed');
      assert.strictEqual(typeof s1.answers['q-01'].score, 'number');
      assert.strictEqual(s1.hasPendingComponents, false);
      assert.strictEqual(s1.answers['q-01'].isPendingEvaluation, false);
    });

    // -------------------------------------------------------------
    // UJI 2: Negative Typed Essay (DeepSeek 500 Error - Zero Fake Score)
    // -------------------------------------------------------------
    console.log('\n--- 2. Uji Negatif: DeepSeek Mengalami HTTP 500 (Zero Fake Score) ---');
    mockState.deepseekMode = 'FAIL_500';
    resetMockCalls();

    const sub2Id = `sub-mock-fail500-${Date.now()}`;
    const makeSub2 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub2Id,
        examId: examIds.typed500,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            essayAnswer: 'Analisis stoikiometri titrasi.'
          }
        }
      }
    });
    assert.strictEqual(makeSub2.status, 200);

    const evalSub2 = await request(`/api/ai/evaluate-submission/${sub2Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(evalSub2.status, 200);

    const checkSub2 = await request(`/api/submissions/${sub2Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s2 = checkSub2.body.submission;

    await test('Kegagalan DeepSeek 500: status failed, requiresTeacherReview=true, tanpa skor palsu', async () => {
      assert(s2, 'Submission s2 harus ditemukan');
      assert.strictEqual(s2.aiGradingStatus, 'failed');
      assert.strictEqual(s2.status, 'perlu_pemeriksaan');
      assert.strictEqual(s2.requiresTeacherReview, true);
      assert.strictEqual(s2.isScoreFinal, false);
      assert.strictEqual(s2.answers['q-01'].score, undefined, 'Skor esai tidak boleh difabrikasi');
      assert.strictEqual(s2.answers['q-01'].isPendingEvaluation, true);
      assert(s2.aiGradingError?.includes('500'), 'Error log mencatat HTTP 500');
    });

    // -------------------------------------------------------------
    // UJI 3: Negative Typed Essay (DeepSeek 401 Unauthorized)
    // -------------------------------------------------------------
    console.log('\n--- 3. Uji Negatif: Kunci API DeepSeek Invalid / HTTP 401 ---');
    mockState.deepseekMode = 'FAIL_401';
    resetMockCalls();

    const sub3Id = `sub-mock-fail401-${Date.now()}`;
    const makeSub3 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub3Id,
        examId: examIds.typed401,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            essayAnswer: 'Jawaban titrasi dengan kunci invalid.'
          }
        }
      }
    });
    assert.strictEqual(makeSub3.status, 200);

    await request(`/api/ai/evaluate-submission/${sub3Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const checkSub3 = await request(`/api/submissions/${sub3Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s3 = checkSub3.body.submission;

    await test('Kegagalan DeepSeek 401: status failed, skor tetap aman tanpa vonis nol permanen', async () => {
      assert(s3, 'Submission s3 harus ditemukan');
      assert.strictEqual(s3.aiGradingStatus, 'failed');
      assert.strictEqual(s3.requiresTeacherReview, true);
      assert.strictEqual(s3.answers['q-01'].score, undefined);
    });

    // -------------------------------------------------------------
    // UJI 4: Irrelevant Typed Essay (Skor 0 Sah oleh AI, Bukan Skor Palsu)
    // -------------------------------------------------------------
    console.log('\n--- 4. Uji Jawaban Tidak Relevan: Skor 0 Objektif dari Rubrik ---');
    mockState.deepseekMode = 'IRRELEVANT';
    resetMockCalls();

    const sub4Id = `sub-mock-irrelevant-${Date.now()}`;
    const makeSub4 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub4Id,
        examId: examIds.typedIrr,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            essayAnswer: 'Ini adalah lirik lagu pop yang sama sekali tidak berhubungan dengan kimia analitik.'
          }
        }
      }
    });
    assert.strictEqual(makeSub4.status, 200);

    await request(`/api/ai/evaluate-submission/${sub4Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const checkSub4 = await request(`/api/submissions/${sub4Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s4 = checkSub4.body.submission;

    await test('Jawaban tidak relevan dinilai 0 oleh AI dengan feedback objektivitas rubrik', async () => {
      assert(s4, 'Submission s4 harus ditemukan');
      assert.strictEqual(s4.answers['q-01'].score, 0);
      assert(s4.answers['q-01'].teacherFeedback?.includes('menyimpang') || s4.teacherFollowUp?.includes('rubrik'));
    });

    // -------------------------------------------------------------
    // UJI 5: Positive Handwriting Photo (2-Stage: Gemini OCR -> DeepSeek Scoring)
    // -------------------------------------------------------------
    console.log('\n--- 5. Uji Positif Gambar: 2-Stage Pipeline (Gemini OCR -> DeepSeek) ---');
    mockState.geminiMode = 'SUCCESS_OCR';
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const dummyJpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const sub5Id = `sub-mock-image-pos-${Date.now()}`;

    const makeSub5 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub5Id,
        examId: examIds.imgPos,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_reaksi_kimia.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });
    assert.strictEqual(makeSub5.status, 200);

    const evalSub5 = await request(`/api/ai/evaluate-submission/${sub5Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(evalSub5.status, 200);

    await test('2-Stage Pipeline Gambar: Gemini OCR mengekstrak teks, DeepSeek menilai skor', async () => {
      // 1. Verifikasi Gemini dipanggil untuk OCR
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini harus dipanggil untuk membaca foto lembar jawaban');
      // 2. Verifikasi DeepSeek menerima hasil ekstraksi dari Gemini
      assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek harus dipanggil untuk menilai teks hasil OCR');
      
      const lastDsCall = mockState.calls.deepseek[mockState.calls.deepseek.length - 1];
      const userContent = lastDsCall.body.messages?.find(m => m.role === 'user')?.content || '';
      assert(userContent.includes('CH3COOH + NaOH'), 'DeepSeek harus menerima teks persamaan reaksi dari Gemini OCR');

      const checkSub5 = await request(`/api/submissions/${sub5Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s5 = checkSub5.body.submission;
      assert.strictEqual(s5.aiGradingStatus, 'completed');
      assert.strictEqual(typeof s5.answers['q-01'].score, 'number');
    });

    // -------------------------------------------------------------
    // UJI 6: Negative Handwriting Photo (Gemini OCR Unreadable / Buram)
    // -------------------------------------------------------------
    console.log('\n--- 6. Uji Negatif Gambar: Foto Buram / Tidak Terbaca (Short-Circuit) ---');
    mockState.geminiMode = 'FAIL_OCR_UNREADABLE';
    resetMockCalls();

    const sub6Id = `sub-mock-image-unreadable-${Date.now()}`;
    const makeSub6 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub6Id,
        examId: examIds.imgUnread,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-buram-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'foto_buram.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });
    assert.strictEqual(makeSub6.status, 200);

    await request(`/api/ai/evaluate-submission/${sub6Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Foto buram: Gemini mendeteksi unreadable, DeepSeek TIDAK dipanggil, zero fake score', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini OCR dijalankan');
      assert.strictEqual(mockState.calls.deepseek.length, 0, 'DeepSeek DILARANG dipanggil jika gambar tidak terbaca');

      const checkSub6 = await request(`/api/submissions/${sub6Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s6 = checkSub6.body.submission;
      assert.strictEqual(s6.aiGradingStatus, 'failed');
      assert.strictEqual(s6.requiresTeacherReview, true);
      assert.strictEqual(s6.answers['q-01'].score, undefined);
    });

    // -------------------------------------------------------------
    // UJI 7: Positive Audio Speech (2-Stage: Gemini STT -> DeepSeek Scoring)
    // -------------------------------------------------------------
    console.log('\n--- 7. Uji Positif Audio: 2-Stage Pipeline (Gemini STT -> DeepSeek) ---');
    mockState.geminiMode = 'SUCCESS_STT';
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const dummyWebmBase64 = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAAAgEAAAAAAAAAAjHjAQAAAAAAAfmBAkP8gQWBAZM=';
    const sub7Id = `sub-mock-audio-pos-${Date.now()}`;

    const makeSub7 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub7Id,
        examId: examIds.audPos,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-aud-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'audio',
                fileName: 'penjelasan_lisan_asidimetri.webm',
                fileData: dummyWebmBase64,
                mimeType: 'audio/webm'
              }
            ]
          }
        }
      }
    });
    assert.strictEqual(makeSub7.status, 200);

    await request(`/api/ai/evaluate-submission/${sub7Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('2-Stage Pipeline Audio: Gemini STT mentranskrip, DeepSeek menilai skor transkrip', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini STT dipanggil untuk mentranskrip audio');
      assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek dipanggil untuk menilai teks transkrip');

      const lastDsCall = mockState.calls.deepseek[mockState.calls.deepseek.length - 1];
      const userContent = lastDsCall.body.messages?.find(m => m.role === 'user')?.content || '';
      assert(userContent.includes('Prinsip asidimetri adalah penentuan kadar basa'), 'DeepSeek harus menerima transkrip dari Gemini STT');

      const checkSub7 = await request(`/api/submissions/${sub7Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s7 = checkSub7.body.submission;
      assert.strictEqual(s7.aiGradingStatus, 'completed');
      assert.strictEqual(typeof s7.answers['q-01'].score, 'number');
    });

    // -------------------------------------------------------------
    // UJI 8: Negative Audio Speech (Gemini STT Inaudible / Suara Bising)
    // -------------------------------------------------------------
    console.log('\n--- 8. Uji Negatif Audio: Rekaman Bising / Inaudible (Short-Circuit) ---');
    mockState.geminiMode = 'FAIL_STT_INAUDIBLE';
    resetMockCalls();

    const sub8Id = `sub-mock-audio-inaudible-${Date.now()}`;
    const makeSub8 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub8Id,
        examId: examIds.audInaud,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-aud-noise-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'audio',
                fileName: 'rekaman_bising.webm',
                fileData: dummyWebmBase64,
                mimeType: 'audio/webm'
              }
            ]
          }
        }
      }
    });
    assert.strictEqual(makeSub8.status, 200);

    await request(`/api/ai/evaluate-submission/${sub8Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Audio bising: Gemini mendeteksi inaudible, DeepSeek TIDAK dipanggil, zero fake score', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini STT dijalankan');
      assert.strictEqual(mockState.calls.deepseek.length, 0, 'DeepSeek DILARANG dipanggil jika audio inaudible');

      const checkSub8 = await request(`/api/submissions/${sub8Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s8 = checkSub8.body.submission;
      assert.strictEqual(s8.aiGradingStatus, 'failed');
      assert.strictEqual(s8.requiresTeacherReview, true);
      assert.strictEqual(s8.answers['q-01'].score, undefined);
    });

    // -------------------------------------------------------------
    // UJI 9: Keamanan Sanitasi API Key & Masking
    // -------------------------------------------------------------
    console.log('\n--- 9. Uji Keamanan Sanitasi API Key (Zero Secret Leak) ---');
    await test('GET /api/settings dan GET /api/health menyamarkan API key', async () => {
      const healthRes = await request('/api/health');
      assert.strictEqual(healthRes.body.deepseekApiKey, undefined);
      assert.strictEqual(healthRes.body.geminiApiKey, undefined);

      const settingsRes = await request('/api/settings', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const s = settingsRes.body.settings || settingsRes.body;
      // Kunci rahasia harus dihapus atau dimasking (tidak boleh terlihat kunci asli)
      assert.strictEqual(s.geminiApiKey === undefined || s.geminiApiKey.includes('***'), true);
      assert.strictEqual(s.deepseekApiKey === undefined || s.deepseekApiKey.includes('***'), true);
      assert(!JSON.stringify(settingsRes.body).includes('mock-gemini-key-12345'), 'Kunci Gemini asli dilarang bocor');
      assert(!JSON.stringify(settingsRes.body).includes('mock-deepseek-key-12345'), 'Kunci DeepSeek asli dilarang bocor');
    });

  } finally {
    // Bersihkan proses backend dan server mock
    backendProc.kill('SIGKILL');
    mockServer.close();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n======================================================================');
  console.log(` HASIL PENGUJIAN MOCK PROVIDER AI: ${passed} LULUS, ${failed} GAGAL`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes mock AI pipeline gagal.`);
  }
}

runMockAIPipelineTests().catch(err => {
  console.error('\n❌ Fatal Test Error:', err);
  process.exit(1);
});
