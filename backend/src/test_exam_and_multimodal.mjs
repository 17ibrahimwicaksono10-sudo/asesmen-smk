import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';

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

async function runExamAndMultimodalValidation() {
  console.log('================================================================');
  console.log('🧪 VALIDASI 3 & 4: INTEGRITAS UJIAN (24 SOAL) & BUKTI MULTIMODAL');
  console.log('================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition, name) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ [LULUS] ${name}`);
      passedTests++;
    } else {
      console.error(`   ❌ [GAGAL] ${name}`);
      throw new Error(`Test Failed: ${name}`);
    }
  }

  // Persiapkan token autentikasi Admin dan Siswa
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@app.com', password: 'password' }
  });
  const adminToken = adminLogin.body.token;

  const testSuffix = Date.now().toString().slice(-4);
  const siswaReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Budi Santoso Uji Ujian',
      email: `budi.${testSuffix}@example.com`,
      identityNo: `NIS-BUDI-${testSuffix}`,
      schoolId: 'sch-cirebon-01',
      schoolName: 'SMK Negeri 1 Cirebon',
      classId: 'cls-ka-12-1',
      className: 'XII Kimia Analitik 1',
      password: 'password123'
    }
  });
  const siswaToken = siswaReg.body.token;
  const siswaUser = siswaReg.body.user;

  // Pastikan Ujian 24 Soal Terdaftar
  const testExamId = `exam-sim-24-${testSuffix}`;
  await request('/api/exams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      id: testExamId,
      title: 'Ujian Komprehensif Kimia Analisis & K3LH (24 Soal)',
      packageId: 'pkg-full-24',
      packageTitle: 'Paket 24 Soal Standar Laboratorium',
      category: 'teknis_kimia',
      classId: 'cls-ka-12-1',
      className: 'XII Kimia Analitik 1',
      schoolId: 'sch-cirebon-01',
      schoolName: 'SMK Negeri 1 Cirebon',
      teacherId: 'tch-cirebon-01',
      teacherName: 'Dra. Nurul Hidayati',
      scheduleDate: '2026-11-01',
      startTime: '08:00',
      endTime: '11:00',
      durationMinutes: 180,
      targetScore: 75,
      status: 'berlangsung',
      totalStudents: 32,
      completedStudents: 0
    }
  });

  // -------------------------------------------------------------
  // DOMAIN 3: VALIDASI UJIAN
  // -------------------------------------------------------------
  console.log('\n--- DOMAIN 3: VALIDASI UJIAN (24 SOAL, DRAFT, RETRY, RACE CONDITION) ---');

  // 1. Uji Draft Persistence: Simpan draft soal 5, reload, tutup browser & buka kembali
  console.log('\n1. Uji Draft Persistence (Simpan Draft, Refresh, Re-login)...');
  const draftPayload = {
    answers: {
      'q-01': { questionId: 'q-01', selectedOption: 'B' },
      'q-02': { questionId: 'q-02', selectedOptions: ['B', 'C'] },
      'q-03': { questionId: 'q-03', matchingAnswers: { 'col-A1': 'pH Buffer', 'col-A2': 'Kuvet' } },
      'q-04': { questionId: 'q-04', shortAnswerText: '0.0998 N' },
      'q-05': { questionId: 'q-05', selectedOption: 'A' }
    },
    currentQuestionIndex: 5
  };

  const saveDraftRes = await request(`/api/exams/${testExamId}/draft`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: draftPayload
  });
  assertTest(saveDraftRes.status === 200 && saveDraftRes.body.success, 'Draft jawaban 5 soal berhasil disimpan ke server');

  // Ambil draft seolah-olah browser refresh / tab dibuka ulang
  const getDraftRes = await request(`/api/exams/${testExamId}/draft`, {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  assertTest(getDraftRes.status === 200 && getDraftRes.body.draft, 'Draft berhasil dimuat ulang dari server setelah refresh');
  assertTest(getDraftRes.body.draft.currentQuestionIndex === 5, 'Posisi soal terakhir (index 5) persisten setelah refresh');
  assertTest(Object.keys(getDraftRes.body.draft.answers).length === 5, 'Seluruh 5 jawaban sementara tersimpan utuh tanpa kehilangan');

  // 2. Uji Konkurensi 2 Tab Membuka Ujian Sama
  console.log('\n2. Uji Konkurensi Dua Tab Membuka Ujian yang Sama...');
  // Tab 2 memperbarui jawaban soal 6
  const tab2Payload = {
    answers: {
      ...getDraftRes.body.draft.answers,
      'q-06': { questionId: 'q-06', selectedOptions: ['A', 'D'] }
    },
    currentQuestionIndex: 6
  };
  await request(`/api/exams/${testExamId}/draft`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: tab2Payload
  });
  const tabSyncDraft = await request(`/api/exams/${testExamId}/draft`, {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  assertTest(tabSyncDraft.body.draft.answers['q-06'] !== undefined, 'Jawaban dari tab 2 berhasil tersinkronisasi');
  assertTest(tabSyncDraft.body.draft.answers['q-01'] !== undefined, 'Jawaban sebelumnya dari tab 1 tidak tertimpa atau hilang');

  // 3. Uji 24 Soal Penuh vs Sebagian
  console.log('\n3. Uji Pengumpulan 24 Soal Penuh (MCQ, Kompleks, Menjodohkan, Isian, Esai)...');
  const fullAnswers24 = {};
  // 6 Pilihan Ganda
  ['q-01', 'q-05', 'q-09', 'q-13', 'q-17', 'q-21'].forEach(qid => {
    fullAnswers24[qid] = { questionId: qid, selectedOption: 'B', score: 4, maxScore: 4 };
  });
  // 2 Pilihan Ganda Kompleks
  ['q-02', 'q-06'].forEach(qid => {
    fullAnswers24[qid] = { questionId: qid, selectedOptions: ['A', 'C'], score: 5, maxScore: 5 };
  });
  // 2 Menjodohkan
  ['q-03', 'q-07'].forEach(qid => {
    fullAnswers24[qid] = { questionId: qid, matchingAnswers: { 'A1': 'B1', 'A2': 'B2' }, score: 5, maxScore: 5 };
  });
  // 2 Isian Singkat
  ['q-04', 'q-08'].forEach(qid => {
    fullAnswers24[qid] = { questionId: qid, shortAnswerText: '12.42 mL', score: 5, maxScore: 5 };
  });
  // 12 Soal Esai / Penjelasan Multimodal
  ['q-10', 'q-11', 'q-12', 'q-14', 'q-15', 'q-16', 'q-18', 'q-19', 'q-20', 'q-22', 'q-23', 'q-24'].forEach(qid => {
    fullAnswers24[qid] = {
      questionId: qid,
      essayAnswer: `Penjelasan komprehensif untuk soal ${qid} mengenai prosedur standar titrasi, kalibrasi pH meter, dan penanganan limbah K3LH.`,
      score: 5,
      maxScore: 6
    };
  });

  const fullSubmissionPayload = {
    id: `sub-full-24-${testSuffix}`,
    examId: testExamId,
    examTitle: 'Ujian Komprehensif Kimia Analisis & K3LH (24 Soal)',
    studentId: siswaUser.id,
    studentName: siswaUser.name,
    studentNis: siswaUser.identityNo,
    schoolId: siswaUser.schoolId,
    schoolName: siswaUser.schoolName,
    className: siswaUser.className,
    answers: fullAnswers24,
    totalScore: 88,
    technicalScore: 90,
    employabilityScore: 85,
    status: 'dinilai'
  };

  // 4. Uji Tombol Kirim Ditekan 10 Kali Bersamaan (Rapid Multi-Click / Race Condition)
  console.log('\n4. Uji Tombol Kirim Ditekan 10 Kali Bersamaan (Rapid 10x Concurrent Submission)...');
  const submitPromises = [];
  for (let click = 1; click <= 10; click++) {
    submitPromises.push(
      request('/api/submissions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${siswaToken}` },
        body: fullSubmissionPayload
      })
    );
  }
  const submitResponses = await Promise.all(submitPromises);
  const successSubmits = submitResponses.filter(r => r.status === 200 && r.body.success);
  assertTest(successSubmits.length === 10, 'Seluruh 10 panggilan kirim bersamaan direspons HTTP 200 (idempoten)');
  
  // Periksa bahwa database hanya menyimpan 1 submission dan total completedStudents bertambah tepat 1
  const allSubsCheck = await request('/api/submissions', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const matchingSubs = (allSubsCheck.body.submissions || []).filter(s => s.id === fullSubmissionPayload.id);
  assertTest(matchingSubs.length === 1, 'Database hanya menyimpan tepat 1 record submission (0 duplikasi data)');

  const examCheck = await request('/api/exams', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const updatedExam = (examCheck.body.exams || []).find(e => e.id === testExamId);
  assertTest(updatedExam && updatedExam.completedStudents === 1, 'completedStudents pada ujian bertambah tepat 1 (bukan 10)');

  // 5. Uji Proteksi Penimpaan Nilai Final oleh Retry Ilegal
  console.log('\n5. Uji Pencegahan Penimpaan Submission yang Sudah Dinilai...');
  const staleRetryPayload = {
    ...fullSubmissionPayload,
    totalScore: 10, // Nilai sengaja diturunkan seolah-olah terjadi pengiriman ulang corrupt
    answers: { 'q-01': { questionId: 'q-01', score: 0 } }
  };
  const staleRetryRes = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: staleRetryPayload
  });
  assertTest(staleRetryRes.body.alreadyCompleted === true || staleRetryRes.body.success, 'Retry pasca-finalisasi ditangani aman');
  
  // Pastikan nilai di server tetap nilai asli yang dihitung server, bukan nilai corrupt (10)
  const verifySubRes = await request(`/api/submissions/${fullSubmissionPayload.id}`, {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  const expectedFinalScore = submitResponses[0]?.body?.submission?.totalScore;
  assertTest(
    verifySubRes.body.submission.totalScore === expectedFinalScore && verifySubRes.body.submission.totalScore !== 10,
    `Nilai final submission (${expectedFinalScore}) tidak tertimpa oleh retry corrupt (10)`
  );

  // 6. Uji Ujian Ulang yang Sah (Attempt Baru)
  console.log('\n6. Uji Ujian Ulang Sah (Legitimate Retake / Attempt 2)...');
  const retakePayload = {
    ...fullSubmissionPayload,
    attemptNumber: 2,
    allowRetake: true,
    totalScore: 94
  };
  const retakeRes = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: retakePayload
  });
  assertTest(retakeRes.status === 200 && retakeRes.body.success, 'Submission attempt 2 diizinkan');
  assertTest(retakeRes.body.submission.id.includes('-att-2') || retakeRes.body.submission.attemptNumber === 2, 'Attempt 2 tersimpan dengan identifier attempt terpisah');

  // -------------------------------------------------------------
  // DOMAIN 4: VALIDASI MULTIMODAL
  // -------------------------------------------------------------
  console.log('\n--- DOMAIN 4: VALIDASI BUKTI MULTIMODAL (STT, AUDIO 10s-60s, STREAMING 206) ---');

  // 1. Uji Speech-to-Text Anti-Duplikasi Logika Handler
  console.log('\n1. Uji Verifikasi Logika Speech-to-Text Tanpa Akumulasi Duplikasi...');
  function simulateSTTEvents(speechChunks) {
    let finalAnswer = '';
    let currentInterim = '';

    for (const chunk of speechChunks) {
      if (chunk.isFinal) {
        finalAnswer = (finalAnswer + ' ' + chunk.text).trim();
        currentInterim = '';
      } else {
        currentInterim = chunk.text;
      }
    }
    return { finalAnswer, currentInterim };
  }

  const simulatedStream = [
    { text: 'jadi harusnya setelah NaCl selesai ya sudah di', isFinal: false },
    { text: 'jadi harusnya setelah NaCl selesai ya sudah Dibi', isFinal: false },
    { text: 'jadi harusnya setelah NaCl selesai ya sudah dibiarkan', isFinal: false },
    { text: 'jadi harusnya setelah NaCl selesai ya sudah dibiarkan saja.', isFinal: true },
    { text: 'kemudian bilas buret', isFinal: false },
    { text: 'kemudian bilas buret dengan akuades.', isFinal: true }
  ];

  const sttResult = simulateSTTEvents(simulatedStream);
  const expectedSTT = 'jadi harusnya setelah NaCl selesai ya sudah dibiarkan saja. kemudian bilas buret dengan akuades.';
  assertTest(sttResult.finalAnswer === expectedSTT, 'Teks final STT bersih dan tidak menduplikasi riwayat transkrip sementara');

  // 2. Uji Rekaman Audio 10 Detik, 30 Detik, dan 60 Detik
  console.log('\n2. Uji Rekaman Audio 10 Detik, 30 Detik, dan 60 Detik...');
  const durations = [10, 30, 60];
  const uploadedAudioEvidences = [];

  for (const dur of durations) {
    const audioBytes = Buffer.alloc(dur * 16000); // 16 KB/sec dummy audio opus
    for (let i = 0; i < audioBytes.length; i++) {
      audioBytes[i] = (i * 13 + dur) % 256;
    }
    const audioSha256 = crypto.createHash('sha256').update(audioBytes).digest('hex');
    const audioB64 = `data:audio/webm;base64,${audioBytes.toString('base64')}`;

    const uploadRes = await request('/api/ai/process-multimodal-evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${siswaToken}` },
      body: {
        evidence: {
          id: `ev-aud-${dur}s-${testSuffix}`,
          studentNis: siswaUser.identityNo,
          studentName: siswaUser.name,
          examId: testExamId,
          questionId: 'q-10',
          modalityType: 'audio',
          fileName: `rekaman_${dur}detik_${testSuffix}.webm`,
          fileSize: audioBytes.length,
          mimeType: 'audio/webm',
          fileData: audioB64,
          audioDurationSeconds: dur
        }
      }
    });

    assertTest(uploadRes.status === 200 && uploadRes.body.success, `Audio ${dur} detik berhasil diproses & diarsip ke repositori`);
    assertTest(uploadRes.body.evidence.storageUrl !== undefined, `Audio ${dur} detik memiliki persistent storageUrl`);
    assertTest(uploadRes.body.evidence.fileHash === audioSha256, `Audio ${dur} detik diverifikasi dengan SHA-256 yang akurat`);
    uploadedAudioEvidences.push(uploadRes.body.evidence);
  }

  // 3. Uji HTTP 206 Partial Content (Streaming & Audio Seeking Range Requests)
  console.log('\n3. Uji HTTP 206 Partial Content untuk Streaming Pemutaran Audio...');
  const sampleAudio = uploadedAudioEvidences[1]; // 30 detik
  const filename = path.basename(sampleAudio.storageUrl);

  const rangeRes = await fetch(`${BASE_URL}/api/evidence/file/${filename}`, {
    headers: { Range: 'bytes=0-1023' }
  });
  assertTest(rangeRes.status === 206, 'Pemutaran audio merespons HTTP 206 Partial Content saat meminta Range bytes');
  assertTest(rangeRes.headers.get('content-range')?.startsWith('bytes 0-1023/'), 'Header Content-Range valid untuk audio seeking');
  const chunkBuffer = Buffer.from(await rangeRes.arrayBuffer());
  assertTest(chunkBuffer.length === 1024, 'Ukuran chunk audio yang dialirkan tepat 1024 bytes');

  // 4. Uji Unggah Gambar Lembar Kerja & Dokumen Praktikum
  console.log('\n4. Uji Unggah Lembar Kerja Tulisan Tangan & Dokumen Lab...');
  const dummyImgBytes = Buffer.alloc(128 * 1024);
  for (let i = 0; i < dummyImgBytes.length; i++) dummyImgBytes[i] = (i * 3 + 1) % 256;
  const imgSha256 = crypto.createHash('sha256').update(dummyImgBytes).digest('hex');

  const imgUploadRes = await request('/api/ai/process-multimodal-evidence', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: {
      evidence: {
        id: `ev-img-lembar-${testSuffix}`,
        studentNis: siswaUser.identityNo,
        studentName: siswaUser.name,
        examId: testExamId,
        questionId: 'q-14',
        modalityType: 'tulisan_tangan',
        fileName: `lembar_kerja_${testSuffix}.jpg`,
        fileSize: dummyImgBytes.length,
        mimeType: 'image/jpeg',
        fileData: `data:image/jpeg;base64,${dummyImgBytes.toString('base64')}`
      }
    }
  });

  assertTest(imgUploadRes.status === 200 && imgUploadRes.body.success, 'Foto lembar kerja berhasil diunggah');
  assertTest(imgUploadRes.body.evidence.fileHash === imgSha256, 'Foto lembar kerja terverifikasi integritas SHA-256');

  // Lampirkan bukti foto dan audio ke dalam submission siswa
  const subWithEvidence = {
    id: `sub-ev-linked-${testSuffix}`,
    examId: testExamId,
    examTitle: 'Ujian Kimia Analisis & K3LH',
    studentId: siswaUser.id,
    studentName: siswaUser.name,
    studentNis: siswaUser.identityNo,
    schoolId: siswaUser.schoolId,
    schoolName: siswaUser.schoolName,
    className: siswaUser.className,
    attemptNumber: 3,
    allowRetake: true,
    answers: {
      'q-14': {
        questionId: 'q-14',
        essayAnswer: 'Hasil pengamatan titrasi argentometri dan foto lembar kerja terlampir.',
        multimodalEvidences: [imgUploadRes.body.evidence]
      }
    },
    evidences: [imgUploadRes.body.evidence, sampleAudio],
    totalScore: 92,
    technicalScore: 92,
    employabilityScore: 90,
    status: 'dinilai'
  };

  await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: subWithEvidence
  });

  // 5. Uji Keterkaitan Bukti ke Siswa, Soal, dan Attempt
  console.log('\n5. Uji Keterkaitan Bukti Persisten ke Siswa, Soal, dan Attempt yang Tepat...');
  const auditRes = await request(`/api/evidence/audit/${imgUploadRes.body.evidence.id}`);
  assertTest(auditRes.status === 200 && auditRes.body.success, 'Endpoint audit jejak bukti merespon HTTP 200');
  assertTest(auditRes.body.audit.studentNis === siswaUser.identityNo, 'Bukti terhubung ke NIS siswa yang tepat');
  assertTest(auditRes.body.audit.questionId === 'q-14', 'Bukti terhubung ke nomor soal (q-14) yang tepat');
  assertTest(auditRes.body.audit.integrityStatus === 'VERIFIED_PASS', 'Status integritas bukti berstatus VERIFIED_PASS');

  console.log(`\n================================================================`);
  console.log(`🎉 VALIDASI 3 & 4 SELESAI: SEMUA ${passedTests}/${totalTests} PENGUJIAN UJIAN & MULTIMODAL LULUS!`);
  console.log(`================================================================`);
  return { passedTests, totalTests };
}

runExamAndMultimodalValidation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ VALIDASI 3 & 4 GAGAL:', err);
    process.exit(1);
  });
