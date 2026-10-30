import React, { useState, useEffect, useRef } from 'react';
import { Exam, QuestionPackage, QuestionItem, StudentAnswer, ExamSubmission, MultimodalEvidence } from '../../types';
import { calculateAssessmentScore, evaluateEssaySemantic, REVISED_QUESTIONS_24 } from '../../data/revisedQuestions';
import { calculateEmployabilityScore, NON_TEST_QUESTIONS_18 } from '../../data/nonTestInstrument';
import { Clock, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Send, Sparkles, ShieldAlert, BookOpen, Calculator, CheckSquare, Layers, Award, Info, Mic } from 'lucide-react';
import { MultimodalUploader } from '../common/MultimodalUploader';

interface ExamRunnerProps {
  exam: Exam;
  packageObj: QuestionPackage;
  studentId?: string;
  studentName: string;
  studentNis: string;
  studentEmail?: string;
  schoolName?: string;
  className: string;
  onSubmitExam: (submission: ExamSubmission) => void;
  onCancelExam: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  packageObj,
  studentId,
  studentName,
  studentNis,
  studentEmail,
  schoolName,
  className,
  onSubmitExam,
  onCancelExam
}) => {
  const draftStorageKey = `voc_draft_${exam.id}_${studentNis || studentName || 'anon'}`;
  const timeStorageKey = `voc_timer_${exam.id}_${studentNis || studentName || 'anon'}`;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // State Dikte Suara (Speech-to-Text) langsung ke kotak esai
  const [isDictating, setIsDictating] = useState(false);
  const [dictatingTarget, setDictatingTarget] = useState<string | null>(null);
  const speechRecognizerRef = useRef<any>(null);

  // Restore remaining time from localStorage jika ada (mencegah reset timer saat refresh)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(() => {
    try {
      const savedTime = localStorage.getItem(timeStorageKey);
      if (savedTime) {
        const parsed = parseInt(savedTime, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= exam.durationMinutes * 60) {
          return parsed;
        }
      }
    } catch {}
    return exam.durationMinutes * 60;
  });

  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Restore Student Answers State dari draft localStorage jika ada
  const [answersState, setAnswersState] = useState<Record<string, StudentAnswer>>(() => {
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  // Autosave jawaban siswa ke localStorage setiap kali ada perubahan
  useEffect(() => {
    if (Object.keys(answersState).length > 0) {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(answersState));
      } catch (err) {
        console.warn('[ExamRunner] Gagal menyimpan draft lokal:', err);
      }
    }
  }, [answersState, draftStorageKey]);

  // Simpan sisa waktu setiap 5 detik agar akurat
  useEffect(() => {
    if (timeLeftSeconds > 0 && timeLeftSeconds % 5 === 0) {
      try {
        localStorage.setItem(timeStorageKey, timeLeftSeconds.toString());
      } catch {}
    }
  }, [timeLeftSeconds, timeStorageKey]);

  // Countdown timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleFinalSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds]);

  // Pastikan instrumen teknis kimia selalu menggunakan butir instrumen REVISED_QUESTIONS_24 mutakhir (24 butir, 65 skor mentah)
  const activeQuestions: QuestionItem[] = React.useMemo(() => {
    const isTech = packageObj?.id === 'pkg-full-24' ||
                   packageObj?.category === 'teknis_kimia' ||
                   exam?.category === 'teknis_kimia' ||
                   exam?.packageId === 'pkg-full-24' ||
                   (packageObj?.questions && packageObj.questions.length === 24);
    if (isTech) {
      return REVISED_QUESTIONS_24;
    }
    return packageObj?.questions || REVISED_QUESTIONS_24;
  }, [packageObj, exam]);

  // Randomize / shuffle question order if exam.randomizeQuestions is true (or default true)
  const questionsList: QuestionItem[] = React.useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return [];
    if (exam.randomizeQuestions === false) return activeQuestions;

    // Pseudorandom deterministic shuffle based on student identity & exam ID
    const qs = [...activeQuestions];
    let seed = 0;
    const seedStr = `${studentNis || studentName || 'student'}-${exam.id || 'exam'}`;
    for (let i = 0; i < seedStr.length; i++) {
      seed += seedStr.charCodeAt(i) * (i + 1);
    }
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }
    return qs;
  }, [exam?.randomizeQuestions, exam?.id, activeQuestions, studentNis, studentName]);

  const currentQuestion: QuestionItem = questionsList[currentQuestionIndex] || {
    id: 'q-fallback',
    code: 'TK-01',
    category: 'teknis_kimia',
    topic: 'Soal Vokasi',
    questionText: 'Pertanyaan tidak dapat dimuat.',
    type: 'essay'
  };

  // Multiple Choice Handler
  const handleMultipleChoiceSelect = (qId: string, option: string) => {
    setAnswersState(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || { questionId: qId }),
        questionId: qId,
        selectedOption: option
      }
    }));
  };

  // Complex MCQ Checkbox Handler (Google Form style - pilih tepat 2 opsi)
  const handleComplexCheckboxToggle = (qId: string, optionVal: string, maxPicks: number = 2) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId, selectedOptions: [] };
      const currentList: string[] = existing.selectedOptions || [];
      const isAlreadyPicked = currentList.includes(optionVal);

      let updatedList: string[];
      if (isAlreadyPicked) {
        updatedList = currentList.filter(item => item !== optionVal);
      } else {
        if (currentList.length >= maxPicks) {
          // Maksimal 2 alternatif jawaban
          return prev;
        }
        updatedList = [...currentList, optionVal];
      }

      return {
        ...prev,
        [qId]: {
          ...existing,
          selectedOptions: updatedList
        }
      };
    });
  };

  // Complex MCQ Handler (Statement -> Option) legacy fallback
  const handleComplexMcqSelect = (qId: string, statementId: string, selectedVal: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId, complexAnswers: {} };
      return {
        ...prev,
        [qId]: {
          ...existing,
          complexAnswers: {
            ...(existing.complexAnswers || {}),
            [statementId]: selectedVal
          }
        }
      };
    });
  };

  // Matching Handler (Column A item -> Column B match)
  const handleMatchingSelect = (qId: string, itemAId: string, selectedBVal: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId, matchingAnswers: {} };
      return {
        ...prev,
        [qId]: {
          ...existing,
          matchingAnswers: {
            ...(existing.matchingAnswers || {}),
            [itemAId]: selectedBVal
          }
        }
      };
    });
  };

  // Short Answer Handlers
  const handleShortAnswerChange = (qId: string, textVal: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId };
      return {
        ...prev,
        [qId]: {
          ...existing,
          shortAnswerText: textVal
        }
      };
    });
  };

  const handleShortAnswerCalculationChange = (qId: string, calcVal: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId };
      return {
        ...prev,
        [qId]: {
          ...existing,
          shortAnswerCalculation: calcVal
        }
      };
    });
  };

  // Essay Handler
  const handleEssayChange = (qId: string, textVal: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId };
      return {
        ...prev,
        [qId]: {
          ...existing,
          essayAnswer: textVal
        }
      };
    });
  };

  // Subquestions Handler
  const handleSubAnswerChange = (qId: string, subId: string, value: string) => {
    setAnswersState(prev => {
      const existing = prev[qId] || { questionId: qId, subQuestionAnswers: {} };
      return {
        ...prev,
        [qId]: {
          ...existing,
          subQuestionAnswers: {
            ...(existing.subQuestionAnswers || {}),
            [subId]: value
          }
        }
      };
    });
  };

  // Dikte Suara (Web Speech API) - Live Speech-to-Text dalam Bahasa Indonesia
  const startSpeechRecognition = (target: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda belum mendukung Web Speech API langsung. Disarankan menggunakan Google Chrome atau Microsoft Edge, atau gunakan fitur rekaman suara pada widget bukti di bawah.");
      return;
    }

    try {
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.stop(); } catch {}
      }

      const recognizer = new SpeechRecognition();
      recognizer.lang = 'id-ID';
      recognizer.continuous = true;
      recognizer.interimResults = true;

      recognizer.onstart = () => {
        setIsDictating(true);
        setDictatingTarget(target);
      };

      recognizer.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          const textToAdd = transcript.trim();
          if (target === 'essay') {
            setAnswersState(prev => {
              const cur = prev[currentQuestion.id]?.essayAnswer || '';
              const next = cur ? `${cur} ${textToAdd}` : textToAdd;
              return {
                ...prev,
                [currentQuestion.id]: {
                  ...(prev[currentQuestion.id] || { questionId: currentQuestion.id }),
                  essayAnswer: next
                }
              };
            });
          }
        }
      };

      recognizer.onerror = (e: any) => {
        console.warn('Speech recognition warning:', e.error);
        if (e.error !== 'no-speech') {
          setIsDictating(false);
          setDictatingTarget(null);
        }
      };

      recognizer.onend = () => {
        setIsDictating(false);
        setDictatingTarget(null);
      };

      recognizer.start();
      speechRecognizerRef.current = recognizer;
    } catch (err) {
      console.warn('Gagal memulai speech recognition:', err);
      setIsDictating(false);
      setDictatingTarget(null);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop(); } catch {}
      speechRecognizerRef.current = null;
    }
    setIsDictating(false);
    setDictatingTarget(null);
  };

  useEffect(() => {
    return () => {
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleFinalSubmit = () => {
    const isEmployabilityExam = 
      packageObj?.category === 'employability' ||
      packageObj?.id === 'pkg-employability-18' ||
      packageObj?.title?.toLowerCase().includes('non-tes') ||
      packageObj?.title?.toLowerCase().includes('employability') ||
      exam.title?.toLowerCase().includes('non-tes') ||
      exam.title?.toLowerCase().includes('employability');

    const empResult = isEmployabilityExam
      ? calculateEmployabilityScore(answersState, activeQuestions)
      : null;

    const scoreResult = isEmployabilityExam
      ? {
          totalRawScore: empResult!.totalRawScore,
          maxRawScore: empResult!.maxTotalRawScore, // 90
          finalPercentage: empResult!.finalPercentage,
          dimensionScores: {} as any
        }
      : calculateAssessmentScore(answersState, activeQuestions);

    // Enrich answers with scores and maxScores matching exact rubrics in sequential question order
    const enrichedAnswers: Record<string, StudentAnswer> = {};
    activeQuestions.forEach(q => {
      const qAns = answersState[q.id] || { questionId: q.id };
      let qMax = q.maxScore || (q.points || 1);
      
      let earnedScore = 0;
      if (q.type === 'multiple_choice') {
        const scoringMap = (q as any).scoringMap;
        const studentPick = (qAns.selectedOption || '').toString().trim().toUpperCase();
        if (scoringMap) {
          // Non-tes employability: penskoran bergradasi 1-5 sesuai rubrik (0 jika tidak dijawab)
          qMax = 5;
          if (!studentPick) {
            earnedScore = 0;
          } else {
            let letter = '';
            if (['A', 'B', 'C', 'D', 'E'].includes(studentPick)) {
              letter = studentPick;
            } else {
              const match = studentPick.match(/^([A-E])\b/);
              if (match) letter = match[1];
              else if (studentPick.startsWith('A')) letter = 'A';
              else if (studentPick.startsWith('B')) letter = 'B';
              else if (studentPick.startsWith('C')) letter = 'C';
              else if (studentPick.startsWith('D')) letter = 'D';
              else if (studentPick.startsWith('E')) letter = 'E';
            }
            earnedScore = letter && scoringMap[letter] !== undefined ? scoringMap[letter] : 0;
          }
        } else {
          // Asesmen teknis: penskoran biner 0/1 (0 jika tidak dijawab)
          if (!studentPick) {
            earnedScore = 0;
          } else {
            const correctPick = (q.correctAnswer || '').toString().trim().toUpperCase();
            earnedScore = (studentPick === correctPick || (studentPick.slice(0, 1) && studentPick.slice(0, 1) === correctPick.slice(0, 1))) ? 1 : 0;
          }
        }
      } else if (q.type === 'complex_mcq') {
        if (Array.isArray(qAns.selectedOptions)) {
          const studentLetters = qAns.selectedOptions.map((opt: string) => opt.trim().slice(0, 1).toUpperCase());
          const correctLetters = (q.correctAnswers || []).map((opt: string) => opt.trim().slice(0, 1).toUpperCase());
          let matchCount = 0;
          studentLetters.forEach((letter: string) => {
            if (correctLetters.includes(letter)) matchCount++;
          });
          earnedScore = Math.min(qMax, matchCount);
        } else if (q.statements && qAns.complexAnswers) {
          let correctCount = 0;
          q.statements.forEach(stmt => {
            if (qAns.complexAnswers && qAns.complexAnswers[stmt.id] === stmt.correctAnswer) correctCount++;
          });
          earnedScore = Math.round((correctCount / q.statements.length) * qMax);
        }
      } else if (q.type === 'matching' && q.matchingColumnA) {
        let correctCount = 0;
        q.matchingColumnA.forEach(m => {
          const studentVal = (qAns.matchingAnswers && qAns.matchingAnswers[m.id] || '').trim();
          const targetVal = (m.correctMatch || '').trim();
          if (studentVal && (studentVal === targetVal || studentVal.slice(0, 1) === targetVal.slice(0, 1))) correctCount++;
        });
        earnedScore = correctCount; // 1 point per correct match (max 4)
      } else if (q.type === 'short_answer') {
        const val = (qAns.shortAnswerText || '').toString().trim().replace(',', '.');
        const calc = (qAns.shortAnswerCalculation || '').toString().toLowerCase();
        if (q.number === 10) {
          // Soal 10 (Skor maks 3)
          let s1 = (calc.includes('n1') || calc.includes('v1') || calc.includes('pengenceran') || calc.includes('m1')) ? 1 : 0;
          let s2 = (calc.includes('1,00') || calc.includes('1.00') || calc.includes('1.0') || calc.includes('1,0')) &&
                   (calc.includes('250') || calc.includes('0,100') || calc.includes('0.100') || calc.includes('0.1') || calc.includes('0,1')) ? 1 : 0;
          let s3 = (val === '25' || val === '25.0' || Math.abs(parseFloat(val) - 25.0) < 0.1) ? 1 : 0;
          earnedScore = s1 + s2 + s3;
          if (earnedScore === 0 && (val || calc)) earnedScore = 1;
        } else if (q.number === 11) {
          // Soal 11 (Skor maks 3)
          let s1 = (calc.includes('2.00') || calc.includes('2,00') || calc.includes('2.0') || calc.includes('2,0') || calc.includes('0.05') || calc.includes('40')) ? 1 : 0;
          let s2 = (calc.includes('0.800') || calc.includes('0,800') || calc.includes('0.8') || calc.includes('0,8') || calc.includes('80%') || calc.includes('80')) ? 1 : 0;
          let s3 = (val === '2.5' || val === '2.50' || Math.abs(parseFloat(val) - 2.50) < 0.1) ? 1 : 0;
          earnedScore = s1 + s2 + s3;
          if (earnedScore === 0 && (val || calc)) earnedScore = 1;
        } else if (q.number === 14) {
          // Soal 14 (Skor maks 5)
          const fullText = `${val} ${calc} ${(qAns.subQuestionAnswers?.['kadar'] || '')}`;
          let s1 = (fullText.includes('6.2') || fullText.includes('6,2') || fullText.includes('0.0124') || fullText.includes('12.4') || fullText.includes('0.62')) ? 1 : 0;
          let s2 = (fullText.includes('1 : 1') || fullText.includes('1:1') || fullText.includes('ag+') || fullText.includes('cl-') || fullText.includes('agcl')) ? 1 : 0;
          let s3 = (fullText.includes('0.0248') || fullText.includes('0,0248') || fullText.includes('2.48')) ? 1 : 0;
          let s4 = (fullText.includes('35.45') || fullText.includes('35,45') || fullText.includes('35.5')) ? 1 : 0;
          let s5 = (fullText.includes('879') || fullText.includes('879.16') || fullText.includes('879,16') || fullText.includes('879.2')) ? 1 : 0;
          earnedScore = s1 + s2 + s3 + s4 + s5;
          if (earnedScore === 0 && (val || calc)) earnedScore = 1;
        } else {
          earnedScore = (val === q.shortAnswerKey) ? qMax : 1;
        }
      } else if (q.type === 'essay') {
        const textToEval = (qAns.essayAnswer || '').trim();
        // Cek juga hasil ekstraksi bukti multimodal jika kotak teks siswa kosong
        const evidenceText = (qAns.multimodalEvidences || [])
          .map((e: any) => e.extractedText || '')
          .filter(Boolean)
          .join(' ')
          .trim();
        const effectiveText = textToEval || evidenceText;

        if (effectiveText) {
          earnedScore = qAns.score !== undefined ? qAns.score : evaluateEssaySemantic(q.number || 0, effectiveText);
          if (!textToEval && evidenceText) {
            qAns.essayAnswer = evidenceText;
          }
        } else if (qAns.multimodalEvidences && qAns.multimodalEvidences.length > 0) {
          // Siswa melampirkan berkas bukti (audio/dokumen) tanpa teks transkripsi:
          // Berikan keterangan yang jelas dan jangan vonis gagal 0 mutlak
          earnedScore = 0;
          qAns.essayAnswer = `[Jawaban Disampaikan Melalui Lampiran: ${qAns.multimodalEvidences.map((e: any) => e.fileName).join(', ')}]`;
        } else {
          earnedScore = 0;
        }
      }

      enrichedAnswers[q.id] = {
        ...qAns,
        score: Math.min(qMax, Math.max(0, earnedScore)),
        maxScore: qMax
      };
    });

    // Collect all multimodal evidences attached across all questions
    const allEvidences: MultimodalEvidence[] = [];
    Object.values(enrichedAnswers).forEach(ans => {
      if (ans.multimodalEvidences && ans.multimodalEvidences.length > 0) {
        allEvidences.push(...ans.multimodalEvidences);
      }
    });

    const hasWarningOrFlag = allEvidences.some(e => e.qualityStatus === 'warning' || (e.unreadableFlags && e.unreadableFlags.length > 0));
    const hasUnprocessedEvidence = allEvidences.some(e => !e.extractedText || e.extractionStatus === 'saved');
    const hasAnyEvidenceWithoutText = activeQuestions.some(q => {
      const qAns = enrichedAnswers[q.id];
      const hasEv = qAns?.multimodalEvidences && qAns.multimodalEvidences.length > 0;
      const noText = !(qAns?.essayAnswer && qAns.essayAnswer.trim() && !qAns.essayAnswer.startsWith('[Jawaban Disampaikan'));
      return hasEv && noText;
    });

    const requiresReview = hasWarningOrFlag || hasUnprocessedEvidence || hasAnyEvidenceWithoutText;

    const isTechnicalExam = !isEmployabilityExam;
    const finalTechScore = isTechnicalExam ? scoreResult.finalPercentage : 0;
    const finalEmpScore = isEmployabilityExam ? (empResult ? empResult.finalPercentage : scoreResult.finalPercentage) : 0;

    const submission: ExamSubmission = {
      id: `sub-${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: studentId || (studentNis ? `usr-std-${studentNis}` : `usr-std-${Date.now()}`),
      studentName,
      studentNis,
      studentEmail,
      schoolName,
      className,
      submitTime: new Date().toISOString(),
      answers: enrichedAnswers,
      totalScore: isEmployabilityExam ? (empResult ? empResult.finalPercentage : scoreResult.finalPercentage) : scoreResult.finalPercentage,
      technicalScore: finalTechScore,
      employabilityScore: finalEmpScore,
      status: requiresReview ? 'perlu_pemeriksaan' : 'dinilai',
      requiresTeacherReview: requiresReview,
      evidences: allEvidences,
      aiEvaluation: isTechnicalExam
        ? `Skor Total Mentah: ${scoreResult.totalRawScore}/65 (${scoreResult.finalPercentage}%). Terdiri atas 6 dimensi kemampuan teknis kimia sesuai rubrik penskoran standar.`
        : `Skor Total Non-Tes Employability: ${empResult ? empResult.totalRawScore : scoreResult.totalRawScore}/90 (${empResult ? empResult.finalPercentage : scoreResult.finalPercentage}% - Kategori ${empResult?.category || 'Sangat baik'}). ${empResult?.interpretation || ''}`,
      teacherFollowUp: requiresReview
        ? 'Terdapat jawaban yang disampaikan melalui rekaman audio atau berkas dokumen yang memerlukan verifikasi langsung oleh guru penguji.'
        : isTechnicalExam
          ? 'Pemeriksaan analitis seluruh komponen rubrik 6 dimensi instrumen teknis kimia telah selesai.'
          : `Pemeriksaan instrumen non-tes employability telah selesai sesuai rubrik 18 butir (1-5 per respons). Kategori: ${empResult?.category || 'Sangat baik'}.`
    };

    // Bersihkan draft ujian setelah berhasil dikumpulkan
    try {
      localStorage.removeItem(draftStorageKey);
      localStorage.removeItem(timeStorageKey);
    } catch {}

    onSubmitExam(submission);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Fixed Exam Banner */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xs sm:text-base shadow-md shrink-0">
            K
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
              {exam.title}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {studentName} {studentNis ? `(${studentNis})` : ''} • {className}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {/* Status Auto-saved indikator (desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tersimpan Otomatis</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Sisa Waktu: </span>
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmSubmitModal(true)}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-lg shadow-emerald-600/25 touch-manipulation"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Selesaikan Ujian</span>
            <span className="sm:hidden">Selesai</span>
          </button>
        </div>
      </header>

      {/* Main Runner Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Progress Navigation Pills */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Navigasi Soal</span>
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {Object.keys(answersState).length} / {questionsList.length} Dijawab
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileNav(prev => !prev)}
              className="sm:hidden text-xs text-blue-400 font-semibold flex items-center gap-1 hover:text-blue-300 cursor-pointer"
            >
              <span>{showMobileNav ? 'Tutup Daftar ▲' : 'Buka Semua Nomor ▼'}</span>
            </button>
          </div>

          {/* Grid layout (selalu di desktop, toggleable di mobile) */}
          <div className={`${showMobileNav ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-1.5 sm:gap-2 transition-all`}>
            {questionsList.map((q, idx) => {
              const isAnswered = !!answersState[q.id];
              const isCurrent = currentQuestionIndex === idx;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setShowMobileNav(false);
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md'
                      : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Quick horizontal glance on mobile when closed */}
          {!showMobileNav && (
            <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
              {questionsList.map((q, idx) => {
                const isAnswered = !!answersState[q.id];
                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 shrink-0 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center touch-manipulation ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Question Container */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 sm:space-y-6 shadow-xl">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Soal {currentQuestionIndex + 1} dari {questionsList.length}
              </span>
              {currentQuestion.dimensionName && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {currentQuestion.dimensionName}
                </span>
              )}
              {currentQuestion.cognitiveLevel && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Level {currentQuestion.cognitiveLevel}
                </span>
              )}
              {currentQuestion.maxScore && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Skor Maks: {currentQuestion.maxScore} Poin
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">Topik: {currentQuestion.topic}</span>
            </div>

            <span className="text-xs text-amber-400 font-mono font-bold shrink-0">
              {currentQuestion.type === 'multiple_choice' && 'Pilihan Ganda'}
              {currentQuestion.type === 'complex_mcq' && 'Pilihan Ganda Kompleks'}
              {currentQuestion.type === 'matching' && 'Menjodohkan'}
              {currentQuestion.type === 'short_answer' && 'Isian Singkat Berhitung'}
              {currentQuestion.type === 'essay' && 'Uraian Terbatas'}
              {(currentQuestion.type === 'essay_subquestions' || currentQuestion.type === 'scenario_assessment') && 'Uraian Subsoal'}
            </span>
          </div>

          {currentQuestion.indicator && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span><strong className="text-slate-400">Indikator:</strong> {currentQuestion.indicator}</span>
            </div>
          )}

          {/* Stimulus Context Box if available */}
          {currentQuestion.stimulus && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Stimulus Kontekstual Laboratorium</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed whitespace-pre-line font-serif">
                {currentQuestion.stimulus}
              </p>
            </div>
          )}

          {/* Question Text */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm leading-relaxed font-semibold">
            {currentQuestion.questionText}
          </div>

          {/* 1. Multiple Choice Options */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-400">Pilih Satu Jawaban Yang Paling Tepat:</label>
              {currentQuestion.options.map((opt, oIdx) => {
                const isSelected = answersState[currentQuestion.id]?.selectedOption === opt;

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleMultipleChoiceSelect(currentQuestion.id, opt)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Complex MCQ (Google Form Checkbox Style - Pilihan Ganda Kompleks) */}
          {currentQuestion.type === 'complex_mcq' && (() => {
            const complexOptions = (currentQuestion.options && currentQuestion.options.length > 0)
              ? currentQuestion.options
              : (REVISED_QUESTIONS_24.find(q => q.id === currentQuestion.id)?.options || []);

            const pickedList = answersState[currentQuestion.id]?.selectedOptions || [];
            const pickedCount = pickedList.length;

            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pb-1 gap-2">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span>Pilihlah tepat dua alternatif jawaban yang paling benar (Gunakan Checkbox):</span>
                    </label>
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] self-start sm:self-auto ${
                      pickedCount === 2
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      Terpilih: {pickedCount} / 2 alternatif
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {complexOptions.map((opt, idx) => {
                      const isChecked = pickedList.includes(opt);
                      const isLimitReached = pickedCount >= 2 && !isChecked;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isLimitReached) return;
                            handleComplexCheckboxToggle(currentQuestion.id, opt, 2);
                          }}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 select-none ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/70 text-blue-100 shadow-lg shadow-blue-900/20 ring-1 ring-blue-500/50 cursor-pointer'
                              : isLimitReached
                              ? 'bg-slate-950/50 border-slate-850 text-slate-500 cursor-not-allowed opacity-60'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700 cursor-pointer'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-600 bg-slate-900'
                          }`}>
                            {isChecked && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="text-xs leading-relaxed font-medium">
                            {opt}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {pickedCount >= 2 && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1.5 pt-1">
                      <span>ℹ️ Maksimal 2 alternatif jawaban telah dipilih. Klik centang pada opsi yang ingin diganti jika ingin mengubah jawaban.</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Matching (Column A -> Column B: Eliminasi Otomatis Opsi Terpilih) */}
          {currentQuestion.type === 'matching' && (() => {
            const colA = (currentQuestion.matchingColumnA && currentQuestion.matchingColumnA.length > 0)
              ? currentQuestion.matchingColumnA
              : (REVISED_QUESTIONS_24.find(q => q.id === currentQuestion.id)?.matchingColumnA || []);
            const colB = (currentQuestion.matchingColumnB && currentQuestion.matchingColumnB.length > 0)
              ? currentQuestion.matchingColumnB
              : (REVISED_QUESTIONS_24.find(q => q.id === currentQuestion.id)?.matchingColumnB || []);
            const matchingAns = answersState[currentQuestion.id]?.matchingAnswers || {};

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="font-semibold text-slate-300">
                    Pasangkan Setiap Pernyataan pada Kolom A dengan Jawaban yang Sesuai pada Kolom B:
                  </label>
                  <span className="text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 self-start sm:self-auto">
                    <span>✓</span>
                    <span>Opsi yang sudah dipilih otomatis tereliminasi dari baris lain</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {colA.map((item) => {
                    const currentMatch = (matchingAns[item.id] || '').trim();

                    // Kumpulkan semua opsi Kolom B yang SUDAH dipilih oleh item Kolom A lainnya
                    const takenByOthers = new Set<string>();
                    Object.entries(matchingAns).forEach(([otherItemId, val]) => {
                      if (otherItemId !== item.id && val && typeof val === 'string' && val.trim()) {
                        takenByOthers.add(val.trim());
                      }
                    });

                    // Filter opsi Kolom B yang belum dipilih ATAU opsi yang sedang aktif dipilih oleh item ini
                    const availableBOptions = colB.filter((bOpt) => {
                      const cleanBOpt = (bOpt || '').trim();
                      return !takenByOthers.has(cleanBOpt) || cleanBOpt === currentMatch;
                    });

                    return (
                      <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 transition-all hover:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-amber-400">Kolom A: {item.columnAText}</div>
                          {currentMatch && (
                            <button
                              type="button"
                              onClick={() => handleMatchingSelect(currentQuestion.id, item.id, '')}
                              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer hover:underline"
                              title="Batalkan/lepas pilihan pasangan"
                            >
                              ✕ Lepas Pilihan
                            </button>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <label className="font-semibold">Pilih Pasangan di Kolom B:</label>
                            <span className="text-slate-500">
                              {currentMatch ? '✓ Terpasang' : `Tersedia ${availableBOptions.length} pilihan`}
                            </span>
                          </div>
                          <select
                            value={currentMatch}
                            onChange={(e) => handleMatchingSelect(currentQuestion.id, item.id, e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-all cursor-pointer ${
                              currentMatch
                                ? 'bg-amber-950/20 border-amber-500/50 text-amber-200 font-medium'
                                : 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-500'
                            }`}
                          >
                            <option value="">-- Pilih Jawaban Kolom B --</option>
                            {availableBOptions.map((bOpt, bIdx) => (
                              <option key={bIdx} value={bOpt}>{bOpt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 4. Short Answer Calculation */}
          {currentQuestion.type === 'short_answer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Jawaban Angka Hasil Perhitungan:</span>
                </label>

                {currentQuestion.number === 14 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      Tuliskan kedua nilai hasil perhitungan (a. Konsentrasi Molar Cl⁻ dan b. Kadar Cl⁻):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          a. Konsentrasi Cl⁻ (Molar):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: 0.0248"
                            value={answersState[currentQuestion.id]?.shortAnswerText || ''}
                            onChange={(e) => handleShortAnswerChange(currentQuestion.id, e.target.value)}
                            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                          />
                          <span className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">M</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          b. Kadar Cl⁻ (mg/L):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: 879.16"
                            value={answersState[currentQuestion.id]?.subQuestionAnswers?.['kadar'] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnswersState(prev => {
                                const exist = prev[currentQuestion.id] || { questionId: currentQuestion.id };
                                return {
                                  ...prev,
                                  [currentQuestion.id]: {
                                    ...exist,
                                    subQuestionAnswers: {
                                      ...(exist.subQuestionAnswers || {}),
                                      kadar: val
                                    }
                                  }
                                };
                              });
                            }}
                            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                          />
                          <span className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">mg/L</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="text"
                      placeholder={currentQuestion.number === 10 ? 'Contoh: 25.0' : currentQuestion.number === 11 ? 'Contoh: 2.50' : 'Contoh: 50'}
                      value={answersState[currentQuestion.id]?.shortAnswerText || ''}
                      onChange={(e) => handleShortAnswerChange(currentQuestion.id, e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                    {currentQuestion.unit && (
                      <span className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                        {currentQuestion.unit}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {currentQuestion.calculationPrompt || 'Tuliskan Perhitungan Singkat Anda:'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan rumus dan langkah perhitungan singkat Anda di sini..."
                    value={answersState[currentQuestion.id]?.shortAnswerCalculation || ''}
                    onChange={(e) => handleShortAnswerCalculationChange(currentQuestion.id, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Essay / Limited Response */}
          {currentQuestion.type === 'essay' && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-300">
                  Tuliskan Evaluasi & Jawaban Uraian Terbatas Anda:
                </label>

                {/* Tombol Dikte Suara (Speech-to-Text) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDictating && dictatingTarget === 'essay') {
                      stopSpeechRecognition();
                    } else {
                      startSpeechRecognition('essay');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    isDictating && dictatingTarget === 'essay'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                  title="Klik untuk mendiktekan jawaban secara lisan menggunakan mikrofon"
                >
                  <Mic className={`w-3.5 h-3.5 ${isDictating && dictatingTarget === 'essay' ? 'animate-bounce text-white' : 'text-emerald-400'}`} />
                  <span>
                    {isDictating && dictatingTarget === 'essay'
                      ? '🔴 Sedang Mendengarkan... (Klik Selesai)'
                      : '🎤 Dikte Suara (Speech-to-Text)'}
                  </span>
                </button>
              </div>

              {isDictating && dictatingTarget === 'essay' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                  <span>Silakan berbicara dalam Bahasa Indonesia. Ucapan Anda langsung diketik ke dalam kotak teks di bawah secara otomatis.</span>
                </div>
              )}

              <textarea
                rows={5}
                placeholder="Berikan jawaban berdasarkan data, konsep kimia, prosedur laboratorium, K3, dan pertimbangan mutu yang relevan... (Ketik teks atau gunakan tombol 'Dikte Suara' di atas)"
                value={answersState[currentQuestion.id]?.essayAnswer || ''}
                onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
              />
            </div>
          )}

          {/* 6. Subquestions / Essay Text Areas */}
          {(currentQuestion.type === 'essay_subquestions' || currentQuestion.type === 'scenario_assessment') && currentQuestion.subQuestions && (
            <div className="space-y-4 pt-2">
              <label className="block text-xs font-bold text-slate-300">Tuliskan Jawaban Runtut / Tindakan Studi Kasus:</label>

              {currentQuestion.subQuestions.map((sub, sIdx) => {
                const currentAns = answersState[currentQuestion.id]?.subQuestionAnswers?.[sub.id] || '';

                return (
                  <div key={sub.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-emerald-400">
                        Subsoal {String.fromCharCode(97 + sIdx).toUpperCase()}: {sub.text}
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Ketikkan langkah pengerjaan atau ulasan Anda di sini..."
                      value={currentAns}
                      onChange={(e) => handleSubAnswerChange(currentQuestion.id, sub.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Widget Pengumpulan Bukti Multimodal (HANYA UNTUK SOAL ESAI / URAIAN) */}
          {(currentQuestion.type === 'essay' || currentQuestion.type === 'essay_subquestions' || currentQuestion.type === 'scenario_assessment') && (
            <MultimodalUploader
              questionId={currentQuestion.id}
              studentNis={studentNis}
              studentName={studentName}
              examId={exam.id}
              evidences={answersState[currentQuestion.id]?.multimodalEvidences || []}
              onTextTranscribed={(transcribedText) => {
                setAnswersState((prev) => {
                  const existing = prev[currentQuestion.id] || { questionId: currentQuestion.id };
                  const currentEssay = existing.essayAnswer || '';
                  const nextEssay = currentEssay
                    ? (currentEssay.includes(transcribedText) ? currentEssay : `${currentEssay}\n${transcribedText}`)
                    : transcribedText;
                  return {
                    ...prev,
                    [currentQuestion.id]: {
                      ...existing,
                      essayAnswer: nextEssay
                    }
                  };
                });
              }}
              onChangeEvidences={(newEvids) => {
                setAnswersState((prev) => {
                  const existing = prev[currentQuestion.id] || { questionId: currentQuestion.id };
                  return {
                    ...prev,
                    [currentQuestion.id]: {
                      ...existing,
                      multimodalEvidences: newEvids
                    }
                  };
                });
              }}
            />
          )}

          {/* Prev / Next Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-800 gap-2">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Sebelumnya</span>
            </button>

            {currentQuestionIndex < questionsList.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-md touch-manipulation"
              >
                <span>Berikutnya</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmSubmitModal(true)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 touch-manipulation"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>Kirim Jawaban</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Submit Modal */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <ShieldAlert className="w-8 h-8" />
              <h3 className="text-base font-bold text-white">Konfirmasi Pengiriman Ujian</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menyelesaikan dan mengirimkan jawaban instrumen tes teknis kimia ini? Sistem akan menghitung skor otomatis per dimensi kompetensi.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Periksa Lagi
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

