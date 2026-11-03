/**
 * EmployaSkills - Excel Export Service
 * File: backend/src/services/excelExportService.ts
 *
 * Mengonstruksi workbook Excel (.xlsx) profesional untuk hasil ujian per kelas:
 * - Format sheet utama "Hasil Ujian":
 *   A: Nama Siswa, B: NIS, dilanjutkan C: Jawaban Soal 1, D: Feedback Soal 1,
 *   E: Jawaban Soal 2, F: Feedback Soal 2, ... dinamis sampai soal N,
 *   dan kolom PALING KANAN wajib bernama "Total Skor".
 * - Penanganan seluruh tipe butir soal (MCQ, PGK, matching, esai, gambar, audio).
 * - Proteksi keamanan: Excel Formula Injection Sanitization.
 * - Sheet Informasi (metadata ujian & filter) dan Sheet Skor Per Butir (audit).
 */

import ExcelJS from 'exceljs';
import { Exam, ExamSubmission, QuestionItem, StudentAnswer, MultimodalEvidence } from '../types';

export interface ExcelExportOptions {
  exam: Exam;
  questions: QuestionItem[];
  submissions: ExamSubmission[];
  className?: string;
  schoolName?: string;
  teacherName?: string;
  includeArchived?: boolean;
  attemptsMode?: 'latest' | 'all';
}

/**
 * Sanitasi nilai teks untuk mencegah CSV/Excel Formula Injection.
 * Jika string diawali dengan karakter =, +, -, atau @, tambahkan tanda petik tunggal (') di awal.
 */
export function sanitizeExcelFormula(value: any): any {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[=+\-@]/.test(trimmed)) {
      return `'${value}`;
    }
    return value;
  }
  return value;
}

/**
 * Ekstraksi teks jawaban siswa berdasarkan tipe butir soal.
 */
export function formatStudentAnswerText(ans?: StudentAnswer, question?: QuestionItem): string {
  if (!ans) return 'Tidak dijawab';

  // 1. Regular Multiple Choice (Typed field atau generic answer)
  const mcqChoice = ans.selectedOption ?? (typeof ans.answer === 'string' && (question?.type === 'multiple_choice' || question?.options) ? ans.answer : undefined);
  if (mcqChoice !== undefined && mcqChoice !== null && String(mcqChoice).trim() !== '') {
    const choiceStr = String(mcqChoice).trim();
    if (question?.options && Array.isArray(question.options)) {
      const matchedOpt = question.options.find(o => o.id === choiceStr || o.text === choiceStr);
      if (matchedOpt) {
        return matchedOpt.text ? `${matchedOpt.id ? matchedOpt.id + '. ' : ''}${matchedOpt.text}` : choiceStr;
      }
    }
    return choiceStr;
  }

  // 2. Complex MCQ (Pilihan Ganda Kompleks - Checkboxes)
  const pgkChoices = Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0
    ? ans.selectedOptions
    : (Array.isArray(ans.answer) ? ans.answer : undefined);
  if (pgkChoices && pgkChoices.length > 0) {
    if (question?.options && Array.isArray(question.options)) {
      const labels = pgkChoices.map(optId => {
        const found = question.options?.find(o => o.id === optId || o.text === optId);
        return found ? (found.text || optId) : optId;
      });
      return labels.join(', ');
    }
    return pgkChoices.join(', ');
  }

  // 3. Matching (Menjodohkan)
  const matchObj = ans.matchingAnswers || (typeof ans.answer === 'object' && ans.answer !== null && !Array.isArray(ans.answer) && question?.type === 'matrix_matching' ? ans.answer : undefined);
  if (matchObj && Object.keys(matchObj).length > 0) {
    const parts = Object.entries(matchObj).map(([colA, colB]) => `${colA} -> ${colB}`);
    return parts.join('; ');
  }

  // 4. Complex Answers (Statements / Benar-Salah / Matriks)
  if (ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0) {
    const parts = Object.entries(ans.complexAnswers).map(([k, v]) => `${k}: ${v}`);
    return parts.join('; ');
  }

  // 5. Bukti Multimodal (Gambar / Tulisan Tangan / Audio)
  if (Array.isArray(ans.multimodalEvidences) && ans.multimodalEvidences.length > 0) {
    const evParts = ans.multimodalEvidences.map(ev => {
      const isAudio = ev.modalityType === 'audio';
      const isImage = ev.modalityType === 'image' || ev.modalityType === 'handwriting';
      const typeLabel = isAudio ? 'Audio / Transkripsi Suara (STT)' : (isImage ? 'Gambar / Tulisan Tangan' : 'Bukti');
      const safePath = ev.storageUrl || ev.storagePath || ev.fileName || 'berkas_tersimpan';
      const detectedText = ev.extractedText || ans.extractedText;
      const textPart = detectedText ? ` | Teks: "${detectedText}"` : '';
      return `[${typeLabel}: ${safePath}${textPart}]`;
    });

    if (ans.audioTranscript) {
      evParts.push(`[Transkrip STT: ${ans.audioTranscript}]`);
    }

    return evParts.join('\n');
  }

  // 6. Esai Tertulis (Typed field atau generic string answer)
  const essayText = ans.essayAnswer ?? (typeof ans.answer === 'string' ? ans.answer : undefined);
  if (essayText !== undefined && essayText !== null && String(essayText).trim() !== '') {
    return String(essayText);
  }

  // 7. Jawaban Singkat / Hitungan
  if (ans.shortAnswerText && ans.shortAnswerText.trim() !== '') {
    const calc = ans.shortAnswerCalculation ? ` [Perhitungan: ${ans.shortAnswerCalculation}]` : '';
    return `${ans.shortAnswerText}${calc}`;
  }

  // 8. Transkrip Audio saja
  if (ans.audioTranscript && ans.audioTranscript.trim() !== '') {
    return `[Transkrip Audio]: ${ans.audioTranscript}`;
  }

  // 9. Sub-Questions
  if (ans.subQuestionAnswers && Object.keys(ans.subQuestionAnswers).length > 0) {
    return Object.entries(ans.subQuestionAnswers).map(([k, v]) => `${k}: ${v}`).join('; ');
  }

  return 'Tidak dijawab';
}

/**
 * Ekstraksi feedback penskoran untuk satu butir soal.
 * Memprioritaskan feedback revisi guru, lalu feedback AI / rubrik, lalu evaluasi objektif.
 */
export function formatQuestionFeedback(ans?: StudentAnswer, question?: QuestionItem): string {
  if (!ans) return 'Menunggu penilaian';

  const hasNoAnswer = (!ans.answer && ans.answer !== 0) &&
    !ans.selectedOption &&
    (!ans.selectedOptions || ans.selectedOptions.length === 0) &&
    !ans.essayAnswer &&
    !ans.shortAnswerText &&
    (!ans.multimodalEvidences || ans.multimodalEvidences.length === 0) &&
    ans.score === undefined;

  if (hasNoAnswer) {
    return 'Tidak ada jawaban / Belum dinilai';
  }

  const feedbackParts: string[] = [];

  // 1. Catatan & Feedback Revisi Guru Manusia
  if (ans.teacherFeedback && ans.teacherFeedback.trim() !== '') {
    feedbackParts.push(ans.teacherFeedback.trim());
  }

  // 2. Evaluasi AI (aiEvaluation atau aiRubricScoring)
  if (ans.aiEvaluation && typeof ans.aiEvaluation === 'object') {
    const rationale = ans.aiEvaluation.rationale || ans.aiEvaluation.reason;
    if (rationale) {
      feedbackParts.push(`Evaluasi AI: ${rationale}${ans.aiEvaluation.score !== undefined ? ` (Skor AI: ${ans.aiEvaluation.score})` : ''}`);
    }
  } else if (ans.aiRubricScoring) {
    const r = ans.aiRubricScoring;
    const feedbackText = r.constructiveFeedback || '';
    const scoreText = (r.totalScoreGiven !== undefined && r.maxTotalScore !== undefined)
      ? `Skor: ${r.totalScoreGiven}/${r.maxTotalScore}`
      : '';
    const reviewNote = r.requiresTeacherReview ? ' [Perlu Tinjauan Guru]' : '';
    if (feedbackText) {
      feedbackParts.push(`${feedbackText}${scoreText ? ` (${scoreText}${reviewNote})` : ''}`);
    }
  }

  if (feedbackParts.length > 0) {
    return feedbackParts.join(' | ');
  }

  // 3. Status Pending jika komponen belum dinilai
  if (ans.isPendingEvaluation) {
    return 'Menunggu penilaian guru / AI';
  }

  // 4. Evaluasi Objektif untuk Pilihan Ganda (Benar / Salah)
  if (ans.isCorrect === true || (ans.score !== undefined && ans.maxScore !== undefined && ans.score === ans.maxScore && ans.score > 0)) {
    return ans.maxScore !== undefined ? `Pilihan Tepat (${ans.score}/${ans.maxScore})` : 'Pilihan Tepat';
  }
  if (ans.isCorrect === false) {
    return ans.maxScore !== undefined ? `Pilihan Kurang Tepat (${ans.score ?? 0}/${ans.maxScore})` : 'Pilihan Kurang Tepat';
  }

  // 5. Feedback untuk Pilihan Ganda Kompleks
  if ((Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0) || (Array.isArray(ans.answer) && ans.answer.length > 0)) {
    if (ans.score !== undefined && ans.maxScore !== undefined) {
      if (ans.score === ans.maxScore) return `Benar Penuh (${ans.score}/${ans.maxScore})`;
      if (ans.score > 0) return `Benar Sebagian (${ans.score}/${ans.maxScore})`;
      return `Salah (${ans.score}/${ans.maxScore})`;
    }
  }

  // 6. Feedback Matching / Matriks
  if ((ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) || (typeof ans.answer === 'object' && ans.answer !== null)) {
    if (ans.score !== undefined && ans.maxScore !== undefined) {
      return `Evaluasi Cocok (${ans.score}/${ans.maxScore} poin)`;
    }
  }

  // 7. Jika ada nilai mentah tersimpan
  if (ans.score !== undefined) {
    return ans.maxScore !== undefined ? `Nilai: ${ans.score}/${ans.maxScore}` : `Nilai: ${ans.score}`;
  }

  return 'Tidak ada jawaban / Belum dinilai';
}

/**
 * Format total skor otoritatif dari database.
 */
export function formatAuthoritativeTotalScore(sub: ExamSubmission): { scoreValue: number; displayString: string; isFinal: boolean } {
  // Prioritaskan nilai final guru jika telah divalidasi
  const authoritativeScore = (sub.isTeacherValidated && sub.teacherScoreTotal !== undefined && sub.teacherScoreTotal !== null)
    ? Number(sub.teacherScoreTotal)
    : Number(sub.totalScore ?? 0);

  const isFinal = Boolean(sub.isScoreFinal) || sub.validationStatus === 'approved' || sub.validationStatus === 'revised';
  const displayString = isFinal
    ? `${authoritativeScore}`
    : `${authoritativeScore} (Belum Final)`;

  return {
    scoreValue: authoritativeScore,
    displayString,
    isFinal
  };
}

/**
 * Generate Workbook Excel profesional.
 */
export async function generateExamResultsExcelWorkbook(options: ExcelExportOptions): Promise<{ workbook: ExcelJS.Workbook; filename: string }> {
  const {
    exam,
    questions,
    submissions,
    className = exam.className || 'Semua_Kelas',
    schoolName = exam.schoolName || 'SMK_EmployaSkills',
    teacherName = exam.teacherName || 'Guru_Pengampu',
    includeArchived = false,
    attemptsMode = 'latest'
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Asesmen EmployaSkills';
  workbook.lastModifiedBy = teacherName;
  workbook.created = new Date();
  workbook.modified = new Date();

  // ---------------------------------------------------------------------------
  // FILTER & SELEKSI DATA SUBMISSION
  // ---------------------------------------------------------------------------
  let targetSubmissions = [...submissions];

  // 1. Filter Arsip
  if (!includeArchived) {
    targetSubmissions = targetSubmissions.filter(s => !s.isArchived && !s.deletedAt);
  }

  // 2. Filter Attempt
  if (attemptsMode === 'latest') {
    // Ambil percobaan terbaru per siswa
    const studentMap = new Map<string, ExamSubmission>();
    for (const sub of targetSubmissions) {
      const studentKey = sub.studentId || sub.studentNis || sub.studentName;
      const existing = studentMap.get(studentKey);
      if (!existing) {
        studentMap.set(studentKey, sub);
      } else {
        const subAttempt = sub.attemptNumber || 1;
        const existAttempt = existing.attemptNumber || 1;
        if (subAttempt > existAttempt) {
          studentMap.set(studentKey, sub);
        } else if (subAttempt === existAttempt) {
          const subTime = new Date(sub.submitTime || 0).getTime();
          const existTime = new Date(existing.submitTime || 0).getTime();
          if (subTime > existTime) {
            studentMap.set(studentKey, sub);
          }
        }
      }
    }
    targetSubmissions = Array.from(studentMap.values());
  }

  // Urutkan berdasarkan Nama Siswa
  targetSubmissions.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

  // ===========================================================================
  // SHEET 1: HASIL UJIAN (SHEET UTAMA)
  // Format: Nama Siswa | NIS | Jawaban Soal 1 | Feedback Soal 1 | ... | Total Skor
  // ===========================================================================
  const mainSheet = workbook.addWorksheet('Hasil Ujian', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  // Tentukan header kolom
  const headers: string[] = ['Nama Siswa', 'NIS'];
  const columnsConfig: Array<{ header: string; key: string; width: number }> = [
    { header: 'Nama Siswa', key: 'student_name', width: 28 },
    { header: 'NIS', key: 'student_nis', width: 16 }
  ];

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    headers.push(`Jawaban Soal ${qNum}`);
    headers.push(`Feedback Soal ${qNum}`);

    columnsConfig.push({
      header: `Jawaban Soal ${qNum}`,
      key: `jawaban_soal_${qNum}`,
      width: 38
    });
    columnsConfig.push({
      header: `Feedback Soal ${qNum}`,
      key: `feedback_soal_${qNum}`,
      width: 38
    });
  });

  // Kolom paling kanan WAJIB bernama "Total Skor"
  headers.push('Total Skor');
  columnsConfig.push({
    header: 'Total Skor',
    key: 'total_skor',
    width: 18
  });

  mainSheet.columns = columnsConfig;

  // Baris Header
  const headerRow = mainSheet.getRow(1);
  headerRow.height = 30;

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' } // Navy blue profesional
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber <= 2 || colNumber === columnsConfig.length ? 'center' : 'left',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };
  });

  // Isi baris data
  targetSubmissions.forEach((sub, sIdx) => {
    const rowValues: any[] = [
      sanitizeExcelFormula(sub.studentName || 'Tanpa Nama'),
      sanitizeExcelFormula(sub.studentNis || '-')
    ];

    questions.forEach((q) => {
      const ansObj = sub.answers ? (sub.answers[q.id] || sub.answers[q.code]) : undefined;
      const rawAns = formatStudentAnswerText(ansObj, q);
      const rawFeedback = formatQuestionFeedback(ansObj, q);

      rowValues.push(sanitizeExcelFormula(rawAns));
      rowValues.push(sanitizeExcelFormula(rawFeedback));
    });

    const scoreInfo = formatAuthoritativeTotalScore(sub);
    rowValues.push(sanitizeExcelFormula(scoreInfo.displayString));

    const dataRow = mainSheet.addRow(rowValues);
    dataRow.height = 45; // Beri ruang yang nyaman untuk teks multiline/esai

    // Zebra striping untuk kemudahan membaca baris
    const isEven = sIdx % 2 === 0;
    const bgArgb = isEven ? 'F8FAFC' : 'FFFFFF';

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: '1E293B' }
      };
      cell.alignment = {
        vertical: 'top',
        horizontal: colNumber === 2 ? 'center' : (colNumber === columnsConfig.length ? 'right' : 'left'),
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };

      // Styling khusus kolom Total Skor
      if (colNumber === columnsConfig.length) {
        cell.font = {
          name: 'Calibri',
          size: 11,
          bold: true,
          color: { argb: scoreInfo.isFinal ? '047857' : 'B45309' } // Hijau jika final, Amber jika belum
        };
      }
    });
  });

  // Freeze identity columns (A & B) and header row
  mainSheet.views = [
    { state: 'frozen', xSplit: 2, ySplit: 1, topLeftCell: 'C2', activeCell: 'A2' }
  ];

  // Auto-filter di baris 1
  mainSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnsConfig.length }
  };

  // ===========================================================================
  // SHEET 2: INFORMASI & METADATA UJIAN
  // ===========================================================================
  const infoSheet = workbook.addWorksheet('Informasi');
  infoSheet.columns = [
    { header: 'Parameter', key: 'param', width: 28 },
    { header: 'Keterangan', key: 'value', width: 55 }
  ];

  const infoRow = infoSheet.getRow(1);
  infoRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  infoRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };

  const infoData = [
    ['Judul Ujian', exam.title || '-'],
    ['Paket Soal', exam.packageTitle || '-'],
    ['Kategori Asesmen', exam.category === 'teknis_kimia' ? 'Teknis Kimia Industri' : 'Employability Skills'],
    ['Target Nilai (KKM)', exam.targetScore ? String(exam.targetScore) : '75'],
    ['Durasi Ujian', `${exam.durationMinutes || 60} Menit`],
    ['Jumlah Butir Soal', `${questions.length} Soal`],
    ['Nama Sekolah', schoolName],
    ['Kelas', className],
    ['Guru Pengampu', teacherName],
    ['Tanggal Ekspor', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'],
    ['Total Berkas Diekspor', `${targetSubmissions.length} Siswa / Berkas`],
    ['Status Filter Arsip', includeArchived ? 'Termasuk Arsip' : 'Hanya Submission Aktif (Default)'],
    ['Pilihan Percobaan', attemptsMode === 'latest' ? 'Percobaan Terbaru Saja (Default)' : 'Seluruh Percobaan (Multi-Attempt)']
  ];

  infoData.forEach(([param, val]) => {
    const row = infoSheet.addRow([sanitizeExcelFormula(param), sanitizeExcelFormula(val)]);
    row.getCell(1).font = { bold: true, color: { argb: '1E293B' } };
    row.getCell(2).font = { color: { argb: '334155' } };
  });

  // ===========================================================================
  // SHEET 3: SKOR PER BUTIR (AUDIT PENILAIAN INDIVIDUAL)
  // ===========================================================================
  const auditSheet = workbook.addWorksheet('Skor Per Butir');
  const auditColumns: Array<{ header: string; key: string; width: number }> = [
    { header: 'Nama Siswa', key: 'name', width: 26 },
    { header: 'NIS', key: 'nis', width: 16 }
  ];

  questions.forEach((q, idx) => {
    auditColumns.push({
      header: `S${idx + 1} (${q.type})`,
      key: `s_${idx + 1}`,
      width: 14
    });
  });

  auditColumns.push({ header: 'Total Skor Akhir', key: 'final_score', width: 18 });
  auditSheet.columns = auditColumns;

  const auditHeader = auditSheet.getRow(1);
  auditHeader.height = 25;
  auditHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  targetSubmissions.forEach(sub => {
    const rowVals: any[] = [
      sanitizeExcelFormula(sub.studentName || 'Tanpa Nama'),
      sanitizeExcelFormula(sub.studentNis || '-')
    ];

    questions.forEach(q => {
      const ansObj = sub.answers ? (sub.answers[q.id] || sub.answers[q.code]) : undefined;
      const pts = ansObj && ansObj.score !== undefined ? ansObj.score : (ansObj?.isPendingEvaluation ? 'Pending' : 0);
      rowVals.push(sanitizeExcelFormula(pts));
    });

    const finalScoreInfo = formatAuthoritativeTotalScore(sub);
    rowVals.push(sanitizeExcelFormula(finalScoreInfo.displayString));
    auditSheet.addRow(rowVals);
  });

  // Format Nama File yang Aman
  const sanitizedClass = (className || 'Semua_Kelas').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const sanitizedExam = (exam.title || 'Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Hasil_Ujian_${sanitizedClass}_${sanitizedExam}.xlsx`;

  return { workbook, filename };
}
