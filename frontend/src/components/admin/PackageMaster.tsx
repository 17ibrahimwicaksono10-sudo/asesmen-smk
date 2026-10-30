import React, { useState } from 'react';
import { QuestionPackage, QuestionItem, SubQuestion, QuestionCategory, QuestionType } from '../../types';
import { FileQuestion, Plus, Edit2, Trash2, ChevronRight, CheckCircle, Clock, BookOpen, Layers, Sparkles, AlertCircle, GripVertical, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface PackageMasterProps {
  packages: QuestionPackage[];
  onAddPackage: (pkg: QuestionPackage) => void;
  onUpdatePackage: (pkg: QuestionPackage) => void;
  onDeletePackage: (pkgId: string) => void;
  authorName: string;
}

export const PackageMaster: React.FC<PackageMasterProps> = ({
  packages,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
  authorName
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | QuestionCategory>('ALL');
  const [selectedPackage, setSelectedPackage] = useState<QuestionPackage | null>(null);

  // Package Modal
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<QuestionPackage | null>(null);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCode, setPkgCode] = useState('');
  const [pkgCategory, setPkgCategory] = useState<QuestionCategory>('teknis_kimia');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgDuration, setPkgDuration] = useState(60);
  const [pkgError, setPkgError] = useState('');

  // Question Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [qCode, setQCode] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qStimulus, setQStimulus] = useState('');
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('multiple_choice');
  const [qRubricGuide, setQRubricGuide] = useState('');
  
  // Points / Bobot Soal state
  const [qPoints, setQPoints] = useState<number>(10);

  // Short Answer & Calculation state
  const [qShortAnswerKey, setQShortAnswerKey] = useState('');
  const [qUnit, setQUnit] = useState('');
  const [qSampleAnswer, setQSampleAnswer] = useState('');
  
  // MCQ state (Pilgan Sederhana)
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [singleCorrectIdx, setSingleCorrectIdx] = useState<number>(0);
  const [mcqScoringMap, setMcqScoringMap] = useState<Record<string, number>>({ A: 3, B: 5, C: 2, D: 4, E: 1 });
  
  // Complex MCQ state (Pilgan Kompleks - Checkbox Multi Kunci Benar)
  const [complexMcqOptions, setComplexMcqOptions] = useState<string[]>(['', '', '', '']);
  const [complexCorrectIdxs, setComplexCorrectIdxs] = useState<number[]>([0, 2]);
  
  // Statements state
  const [statementsList, setStatementsList] = useState<{ id: string; text: string; correctAnswer: string }[]>([
    { id: 'stmt-1', text: 'Pernyataan 1...', correctAnswer: 'Sesuai' },
    { id: 'stmt-2', text: 'Pernyataan 2...', correctAnswer: 'Tidak Sesuai' }
  ]);
  
  // Matching state (Menjodohkan)
  const [matchingPairs, setMatchingPairs] = useState<{ id: string; columnAText: string; correctMatch: string }[]>([
    { id: 'match-1', columnAText: 'Item Kolom A (misal: Pipet Tetes)', correctMatch: 'Pasangan Kolom B (misal: Memindahkan cairan sampel kecil)' }
  ]);

  // Sub-questions state (Essay)
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([]);

  // Keep selectedPackage in sync when packages prop updates
  React.useEffect(() => {
    if (selectedPackage) {
      const found = packages.find(p => p.id === selectedPackage.id);
      if (found) setSelectedPackage(found);
    }
  }, [packages]);

  // Filtering
  const filteredPackages = packages.filter(p =>
    activeCategoryFilter === 'ALL' || p.category === activeCategoryFilter
  );

  const openAddPkgModal = () => {
    setEditingPkg(null);
    setPkgTitle('');
    setPkgCode(`PKG-${Math.floor(100 + Math.random() * 900)}`);
    setPkgCategory('teknis_kimia');
    setPkgDescription('');
    setPkgDuration(60);
    setPkgError('');
    setShowPkgModal(true);
  };

  const openEditPkgModal = (p: QuestionPackage) => {
    setEditingPkg(p);
    setPkgTitle(p.title);
    setPkgCode(p.code);
    setPkgCategory(p.category);
    setPkgDescription(p.description);
    setPkgDuration(p.durationMinutes);
    setPkgError('');
    setShowPkgModal(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim() || !pkgCode.trim()) {
      setPkgError('Judul dan Kode Paket Soal wajib diisi.');
      return;
    }

    if (editingPkg) {
      const updated: QuestionPackage = {
        ...editingPkg,
        title: pkgTitle.trim(),
        code: pkgCode.trim(),
        category: pkgCategory,
        description: pkgDescription.trim(),
        durationMinutes: pkgDuration
      };
      onUpdatePackage(updated);
      if (selectedPackage?.id === updated.id) setSelectedPackage(updated);
    } else {
      const newPkg: QuestionPackage = {
        id: `pkg-${Date.now()}`,
        code: pkgCode.trim(),
        title: pkgTitle.trim(),
        description: pkgDescription.trim(),
        category: pkgCategory,
        durationMinutes: pkgDuration,
        totalQuestions: 0,
        questions: [],
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: authorName
      };
      onAddPackage(newPkg);
      setSelectedPackage(newPkg);
    }

    setShowPkgModal(false);
  };

  const openAddQuestionModal = () => {
    if (!selectedPackage) return;
    setEditingQuestion(null);
    setQCode(`Q-${selectedPackage.questions.length + 1}`);
    setQTopic('');
    setQStimulus('');
    setQText('');
    setQType('multiple_choice');
    setQRubricGuide('Pedoman Penilaian: Skor Maksimum 100.');
    setQPoints(10);
    setQShortAnswerKey('');
    setQUnit('');
    setQSampleAnswer('');
    if (selectedPackage.category === 'employability') {
      setQType('multiple_choice');
      setQPoints(5);
      setQRubricGuide('Respons Paling Profesional: B (Skor 5). Bobot: A=3, B=5, C=2, D=4, E=1.');
      setMcqOptions([
        'A. Tindakan alternatif A...',
        'B. Tindakan alternatif B...',
        'C. Tindakan alternatif C...',
        'D. Tindakan alternatif D...',
        'E. Tindakan alternatif E...'
      ]);
      setMcqScoringMap({ A: 3, B: 5, C: 2, D: 4, E: 1 });
      setSingleCorrectIdx(1);
    } else {
      setMcqOptions(['Pilihan A...', 'Pilihan B...', 'Pilihan C...', 'Pilihan D...']);
      setSingleCorrectIdx(0);
      setMcqScoringMap({ A: 3, B: 5, C: 2, D: 4, E: 1 });
    }
    setComplexMcqOptions([
      'Indikator PP berwarna merah muda dalam suasana basa',
      'Lakmus biru berubah menjadi merah dalam suasana asam',
      'NaOH 0.1 N ditimbang menggunakan neraca analitik',
      'Asam Oksalat tidak memerlukan standarisasi lanjutan'
    ]);
    setComplexCorrectIdxs([0, 1, 2]);
    setStatementsList([
      { id: `stmt-${Date.now()}-1`, text: 'Indikator PP berwarna merah muda dalam larutan basa', correctAnswer: 'Sesuai' },
      { id: `stmt-${Date.now()}-2`, text: 'Titrasi dilakukan tanpa menggunakan buret bersih', correctAnswer: 'Tidak Sesuai' }
    ]);
    setMatchingPairs([
      { id: `m-${Date.now()}-1`, columnAText: 'Indikator Fenolftalein (PP)', correctMatch: 'Trayek pH 8.3 - 10.0' },
      { id: `m-${Date.now()}-2`, columnAText: 'Indikator Metil Merah', correctMatch: 'Trayek pH 4.4 - 6.2' }
    ]);
    setSubQuestions([
      {
        id: `sub-a-${Date.now()}`,
        text: 'Bagian A: Uraikan prosedur dasar penanganan atau kalkulasi terkait.',
        points: 50,
        answerKey: 'Kunci jawaban standar industri.',
        rubric: '50 poin jika langkah runtut dan jawaban tepat.'
      },
      {
        id: `sub-b-${Date.now()}`,
        text: 'Bagian B: Analisis risiko keselamatan atau troubleshooting jika terjadi deviasi.',
        points: 50,
        answerKey: 'Kunci jawaban troubleshooting & APD.',
        rubric: '50 poin jika mencakup mitigasi bahaya & laporan supervisor.'
      }
    ]);
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q: QuestionItem) => {
    if (!selectedPackage) return;
    setEditingQuestion(q);
    setQCode(q.code || '');
    setQTopic(q.topic || '');
    setQStimulus(q.stimulus || '');
    setQText(q.questionText || '');
    setQType(q.type || 'multiple_choice');
    setQRubricGuide(q.rubricGuide || '');
    setQShortAnswerKey(q.shortAnswerKey || '');
    setQUnit(q.unit || '');
    setQSampleAnswer(q.sampleAnswer || '');
    setQPoints(q.points ?? q.maxScore ?? 10);

    // 1. Multiple Choice
    if (q.options && q.options.length > 0) {
      setMcqOptions([...q.options]);
      const foundIdx = q.options.findIndex(opt => opt === q.correctAnswer);
      setSingleCorrectIdx(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setMcqOptions(['Pilihan A...', 'Pilihan B...', 'Pilihan C...', 'Pilihan D...']);
      setSingleCorrectIdx(0);
    }

    if ((q as any).scoringMap) {
      setMcqScoringMap({ ...(q as any).scoringMap });
    } else {
      setMcqScoringMap({ A: 3, B: 5, C: 2, D: 4, E: 1 });
    }

    // 2. Complex MCQ
    if (q.options && q.options.length > 0) {
      setComplexMcqOptions([...q.options]);
      if (q.correctAnswers && q.correctAnswers.length > 0) {
        const correctIdxs = q.correctAnswers.map(ans => q.options!.indexOf(ans)).filter(i => i >= 0);
        setComplexCorrectIdxs(correctIdxs.length > 0 ? correctIdxs : [0]);
      } else {
        setComplexCorrectIdxs([0]);
      }
    } else {
      setComplexMcqOptions([
        'Pilihan A...',
        'Pilihan B...',
        'Pilihan C...',
        'Pilihan D...'
      ]);
      setComplexCorrectIdxs([0, 1]);
    }

    // 3. Statements
    if (q.statements && q.statements.length > 0) {
      setStatementsList(q.statements.map(s => ({ id: s.id, text: s.text, correctAnswer: s.correctAnswer })));
    } else {
      setStatementsList([
        { id: `stmt-${Date.now()}-1`, text: 'Pernyataan 1...', correctAnswer: 'Sesuai' },
        { id: `stmt-${Date.now()}-2`, text: 'Pernyataan 2...', correctAnswer: 'Tidak Sesuai' }
      ]);
    }

    // 4. Matching
    if (q.matchingColumnA && q.matchingColumnA.length > 0) {
      setMatchingPairs(q.matchingColumnA.map(item => ({
        id: item.id,
        columnAText: item.columnAText,
        correctMatch: item.correctMatch
      })));
    } else {
      setMatchingPairs([
        { id: `m-${Date.now()}-1`, columnAText: 'Item Kolom A', correctMatch: 'Pasangan Kolom B' }
      ]);
    }

    // 5. SubQuestions (Essay / Scenario)
    if (q.subQuestions && q.subQuestions.length > 0) {
      setSubQuestions(q.subQuestions.map(sq => ({
        id: sq.id,
        text: sq.text,
        points: sq.points,
        answerKey: sq.answerKey,
        rubric: sq.rubric || ''
      })));
    } else {
      setSubQuestions([
        {
          id: `sub-a-${Date.now()}`,
          text: 'Uraikan prosedur atau kalkulasi terkait.',
          points: 50,
          answerKey: 'Kunci jawaban standar.',
          rubric: 'Pedoman rubrik skor.'
        }
      ]);
    }

    setShowQuestionModal(true);
  };

  const handleAddMcqOption = () => {
    setMcqOptions(prev => [...prev, `Pilihan ${String.fromCharCode(65 + prev.length)}...`]);
  };

  const handleDeleteMcqOption = (idx: number) => {
    if (mcqOptions.length <= 2) return;
    const next = mcqOptions.filter((_, i) => i !== idx);
    setMcqOptions(next);
    if (singleCorrectIdx >= next.length) {
      setSingleCorrectIdx(next.length - 1);
    }
  };

  const handleAddComplexMcqOption = () => {
    setComplexMcqOptions(prev => [...prev, `Pilihan ${String.fromCharCode(65 + prev.length)}...`]);
  };

  const handleDeleteComplexMcqOption = (idx: number) => {
    if (complexMcqOptions.length <= 2) return;
    const next = complexMcqOptions.filter((_, i) => i !== idx);
    setComplexMcqOptions(next);
    setComplexCorrectIdxs(prev => prev.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i)));
  };

  const handleAddSubQuestionRow = () => {
    setSubQuestions(prev => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        text: 'Bagian Subsoal Baru...',
        points: 25,
        answerKey: 'Kunci Jawaban...',
        rubric: 'Pedoman skor...'
      }
    ]);
  };

  const handleDeleteSubQuestionRow = (idx: number) => {
    if (subQuestions.length <= 1) return;
    setSubQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddStatementRow = () => {
    setStatementsList(prev => [
      ...prev,
      {
        id: `stmt-${Date.now()}`,
        text: 'Pernyataan baru...',
        correctAnswer: 'Sesuai'
      }
    ]);
  };

  const handleAddMatchingRow = () => {
    setMatchingPairs(prev => [
      ...prev,
      {
        id: `match-${Date.now()}`,
        columnAText: 'Item Kolom A...',
        correctMatch: 'Pasangan Kolom B...'
      }
    ]);
  };

  const handleDeleteMatchingRow = (idx: number) => {
    if (matchingPairs.length <= 1) return;
    setMatchingPairs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !qText.trim() || !qTopic.trim()) return;

    const questionPayload: QuestionItem = {
      ...(editingQuestion || {}),
      id: editingQuestion ? editingQuestion.id : `q-${Date.now()}`,
      code: qCode.trim() || (editingQuestion ? editingQuestion.code : `Q-${selectedPackage.questions.length + 1}`),
      category: selectedPackage.category,
      topic: qTopic.trim(),
      stimulus: qStimulus.trim() || undefined,
      questionText: qText.trim(),
      type: qType,
      rubricGuide: qRubricGuide,
    };

    if (qType === 'multiple_choice') {
      questionPayload.options = mcqOptions.map((o, idx) => o.trim() || `Pilihan ${String.fromCharCode(65 + idx)}`);
      if (selectedPackage.category === 'employability' || (editingQuestion as any)?.scoringMap) {
        (questionPayload as any).scoringMap = { ...mcqScoringMap };
        const bestLetter = Object.entries(mcqScoringMap).find(([_, s]) => s === 5)?.[0] || 'A';
        const bestIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(bestLetter);
        questionPayload.correctAnswer = questionPayload.options[bestIdx >= 0 ? bestIdx : 0];
        questionPayload.points = 5;
        questionPayload.maxScore = 5;
        if (!qRubricGuide.trim() || qRubricGuide.includes('Maksimum 100')) {
          questionPayload.rubricGuide = `Respons Paling Profesional: ${bestLetter} (Skor 5). Bobot: ` +
            Object.entries(mcqScoringMap).map(([k, v]) => `${k}=${v}`).join(', ') + '.';
        }
      } else {
        questionPayload.correctAnswer = questionPayload.options[singleCorrectIdx] || questionPayload.options[0];
        questionPayload.points = qPoints || 1;
        questionPayload.maxScore = questionPayload.points;
      }
    } else if (qType === 'complex_mcq') {
      const opts = complexMcqOptions.map((o, idx) => o.trim() || `Pilihan ${String.fromCharCode(65 + idx)}`);
      questionPayload.options = opts;
      const selectedCorrect = complexCorrectIdxs.map(idx => opts[idx]).filter(Boolean);
      questionPayload.correctAnswers = selectedCorrect;
      questionPayload.correctAnswer = selectedCorrect.join(', ');
      questionPayload.points = qPoints || 5;
      questionPayload.maxScore = questionPayload.points;
    } else if (qType === 'matching') {
      questionPayload.matchingColumnA = matchingPairs.map(p => ({
        id: p.id,
        columnAText: p.columnAText,
        correctMatch: p.correctMatch
      }));
      questionPayload.matchingColumnB = matchingPairs.map(p => p.correctMatch);
      questionPayload.points = qPoints || 5;
      questionPayload.maxScore = questionPayload.points;
    } else if (qType === 'short_answer') {
      questionPayload.shortAnswerKey = qShortAnswerKey.trim();
      questionPayload.unit = qUnit.trim();
      questionPayload.sampleAnswer = qSampleAnswer.trim();
      questionPayload.points = qPoints || 10;
      questionPayload.maxScore = questionPayload.points;
    } else if (qType === 'essay') {
      questionPayload.sampleAnswer = qSampleAnswer.trim();
      questionPayload.rubricGuide = qRubricGuide.trim();
      questionPayload.points = qPoints || 10;
      questionPayload.maxScore = questionPayload.points;
    } else {
      // essay_subquestions or scenario_assessment
      questionPayload.subQuestions = subQuestions;
      const totalPoints = subQuestions.reduce((sum, sq) => sum + (sq.points || 0), 0);
      questionPayload.points = totalPoints;
      questionPayload.maxScore = totalPoints;
    }

    let updatedQuestions: QuestionItem[];
    if (editingQuestion) {
      updatedQuestions = selectedPackage.questions.map(q => q.id === editingQuestion.id ? questionPayload : q);
    } else {
      updatedQuestions = [...selectedPackage.questions, questionPayload];
    }

    const updatedPackage: QuestionPackage = {
      ...selectedPackage,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length
    };

    onUpdatePackage(updatedPackage);
    setSelectedPackage(updatedPackage);
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  // Question Reordering Handlers (Move Up / Down & Drag-and-Drop)
  const [draggedQIndex, setDraggedQIndex] = useState<number | null>(null);

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    if (!selectedPackage) return;
    if (toIndex < 0 || toIndex >= selectedPackage.questions.length) return;
    const reordered = [...selectedPackage.questions];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);

    const updatedPackage: QuestionPackage = {
      ...selectedPackage,
      questions: reordered
    };
    onUpdatePackage(updatedPackage);
    setSelectedPackage(updatedPackage);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedQIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedQIndex === null || draggedQIndex === targetIndex) return;
    handleMoveQuestion(draggedQIndex, targetIndex);
    setDraggedQIndex(null);
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!selectedPackage) return;
    const updatedQuestions = selectedPackage.questions.filter(q => q.id !== qId);
    const updatedPackage: QuestionPackage = {
      ...selectedPackage,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length
    };
    onUpdatePackage(updatedPackage);
    setSelectedPackage(updatedPackage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-400" />
            Master Bank Soal & Struktur Paket Asesmen
          </h2>
          <p className="text-xs text-slate-400">Pengelolaan hirarki: Paket Soal → Soal / Kasus → Subsoal → Kunci Jawaban & Rubrik DUDI.</p>
        </div>

        <button
          onClick={openAddPkgModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Paket Soal Baru</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategoryFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Semua Kategori ({packages.length})
        </button>
        <button
          onClick={() => setActiveCategoryFilter('teknis_kimia')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategoryFilter === 'teknis_kimia'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Kemampuan Teknis Kimia ({packages.filter(p => p.category === 'teknis_kimia').length})
        </button>
        <button
          onClick={() => setActiveCategoryFilter('employability')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategoryFilter === 'employability'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Employability Skills / Non-Test ({packages.filter(p => p.category === 'employability').length})
        </button>
      </div>

      {/* Main Split Layout: Packages List vs Detail Question Hierarchy */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Package List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Daftar Paket Soal Terdaftar</h3>

          {filteredPackages.map(pkg => {
            const isSelected = selectedPackage?.id === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500 ring-1 ring-blue-500 shadow-xl'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    pkg.category === 'teknis_kimia'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {pkg.code} • {pkg.category === 'teknis_kimia' ? 'Teknis Kimia' : 'Employability'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditPkgModal(pkg); }}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                      title="Ubah Paket"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus paket soal "${pkg.title}"?`)) onDeletePackage(pkg.id);
                      }}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-rose-400"
                      title="Hapus Paket"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white leading-snug">{pkg.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{pkg.description}</p>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {pkg.durationMinutes} Menit
                  </span>
                  <span className="font-semibold text-blue-400">
                    {pkg.questions.length} Pertanyaan Master
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Question Hierarchy View (8 cols) */}
        <div className="lg:col-span-8">
          {selectedPackage ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Package Banner Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedPackage.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Dibuat oleh: {selectedPackage.createdBy}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedPackage.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{selectedPackage.description}</p>
                </div>

                <button
                  onClick={openAddQuestionModal}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Soal / Kasus</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Hirarki Pertanyaan, Subsoal & Rubrik Jawaban ({selectedPackage.questions.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                    Urutan Soal: Seret (Drag) atau gunakan tombol ▲/▼ & Dropdown No.
                  </span>
                </div>

                {selectedPackage.questions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950 p-6 space-y-2">
                    <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold text-white">Belum Ada Soal di Paket Ini</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Klik tombol "Tambah Soal / Kasus" di atas untuk menambahkan pertanyaan lengkap dengan sub-pertanyaan, kunci jawaban, dan rubrik penilaian.
                    </p>
                  </div>
                ) : (
                  selectedPackage.questions.map((q, qIndex) => (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, qIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, qIndex)}
                      className={`p-4 rounded-xl bg-slate-950 border transition-all space-y-3 ${
                        draggedQIndex === qIndex
                          ? 'border-blue-500 bg-slate-900/80 opacity-60 shadow-lg'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        {/* Drag Handle & Topic & Code */}
                        <div className="flex items-center gap-2">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                            title="Tahan dan seret (drag) untuk memindahkan urutan soal"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                            {qIndex + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white">{q.topic}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({q.code})</span>
                          </div>
                        </div>

                        {/* Reordering Control Actions */}
                        <div className="flex items-center gap-1.5">
                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIndex, qIndex - 1)}
                            disabled={qIndex === 0}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title={`Geser Naik (Soal No. ${qIndex + 1} ke No. ${qIndex})`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIndex, qIndex + 1)}
                            disabled={qIndex === selectedPackage.questions.length - 1}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title={`Geser Turun (Soal No. ${qIndex + 1} ke No. ${qIndex + 2})`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct Jump Dropdown */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-1">
                            <span className="hidden sm:inline">Pindah ke:</span>
                            <select
                              value={qIndex + 1}
                              onChange={(e) => handleMoveQuestion(qIndex, Number(e.target.value) - 1)}
                              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-blue-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                              title="Pindah langsung ke posisi nomor yang dipilih"
                            >
                              {selectedPackage.questions.map((_, idx) => (
                                <option key={idx} value={idx + 1}>
                                  No. {idx + 1}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Edit Question */}
                          <button
                            type="button"
                            onClick={() => openEditQuestionModal(q)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/30 cursor-pointer transition-colors ml-1"
                            title="Edit Soal, Kunci Jawaban & Rubrik"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Question */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 cursor-pointer transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stimulus Kontekstual Soal (jika ada) */}
                      {q.stimulus && (
                        <div className="ml-8 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px] uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Stimulus Kontekstual Laboratorium:</span>
                          </div>
                          <p className="text-blue-100/90 text-xs leading-relaxed font-serif whitespace-pre-wrap">
                            {q.stimulus}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-slate-200 leading-relaxed pl-8 font-medium bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        {q.questionText}
                      </p>

                      {/* Sub-Questions & Rubric Breakdown for essay_subquestions or scenario_assessment */}
                      {q.subQuestions && q.subQuestions.length > 0 && (
                        <div className="pl-8 space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-slate-400">Rincian Subsoal, Kunci Jawaban & Rubrik Skor:</div>
                          {q.subQuestions.map((sub, sIdx) => (
                            <div key={sub.id} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-emerald-300">Subsoal {String.fromCharCode(97 + sIdx).toUpperCase()}: {sub.text}</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                  {sub.points} Poin
                                </span>
                              </div>
                              <div className="text-slate-300 text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
                                <strong>Kunci Jawaban:</strong> {sub.answerKey}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                <strong>Pedoman Rubrik Skor:</strong> {sub.rubric}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Statements Breakdown for complex_mcq */}
                      {q.type === 'complex_mcq' && q.statements && (
                        <div className="pl-8 space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-purple-400">Daftar Pernyataan Pilihan Ganda Kompleks:</div>
                          {q.statements.map((stmt) => (
                            <div key={stmt.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex justify-between items-center gap-2">
                              <span className="text-slate-300 font-medium">{stmt.text}</span>
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold shrink-0">
                                Kunci: {stmt.correctAnswer}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matching Breakdown for matching */}
                      {q.type === 'matching' && q.matchingColumnA && (
                        <div className="pl-8 space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-amber-400">Pasangan Menjodohkan (Kolom A → Kolom B):</div>
                          {q.matchingColumnA.map((item) => (
                            <div key={item.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex justify-between items-center gap-2">
                              <span className="text-slate-300 font-medium">Kolom A: {item.columnAText}</span>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                                Pasangan: {item.correctMatch}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Short Answer Key */}
                      {q.type === 'short_answer' && (
                        <div className="pl-8 space-y-1.5 pt-1 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-amber-300 font-mono">
                            <strong>Kunci Jawaban Angka:</strong> {q.shortAnswerKey} {q.unit}
                          </div>
                          {q.sampleAnswer && (
                            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
                              <strong>Langkah Perhitungan Standar:</strong> {q.sampleAnswer}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Essay Sample Answer */}
                      {q.type === 'essay' && q.sampleAnswer && (
                        <div className="pl-8 space-y-1.5 pt-1 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-emerald-300">
                            <strong>Contoh Jawaban / Rubrik Kunci:</strong> {q.sampleAnswer}
                          </div>
                        </div>
                      )}

                      {/* Multiple Choice Options */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="pl-8 space-y-1.5 pt-1 text-xs">
                          {(q as any).scoringMap ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-400">
                                  🔑 Rubrik Penskoran Setiap Kunci Pilihan (Skala 1–5):
                                </span>
                                <span className="text-[10px] text-slate-400">Setiap alternatif tindakan memiliki bobot nilai 1–5</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {q.options.map((opt, oIdx) => {
                                  const letter = String.fromCharCode(65 + oIdx);
                                  const score = (q as any).scoringMap?.[letter] || (opt === q.correctAnswer ? 5 : 1);
                                  const isBest = score === 5;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                                        isBest
                                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                                          : score === 4
                                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                                          : score === 3
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                          : 'bg-slate-900 border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <span className="line-clamp-2">{opt}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                        isBest
                                          ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                                          : score === 4
                                          ? 'bg-blue-500/20 text-blue-300'
                                          : score === 3
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}>
                                        Skor: {score} {isBest && '★ Paling Profesional'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[11px] font-bold text-blue-400">Pilihan Jawaban:</div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {q.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className={`p-2 rounded border text-[11px] ${
                                      opt === q.correctAnswer
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                                        : 'bg-slate-900 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {opt} {opt === q.correctAnswer && '(KUNCI)'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
              <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">Pilih Paket Soal</div>
              <p className="text-xs text-slate-400">Klik salah satu paket soal di sebelah kiri untuk melihat dan mengelola struktur soalnya.</p>
            </div>
          )}
        </div>
      </div>

      {/* Package Add/Edit Modal */}
      {showPkgModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingPkg ? 'Edit Paket Soal Master' : 'Buat Paket Soal Baru'}
            </h3>

            {pkgError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{pkgError}</span>
              </div>
            )}

            <form onSubmit={handleSavePackage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Paket Soal</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Asesmen Titrasi Volumetri & HPLC"
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Paket</label>
                  <input
                    type="text"
                    required
                    value={pkgCode}
                    onChange={(e) => setPkgCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori Soal</label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value as QuestionCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="teknis_kimia">Kemampuan Teknis Kimia</option>
                    <option value="employability">Employability Skills (Non-Test)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Singkat Paket</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi cakupan kompetensi industri..."
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  min="15"
                  value={pkgDuration}
                  onChange={(e) => setPkgDuration(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPkgModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Add Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {editingQuestion ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
              {editingQuestion ? `Edit Soal (${editingQuestion.code}) - ${editingQuestion.topic}` : 'Tambah Pertanyaan / Kasus Studi Baru'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Soal</label>
                  <input
                    type="text"
                    value={qCode}
                    onChange={(e) => setQCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Topik / Murni Kompetensi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Standarisasi NaOH dengan Asam Oksalat"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Jenis Soal Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis / Tipe Soal</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="multiple_choice">Pilihan Ganda Sederhana (1 Jawaban Benar)</option>
                  <option value="complex_mcq">Pilihan Ganda Kompleks (Banyak Jawaban Benar)</option>
                  <option value="matching">Menjodohkan (Pasangan Kolom A & Kolom B)</option>
                  <option value="short_answer">Isian Singkat / Angka Perhitungan</option>
                  <option value="essay">Uraian / Essay Tunggal</option>
                  <option value="essay_subquestions">Essay / Uraian & Subsoal Berjenjang</option>
                  <option value="scenario_assessment">Studi Kasus & Skenario Sikap Kerja</option>
                </select>
              </div>

              {/* Kolom Stimulus / Wacana Kontekstual */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Stimulus / Teks Wacana Kontekstual (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Wacana narasi/skenario lab yang mendasari soal ini
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Contoh: Laboratorium QC melakukan kegiatan persiapan larutan dan analisis sampel. Bahan kimia yang digunakan meliputi NaOH padat, HNO₃ pekat..."
                  value={qStimulus}
                  onChange={(e) => setQStimulus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-serif leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Teks Pertanyaan / Studi Kasus Utama</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Seorang analis QC mendapati data pengujian..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Dynamic Builder Based on Question Type */}

              {/* 1. PILIHAN GANDA SEDERHANA / NON-TES EMPLOYABILITY */}
              {qType === 'multiple_choice' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      {selectedPackage?.category === 'employability' ? (
                        <>
                          <span className="text-xs font-bold text-amber-400 block">
                            Rubrik Penskoran Setiap Kunci Pilihan (Skala 1 - 5 Non-Tes):
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Setiap opsi (A–E) memiliki skor 1 s.d. 5. Skor 5 otomatis menjadi kunci acuan profesional terbaik.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-blue-400 block">
                            Daftar Pilihan Jawaban (Pilih 1 Kunci Jawaban Benar):
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Pilih tombol radio pada pilihan yang menjadi kunci jawaban benar.
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedPackage?.category !== 'employability' ? (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-slate-400 font-medium">Poin:</label>
                          <input
                            type="number"
                            value={qPoints}
                            onChange={(e) => setQPoints(parseInt(e.target.value) || 0)}
                            className="w-16 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-blue-400 font-bold text-xs text-center"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                          Maks: 5 Poin / Butir
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleAddMcqOption}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" /> Tambah Pilihan
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {mcqOptions.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isEmployability = selectedPackage?.category === 'employability';
                      const optScore = mcqScoringMap[letter] !== undefined ? mcqScoringMap[letter] : (idx === singleCorrectIdx ? 5 : 1);

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          {!isEmployability ? (
                            <input
                              type="radio"
                              name="correctSingleChoice"
                              checked={singleCorrectIdx === idx}
                              onChange={() => setSingleCorrectIdx(idx)}
                              className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-bold">Skor:</span>
                              <select
                                value={optScore}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setMcqScoringMap(prev => ({ ...prev, [letter]: val }));
                                  if (val === 5) {
                                    setSingleCorrectIdx(idx);
                                  }
                                }}
                                className="bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs rounded px-1.5 py-0.5 focus:outline-none"
                              >
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <option key={s} value={s}>
                                    {s} Poin {s === 5 ? '(★ Profesional)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <span className="text-xs font-bold text-slate-400 w-5">{letter}.</span>
                          <input
                            type="text"
                            required
                            placeholder={`Teks Opsi Jawaban ${letter}...`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...mcqOptions];
                              copy[idx] = e.target.value;
                              setMcqOptions(copy);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                          />

                          {!isEmployability && singleCorrectIdx === idx && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                              KUNCI BENAR
                            </span>
                          )}

                          {isEmployability && optScore === 5 && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                              ★ KUNCI PROFESIONAL
                            </span>
                          )}

                          {mcqOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMcqOption(idx)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Hapus pilihan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. PILIHAN GANDA KOMPLEKS (Centang Checkbox Multi Jawaban Benar) */}
              {qType === 'complex_mcq' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-purple-400 block">
                        Daftar Pilihan Jawaban (Centang Checkbox untuk Pilihan yang BENAR):
                      </span>
                      <span className="text-[10px] text-slate-400">Guru dapat mencentang lebih dari 1 kunci jawaban benar.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-400 font-medium">Poin:</label>
                        <input
                          type="number"
                          value={qPoints}
                          onChange={(e) => setQPoints(parseInt(e.target.value) || 0)}
                          className="w-16 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-purple-400 font-bold text-xs text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddComplexMcqOption}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" /> Tambah Pilihan
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {complexMcqOptions.map((opt, idx) => {
                      const isChecked = complexCorrectIdxs.includes(idx);
                      return (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setComplexCorrectIdxs(complexCorrectIdxs.filter(i => i !== idx));
                              } else {
                                setComplexCorrectIdxs([...complexCorrectIdxs, idx]);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 bg-slate-950 border-slate-700 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-400 w-5">{String.fromCharCode(65 + idx)}.</span>
                          <input
                            type="text"
                            required
                            placeholder={`Teks Pilihan ${String.fromCharCode(65 + idx)}...`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...complexMcqOptions];
                              copy[idx] = e.target.value;
                              setComplexMcqOptions(copy);
                            }}
                            className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                          {isChecked ? (
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 shrink-0">
                              ✓ KUNCI BENAR
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic shrink-0">
                              (Salah)
                            </span>
                          )}
                          {complexMcqOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComplexMcqOption(idx)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Hapus pilihan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. MENJODOHKAN */}
              {qType === 'matching' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">Pasangan Menjodohkan (Kolom A → Kolom B):</span>
                      <span className="text-[10px] text-slate-400">Atur pasangan yang tepat antara Kolom A dan Kolom B.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-400 font-medium">Poin:</label>
                        <input
                          type="number"
                          value={qPoints}
                          onChange={(e) => setQPoints(parseInt(e.target.value) || 0)}
                          className="w-16 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400 font-bold text-xs text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMatchingRow}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" /> Tambah Pasangan
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {matchingPairs.map((pair, mIdx) => (
                      <div key={pair.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Item Kolom A #{mIdx + 1}</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Reagen Indikator PP"
                            value={pair.columnAText}
                            onChange={(e) => {
                              const copy = [...matchingPairs];
                              copy[mIdx].columnAText = e.target.value;
                              setMatchingPairs(copy);
                            }}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Pasangan Tepat Kolom B</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Trayek pH 8.3 - 10.0"
                            value={pair.correctMatch}
                            onChange={(e) => {
                              const copy = [...matchingPairs];
                              copy[mIdx].correctMatch = e.target.value;
                              setMatchingPairs(copy);
                            }}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-semibold text-xs"
                          />
                        </div>
                        {matchingPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMatchingRow(mIdx)}
                            className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors sm:self-end mb-1"
                            title="Hapus pasangan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. ISIAN SINGKAT / ANGKA PERHITUNGAN */}
              {qType === 'short_answer' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-amber-400 block">Kunci Jawaban Isian Singkat & Perhitungan:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-amber-300 font-semibold mb-1">Kunci Jawaban Nilai / Angka:</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 25.0 atau Standar"
                        value={qShortAnswerKey}
                        onChange={(e) => setQShortAnswerKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-medium mb-1">Satuan (Opsional):</label>
                      <input
                        type="text"
                        placeholder="Contoh: mL, g, %, ppm"
                        value={qUnit}
                        onChange={(e) => setQUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-medium mb-1">Bobot Skor / Poin:</label>
                      <input
                        type="number"
                        placeholder="Bobot poin"
                        value={qPoints}
                        onChange={(e) => setQPoints(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium mb-1">Langkah Perhitungan / Acuan Jawaban Lengkap:</label>
                    <textarea
                      rows={2}
                      placeholder="Prinsip: N1V1 = N2V2, substitusi, hasil akhir..."
                      value={qSampleAnswer}
                      onChange={(e) => setQSampleAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 5. ESSAY / URAIAN TUNGGAL */}
              {qType === 'essay' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-400">Kunci Jawaban Uraian & Pedoman Rubrik:</span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-slate-400 font-medium">Bobot Skor:</label>
                      <input
                        type="number"
                        value={qPoints}
                        onChange={(e) => setQPoints(parseInt(e.target.value) || 0)}
                        className="w-16 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-emerald-400 font-semibold mb-1">Kunci Acuan / Jawaban Ideal Standar:</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Uraikan poin-poin jawaban yang diharapkan dari siswa..."
                      value={qSampleAnswer}
                      onChange={(e) => setQSampleAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-amber-400 font-semibold mb-1">Pedoman Rubrik Penilaian Skor (Acuan Guru & AI DeepSeek):</label>
                    <textarea
                      rows={2}
                      placeholder="Pedoman skor, misal: Skor maks 4. Komponen: (1) Identifikasi deviasi = 1; (2) Tindakan korektif = 2; (3) Keselamatan kerja = 1..."
                      value={qRubricGuide}
                      onChange={(e) => setQRubricGuide(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 6. ESSAY / URAIAN BERJENJANG & SCENARIO */}
              {(qType === 'essay_subquestions' || qType === 'scenario_assessment') && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">Daftar Subsoal, Kunci Jawaban & Rubrik Skor:</span>
                      <span className="text-[10px] text-slate-400">Atur pertanyaan tiap bagian, kunci acuan, dan pedoman skor rubrik.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSubQuestionRow}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Tambah Subsoal
                    </button>
                  </div>

                  {subQuestions.map((sub, idx) => (
                    <div key={sub.id} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-bold text-emerald-300">Bagian Subsoal {String.fromCharCode(97 + idx).toUpperCase()}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-400 font-medium">Poin:</label>
                          <input
                            type="number"
                            placeholder="Poin"
                            value={sub.points}
                            onChange={(e) => {
                              const copy = [...subQuestions];
                              copy[idx].points = parseInt(e.target.value) || 0;
                              setSubQuestions(copy);
                            }}
                            className="w-16 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs text-center"
                          />
                          {subQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSubQuestionRow(idx)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Hapus Subsoal ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">Kalimat Pertanyaan Subsoal:</label>
                        <textarea
                          rows={2}
                          required
                          placeholder={`Pertanyaan Subsoal ${String.fromCharCode(97 + idx).toUpperCase()}...`}
                          value={sub.text}
                          onChange={(e) => {
                            const copy = [...subQuestions];
                            copy[idx].text = e.target.value;
                            setSubQuestions(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-emerald-400 mb-0.5 font-semibold">Kunci Jawaban Acuan (Standar Benar):</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Kunci Jawaban Acuan Standar Industri..."
                          value={sub.answerKey}
                          onChange={(e) => {
                            const copy = [...subQuestions];
                            copy[idx].answerKey = e.target.value;
                            setSubQuestions(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-amber-400 mb-0.5 font-semibold">Pedoman Rubrik Penilaian Skor (Acuan AI & Guru):</label>
                        <textarea
                          rows={2}
                          placeholder="Pedoman skor, misal: 30 poin jika rumus benar, 20 poin jika perhitungan tepat..."
                          value={sub.rubric || ''}
                          onChange={(e) => {
                            const copy = [...subQuestions];
                            copy[idx].rubric = e.target.value;
                            setSubQuestions(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  {editingQuestion ? 'Simpan Perubahan Soal' : 'Simpan Pertanyaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
