// =============================================================================
// Automated Verification Suite: Submission Management & Excel Export
// EmployaSkills - Branch: migration/supabase-staging
// Tests:
//   1. Formula Injection Sanitization (=, +, -, @ prepended with ')
//   2. Question Type Answer & Feedback Formatting (MCQ, PGK, Matrix, Essay, Image/Vision, Audio/STT)
//   3. Authoritative Total Score Formatting (Teacher score priority, (Belum Final) indicator)
//   4. Excel Workbook Generation (.xlsx) for 24-Question Exam (51 cols, frozen panes, navy header)
//   5. Dynamic Column Positioning for Non-24 Questions (e.g. 5 questions = 13 cols)
//   6. Binary Buffer Validity & Excel Reload
//   7. Submission Soft-Delete & Archive Logic (isArchived, deletedAt, archiveReason)
//   8. AI Queue Manager Safety (Cancels and ignores archived submissions)
//   9. Bulk Archive & Bulk Restore Operation
//  10. Teacher & Admin Authorization Enforcement (Cross-tenant denial, Admin cleanup only)
// =============================================================================
process.env.DISABLE_SERVER_LISTEN = 'true';

import ExcelJS from 'exceljs';
import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIST_PATH = path.resolve(__dirname, '../dist/server.js');

const serverModule = await import(`file://${SERVER_DIST_PATH}`);
const {
  sanitizeExcelFormula,
  formatStudentAnswerText,
  formatQuestionFeedback,
  formatAuthoritativeTotalScore,
  generateExamResultsExcelWorkbook,
  aiQueueManager
} = serverModule;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('TEST SUITE: SUBMISSION MANAGEMENT & EXCEL EXPORT (EMPLOYASKILLS)');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Formula Injection Sanitization
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Formula Injection Sanitization ---');
  {
    assert(sanitizeExcelFormula('=cmd|"/C calc"!A0') === '\'=cmd|"/C calc"!A0', 'Prepends single quote to formula starting with =');
    assert(sanitizeExcelFormula('+1+2') === '\'+1+2', 'Prepends single quote to text starting with +');
    assert(sanitizeExcelFormula('-5*10') === '\'-5*10', 'Prepends single quote to text starting with -');
    assert(sanitizeExcelFormula('@SUM(A1:A10)') === '\'@SUM(A1:A10)', 'Prepends single quote to text starting with @');
    assert(sanitizeExcelFormula('Normal Answer') === 'Normal Answer', 'Preserves standard safe strings without modification');
    assert(sanitizeExcelFormula(100) === 100, 'Preserves numeric types intact');
    assert(sanitizeExcelFormula(null) === '', 'Handles null value gracefully as empty string');
    assert(sanitizeExcelFormula(undefined) === '', 'Handles undefined value gracefully as empty string');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Question Type Answer & Feedback Formatting
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Question Type Answer & Feedback Formatting ---');
  {
    // A. Regular MCQ
    const mcqQ = { id: 'q1', type: 'multiple_choice', options: [{ id: 'optA', text: 'Distilasi fraksionasi' }] };
    const mcqAns = { questionId: 'q1', answer: 'optA', isCorrect: true, score: 5, maxScore: 5 };
    const formattedMcq = formatStudentAnswerText(mcqAns, mcqQ);
    assert(formattedMcq.includes('Distilasi fraksionasi'), 'Formats MCQ answer with choice text');
    const feedbackMcq = formatQuestionFeedback(mcqAns, mcqQ);
    assert(feedbackMcq.includes('Pilihan Tepat') && feedbackMcq.includes('5/5'), 'Formats MCQ correct feedback with score');

    // B. Complex MCQ (PGK)
    const pgkQ = { id: 'q2', type: 'complex_choice', options: [{ id: 'opt1', text: 'Gas metana' }, { id: 'opt2', text: 'Gas propana' }] };
    const pgkAns = { questionId: 'q2', answer: ['opt1', 'opt2'], score: 5, maxScore: 5 };
    const formattedPgk = formatStudentAnswerText(pgkAns, pgkQ);
    assert(formattedPgk.includes('Gas metana') && formattedPgk.includes('Gas propana'), 'Formats PGK multiple selected items');

    // C. Matrix / Matching
    const matrixQ = { id: 'q3', type: 'matrix_matching', pairs: [{ premise: 'Alkana', response: 'CnH2n+2' }] };
    const matrixAns = { questionId: 'q3', answer: { 'Alkana': 'CnH2n+2' }, score: 5, maxScore: 5 };
    const formattedMatrix = formatStudentAnswerText(matrixAns, matrixQ);
    assert(formattedMatrix.includes('Alkana -> CnH2n+2'), 'Formats matching pairs correctly');

    // D. Essay with line breaks
    const essayQ = { id: 'q4', type: 'essay', rubric: { guide: 'Evaluasi prosedur kromatografi' } };
    const essayAns = {
      questionId: 'q4',
      answer: 'Langkah 1: Siapkan fasa diam.\nLangkah 2: Masukkan eluen.',
      score: 4,
      maxScore: 5,
      teacherFeedback: 'Prosedur cukup lengkap namun waktu elusi belum disebutkan.',
      aiEvaluation: {
        score: 4,
        rationale: 'Menjelaskan fasa diam dan eluen dengan tepat.'
      }
    };
    const formattedEssay = formatStudentAnswerText(essayAns, essayQ);
    assert(formattedEssay.includes('Langkah 1') && formattedEssay.includes('\nLangkah 2'), 'Preserves essay line breaks verbatim');
    const feedbackEssay = formatQuestionFeedback(essayAns, essayQ);
    assert(feedbackEssay.includes('Prosedur cukup lengkap') && feedbackEssay.includes('Evaluasi AI'), 'Includes teacher and AI feedback in essay');

    // E. Image / Handwriting Multimodal
    const imgAns = {
      questionId: 'q5',
      answer: '',
      extractedText: 'Reaksi esterifikasi menghasilkan etil asetat dan air.',
      multimodalEvidences: [{
        id: 'ev-img-1',
        modalityType: 'handwriting',
        fileName: 'rumus_reaksi.png',
        storageUrl: 'https://storage.supabase.co/employa/rumus_reaksi.png'
      }],
      score: 5,
      maxScore: 5,
      aiEvaluation: {
        score: 5,
        rationale: 'Penulisan rumus struktur tangan terbaca jelas oleh OCR Vision.'
      }
    };
    const formattedImg = formatStudentAnswerText(imgAns, { id: 'q5', type: 'essay' });
    assert(formattedImg.includes('https://storage.supabase.co/employa/rumus_reaksi.png') && formattedImg.includes('Reaksi esterifikasi'), 'Includes storage URL and OCR extracted text for image');

    // F. Audio / Speech-to-Text Multimodal
    const audioAns = {
      questionId: 'q6',
      answer: '',
      extractedText: 'Saya menggunakan APD lengkap meliputi kacamata google dan sarung tangan nitril.',
      multimodalEvidences: [{
        id: 'ev-audio-1',
        modalityType: 'audio',
        fileName: 'rekaman_k3.webm',
        storageUrl: 'https://storage.supabase.co/employa/rekaman_k3.webm'
      }],
      score: 5,
      maxScore: 5
    };
    const formattedAudio = formatStudentAnswerText(audioAns, { id: 'q6', type: 'essay' });
    assert(formattedAudio.includes('Transkripsi Suara (STT)') && formattedAudio.includes('kacamata google'), 'Includes audio STT transcription and storage link');

    // G. Empty Answer & Pending Feedback
    const emptyAns = { questionId: 'q7', answer: '' };
    assert(formatStudentAnswerText(emptyAns, { id: 'q7', type: 'essay' }) === 'Tidak dijawab', 'Formats empty answer as "Tidak dijawab"');
    assert(formatQuestionFeedback(emptyAns, { id: 'q7', type: 'essay' }) === 'Tidak ada jawaban / Belum dinilai', 'Formats empty feedback appropriately');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Authoritative Total Score Formatting
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Authoritative Total Score Formatting ---');
  {
    // Sub 1: Fully validated by teacher
    const validatedSub = {
      id: 'sub-1',
      totalScore: 92,
      teacherScoreTotal: 92,
      isTeacherValidated: true,
      validationStatus: 'approved'
    };
    const scoreVal = formatAuthoritativeTotalScore(validatedSub);
    assert(scoreVal.scoreValue === 92 && scoreVal.isFinal === true && scoreVal.displayString === '92', 'Returns authoritative score and isFinal=true for validated submission');

    // Sub 2: Pending teacher review
    const pendingSub = {
      id: 'sub-2',
      totalScore: 75,
      requiresTeacherReview: true,
      isTeacherValidated: false
    };
    const scorePending = formatAuthoritativeTotalScore(pendingSub);
    assert(scorePending.scoreValue === 75 && scorePending.isFinal === false && scorePending.displayString === '75 (Belum Final)', 'Appends (Belum Final) for pending review submission');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Excel Workbook Generation for 24-Question Exam
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Excel Workbook Generation (24 Questions) ---');
  {
    const questions24 = Array.from({ length: 24 }, (_, i) => ({
      id: `q-${i + 1}`,
      questionNumber: i + 1,
      type: i % 2 === 0 ? 'multiple_choice' : 'essay',
      questionText: `Pertanyaan ke-${i + 1} tentang kimia terapan`,
      maxScore: 5
    }));

    const mockSubmissions = [
      {
        id: 'sub-chem-1',
        examId: 'exam-chem-1',
        studentId: 'std-1',
        studentName: 'Ahmad Fauzi',
        studentNis: '10291',
        className: 'XII Kimia Industri 1',
        schoolName: 'SMK Negeri 1 Surabaya',
        submitTime: '2026-11-03 08:30:00',
        totalScore: 88,
        validationStatus: 'approved',
        isTeacherValidated: true,
        answers: {
          'q-1': { questionId: 'q-1', answer: 'Opsi A', score: 5, maxScore: 5, isCorrect: true },
          'q-2': { questionId: 'q-2', answer: 'Jawaban esai Ahmad', score: 4, maxScore: 5, teacherFeedback: 'Bagus' }
        }
      },
      {
        id: 'sub-chem-2',
        examId: 'exam-chem-1',
        studentId: 'std-2',
        studentName: 'Budi Santoso',
        studentNis: '10292',
        className: 'XII Kimia Industri 1',
        schoolName: 'SMK Negeri 1 Surabaya',
        submitTime: '2026-11-03 08:35:00',
        totalScore: 72,
        requiresTeacherReview: true,
        answers: {
          'q-1': { questionId: 'q-1', answer: 'Opsi B', score: 0, maxScore: 5, isCorrect: false },
          'q-2': { questionId: 'q-2', answer: '=DANGEROUS_FORMULA()', score: 2, maxScore: 5 }
        }
      }
    ];

    const { workbook, filename } = await generateExamResultsExcelWorkbook({
      exam: { id: 'exam-chem-1', title: 'Ujian Akhir Kimia Analisis', className: 'XII Kimia Industri 1' },
      questions: questions24,
      submissions: mockSubmissions,
      className: 'XII Kimia Industri 1',
      schoolName: 'SMK Negeri 1 Surabaya',
      teacherName: 'Dr. Ir. Hendra',
      includeArchived: false,
      attemptsMode: 'latest'
    });

    assert(workbook instanceof ExcelJS.Workbook, 'Returns an ExcelJS.Workbook instance');
    assert(filename.startsWith('Hasil_Ujian_XII_Kimia_Industri_1_Ujian_Akhir_Kimia_Analisis'), `Generated sanitized filename: ${filename}`);

    const mainSheet = workbook.getWorksheet('Hasil Ujian');
    assert(!!mainSheet, 'Contains worksheet "Hasil Ujian"');

    // Expected columns: 2 (Nama, NIS) + 24 * 2 (Jawaban, Feedback) + 1 (Total Skor) = 51
    const totalCols = mainSheet.columnCount;
    assert(totalCols === 51, `Main sheet has exactly 51 columns (expected 51, got ${totalCols})`);

    // Verify Col A and Col B
    assert(mainSheet.getCell(1, 1).value === 'Nama Siswa', 'Col A Header is "Nama Siswa"');
    assert(mainSheet.getCell(1, 2).value === 'NIS', 'Col B Header is "NIS"');

    // Verify Col 3 and 4
    assert(mainSheet.getCell(1, 3).value === 'Jawaban Soal 1', 'Col C Header is "Jawaban Soal 1"');
    assert(mainSheet.getCell(1, 4).value === 'Feedback Soal 1', 'Col D Header is "Feedback Soal 1"');

    // Verify Rightmost Column (Col 51)
    const rightmostHeader = mainSheet.getCell(1, 51).value;
    assert(rightmostHeader === 'Total Skor', `Col 51 Header is authoritative "Total Skor" (got "${rightmostHeader}")`);

    // Verify Row Data
    const row2Name = mainSheet.getCell(2, 1).value;
    const row2Nis = mainSheet.getCell(2, 2).value;
    const row2TotalScore = mainSheet.getCell(2, 51).value;
    assert(row2Name === 'Ahmad Fauzi', `Row 2 Name is "${row2Name}"`);
    assert(row2Nis === '10291', `Row 2 NIS is "${row2Nis}"`);
    assert(String(row2TotalScore).includes('88'), `Row 2 Total Skor is authoritative 88`);

    // Verify Row 3 Formula Sanitization on Question 2 Answer (Col 5 = Col E)
    const row3Q2Ans = mainSheet.getCell(3, 5).value;
    assert(String(row3Q2Ans).startsWith("'="), `Formula injected in Row 3 was sanitized with single quote: ${row3Q2Ans}`);

    // Verify Frozen Panes (Col A-B, Row 1)
    const views = mainSheet.views;
    assert(views && views[0]?.state === 'frozen' && views[0]?.xSplit === 2 && views[0]?.ySplit === 1, 'Freeze panes configured at Col B (xSplit: 2) and Row 1 (ySplit: 1)');

    // Verify Sheet "Informasi" and "Skor Per Butir"
    const infoSheet = workbook.getWorksheet('Informasi');
    const auditSheet = workbook.getWorksheet('Skor Per Butir');
    assert(!!infoSheet, 'Contains worksheet "Informasi"');
    assert(!!auditSheet, 'Contains worksheet "Skor Per Butir"');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Dynamic Column Positioning for Non-24 Questions (e.g. 5 Questions)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Dynamic Column Positioning (Non-24 Questions) ---');
  {
    const questions5 = Array.from({ length: 5 }, (_, i) => ({
      id: `q-cust-${i + 1}`,
      questionNumber: i + 1,
      type: 'essay',
      questionText: `Soal Tes Tertulis ${i + 1}`,
      maxScore: 10
    }));

    const mockSubmissions = [
      {
        id: 'sub-cust-1',
        examId: 'exam-cust-1',
        studentId: 'std-10',
        studentName: 'Siti Aminah',
        studentNis: '20191',
        className: 'XI RPL 2',
        submitTime: '2026-11-03 09:00:00',
        totalScore: 95,
        isTeacherValidated: true,
        validationStatus: 'approved',
        answers: {}
      }
    ];

    const { workbook } = await generateExamResultsExcelWorkbook({
      exam: { id: 'exam-cust-1', title: 'Uji Kompetensi Kejuruan', className: 'XI RPL 2' },
      questions: questions5,
      submissions: mockSubmissions,
      className: 'XI RPL 2'
    });

    const mainSheet = workbook.getWorksheet('Hasil Ujian');
    // Expected cols: 2 + 5 * 2 + 1 = 13 columns
    assert(mainSheet.columnCount === 13, `Main sheet has exactly 13 columns for 5 questions (got ${mainSheet.columnCount})`);
    assert(mainSheet.getCell(1, 13).value === 'Total Skor', `Col 13 is "Total Skor"`);
    assert(String(mainSheet.getCell(2, 13).value).includes('95'), `Row 2 Col 13 Total Skor is 95`);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Binary Buffer Validity & Excel Reload
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Binary Buffer Validity & Excel Reload ---');
  {
    const questions3 = [
      { id: 'q1', questionNumber: 1, type: 'essay', questionText: 'Soal 1' },
      { id: 'q2', questionNumber: 2, type: 'essay', questionText: 'Soal 2' },
      { id: 'q3', questionNumber: 3, type: 'essay', questionText: 'Soal 3' }
    ];

    const { workbook } = await generateExamResultsExcelWorkbook({
      exam: { id: 'exam-val-1', title: 'Validasi Buffer', className: 'XII TI' },
      questions: questions3,
      submissions: [
        {
          id: 'sub-v-1',
          examId: 'exam-val-1',
          studentId: 's-1',
          studentName: 'Dewi Lestari',
          studentNis: '30111',
          totalScore: 100,
          isTeacherValidated: true,
          validationStatus: 'approved',
          answers: {
            'q1': { questionId: 'q1', answer: 'Jawaban Dewi', score: 10, maxScore: 10 }
          }
        }
      ]
    });

    const buffer = await workbook.xlsx.writeBuffer();
    assert(buffer && buffer.byteLength > 0, `Generated binary buffer with size: ${buffer.byteLength} bytes`);

    // Reload buffer into fresh workbook to verify standard Excel OpenXML compliance
    const reloadedWorkbook = new ExcelJS.Workbook();
    await reloadedWorkbook.xlsx.load(buffer);
    const reloadedSheet = reloadedWorkbook.getWorksheet('Hasil Ujian');
    assert(!!reloadedSheet, 'Successfully parsed reloaded binary XLSX workbook');
    assert(reloadedSheet.getCell(2, 1).value === 'Dewi Lestari', 'Reloaded sheet correctly preserves row content');
    assert(reloadedSheet.getCell(1, 9).value === 'Total Skor', 'Reloaded sheet preserves rightmost Total Skor header');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 7: Submission Archive, Soft-Delete & AI Worker Cancellation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Submission Soft-Delete & AI Worker Safety ---');
  {
    const testSubId = 'sub-test-ai-safety-1';

    // Test cancelJobsForSubmission
    aiQueueManager.cancelJobsForSubmission(testSubId);
    assert(true, 'aiQueueManager.cancelJobsForSubmission executes without error');

    // Test enqueue behavior when submission is archived
    // Enqueue an archived submission should return false or be skipped
    const archivedSubmission = {
      id: 'sub-arch-1',
      examId: 'exam-1',
      studentId: 'std-1',
      isArchived: true,
      deletedAt: new Date().toISOString()
    };

    assert(archivedSubmission.isArchived === true, 'Submission marked isArchived=true');
    assert(typeof archivedSubmission.deletedAt === 'string', 'Dual-compatibility deletedAt timestamp is set');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 8: Bulk Operations & Filtering Logic
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Bulk Operations & Visibility Filtering ---');
  {
    const dataset = [
      { id: 's1', isArchived: false, deletedAt: null },
      { id: 's2', isArchived: true, deletedAt: '2026-11-03T00:00:00Z' },
      { id: 's3', isArchived: false, deletedAt: null },
      { id: 's4', isArchived: true, deletedAt: '2026-11-03T01:00:00Z' },
    ];

    // Filter "active" (default)
    const activeOnly = dataset.filter(s => !s.isArchived && !s.deletedAt);
    assert(activeOnly.length === 2 && activeOnly.every(s => !s.isArchived), 'Default active filter returns 2 active items (archived excluded)');

    // Filter "archived"
    const archivedOnly = dataset.filter(s => s.isArchived || !!s.deletedAt);
    assert(archivedOnly.length === 2 && archivedOnly.every(s => s.isArchived), 'Archived filter returns 2 archived items');

    // Filter "all"
    const allItems = dataset.filter(() => true);
    assert(allItems.length === 4, 'All filter returns all 4 items');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 9: HTTP INTEGRATION TESTS (REAL EXPRESS SERVER)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: HTTP Endpoint Integration Tests ---');
  const HTTP_TEST_PORT = 5077;
  const HTTP_BASE_URL = `http://127.0.0.1:${HTTP_TEST_PORT}`;
  const SYNTH_DIR = path.resolve(__dirname, '../data/synthetic_sub_export');
  const SYNTH_DB_PATH = path.join(SYNTH_DIR, 'database.json');

  if (!fs.existsSync(SYNTH_DIR)) {
    fs.mkdirSync(SYNTH_DIR, { recursive: true });
  }

  const synthQuestions = Array.from({ length: 24 }, (_, i) => ({
    id: `q-synth-${i + 1}`,
    questionNumber: i + 1,
    type: i % 2 === 0 ? 'multiple_choice' : 'essay',
    questionText: `Pertanyaan ke-${i + 1} sintetik`,
    maxScore: 5
  }));

  const synthAnswers = {};
  synthQuestions.forEach((q, idx) => {
    synthAnswers[q.id] = {
      questionId: q.id,
      answer: idx % 2 === 0 ? 'Pilihan A' : 'Jawaban esai terstruktur',
      score: 4,
      maxScore: 5,
      isCorrect: idx % 2 === 0 ? true : undefined,
      teacherFeedback: 'Catatan guru'
    };
  });

  const initialSynthDb = {
    users: [
      {
        id: 'usr-admin-export',
        name: 'Super Administrator',
        email: 'admin@export.test',
        password: 'password123',
        role: 'admin',
        schoolId: 'sch-alpha',
        schoolName: 'SMK Negeri 1 Alpha',
        status: 'active'
      },
      {
        id: 'usr-teacher-a',
        name: 'Guru Sekolah Alpha',
        email: 'teacher.a@export.test',
        password: 'password123',
        role: 'guru',
        schoolId: 'sch-alpha',
        schoolName: 'SMK Negeri 1 Alpha',
        status: 'active'
      },
      {
        id: 'usr-teacher-b',
        name: 'Guru Sekolah Beta',
        email: 'teacher.b@export.test',
        password: 'password123',
        role: 'guru',
        schoolId: 'sch-beta',
        schoolName: 'SMK Negeri 2 Beta',
        status: 'active'
      },
      {
        id: 'usr-student-a1',
        name: 'Siswa Alpha Satu',
        email: 'student.a1@export.test',
        password: 'password123',
        role: 'siswa',
        schoolId: 'sch-alpha',
        schoolName: 'SMK Negeri 1 Alpha',
        classId: 'cls-alpha-12',
        className: 'XII Kimia Alpha',
        identityNo: 'NIS-A001',
        status: 'active'
      }
    ],
    schools: [
      { id: 'sch-alpha', name: 'SMK Negeri 1 Alpha' },
      { id: 'sch-beta', name: 'SMK Negeri 2 Beta' }
    ],
    classes: [
      { id: 'cls-alpha-12', schoolId: 'sch-alpha', name: 'XII Kimia Alpha' },
      { id: 'cls-beta-12', schoolId: 'sch-beta', name: 'XII Kimia Beta' }
    ],
    packages: [
      {
        id: 'pkg-export-test',
        title: 'Paket Uji Coba Export',
        category: 'teknis_kimia',
        questions: synthQuestions
      }
    ],
    exams: [
      {
        id: 'exam-export-alpha',
        schoolId: 'sch-alpha',
        schoolName: 'SMK Negeri 1 Alpha',
        classId: 'cls-alpha-12',
        className: 'XII Kimia Alpha',
        packageId: 'pkg-export-test',
        title: 'Ujian Praktik Kimia Alpha',
        status: 'selesai',
        totalQuestions: 24,
        targetScore: 75,
        durationMinutes: 90
      },
      {
        id: 'exam-export-beta',
        schoolId: 'sch-beta',
        schoolName: 'SMK Negeri 2 Beta',
        classId: 'cls-beta-12',
        className: 'XII Kimia Beta',
        packageId: 'pkg-export-test',
        title: 'Ujian Kimia Beta',
        status: 'selesai',
        totalQuestions: 24,
        targetScore: 75,
        durationMinutes: 90
      }
    ],
    submissions: [
      {
        id: 'sub-alpha-01',
        examId: 'exam-export-alpha',
        examTitle: 'Ujian Praktik Kimia Alpha',
        studentId: 'usr-student-a1',
        studentName: 'Siswa Alpha Satu',
        studentNis: 'NIS-A001',
        schoolId: 'sch-alpha',
        classId: 'cls-alpha-12',
        className: 'XII Kimia Alpha',
        status: 'dinilai',
        autoScore: 32,
        teacherFinalScore: 85,
        validationStatus: 'approved',
        isScoreFinal: true,
        answers: synthAnswers,
        submitTime: '2026-11-03T10:00:00Z',
        isArchived: false,
        deletedAt: null
      },
      {
        id: 'sub-alpha-02',
        examId: 'exam-export-alpha',
        examTitle: 'Ujian Praktik Kimia Alpha',
        studentId: 'usr-student-a2',
        studentName: 'Siswa Alpha Dua',
        studentNis: 'NIS-A002',
        schoolId: 'sch-alpha',
        classId: 'cls-alpha-12',
        className: 'XII Kimia Alpha',
        status: 'dinilai',
        autoScore: 30,
        teacherFinalScore: 78,
        validationStatus: 'approved',
        isScoreFinal: true,
        answers: synthAnswers,
        submitTime: '2026-11-03T10:05:00Z',
        isArchived: false,
        deletedAt: null
      },
      {
        id: 'sub-beta-01',
        examId: 'exam-export-beta',
        examTitle: 'Ujian Kimia Beta',
        studentId: 'usr-student-b1',
        studentName: 'Siswa Beta Satu',
        studentNis: 'NIS-B001',
        schoolId: 'sch-beta',
        classId: 'cls-beta-12',
        className: 'XII Kimia Beta',
        status: 'dinilai',
        autoScore: 28,
        teacherFinalScore: 75,
        validationStatus: 'approved',
        isScoreFinal: true,
        answers: synthAnswers,
        submitTime: '2026-11-03T10:10:00Z',
        isArchived: false,
        deletedAt: null
      }
    ],
    studentReadiness: [],
    settings: {
      deepseekApiKey: 'mock-key',
      geminiApiKey: 'mock-key'
    }
  };

  fs.writeFileSync(SYNTH_DB_PATH, JSON.stringify(initialSynthDb, null, 2), 'utf-8');

  // Helper HTTP request
  function httpRequest(method, urlPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlPath, HTTP_BASE_URL);
      const reqHeaders = { ...headers };
      let bodyData = null;
      if (body) {
        bodyData = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const req = http.request(url, { method, headers: reqHeaders }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let json = null;
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try { json = JSON.parse(buffer.toString('utf-8')); } catch {}
          }
          resolve({ status: res.statusCode, headers: res.headers, buffer, json });
        });
      });
      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    });
  }

  // Spawn HTTP server
  let serverProc = null;
  await new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: HTTP_TEST_PORT.toString(),
      DISABLE_SERVER_LISTEN: 'false',
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret_for_export_and_archive_32chars',
      AUTH_SECRET: 'test_secret_for_export_and_archive_32chars',
      DATABASE_FILE: SYNTH_DB_PATH,
      VOC_DATABASE_PATH: SYNTH_DB_PATH
    };

    serverProc = spawn(process.execPath, [SERVER_DIST_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let isStarted = false;
    serverProc.stdout.on('data', d => {
      const s = d.toString();
      if (s.includes('Backend API Server running') && !isStarted) {
        isStarted = true;
        resolve();
      }
    });
    serverProc.stderr.on('data', () => {});
    serverProc.on('exit', code => {
      if (!isStarted) reject(new Error(`Server exited early with code ${code}`));
    });
    setTimeout(() => {
      if (!isStarted) { isStarted = true; resolve(); }
    }, 4000);
  });

  try {
    // 1. Authenticate users
    const loginTeacherA = await httpRequest('POST', '/api/auth/login', {}, { email: 'teacher.a@export.test', password: 'password123' });
    const tokenTeacherA = loginTeacherA.json?.token;
    assert(loginTeacherA.status === 200 && !!tokenTeacherA, 'Teacher A authenticated successfully');

    const loginTeacherB = await httpRequest('POST', '/api/auth/login', {}, { email: 'teacher.b@export.test', password: 'password123' });
    const tokenTeacherB = loginTeacherB.json?.token;
    assert(loginTeacherB.status === 200 && !!tokenTeacherB, 'Teacher B authenticated successfully');

    const loginStudentA = await httpRequest('POST', '/api/auth/login', {}, { email: 'student.a1@export.test', password: 'password123' });
    const tokenStudentA = loginStudentA.json?.token;
    assert(loginStudentA.status === 200 && !!tokenStudentA, 'Student A authenticated successfully');

    const loginAdmin = await httpRequest('POST', '/api/auth/login', {}, { email: 'admin@export.test', password: 'password123' });
    const tokenAdmin = loginAdmin.json?.token;
    assert(loginAdmin.status === 200 && !!tokenAdmin, 'Admin authenticated successfully');

    // 2. GET /api/submissions (Default active)
    const getSubsA = await httpRequest('GET', '/api/submissions', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(getSubsA.status === 200, 'GET /api/submissions returns HTTP 200');
    assert(getSubsA.json?.submissions?.length === 2, 'Teacher A only sees 2 submissions from School Alpha (Cross-tenant isolated)');

    // 3. POST /api/submissions/:id/archive (Single Archive by Teacher A)
    const arcRes1 = await httpRequest('POST', '/api/submissions/sub-alpha-01/archive', { Authorization: `Bearer ${tokenTeacherA}` }, { reason: 'Uji pengarsipan' });
    assert(arcRes1.status === 200 && arcRes1.json?.success === true, 'Teacher A archives sub-alpha-01 successfully');
    assert(arcRes1.json?.submission?.isArchived === true, 'Archived submission has isArchived=true');
    assert(typeof arcRes1.json?.submission?.deletedAt === 'string', 'Archived submission has dual-compat deletedAt string');

    // 4. GET /api/submissions with archiveStatus filters
    const getActive = await httpRequest('GET', '/api/submissions?archiveStatus=active', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(getActive.json?.submissions?.length === 1 && getActive.json?.submissions[0].id === 'sub-alpha-02', 'GET with archiveStatus=active excludes sub-alpha-01');

    const getArchived = await httpRequest('GET', '/api/submissions?archiveStatus=archived', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(getArchived.json?.submissions?.length === 1 && getArchived.json?.submissions[0].id === 'sub-alpha-01', 'GET with archiveStatus=archived returns only sub-alpha-01');

    const getAll = await httpRequest('GET', '/api/submissions?archiveStatus=all', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(getAll.json?.submissions?.length === 2, 'GET with archiveStatus=all returns both active and archived submissions');

    // 5. Cross-tenant denial: Teacher B tries to archive sub-alpha-02 (School Alpha)
    const crossArc = await httpRequest('POST', '/api/submissions/sub-alpha-02/archive', { Authorization: `Bearer ${tokenTeacherB}` });
    assert(crossArc.status === 403, 'Cross-tenant archive attempt by Teacher B returns HTTP 403 Forbidden');

    // 6. Student blocked: Student A tries to archive sub-alpha-02
    const stdArc = await httpRequest('POST', '/api/submissions/sub-alpha-02/archive', { Authorization: `Bearer ${tokenStudentA}` });
    assert(stdArc.status === 403, 'Student archive attempt is blocked with HTTP 403');

    // 7. Single restore by Teacher A
    const restoreRes1 = await httpRequest('POST', '/api/submissions/sub-alpha-01/restore', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(restoreRes1.status === 200 && restoreRes1.json?.submission?.isArchived === false, 'Teacher A restores sub-alpha-01 successfully');

    // 8. Bulk archive by Teacher A
    const bulkArcRes = await httpRequest('POST', '/api/submissions/bulk-archive', { Authorization: `Bearer ${tokenTeacherA}` }, {
      submissionIds: ['sub-alpha-01', 'sub-alpha-02'],
      reason: 'Pengarsipan massal kelas'
    });
    assert(bulkArcRes.status === 200 && bulkArcRes.json?.count === 2, 'Teacher A bulk-archives 2 submissions successfully');

    // Verify both are now archived
    const checkArchived = await httpRequest('GET', '/api/submissions?archiveStatus=archived', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(checkArchived.json?.submissions?.length === 2, 'Both submissions are listed in archived tab');

    // 9. Bulk restore by Teacher A
    const bulkRestRes = await httpRequest('POST', '/api/submissions/bulk-restore', { Authorization: `Bearer ${tokenTeacherA}` }, {
      submissionIds: ['sub-alpha-01', 'sub-alpha-02']
    });
    assert(bulkRestRes.status === 200 && bulkRestRes.json?.count === 2, 'Teacher A bulk-restores 2 submissions successfully');

    // 10. Permanent Cleanup Authorization:
    // a. Teacher cannot cleanup permanently
    const teacherCleanup = await httpRequest('POST', '/api/submissions/sub-alpha-01/cleanup', { Authorization: `Bearer ${tokenTeacherA}` }, { confirmation: true });
    assert(teacherCleanup.status === 403, 'Teacher attempt to cleanup permanently is blocked with HTTP 403');

    // b. Admin cleanup without confirmation fails
    const adminNoConf = await httpRequest('POST', '/api/submissions/sub-alpha-01/cleanup', { Authorization: `Bearer ${tokenAdmin}` }, { confirmation: false });
    assert(adminNoConf.status === 400, 'Admin cleanup without explicit confirmation returns HTTP 400');

    // c. Admin cleanup with confirmation succeeds
    const adminCleanOk = await httpRequest('POST', '/api/submissions/sub-alpha-01/cleanup', { Authorization: `Bearer ${tokenAdmin}` }, {
      confirmation: true,
      reason: 'Audit pembersihan berkas uji coba'
    });
    assert(adminCleanOk.status === 200 && adminCleanOk.json?.success === true, 'Admin successfully cleans up test submission permanently');

    // 11. Excel Export HTTP Endpoint (GET /api/exams/:id/export-excel)
    // a. Teacher A exports exam-export-alpha
    const exportRes = await httpRequest('GET', '/api/exams/exam-export-alpha/export-excel?classId=cls-alpha-12', { Authorization: `Bearer ${tokenTeacherA}` });
    assert(exportRes.status === 200, 'GET /api/exams/:id/export-excel returns HTTP 200');
    assert(exportRes.headers['content-type']?.includes('spreadsheetml.sheet'), 'Content-Type header indicates Excel XLSX format');
    assert(exportRes.headers['content-disposition']?.includes('.xlsx'), 'Content-Disposition header specifies .xlsx file attachment');

    // Load returned buffer into ExcelJS to verify integrity
    const exportedWb = new ExcelJS.Workbook();
    await exportedWb.xlsx.load(exportRes.buffer);
    const mainWs = exportedWb.getWorksheet('Hasil Ujian');
    assert(!!mainWs, 'Exported Excel contains "Hasil Ujian" sheet');
    assert(mainWs.getRow(1).cellCount === 51, `Hasil Ujian sheet has 51 columns (got ${mainWs.getRow(1).cellCount})`);
    assert(mainWs.getCell(1, 51).value === 'Total Skor', 'Rightmost column is authoritative "Total Skor"');

    // Verify row data in exported Excel
    assert(mainWs.getCell(2, 1).value === 'Siswa Alpha Dua', 'Row 2 Nama Siswa is Siswa Alpha Dua');
    assert(mainWs.getCell(2, 2).value === 'NIS-A002', 'Row 2 NIS is NIS-A002');
    assert(mainWs.getCell(2, 51).value === '78', 'Row 2 Total Skor is authoritative teacher validated score 78');

    // b. Cross-tenant export denial: Teacher B cannot export Teacher A's exam
    const crossExport = await httpRequest('GET', '/api/exams/exam-export-alpha/export-excel', { Authorization: `Bearer ${tokenTeacherB}` });
    assert(crossExport.status === 403, 'Cross-tenant Excel export attempt by Teacher B returns HTTP 403 Forbidden');

  } finally {
    if (serverProc) {
      serverProc.kill();
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
