import React, { useState } from 'react';
import { ExamSubmission, QuestionPackage, AIRubricScoreResult, MultimodalEvidence } from '../../types';
import { NON_TEST_QUESTIONS_18 } from '../../data/nonTestInstrument';
import { REVISED_QUESTIONS_24 } from '../../data/revisedQuestions';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Volume2,
  Image as ImageIcon,
  ShieldAlert,
  Award,
  CheckSquare,
  Edit3,
  Save,
  Info,
  Clock,
  User,
  Zap,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Download,
  Database,
  Hash,
  BookOpen
} from 'lucide-react';

interface MultimodalReviewModalProps {
  submission: ExamSubmission;
  packageObj?: QuestionPackage;
  onClose: () => void;
  onUpdateSubmission?: (updated: ExamSubmission) => void;
}

export const MultimodalReviewModal: React.FC<MultimodalReviewModalProps> = ({
  submission,
  packageObj,
  onClose,
  onUpdateSubmission
}) => {
  const getQuestionItem = (qId: string) => {
    return submission.questionSnapshot?.find((q) => q.id === qId)
      || packageObj?.questions.find((q) => q.id === qId)
      || NON_TEST_QUESTIONS_18.find((q) => q.id === qId)
      || REVISED_QUESTIONS_24.find((q) => q.id === qId);
  };

  const sortedAnswerEntries = Object.entries(submission.answers || {}).sort(([aId], [bId]) => {
    const qA = getQuestionItem(aId);
    const qB = getQuestionItem(bId);
    const numA = qA?.number ?? parseInt(aId.replace(/\D/g, ''), 10) ?? 0;
    const numB = qB?.number ?? parseInt(bId.replace(/\D/g, ''), 10) ?? 0;
    return numA - numB;
  });

  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    sortedAnswerEntries[0]?.[0] || Object.keys(submission.answers || {})[0] || ''
  );
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [editReason, setEditReason] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'revise' | 'return'>('approve');
  const [isSaving, setIsSaving] = useState(false);
  const [showReasonError, setShowReasonError] = useState(false);
  const [isProcessingEvidenceAI, setIsProcessingEvidenceAI] = useState(false);

  // Parse overall AI Evaluation JSON if available
  let parsedAIEvals: Record<string, AIRubricScoreResult> = {};
  if (submission.aiScoringSummary) {
    parsedAIEvals = submission.aiScoringSummary;
  } else if (submission.aiEvaluation) {
    try {
      parsedAIEvals = JSON.parse(submission.aiEvaluation);
    } catch (e) {
      console.warn('Failed parsing aiEvaluation JSON string:', e);
    }
  }

  const selectedAnswer = submission.answers[selectedQuestionId];
  const questionObj = getQuestionItem(selectedQuestionId);
  const aiScoreResult: AIRubricScoreResult | undefined =
    selectedAnswer?.aiRubricScoring || parsedAIEvals[selectedQuestionId];

  // Get evidences attached to this answer or submission
  const answerEvidences: MultimodalEvidence[] =
    selectedAnswer?.multimodalEvidences ||
    (submission.evidences || []).filter((e) => e.questionId === selectedQuestionId);

  // Pemicu Penilaian AI & Ekstraksi Bukti Multimodal oleh Guru
  const handleEvaluateQuestionAI = async () => {
    if (!selectedQuestionId || !selectedAnswer || !onUpdateSubmission) return;
    setIsProcessingEvidenceAI(true);

    try {
      // 1. Ekstrak bukti-bukti yang belum diekstrak
      const updatedEvidences: MultimodalEvidence[] = [];
      for (const ev of answerEvidences) {
        if (!ev.extractedText || ev.extractionStatus === 'saved') {
          try {
            const resp = await fetch('/api/ai/process-multimodal-evidence', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                evidenceId: ev.id,
                modalityType: ev.modalityType,
                fileName: ev.fileName,
                fileData: ev.fileData,
                questionId: ev.questionId,
                studentNis: ev.studentNis,
                studentName: ev.studentName,
                uploadTime: ev.uploadTime,
                saveOnly: false // Jalankan ekstraksi AI STT/OCR
              })
            });
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.success && resData.evidence) {
                updatedEvidences.push(resData.evidence);
                continue;
              }
            }
          } catch (e) {
            console.warn('Gagal ekstraksi bukti multimodal:', e);
          }
        }
        updatedEvidences.push(ev);
      }

      // 2. Evaluasi Rubrik Multimodal via AI
      const evalResp = await fetch('/api/ai/evaluate-rubric-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questionObj?.questionText || 'Pertanyaan esai vokasi',
          sampleAnswer: questionObj?.sampleAnswer || 'Sesuai prosedur standar operasional',
          rubricGuide: questionObj?.rubricGuide || 'Penilaian pemahaman dan bukti',
          rubricComponents: questionObj?.rubricComponents || [],
          studentTextAnswer: selectedAnswer.essayAnswer || '',
          multimodalEvidences: updatedEvidences
        })
      });

      if (evalResp.ok) {
        const evalData = await evalResp.json();
        if (evalData.success && evalData.rubricScore) {
          const scoreRes: AIRubricScoreResult = evalData.rubricScore;
          const assignedScore = typeof scoreRes.totalScoreGiven === 'number'
            ? scoreRes.totalScoreGiven
            : (typeof selectedAnswer.score === 'number' ? selectedAnswer.score : undefined);

          // Update answer di submission
          const updatedAnswers = {
            ...submission.answers,
            [selectedQuestionId]: {
              ...selectedAnswer,
              score: assignedScore,
              isPendingEvaluation: assignedScore === undefined,
              aiRubricScoring: scoreRes,
              teacherFeedback: scoreRes.constructiveFeedback,
              multimodalEvidences: updatedEvidences
            }
          };

          const updatedSub: ExamSubmission = {
            ...submission,
            answers: updatedAnswers
          };

          onUpdateSubmission(updatedSub);
          setEditingScores((prev) => ({
            ...prev,
            [selectedQuestionId]: assignedScore
          }));
        }
      }
    } catch (err) {
      console.error('Error saat evaluasi multimodal AI:', err);
    } finally {
      setIsProcessingEvidenceAI(false);
    }
  };

  const handleScoreChange = (qId: string, val: number) => {
    setEditingScores((prev) => ({
      ...prev,
      [qId]: val
    }));
    setSelectedAction('revise');
  };

  // Handler for Tahap 6 Human-in-the-loop Validation Action
  const handleExecuteValidationAction = (action: 'approve' | 'revise' | 'return') => {
    if (!onUpdateSubmission) return;

    // Enforce mandatory reason for score modification or return action
    if (action === 'revise' && !editReason.trim()) {
      setShowReasonError(true);
      return;
    }
    setShowReasonError(false);
    setIsSaving(true);

    const updatedAnswers = { ...submission.answers };
    let newTotal = 0;
    let originalAITotal = submission.originalAIScoreTotal || submission.totalScore;

    const newLogs = [...(submission.teacherEditLogs || [])];
    const timestamp = new Date().toLocaleString('id-ID');
    const teacherName = 'Dra. Endang Susilowati, M.Pd. (Guru Evaluator)';

    Object.keys(updatedAnswers).forEach((qId) => {
      const currentAns = updatedAnswers[qId];
      const hasEditedThisQuestion = editingScores[qId] !== undefined;
      const aiScore = currentAns.score || 0;
      const overrideScore = hasEditedThisQuestion ? editingScores[qId] : aiScore;

      updatedAnswers[qId] = {
        ...currentAns,
        score: overrideScore
      };

      newTotal += overrideScore;

      // Add log if score was modified
      if (hasEditedThisQuestion && overrideScore !== aiScore) {
        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          submissionId: submission.id,
          examId: submission.examId,
          questionId: qId,
          studentNis: submission.studentNis,
          studentName: submission.studentName,
          originalAIScore: aiScore,
          finalTeacherScore: overrideScore,
          teacherId: 'usr-guru-001',
          teacherName,
          timestamp,
          actionTaken: action,
          reason: editReason.trim() || 'Penyesuaian nilai berdasarkan review hasil ekstraksi bukti.'
        });
      }
    });

    const isEmployability =
      submission.examTitle?.toLowerCase().includes('employa') ||
      submission.examTitle?.toLowerCase().includes('non-tes') ||
      packageObj?.category === 'employability' ||
      packageObj?.id === 'pkg-employability-18' ||
      Object.keys(submission.answers || {}).some(k => k.startsWith('nt-') || k.startsWith('q-nt-'));

    const rawTotal = newTotal;
    const maxPossibleScore = packageObj?.questions?.reduce((acc, q) => acc + (q.points || q.maxScore || 1), 0)
      || (submission.questionSnapshot?.reduce((acc: number, q: any) => acc + (q.points || q.maxScore || 1), 0))
      || (isEmployability ? 90 : 65);

    const finalScore = maxPossibleScore > 0 ? Math.round((rawTotal / maxPossibleScore) * 100) : 0;

    const updatedSubmission: ExamSubmission = {
      ...submission,
      answers: updatedAnswers,
      originalAIScoreTotal: originalAITotal,
      teacherScoreTotal: rawTotal,
      totalScore: finalScore,
      technicalScore: isEmployability ? 0 : finalScore,
      employabilityScore: isEmployability ? finalScore : 0,
      rawScoreTotal: rawTotal,
      maxRawScore: maxPossibleScore,
      status: action === 'return' ? 'perlu_pemeriksaan' : 'dinilai',
      validationStatus: action === 'approve' ? 'approved' : action === 'revise' ? 'revised' : 'returned',
      validatedBy: teacherName,
      validatedAt: timestamp,
      requiresTeacherReview: action === 'return',
      hasPendingComponents: action === 'return',
      isScoreFinal: action !== 'return',
      teacherFollowUp:
        action === 'approve'
          ? 'Hasil evaluasi AI disetujui 100% oleh Guru Evaluator tanpa revisi.'
          : action === 'revise'
          ? `Disetujui dengan revisi guru: "${editReason.trim()}"`
          : `Dikembalikan ke siswa untuk pengerjaan ulang: "${editReason.trim()}"`,
      teacherEditLogs: newLogs
    };

    onUpdateSubmission(updatedSubmission);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Inspeksi Bukti Multimodal & Rubrik AI (Tahap 3, 4, 5)
                </h3>
                {submission.requiresTeacherReview && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Perlu Review Guru
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Siswa: <strong className="text-white">{submission.studentName}</strong> ({submission.studentNis}) • Ujian: {submission.examTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body with Sidebar + Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Question List Sidebar */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950 p-3 overflow-y-auto space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Daftar Soal Ujian ({Object.keys(submission.answers || {}).length})
            </h4>

            {sortedAnswerEntries.map(([qId, ans], idx) => {
              const qItem = getQuestionItem(qId);
              const qNumber = qItem?.number ?? (idx + 1);
              const isSelected = selectedQuestionId === qId;
              const hasMultimodal = (ans.multimodalEvidences?.length || 0) > 0;
              const qScore = editingScores[qId] !== undefined ? editingScores[qId] : (ans.score !== undefined ? ans.score : 0);

              const isAnswered = Boolean(
                (ans.essayAnswer && ans.essayAnswer.trim()) ||
                ans.selectedOption ||
                (ans.selectedOptions && ans.selectedOptions.length > 0) ||
                (ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0) ||
                (ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) ||
                (ans.shortAnswerText && ans.shortAnswerText.trim()) ||
                (ans.shortAnswerCalculation && ans.shortAnswerCalculation.trim()) ||
                (ans.subQuestionAnswers && Object.values(ans.subQuestionAnswers).some(v => Boolean(v && String(v).trim()))) ||
                hasMultimodal
              );

              const maxPoints = ans.maxScore || qItem?.points || (qItem as any)?.maxScore || 5;

              return (
                <button
                  key={qId}
                  type="button"
                  onClick={() => setSelectedQuestionId(qId)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-indigo-300">
                      Soal #{qNumber} ({qItem?.code || (qItem?.type === 'multiple_choice' ? 'Pilihan Ganda' : qItem?.type ? qItem.type.replace('_', ' ') : 'Esai')})
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded border ${
                      !isAnswered
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-slate-800 text-emerald-400 border-slate-700'
                    }`}>
                      {!isAnswered ? `Kosong (0 / ${maxPoints})` : `Skor: ${qScore} / ${maxPoints}`}
                    </span>
                  </div>

                  <p className="text-slate-400 line-clamp-1 text-[11px]">
                    {qItem?.questionText || 'Pertanyaan asesmen vokasi...'}
                  </p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                    {hasMultimodal && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-medium flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        Multimodal Evidence
                      </span>
                    )}
                    {ans.aiRubricScoring?.confidenceStatus && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          ans.aiRubricScoring.confidenceStatus === 'Sangat Yakin'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ans.aiRubricScoring.confidenceStatus === 'Yakin Cukup'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {ans.aiRubricScoring.confidenceStatus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Inspection Panel */}
          <div className="md:col-span-8 p-5 overflow-y-auto space-y-5 bg-slate-900">
            {selectedAnswer ? (
              <>
                {/* 1. Detail Soal & Kunci Jawaban Acuan */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Pertanyaan & Kunci Jawaban Acuan
                    </span>
                    <span className="text-xs text-slate-400">
                      Tipe:{' '}
                      <strong className="text-slate-200">
                        {(questionObj as any)?.scoringMap
                          ? 'Pilihan Ganda (Skala 1–5 Non-Tes)'
                          : questionObj?.type === 'multiple_choice'
                          ? 'Pilihan Ganda'
                          : questionObj?.type
                          ? questionObj.type.replace('_', ' ')
                          : 'Esai'}
                      </strong>
                    </span>
                  </div>
                  {questionObj?.stimulus && (
                    <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800/60 text-xs space-y-1 mt-1">
                      <span className="text-blue-400 font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        Stimulus Kontekstual Laboratorium:
                      </span>
                      <p className="text-blue-100 font-serif leading-relaxed whitespace-pre-wrap">
                        {questionObj.stimulus}
                      </p>
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-100">
                    {questionObj?.questionText || 'Teks pertanyaan.'}
                  </p>
                  {(questionObj as any)?.scoringMap ? (
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-400 font-bold flex items-center gap-1.5">
                          <span>📊</span> Rubrik Penskoran Setiap Kunci Pilihan (Skala 1–5 Non-Tes):
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">Maks 5 Poin / Butir</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {questionObj.options?.map((opt: string, optIdx: number) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const score = (questionObj as any).scoringMap?.[letter] || (opt === questionObj.correctAnswer ? 5 : 1);
                          const isStudentPick = selectedAnswer?.selectedOption === opt;
                          const isBest = score === 5;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded border text-xs flex items-center justify-between gap-1.5 ${
                                isStudentPick
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-medium'
                                  : isBest
                                  ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${
                                  isStudentPick ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {letter}
                                </span>
                                <span className="line-clamp-1">{opt}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isBest ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isBest ? `★ Skor ${score}` : `Skor ${score}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : questionObj?.sampleAnswer ? (
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 mt-2">
                      <span className="text-indigo-400 font-semibold block mb-0.5">Kunci Jawaban Standar:</span>
                      {questionObj.sampleAnswer}
                    </div>
                  ) : null}
                  {questionObj?.rubricGuide && (
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 mt-2">
                      <span className="text-indigo-400 font-semibold block mb-0.5">Pedoman Rubrik Per Soal:</span>
                      {questionObj.rubricGuide}
                    </div>
                  )}
                </div>

                {/* 2. Bukti Multimodal Terlampir (Tahap 3 & 4) */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-700/60 pb-2 gap-2">
                    <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      Bukti Multimodal Tersimpan Siswa ({answerEvidences.length})
                    </h5>
                    {answerEvidences.length > 0 && (
                      <button
                        type="button"
                        onClick={handleEvaluateQuestionAI}
                        disabled={isProcessingEvidenceAI}
                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isProcessingEvidenceAI ? 'Mengekstrak & Menilai...' : '✨ Nilai Soal Ini dengan AI'}</span>
                      </button>
                    )}
                  </div>

                  {answerEvidences.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Siswa tidak melampirkan berkas audio, foto tulisan tangan, atau dokumen kerja pada soal ini (Hanya jawaban teks).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {answerEvidences.map((ev) => (
                        <div key={ev.id} className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                              {ev.modalityType === 'audio' && <Volume2 className="w-4 h-4 text-rose-400" />}
                              {ev.modalityType === 'handwriting' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                              {ev.modalityType === 'document' && <FileText className="w-4 h-4 text-indigo-400" />}
                              {ev.fileName}
                            </span>
                            <span className="text-slate-400 text-[11px]">{ev.uploadTime}</span>
                          </div>

                          {/* Original Media Preview (Audit-Ready & Immutable) */}
                          {ev.modalityType === 'audio' && (ev.storageUrl || ev.fileData || ev.previewUrl) && (
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                              <audio
                                controls
                                preload="metadata"
                                src={ev.storageUrl || ev.fileData || ev.previewUrl}
                                className="w-full h-8"
                                onLoadedMetadata={(e) => {
                                  const aud = e.currentTarget;
                                  if (aud.duration === Infinity) {
                                    aud.currentTime = 1e101;
                                    aud.ontimeupdate = () => {
                                      aud.ontimeupdate = null;
                                      aud.currentTime = 0;
                                    };
                                  }
                                }}
                              />
                              {ev.audioDurationSeconds !== undefined && ev.audioDurationSeconds > 0 && (
                                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
                                  <span>Durasi Terdata:</span>
                                  <span className="font-semibold text-emerald-400">
                                    {Math.floor(ev.audioDurationSeconds / 60)}:{(ev.audioDurationSeconds % 60).toString().padStart(2, '0')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {ev.modalityType === 'handwriting' && (ev.storageUrl || ev.fileData || ev.previewUrl) && (
                            <div className="bg-black/60 p-2 rounded flex justify-center border border-slate-800">
                              <img
                                src={ev.storageUrl || ev.fileData || ev.previewUrl}
                                alt="Foto Tulisan Tangan"
                                className="max-h-48 object-contain rounded"
                              />
                            </div>
                          )}

                          {/* Audit Traceability & Persistent Storage Verification */}
                          <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800 gap-2">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Audit-Ready:</span>
                              <span className="text-slate-300">Berkas Asli Terarsip Persisten</span>
                              {ev.fileHash && (
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1" title={`SHA-256: ${ev.fileHash}`}>
                                  SHA-256: {ev.fileHash.slice(0, 10)}...
                                </span>
                              )}
                            </div>
                            {(ev.storageUrl || ev.fileData) && (
                              <a
                                href={ev.storageUrl || ev.fileData}
                                download={ev.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline text-[11px] font-medium"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Buka / Unduh Berkas Asli
                              </a>
                            )}
                          </div>

                          {/* Artefak Ekstraksi Terpisah (STT / OCR Artifact) */}
                          {ev.extractedText ? (
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Artefak Ekstraksi Terpisah ({ev.extractionArtifact?.engine || (ev.modalityType === 'audio' ? 'Speech-to-Text' : ev.modalityType === 'handwriting' ? 'OCR Tulisan Tangan' : 'Parsing Dokumen')}):
                                </span>
                                {ev.extractionArtifact?.artifactId && (
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    ID Artefak: {ev.extractionArtifact.artifactId}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                                {ev.extractedText}
                              </p>
                            </div>
                          ) : ev.extractionStatus === 'saved' || !ev.extractionStatus ? (
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Berkas tersimpan aman. Klik tombol <strong>"✨ Nilai Soal Ini dengan AI"</strong> di atas untuk menjalankan ekstraksi STT/OCR dan penilaian rubrik.</span>
                              </span>
                            </div>
                          ) : (
                            /* Alert Ekstraksi Gagal: Guru Diwajibkan Memeriksa Berkas Asli */
                            <div className="bg-rose-950/40 border border-rose-800/60 rounded p-3 text-xs text-rose-200 space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                Status Ekstraksi: Gagal (extraction_failed) — Tanpa Fallback Simulasi
                              </div>
                              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                                Sistem <strong>tidak menghasilkan narasi teks contoh/simulasi</strong> demi menjaga validitas asesmen. 
                                <strong> Berkas asli di atas tersimpan utuh dan wajib diperiksa/didengarkan langsung oleh Guru Evaluator</strong> sebelum menentukan nilai akhir.
                              </p>
                              {ev.qualityIssues && ev.qualityIssues.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-rose-900/40 text-[10px] text-rose-300/80">
                                  Catatan kendala ekstraksi: {ev.qualityIssues.join('; ')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Unreadable Flags */}
                          {ev.unreadableFlags && ev.unreadableFlags.length > 0 && (
                            <div className="bg-amber-950/30 border border-amber-800/40 rounded p-2 text-[11px]">
                              <span className="text-amber-300 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Catatan Bagian Samar/Uncertainty:
                              </span>
                              {ev.unreadableFlags.map((flag, idx) => (
                                <p key={idx} className="text-amber-200/90 mt-0.5">
                                  • {flag.segment}: {flag.reason}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Jawaban Teks Langsung Siswa */}
                  {selectedAnswer.essayAnswer && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-700/80 mt-2">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Jawaban Teks Esai Siswa:</span>
                      <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {selectedAnswer.essayAnswer}
                      </p>
                    </div>
                  )}

                  {selectedAnswer.selectedOption && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-700/80 mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 block mb-0.5">Pilihan Jawaban Siswa:</span>
                        <span className="text-sm font-bold text-amber-300">{selectedAnswer.selectedOption}</span>
                      </div>
                      {(questionObj as any)?.scoringMap && (
                        <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                          Skor Pilihan: {selectedAnswer.score ?? 0} / 5
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedAnswer.selectedOption && !selectedAnswer.essayAnswer && answerEvidences.length === 0 && (
                    <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3 mt-2 flex items-center justify-between text-xs text-rose-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <span className="font-bold text-rose-200">Soal Ini Kosong / Tidak Dijawab</span>
                          <p className="text-[11px] text-rose-300/80">Siswa tidak memilih opsi jawaban dan tidak melampirkan teks/bukti esai.</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-900/60 border border-rose-700/60 rounded text-rose-200 font-bold text-xs">
                        Skor: 0 / {selectedAnswer.maxScore || (questionObj as any)?.points || (questionObj as any)?.maxScore || 5}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. TAHAP 5 — AUTOMATED RUBRIC-ALIGNED SCORING ENGINE */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-slate-800/60 to-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-500/20 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          Penilaian AI Berbasis Rubrik (Tahap 5)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Evaluasi otomatis terstruktur per indikator rubrik kompetensi.
                        </p>
                      </div>
                    </div>

                    {/* Confidence Status Badge */}
                    {aiScoreResult?.confidenceStatus && (
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                          aiScoreResult.confidenceStatus === 'Sangat Yakin'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : aiScoreResult.confidenceStatus === 'Yakin Cukup'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Status Keyakinan AI: {aiScoreResult.confidenceStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Uncertainty Reason Explanation */}
                  {aiScoreResult?.uncertaintyReason && (
                    <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3 text-xs text-amber-300 space-y-1">
                      <span className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Alasan Ketidakpastian (Explainable Uncertainty):
                      </span>
                      <p className="text-amber-200/90 leading-relaxed">{aiScoreResult.uncertaintyReason}</p>
                    </div>
                  )}

                  {/* Breakdown Skor Per Indikator Rubrik */}
                  {aiScoreResult?.scoresPerIndicator && aiScoreResult.scoresPerIndicator.length > 0 ? (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-300 mb-2">
                        Rincian Nilai Per Indikator Rubrik:
                      </h5>
                      <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                              <th className="p-2.5">Indikator Kompetensi</th>
                              <th className="p-2.5 text-center">Skor Maks</th>
                              <th className="p-2.5 text-center">Skor AI</th>
                              <th className="p-2.5">Alasan Penilaian (Rationale)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                            {aiScoreResult.scoresPerIndicator.map((ind, i) => (
                              <tr key={i} className="hover:bg-slate-800/50">
                                <td className="p-2.5 font-medium text-slate-200">{ind.indicatorName}</td>
                                <td className="p-2.5 text-center text-slate-400">{ind.maxPoints}</td>
                                <td className="p-2.5 text-center font-bold text-emerald-400">{ind.scoreGiven}</td>
                                <td className="p-2.5 text-slate-300 leading-relaxed">{ind.rationale}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-xs text-slate-300">
                      <span className="font-semibold text-indigo-400 block mb-1">Umpan Balik AI:</span>
                      <p>{selectedAnswer.teacherFeedback || aiScoreResult?.constructiveFeedback || 'Penilaian otomatis selesai.'}</p>
                    </div>
                  )}

                  {/* Evidence Highlights (Kutipan Bukti Siswa) */}
                  {aiScoreResult?.evidenceHighlights && aiScoreResult.evidenceHighlights.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        Evidence Highlights (Kutipan Bukti yang Mendukung Skor):
                      </h5>
                      <div className="space-y-2">
                        {aiScoreResult.evidenceHighlights.map((eh, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between text-indigo-300 font-semibold mb-1">
                              <span>Mendukung: {eh.supportingIndicator}</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400 capitalize">
                                Sumber: {eh.sourceModality}
                              </span>
                            </div>
                            <blockquote className="border-l-2 border-amber-400 pl-2.5 py-0.5 text-amber-200/90 italic font-mono bg-amber-950/20 rounded-r my-1">
                              "{eh.quote}"
                            </blockquote>
                            <p className="text-slate-400 text-[11px]">{eh.relevanceExplanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Metadata */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Model AI: {aiScoreResult?.modelUsed || 'Gemini 3.5 Flash'}</span>
                    <span>Versi Prompt: {aiScoreResult?.promptVersion || 'v2.4-rubric-multimodal'}</span>
                    <span>Waktu Penilaian: {aiScoreResult?.evaluatedAt || submission.submitTime}</span>
                  </div>
                </div>

                {/* 4. TAHAP 6: HUMAN-IN-THE-LOOP & VALIDASI GURU (ACTION CONTROLS + AUDIT TRAIL) */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-amber-400" />
                        Human-in-the-Loop & Panel Validasi Guru (Tahap 6)
                      </h5>
                      <p className="text-xs text-slate-400">
                        Guru memegang keputusan final atas skor siswa. Skor AI awal tetap tersimpan tanpa terhapus untuk audit komparasi.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">Skor Guru Soal Ini:</span>
                      <input
                        type="number"
                        min={0}
                        max={selectedAnswer.maxScore || 10}
                        value={
                          editingScores[selectedQuestionId] !== undefined
                            ? editingScores[selectedQuestionId]
                            : selectedAnswer.score || 0
                        }
                        onChange={(e) =>
                          handleScoreChange(selectedQuestionId, parseFloat(e.target.value) || 0)
                        }
                        className="w-16 px-2.5 py-1 bg-slate-950 border border-amber-500 rounded text-center text-sm font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400">/ {selectedAnswer.maxScore || 10}</span>
                    </div>
                  </div>

                  {/* Input Alasan Wajib ketika Mengubah Skor / Mengembalikan */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Catatan / Alasan Revisi Nilai Guru (Wajib diisi bila merevisi skor):</span>
                      {showReasonError && (
                        <span className="text-rose-400 text-[11px] font-bold animate-pulse">
                          * Wajib mengisi alasan perubahan skor!
                        </span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Skor disesuaikan dari 8 ke 10 karena penjelasan verbal pada rekaman audio menit 00:45 sudah sangat tepat sesuai SOP..."
                      value={editReason}
                      onChange={(e) => {
                        setEditReason(e.target.value);
                        if (e.target.value.trim()) setShowReasonError(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-xs text-slate-200 font-sans focus:outline-none transition ${
                        showReasonError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  {/* 3 Tombol Aksi Utama Guru */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteValidationAction('return')}
                      disabled={isSaving}
                      className="px-4 py-2 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Kembalikan Ke Siswa (Ulang)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteValidationAction('revise')}
                      disabled={isSaving}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
                    >
                      <Edit3 className="w-4 h-4" />
                      Simpan Revisi Skor Guru
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteValidationAction('approve')}
                      disabled={isSaving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Setuju & Konfirmasi Nilai AI
                    </button>
                  </div>
                </div>

                {/* Audit Log Record History (Tahap 6 Requirement) */}
                {submission.teacherEditLogs && submission.teacherEditLogs.length > 0 && (
                  <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-2 text-xs">
                    <h5 className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      Jejak Audit Perubahan Nilai Guru (Teacher Edit Logs):
                    </h5>
                    <div className="space-y-2">
                      {submission.teacherEditLogs.map((log) => (
                        <div key={log.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{log.teacherName}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] uppercase text-indigo-300 font-semibold">
                                {log.actionTaken}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] mt-0.5">Alasan: "{log.reason}"</p>
                          </div>
                          <div className="text-right shrink-0 text-[11px]">
                            <div className="font-semibold text-slate-300">
                              Skor AI: <span className="line-through text-slate-500">{log.originalAIScore}</span> → Skor Guru: <span className="text-emerald-400 font-bold">{log.finalTeacherScore}</span>
                            </div>
                            <div className="text-slate-500">{log.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Pilih soal pada daftar di sebelah kiri untuk memeriksa bukti multimodal dan rubrik AI.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        {(() => {
          const currentAnswers = submission.answers || {};
          const rawSum = Object.values(currentAnswers).reduce((acc, ans) => {
            const qScore = editingScores[ans.questionId] !== undefined ? editingScores[ans.questionId] : (ans.score || 0);
            return acc + qScore;
          }, 0);

          const maxRawSum = Object.entries(currentAnswers).reduce((acc, [qId, ans]) => {
            const qItem = getQuestionItem(qId);
            return acc + (ans.maxScore || qItem?.points || (qItem as any)?.maxScore || 5);
          }, 0);

          const isEmpExam =
            submission.examTitle?.toLowerCase().includes('employa') ||
            submission.examTitle?.toLowerCase().includes('non-tes') ||
            packageObj?.category === 'employability' ||
            packageObj?.id === 'pkg-employability-18' ||
            Object.keys(currentAnswers).some(k => k.startsWith('nt-') || k.startsWith('q-nt-'));

          const finalScaledScore = isEmpExam
            ? (maxRawSum > 0 ? Math.round((rawSum / maxRawSum) * 100) : 0)
            : (submission.totalScore !== undefined ? submission.totalScore : rawSum);

          return (
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400">
                  Total Poin Butir: <strong className="text-amber-400">{rawSum} / {maxRawSum} Poin</strong>
                </span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-slate-400">
                  Nilai Akhir (Skala 100): <strong className="text-indigo-400">{finalScaledScore}</strong>
                </span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-slate-400">
                  Status Skor: <strong className="text-emerald-400">{submission.totalScore !== undefined ? `${submission.totalScore} (Tervalidasi)` : `${finalScaledScore} (AI)`}</strong>
                </span>
                {submission.validatedBy && (
                  <span className="text-slate-400 hidden md:inline">
                    • Validator: <strong className="text-slate-200">{submission.validatedBy}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
