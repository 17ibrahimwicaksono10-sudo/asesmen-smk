process.env.DISABLE_SERVER_LISTEN = 'true';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 5066;
const MOCK_AI_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SYNTHETIC_DIR = path.resolve(__dirname, '../data/synthetic_audit_pr6');
const SYNTHETIC_DB_PATH = path.join(SYNTHETIC_DIR, 'database.json');
const SERVER_DIST_PATH = path.resolve(__dirname, '../dist/server.js');

// Dynamically import server functions and questions from bundled dist
const serverModule = await import(`file://${SERVER_DIST_PATH}`);
const { evaluateSubmissionServerSide, REVISED_QUESTIONS_24, FULL_TECHNICAL_CHEMISTRY_PACKAGE } = serverModule;

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function recordTest(passed, name, detail = '') {
  if (passed) {
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${name} -> ${detail}`);
  }
  testResults.push({ passed, name, detail });
}

console.log('\n===============================================================');
console.log(' AUDIT SISTEM SKORING EMPLOYASKILLS: UNIT & INTEGRATION SUITE');
console.log('===============================================================\n');

// =========================================================================
// PART 1: AUDIT MATRIKS LENGKAP 24 SOAL PKG-FULL-24 & UNIT SCORING
// =========================================================================
console.log('--- BAGIAN 1: AUDIT UNIT SOAL-DEMI-SOAL PKG-FULL-24 ---');

// 1.1 Verifikasi Struktur Paket dan Soal pkg-full-24
const questions24 = REVISED_QUESTIONS_24;
recordTest(questions24.length === 24, 'pkg-full-24 memiliki tepat 24 butir soal', `Actual: ${questions24.length}`);

const mcQuestions = questions24.filter(q => q.type === 'multiple_choice');
const complexMcqQuestions = questions24.filter(q => q.type === 'complex_mcq');
const matchingQuestions = questions24.filter(q => q.type === 'matching');
const essayQuestions = questions24.filter(q => q.type === 'essay');

recordTest(mcQuestions.length === 6, 'Tepat 6 soal Multiple Choice biasa (#2, #5, #9, #13, #17, #21)', `Actual: ${mcQuestions.length}`);
recordTest(complexMcqQuestions.length === 5, 'Tepat 5 soal Complex MCQ (#1, #6, #15, #19, #22)', `Actual: ${complexMcqQuestions.length}`);
recordTest(matchingQuestions.length === 4, 'Tepat 4 soal Matching (#3, #7, #18, #23)', `Actual: ${matchingQuestions.length}`);
recordTest(essayQuestions.length === 9, 'Tepat 9 soal Essay (#4, #8, #10, #11, #12, #14, #16, #20, #24)', `Actual: ${essayQuestions.length}`);

const maxRaw = questions24.reduce((sum, q) => sum + (q.maxScore || q.points || 1), 0);
recordTest(maxRaw === 65, 'Total skor mentah maksimum instrumen adalah tepat 65 poin', `Actual: ${maxRaw}`);

// 1.2 KASUS 1: Soal #5 (NaCl 10,00 mL) -> D. Pipet volumetrik 10 mL
console.log('\n--- KASUS 1: Pilihan Ganda Soal #5 (q-pa-5) ---');
{
  const subCase1 = {
    id: 'sub-case-1',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-5': {
        questionId: 'q-pa-5',
        selectedOption: 'D. Pipet volumetrik 10 ml',
        score: 0 // Client initially sent 0
      }
    }
  };
  evaluateSubmissionServerSide(subCase1, questions24);
  const q5 = subCase1.answers['q-pa-5'];
  recordTest(q5.score === 1, 'Kasus 1: Siswa memilih D (Pipet volumetrik) menghasilkan skor tepat 1/1', `Actual: ${q5.score}`);
  recordTest(q5.selectedOptions === undefined, 'Kasus 1: Regular MCQ tidak memiliki properti selectedOptions (Mencegah mislabeling)', `selectedOptions: ${q5.selectedOptions}`);
  recordTest(subCase1.autoScore === 1, 'Kasus 1: subCase1.autoScore mencatat 1 poin', `autoScore: ${subCase1.autoScore}`);
}

// 1.3 KASUS 2: Pilihan Ganda Titrasi Argentometri (q-av-13)
console.log('\n--- KASUS 2: Pilihan Ganda Titrasi Argentometri Soal #13 (q-av-13) ---');
{
  const subCase2 = {
    id: 'sub-case-2',
    packageId: 'pkg-full-24',
    answers: {
      'q-av-13': {
        questionId: 'q-av-13',
        selectedOption: 'B. Menambahkan titran secara bertahap sambil menghomogenkan larutan serta mengamati terbentuknya endapan putih AgCl dan perubahan warna hingga titik akhir titrasi.',
        score: 0 // Client initially sent 0
      }
    }
  };
  evaluateSubmissionServerSide(subCase2, questions24);
  const q13 = subCase2.answers['q-av-13'];
  recordTest(q13.score === 1, 'Kasus 2: Siswa memilih B (Menambahkan titran bertahap) menghasilkan skor tepat 1/1', `Actual: ${q13.score}`);
  recordTest(q13.selectedOptions === undefined, 'Kasus 2: Regular MCQ tidak memiliki selectedOptions', `selectedOptions: ${q13.selectedOptions}`);
  recordTest(subCase2.autoScore === 1, 'Kasus 2: subCase2.autoScore mencatat 1 poin', `autoScore: ${subCase2.autoScore}`);
}

// 1.4 KASUS 3: Complex MCQ K3LH Soal #1 (q-k3lh-1)
console.log('\n--- KASUS 3: Pilihan Ganda Kompleks K3LH Soal #1 (q-k3lh-1) ---');
{
  const subCase3 = {
    id: 'sub-case-3',
    packageId: 'pkg-full-24',
    answers: {
      'q-k3lh-1': {
        questionId: 'q-k3lh-1',
        selectedOptions: [
          'A. Menggunakan jas laboratorium, sarung tangan, dan kacamata keselamatan saat menimbang NaOH.',
          'C. Membaca label dan informasi keselamatan bahan sebelum melakukan penimbangan NaOH.'
        ],
        score: 0 // Client initially sent 0
      }
    }
  };
  evaluateSubmissionServerSide(subCase3, questions24);
  const q1 = subCase3.answers['q-k3lh-1'];
  recordTest(q1.score === 2, 'Kasus 3: Siswa memilih A dan C (keduanya kunci) menghasilkan skor maksimal 2/2', `Actual: ${q1.score}`);
  recordTest(Array.isArray(q1.selectedOptions) && q1.selectedOptions.length === 2, 'Kasus 3: selectedOptions siswa dipertahankan lengkap 2 opsi', `length: ${q1.selectedOptions?.length}`);
  recordTest(subCase3.autoScore === 2, 'Kasus 3: subCase3.autoScore mencatat 2 poin', `autoScore: ${subCase3.autoScore}`);
}

// 1.5 KASUS 4: Complex MCQ Preparasi Larutan Soal #6 (q-pa-6)
console.log('\n--- KASUS 4: Kebijakan Penskoran Complex MCQ Soal #6 (q-pa-6) ---');
{
  // Skenario 4a: Siswa memilih A (Benar) dan B (Salah). Kunci: A dan D.
  const subCase4a = {
    id: 'sub-case-4a',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: [
          'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
          'B. Membilas wadah pelarutan dengan akuades, tetapi membuang hasil bilasan sebelum larutan dipindahkan ke dalam labu ukur.'
        ],
        score: 0
      }
    }
  };
  evaluateSubmissionServerSide(subCase4a, questions24);
  const q6a = subCase4a.answers['q-pa-6'];
  recordTest(q6a.score === 1, 'Kasus 4a: Siswa memilih A (Benar) & B (Salah) mendapat skor 1/2 sesuai kebijakan 1 pt/kunci', `Actual: ${q6a.score}`);

  // Skenario 4b: Siswa memilih A dan D (Kedua kunci benar)
  const subCase4b = {
    id: 'sub-case-4b',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: [
          'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
          'D. Membaca bagian bawah meniskus sejajar dengan mata ketika menetapkan volume akhir larutan jernih.'
        ]
      }
    }
  };
  evaluateSubmissionServerSide(subCase4b, questions24);
  recordTest(subCase4b.answers['q-pa-6'].score === 2, 'Kasus 4b: Siswa memilih A dan D menghasilkan skor penuh 2/2', `Actual: ${subCase4b.answers['q-pa-6'].score}`);

  // Skenario 4c: Siswa memilih urutan terbalik: D dan A
  const subCase4c = {
    id: 'sub-case-4c',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: [
          'D. Membaca bagian bawah meniskus sejajar dengan mata ketika menetapkan volume akhir larutan jernih.',
          'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.'
        ]
      }
    }
  };
  evaluateSubmissionServerSide(subCase4c, questions24);
  recordTest(subCase4c.answers['q-pa-6'].score === 2, 'Kasus 4c: Urutan pilihan dibalik (D lalu A) tetap menghasilkan skor penuh 2/2', `Actual: ${subCase4c.answers['q-pa-6'].score}`);

  // Skenario 4d: Siswa memilih B dan C (Keduanya salah)
  const subCase4d = {
    id: 'sub-case-4d',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: ['B', 'C']
      }
    }
  };
  evaluateSubmissionServerSide(subCase4d, questions24);
  recordTest(subCase4d.answers['q-pa-6'].score === 0, 'Kasus 4d: Siswa memilih B dan C menghasilkan skor 0/2', `Actual: ${subCase4d.answers['q-pa-6'].score}`);

  // Skenario 4e: Siswa memilih hanya 1 opsi: A (Benar)
  const subCase4e = {
    id: 'sub-case-4e',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: ['A']
      }
    }
  };
  evaluateSubmissionServerSide(subCase4e, questions24);
  recordTest(subCase4e.answers['q-pa-6'].score === 1, 'Kasus 4e: Siswa memilih hanya A (1 benar) menghasilkan skor 1/2', `Actual: ${subCase4e.answers['q-pa-6'].score}`);

  // Skenario 4f: Siswa memilih 3 opsi untuk menebak: A, B, C (1 benar, 1 kelebihan)
  const subCase4f = {
    id: 'sub-case-4f',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: ['A', 'B', 'C']
      }
    }
  };
  evaluateSubmissionServerSide(subCase4f, questions24);
  recordTest(subCase4f.answers['q-pa-6'].score === 0, 'Kasus 4f: Siswa memilih 3 opsi A, B, C dipotong pinalti kelebihan pilihan -> 0/2', `Actual: ${subCase4f.answers['q-pa-6'].score}`);

  // Skenario 4g: Siswa memilih 4 opsi (A, B, C, D) untuk menebak semua
  const subCase4g = {
    id: 'sub-case-4g',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: ['A', 'B', 'C', 'D']
      }
    }
  };
  evaluateSubmissionServerSide(subCase4g, questions24);
  recordTest(subCase4g.answers['q-pa-6'].score === 0, 'Kasus 4g: Siswa memilih semua 4 opsi dipotong pinalti -> 0/2', `Actual: ${subCase4g.answers['q-pa-6'].score}`);
}

// 1.6 KASUS 5: Matching Soal #7 (q-pa-7)
console.log('\n--- KASUS 5: Matching Soal #7 (q-pa-7) ---');
{
  // Jawaban aktual kasus screenshot staging:
  // m-pa-a -> 1 (Kunci adalah 2: Zat terlarut lebih kecil) -> SALAH
  // m-pa-b -> 3 (Kunci adalah 1: Volume lebih besar) -> SALAH
  // m-pa-c -> 2 (Kunci adalah 3: Kesalahan paralaks) -> SALAH
  // m-pa-d -> 4 (Kunci adalah 4: Komposisi/konsentrasi berubah) -> BENAR!
  const subCase5 = {
    id: 'sub-case-5',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan',
          'm-pa-b': '3. Menimbulkan kesalahan paralaks',
          'm-pa-c': '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil',
          'm-pa-d': '4. Komposisi atau konsentrasi larutan dapat berubah'
        },
        score: 0 // Client initially sent 0
      }
    }
  };
  evaluateSubmissionServerSide(subCase5, questions24);
  const q7 = subCase5.answers['q-pa-7'];
  recordTest(q7.score === 1, 'Kasus 5: Screenshot Staging (m-pa-a->1, m-pa-b->3, m-pa-c->2, m-pa-d->4) menghasilkan skor tepat 1/4 (Pasangan D sah)', `Actual: ${q7.score}`);

  // Uji 4/4 Benar
  const subCase5_4of4 = {
    id: 'sub-case-5-4',
    packageId: 'pkg-full-24',
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
  evaluateSubmissionServerSide(subCase5_4of4, questions24);
  recordTest(subCase5_4of4.answers['q-pa-7'].score === 4, 'Kasus 5: Uji 4/4 pasangan benar menghasilkan skor 4/4', `Actual: ${subCase5_4of4.answers['q-pa-7'].score}`);

  // Uji 3/4 Benar
  const subCase5_3of4 = {
    id: 'sub-case-5-3',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '2',
          'm-pa-b': '1',
          'm-pa-c': '3',
          'm-pa-d': '1' // salah
        }
      }
    }
  };
  evaluateSubmissionServerSide(subCase5_3of4, questions24);
  recordTest(subCase5_3of4.answers['q-pa-7'].score === 3, 'Kasus 5: Uji 3/4 pasangan benar (format angka tunggal) menghasilkan skor 3/4', `Actual: ${subCase5_3of4.answers['q-pa-7'].score}`);

  // Uji 2/4 Benar
  const subCase5_2of4 = {
    id: 'sub-case-5-2',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '2',
          'm-pa-b': '1',
          'm-pa-c': '1',
          'm-pa-d': '1'
        }
      }
    }
  };
  evaluateSubmissionServerSide(subCase5_2of4, questions24);
  recordTest(subCase5_2of4.answers['q-pa-7'].score === 2, 'Kasus 5: Uji 2/4 pasangan benar menghasilkan skor 2/4', `Actual: ${subCase5_2of4.answers['q-pa-7'].score}`);

  // Uji 0/4 (Seluruhnya salah)
  const subCase5_0of4 = {
    id: 'sub-case-5-0',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '4',
          'm-pa-b': '3',
          'm-pa-c': '1',
          'm-pa-d': '2'
        }
      }
    }
  };
  evaluateSubmissionServerSide(subCase5_0of4, questions24);
  recordTest(subCase5_0of4.answers['q-pa-7'].score === 0, 'Kasus 5: Uji seluruh pasangan salah menghasilkan skor 0/4', `Actual: ${subCase5_0of4.answers['q-pa-7'].score}`);

  // Uji Urutan Acak pada JSON Object Siswa
  const subCase5_shuffled = {
    id: 'sub-case-5-shuf',
    packageId: 'pkg-full-24',
    answers: {
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-d': '4. Komposisi atau konsentrasi larutan dapat berubah',
          'm-pa-a': '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil',
          'm-pa-c': '3. Menimbulkan kesalahan paralaks',
          'm-pa-b': '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan'
        }
      }
    }
  };
  evaluateSubmissionServerSide(subCase5_shuffled, questions24);
  recordTest(subCase5_shuffled.answers['q-pa-7'].score === 4, 'Kasus 5: Urutan pasangan berbeda pada payload siswa tetap menghasilkan skor 4/4', `Actual: ${subCase5_shuffled.answers['q-pa-7'].score}`);
}

// 1.7 KASUS 6: Audit Pemetaan Tipe Soal & Mislabeling
console.log('\n--- KASUS 6: Audit Label dan Struktur Jawaban Siswa ---');
{
  const subCheck = {
    id: 'sub-mcq-check',
    packageId: 'pkg-full-24',
    answers: {
      'q-k3lh-2': {
        questionId: 'q-k3lh-2',
        selectedOption: 'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian'
      },
      'q-k3lh-1': {
        questionId: 'q-k3lh-1',
        selectedOptions: ['A. Menggunakan...', 'C. Membaca...']
      }
    }
  };
  evaluateSubmissionServerSide(subCheck, questions24);

  const mcAnswer = subCheck.answers['q-k3lh-2'];
  const complexAnswer = subCheck.answers['q-k3lh-1'];

  recordTest(mcAnswer.selectedOption !== undefined, 'MCQ memiliki selectedOption', `Option: ${mcAnswer.selectedOption}`);
  recordTest(mcAnswer.selectedOptions === undefined, 'MCQ TIDAK memiliki selectedOptions (Mencegah mislabeling checkbox di frontend)', `selectedOptions: ${mcAnswer.selectedOptions}`);
  recordTest(Array.isArray(complexAnswer.selectedOptions), 'Complex MCQ memiliki selectedOptions sebagai array', `isArr: ${Array.isArray(complexAnswer.selectedOptions)}`);
}

// 1.8 KASUS 7: Zero Fake Score Audit & Status Pending Esai
console.log('\n--- KASUS 7: Audit Zero Fake Score & Pending Evaluation Esai ---');
{
  const subEssay = {
    id: 'sub-essay-pending',
    packageId: 'pkg-full-24',
    answers: {
      'q-k3lh-4': {
        questionId: 'q-k3lh-4',
        essayAnswer: 'Limbah Cu2+ tidak boleh dibuang langsung ke wastafel.',
        score: undefined // Ungraded
      }
    }
  };
  evaluateSubmissionServerSide(subEssay, questions24);
  const q4 = subEssay.answers['q-k3lh-4'];

  recordTest(q4.score === undefined, 'Esai belum dinilai memiliki score=undefined (bukan fake score 0)', `score: ${q4.score}`);
  recordTest(q4.isPendingEvaluation === true, 'Esai belum dinilai memiliki isPendingEvaluation=true', `isPending: ${q4.isPendingEvaluation}`);
  recordTest(subEssay.hasPendingComponents === true, 'Submission memiliki hasPendingComponents=true', `hasPending: ${subEssay.hasPendingComponents}`);
  recordTest(subEssay.isScoreFinal === false, 'isScoreFinal=false saat ada komponen esai yang belum dinilai', `isScoreFinal: ${subEssay.isScoreFinal}`);
}

// 1.9 UJI SELURUH 24 SOAL PKG-FULL-24 SECARA KOMPREHENSIF
console.log('\n--- AUDIT TOTAL 24 SOAL PKG-FULL-24 SECARA PENUH ---');
{
  const fullSub = {
    id: 'sub-full-test',
    packageId: 'pkg-full-24',
    answers: {
      // 1. Complex MCQ (2 pts) -> Kunci A, C
      'q-k3lh-1': { questionId: 'q-k3lh-1', selectedOptions: ['A. Menggunakan jas laboratorium...', 'C. Membaca label...'] },
      // 2. MCQ (1 pt) -> Kunci C
      'q-k3lh-2': { questionId: 'q-k3lh-2', selectedOption: 'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian' },
      // 3. Matching (4 pts) -> Kunci A->3, B->1, C->2, D->4
      'q-k3lh-3': { questionId: 'q-k3lh-3', matchingAnswers: { 'm-k3lh-a': '3', 'm-k3lh-b': '1', 'm-k3lh-c': '2', 'm-k3lh-d': '4' } },
      // 4. Essay (3 pts) -> Pending
      'q-k3lh-4': { questionId: 'q-k3lh-4', essayAnswer: 'Jawaban esai k3lh' },
      // 5. MCQ (1 pt) -> Kunci D
      'q-pa-5': { questionId: 'q-pa-5', selectedOption: 'D. Pipet volumetrik 10 ml' },
      // 6. Complex MCQ (2 pts) -> Kunci A, D
      'q-pa-6': { questionId: 'q-pa-6', selectedOptions: ['A. Melarutkan...', 'D. Membaca...'] },
      // 7. Matching (4 pts) -> Kunci A->2, B->1, C->3, D->4
      'q-pa-7': { questionId: 'q-pa-7', matchingAnswers: { 'm-pa-a': '2', 'm-pa-b': '1', 'm-pa-c': '3', 'm-pa-d': '4' } },
      // 8. Essay (3 pts) -> Pending
      'q-pa-8': { questionId: 'q-pa-8', essayAnswer: 'Jawaban esai persiapan' },
      // 9. MCQ (1 pt) -> Kunci C
      'q-st-9': { questionId: 'q-st-9', selectedOption: 'C. 1,325 g' },
      // 10. Essay (3 pts) -> Pending
      'q-st-10': { questionId: 'q-st-10', essayAnswer: 'Jawaban esai stoikiometri 10' },
      // 11. Essay (3 pts) -> Pending
      'q-st-11': { questionId: 'q-st-11', essayAnswer: 'Jawaban esai stoikiometri 11' },
      // 12. Essay (3 pts) -> Pending
      'q-st-12': { questionId: 'q-st-12', essayAnswer: 'Jawaban esai stoikiometri 12' },
      // 13. MCQ (1 pt) -> Kunci B
      'q-av-13': { questionId: 'q-av-13', selectedOption: 'B. Menambahkan titran secara bertahap...' },
      // 14. Essay (5 pts) -> Pending
      'q-av-14': { questionId: 'q-av-14', essayAnswer: 'Jawaban esai volumetri 14' },
      // 15. Complex MCQ (2 pts) -> Kunci A, D
      'q-av-15': { questionId: 'q-av-15', selectedOptions: ['A. Gelembung...', 'D. Pembacaan...'] },
      // 16. Essay (5 pts) -> Pending
      'q-av-16': { questionId: 'q-av-16', essayAnswer: 'Jawaban esai volumetri 16' },
      // 17. MCQ (1 pt) -> Kunci C
      'q-id-17': { questionId: 'q-id-17', selectedOption: 'C. Mengkalibrasi pH meter...' },
      // 18. Matching (4 pts) -> Kunci A->3, B->4, C->1, D->2
      'q-id-18': { questionId: 'q-id-18', matchingAnswers: { 'm-id-a': '3', 'm-id-b': '4', 'm-id-c': '1', 'm-id-d': '2' } },
      // 19. Complex MCQ (2 pts) -> Kunci B, D
      'q-id-19': { questionId: 'q-id-19', selectedOptions: ['B. Membilas...', 'D. Memastikan...'] },
      // 20. Essay (4 pts) -> Pending
      'q-id-20': { questionId: 'q-id-20', essayAnswer: 'Jawaban esai instrumentasi 20' },
      // 21. MCQ (1 pt) -> Kunci C
      'q-mm-21': { questionId: 'q-mm-21', selectedOption: 'C. Nama larutan, konsentrasi...' },
      // 22. Complex MCQ (2 pts) -> Kunci A, C
      'q-mm-22': { questionId: 'q-mm-22', selectedOptions: ['A. Mencatat...', 'C. Mencatat...'] },
      // 23. Matching (4 pts) -> Kunci A->2, B->3, C->1, D->4
      'q-mm-23': { questionId: 'q-mm-23', matchingAnswers: { 'm-mm-a': '2', 'm-mm-b': '3', 'm-mm-c': '1', 'm-mm-d': '4' } },
      // 24. Essay (4 pts) -> Pending
      'q-mm-24': { questionId: 'q-mm-24', essayAnswer: 'Jawaban esai mutu 24' }
    }
  };

  evaluateSubmissionServerSide(fullSub, questions24);

  // Auto score: 6 MC (6) + 5 Complex MCQ (10) + 4 Matching (16) = 32
  recordTest(fullSub.autoScore === 32, 'Skor objektif otomatis ke-15 butir tepat 32 poin (6 MC + 10 Complex + 16 Matching)', `autoScore: ${fullSub.autoScore}`);
  recordTest(fullSub.maxRawScore === 65, 'Maksimum skor mentah total adalah 65 poin', `maxRawScore: ${fullSub.maxRawScore}`);
  recordTest(fullSub.hasPendingComponents === true, 'Submission lengkap dengan 9 esai pending memiliki hasPendingComponents=true', `hasPending: ${fullSub.hasPendingComponents}`);
  recordTest(fullSub.isScoreFinal === false, 'isScoreFinal=false saat esai masih pending', `isScoreFinal: ${fullSub.isScoreFinal}`);
}

// =========================================================================
// PART 2: INTEGRATION TEST DENGAN SERVER DAN ENDPOINT HTTP
// =========================================================================
console.log('\n--- BAGIAN 2: INTEGRATION TEST DENGAN SERVER ISOLASI HTTP ---');

// Mock AI Server Setup
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

// Server Process Controller
let serverProcess = null;

function setupSyntheticDatabase() {
  if (!fs.existsSync(SYNTHETIC_DIR)) {
    fs.mkdirSync(SYNTHETIC_DIR, { recursive: true });
  }

  const initialDb = {
    users: [
      {
        id: 'usr-admin-audit',
        name: 'Administrator Audit',
        email: 'admin@audit.id',
        role: 'admin',
        schoolId: 'sch-audit-1',
        schoolName: 'SMK Audit Mandiri',
        password: 'password123',
        status: 'active'
      },
      {
        id: 'usr-guru-audit',
        name: 'Guru Penguji Kimia',
        email: 'guru@audit.id',
        role: 'guru',
        schoolId: 'sch-audit-1',
        schoolName: 'SMK Audit Mandiri',
        password: 'password123',
        status: 'active'
      },
      {
        id: 'usr-std-audit-01',
        name: 'Siswa Audit Kimia 01',
        email: 'siswa01@audit.id',
        role: 'siswa',
        schoolId: 'sch-audit-1',
        schoolName: 'SMK Audit Mandiri',
        classId: 'cls-audit-1',
        className: 'XII Kimia 1',
        identityNo: 'NIS-AUDIT-01',
        password: 'password123',
        status: 'active'
      }
    ],
    schools: [
      { id: 'sch-audit-1', name: 'SMK Audit Mandiri', code: 'SMK-AUDIT-01' }
    ],
    classes: [
      { id: 'cls-audit-1', name: 'XII Kimia 1', schoolId: 'sch-audit-1' }
    ],
    packages: FULL_TECHNICAL_CHEMISTRY_PACKAGE,
    exams: [
      {
        id: 'ex-audit-24',
        title: 'Ujian Praktik Kimia 24 Butir',
        packageId: 'pkg-full-24',
        packageTitle: 'Instrumen Tes Kemampuan Teknis Kimia Siswa SMK Rumpun Kimia (24 Soal - 6 Dimensi)',
        category: 'teknis_kimia',
        durationMinutes: 90,
        schoolId: 'sch-audit-1',
        schoolName: 'SMK Audit Mandiri',
        classId: 'cls-audit-1',
        className: 'XII Kimia 1',
        status: 'berjalan',
        questionSnapshot: REVISED_QUESTIONS_24
      }
    ],
    submissions: [],
    drafts: [],
    settings: {
      siteName: 'EmployaSkills Audit Staging',
      providers: [
        {
          id: 'deepseek',
          name: 'DeepSeek',
          apiKey: 'mock-deepseek-key-audit',
          baseUrl: `http://127.0.0.1:${MOCK_AI_PORT}`,
          models: ['deepseek-chat', 'deepseek-reasoner'],
          activeModel: 'deepseek-chat',
          isEnabled: true,
          status: 'ready'
        }
      ],
      aiMode: 'custom',
      deepseekApiKey: 'mock-deepseek-key-audit'
    }
  };

  fs.writeFileSync(SYNTHETIC_DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: TEST_PORT.toString(),
      DISABLE_SERVER_LISTEN: 'false',
      NODE_ENV: 'test',
      JWT_SECRET: 'super_secure_test_signing_secret_32bytes_long',
      AUTH_SECRET: 'super_secure_test_signing_secret_32bytes_long',
      DATABASE_FILE: SYNTHETIC_DB_PATH,
      VOC_DATABASE_PATH: SYNTHETIC_DB_PATH,
      EVIDENCE_STORAGE_DIR: path.join(SYNTHETIC_DIR, 'evidence_uploads'),
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_AI_PORT}`,
      DEEPSEEK_API_KEY: 'mock-deepseek-key-audit'
    };

    serverProcess = spawn(process.execPath, [SERVER_DIST_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });

    let started = false;
    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Backend API Server running') || msg.includes('Server siap menerima koneksi')) {
        if (!started) {
          started = true;
          resolve();
        }
      }
    });

    serverProcess.stderr.on('data', (d) => {
      console.error('[Spawned Server Stderr]:', d.toString());
    });

    serverProcess.on('exit', (code) => {
      if (!started) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function apiRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function loginAs(email, password = 'password123') {
  const res = await apiRequest('/api/auth/login', 'POST', { email, password });
  if (res.json?.token) {
    return { token: res.json.token, authHeader: { 'Authorization': `Bearer ${res.json.token}` } };
  }
  return { token: null, authHeader: {} };
}

try {
  await startMockAiServer();
  setupSyntheticDatabase();
  await startServer();

  console.log('Server pengujian berhasil berjalan pada port ' + TEST_PORT);

  // Login sebagai Siswa, Guru, dan Admin
  const stdAuth = await loginAs('siswa01@audit.id');
  const guruAuth = await loginAs('guru@audit.id');
  const adminAuth = await loginAs('admin@audit.id');

  recordTest(Boolean(stdAuth.token), 'Autentikasi login Siswa berhasil');
  recordTest(Boolean(guruAuth.token), 'Autentikasi login Guru berhasil');
  recordTest(Boolean(adminAuth.token), 'Autentikasi login Admin berhasil');

  // Submit ujian dari siswa yang mereproduksi seluruh kasus staging:
  // Case 1: Q5 memilih D (Pipet volumetrik)
  // Case 2: Q13 memilih B (Menambahkan titran bertahap)
  // Case 3: Q1 memilih A dan C (keduanya kunci)
  // Case 4: Q6 memilih A (benar) dan B (salah)
  // Case 5: Q7 memilih matching (A->1, B->3, C->2, D->4)
  // Case 7: Q4 esai (belum dinilai)
  console.log('\n--- UJI INTEGRASI: PENGUMPULAN UJIAN OLEH SISWA ---');
  const submissionPayload = {
    examId: 'ex-audit-24',
    packageId: 'pkg-full-24',
    answers: {
      // Q1: Complex MCQ -> A & C
      'q-k3lh-1': {
        questionId: 'q-k3lh-1',
        selectedOptions: [
          'A. Menggunakan jas laboratorium, sarung tangan, dan kacamata keselamatan saat menimbang NaOH.',
          'C. Membaca label dan informasi keselamatan bahan sebelum melakukan penimbangan NaOH.'
        ],
        score: 0 // Client sends 0
      },
      // Q2: MCQ -> C
      'q-k3lh-2': {
        questionId: 'q-k3lh-2',
        selectedOption: 'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian',
        score: 0
      },
      // Q4: Essay -> Teks jawaban
      'q-k3lh-4': {
        questionId: 'q-k3lh-4',
        essayAnswer: 'Limbah Cu2+ tidak boleh dibuang langsung ke wastafel hanya dengan pengenceran karena Cu2+ adalah logam berat toksik. Limbah harus ditampung dalam wadah berlabel sesuai SOP.',
        score: 0
      },
      // Q5: MCQ -> D (Pipet volumetrik)
      'q-pa-5': {
        questionId: 'q-pa-5',
        selectedOption: 'D. Pipet volumetrik 10 ml',
        score: 0
      },
      // Q6: Complex MCQ -> A & B
      'q-pa-6': {
        questionId: 'q-pa-6',
        selectedOptions: [
          'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
          'B. Membilas wadah pelarutan dengan akuades, tetapi membuang hasil bilasan sebelum larutan dipindahkan ke dalam labu ukur.'
        ],
        score: 0
      },
      // Q7: Matching -> Case 5 screenshot pairs
      'q-pa-7': {
        questionId: 'q-pa-7',
        matchingAnswers: {
          'm-pa-a': '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan',
          'm-pa-b': '3. Menimbulkan kesalahan paralaks',
          'm-pa-c': '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil',
          'm-pa-d': '4. Komposisi atau konsentrasi larutan dapat berubah'
        },
        score: 0
      },
      // Q13: MCQ -> B (Titrasi argentometri)
      'q-av-13': {
        questionId: 'q-av-13',
        selectedOption: 'B. Menambahkan titran secara bertahap sambil menghomogenkan larutan serta mengamati terbentuknya endapan putih AgCl dan perubahan warna hingga titik akhir titrasi.',
        score: 0
      }
    }
  };

  const submitRes = await apiRequest('/api/submissions', 'POST', submissionPayload, stdAuth.authHeader);
  recordTest(submitRes.ok && submitRes.json?.success === true, 'Siswa berhasil mengumpulkan ujian via POST /api/submissions (HTTP 200)');

  const createdSubId = submitRes.json?.data?.id || submitRes.json?.submission?.id;
  recordTest(Boolean(createdSubId), `ID Submission tercipta: ${createdSubId}`);

  // Ambil detail submission via GET /api/submissions/:id sebagai Guru
  console.log('\n--- UJI INTEGRASI: VERIFIKASI DETAIL SUBMISSION GURU (GET /api/submissions/:id) ---');
  const getSubRes = await apiRequest(`/api/submissions/${createdSubId}`, 'GET', null, guruAuth.authHeader);
  recordTest(getSubRes.ok && getSubRes.json?.success === true, 'Guru berhasil mengambil detail submission via GET /api/submissions/:id');

  const subData = getSubRes.json?.data || getSubRes.json?.submission;

  // Verifikasi Kasus 1 (Q5 Pipet volumetrik)
  const q5Ans = subData.answers['q-pa-5'];
  recordTest(q5Ans?.score === 1, 'VERIFIKASI KASUS 1: Soal #5 (Pipet volumetrik) mendapatkan skor eksak 1/1 (Bukan 0/1)', `score: ${q5Ans?.score}`);
  recordTest(q5Ans?.selectedOptions === undefined, 'VERIFIKASI KASUS 6: Soal #5 (Regular MCQ) tidak memiliki selectedOptions', `selectedOptions: ${q5Ans?.selectedOptions}`);

  // Verifikasi Kasus 2 (Q13 Argentometri)
  const q13Ans = subData.answers['q-av-13'];
  recordTest(q13Ans?.score === 1, 'VERIFIKASI KASUS 2: Soal #13 (Argentometri) mendapatkan skor eksak 1/1 (Bukan 0/1)', `score: ${q13Ans?.score}`);
  recordTest(q13Ans?.selectedOptions === undefined, 'VERIFIKASI KASUS 6: Soal #13 (Regular MCQ) tidak memiliki selectedOptions', `selectedOptions: ${q13Ans?.selectedOptions}`);

  // Verifikasi Kasus 3 (Q1 Complex MCQ K3LH)
  const q1Ans = subData.answers['q-k3lh-1'];
  recordTest(q1Ans?.score === 2, 'VERIFIKASI KASUS 3: Soal #1 Complex MCQ (A & C) mendapatkan skor eksak 2/2 (Bukan 0/2)', `score: ${q1Ans?.score}`);

  // Verifikasi Kasus 4 (Q6 Complex MCQ Preparasi NaCl)
  const q6Ans = subData.answers['q-pa-6'];
  recordTest(q6Ans?.score === 1, 'VERIFIKASI KASUS 4: Soal #6 Complex MCQ (A benar & B salah) mendapatkan skor 1/2', `score: ${q6Ans?.score}`);

  // Verifikasi Kasus 5 (Q7 Matching)
  const q7Ans = subData.answers['q-pa-7'];
  recordTest(q7Ans?.score === 1, 'VERIFIKASI KASUS 5: Soal #7 Matching (m-pa-a->1, m-pa-b->3, m-pa-c->2, m-pa-d->4) mendapatkan skor eksak 1/4 (Bukan 0/4)', `score: ${q7Ans?.score}`);

  // Verifikasi Kasus 7: Zero Fake Score & Pending status sebelum AI
  const q4Ans = subData.answers['q-k3lh-4'];
  recordTest(q4Ans?.score === undefined, 'VERIFIKASI KASUS 7: Soal #4 (Esai belum dinilai) tidak memiliki fake score 0 (score=undefined)', `score: ${q4Ans?.score}`);
  recordTest(q4Ans?.isPendingEvaluation === true, 'VERIFIKASI KASUS 7: Soal #4 memiliki isPendingEvaluation=true', `isPending: ${q4Ans?.isPendingEvaluation}`);
  recordTest(subData.hasPendingComponents === true, 'Submission memiliki hasPendingComponents=true', `hasPending: ${subData.hasPendingComponents}`);
  recordTest(subData.isScoreFinal === false, 'Submission memiliki isScoreFinal=false saat ada komponen pending', `isScoreFinal: ${subData.isScoreFinal}`);

  // 1.10 UJI KASUS 7 KETIKA AI SERVICE GAGAL (HTTP 500 / GEO-RESTRICTION)
  console.log('\n--- UJI INTEGRASI: SIMULASI KEGAGALAN AI PROVIDER (HTTP 500 / OFFLINE) ---');
  mockResponseHandler = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'DeepSeek API connection failed (HTTP 500 Simulated)' } }));
  };

  const evalAiRes = await apiRequest(`/api/ai/evaluate-submission/${createdSubId}`, 'POST', {}, guruAuth.authHeader);
  recordTest(evalAiRes.ok && evalAiRes.json?.success === true, 'Endpoint evaluasi AI merespons (HTTP 200)');

  const subAfterFailedAi = evalAiRes.json?.submission;
  recordTest(subAfterFailedAi.aiGradingStatus === 'failed', 'Status AI grading tercatat failed saat provider gagal', `status: ${subAfterFailedAi.aiGradingStatus}`);
  recordTest(subAfterFailedAi.hasPendingComponents === true, 'hasPendingComponents tetap true setelah AI gagal', `hasPending: ${subAfterFailedAi.hasPendingComponents}`);
  recordTest(subAfterFailedAi.isScoreFinal === false, 'isScoreFinal tetap false setelah AI gagal', `isScoreFinal: ${subAfterFailedAi.isScoreFinal}`);

  const q4AfterFailed = subAfterFailedAi.answers['q-k3lh-4'];
  recordTest(q4AfterFailed.score === undefined, 'Soal #4 esai TIDAK diberi fake score 0 saat AI gagal (score=undefined)', `score: ${q4AfterFailed.score}`);
  recordTest(q4AfterFailed.isPendingEvaluation === true, 'Soal #4 esai mempertahankan isPendingEvaluation=true saat AI gagal', `isPending: ${q4AfterFailed.isPendingEvaluation}`);
  recordTest(q4AfterFailed.aiRubricScoring?.scoresPerIndicator?.length === 0, 'scoresPerIndicator dikosongkan saat AI gagal (tidak ada indikator fiktif)', `count: ${q4AfterFailed.aiRubricScoring?.scoresPerIndicator?.length}`);

  // Pastikan nilai objektif (Q1, Q5, Q6, Q7, Q13) TIDAK BERUBAH sedikitpun saat AI gagal!
  recordTest(subAfterFailedAi.answers['q-pa-5'].score === 1, 'Skor Q5 (Pipet volumetrik) terlindungi dan tetap 1/1 setelah AI gagal', `score: ${subAfterFailedAi.answers['q-pa-5'].score}`);
  recordTest(subAfterFailedAi.answers['q-av-13'].score === 1, 'Skor Q13 (Argentometri) terlindungi dan tetap 1/1 setelah AI gagal', `score: ${subAfterFailedAi.answers['q-av-13'].score}`);
  recordTest(subAfterFailedAi.answers['q-k3lh-1'].score === 2, 'Skor Q1 (Complex MCQ) terlindungi dan tetap 2/2 setelah AI gagal', `score: ${subAfterFailedAi.answers['q-k3lh-1'].score}`);
  recordTest(subAfterFailedAi.answers['q-pa-6'].score === 1, 'Skor Q6 (Complex MCQ partial) terlindungi dan tetap 1/2 setelah AI gagal', `score: ${subAfterFailedAi.answers['q-pa-6'].score}`);
  recordTest(subAfterFailedAi.answers['q-pa-7'].score === 1, 'Skor Q7 (Matching) terlindungi dan tetap 1/4 setelah AI gagal', `score: ${subAfterFailedAi.answers['q-pa-7'].score}`);

  // 1.11 UJI KASUS VALIDASI GURU & PERLINDUNGAN SKOR DARI PENIMPAAN
  console.log('\n--- UJI INTEGRASI: PENGESAHAN NILAI OLEH GURU & PERLINDUNGAN SKOR ---');
  // Guru memvalidasi dan memberi nilai esai Q4 = 3 poin
  const validationPayload = {
    ...subAfterFailedAi,
    validationStatus: 'approved',
    validatedBy: 'usr-guru-audit',
    validatedByName: 'Guru Penguji Kimia',
    validatedAt: new Date().toISOString(),
    isTeacherValidated: true,
    answers: {
      ...subAfterFailedAi.answers,
      'q-k3lh-4': {
        ...q4AfterFailed,
        score: 3,
        teacherScore: 3,
        isPendingEvaluation: false,
        teacherFeedback: 'Validasi guru: Argumen penolakan wastafel dan SOP limbah sangat tepat.'
      }
    }
  };

  const putRes = await apiRequest(`/api/submissions/${createdSubId}`, 'PUT', validationPayload, guruAuth.authHeader);
  recordTest(putRes.ok && putRes.json?.success === true, 'Guru berhasil mengesahkan nilai via PUT /api/submissions/:id');

  const subValidated = putRes.json?.submission;
  recordTest(subValidated.isScoreFinal === true, 'isScoreFinal=true setelah guru mengesahkan nilai', `isScoreFinal: ${subValidated.isScoreFinal}`);
  recordTest(subValidated.validationStatus === 'approved', 'validationStatus=approved setelah validasi guru', `status: ${subValidated.validationStatus}`);
  recordTest(subValidated.answers['q-k3lh-4'].score === 3, 'Skor esai Q4 tervalidasi guru menjadi 3/3', `score: ${subValidated.answers['q-k3lh-4'].score}`);

  // Coba jalankan evaluasi AI ulang (retry) untuk memastikan AI TIDAK MENIMPA nilai yang sudah divalidasi guru!
  mockResponseHandler = (req, res) => {
    // Sekalipun AI tiba-tiba sukses dan menghasilkan skor berbeda (misal 1)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            total_score: 1,
            feedback: 'AI mencoba menimpa nilai guru',
            rubric_scores: []
          })
        }
      }]
    }));
  };

  const reEvalRes = await apiRequest(`/api/ai/evaluate-submission/${createdSubId}`, 'POST', {}, guruAuth.authHeader);
  recordTest(reEvalRes.ok, 'Endpoint AI re-evaluasi merespons');

  const getSubAfterRetry = await apiRequest(`/api/submissions/${createdSubId}`, 'GET', null, guruAuth.authHeader);
  const subProtected = getSubAfterRetry.json?.data || getSubAfterRetry.json?.submission;

  recordTest(subProtected.answers['q-k3lh-4'].score === 3, 'INTEGRITAS NILAI GURU: AI tidak menimpa skor Q4 yang telah divalidasi guru (tetap 3/3)', `score: ${subProtected.answers['q-k3lh-4'].score}`);
  recordTest(subProtected.validationStatus === 'approved', 'INTEGRITAS NILAI GURU: validationStatus tetap approved', `status: ${subProtected.validationStatus}`);

} catch (err) {
  console.error('Unhandled test exception:', err);
  recordTest(false, 'Unhandled test exception', err.message);
} finally {
  stopServer();
  stopMockAiServer();

  // Cleanup synthetic files
  try {
    if (fs.existsSync(SYNTHETIC_DIR)) {
      fs.rmSync(SYNTHETIC_DIR, { recursive: true, force: true });
    }
  } catch {}

  console.log('\n===============================================================');
  console.log(` REKAP HASIL AUDIT PENSKORAN EMPLOYASKILLS PR #6:`);
  console.log(` TOTAL PENGUJIAN : ${testResults.length}`);
  console.log(` LULUS (PASS)    : ${passedCount}`);
  console.log(` GAGAL (FAIL)    : ${failedCount}`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
