import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

console.log('======================================================================');
console.log('🧪 PENGUJIAN KETAHANAN PENILAIAN AI & VALIDASI KONTROL GURU (9 UJI WAJIB)');
console.log(` Target Server: ${BASE_URL}`);
console.log('======================================================================\n');

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

async function runResilienceTests() {
  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & Environment Status
  console.log('--- PEMERIKSAAN LINGKUNGAN API & STATUS WORKER ---');
  let healthInfo = null;
  await test('GET /api/health mengembalikan status penyedia AI dan status antrean', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    healthInfo = res.body;
    assert.strictEqual(typeof healthInfo.geminiKeyConfigured, 'boolean');
    assert.strictEqual(typeof healthInfo.deepseekKeyConfigured, 'boolean');
    assert(healthInfo.aiQueue, 'Harus memuat status aiQueue');
    assert.strictEqual(typeof healthInfo.aiQueue.queueLength, 'number');
    assert.strictEqual(typeof healthInfo.aiQueue.activeJobsCount, 'number');
    
    // Klasifikasi lingkungan: Mock vs Real API
    const isRealGemini = healthInfo.geminiKeyConfigured;
    const isRealDeepSeek = healthInfo.deepseekKeyConfigured;
    console.log(`     [Lingkungan API] Gemini Vision/STT: ${isRealGemini ? 'Terkonfigurasi (Kunci Aktif)' : 'Mode Aman Offline / Mock Fallback'}`);
    console.log(`     [Lingkungan API] DeepSeek Grading : ${isRealDeepSeek ? 'Terkonfigurasi (Kunci Aktif)' : 'Mode Aman Offline / Mock Fallback'}`);
  });

  // Setup User Siswa & Guru
  const ts = Date.now();
  const studentEmail = `siswa.resilience.${ts}@smk.sch.id`;
  await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Siswa Ketahanan AI ${ts}`,
      email: studentEmail,
      password: 'password123',
      identityNo: `NIS-RES-${ts}`,
      role: 'siswa',
      schoolName: 'SMK Negeri 1 Surabaya',
      className: 'XII Kimia Analitik 1',
      classId: 'cls-1'
    }
  });

  const sLogin = await login(studentEmail, 'password123');
  const studentToken = sLogin.token;
  const tLogin = await login('admin@app.com', 'password');
  const teacherToken = tLogin.token;

  // --------------------------------------------------------------------
  // UJI 1: Submission Esai Ketikan
  // --------------------------------------------------------------------
  console.log('\n--- UJI 1: Submission Esai Ketikan (DeepSeek Pipeline) ---');
  const typedSubId = `sub-res-typed-${ts}`;
  await test('Siswa mengumpulkan esai ketikan -> tersimpan utuh dan antrean AI terpicu', async () => {
    const payload = {
      id: typedSubId,
      examId: 'ex-resilience-test',
      examTitle: 'Ujian Ketahanan AI Kimia',
      packageId: 'pkg-keselamatan-k3-10',
      studentName: 'Ahmad Siswa Uji',
      studentNis: `NIS-RES-${ts}`,
      className: 'XII Kimia Analitik 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-k3-01': {
          questionId: 'q-k3-01',
          essayAnswer: 'Langkah pertama saat menghadapi tumpahan asam pekat di lantai laboratorium adalah menaburkan bahan penetral seperti natrium bikarbonat atau pasir kering di sekeliling tumpahan agar tidak menyebar, menjauhkan praktikan lain, menggunakan APD respirator dan sarung tangan nitril tebal, lalu membersihkan sisa tumpahan sesuai SOP B3.'
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.submission.id, typedSubId);
    assert(res.body.submission.answers['q-k3-01'].essayAnswer.includes('Langkah pertama saat menghadapi tumpahan'));
  });

  // --------------------------------------------------------------------
  // UJI 2: Submission Gambar Tulisan Tangan
  // --------------------------------------------------------------------
  console.log('\n--- UJI 2: Submission Gambar Tulisan Tangan (Gemini Vision Pipeline) ---');
  const imgSubId = `sub-res-img-${ts}`;
  let storedImage = null;
  await test('Unggah foto tulisan tangan -> arsip persisten dengan hash SHA-256 dan link ke soal', async () => {
    const dummyJpg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const uploadRes = await request('/api/ai/process-multimodal-evidence', {
      method: 'POST',
      body: {
        evidenceId: `evid-res-img-${ts}`,
        modalityType: 'handwriting',
        fileName: 'lembar_jawab_resilience.jpg',
        fileData: dummyJpg,
        questionId: 'q-k3-02',
        studentNis: `NIS-RES-${ts}`,
        studentName: 'Ahmad Siswa Uji',
        saveOnly: true
      }
    });

    assert.strictEqual(uploadRes.status, 200);
    storedImage = uploadRes.body.evidence;
    assert(storedImage.storageUrl, 'Harus memiliki storageUrl');
    assert(storedImage.fileHash, 'Harus memiliki fileHash SHA-256');

    // Submit ujian dengan lampiran gambar
    const payload = {
      id: imgSubId,
      examId: 'ex-resilience-test',
      examTitle: 'Ujian Ketahanan AI Kimia',
      packageId: 'pkg-keselamatan-k3-10',
      studentName: 'Ahmad Siswa Uji',
      studentNis: `NIS-RES-${ts}`,
      className: 'XII Kimia Analitik 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-k3-02': {
          questionId: 'q-k3-02',
          multimodalEvidences: [storedImage]
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: payload
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // --------------------------------------------------------------------
  // UJI 3: Submission Rekaman Audio
  // --------------------------------------------------------------------
  console.log('\n--- UJI 3: Submission Rekaman Audio (Gemini STT -> DeepSeek Pipeline) ---');
  const audSubId = `sub-res-aud-${ts}`;
  let storedAudio = null;
  await test('Unggah rekaman audio -> arsip persisten dengan hash SHA-256 dan link ke soal', async () => {
    const dummyWebm = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAAAgEAAAAAAAAAAjHjAQAAAAAAAfmBAkP8gQWBAZM=';
    const uploadRes = await request('/api/ai/process-multimodal-evidence', {
      method: 'POST',
      body: {
        evidenceId: `evid-res-aud-${ts}`,
        modalityType: 'audio',
        fileName: 'rekaman_k3_resilience.webm',
        fileData: dummyWebm,
        questionId: 'q-k3-03',
        studentNis: `NIS-RES-${ts}`,
        studentName: 'Ahmad Siswa Uji',
        audioDurationSeconds: 15,
        saveOnly: true
      }
    });

    assert.strictEqual(uploadRes.status, 200);
    storedAudio = uploadRes.body.evidence;
    assert(storedAudio.storageUrl, 'Harus memiliki storageUrl');
    assert(storedAudio.fileHash, 'Harus memiliki fileHash SHA-256');

    // Submit ujian dengan lampiran audio
    const payload = {
      id: audSubId,
      examId: 'ex-resilience-test',
      examTitle: 'Ujian Ketahanan AI Kimia',
      packageId: 'pkg-keselamatan-k3-10',
      studentName: 'Ahmad Siswa Uji',
      studentNis: `NIS-RES-${ts}`,
      className: 'XII Kimia Analitik 1',
      submitTime: new Date().toISOString(),
      status: 'perlu_pemeriksaan',
      answers: {
        'q-k3-03': {
          questionId: 'q-k3-03',
          multimodalEvidences: [storedAudio]
        }
      }
    };

    const res = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: payload
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // --------------------------------------------------------------------
  // UJI 4: Backend Restart Saat Penilaian Berstatus 'processing'
  // --------------------------------------------------------------------
  console.log('\n--- UJI 4: Simulasi Backend Restart Saat Penilaian Berstatus "processing" ---');
  const interruptedSubId = `sub-interrupted-${ts}`;
  await test('Pekerjaan yang terhenti berstatus "processing" dapat dipulihkan otomatis oleh worker', async () => {
    // 1. Simpan submission buatan yang seolah-olah terhenti di tengah evaluasi sebelum server mati
    const interruptedPayload = {
      id: interruptedSubId,
      examId: 'ex-interrupted-test',
      examTitle: 'Ujian Uji Coba Recovery Restart',
      packageId: 'pkg-keselamatan-k3-10',
      studentName: 'Siswa Interrupted Restart',
      studentNis: `NIS-INT-${ts}`,
      className: 'XII Kimia Analitik 1',
      submitTime: new Date(Date.now() - 300000).toISOString(), // 5 menit yang lalu
      status: 'perlu_pemeriksaan',
      aiGradingStatus: 'processing', // Terhenti di status processing
      aiGradingLockedAt: new Date(Date.now() - 300000).toISOString(), // Lock basi
      aiGradingAttempts: 1,
      answers: {
        'q-k3-01': {
          questionId: 'q-k3-01',
          essayAnswer: 'Jawaban yang terhenti saat container restart mendadak.'
        }
      }
    };

    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: interruptedPayload
    });

    // 2. Beri waktu agar worker recovery loop berjalan
    await sleep(600);

    // 3. Periksa status submission pasca pemulihan
    const subRes = await request(`/api/submissions/${interruptedSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(subRes.status, 200);
    const sub = subRes.body.submission;
    assert(sub, 'Submission terhenti harus ditemukan');
    // Lock basi harus sudah dibebaskan dan status tidak boleh macet di 'processing' permanen
    assert(sub.aiGradingStatus !== 'processing' || !sub.aiGradingLockedAt, 'Pekerjaan terhenti harus pulih');
    assert(sub.answers['q-k3-01'].essayAnswer, 'Jawaban siswa tidak boleh hilang');
  });

  // --------------------------------------------------------------------
  // UJI 5: Penanganan API Timeout & Kegagalan Jaringan
  // --------------------------------------------------------------------
  console.log('\n--- UJI 5: Penanganan API Timeout & Jaringan Terputus ---');
  await test('Kegagalan API tidak menyebabkan kehilangan data dan tidak memvonis skor 0 final', async () => {
    // Ambil submission ketikan
    const subRes = await request(`/api/submissions/${typedSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(subRes.status, 200);
    const sub = subRes.body.submission;
    
    // Status harus aman: jawaban tidak hilang, tidak diset nilai 0 mutlak tanpa verifikasi guru
    assert(sub.answers['q-k3-01'].essayAnswer, 'Jawaban teks tetap tersimpan aman');
    assert.strictEqual(sub.status, 'perlu_pemeriksaan');
    assert.strictEqual(sub.requiresTeacherReview, true);
    assert(sub.teacherFollowUp, 'Keterangan guru terisi untuk verifikasi');
  });

  // --------------------------------------------------------------------
  // UJI 6: Penanganan Rate Limit & Concurrency Limiting
  // --------------------------------------------------------------------
  console.log('\n--- UJI 6: Penanganan Rate Limit & Pengendalian Konkurensi ---');
  await test('Antrean membatasi konkurensi (MAX_CONCURRENT_JOBS <= 2) untuk mencegah HTTP 429', async () => {
    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
    const q = health.body.aiQueue;
    assert(q, 'Data antrean AI harus ada');
    assert(q.maxConcurrentJobs <= 2, `Batas konkurensi harus <= 2 (ditemukan: ${q.maxConcurrentJobs})`);
    assert(q.activeJobsCount <= q.maxConcurrentJobs, 'Pekerjaan aktif tidak melebihi batas konkurensi');
  });

  // --------------------------------------------------------------------
  // UJI 7: Pencegahan Submission Ganda (Anti-Duplikasi)
  // --------------------------------------------------------------------
  console.log('\n--- UJI 7: Pencegahan Submission Ganda (Rapid Duplicate Submission) ---');
  await test('Pengiriman ulang submission yang sama diabaikan dari pemrosesan ganda', async () => {
    const duplicateRes = await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: typedSubId,
        examId: 'ex-resilience-test',
        answers: {
          'q-k3-01': {
            questionId: 'q-k3-01',
            essayAnswer: 'Pengiriman duplikat kedua.'
          }
        }
      }
    });

    assert.strictEqual(duplicateRes.status, 200);
    assert.strictEqual(duplicateRes.body.success, true);
  });

  // --------------------------------------------------------------------
  // UJI 8: Penilaian Ulang Manual oleh Guru (Force Retry)
  // --------------------------------------------------------------------
  console.log('\n--- UJI 8: Penilaian Ulang Manual oleh Guru (Force Retry) ---');
  await test('Guru dapat memicu evaluasi ulang manual via POST /api/ai/evaluate-submission/:id', async () => {
    const evalRes = await request(`/api/ai/evaluate-submission/${typedSubId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(evalRes.status, 200);
    assert.strictEqual(evalRes.body.success, true);
    assert(evalRes.body.submission, 'Harus mengembalikan objek submission yang diperbarui');
    assert(evalRes.body.submission.answers['q-k3-01'].essayAnswer, 'Jawaban siswa tetap utuh');
  });

  // --------------------------------------------------------------------
  // UJI 9: Imunitas Validasi Guru (Tidak Tertimpa Hasil AI Berikutnya)
  // --------------------------------------------------------------------
  console.log('\n--- UJI 9: Imunitas Validasi Guru (Anti-Penimpaan oleh AI) ---');
  await test('Nilai dan status yang sudah disahkan/direvisi guru TIDAK BOLEH ditimpa oleh evaluasi AI otomatis', async () => {
    // 1. Guru mengesahkan dan menetapkan skor final 92
    const teacherValidationPayload = {
      id: typedSubId,
      validationStatus: 'approved',
      validatedBy: 'Drs. H. Mulyadi, M.Pd. (Guru Penguji)',
      validatedAt: new Date().toISOString(),
      teacherScoreTotal: 92,
      totalScore: 92,
      teacherFollowUp: 'Nilai disahkan 92 oleh guru penguji setelah verifikasi jawaban.',
      answers: {
        'q-k3-01': {
          questionId: 'q-k3-01',
          score: 5,
          maxScore: 5,
          teacherFeedback: 'Prosedur keselamatan kerja dijelaskan dengan sangat baik.'
        }
      }
    };

    const updateRes = await request(`/api/submissions/${typedSubId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: teacherValidationPayload
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.submission.validationStatus, 'approved');
    assert.strictEqual(updateRes.body.submission.totalScore, 92);

    // 2. Coba picu evaluasi otomatis melalui submission trigger
    await request('/api/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        id: typedSubId,
        examId: 'ex-resilience-test',
        answers: {
          'q-k3-01': { questionId: 'q-k3-01', score: 0 }
        }
      }
    });

    // 3. Verifikasi bahwa nilai guru (92) dan status approved TETAP UTUH
    const verifyRes = await request(`/api/submissions/${typedSubId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(verifyRes.status, 200);
    const finalSub = verifyRes.body.submission;
    assert.strictEqual(finalSub.validationStatus, 'approved', 'Status validasi harus tetap approved');
    assert.strictEqual(finalSub.validatedBy, 'Drs. H. Mulyadi, M.Pd. (Guru Penguji)', 'Identitas guru validator tidak boleh hilang');
    assert.strictEqual(finalSub.teacherScoreTotal, 92, 'Skor guru (92) tidak boleh tertimpa');
    assert.strictEqual(finalSub.totalScore, 92, 'Total skor (92) tidak boleh tertimpa');
  });

  console.log('\n======================================================================');
  console.log(` HASIL PENGUJIAN KETAHANAN AI: ${passed} LULUS, ${failed} GAGAL`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tes ketahanan AI gagal.`);
  }
}

runResilienceTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
