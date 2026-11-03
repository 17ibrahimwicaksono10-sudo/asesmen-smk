import { getDb, saveDb } from './db';
import {
  ExamSubmission,
  QuestionItem,
  MultimodalEvidence,
  StudentAnswer,
} from './types';
import {
  evaluateTypedEssayWithDeepSeek,
  evaluateImageWithGeminiVision,
  evaluateAudioWithGeminiSTTAndDeepSeek,
  QuestionEvaluationContext,
  StandardAIEvaluationResult
} from './aiEvaluationRouter';

export interface AIQueueItem {
  submissionId: string;
  forceRetry: boolean;
  enqueuedAt: string;
}

export type ScoreRecalculator = (submission: ExamSubmission, questions: QuestionItem[]) => void;

class AIEvaluationQueueManager {
  private queue: AIQueueItem[] = [];
  private queuedIds = new Set<string>();
  private activeJobs = new Set<string>();
  private isWorkerRunning = false;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private recalculateScoreFn: ScoreRecalculator | null = null;

  // Konfigurasi ketahanan proses
  public readonly MAX_CONCURRENT_JOBS = 2; // Hindari rate limit API berlebihan
  public readonly THROTTLE_DELAY_MS = 400; // Jeda antar pemanggilan API
  public readonly MAX_RETRIES = 3;         // Batas percobaan ulang
  public readonly LOCK_TIMEOUT_MS = 120000; // 2 menit timeout jika container restart di tengah jalan

  public setScoreRecalculator(fn: ScoreRecalculator): void {
    this.recalculateScoreFn = fn;
  }

  /**
   * Status antrean terkini untuk pemantauan sistem
   */
  public getStatus() {
    return {
      queueLength: this.queue.length,
      activeJobsCount: this.activeJobs.size,
      activeSubmissionIds: Array.from(this.activeJobs),
      isWorkerRunning: this.isWorkerRunning,
      maxConcurrentJobs: this.MAX_CONCURRENT_JOBS,
    };
  }

  /**
   * Menambahkan submission ke antrean pemrosesan AI (Idempoten & Non-Blocking)
   */
  public async enqueue(submissionId: string, forceRetry: boolean = false): Promise<boolean> {
    const db = getDb();
    const sub = db.submissions?.find(s => s.id === submissionId);
    if (!sub) {
      console.warn(`[AI Queue] Submission ${submissionId} tidak ditemukan.`);
      return false;
    }

    // 0. Pengabaian Arsip: Submission yang diarsipkan atau soft-deleted tidak boleh diproses AI
    if (sub.isArchived || sub.deletedAt) {
      console.log(`[AI Queue] Submission ${submissionId} (${sub.studentName}) berstatus arsip/soft-deleted. Mengabaikan penambahan antrean AI.`);
      return false;
    }

    // 1. Kebijakan Otoritas Guru: Jangan mengulang jika sudah divalidasi/disetujui guru kecuali guru meminta eksplisit
    if (!forceRetry && (sub.validationStatus === 'approved' || sub.validationStatus === 'revised' || sub.validatedBy)) {
      console.log(`[AI Queue] Submission ${submissionId} (${sub.studentName}) sudah tervalidasi guru. Mengabaikan evaluasi otomatis.`);
      return false;
    }

    // 2. Anti-Duplikasi: Jika sudah selesai dinilai dan bukan forceRetry, abaikan
    if (!forceRetry && sub.aiGradingStatus === 'completed') {
      console.log(`[AI Queue] Submission ${submissionId} sudah selesai dinilai AI. Mengabaikan duplikasi.`);
      return false;
    }

    // 3. Jangan masukkan submission yang saat ini sedang aktif diproses
    if (this.activeJobs.has(submissionId)) {
      console.log(`[AI Queue] Submission ${submissionId} sedang aktif diproses. Mengabaikan panggilan bersamaan.`);
      return false;
    }

    // 4. Jika sudah ada di antrean menunggu, jangan duplikasi
    if (this.queuedIds.has(submissionId) && !forceRetry) {
      return false;
    }

    // 5. Tandai status awal pending secara persisten jika belum processing
    if (sub.aiGradingStatus !== 'processing') {
      sub.aiGradingStatus = 'pending';
      saveDb();
    }

    this.queuedIds.add(submissionId);
    this.queue.push({
      submissionId,
      forceRetry,
      enqueuedAt: new Date().toISOString()
    });

    console.log(`[AI Queue] Enqueued: ${submissionId} (${sub.studentName}). Total antrean: ${this.queue.length}`);
    this.triggerProcessing();
    return true;
  }

  /**
   * Membatalkan pekerjaan antrean untuk submission yang diarsipkan atau dihapus
   */
  public cancelJobsForSubmission(submissionId: string): void {
    this.queuedIds.delete(submissionId);
    this.queue = this.queue.filter(item => item.submissionId !== submissionId);
    console.log(`[AI Queue] Antrean evaluasi AI dibatalkan untuk submission ${submissionId}`);
  }

  /**
   * Pemulihan pekerjaan terhenti akibat restart server atau container Docker
   */
  public async recoverInterruptedJobs(): Promise<number> {
    const db = getDb();
    if (!Array.isArray(db.submissions) || db.submissions.length === 0) {
      return 0;
    }

    let recoveredCount = 0;
    const now = Date.now();

    for (const sub of db.submissions) {
      // 0. Submission yang diarsipkan atau dihapus TIDAK BOLEH diproses AI
      if (sub.isArchived || sub.deletedAt) {
        continue;
      }

      // Guru yang sudah menyetujui TIDAK BOLEH ditimpa
      if (sub.validationStatus === 'approved' || sub.validationStatus === 'revised' || sub.validatedBy) {
        continue;
      }

      // KASUS A: Server restart saat AI sedang memproses (status 'processing' terhenti)
      if (sub.aiGradingStatus === 'processing') {
        const lockedAt = sub.aiGradingLockedAt ? new Date(sub.aiGradingLockedAt).getTime() : 0;
        const isStale = (now - lockedAt) > this.LOCK_TIMEOUT_MS;

        if (isStale || !this.activeJobs.has(sub.id)) {
          console.warn(`[AI Recovery] Mendeteksi submission terhenti pasca-restart: ${sub.id} (${sub.studentName}). Mengembalikan ke antrean.`);
          sub.aiGradingStatus = 'pending';
          sub.aiGradingLockedAt = undefined;
          this.activeJobs.delete(sub.id);
          this.enqueue(sub.id, false);
          recoveredCount++;
        }
      }
      // KASUS B: Submission berstatus 'pending' yang belum sempat dieksekusi
      else if (sub.aiGradingStatus === 'pending') {
        if (!this.queuedIds.has(sub.id) && !this.activeJobs.has(sub.id)) {
          console.log(`[AI Recovery] Menemukan submission pending: ${sub.id}. Menambahkan ke antrean.`);
          this.enqueue(sub.id, false);
          recoveredCount++;
        }
      }
      // KASUS C: Kegagalan sementara yang dijadwalkan untuk retry otomatis
      else if (sub.aiGradingStatus === 'failed' && (sub.aiGradingAttempts || 0) < this.MAX_RETRIES) {
        if (sub.aiGradingNextRetryAt && new Date(sub.aiGradingNextRetryAt).getTime() <= now) {
          console.log(`[AI Recovery] Menjadwalkan retry evaluasi AI untuk ${sub.id} (Percobaan ${(sub.aiGradingAttempts || 0) + 1}/${this.MAX_RETRIES}).`);
          sub.aiGradingStatus = 'pending';
          this.enqueue(sub.id, true);
          recoveredCount++;
        }
      }
    }

    if (recoveredCount > 0) {
      saveDb();
      console.log(`[AI Recovery] Berhasil memulihkan ${recoveredCount} submission ke antrean evaluasi.`);
    }

    return recoveredCount;
  }

  /**
   * Menjalankan antrean dengan batas konkurensi (Concurrency Limiter)
   */
  private triggerProcessing(): void {
    if (this.queue.length === 0) return;
    if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) return;

    const item = this.queue.shift();
    if (!item) return;
    this.queuedIds.delete(item.submissionId);

    this.activeJobs.add(item.submissionId);

    // Proses submission secara terisolasi tanpa memblokir event loop
    this.processSubmission(item.submissionId, item.forceRetry)
      .catch(err => {
        console.error(`[AI Queue] Uncaught error during processing ${item.submissionId}:`, err);
      })
      .finally(() => {
        this.activeJobs.delete(item.submissionId);
        // Beri jeda kecil (throttle) untuk menghindari spike API
        setTimeout(() => {
          this.triggerProcessing();
        }, this.THROTTLE_DELAY_MS);
      });

    // Jika masih ada slot konkurensi, ambil job berikutnya
    if (this.activeJobs.size < this.MAX_CONCURRENT_JOBS && this.queue.length > 0) {
      this.triggerProcessing();
    }
  }

  /**
   * Pemrosesan inti satu submission (Mematuhi Pemisahan 3 Modalitas Model AI)
   */
  public async processSubmission(
    submissionId: string,
    forceRetry: boolean = false
  ): Promise<ExamSubmission | null> {
    const db = getDb();
    const subIdx = db.submissions?.findIndex(s => s.id === submissionId);
    if (subIdx < 0 || !db.submissions) {
      console.warn(`[AI Worker] Submission ${submissionId} tidak ditemukan.`);
      return null;
    }

    const sub = db.submissions[subIdx];

    // Imunitas Submission Diarsipkan / Soft-Deleted
    if (!forceRetry && (sub.isArchived || sub.deletedAt)) {
      console.log(`[AI Worker] Mengabaikan ${submissionId}: Submission berstatus arsip / soft-deleted.`);
      return sub;
    }

    // Imunitas Otoritas Guru
    if (!forceRetry && (sub.validationStatus === 'approved' || sub.validationStatus === 'revised' || sub.validatedBy)) {
      console.log(`[AI Worker] Mengabaikan ${submissionId}: Nilai telah disahkan/direvisi oleh guru.`);
      return sub;
    }

    // Status Persisten: Sedang Diproses
    sub.aiGradingStatus = 'processing';
    sub.aiGradingLockedAt = new Date().toISOString();
    sub.aiGradingLastAttemptAt = new Date().toISOString();
    sub.aiGradingAttempts = (sub.aiGradingAttempts || 0) + 1;
    saveDb();

    console.log(`[AI Worker] Memulai evaluasi ${sub.studentName} (${submissionId}) - Percobaan ${sub.aiGradingAttempts}/${this.MAX_RETRIES}`);

    try {
      const exam = db.exams?.find(e => e.id === sub.examId);
      const pkg = db.packages?.find(p => p.id === exam?.packageId);
      const subQuestions: QuestionItem[] = (Array.isArray(sub.questionSnapshot) && sub.questionSnapshot.length > 0)
        ? sub.questionSnapshot
        : ((Array.isArray(exam?.questionSnapshot) && exam.questionSnapshot.length > 0)
          ? exam.questionSnapshot
          : (pkg?.questions || []));

      const SUBJECTIVE_TYPES = ['essay', 'short_answer', 'essay_subquestions', 'scenario_assessment', 'analisis_kasus'];
      const updatedAnswers: Record<string, StudentAnswer> = { ...(sub.answers || {}) };
      let essayEvaluations: Record<string, any> = {};
      try {
        if (sub.aiEvaluation && sub.aiEvaluation.startsWith('{')) {
          essayEvaluations = JSON.parse(sub.aiEvaluation);
        }
      } catch {}

      let anyServiceFailed = false;
      let lastErrorMessage = '';

      for (const q of subQuestions) {
        if (!SUBJECTIVE_TYPES.includes(q.type)) {
          continue;
        }

        const qAns = updatedAnswers[q.id] || { questionId: q.id };
        const qMax = q.maxScore || q.points || 5;

        const context: QuestionEvaluationContext = {
          questionId: q.id,
          attemptId: sub.id,
          questionText: q.questionText,
          answerKey: q.sampleAnswer || q.correctAnswer || (q.subQuestions ? q.subQuestions.map((sq: any) => `${sq.text || sq.prompt}: ${sq.answerKey}`).join('\n') : ''),
          rubricGuide: q.rubricGuide || 'Penilaian ketepatan konsep kimia analitik, prosedur K3, dan sistematika kerja laboratorium',
          rubricComponents: q.rubricComponents || [
            { name: 'Ketepatan Konsep', maxPoints: Math.ceil(qMax * 0.4), criteria: 'Kesesuaian teori dan prinsip ilmiah' },
            { name: 'Prosedur & K3', maxPoints: Math.ceil(qMax * 0.3), criteria: 'Sistematika kerja dan kepatuhan K3' },
            { name: 'Analisis & Kesimpulan', maxPoints: Math.floor(qMax * 0.3), criteria: 'Ketajaman penalaran data' },
          ],
          maxScore: qMax,
        };

        const evidencesThisQ: MultimodalEvidence[] = [
          ...((qAns.multimodalEvidences || []).filter((e: any) => e.questionId === q.id || !e.questionId)),
          ...((sub.evidences || []).filter((e: any) => e.questionId === q.id))
        ];

        const audioEv = evidencesThisQ.find((e: any) => e.modalityType === 'audio');
        const imageEv = evidencesThisQ.find((e: any) => e.modalityType === 'handwriting' || e.modalityType === 'image' || e.modalityType === 'tulisan_tangan');

        let evalResult: StandardAIEvaluationResult;

        // 1. JALUR REKAMAN MIKROFON: Gemini STT -> DeepSeek Rubric Grading
        if (audioEv) {
          const audioData = audioEv.fileData || audioEv.storagePath || audioEv.storageUrl;
          const mime = audioEv.mimeType || 'audio/webm';
          const existingTranscript = (audioEv.extractedText && !audioEv.extractedText.startsWith('['))
            ? audioEv.extractedText
            : ((qAns.audioTranscript && !qAns.audioTranscript.startsWith('[')) ? qAns.audioTranscript : undefined);

          evalResult = await evaluateAudioWithGeminiSTTAndDeepSeek(context, audioData || '', mime, existingTranscript);
          if (evalResult.transcription_or_extraction && (!audioEv.extractedText || audioEv.extractedText.startsWith('['))) {
            audioEv.extractedText = evalResult.transcription_or_extraction;
            audioEv.extractionStatus = 'completed';
          }
          if (evalResult.transcription_or_extraction) {
            qAns.audioTranscript = evalResult.transcription_or_extraction;
            if (!qAns.essayAnswer) {
              qAns.essayAnswer = evalResult.transcription_or_extraction;
            }
          }
        }
        // 2. JALUR FOTO TULISAN TANGAN: Gemini Vision Multimodal Murni (Penilaian Langsung)
        else if (imageEv) {
          const imgData = imageEv.fileData || imageEv.storagePath || imageEv.storageUrl;
          const mime = imageEv.mimeType || 'image/jpeg';
          evalResult = await evaluateImageWithGeminiVision(context, imgData || '', mime);
          if (evalResult.transcription_or_extraction && (!imageEv.extractedText || imageEv.extractedText.startsWith('['))) {
            imageEv.extractedText = evalResult.transcription_or_extraction;
            imageEv.extractionStatus = 'completed';
          }
          if (evalResult.transcription_or_extraction && !qAns.essayAnswer) {
            qAns.essayAnswer = evalResult.transcription_or_extraction;
          }
        }
        // 3. JALUR JAWABAN KETIKAN SISWA: DeepSeek API Murni
        else {
          let typedText = (qAns.essayAnswer || (qAns as any).answerText || (qAns as any).textAnswer || '').trim();
          if (!qAns.essayAnswer && typedText) {
            qAns.essayAnswer = typedText;
          }
          if (qAns.subQuestionAnswers && Object.keys(qAns.subQuestionAnswers).length > 0) {
            const subText = Object.entries(qAns.subQuestionAnswers).map(([k, v]) => `[Sub ${k}]: ${v}`).join('\n');
            typedText += (typedText ? '\n' : '') + subText;
          }
          if (qAns.shortAnswerText || qAns.shortAnswerCalculation) {
            typedText += (typedText ? '\n' : '') + `[Jawaban]: ${qAns.shortAnswerText || ''} | [Langkah Hitung]: ${qAns.shortAnswerCalculation || ''}`;
          }
          evalResult = await evaluateTypedEssayWithDeepSeek(context, typedText);
        }

        // Deteksi kegagalan layanan AI atau ketiadaan API key
        const isFailedOrOffline = evalResult.assessment_status === 'failed' ||
          evalResult.total_score === undefined ||
          evalResult.scoring_reason?.includes('belum dikonfigurasi') ||
          evalResult.scoring_reason?.includes('Pengecualian') ||
          evalResult.scoring_reason?.includes('HTTP 500') ||
          evalResult.scoring_reason?.includes('HTTP 401') ||
          evalResult.scoring_reason?.includes('HTTP 403');

        if (isFailedOrOffline) {
          anyServiceFailed = true;
          lastErrorMessage = evalResult.scoring_reason || 'Layanan AI offline atau API Key belum terkonfigurasi';
        }

        // Penanganan Nilai Sesuai Ketentuan Keamanan Asesmen:
        // 1. JANGAN menghasilkan nilai perkiraan atau nilai positif buatan, dan jangan vonis nol final.
        // 2. Pertahankan nilai jika sudah dinilai secara sah oleh guru atau siklus sebelumnya.
        // 3. Jika belum dinilai dan AI gagal/offline, tandai komponen sebagai pending/ungraded (score = undefined).
        let finalQScore: number | undefined = undefined;
        // Hanya pertahankan skor numerik lama jika skor tersebut berasal dari validasi guru yang sah
        const isTeacherScore = Boolean(
          qAns.teacherValidated ||
          sub.validationStatus === 'approved' ||
          sub.validationStatus === 'revised' ||
          sub.validatedBy ||
          (qAns as any).teacherScore !== undefined
        );

        if (isTeacherScore && typeof qAns.score === 'number') {
          finalQScore = qAns.score; // Pertahankan skor sah guru
        } else if (!isFailedOrOffline && typeof evalResult.total_score === 'number') {
          finalQScore = Math.min(qMax, Math.max(0, evalResult.total_score));
        } else {
          // AI gagal/offline dan belum ada nilai sah dari guru -> tandai undefined
          finalQScore = undefined;
        }

        qAns.score = finalQScore;
        qAns.maxScore = qMax;
        qAns.isPendingEvaluation = finalQScore === undefined;
        qAns.teacherFeedback = evalResult.feedback || qAns.teacherFeedback;
        qAns.aiRubricScoring = {
          evaluatedAt: evalResult.evaluated_at,
          modelUsed: evalResult.model_used,
          promptVersion: evalResult.prompt_version,
          totalScoreGiven: (finalQScore !== undefined ? finalQScore : (isFailedOrOffline ? undefined : 0)) as any,
          maxTotalScore: evalResult.maximum_score || qMax,
          scoresPerIndicator: isFailedOrOffline ? [] : (evalResult.rubric_scores || []).map(r => ({
            indicatorName: r.indicator,
            maxPoints: r.maxScore,
            scoreGiven: r.score,
            rationale: r.feedback || ''
          })),
          evidenceHighlights: [],
          confidenceStatus: isFailedOrOffline ? 'Ragu / Perlu Review Guru' : (evalResult.requires_teacher_review ? 'Ragu / Perlu Review Guru' : 'Sangat Yakin'),
          confidenceLevel: isFailedOrOffline ? 'low' : (evalResult.requires_teacher_review ? 'low' : 'high'),
          uncertaintyReason: evalResult.scoring_reason,
          requiresTeacherReview: true,
          constructiveFeedback: evalResult.feedback,
          keyMasteredConcepts: [],
          areasForImprovement: []
        };

        essayEvaluations[q.id] = {
          score: finalQScore !== undefined ? finalQScore : null,
          maxScore: qMax,
          feedback: evalResult.feedback,
          reason: evalResult.scoring_reason,
          modelUsed: evalResult.model_used,
          requiresTeacherReview: true,
          status: isFailedOrOffline ? 'perlu_review_guru' : evalResult.assessment_status,
          isPendingEvaluation: finalQScore === undefined
        };

        updatedAnswers[q.id] = qAns;
      }

      // Pengamanan Otoritas Guru terhadap Late-Completion:
      // Re-cek database: Jika guru telah menyetujui atau merevisi nilai saat AI sedang berjalan di latar belakang,
      // JANGAN timpa skor guru atau status validasi guru!
      const currentSub = db.submissions?.find(s => s.id === submissionId);
      if (currentSub && (currentSub.validationStatus === 'approved' || currentSub.validationStatus === 'revised' || currentSub.validatedBy)) {
        console.warn(`[AI Worker] Nilai ${submissionId} (${sub.studentName}) telah disahkan/direvisi oleh guru selama AI berjalan. Mempertahankan skor guru.`);
        currentSub.aiEvaluation = JSON.stringify(essayEvaluations);
        currentSub.aiGradedAt = new Date().toISOString();
        currentSub.aiGradingLockedAt = undefined;
        currentSub.aiGradingStatus = anyServiceFailed ? 'failed' : 'completed';
        saveDb();
        return currentSub;
      }

      sub.answers = updatedAnswers;

      // Hitung ulang skor total menggunakan kalkulator standar server
      if (this.recalculateScoreFn && subQuestions && subQuestions.length > 0) {
        this.recalculateScoreFn(sub, subQuestions);
      }
      sub.originalAIScoreTotal = sub.totalScore;
      sub.teacherScoreTotal = sub.totalScore;
      sub.aiEvaluation = JSON.stringify(essayEvaluations);
      sub.aiGradedAt = new Date().toISOString();
      sub.aiGradingLockedAt = undefined;

      if (anyServiceFailed) {
        sub.aiGradingError = lastErrorMessage;
        const currentAttempts = sub.aiGradingAttempts || 1;

        if (currentAttempts < this.MAX_RETRIES && !forceRetry) {
          // Jadwalkan retry eksponensial (10 detik, 25 detik)
          const delayMs = Math.min(60000, 10000 * Math.pow(2.5, currentAttempts - 1));
          sub.aiGradingNextRetryAt = new Date(Date.now() + delayMs).toISOString();
          sub.aiGradingStatus = 'pending';
          console.log(`[AI Worker] Evaluasi ${submissionId} tertunda sementara. Menjadwalkan retry #${currentAttempts + 1} dalam ${Math.round(delayMs / 1000)} detik.`);

          setTimeout(() => {
            this.enqueue(submissionId, true);
          }, delayMs);
        } else {
          // Batas maksimum retry tercapai atau evaluasi paksa gagal
          sub.aiGradingStatus = 'failed';
          sub.requiresTeacherReview = true;
          sub.hasPendingComponents = true;
          sub.isScoreFinal = false;
          sub.status = 'perlu_pemeriksaan';
          sub.validationStatus = 'pending_review';
          sub.teacherFollowUp = 'Penilaian otomatis AI belum berhasil (layanan API belum terpasang atau mengalami kendala). Jawaban siswa tersimpan utuh tanpa nilai buatan dan menunggu penilaian langsung oleh Guru Penguji.';
          console.warn(`[AI Worker] Submission ${submissionId} gagal dinilai setelah ${currentAttempts} percobaan. Menyerahkan ke guru.`);
        }
      } else {
        // Berhasil Dinilai Penuh
        sub.aiGradingStatus = 'completed';
        sub.aiGradingError = undefined;
        sub.aiGradingNextRetryAt = undefined;
        sub.hasPendingComponents = false;

        if (!sub.validatedBy && sub.validationStatus !== 'approved' && sub.validationStatus !== 'revised') {
          sub.requiresTeacherReview = true;
          sub.status = 'perlu_pemeriksaan';
          sub.validationStatus = 'pending_review';
          sub.isScoreFinal = false; // Nilai belum final sebelum disahkan guru!
        }
        sub.teacherFollowUp = 'Penilaian otomatis AI telah selesai sesuai rubrik. Menunggu validasi atau revisi nilai oleh guru penguji.';
        console.log(`[AI Worker] ✅ Evaluasi AI SUKSES untuk ${sub.studentName} (${sub.id}). Skor Total: ${sub.totalScore}/100`);
      }

      saveDb();
      return sub;
    } catch (err: any) {
      console.error(`[AI Worker] Fatal error processing ${submissionId}:`, err);
      sub.aiGradingStatus = 'failed';
      sub.aiGradingError = err.message;
      sub.aiGradingLockedAt = undefined;
      sub.requiresTeacherReview = true;
      sub.status = 'perlu_pemeriksaan';
      sub.validationStatus = 'pending_review';
      saveDb();
      return sub;
    }
  }

  /**
   * Menjalankan daemon worker dan background periodic recovery loop
   */
  public startWorker(): void {
    if (this.isWorkerRunning) return;
    this.isWorkerRunning = true;
    console.log('[AI Queue] AI Evaluation Worker daemon aktif dengan batas konkurensi:', this.MAX_CONCURRENT_JOBS);

    // 1. Pulihkan antrean yang tertunda pasca-start
    this.recoverInterruptedJobs();

    // 2. Loop berkala setiap 30 detik untuk mendeteksi job macet atau retry terjadwal
    this.recoveryInterval = setInterval(() => {
      this.recoverInterruptedJobs().catch(err => {
        console.warn('[AI Queue] Error in recovery loop:', err.message);
      });
    }, 30000);
  }

  /**
   * Menghentikan daemon worker saat graceful shutdown
   */
  public stopWorker(): void {
    this.isWorkerRunning = false;
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    console.log('[AI Queue] AI Evaluation Worker daemon dihentikan.');
  }
}

export const aiQueueManager = new AIEvaluationQueueManager();
