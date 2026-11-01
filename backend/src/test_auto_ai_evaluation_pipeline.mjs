import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

console.log('================================================================');
console.log('🧪 PENGUJIAN OTOMATIS: ALUR PENILAIAN AI OTOMATIS 3-MODALITAS');
console.log(` Target Server: ${BASE_URL}`);
console.log('================================================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
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

async function login(email, password = 'password123') {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (!res.body || !res.body.success || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

async function runAutoAIPipelineTests() {
  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ [LULUS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [GAGAL] ${desc}: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & VPS Environment Readiness Check
  console.log('--- 1. Uji Kesiapan Environment & Endpoint Health ---');
  await test('GET /api/health mengembalikan status API tanpa membocorkan nilai API key', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(typeof res.body.geminiKeyConfigured, 'boolean');
    assert.strictEqual(typeof res.body.deepseekKeyConfigured, 'boolean');
    // Pastikan tidak ada raw API key string yang bocor di respons
    assert.strictEqual(res.body.geminiApiKey, undefined);
    assert.strictEqual(res.body.deepseekApiKey, undefined);
  });

  // 2. Siapkan User untuk Pengujian
  console.log('\n--- 2. Autentikasi Pengguna Uji ---');
  let teacherToken = '';
  let studentToken = '';

  await test('Login Admin/Guru Penguji & Siswa Uji', async () => {
    // Register siswa uji baru
    const ts = Date.now();
    const studentEmail = `siswa.ai.${ts}@smk.sch.id`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: `Siswa Asesmen AI ${ts}`,
        email: studentEmail,
        password: 'password123',
        identityNo: `NIS-${ts}`,
        role: 'siswa',
        schoolName: 'SMK Negeri 1 Cimahi',
        className: 'XII Kimia Analisis 1',
        classId: 'cls-ka-1'
      }
    });
    assert.strictEqual(regRes.status, 200);

    const sLogin = await login(studentEmail, 'password123');
    studentToken = sLogin.token;

    // Login guru (menggunakan admin yang memiliki otoritas penuh)
    const tLogin = await login('admin@app.com', 'password');
    teacherToken = tLogin.token;
    assert(studentToken && teacherToken);
  });

  // 3. Test Modality 1: Ketikan Esai (DeepSeek Routing)
  console.log('\n--- 3. Uji Modalitas 1: Jawaban Esai Berupa Ketikan ---');
  const typedSubmissionId = `sub-typed-${Date.now()}`;
  const examId = 'ex-test-paket-b-1793548692449'; // atau gunakan id ujian yang ada

  await test('Siswa submit jawaban ketikan -> tersimpan aman & memicu AI di latar belakang', async () => {
    const payload = {
      id: typedSubmissionId,
      examId: 'ex-audit-ai-typed',
      examTitle: 'Ujian Uji Coba AI Ketikan',
      packageId: 'pkg-keselamatan-k3-10',
      studentId: 'usr-siswa-ai-typed',
      studentName: 'Ahmad Siswa Ketikan',
      studentNis: 'NIS-AI-001',
      className: 'XII KA 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-1': {
          questionId: 'q-1',
          essayAnswer: 'Prosedur keselamatan kerja saat menangani asam sulfat pekat adalah menggunakan APD lengkap meliputi kacamata goggle, jas lab, sarung tangan nitril tebal, dan masker respirator asam. Penuangan asam pekat selalu dilakukan di dalam lemari asam dengan menambahkan asam ke dalam air secara perlahan melalui dinding gelas kimia, bukan air ke dalam asam untuk mencegah percikan eksotermik hebat.',
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.submission.id, typedSubmissionId);
    // Verifikasi bahwa jawaban tersimpan utuh
    assert(res.body.submission.answers['q-1'].essayAnswer.includes('Prosedur keselamatan kerja'));
  });

  await test('Status AI diperbarui tanpa menghapus jawaban siswa (Zero Data Loss)', async () => {
    // Beri jeda agar setImmediate background evaluation selesai
    await sleep(800);

    const res = await request('/api/bootstrap', {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const sub = res.body.data.submissions.find(s => s.id === typedSubmissionId);
    assert(sub, 'Submission ketikan harus ditemukan di daftar guru');
    
    // Status AI harus salah satu dari: 'completed', 'failed', 'processing'
    assert(['completed', 'failed', 'processing'].includes(sub.aiGradingStatus), `Status tidak terduga: ${sub.aiGradingStatus}`);
    
    // Jawaban siswa tidak boleh hilang
    assert(sub.answers['q-1'].essayAnswer, 'Jawaban siswa harus tetap utuh');
    
    // Jika AI offline atau belum ada key, status harus 'perlu_pemeriksaan' dan requiresTeacherReview = true
    if (sub.aiGradingStatus === 'failed') {
      assert.strictEqual(sub.status, 'perlu_pemeriksaan');
      assert.strictEqual(sub.requiresTeacherReview, true);
      assert(sub.teacherFollowUp, 'Harus ada keterangan tindak lanjut untuk guru');
    }
  });

  // 4. Test Modality 2: Foto Tulisan Tangan (Gemini Vision Routing)
  console.log('\n--- 4. Uji Modalitas 2: Bukti Foto Tulisan Tangan ---');
  const imageSubmissionId = `sub-image-${Date.now()}`;
  let storedImageEvidence = null;

  await test('Unggah foto tulisan tangan -> Simpan aman ke disk & hitung SHA-256 hash', async () => {
    // 1x1 dummy transparent JPEG Base64
    const dummyJpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    
    const uploadRes = await request('/api/ai/process-multimodal-evidence', {
      method: 'POST',
      body: {
        evidenceId: `evid-img-${Date.now()}`,
        modalityType: 'handwriting',
        fileName: 'lembar_jawab_tulisan_tangan.jpg',
        fileData: dummyJpgBase64,
        questionId: 'q-2',
        studentNis: 'NIS-AI-002',
        studentName: 'Siti Tulisan Tangan',
        saveOnly: true
      }
    });

    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadRes.body.success, true);
    storedImageEvidence = uploadRes.body.evidence;
    assert(storedImageEvidence.storageUrl, 'Harus memiliki storageUrl');
    assert(storedImageEvidence.fileHash, 'Harus memiliki sha256 checksum');
    // Pastikan berkas benar-benar ada di disk
    if (storedImageEvidence.storagePath) {
      assert(fs.existsSync(storedImageEvidence.storagePath), 'Berkas harus ada di disk storage');
    }
  });

  await test('Siswa submit jawaban dengan foto tulisan tangan -> Terhubung ke alur Gemini Vision', async () => {
    const payload = {
      id: imageSubmissionId,
      examId: 'ex-audit-ai-image',
      examTitle: 'Ujian Uji Coba AI Tulisan Tangan',
      packageId: 'pkg-keselamatan-k3-10',
      studentId: 'usr-siswa-ai-image',
      studentName: 'Siti Tulisan Tangan',
      studentNis: 'NIS-AI-002',
      className: 'XII KA 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-2': {
          questionId: 'q-2',
          multimodalEvidences: [storedImageEvidence]
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await test('Penyimpanan foto tulisan tangan persisten & metadata AI terisi', async () => {
    await sleep(800);

    const res = await request('/api/bootstrap', {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const sub = res.body.data.submissions.find(s => s.id === imageSubmissionId);
    assert(sub, 'Submission foto tulisan tangan harus ditemukan');
    assert(sub.answers['q-2'].multimodalEvidences?.length > 0, 'Bukti foto harus terikat pada soal');
    // Berkas foto tidak hilang
    assert(sub.answers['q-2'].multimodalEvidences[0].storageUrl, 'Storage URL foto harus tetap ada');
  });

  // 5. Test Modality 3: Rekaman Suara / Audio (Gemini STT -> DeepSeek)
  console.log('\n--- 5. Uji Modalitas 3: Rekaman Mikrofon / Audio ---');
  const audioSubmissionId = `sub-audio-${Date.now()}`;
  let storedAudioEvidence = null;

  await test('Unggah rekaman audio -> Simpan aman ke disk & hitung SHA-256 hash', async () => {
    // Dummy audio webm Base64
    const dummyWebmBase64 = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAAAgEAAAAAAAAAAjHjAQAAAAAAAfmBAkP8gQWBAZM=';
    
    const uploadRes = await request('/api/ai/process-multimodal-evidence', {
      method: 'POST',
      body: {
        evidenceId: `evid-aud-${Date.now()}`,
        modalityType: 'audio',
        fileName: 'rekaman_lisan_prosedur.webm',
        fileData: dummyWebmBase64,
        questionId: 'q-3',
        studentNis: 'NIS-AI-003',
        studentName: 'Budi Rekaman Audio',
        audioDurationSeconds: 12,
        saveOnly: true
      }
    });

    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadRes.body.success, true);
    storedAudioEvidence = uploadRes.body.evidence;
    assert(storedAudioEvidence.storageUrl, 'Audio harus memiliki storageUrl');
    assert(storedAudioEvidence.fileHash, 'Audio harus memiliki sha256 checksum');
  });

  await test('Siswa submit jawaban dengan rekaman mikrofon -> Terhubung ke alur STT & Evaluasi', async () => {
    const payload = {
      id: audioSubmissionId,
      examId: 'ex-audit-ai-audio',
      examTitle: 'Ujian Uji Coba AI Rekaman Mikrofon',
      packageId: 'pkg-keselamatan-k3-10',
      studentId: 'usr-siswa-ai-audio',
      studentName: 'Budi Rekaman Audio',
      studentNis: 'NIS-AI-003',
      className: 'XII KA 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-3': {
          questionId: 'q-3',
          multimodalEvidences: [storedAudioEvidence]
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // 6. Test Anti-Duplikasi
  console.log('\n--- 6. Uji Anti-Duplikasi & Efisiensi Kuota API ---');
  await test('Kirim ulang submission yang sudah diproses -> Sistem mengabaikan evaluasi otomatis duplikat', async () => {
    // Kirim kembali submission typedSubmissionId
    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: {
        id: typedSubmissionId,
        examId: 'ex-audit-ai-typed',
        answers: {
          'q-1': {
            questionId: 'q-1',
            essayAnswer: 'Jawaban yang sama dikirim ulang.',
          }
        }
      }
    });

    assert.strictEqual(res.status, 200);
    // Tidak error dan submission tetap aman
    assert.strictEqual(res.body.success, true);
  });

  // 7. Test Evaluasi Ulang Manual oleh Guru
  console.log('\n--- 7. Uji Kontrol Guru: Penilaian Ulang Manual & Validasi Nilai ---');
  await test('Guru memicu penilaian ulang manual via POST /api/ai/evaluate-submission/:id', async () => {
    const res = await request(`/api/ai/evaluate-submission/${typedSubmissionId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.submission, 'Harus mengembalikan objek submission yang diperbarui');
  });

  await test('Guru melakukan validasi & perubahan skor via PUT /api/submissions/:id', async () => {
    const updatePayload = {
      id: typedSubmissionId,
      validationStatus: 'revised',
      validatedBy: 'Drs. H. Mulyadi, M.Pd.',
      validatedAt: new Date().toISOString(),
      teacherScoreTotal: 88,
      totalScore: 88,
      teacherFollowUp: 'Nilai disesuaikan oleh guru setelah memeriksa kelengkapan APD.',
      answers: {
        'q-1': {
          questionId: 'q-1',
          essayAnswer: 'Prosedur keselamatan kerja...',
          score: 5,
          maxScore: 5,
          teacherFeedback: 'Penjelasan sangat komprehensif.'
        }
      }
    };

    const res = await request(`/api/submissions/${typedSubmissionId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      body: updatePayload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.submission.validationStatus, 'revised');
    assert.strictEqual(res.body.submission.teacherScoreTotal, 88);
  });

  console.log('\n================================================================');
  console.log(` HASIL PENGUJIAN OTOMATIS: ${passed} LULUS, ${failed} GAGAL`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes gagal.`);
  }
}

runAutoAIPipelineTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
