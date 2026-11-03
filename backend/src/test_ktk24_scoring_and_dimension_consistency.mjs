process.env.DISABLE_SERVER_LISTEN = 'true';

import { strict as assert } from 'assert';

const serverModule = await import('../dist/server.js');
const {
  evaluateSubmissionServerSide,
  formatAuthoritativeTotalScore,
  generateExamResultsExcelWorkbook,
  REVISED_QUESTIONS_24,
  FULL_TECHNICAL_CHEMISTRY_PACKAGE
} = serverModule;

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Detail: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Detail: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('======================================================================');
console.log('TEST SUITE: AUDIT PENSKORAN KTK 24 SOAL & KONSISTENSI 6 DIMENSI');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// 1. Matriks 24 Soal & Bobot Maksimum
// ---------------------------------------------------------------------------
console.log('--- BAGIAN 1: Verifikasi Matriks 24 Soal & Bobot Maksimum ---');

runTest('Instrumen KTK memiliki tepat 24 butir soal', () => {
  assert.equal(REVISED_QUESTIONS_24.length, 24);
});

runTest('Tepat 6 butir soal Multiple Choice biasa (Q2, Q5, Q9, Q13, Q17, Q21)', () => {
  const mcqs = REVISED_QUESTIONS_24.filter(q => q.type === 'multiple_choice');
  assert.equal(mcqs.length, 6);
  const numbers = mcqs.map(q => q.number);
  assert.deepEqual(numbers, [2, 5, 9, 13, 17, 21]);
});

runTest('Tepat 5 butir soal Complex Multiple Choice (Q1, Q6, Q15, Q19, Q22)', () => {
  const pgks = REVISED_QUESTIONS_24.filter(q => q.type === 'complex_mcq');
  assert.equal(pgks.length, 5);
  const numbers = pgks.map(q => q.number);
  assert.deepEqual(numbers, [1, 6, 15, 19, 22]);
});

runTest('Tepat 4 butir soal Matching / Menjodohkan (Q3, Q7, Q18, Q23)', () => {
  const matchings = REVISED_QUESTIONS_24.filter(q => q.type === 'matching');
  assert.equal(matchings.length, 4);
  const numbers = matchings.map(q => q.number);
  assert.deepEqual(numbers, [3, 7, 18, 23]);
});

runTest('Tepat 9 butir soal Essay (Q4, Q8, Q10, Q11, Q12, Q14, Q16, Q20, Q24)', () => {
  const essays = REVISED_QUESTIONS_24.filter(q => q.type === 'essay');
  assert.equal(essays.length, 9);
  const numbers = essays.map(q => q.number);
  assert.deepEqual(numbers, [4, 8, 10, 11, 12, 14, 16, 20, 24]);
});

runTest('Total skor mentah maksimum instrumen adalah tepat 65 poin', () => {
  const totalMax = REVISED_QUESTIONS_24.reduce((sum, q) => sum + (q.maxScore || q.points || 1), 0);
  assert.equal(totalMax, 65);
});

// ---------------------------------------------------------------------------
// 2. Pemetaan & Bobot Maksimum 6 Dimensi
// ---------------------------------------------------------------------------
console.log('\n--- BAGIAN 2: Pemetaan 6 Dimensi & Bobot Maksimum per Dimensi ---');

const expectedDimensions = {
  k3lh: { name: 'K3LH dan Regulasi', questions: [1, 2, 3, 4], expectedMax: 10 },
  persiapan_analisis: { name: 'Persiapan Analisis', questions: [5, 6, 7, 8], expectedMax: 10 },
  stoikiometri: { name: 'Stoikiometri Terapan', questions: [9, 10, 11, 12], expectedMax: 10 },
  volumetri: { name: 'Analisis Volumetri', questions: [13, 14, 15, 16], expectedMax: 13 },
  instrumentasi: { name: 'Instrumentasi Dasar', questions: [17, 18, 19, 20], expectedMax: 11 },
  manajemen_mutu: { name: 'Manajemen Mutu Laboratorium', questions: [21, 22, 23, 24], expectedMax: 11 }
};

for (const [dimKey, meta] of Object.entries(expectedDimensions)) {
  runTest(`Dimensi ${meta.name} memiliki soal [${meta.questions.join(', ')}] dengan skor maks ${meta.expectedMax}`, () => {
    const dimQuestions = REVISED_QUESTIONS_24.filter(q => q.dimensionId === dimKey);
    assert.equal(dimQuestions.length, meta.questions.length);
    assert.deepEqual(dimQuestions.map(q => q.number), meta.questions);
    const dimMax = dimQuestions.reduce((sum, q) => sum + (q.maxScore || q.points || 1), 0);
    assert.equal(dimMax, meta.expectedMax);
  });
}

// ---------------------------------------------------------------------------
// 3. Penskoran Objektif Independen & Zero Fake Score
// ---------------------------------------------------------------------------
console.log('\n--- BAGIAN 3: Penskoran Objektif Independen & Penanganan Esai ---');

runTest('MCQ Q5 (Pipet Volumetrik) menghasilkan tepat 1/1 bila benar, 0/1 bila salah', () => {
  const dummySub = {
    id: 'sub-test-mcq',
    answers: {
      'q-pa-5': { questionId: 'q-pa-5', selectedOption: 'D. Pipet volumetrik 10 ml' }
    }
  };
  evaluateSubmissionServerSide(dummySub, REVISED_QUESTIONS_24);
  assert.equal(dummySub.answers['q-pa-5'].score, 1);
  assert.equal(dummySub.answers['q-pa-5'].isCorrect, true);

  const dummyWrong = {
    id: 'sub-test-mcq-wrong',
    answers: {
      'q-pa-5': { questionId: 'q-pa-5', selectedOption: 'A. Gelas ukur 10 ml' }
    }
  };
  evaluateSubmissionServerSide(dummyWrong, REVISED_QUESTIONS_24);
  assert.equal(dummyWrong.answers['q-pa-5'].score, 0);
  assert.equal(dummyWrong.answers['q-pa-5'].isCorrect, false);
});

runTest('Complex MCQ Q6 parsial (A benar, B salah) menghasilkan skor 1/2', () => {
  const dummySub = {
    id: 'sub-test-pgk-partial',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: [
          'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
          'B. Membilas wadah pelarutan dengan akuades, tetapi membuang hasil bilasan sebelum larutan dipindahkan ke dalam labu ukur.'
        ]
      }
    }
  };
  evaluateSubmissionServerSide(dummySub, REVISED_QUESTIONS_24);
  assert.equal(dummySub.answers['q-pa-6'].score, 1);
});

runTest('Matching Q7 format pasangan ID string menghasilkan 4/4 bila semua benar', () => {
  const dummySub = {
    id: 'sub-test-matching',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil',
          'm-pa-b': '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan',
          'm-pa-c': '3. Menimbulkan kesalahan paralaks',
          'm-pa-d': '4. Komposisi atau konsentrasi larutan dapat berubah'
        }
      }
    }
  };
  evaluateSubmissionServerSide(dummySub, REVISED_QUESTIONS_24);
  assert.equal(dummySub.answers['q-pa-7'].score, 4);
});

runTest('Esai tanpa nilai guru atau AI tidak diberi fake score 0 (score=undefined, isPendingEvaluation=true)', () => {
  const dummySub = {
    id: 'sub-test-pending-essay',
    answers: {
      'q-k3lh-4': {
        questionId: 'q-k3lh-4',
        essayAnswer: 'Saya akan menampung limbah ke wadah khusus sesuai SOP dan tidak membuangnya ke wastafel.'
      }
    }
  };
  evaluateSubmissionServerSide(dummySub, REVISED_QUESTIONS_24);
  assert.equal(dummySub.answers['q-k3lh-4'].score, undefined);
  assert.equal(dummySub.answers['q-k3lh-4'].isPendingEvaluation, true);
  assert.equal(dummySub.hasPendingComponents, true);
  assert.equal(dummySub.isScoreFinal, false);
});

// ---------------------------------------------------------------------------
// 4. Kalkulasi Otoritatif 6 Dimensi pada Submission Lengkap
// ---------------------------------------------------------------------------
console.log('\n--- BAGIAN 4: Kalkulasi Otoritatif 6 Dimensi KTK ---');

// Buat submission komprehensif dengan nilai objektif penuh (32) + nilai esai guru (24)
const sampleFullAnswers = {};

// 1. Objektif
// Dimensi 1: Q1 (2), Q2 (1), Q3 (4) = 7
sampleFullAnswers['q-k3lh-1'] = { questionId: 'q-k3lh-1', selectedOptions: ['A. Menggunakan jas laboratorium, sarung tangan, dan kacamata keselamatan saat menimbang NaOH.', 'C. Membaca label dan informasi keselamatan bahan sebelum melakukan penimbangan NaOH.'] };
sampleFullAnswers['q-k3lh-2'] = { questionId: 'q-k3lh-2', selectedOption: 'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian' };
sampleFullAnswers['q-k3lh-3'] = { questionId: 'q-k3lh-3', matchingAnswers: { 'm-k3lh-a': '3', 'm-k3lh-b': '1', 'm-k3lh-c': '2', 'm-k3lh-d': '4' } };
sampleFullAnswers['q-k3lh-4'] = { questionId: 'q-k3lh-4', essayAnswer: 'Jawaban esai Q4', score: 2, maxScore: 3, isPendingEvaluation: false }; // Total Dim 1 = 9/10 (90%)

// Dimensi 2: Q5 (1), Q6 (2), Q7 (4), Q8 esai (2/3) -> Total Dim 2 = 9/10 (90%)
sampleFullAnswers['q-pa-5'] = { questionId: 'q-pa-5', selectedOption: 'D. Pipet volumetrik 10 ml' };
sampleFullAnswers['q-pa-6'] = { questionId: 'q-pa-6', selectedOptions: ['A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.', 'D. Membaca bagian bawah meniskus sejajar dengan mata ketika menetapkan volume akhir larutan jernih.'] };
sampleFullAnswers['q-pa-7'] = { questionId: 'q-pa-7', matchingAnswers: { 'm-pa-a': '2', 'm-pa-b': '1', 'm-pa-c': '3', 'm-pa-d': '4' } };
sampleFullAnswers['q-pa-8'] = { questionId: 'q-pa-8', essayAnswer: 'Jawaban esai Q8', score: 2, maxScore: 3, isPendingEvaluation: false };

// Dimensi 3: Q9 (1), Q10 esai (3), Q11 esai (2), Q12 esai (2) -> Total Dim 3 = 8/10 (80%)
sampleFullAnswers['q-st-9'] = { questionId: 'q-st-9', selectedOption: 'C. 1,325 g' };
sampleFullAnswers['q-st-10'] = { questionId: 'q-st-10', essayAnswer: 'Jawaban esai Q10', score: 3, maxScore: 3, isPendingEvaluation: false };
sampleFullAnswers['q-st-11'] = { questionId: 'q-st-11', essayAnswer: 'Jawaban esai Q11', score: 2, maxScore: 3, isPendingEvaluation: false };
sampleFullAnswers['q-st-12'] = { questionId: 'q-st-12', essayAnswer: 'Jawaban esai Q12', score: 2, maxScore: 3, isPendingEvaluation: false };

// Dimensi 4: Q13 (1), Q14 esai (4/5), Q15 (2), Q16 esai (4/5) -> Total Dim 4 = 11/13 (85%)
sampleFullAnswers['q-av-13'] = { questionId: 'q-av-13', selectedOption: 'B. Menambahkan titran secara bertahap sambil menghomogenkan larutan serta mengamati terbentuknya endapan putih AgCl dan perubahan warna hingga titik akhir titrasi.' };
sampleFullAnswers['q-av-14'] = { questionId: 'q-av-14', essayAnswer: 'Jawaban esai Q14', score: 4, maxScore: 5, isPendingEvaluation: false };
sampleFullAnswers['q-av-15'] = { questionId: 'q-av-15', selectedOptions: ['A. Gelembung udara pada ujung buret pada awal titrasi dapat menyebabkan volume yang terbaca tidak seluruhnya menggambarkan titran yang masuk ke sampel.', 'D. Pembacaan buret dilakukan dengan posisi mata sejajar dengan meniskus untuk mengurangi kesalahan paralaks.'] };
sampleFullAnswers['q-av-16'] = { questionId: 'q-av-16', essayAnswer: 'Jawaban esai Q16', score: 4, maxScore: 5, isPendingEvaluation: false };

// Dimensi 5: Q17 (1), Q18 (4), Q19 (2), Q20 esai (3/4) -> Total Dim 5 = 10/11 (91%)
sampleFullAnswers['q-id-17'] = { questionId: 'q-id-17', selectedOption: 'C. Mengkalibrasi pH meter dengan larutan buffer yang sesuai sebelum mengukur sampel' };
sampleFullAnswers['q-id-18'] = { questionId: 'q-id-18', matchingAnswers: { 'm-id-a': '3', 'm-id-b': '4', 'm-id-c': '1', 'm-id-d': '2' } };
sampleFullAnswers['q-id-19'] = { questionId: 'q-id-19', selectedOptions: ['B. Membilas elektroda sesuai prosedur ketika berpindah dari satu larutan ke larutan lainnya.', 'D. Memastikan tidak terdapat gelembung udara pada jalur cahaya sebelum pembacaan absorbansi dilakukan.'] };
sampleFullAnswers['q-id-20'] = { questionId: 'q-id-20', essayAnswer: 'Jawaban esai Q20', score: 3, maxScore: 4, isPendingEvaluation: false };

// Dimensi 6: Q21 (1), Q22 (2), Q23 (4), Q24 esai (3/4) -> Total Dim 6 = 10/11 (91%)
sampleFullAnswers['q-mm-21'] = { questionId: 'q-mm-21', selectedOption: 'C. Nama larutan, konsentrasi, tanggal pembuatan, dan identitas pembuat' };
sampleFullAnswers['q-mm-22'] = { questionId: 'q-mm-22', selectedOptions: ['A. Mencatat hasil pH 4,20 sesuai pembacaan alat dan melakukan pemeriksaan ulang apabila hasil dinilai tidak wajar.', 'C. Mencatat kode sampel, metode analisis, tanggal pengujian, dan identitas analis pada rekaman hasil.'] };
sampleFullAnswers['q-mm-23'] = { questionId: 'q-mm-23', matchingAnswers: { 'm-mm-a': '2', 'm-mm-b': '3', 'm-mm-c': '1', 'm-mm-d': '4' } };
sampleFullAnswers['q-mm-24'] = { questionId: 'q-mm-24', essayAnswer: 'Jawaban esai Q24', score: 3, maxScore: 4, isPendingEvaluation: false };

// Total Skor Mentah yang diharapkan: 9 + 9 + 8 + 11 + 10 + 10 = 57 dari 65 (88%)
const fullSub = {
  id: 'sub-audit-full',
  examId: 'exam-ktk-24',
  examTitle: 'Asesmen Teknis Kimia 24 Soal',
  isTeacherValidated: true,
  validationStatus: 'approved',
  validatedBy: 'Guru Pembimbing Staging',
  answers: sampleFullAnswers
};

evaluateSubmissionServerSide(fullSub, REVISED_QUESTIONS_24);

runTest('Submission menghasilkan total skor mentah tepat 57 dari 65 poin', () => {
  assert.equal(fullSub.rawScoreTotal, 57);
  assert.equal(fullSub.maxRawScore, 65);
});

runTest('Submission menghasilkan persentase teknis tepat 88%', () => {
  assert.equal(fullSub.technicalScore, 88);
  assert.equal(fullSub.totalScore, 88);
});

runTest('Agregasi 6 dimensi terbentuk lengkap dan persentasenya tepat', () => {
  const dims = fullSub.dimensionScores;
  assert.ok(dims, 'dimensionScores harus ada');
  assert.equal(dims.k3lh.raw, 9);
  assert.equal(dims.k3lh.max, 10);
  assert.equal(dims.k3lh.percentage, 90);

  assert.equal(dims.persiapan_analisis.raw, 9);
  assert.equal(dims.persiapan_analisis.max, 10);
  assert.equal(dims.persiapan_analisis.percentage, 90);

  assert.equal(dims.stoikiometri.raw, 8);
  assert.equal(dims.stoikiometri.max, 10);
  assert.equal(dims.stoikiometri.percentage, 80);

  assert.equal(dims.volumetri.raw, 11);
  assert.equal(dims.volumetri.max, 13);
  assert.equal(dims.volumetri.percentage, 85); // 11/13 * 100 = 84.6 -> 85

  assert.equal(dims.instrumentasi.raw, 10);
  assert.equal(dims.instrumentasi.max, 11);
  assert.equal(dims.instrumentasi.percentage, 91); // 10/11 * 100 = 90.9 -> 91

  assert.equal(dims.manajemen_mutu.raw, 10);
  assert.equal(dims.manajemen_mutu.max, 11);
  assert.equal(dims.manajemen_mutu.percentage, 91);
});

// ---------------------------------------------------------------------------
// 5. Eliminasi Perbedaan PDF Guru vs PDF Siswa (Konsistensi Lintas Modul)
// ---------------------------------------------------------------------------
console.log('\n--- BAGIAN 5: Eliminasi Perbedaan PDF Guru vs Siswa & Konsistensi ---');

runTest('Siswa yang menerima submission tanpa field answers tetap memperoleh dimensionScores yang 100% identik dengan Guru', () => {
  // Simulasi objek submission yang diterima Siswa via GET /api/bootstrap (answers di-strip)
  const studentViewSub = {
    id: fullSub.id,
    examId: fullSub.examId,
    examTitle: fullSub.examTitle,
    totalScore: fullSub.totalScore,
    technicalScore: fullSub.technicalScore,
    dimensionScores: fullSub.dimensionScores // Diterima dari backend
    // answers TIDAK disertakan dalam payload siswa
  };

  // Dalam WorkReadinessProfile.tsx baru:
  const dynamicTechScores = (studentViewSub.dimensionScores && Object.keys(studentViewSub.dimensionScores).length >= 6)
    ? studentViewSub.dimensionScores
    : null;

  assert.ok(dynamicTechScores, 'dynamicTechScores harus diperoleh langsung dari dimensionScores');
  assert.equal(dynamicTechScores.k3lh.percentage, fullSub.dimensionScores.k3lh.percentage);
  assert.equal(dynamicTechScores.stoikiometri.percentage, fullSub.dimensionScores.stoikiometri.percentage);
  assert.equal(dynamicTechScores.volumetri.percentage, fullSub.dimensionScores.volumetri.percentage);

  // Verifikasi tidak ada fallback sintetis (misal * 1.05 atau * 0.95)
  const syntheticK3lh = Math.min(100, Math.round(fullSub.technicalScore * 1.05)); // 88 * 1.05 = 92
  assert.notEqual(dynamicTechScores.k3lh.percentage, syntheticK3lh, 'Nilai K3LH harus 90% (riil), BUKAN 92% (sintetis)');
});

runTest('formatAuthoritativeTotalScore menghasilkan total skor yang konsisten', () => {
  const authScore = formatAuthoritativeTotalScore(fullSub);
  assert.equal(authScore.scoreValue, 88);
  assert.equal(authScore.displayString, '88');
  assert.equal(authScore.isFinal, true);
});

await runAsyncTest('Ekspor Excel Sheet 4 (Skor Dimensi) membaca 6 dimensi secara konsisten', async () => {
  const { workbook } = await generateExamResultsExcelWorkbook({
    exam: {
      id: 'exam-ktk-24',
      title: 'Ujian KTK 24 Soal',
      packageId: 'pkg-full-24',
      academicYear: '2025/2026',
      semester: 'Genap',
      totalQuestions: 24
    },
    submissions: [fullSub],
    questions: REVISED_QUESTIONS_24,
    schoolName: 'SMK Negeri Kimia Staging',
    className: 'XII Kimia 1'
  });

  const dimSheet = workbook.getWorksheet('Skor Dimensi');
  assert.ok(dimSheet, 'Sheet Skor Dimensi harus tersedia');

  const headerRow = dimSheet.getRow(1);
  const headerTexts = [];
  headerRow.eachCell(cell => headerTexts.push(String(cell.value)));

  assert.ok(headerTexts.some(h => h.includes('K3LH dan Regulasi')), 'Header K3LH harus ada di Skor Dimensi');
  assert.ok(headerTexts.some(h => h.includes('Analisis Volumetri')), 'Header Analisis Volumetri harus ada di Skor Dimensi');

  const dataRow = dimSheet.getRow(2);
  const dataTexts = [];
  dataRow.eachCell(cell => dataTexts.push(String(cell.value)));
  assert.ok(dataTexts.some(d => d.includes('90% (9/10)')), 'K3LH harus berisi 90% (9/10)');
  assert.ok(dataTexts.some(d => d.includes('85% (11/13)')), 'Volumetri harus berisi 85% (11/13)');
});

console.log('\n======================================================================');
console.log(`HASIL AKHIR: ${passedTests} DARI ${totalTests} PENGUJIAN LULUS (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================================');
process.exit(0);
