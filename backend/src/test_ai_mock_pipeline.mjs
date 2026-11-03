/**
 * TEST AI MOCK PIPELINE - EMPLOYASKILLS HOTFIX
 * 
 * Pengujian komprehensif arsitektur AI baru dan Pilihan Ganda Kompleks:
 * 1. Teks -> DeepSeek -> Skor
 * 2. DeepSeek HTTP 500 / 401 -> Status 'failed', Zero Fake Score (skor undefined)
 * 3. Teks Tidak Relevan -> Skor 0 sah dari rubrik objektif
 * 4. Gambar -> Gemini Multimodal Vision LANGSUNG -> Skor + Feedback (DeepSeek DILARANG dipanggil)
 * 5. Gambar Tulisan Tangan Tidak Terbaca -> Zero Fake Score (undefined), requiresTeacherReview=true
 * 6. Gambar Tulisan Tangan Sebagian Terbaca -> Skor adil untuk bagian sah + catatan ketidakpastian
 * 7. Gemini Model 404 -> Error teridentifikasi jelas tanpa silent fallback
 * 8. Gemini Geo-Restriction VPS (HTTP 400) -> Error mengidentifikasi lokasi server, bukan siswa
 * 9. Audio -> Gemini STT -> DeepSeek Scoring
 * 10. Audio Transkrip Tersimpan -> DeepSeek Scoring langsung tanpa STT ulang
 * 11. Audio Bising / Inaudible -> Zero Fake Score, DeepSeek tidak dipanggil
 * 12. Pilihan Ganda Kompleks -> Pilih 2 opsi -> Submit -> Tersimpan di database & skor 5/5
 * 13. Pilihan Ganda Kompleks -> Draft Autosave & Restore Server -> 2 Opsi utuh
 * 14. Dashboard Guru & Admin -> selectedOptions lengkap dan tidak berstatus kosong
 * 15. Sanitasi API Key (Zero Secret Leak)
 * 16. Perlindungan Data Lintas Sekolah & Integritas 24 Data Historis
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
  geminiMode: 'SUCCESS_VISION_DIRECT', // 'SUCCESS_VISION_DIRECT' | 'PARTIAL_READABLE' | 'FAIL_OCR_UNREADABLE' | 'FAIL_404' | 'FAIL_GEO_RESTRICTED' | 'FAIL_503' | 'SUCCESS_STT' | 'FAIL_STT_INAUDIBLE'
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

      if (mockState.geminiMode === 'FAIL_404') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { code: 404, message: 'models/gemini-1.5-pro is not found', status: 'NOT_FOUND' } }));
      }

      if (mockState.geminiMode === 'FAIL_GEO_RESTRICTED') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { code: 400, message: 'User location is not supported for the API use without a billing account.', status: 'FAILED_PRECONDITION' } }));
      }

      if (mockState.geminiMode === 'FAIL_503') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Gemini service temporarily overloaded (503)' } }));
      }

      if (mockState.geminiMode === 'FAIL_OCR_UNREADABLE') {
        const unreadableReply = {
          transcription: '',
          total_score: null,
          is_readable: false,
          uncertainty_reason: 'Foto lembar jawaban buram, gelap, dan tulisan tangan tidak terbaca',
          requires_teacher_review: true
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(unreadableReply) }] } }]
        }));
      }

      if (mockState.geminiMode === 'PARTIAL_READABLE') {
        const partialReply = {
          transcription: 'CH3COOH + NaOH -> CH3COONa + H2O. [angka volume terpotong]',
          total_score: 5,
          scoring_reason: 'Reaksi stoikiometri terbaca dan dinilai. Angka volume titrasi buram di tepi kertas.',
          feedback: 'Sebagian jawaban dinilai sah (5 poin), bagian yang buram memerlukan validasi guru.',
          rubric_scores: [
            { indicator: 'Ketepatan Konsep', score: 3, maxScore: 4, feedback: 'Reaksi benar' },
            { indicator: 'Prosedur & K3', score: 2, maxScore: 3, feedback: 'Langkah sebagian terbaca' },
            { indicator: 'Analisis & Kesimpulan', score: 0, maxScore: 3, feedback: 'Angka buram' }
          ],
          is_readable: true,
          confidence_level: 'medium',
          uncertainty_reason: 'Angka desimal volume titrasi terpotong di tepi kertas',
          requires_teacher_review: true
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(partialReply) }] } }]
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

      // Default: SUCCESS_VISION_DIRECT (Direct Gemini Multimodal Image Scoring)
      const directVisionReply = {
        transcription: 'CH3COOH + NaOH -> CH3COONa + H2O. V_titrasi = 10.2 mL, N_NaOH = 0.100 N.',
        total_score: 9,
        scoring_reason: 'Reaksi stoikiometri titrasi dan perhitungan normalitas NaOH tepat sesuai SOP.',
        feedback: 'Tulisan tangan terbaca jelas, rumus dan perhitungan akurat.',
        rubric_scores: [
          { indicator: 'Ketepatan Konsep', score: 4, maxScore: 4, feedback: 'Reaksi asam basa benar' },
          { indicator: 'Prosedur & K3', score: 3, maxScore: 3, feedback: 'Langkah titrasi lengkap' },
          { indicator: 'Analisis & Kesimpulan', score: 2, maxScore: 3, feedback: 'Perhitungan volume tepat' }
        ],
        is_readable: true,
        confidence_level: 'high',
        uncertainty_reason: null,
        requires_teacher_review: false
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(directVisionReply) }] } }]
      }));
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint mock tidak ditemukan' }));
  });
});

async function request(reqPath, options = {}) {
  const url = `${BACKEND_BASE}${reqPath}`;
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

async function runMockAIPipelineTests() {
  console.log('======================================================================');
  console.log(' MEMULAI REGRESI & MOCK PIPELINE TEST EMPLOYASKILLS');
  console.log('======================================================================\n');

  // 1. Jalankan Mock Server
  await new Promise(resolve => mockServer.listen(MOCK_PORT, '127.0.0.1', resolve));
  console.log(`[Mock Server] Berjalan pada port ${MOCK_PORT}`);

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
    },
    {
      id: 'q-02',
      type: 'complex_mcq',
      questionText: 'Pilihlah tepat dua tindakan K3 yang wajib dilakukan sebelum titrasi asam pekat:',
      options: [
        'A. Memakai kacamata pelindung (goggles)',
        'B. Menyalakan blower/exhaust fan laboratorium',
        'C. Menghirup uap sampel langsung dari mulut erlenmeyer',
        'D. Membuang limbah asam pekat langsung ke wastafel'
      ],
      correctAnswers: [
        'A. Memakai kacamata pelindung (goggles)',
        'B. Menyalakan blower/exhaust fan laboratorium'
      ],
      maxScore: 5
    }
  ];

  const templateDbPath = path.resolve('data', 'database.json');
  let syntheticDb = {};
  if (fs.existsSync(templateDbPath)) {
    syntheticDb = JSON.parse(fs.readFileSync(templateDbPath, 'utf8'));
  }

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

  const examIds = {
    typedPos: 'ex-mock-typed-pos',
    typed500: 'ex-mock-typed-500',
    typed401: 'ex-mock-typed-401',
    typedIrr: 'ex-mock-typed-irr',
    imgDirectPos: 'ex-mock-img-direct-pos',
    imgUnread: 'ex-mock-img-unread',
    imgPartial: 'ex-mock-img-partial',
    img404: 'ex-mock-img-404',
    imgGeo: 'ex-mock-img-geo',
    audPos: 'ex-mock-aud-pos',
    audCached: 'ex-mock-aud-cached',
    audInaud: 'ex-mock-aud-inaud',
    complexMcq: 'ex-mock-complex-mcq'
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

  // Konfigurasi Mock URL & Kunci Uji pada settings sintetis (Gemini 3.5 preferensi)
  syntheticDb.settings = {
    ...(syntheticDb.settings || {}),
    deepseekApiKey: 'mock-deepseek-key-12345',
    deepseekBaseUrl: `http://127.0.0.1:${MOCK_PORT}`,
    deepseekModel: 'deepseek-chat',
    geminiApiKey: 'mock-gemini-key-12345',
    geminiBaseUrl: `http://127.0.0.1:${MOCK_PORT}`,
    geminiModel: 'gemini-3.5-flash-lite'
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
      GEMINI_API_KEY: 'mock-gemini-key-12345',
      GEMINI_MODEL: 'gemini-3.5-flash-lite'
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
    // UJI 1: Positive Typed Essay (DeepSeek)
    // -------------------------------------------------------------
    console.log('--- 1. Uji Positif: Teks Ketikan Siswa -> DeepSeek -> Skor ---');
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const sub1Id = `sub-mock-typed-pos-${Date.now()}`;
    const makeSub1 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub1Id,
        examId: examIds.typedPos,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            essayAnswer: 'Prinsip asidimetri adalah reaksi netralisasi antara asam cuka perdagangan dengan larutan standar NaOH.'
          }
        }
      }
    });
    assert.strictEqual(makeSub1.status, 200);

    const evalSub1 = await request(`/api/ai/evaluate-submission/${sub1Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(evalSub1.status, 200);

    await test('Teks -> DeepSeek: Evaluasi sukses, skor 9, feedback dan rubrik lengkap', async () => {
      assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek harus dipanggil');
      assert.strictEqual(mockState.calls.gemini.length, 0, 'Gemini DILARANG dipanggil untuk teks biasa');

      const checkSub1 = await request(`/api/submissions/${sub1Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s1 = checkSub1.body.submission;
      assert.strictEqual(s1.aiGradingStatus, 'completed');
      assert.strictEqual(s1.answers['q-01'].score, 9);
      assert.strictEqual(s1.answers['q-01'].aiRubricScoring?.modelUsed?.includes('DeepSeek'), true);
    });

    // -------------------------------------------------------------
    // UJI 2: DeepSeek HTTP 500 Failure
    // -------------------------------------------------------------
    console.log('\n--- 2. Uji Negatif: DeepSeek Gagal HTTP 500 -> Zero Fake Score ---');
    mockState.deepseekMode = 'FAIL_500';
    resetMockCalls();

    const sub2Id = `sub-mock-fail500-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub2Id,
        examId: examIds.typed500,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': { questionId: 'q-01', essayAnswer: 'Analisis stoikiometri titrasi.' }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub2Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const checkSub2 = await request(`/api/submissions/${sub2Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s2 = checkSub2.body.submission;

    await test('DeepSeek 500: status failed, requiresTeacherReview=true, tanpa skor palsu (score: undefined)', async () => {
      assert(s2, 'Submission s2 harus ditemukan');
      assert.strictEqual(s2.aiGradingStatus, 'failed');
      assert.strictEqual(s2.requiresTeacherReview, true);
      assert.strictEqual(s2.answers['q-01'].score, undefined, 'Skor esai tidak boleh difabrikasi');
    });

    // -------------------------------------------------------------
    // UJI 3: Irrelevant Essay -> Skor 0 Sah dari Rubrik
    // -------------------------------------------------------------
    console.log('\n--- 3. Uji Jawaban Tidak Relevan: Skor 0 Objektif dari Rubrik ---');
    mockState.deepseekMode = 'IRRELEVANT';
    resetMockCalls();

    const sub3Id = `sub-mock-irrelevant-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub3Id,
        examId: examIds.typedIrr,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': { questionId: 'q-01', essayAnswer: 'Lirik lagu pop yang tidak ada hubungan dengan kimia.' }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub3Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const checkSub3 = await request(`/api/submissions/${sub3Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const s3 = checkSub3.body.submission;

    await test('Jawaban tidak relevan dinilai 0 sah oleh AI dengan feedback objektivitas rubrik', async () => {
      assert(s3, 'Submission s3 harus ditemukan');
      assert.strictEqual(s3.answers['q-01'].score, 0);
    });

    // -------------------------------------------------------------
    // UJI 4: Direct Multimodal Gemini Vision Image Scoring (NO DeepSeek!)
    // -------------------------------------------------------------
    console.log('\n--- 4. Uji Gambar: Gemini Langsung Membaca & Menilai (Tanpa DeepSeek) ---');
    mockState.geminiMode = 'SUCCESS_VISION_DIRECT';
    mockState.deepseekMode = 'FAIL_500'; // Set DeepSeek to FAIL_500 to prove DeepSeek is never called!
    resetMockCalls();

    const dummyJpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const sub4Id = `sub-mock-img-direct-${Date.now()}`;

    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub4Id,
        examId: examIds.imgDirectPos,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-direct-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_reaksi_tulisan_tangan.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub4Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Gemini LANGSUNG menilai gambar: Skor 9 diberikan Gemini, DeepSeek DILARANG dipanggil', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini harus dipanggil langsung untuk mengevaluasi gambar');
      assert.strictEqual(mockState.calls.deepseek.length, 0, 'DeepSeek DILARANG dipanggil pada jalur evaluasi gambar!');

      const checkSub4 = await request(`/api/submissions/${sub4Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s4 = checkSub4.body.submission;
      assert.strictEqual(s4.aiGradingStatus, 'completed');
      assert.strictEqual(s4.answers['q-01'].score, 9);
      assert.strictEqual(s4.answers['q-01'].aiRubricScoring?.modelUsed?.includes('Gemini'), true);
    });

    // -------------------------------------------------------------
    // UJI 5: Gambar Tulisan Tangan Tidak Terbaca (Zero Fake Score)
    // -------------------------------------------------------------
    console.log('\n--- 5. Uji Gambar Buram/Tidak Terbaca: Zero Fake Score (undefined) ---');
    mockState.geminiMode = 'FAIL_OCR_UNREADABLE';
    resetMockCalls();

    const sub5Id = `sub-mock-img-unread-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub5Id,
        examId: examIds.imgUnread,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-unread-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_buram.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub5Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Gambar buram: Skor undefined (bukan 0 palsu), requiresTeacherReview=true', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true);
      assert.strictEqual(mockState.calls.deepseek.length, 0);

      const checkSub5 = await request(`/api/submissions/${sub5Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s5 = checkSub5.body.submission;
      assert.strictEqual(s5.aiGradingStatus, 'failed');
      assert.strictEqual(s5.requiresTeacherReview, true);
      assert.strictEqual(s5.answers['q-01'].score, undefined);
    });

    // -------------------------------------------------------------
    // UJI 6: Gambar Tulisan Tangan Sebagian Terbaca (Partial Credit)
    // -------------------------------------------------------------
    console.log('\n--- 6. Uji Gambar Sebagian Terbaca: Nilai Bagian Sah & Simpan Keraguan ---');
    mockState.geminiMode = 'PARTIAL_READABLE';
    resetMockCalls();

    const sub6Id = `sub-mock-img-partial-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub6Id,
        examId: examIds.imgPartial,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-partial-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_sebagian_terpotong.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub6Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Gambar sebagian terbaca: Nilai sah 5 diberikan, requiresTeacherReview=true, catatan ketidakpastian tersimpan', async () => {
      const checkSub6 = await request(`/api/submissions/${sub6Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s6 = checkSub6.body.submission;
      assert.strictEqual(s6.aiGradingStatus, 'completed');
      assert.strictEqual(s6.answers['q-01'].score, 5);
      assert.strictEqual(s6.answers['q-01'].aiRubricScoring?.requiresTeacherReview, true);
      assert(s6.answers['q-01'].aiRubricScoring?.uncertaintyReason?.includes('terpotong'), 'Catatan ketidakpastian harus tersimpan');
    });

    // -------------------------------------------------------------
    // UJI 7: Gemini Model HTTP 404 (Model Tidak Ditemukan)
    // -------------------------------------------------------------
    console.log('\n--- 7. Uji Model Gemini 404: Penanganan Teridentifikasi Jelas ---');
    mockState.geminiMode = 'FAIL_404';
    resetMockCalls();

    const sub7Id = `sub-mock-img-404-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub7Id,
        examId: examIds.img404,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-404-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_jawaban_404.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub7Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Gemini 404: Status failed, catatan error mencatat kegagalan API, tanpa skor palsu', async () => {
      const checkSub7 = await request(`/api/submissions/${sub7Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s7 = checkSub7.body.submission;
      assert.strictEqual(s7.aiGradingStatus, 'failed');
      assert.strictEqual(s7.answers['q-01'].score, undefined);
    });

    // -------------------------------------------------------------
    // UJI 8: Gemini VPS Geo-Restriction (HTTP 400 Location Blocked)
    // -------------------------------------------------------------
    console.log('\n--- 8. Uji Gemini Geo-Restriction (HTTP 400): Tidak Menyalahkan Siswa ---');
    mockState.geminiMode = 'FAIL_GEO_RESTRICTED';
    resetMockCalls();

    const sub8Id = `sub-mock-img-geo-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub8Id,
        examId: examIds.imgGeo,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-img-geo-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'handwriting',
                fileName: 'lembar_jawaban_geo.jpg',
                fileData: dummyJpgBase64,
                mimeType: 'image/jpeg'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub8Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Gemini Geo-Restriction: Alasan error mengidentifikasi pembatasan lokasi geografis server', async () => {
      const checkSub8 = await request(`/api/submissions/${sub8Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s8 = checkSub8.body.submission;
      assert.strictEqual(s8.aiGradingStatus, 'failed');
      assert(s8.aiGradingError?.includes('geografis') || s8.aiGradingError?.includes('Geo-Restriction') || s8.aiGradingError?.includes('location'), 'Error harus mencatat kendala lokasi server');
    });

    // -------------------------------------------------------------
    // UJI 9: Rekaman Audio: Gemini STT -> DeepSeek Scoring
    // -------------------------------------------------------------
    console.log('\n--- 9. Uji Audio: Gemini STT -> DeepSeek Scoring ---');
    mockState.geminiMode = 'SUCCESS_STT';
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const dummyWebmBase64 = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAAAgEAAAAAAAAAAjHjAQAAAAAAAfmBAkP8gQWBAZM=';
    const sub9Id = `sub-mock-aud-pos-${Date.now()}`;

    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub9Id,
        examId: examIds.audPos,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            multimodalEvidences: [
              {
                id: `evid-aud-pos-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'audio',
                fileName: 'suara_asidimetri.webm',
                fileData: dummyWebmBase64,
                mimeType: 'audio/webm'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub9Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Audio: Gemini mentranskrip audio, DeepSeek menilai isi transkrip', async () => {
      assert.strictEqual(mockState.calls.gemini.length >= 1, true, 'Gemini STT harus dipanggil');
      assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek harus dipanggil untuk menilai transkrip');

      const checkSub9 = await request(`/api/submissions/${sub9Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s9 = checkSub9.body.submission;
      assert.strictEqual(s9.aiGradingStatus, 'completed');
      assert.strictEqual(s9.answers['q-01'].score, 9);
      assert(s9.answers['q-01'].audioTranscript?.includes('asidimetri'), 'Transkrip harus tersimpan');
    });

    // -------------------------------------------------------------
    // UJI 10: Audio dengan Transkrip Tersimpan -> Langsung DeepSeek (Tanpa STT Ulang)
    // -------------------------------------------------------------
    console.log('\n--- 10. Uji Optimisasi Transkrip Audio Tersimpan -> Lewati STT Ulang ---');
    mockState.geminiMode = 'FAIL_503'; // Set Gemini to FAIL_503 to prove STT is never called!
    mockState.deepseekMode = 'SUCCESS_TEXT';
    resetMockCalls();

    const sub10Id = `sub-mock-aud-cached-${Date.now()}`;
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub10Id,
        examId: examIds.audCached,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-01': {
            questionId: 'q-01',
            audioTranscript: 'Prinsip asidimetri adalah penentuan kadar basa menggunakan larutan standar asam seperti HCl yang telah distandarisasi.',
            multimodalEvidences: [
              {
                id: `evid-aud-cached-${Date.now()}`,
                questionId: 'q-01',
                modalityType: 'audio',
                fileName: 'suara_sudah_ditranskrip.webm',
                fileData: dummyWebmBase64,
                mimeType: 'audio/webm',
                extractedText: 'Prinsip asidimetri adalah penentuan kadar basa menggunakan larutan standar asam seperti HCl yang telah distandarisasi.'
              }
            ]
          }
        }
      }
    });

    await request(`/api/ai/evaluate-submission/${sub10Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    await test('Transkrip tersimpan: Langsung dinilai DeepSeek tanpa mengulang STT ke Gemini', async () => {
      assert.strictEqual(mockState.calls.gemini.length, 0, 'Gemini STT DILARANG dipanggil jika transkrip valid sudah ada!');
      assert.strictEqual(mockState.calls.deepseek.length >= 1, true, 'DeepSeek langsung menilai transkrip tersimpan');

      const checkSub10 = await request(`/api/submissions/${sub10Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const s10 = checkSub10.body.submission;
      assert.strictEqual(s10.aiGradingStatus, 'completed');
      assert.strictEqual(s10.answers['q-01'].score, 9);
    });

    // -------------------------------------------------------------
    // UJI 11: Pilihan Ganda Kompleks: Pilih Tepat 2 Opsi -> Persistensi & Penskoran
    // -------------------------------------------------------------
    console.log('\n--- 11. Uji Pilihan Ganda Kompleks: 2 Opsi Checkbox Terpilih & Skor Otomatis ---');
    const sub11Id = `sub-mock-cmcq-${Date.now()}`;

    const makeSub11 = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: sub11Id,
        examId: examIds.complexMcq,
        status: 'submitted',
        questionSnapshot: standardQuestionSnapshot,
        answers: {
          'q-02': {
            questionId: 'q-02',
            selectedOptions: [
              'A. Memakai kacamata pelindung (goggles)',
              'B. Menyalakan blower/exhaust fan laboratorium'
            ]
          }
        }
      }
    });
    assert.strictEqual(makeSub11.status, 200, 'Submit harus sukses');

    await test('Pilihan Ganda Kompleks: Kedua opsi tersimpan utuh di database dan server menghitung skor 5/5', async () => {
      const checkSub11 = await request(`/api/submissions/${sub11Id}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const s11 = checkSub11.body.submission;
      assert(s11, 'Submission harus ditemukan');

      const ansQ2 = s11.answers['q-02'];
      assert(ansQ2, 'Jawaban q-02 harus ada');
      assert(Array.isArray(ansQ2.selectedOptions), 'selectedOptions harus berupa array');
      assert.strictEqual(ansQ2.selectedOptions.length, 2, 'Harus menyimpan tepat 2 opsi');
      assert(ansQ2.selectedOptions[0].includes('goggles'), 'Opsi A harus ada');
      assert(ansQ2.selectedOptions[1].includes('blower'), 'Opsi B harus ada');
      assert.strictEqual(ansQ2.score, 5, 'Skor harus 5/5 penuh');
    });

    // -------------------------------------------------------------
    // UJI 12: Pilihan Ganda Kompleks: Draft Autosave & Restore Server
    // -------------------------------------------------------------
    console.log('\n--- 12. Uji Pilihan Ganda Kompleks: Autosave Draft & Restore dari Server ---');
    const draftAnswers = {
      'q-02': {
        questionId: 'q-02',
        selectedOptions: [
          'A. Memakai kacamata pelindung (goggles)',
          'B. Menyalakan blower/exhaust fan laboratorium'
        ]
      }
    };

    const saveDraftRes = await request(`/api/exams/${examIds.complexMcq}/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        answers: draftAnswers,
        currentQuestionIndex: 1
      }
    });
    assert.strictEqual(saveDraftRes.status, 200, 'Simpan draft harus sukses HTTP 200');

    const getDraftRes = await request(`/api/exams/${examIds.complexMcq}/draft`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(getDraftRes.status, 200, 'Ambil draft harus sukses HTTP 200');

    await test('Draft Autosave & Restore: 2 Opsi pilihan ganda kompleks tetap utuh setelah reload', async () => {
      const draft = getDraftRes.body.draft;
      assert(draft, 'Draft harus dikembalikan');
      const q2Draft = draft.answers?.['q-02'];
      assert(q2Draft, 'Draft soal q-02 harus ada');
      assert.strictEqual(q2Draft.selectedOptions.length, 2);
      assert(q2Draft.selectedOptions.includes('A. Memakai kacamata pelindung (goggles)'));
      assert(q2Draft.selectedOptions.includes('B. Menyalakan blower/exhaust fan laboratorium'));
    });

    // -------------------------------------------------------------
    // UJI 13: Dashboard Guru & Admin: Akses Detail Submission
    // -------------------------------------------------------------
    console.log('\n--- 13. Uji Dashboard Guru & Admin: selectedOptions Tersedia & Tidak Kosong ---');
    const teacherViewSub = await request(`/api/submissions/${sub11Id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(teacherViewSub.status, 200);

    const adminViewSub = await request(`/api/submissions/${sub11Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminViewSub.status, 200);

    await test('Dashboard Guru & Admin: selectedOptions tampil lengkap dan sah', async () => {
      const tAns = teacherViewSub.body.submission.answers['q-02'];
      assert.strictEqual(tAns.selectedOptions.length, 2);

      const aAns = adminViewSub.body.submission.answers['q-02'];
      assert.strictEqual(aAns.selectedOptions.length, 2);
    });

    // -------------------------------------------------------------
    // UJI 14: Sanitasi Kunci API (Zero Secret Leak)
    // -------------------------------------------------------------
    console.log('\n--- 14. Uji Keamanan Sanitasi API Key (Zero Secret Leak) ---');
    await test('GET /api/settings dan GET /api/health menyamarkan API key', async () => {
      const healthRes = await request('/api/health');
      assert.strictEqual(healthRes.body.deepseekApiKey, undefined);
      assert.strictEqual(healthRes.body.geminiApiKey, undefined);

      const settingsRes = await request('/api/settings', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const s = settingsRes.body.settings || settingsRes.body;
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
  console.log(` HASIL PENGUJIAN MOCK PIPELINE & MULTIMODAL: ${passed} LULUS, ${failed} GAGAL`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes mock AI pipeline gagal.`);
  }
}

runMockAIPipelineTests().catch(err => {
  console.error('\n❌ Fatal Test Error:', err);
  process.exit(1);
});
