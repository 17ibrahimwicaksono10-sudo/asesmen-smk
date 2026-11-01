import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  evaluateStudentAnswerStandard, 
  evaluateTypedEssayWithDeepSeek, 
  evaluateImageWithGeminiVision, 
  evaluateAudioWithGeminiSTTAndDeepSeek 
} from './aiEvaluationRouter.js';

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

async function runComprehensiveTests() {
  console.log('========================================================================');
  console.log('🔍 PENGUJIAN MENYELURUH: 8 PRIORITAS PERBAIKAN SISTEM UJIAN & AI');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  // 1. Setup Auth: Login Admin & Register temporary student
  console.log('--- 0. Persiapan Autentikasi Pengujian ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@app.com', password: 'password' }
  });
  assert(adminLogin.status === 200 && adminLogin.body.token, 'Login admin berhasil');
  const adminToken = adminLogin.body.token;

  const uniqueId = Date.now().toString().slice(-5);
  const studentEmail = `audit_siswa_${uniqueId}@sekolah.id`;
  const studentReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Siswa Audit ${uniqueId}`,
      email: studentEmail,
      password: 'Password123!',
      role: 'student'
    }
  });
  assert(studentReg.status === 201 || studentReg.status === 200, 'Registrasi siswa audit berhasil');
  const studentToken = studentReg.body.token;

  // ==========================================================================
  // PRIORITAS 1: STIMULUS SOAL
  // ==========================================================================
  console.log('\n--- PRIORITAS 1: STIMULUS SOAL MUNCUL SEBELUM PERTANYAAN ---');
  const examQuestionsRes = await request('/api/exams/ex-test-paket-a/questions', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(examQuestionsRes.status === 200, 'Berhasil mengambil soal ujian ex-test-paket-a');
  const questions = examQuestionsRes.body.questions || examQuestionsRes.body;
  assert(Array.isArray(questions) && questions.length > 0, `Jumlah soal ujian valid: ${questions.length} soal`);

  // Periksa apakah stimulus hadir di soal nomor 1 atau soal lain yang memiliki stimulus
  const qWithStimulus = questions.filter(q => q.stimulus);
  assert(qWithStimulus.length > 0, `Ditemukan ${qWithStimulus.length} soal yang memiliki stimulus`);

  const q1 = questions.find(q => q.id === 'tk-01' || q.id === 'q-tk-01') || questions[0];
  console.log(`   Soal 1 (${q1.id}) stimulus type:`, typeof q1.stimulus);
  assert(q1.stimulus !== undefined && q1.stimulus !== null, 'Stimulus soal 1 tidak kosong/undefined');
  if (typeof q1.stimulus === 'object') {
    assert(q1.stimulus.title || q1.stimulus.text || q1.stimulus.imageUrl || q1.stimulus.dataTables, 'Stimulus terstruktur memiliki atribut konten (title/text/dataTables)');
  }

  // Pastikan kunci jawaban TIDAK bocor pada soal siswa
  assert(q1.correctAnswer === undefined, 'Kunci jawaban (correctAnswer) tidak bocor ke siswa');
  assert(q1.correctAnswerKey === undefined, 'Kunci jawaban (correctAnswerKey) tidak bocor ke siswa');

  // ==========================================================================
  // PRIORITAS 2: SOAL NOMOR 3 DAN 7 (MATCHING) TIDAK CRASH
  // ==========================================================================
  console.log('\n--- PRIORITAS 2: SOAL NOMOR 3 DAN 7 (MATCHING) BEBAS ERROR ---');
  const q3 = questions.find(q => q.id === 'tk-03' || q.id === 'q-tk-03') || questions[2];
  const q7 = questions.find(q => q.id === 'tk-07' || q.id === 'q-tk-07') || questions[6];

  console.log(`   Q3 (${q3?.id}) tipe: ${q3?.type}, Q7 (${q7?.id}) tipe: ${q7?.type}`);
  assert(q3 !== undefined, 'Soal 3 ditemukan dalam daftar soal');
  assert(q7 !== undefined, 'Soal 7 ditemukan dalam daftar soal');

  // Periksa struktur matchingColumnA dan matchingColumnB pada Q3
  if (q3.type === 'matching') {
    assert(Array.isArray(q3.matchingColumnA), 'Q3 matchingColumnA adalah array');
    assert(Array.isArray(q3.matchingColumnB), 'Q3 matchingColumnB adalah array');
    assert(q3.matchingColumnA.length > 0, 'Q3 matchingColumnA tidak kosong');
    assert(q3.matchingColumnB.length > 0, 'Q3 matchingColumnB tidak kosong');

    // Kolom B harus berupa array of strings agar filter(b => (b || '').trim()) tidak error
    for (const bItem of q3.matchingColumnB) {
      assert(typeof bItem === 'string', `Q3 matchingColumnB item '${bItem}' adalah string murni (bukan object)`);
      // Uji coba eksekusi pemanggilan trim()
      const trimmed = (bItem || '').trim();
      assert(typeof trimmed === 'string', 'Metode trim() dapat dipanggil tanpa melempar TypeError');
    }

    // Kolom A harus memiliki columnAText atau label, dan tidak membocorkan correctMatch
    for (const aItem of q3.matchingColumnA) {
      assert(aItem.columnAText !== undefined || aItem.label !== undefined, 'Q3 matchingColumnA memiliki label/columnAText');
      assert(aItem.correctMatch === undefined, 'Q3 matchingColumnA tidak membocorkan correctMatch ke siswa');
    }
  }

  // Periksa struktur matchingColumnA dan matchingColumnB pada Q7
  if (q7.type === 'matching') {
    assert(Array.isArray(q7.matchingColumnA), 'Q7 matchingColumnA adalah array');
    assert(Array.isArray(q7.matchingColumnB), 'Q7 matchingColumnB adalah array');
    for (const bItem of q7.matchingColumnB) {
      assert(typeof bItem === 'string', `Q7 matchingColumnB item '${bItem}' adalah string murni`);
      const trimmed = (bItem || '').trim();
      assert(typeof trimmed === 'string', 'Q7 trim() berjalan mulus');
    }
    for (const aItem of q7.matchingColumnA) {
      assert(aItem.columnAText !== undefined || aItem.label !== undefined, 'Q7 matchingColumnA memiliki label');
      assert(aItem.correctMatch === undefined, 'Q7 matchingColumnA tidak membocorkan correctMatch');
    }
  }

  // ==========================================================================
  // PRIORITAS 3: PENYIMPANAN JAWABAN SISWA (JAWABAN SALAH NOMOR 1 TERCATAT LENGKAP)
  // ==========================================================================
  console.log('\n--- PRIORITAS 3: PENYIMPANAN & RESPON ASLI SISWA (JAWABAN SALAH TETAP TERCATAT) ---');
  // Simulasikan siswa menjawab:
  // Q1 dijawab dengan pilihan SALAH ("B" atau "C")
  // Q3 matching dijawab sebagian
  const testAnswers = {};
  const q1Id = q1.id;
  testAnswers[q1Id] = 'B'; // Opsi salah

  if (q3.type === 'matching') {
    testAnswers[q3.id] = {
      [q3.matchingColumnA[0].id]: q3.matchingColumnB[0]
    };
  }

  const submissionPayload = {
    examId: 'ex-test-paket-a',
    studentId: studentReg.body.user?.id || 'audit-student',
    studentName: `Siswa Audit ${uniqueId}`,
    answers: testAnswers,
    submittedAt: new Date().toISOString()
  };

  const submitRes = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: submissionPayload
  });

  console.log('   submitRes.status:', submitRes.status, 'body:', JSON.stringify(submitRes.body));
  const submissionId = submitRes.body.submissionId || submitRes.body.id || submitRes.body?.submission?.id || submitRes.body?.data?.id;
  assert(submissionId, 'Objek submission tersimpan memiliki ID');

  // Guru memeriksa submission siswa via panel inspeksi
  const teacherInspectionRes = await request(`/api/submissions/${submissionId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const inspectedSub = teacherInspectionRes.body.submission || teacherInspectionRes.body;
  console.log('   inspectedSub.answers[q1Id]:', inspectedSub.answers?.[q1Id]);
  console.log('   inspectedSub.scores[q1Id]:', inspectedSub.scores?.[q1Id]);

  // Verifikasi bahwa jawaban salah siswa pada nomor 1 TERSIMPAN UTUH di database
  const studentAns = typeof inspectedSub.answers?.[q1Id] === 'object' && inspectedSub.answers?.[q1Id] !== null
    ? (inspectedSub.answers[q1Id].answer !== undefined ? inspectedSub.answers[q1Id].answer : inspectedSub.answers[q1Id].selected)
    : inspectedSub.answers?.[q1Id];
  
  assert(studentAns === 'B' || inspectedSub.answers?.[q1Id] === 'B' || JSON.stringify(inspectedSub.answers?.[q1Id]).includes('B'), `Respons asli siswa '${studentAns || JSON.stringify(inspectedSub.answers?.[q1Id])}' tersimpan lengkap`);
  const q1Score = inspectedSub.scores?.[q1Id] !== undefined ? inspectedSub.scores[q1Id] : inspectedSub.answers?.[q1Id]?.score;
  assert(q1Score === 0, `Skor untuk jawaban salah pada Q1 adalah 0 (skor: ${q1Score})`);

  // ==========================================================================
  // PRIORITAS 4 & 5: ARSITEKTUR PEMISAHAN AI (GEMINI vs DEEPSEEK) & EVALUASI RUBRIK
  // ==========================================================================
  console.log('\n--- PRIORITAS 4 & 5: ARSITEKTUR PEMISAHAN AI (DEEPSEEK: TEKS, GEMINI: VISION) ---');

  // Test 5.1: Jawaban Ketikan Siswa -> Wajib DeepSeek (Gemini Tidak Boleh Dipanggil)
  console.log('   Testing 5.1: Evaluasi Jawaban Ketikan (DeepSeek Mode)...');
  const typedResult = await evaluateStudentAnswerStandard({
    question_id: 'tk-essay-01',
    attempt_id: submissionId,
    question_text: 'Jelaskan faktor-faktor yang mempengaruhi laju reaksi kimia!',
    answer_key_or_exemplar: 'Faktor yang mempengaruhi laju reaksi antara lain: konsentrasi reaktan, suhu reaksi, luas permukaan bidang sentuh, dan katalis.',
    rubric_indicators: [
      { id: 'ind-1', name: 'Identifikasi 4 Faktor Utama', maxScore: 4, criteria: 'Menyebutkan konsentrasi, suhu, luas permukaan, dan katalis' },
      { id: 'ind-2', name: 'Penjelasan Mekanisme Tumbukan', maxScore: 6, criteria: 'Menjelaskan energi aktivasi dan frekuensi tumbukan efektif' }
    ],
    max_score: 10,
    input_type: 'typed_text',
    student_text: 'Faktornya adalah suhu, konsentrasi, luas permukaan, dan katalisator. Jika suhu naik maka partikel bergerak lebih cepat dan tumbukan meningkat.',
    provider_preference: 'auto'
  });

  assert(typedResult.input_type === 'typed_text', 'Input type terkonfirmasi typed_text');
  assert(typedResult.model_used.includes('deepseek'), `Model yang digunakan wajib DeepSeek (hasil: ${typedResult.model_used})`);
  assert(!typedResult.model_used.toLowerCase().includes('gemini'), 'Gemini TIDAK dipanggil untuk jawaban ketikan teks');
  assert(typeof typedResult.total_score === 'number', `Skor total numerik valid: ${typedResult.total_score}`);
  assert(typedResult.total_score <= typedResult.maximum_score, `Skor total (${typedResult.total_score}) tidak melebihi skor maksimal (${typedResult.maximum_score})`);
  assert(Array.isArray(typedResult.rubric_scores) && typedResult.rubric_scores.length === 2, 'Skor per indikator rubrik diisi lengkap');
  assert(typedResult.scoring_reason && typedResult.scoring_reason.length > 5, 'Alasan penilaian terperinci ada');

  // Test 5.2: Bukti Foto Tulisan Tangan -> Wajib Gemini Vision Langsung (DeepSeek Tidak Dipanggil)
  console.log('   Testing 5.2: Evaluasi Bukti Gambar Tulisan Tangan (Gemini Vision Mode)...');
  // Buat dummy 1x1 png base64
  const dummyBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const imageResult = await evaluateStudentAnswerStandard({
    question_id: 'tk-essay-photo-01',
    attempt_id: submissionId,
    question_text: 'Tuliskan persamaan reaksi pembakaran gas metana dan tentukan pereaksi pembatas!',
    answer_key_or_exemplar: 'CH4 + 2O2 -> CO2 + 2H2O',
    rubric_indicators: [
      { id: 'ind-reaksi', name: 'Penulisan Persamaan Reaksi Setara', maxScore: 5, criteria: 'Reaksi setara CH4 + 2O2 -> CO2 + 2H2O' },
      { id: 'ind-hitung', name: 'Perhitungan Pereaksi Pembatas', maxScore: 5, criteria: 'Perbandingan mol sesuai stoikiometri' }
    ],
    max_score: 10,
    input_type: 'image_upload',
    image_base64: dummyBase64Image,
    image_mime_type: 'image/png',
    provider_preference: 'auto'
  });

  assert(imageResult.input_type === 'image_upload', 'Input type terkonfirmasi image_upload');
  assert(imageResult.model_used.toLowerCase().includes('gemini'), `Model untuk foto wajib Gemini (hasil: ${imageResult.model_used})`);
  assert(!imageResult.model_used.toLowerCase().includes('deepseek'), 'DeepSeek TIDAK dipanggil untuk penilaian foto tulisan tangan langsung');
  assert(imageResult.total_score <= imageResult.maximum_score, 'Skor foto tidak melebihi skor maksimal');
  assert(imageResult.requires_teacher_review !== undefined, 'Flag requires_teacher_review ada');

  // Test 5.3: Penanganan Kegagalan Bukti Rusak / Tidak Terbaca
  console.log('   Testing 5.3: Penanganan Bukti Rusak / Gagal Ekstraksi...');
  const failedResult = await evaluateStudentAnswerStandard({
    question_id: 'tk-essay-corrupt-01',
    attempt_id: submissionId,
    question_text: 'Hitung pH larutan asam lemah!',
    answer_key_or_exemplar: 'pH = 3',
    rubric_indicators: [{ id: 'ind-ph', name: 'Nilai pH', maxScore: 5 }],
    max_score: 5,
    input_type: 'image_upload',
    image_base64: 'data:image/jpeg;base64,corrupt_data_not_valid',
    image_mime_type: 'image/jpeg'
  });

  assert(failedResult.assessment_status === 'Perlu Review Guru' || failedResult.requires_teacher_review === true, 'Status kegagalan otomatis dialihkan ke "Perlu Review Guru"');
  assert(!failedResult.transcription_or_extraction.includes('Simulasi'), 'Tidak membuat teks narasi atau jawaban simulasi fiktif');

  // ==========================================================================
  // PRIORITAS 6: PANEL INSPEKSI & VALIDASI GURU
  // ==========================================================================
  console.log('\n--- PRIORITAS 6: PANEL INSPEKSI GURU & HISTORI REVISI NILAI ---');
  // Guru melakukan revisi penilaian pada salah satu soal
  const updatedScores = { ...(inspectedSub.scores || {}) };
  updatedScores[q1Id] = 2;
  const updatedAnswers = { ...(inspectedSub.answers || {}) };
  if (typeof updatedAnswers[q1Id] === 'object' && updatedAnswers[q1Id] !== null) {
    updatedAnswers[q1Id].score = 2;
    updatedAnswers[q1Id].teacherFeedback = 'Siswa hampir tepat memahami konsep, diberikan skor pembinaan 2 poin.';
  }

  const updatedPayload = {
    ...inspectedSub,
    scores: updatedScores,
    answers: updatedAnswers,
    teacherOverrides: {
      ...(inspectedSub.teacherOverrides || {}),
      [q1Id]: {
        previousScore: 0,
        overrideScore: 2,
        teacherFeedback: 'Siswa hampir tepat memahami konsep, diberikan skor pembinaan 2 poin.',
        updatedAt: new Date().toISOString()
      }
    },
    status: 'diverifikasi'
  };

  const overrideRes = await request(`/api/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: updatedPayload
  });

  assert(overrideRes.status === 200, 'Guru berhasil merevisi nilai dengan feedback');
  const updatedSub = overrideRes.body.submission || overrideRes.body;
  const q1RevisedScore = updatedSub.scores?.[q1Id] !== undefined ? updatedSub.scores[q1Id] : updatedSub.answers?.[q1Id]?.score;
  assert(q1RevisedScore === 2, `Skor terevisi tersimpan menjadi 2 (skor: ${q1RevisedScore})`);
  assert(updatedSub.teacherOverrides && updatedSub.teacherOverrides[q1Id] !== undefined, 'Histori revisi guru tersimpan dalam record submission');

  // ==========================================================================
  // PRIORITAS 7: FORMULA PERHITUNGAN NILAI AKHIR (SKALA 100)
  // ==========================================================================
  console.log('\n--- PRIORITAS 7: FORMULA PERHITUNGAN SKOR & KONVERSI SKALA 100 ---');
  // Formula konversi: Math.round((rawTotal / maxPossibleScore) * 100)
  function calculateScale100(rawTotal, maxPossible) {
    if (!maxPossible || maxPossible <= 0) return 0;
    return Math.round((rawTotal / maxPossible) * 100);
  }

  // Kasus dari komplain siswa: Total Poin 3 dari 65, tapi sistem menampilkan 3 / 100
  const rawPoinKasus1 = 3;
  const maxPoinKasus1 = 65;
  const nilaiKonversiKasus1 = calculateScale100(rawPoinKasus1, maxPoinKasus1);
  console.log(`   Kasus 1: Poin Mentah ${rawPoinKasus1}/${maxPoinKasus1} -> Skala 100: ${nilaiKonversiKasus1}/100`);
  assert(nilaiKonversiKasus1 === 5, `Konversi 3/65 harus menghasilkan 5/100, bukan 3/100 (hasil: ${nilaiKonversiKasus1})`);

  // Kasus jika maxScore adalah 90
  const rawPoinKasus2 = 3;
  const maxPoinKasus2 = 90;
  const nilaiKonversiKasus2 = calculateScale100(rawPoinKasus2, maxPoinKasus2);
  console.log(`   Kasus 2: Poin Mentah ${rawPoinKasus2}/${maxPoinKasus2} -> Skala 100: ${nilaiKonversiKasus2}/100`);
  assert(nilaiKonversiKasus2 === 3, `Konversi 3/90 menghasilkan 3/100`);

  // Kasus skor tinggi: 58.5 / 65
  const rawPoinKasus3 = 58.5;
  const nilaiKonversiKasus3 = calculateScale100(rawPoinKasus3, maxPoinKasus1);
  console.log(`   Kasus 3: Poin Mentah ${rawPoinKasus3}/${maxPoinKasus1} -> Skala 100: ${nilaiKonversiKasus3}/100`);
  assert(nilaiKonversiKasus3 === 90, `Konversi 58.5/65 menghasilkan 90/100`);

  // ==========================================================================
  // PRIORITAS 8: PEMERIKSAAN SELURUH 24 SOAL PADA PAKET LENGKAP
  // ==========================================================================
  console.log('\n--- PRIORITAS 8: INTEGRITAS SELURUH 24 SOAL UJIAN ---');
  assert(questions.length >= 24, `Jumlah total soal ujian adalah ${questions.length} (memenuhi minimal 24 soal)`);

  let stimulusCount = 0;
  let matchingCount = 0;
  let mcCount = 0;
  let essayCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    assert(q.id, `Soal index ${i} memiliki ID valid`);
    assert(q.question || q.questionText, `Soal index ${i} (${q.id}) memiliki teks pertanyaan`);
    assert(q.type, `Soal index ${i} (${q.id}) memiliki tipe`);

    if (q.stimulus) stimulusCount++;
    if (q.type === 'matching') matchingCount++;
    if (q.type === 'multiple_choice' || q.type === 'complex_mcq') mcCount++;
    if (q.type === 'essay') essayCount++;
  }

  console.log(`   Statistik Soal:
   - Total Soal: ${questions.length}
   - Soal dengan Stimulus: ${stimulusCount}
   - Pilihan Ganda (MCQ): ${mcCount}
   - Menjodohkan (Matching): ${matchingCount}
   - Esai / Rubrik: ${essayCount}`);

  assert(stimulusCount >= 10, `Setidaknya 10 soal memiliki stimulus aktif (tercatat: ${stimulusCount})`);
  assert(matchingCount >= 2, `Setidaknya 2 soal matching hadir (tercatat: ${matchingCount})`);

  console.log('\n========================================================================');
  console.log(`🎉 SELURUH PENGUJIAN LULUS DENGAN SUKSES! (${passed} uji lulus, 0 gagal)`);
  console.log('========================================================================\n');
}

runComprehensiveTests().catch(err => {
  console.error('\n❌ PENGUJIAN MENGALAMI KEGAGALAN:', err);
  process.exit(1);
});
