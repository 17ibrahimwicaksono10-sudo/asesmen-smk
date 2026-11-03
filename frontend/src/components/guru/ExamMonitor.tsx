import React, { useState } from 'react';
import { Exam, ExamSubmission, QuestionPackage, StudentAnswer, School, ClassRoom, User, MultimodalEvidence } from '../../types';
import { INITIAL_SCHOOLS } from '../../data/mockData';
import { DEFAULT_EMPLOYABILITY_PACKAGE } from '../../data/nonTestInstrument';
import { REVISED_QUESTIONS_24 } from '../../data/revisedQuestions';
import { apiGet, apiPost } from '../../services/api';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Eye,
  RefreshCw,
  Send,
  Zap,
  ShieldAlert,
  Award,
  Building2,
  GraduationCap,
  Lock,
  Volume2,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  X,
  AlertTriangle,
  FileCheck,
  Check,
  Hash,
  BookOpen,
  Clock,
  Archive,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { MultimodalReviewModal } from '../common/MultimodalReviewModal';
import { ExportExcelModal } from './ExportExcelModal';

interface ExamMonitorProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  packages: QuestionPackage[];
  schools?: School[];
  classes?: ClassRoom[];
  currentUser?: User;
  onUpdateSubmission: (updatedSubmission: ExamSubmission) => void;
}

export const ExamMonitor: React.FC<ExamMonitorProps> = ({
  exams,
  submissions,
  packages,
  schools = [],
  classes = [],
  currentUser,
  onUpdateSubmission
}) => {
  const isSchoolMatch = (s1?: string, s2?: string) => {
    if (!s1 || !s2) return false;
    const c1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const c2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  const isGuru = currentUser?.role === 'guru';
  const schoolsList = schools.length > 0 ? schools : INITIAL_SCHOOLS;
  const guruSchool = currentUser ? schoolsList.find(s =>
    (currentUser.schoolId && s.id === currentUser.schoolId) ||
    (currentUser.schoolName && isSchoolMatch(s.name, currentUser.schoolName))
  ) : undefined;

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isGuru && guruSchool ? guruSchool.id : (isGuru && currentUser?.schoolId ? currentUser.schoolId : 'ALL')
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [showMultimodalModal, setShowMultimodalModal] = useState(false);
  const [showFullViewModal, setShowFullViewModal] = useState(false);
  const [previewImageLightbox, setPreviewImageLightbox] = useState<string | null>(null);

  const [teacherFollowUpInput, setTeacherFollowUpInput] = useState('');
  const [evaluatingAi, setEvaluatingAi] = useState(false);
  const [loadingSubmissionId, setLoadingSubmissionId] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'VALIDATED' | 'ARCHIVED'>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [cleanupModalSubmission, setCleanupModalSubmission] = useState<ExamSubmission | null>(null);
  const [cleanupReason, setCleanupReason] = useState<string>('');
  const [cleanupConfirm, setCleanupConfirm] = useState<boolean>(false);

  // 1. Relasi Otoritatif Langsung ke Guru: classes.teacherId atau assignedClassIds
  const teacherAssignedClasses = classes.filter(c => {
    if (
      (c.teacherId && c.teacherId === currentUser?.id) ||
      (currentUser?.assignedClassIds && currentUser.assignedClassIds.includes(c.id)) ||
      (c.teacherName && currentUser?.name && (
        c.teacherName.toLowerCase() === currentUser.name.toLowerCase() ||
        c.teacherName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        currentUser.name.toLowerCase().includes(c.teacherName.toLowerCase())
      ))
    ) {
      return true;
    }

    const matchSchool = (guruSchool && c.schoolId === guruSchool.id) ||
      (guruSchool && isSchoolMatch(c.schoolName, guruSchool.name)) ||
      (currentUser?.schoolId && c.schoolId === currentUser.schoolId) ||
      (currentUser?.schoolName && isSchoolMatch(c.schoolName, currentUser.schoolName));
    return Boolean(matchSchool);
  });

  const availableClasses = isGuru
    ? (teacherAssignedClasses.length > 0
        ? teacherAssignedClasses
        : classes.filter(c => (guruSchool && c.schoolId === guruSchool.id) || (currentUser?.schoolId && c.schoolId === currentUser.schoolId)))
    : (classes.length > 0 ? (
        selectedSchoolId === 'ALL'
          ? classes
          : classes.filter(c => c.schoolId === selectedSchoolId || (c.schoolName && isSchoolMatch(c.schoolName, schoolsList.find(s => s.id === selectedSchoolId)?.name)))
      ) : []);

  const availableExams = exams.filter(e => {
    const matchSchool = selectedSchoolId === 'ALL' || e.schoolId === selectedSchoolId || (e.schoolName && schoolsList.find(s => s.id === selectedSchoolId)?.name && e.schoolName.toLowerCase() === schoolsList.find(s => s.id === selectedSchoolId)?.name.toLowerCase());
    const matchClass = selectedClassId === 'ALL' || e.classId === selectedClassId || (e.className && availableClasses.find(c => c.id === selectedClassId)?.name && e.className.toLowerCase() === availableClasses.find(c => c.id === selectedClassId)?.name.toLowerCase());
    return matchSchool && matchClass;
  });

  // Kumpulkan ujian historis yang ada di riwayat submission agar tidak hilang dari filter guru
  const historicalExams = React.useMemo(() => {
    const activeExamIds = new Set(exams.map(e => e.id));
    const histMap = new Map<string, { id: string; title: string; className?: string }>();
    submissions.forEach(s => {
      if (s.examId && !activeExamIds.has(s.examId) && !histMap.has(s.examId)) {
        histMap.set(s.examId, {
          id: s.examId,
          title: s.examTitle || `Ujian Historis (${s.examId.substring(0, 10)}...)`,
          className: s.className || 'Arsip Ujian'
        });
      }
    });
    return Array.from(histMap.values());
  }, [exams, submissions]);

  const isSubmissionMatchingFilters = (s: ExamSubmission) => {
    const selectedSchoolObj = schoolsList.find(sch => sch.id === selectedSchoolId);
    const matchSchool = selectedSchoolId === 'ALL' ||
      s.schoolId === selectedSchoolId ||
      (selectedSchoolObj && isSchoolMatch(s.schoolName, selectedSchoolObj.name)) ||
      (guruSchool && isSchoolMatch(s.schoolName, guruSchool.name)) ||
      (currentUser?.schoolName && isSchoolMatch(s.schoolName, currentUser.schoolName)) ||
      (isGuru && (!s.schoolId || s.schoolId === currentUser?.schoolId));

    const matchClass = selectedClassId === 'ALL' ||
      s.classId === selectedClassId ||
      (s.className && availableClasses.find(c => c.id === selectedClassId)?.name && s.className.toLowerCase().trim() === availableClasses.find(c => c.id === selectedClassId)?.name.toLowerCase().trim());

    const matchExam = selectedExamId === 'ALL' || s.examId === selectedExamId;

    const matchSearch = !studentSearch.trim() ||
      (s.studentName && s.studentName.toLowerCase().includes(studentSearch.toLowerCase().trim())) ||
      (s.studentNis && s.studentNis.toLowerCase().includes(studentSearch.toLowerCase().trim()));

    return Boolean(matchSchool && matchClass && matchExam && matchSearch);
  };

  const allMatchingSubmissions = submissions.filter(s => isSubmissionMatchingFilters(s) && !s.isArchived && !s.deletedAt);

  const pendingCount = submissions.filter(s => {
    if (!isSubmissionMatchingFilters(s) || s.isArchived || s.deletedAt) return false;
    const isGuruValidated = s.validationStatus === 'approved' || s.validationStatus === 'revised' || Boolean(s.validatedBy);
    return !isGuruValidated && (s.status === 'perlu_pemeriksaan' || s.validationStatus === 'pending_review' || s.requiresTeacherReview);
  }).length;

  const validatedCount = submissions.filter(s => {
    if (!isSubmissionMatchingFilters(s) || s.isArchived || s.deletedAt) return false;
    return s.validationStatus === 'approved' || s.validationStatus === 'revised' || Boolean(s.validatedBy);
  }).length;

  const archivedCount = submissions.filter(s => {
    if (!isSubmissionMatchingFilters(s)) return false;
    return Boolean(s.isArchived || s.deletedAt);
  }).length;

  const filteredSubmissions = submissions.filter(s => {
    if (!isSubmissionMatchingFilters(s)) return false;

    const isArchived = Boolean(s.isArchived || s.deletedAt);
    if (filterTab === 'ARCHIVED') {
      return isArchived;
    }

    // Default: Tabs non-arsip tidak pernah menampilkan submission yang diarsipkan
    if (isArchived) return false;

    const isGuruValidated = s.validationStatus === 'approved' || s.validationStatus === 'revised' || Boolean(s.validatedBy);
    const isPending = !isGuruValidated && (s.status === 'perlu_pemeriksaan' || s.validationStatus === 'pending_review' || s.requiresTeacherReview);
    const isValidated = isGuruValidated;

    if (filterTab === 'PENDING') return isPending;
    if (filterTab === 'VALIDATED') return isValidated;
    return true;
  });

  const activeExamObj = exams.find(e => e.id === selectedExamId);

  const handleSelectSubmission = async (sub: ExamSubmission) => {
    setSelectedSubmission(sub);
    setTeacherFollowUpInput(sub.teacherFollowUp || '');

    // Jika answers belum ada (karena optimasi bootstrap payload cepat), muat rincian lengkap dari server on-demand
    if (!sub.answers || Object.keys(sub.answers).length === 0) {
      try {
        setLoadingSubmissionId(sub.id);
        const res = await apiGet<{ success: boolean; submission: ExamSubmission }>(`/api/submissions/${sub.id}`);
        if (res.success && res.submission) {
          setSelectedSubmission(res.submission);
          onUpdateSubmission(res.submission);
        }
      } catch (err) {
        console.warn('[ExamMonitor] Gagal memuat rincian lembar jawaban siswa:', err);
      } finally {
        setLoadingSubmissionId(null);
      }
    }
  };

  const handleTriggerAIEvaluation = async (sub: ExamSubmission) => {
    setEvaluatingAi(true);

    try {
      let targetSub = sub;
      if (!targetSub.answers || Object.keys(targetSub.answers).length === 0) {
        try {
          const resDetail = await apiGet<{ success: boolean; submission: ExamSubmission }>(`/api/submissions/${sub.id}`);
          if (resDetail.success && resDetail.submission) {
            targetSub = resDetail.submission;
            setSelectedSubmission(targetSub);
            onUpdateSubmission(targetSub);
          }
        } catch {}
      }

      // Panggil endpoint penilaian terpadu yang memproses bukti multimodal tersimpan + esai siswa
      const data = await apiPost<{ success: boolean; submission?: ExamSubmission; message?: string }>(
        `/api/ai/evaluate-submission/${targetSub.id}`
      );

      if (data.success && data.submission) {
        onUpdateSubmission(data.submission);
        setSelectedSubmission(data.submission);
      } else {
        alert(data.message || 'Layanan evaluasi AI tidak dapat memproses submission ini saat ini. Silakan tinjau lembar jawaban siswa secara langsung.');
      }
    } catch (err: any) {
      console.error('Error triggering AI evaluation:', err);
      alert(`Gagal menghubungi server penilaian AI: ${err.message || err}`);
    } finally {
      setEvaluatingAi(false);
    }
  };

  const handleSaveFollowUp = () => {
    if (!selectedSubmission || !teacherFollowUpInput.trim()) return;
    const updated: ExamSubmission = {
      ...selectedSubmission,
      teacherFollowUp: teacherFollowUpInput.trim()
    };
    onUpdateSubmission(updated);
    setSelectedSubmission(updated);
    setTeacherFollowUpInput('');
  };

  const handleArchiveSubmission = async (sub: ExamSubmission) => {
    const reason = window.prompt("Alasan pengarsipan submission (opsional):", "Diarsipkan dari antrean aktif");
    if (reason === null) return;

    try {
      const res = await apiPost<{ success: boolean; message: string; submission: ExamSubmission }>(
        `/api/submissions/${sub.id}/archive`,
        { reason: reason || 'Diarsipkan oleh guru/admin' }
      );
      if (res.success && res.submission) {
        onUpdateSubmission(res.submission);
        setSelectedSubmission(res.submission);
        setSelectedSubmissionIds(prev => prev.filter(id => id !== sub.id));
      }
    } catch (err: any) {
      alert(`Gagal mengarsipkan submission: ${err?.message || err}`);
    }
  };

  const handleRestoreSubmission = async (sub: ExamSubmission) => {
    if (!window.confirm(`Pulihkan submission siswa ${sub.studentName} ke antrean utama?`)) return;

    try {
      const res = await apiPost<{ success: boolean; message: string; submission: ExamSubmission }>(
        `/api/submissions/${sub.id}/restore`,
        {}
      );
      if (res.success && res.submission) {
        onUpdateSubmission(res.submission);
        setSelectedSubmission(res.submission);
        setSelectedSubmissionIds(prev => prev.filter(id => id !== sub.id));
      }
    } catch (err: any) {
      alert(`Gagal memulihkan submission: ${err?.message || err}`);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedSubmissionIds.length === 0) return;
    const reason = window.prompt(
      `Arsipkan ${selectedSubmissionIds.length} submission yang dipilih? Masukkan alasan (opsional):`,
      "Diarsipkan massal oleh guru/admin"
    );
    if (reason === null) return;

    setBulkActionLoading(true);
    try {
      const res = await apiPost<{ success: boolean; processed: string[]; errors: any[]; count: number }>(
        '/api/submissions/bulk-archive',
        { submissionIds: selectedSubmissionIds, reason: reason || 'Diarsipkan massal' }
      );
      if (res.success) {
        res.processed.forEach(id => {
          const target = submissions.find(s => s.id === id);
          if (target) {
            onUpdateSubmission({
              ...target,
              isArchived: true,
              archivedAt: new Date().toISOString(),
              archiveReason: reason || 'Diarsipkan massal'
            });
          }
        });
        setSelectedSubmissionIds([]);
        if (res.errors && res.errors.length > 0) {
          alert(`Berhasil mengarsipkan ${res.count} submission. Terdapat ${res.errors.length} gagal.`);
        }
      }
    } catch (err: any) {
      alert(`Gagal melakukan arsip massal: ${err?.message || err}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedSubmissionIds.length === 0) return;
    if (!window.confirm(`Pulihkan ${selectedSubmissionIds.length} submission yang dipilih dari arsip ke antrean utama?`)) return;

    setBulkActionLoading(true);
    try {
      const res = await apiPost<{ success: boolean; processed: string[]; errors: any[]; count: number }>(
        '/api/submissions/bulk-restore',
        { submissionIds: selectedSubmissionIds }
      );
      if (res.success) {
        res.processed.forEach(id => {
          const target = submissions.find(s => s.id === id);
          if (target) {
            onUpdateSubmission({
              ...target,
              isArchived: false,
              archivedAt: undefined,
              archivedBy: undefined,
              archiveReason: undefined,
              deletedAt: undefined
            });
          }
        });
        setSelectedSubmissionIds([]);
        if (res.errors && res.errors.length > 0) {
          alert(`Berhasil memulihkan ${res.count} submission. Terdapat ${res.errors.length} gagal.`);
        }
      }
    } catch (err: any) {
      alert(`Gagal memulihkan submission massal: ${err?.message || err}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCleanupPermanent = async () => {
    if (!cleanupModalSubmission) return;
    if (!cleanupConfirm) {
      alert("Centang kotak konfirmasi penghapusan permanen terlebih dahulu.");
      return;
    }
    if (!cleanupReason || cleanupReason.trim().length < 5) {
      alert("Alasan cleanup permanen minimal 5 karakter.");
      return;
    }

    try {
      const res = await apiPost<{ success: boolean; message: string }>(
        `/api/submissions/${cleanupModalSubmission.id}/cleanup`,
        { confirmation: true, reason: cleanupReason.trim() }
      );
      if (res.success) {
        onUpdateSubmission({
          ...cleanupModalSubmission,
          isArchived: true,
          deletedAt: new Date().toISOString()
        });
        if (selectedSubmission?.id === cleanupModalSubmission.id) {
          setSelectedSubmission(null);
        }
        setCleanupModalSubmission(null);
        setCleanupReason('');
        setCleanupConfirm(false);
        alert("Submission artefak pengujian berhasil dibersihkan secara permanen.");
      }
    } catch (err: any) {
      alert(`Gagal melakukan cleanup: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Monitoring & Panel Validasi Guru (Tahap 6)
        </h2>
        <p className="text-xs text-slate-400">Pemeriksaan antrean hasil AI, konfirmasi rubrik, revisi nilai dengan alasan wajib, dan jejak audit guru.</p>
      </div>

      {/* Select Exam & Cascading Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Dropdown Filter Sekolah */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              {isGuru ? 'Sekolah Tugas Mengajar' : 'Filter Sekolah'}
            </label>
            {isGuru ? (
              <div className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-xs flex items-center justify-between">
                <span className="truncate">{guruSchool?.name || currentUser?.schoolName || 'SMK Terdaftar'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-medium shrink-0">
                  <Lock className="w-2.5 h-2.5 text-blue-400" /> Terkunci (Guru)
                </span>
              </div>
            ) : (
              <select
                value={selectedSchoolId}
                onChange={(e) => {
                  const newSch = e.target.value;
                  setSelectedSchoolId(newSch);
                  setSelectedClassId('ALL');
                  setSelectedExamId('ALL');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Sekolah ({schoolsList.length})</option>
                {schoolsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Dropdown Filter Kelas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              {isGuru ? 'Kelas Pengampu' : 'Filter Kelas'}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedExamId('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">
                {isGuru ? `Semua Kelas Binaan (${availableClasses.length})` : `Semua Kelas (${availableClasses.length})`}
              </option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {isGuru ? '(Kelas Binaan)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Sesi Ujian */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Pilih Sesi Ujian
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Semua Sesi Ujian ({availableExams.length + historicalExams.length})</option>
              {availableExams.map(e => (
                <option key={e.id} value={e.id}>{e.title} ({e.className || 'Semua Kelas'}) - [{(e.status || 'draft').toUpperCase()}]</option>
              ))}
              {historicalExams.length > 0 && (
                <optgroup label="Sesi Ujian Historis (Arsip)">
                  {historicalExams.map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({e.className}) - [HISTORIS]</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {activeExamObj && (
          <div className="flex gap-3 text-xs pt-2 border-t border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Total Peserta: </span>
              <strong className="text-white">{activeExamObj.totalStudents} Siswa</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Selesai: </span>
              <strong className="text-emerald-400">{activeExamObj.completedStudents} Siswa</strong>
            </div>
          </div>
        )}
      </div>

      {/* Queue Filter Tabs & Ekspor Excel */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Semua Berkas ({allMatchingSubmissions.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Antrean Perlu Pemeriksaan ({pendingCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('VALIDATED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'VALIDATED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>Sudah Tervalidasi ({validatedCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('ARCHIVED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'ARCHIVED'
                ? 'bg-rose-700 text-white shadow-md ring-1 ring-rose-400'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-rose-300" />
            <span>Submission Diarsipkan ({archivedCount})</span>
          </button>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Excel (.xlsx)</span>
        </button>
      </div>

      {/* Submissions List & Detail Inspector */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {filterTab === 'ARCHIVED' ? 'Arsip Lembar Jawaban Siswa' : 'Berkas Lembar Jawaban Masuk'} ({filteredSubmissions.length})
            </h3>
            {filteredSubmissions.length > 0 && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filteredSubmissions.length > 0 && filteredSubmissions.every(s => selectedSubmissionIds.includes(s.id))}
                  onChange={() => {
                    const allSelected = filteredSubmissions.every(s => selectedSubmissionIds.includes(s.id));
                    if (allSelected) {
                      setSelectedSubmissionIds([]);
                    } else {
                      setSelectedSubmissionIds(filteredSubmissions.map(s => s.id));
                    }
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 cursor-pointer"
                />
                <span>Pilih Semua</span>
              </label>
            )}
          </div>

          {/* Pencarian Nama Siswa / NIS */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama siswa atau NIS..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {studentSearch && (
              <button
                onClick={() => setStudentSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sticky Floating Bulk Action Bar */}
          {selectedSubmissionIds.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-800 rounded-xl flex items-center justify-between gap-2 text-xs shadow-lg animate-fade-in">
              <span className="font-bold text-purple-200">
                {selectedSubmissionIds.length} submission dipilih
              </span>
              <div className="flex items-center gap-1.5">
                {filterTab === 'ARCHIVED' ? (
                  <button
                    onClick={handleBulkRestore}
                    disabled={bulkActionLoading}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Pulihkan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBulkArchive}
                    disabled={bulkActionLoading}
                    className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer transition disabled:opacity-50"
                  >
                    <Archive className="w-3 h-3" />
                    <span>Arsipkan</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedSubmissionIds([])}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
              {filterTab === 'ARCHIVED'
                ? 'Tidak ada submission yang diarsipkan.'
                : 'Belum ada berkas jawaban siswa yang sesuai dengan filter antrean ini.'}
            </div>
          ) : (
            filteredSubmissions.map(sub => {
              const isSelected = selectedSubmission?.id === sub.id;
              const isPending = sub.status === 'perlu_pemeriksaan' || sub.validationStatus === 'pending_review' || sub.requiresTeacherReview;
              const originalAiScore = sub.originalAIScoreTotal !== undefined ? sub.originalAIScoreTotal : sub.totalScore;
              const hasScoreEdited = sub.teacherScoreTotal !== undefined && sub.teacherScoreTotal !== originalAiScore;
              const isArchived = Boolean(sub.isArchived || sub.deletedAt);

              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSubmissionIds.includes(sub.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedSubmissionIds(prev =>
                          prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                        );
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <h4 className="text-sm font-bold text-white">{sub.studentName}</h4>
                            {isArchived && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                                <Archive className="w-2.5 h-2.5" /> Diarsipkan
                              </span>
                            )}
                            {(() => {
                              const isGuruValidated = sub.validationStatus === 'approved' || sub.validationStatus === 'revised' || Boolean(sub.validatedBy);
                              const isProcessing = sub.aiGradingStatus === 'processing';
                              const isAIFailed = sub.aiGradingStatus === 'failed';
                              const isNeedsReview = !isGuruValidated && (sub.status === 'perlu_pemeriksaan' || sub.validationStatus === 'pending_review' || sub.requiresTeacherReview || isAIFailed);
                              if (isGuruValidated) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    Tervalidasi Guru {sub.validatedBy ? `(${sub.validatedBy.split(' ')[0]})` : ''}
                                  </span>
                                );
                              }
                              if (isProcessing) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold animate-pulse">
                                    Sedang Diproses AI
                                  </span>
                                );
                              }
                              if (isAIFailed) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                    Gagal AI / Perlu Uji Guru
                                  </span>
                                );
                              }
                              if (isNeedsReview) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    Perlu Review Guru
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                  Dinilai Sistem (Otomatis)
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-slate-400">NIS: {sub.studentNis} • Kelas: {sub.className}</p>
                        </div>

                        <div className="text-right">
                          {(() => {
                            const isGuruValidated = sub.validationStatus === 'approved' || sub.validationStatus === 'revised' || Boolean(sub.validatedBy);
                            const hasPending = sub.hasPendingComponents || (!isGuruValidated && (sub.status === 'perlu_pemeriksaan' || sub.requiresTeacherReview));
                            const subRawSum = sub.rawScoreTotal !== undefined ? sub.rawScoreTotal : Object.values(sub.answers || {}).reduce((acc, a) => acc + (a.score || 0), 0);
                            const subMaxRawSum = sub.maxRawScore !== undefined ? sub.maxRawScore : (Object.values(sub.answers || {}).reduce((acc, a) => acc + (a.maxScore || 5), 0) || (sub.maxRawScore || 65));
                            return (
                              <>
                                <div className="flex items-baseline justify-end gap-0.5">
                                  {hasPending ? (
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                      Menunggu Review Guru
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-base font-black text-emerald-400">{sub.totalScore}</span>
                                      <span className="text-[10px] text-slate-400">/ 100</span>
                                    </>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {hasPending ? (
                                    <span>Skor Sah Sementara: <strong className="text-slate-300">{subRawSum} / {subMaxRawSum} Poin</strong></span>
                                  ) : (
                                    <span>Skor Sah: <strong className="text-slate-300">{subRawSum} / {subMaxRawSum} Poin</strong></span>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Non-destructive score history tag */}
                      {hasScoreEdited && (
                        <div className="mt-2 text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-800/40 flex justify-between">
                          <span>Nilai Awal AI: <strong className="line-through text-slate-400">{originalAiScore} / 100</strong></span>
                          <span>Nilai Guru: <strong className="text-emerald-400 font-bold">{sub.teacherScoreTotal} / 100</strong></span>
                        </div>
                      )}

                      {sub.validatedBy && (
                        <div className="mt-1 text-[10px] text-slate-400">
                          Validator: <strong className="text-slate-200">{sub.validatedBy}</strong>
                        </div>
                      )}

                      {/* Informasi Pengarsipan */}
                      {isArchived && sub.archiveReason && (
                        <div className="mt-1.5 text-[10px] text-rose-300/80 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/40">
                          Alasan Arsip: {sub.archiveReason}
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-400">
                        <span>Waktu: {sub.submitTime}</span>
                        <div className="flex items-center gap-2">
                          {isArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreSubmission(sub);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="Pulihkan submission dari arsip"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Pulihkan
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveSubmission(sub);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="Arsipkan submission ini"
                            >
                              <Archive className="w-2.5 h-2.5" /> Arsipkan
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSubmission(sub);
                              setShowFullViewModal(true);
                            }}
                            className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="Buka full lembar jawaban siswa"
                          >
                            <Maximize2 className="w-2.5 h-2.5" /> Full Jawaban
                          </button>
                          <span className="text-purple-400 font-semibold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Periksa Detail
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Inspector */}
        <div className="lg:col-span-7">
          {selectedSubmission ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                <div>
                  <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Detail Jawaban & Evaluasi</span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedSubmission.studentName} ({selectedSubmission.studentNis})</span>
                    {(selectedSubmission.isArchived || selectedSubmission.deletedAt) && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Arsip
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedSubmission.examTitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Tombol Arsipkan / Pulihkan */}
                  {!selectedSubmission.isArchived && !selectedSubmission.deletedAt ? (
                    <button
                      onClick={() => handleArchiveSubmission(selectedSubmission)}
                      className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                      title="Arsipkan submission ini dari antrean aktif"
                    >
                      <Archive className="w-3.5 h-3.5 text-rose-300" />
                      <span>Arsipkan</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestoreSubmission(selectedSubmission)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                      title="Pulihkan submission ke antrean aktif"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Pulihkan dari Arsip</span>
                    </button>
                  )}

                  {/* Tombol Cleanup Permanen Khusus Admin */}
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setCleanupModalSubmission(selectedSubmission);
                        setCleanupConfirm(false);
                        setCleanupReason('Pembersihan artefak pengujian sistem');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                      title="Hapus submission artefak pengujian secara permanen (Khusus Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Cleanup Permanen</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowFullViewModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    title="Buka seluruh lembar jawaban siswa dalam mode layar penuh"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Buka Jawaban Lengkap (Full View)</span>
                  </button>

                  <button
                    onClick={() => setShowMultimodalModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Inspeksi Rubrik AI</span>
                  </button>

                  <button
                    onClick={() => handleTriggerAIEvaluation(selectedSubmission)}
                    disabled={evaluatingAi || selectedSubmission.isArchived || !!selectedSubmission.deletedAt}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{evaluatingAi ? 'Memproses Berkas & Menilai AI...' : '✨ Nilai Esai & Bukti dengan AI'}</span>
                  </button>
                </div>
              </div>

              {/* AI Evaluation Box (Tampilan Bersih & Elegan, Bebas JSON Mentah) */}
              {selectedSubmission.aiEvaluation && (() => {
                let parsedDict: Record<string, any> | null = null;
                try {
                  const raw = JSON.parse(selectedSubmission.aiEvaluation);
                  if (typeof raw === 'object' && raw !== null) parsedDict = raw;
                } catch (e) {
                  parsedDict = null;
                }

                return (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/80 space-y-2">
                    <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Ulasan & Evaluasi Terotomasi AI:
                      </span>
                      {parsedDict && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                          {Object.keys(parsedDict).length} Butir Soal Teranalisis
                        </span>
                      )}
                    </div>

                    {parsedDict ? (
                      <div className="space-y-1.5 pt-1">
                        {Object.entries(parsedDict).map(([qKey, evalItem]: [string, any], eIdx) => (
                          <div key={qKey} className="text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border border-emerald-900/40 flex items-start justify-between gap-2">
                            <div>
                              <span className="font-semibold text-emerald-300 block mb-0.5">Soal #{eIdx + 1} ({qKey}):</span>
                              <p className="text-slate-300 text-[11px] leading-relaxed">{evalItem.feedback || 'Dievaluasi berdasarkan rubrik kompetensi.'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-bold text-xs shrink-0 ${
                              evalItem.score !== null && evalItem.score !== undefined && !evalItem.isPendingEvaluation
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {evalItem.score !== null && evalItem.score !== undefined && !evalItem.isPendingEvaluation
                                ? `Skor: ${evalItem.score} / ${evalItem.maxScore}`
                                : 'Belum Dinilai'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-200 leading-relaxed italic">
                        "{selectedSubmission.aiEvaluation}"
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Answers Breakdown Per Soal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Rincian Jawaban Siswa & Monitoring Berkas Per Soal
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Total: {Object.keys(selectedSubmission.answers || {}).length} Soal
                  </span>
                </div>

                {loadingSubmissionId === selectedSubmission.id ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Memuat rincian lembar jawaban siswa...</span>
                  </div>
                ) : selectedSubmission.answers && Object.keys(selectedSubmission.answers).length > 0 ? (
                  Object.entries(selectedSubmission.answers)
                    .sort(([aId], [bId]) => {
                    const currentExam = exams.find((e) => e.id === selectedSubmission.examId) || activeExamObj;
                    const currentPkg = packages.find((p) => p.id === currentExam?.packageId)
                      || (currentExam?.packageId === 'pkg-employability-18' || selectedSubmission.examTitle?.toLowerCase().includes('non-tes') || selectedSubmission.examTitle?.toLowerCase().includes('employability') ? DEFAULT_EMPLOYABILITY_PACKAGE : undefined);

                    const resolveQ = (key: string) => {
                      const num = parseInt(key.replace(/\D/g, ''), 10);
                      return (
                        (selectedSubmission.questionSnapshot && (selectedSubmission.questionSnapshot as any[]).find((q: any) => q.id === key || (num && q.number === num))) ||
                        (currentExam?.questionSnapshot && (currentExam.questionSnapshot as any[]).find((q: any) => q.id === key || (num && q.number === num))) ||
                        currentPkg?.questions.find((q) => q.id === key || (num && q.number === num)) ||
                        REVISED_QUESTIONS_24.find((q) => q.id === key || (num && q.number === num)) ||
                        DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === key || (num && q.number === num))
                      );
                    };

                    const qA = resolveQ(aId);
                    const qB = resolveQ(bId);
                    const numA = qA?.number ?? parseInt(aId.replace(/\D/g, ''), 10) ?? 0;
                    const numB = qB?.number ?? parseInt(bId.replace(/\D/g, ''), 10) ?? 0;
                    return numA - numB;
                  })
                  .map(([qKey, ansVal], idx) => {
                    const ans = ansVal as StudentAnswer;
                    const currentExam = exams.find((e) => e.id === selectedSubmission.examId) || activeExamObj;
                    const currentPkg = packages.find((p) => p.id === currentExam?.packageId)
                      || (currentExam?.packageId === 'pkg-employability-18' || selectedSubmission.examTitle?.toLowerCase().includes('non-tes') || selectedSubmission.examTitle?.toLowerCase().includes('employability') ? DEFAULT_EMPLOYABILITY_PACKAGE : undefined);

                    const qNum = parseInt(qKey.replace(/\D/g, ''), 10);
                    const qItem = (
                      (selectedSubmission.questionSnapshot && (selectedSubmission.questionSnapshot as any[]).find((q: any) => q.id === qKey || (qNum && q.number === qNum))) ||
                      (currentExam?.questionSnapshot && (currentExam.questionSnapshot as any[]).find((q: any) => q.id === qKey || (qNum && q.number === qNum))) ||
                      currentPkg?.questions.find((q) => q.id === qKey || (qNum && q.number === qNum)) ||
                      REVISED_QUESTIONS_24.find((q) => q.id === qKey || (qNum && q.number === qNum)) ||
                      DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === qKey || (qNum && q.number === qNum))
                    );
                    const qNumber = qItem?.number ?? (idx + 1);

                    const evidencesThisQ: MultimodalEvidence[] =
                      (ans.multimodalEvidences && ans.multimodalEvidences.length > 0)
                        ? ans.multimodalEvidences
                        : (selectedSubmission.evidences || []).filter((e) => e.questionId === qKey);

                    const hasAnswer = Boolean(
                      (ans.essayAnswer && ans.essayAnswer.trim()) ||
                      (ans.selectedOption) ||
                      (Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0) ||
                      (ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0) ||
                      (ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) ||
                      (ans.shortAnswerText && ans.shortAnswerText.trim()) ||
                      (ans.shortAnswerCalculation && ans.shortAnswerCalculation.trim()) ||
                      (ans.subQuestionAnswers && Object.values(ans.subQuestionAnswers).some((v) => Boolean(v && String(v).trim()))) ||
                      (evidencesThisQ.length > 0)
                    );

                    const maxQuestionPoints = ans.maxScore || qItem?.points || 10;
                    const isPending = ans.isPendingEvaluation || ans.score === undefined || ans.score === null;
                    const currentQuestionScore = ans.score ?? 0;

                    return (
                      <div key={qKey} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                        {/* Header Soal */}
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              Soal #{qNumber}
                            </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px] uppercase font-semibold">
                            {qItem?.type ? qItem.type.replace('_', ' ') : 'Esai'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!hasAnswer ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Tidak Dijawab (0 / {maxQuestionPoints})
                            </span>
                          ) : isPending ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Belum Dinilai (Menunggu Evaluasi)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                              Skor: {currentQuestionScore} / {maxQuestionPoints}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stimulus Kontekstual Soal (jika ada) */}
                      {(qItem?.stimulus || (qItem as any)?.contextText) && (
                        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50 space-y-1.5">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Stimulus Kontekstual Laboratorium:
                          </span>
                          <div className="text-xs text-blue-100/90 leading-relaxed font-serif whitespace-pre-wrap">
                            {qItem?.stimulus || (qItem as any)?.contextText}
                          </div>
                        </div>
                      )}

                      {/* Teks Pertanyaan Soal */}
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                          Teks Pertanyaan Soal:
                        </span>
                        <p className="text-xs text-slate-100 font-medium leading-relaxed">
                          {qItem?.questionText || 'Pertanyaan asesmen esai vokasi...'}
                        </p>
                      </div>

                      {/* Komparasi Opsi Pilihan Ganda Siswa vs Kunci Jawaban */}
                      {qItem?.options && qItem.options.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                              <span>📊</span> {(qItem as any)?.scoringMap ? 'Rubrik Penskoran Setiap Kunci Pilihan (Skala 1–5 Non-Tes):' : 'Daftar Opsi Pilihan Ganda & Analisis Jawaban Siswa:'}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">
                              {(qItem as any)?.scoringMap ? 'Maks 5 Poin / Butir' : `Skor: ${currentQuestionScore} / ${maxQuestionPoints}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                            {qItem.options.map((opt: string, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const score = (qItem as any).scoringMap?.[letter] || (opt === qItem.correctAnswer ? 1 : 0);

                              const studentClean = (typeof ans.selectedOption === 'string' ? ans.selectedOption : String(ans.selectedOption || '')).trim().toUpperCase();
                              const optClean = (typeof opt === 'string' ? opt : (opt ? String((opt as any).text || (opt as any).label || opt) : '')).trim().toUpperCase();
                              const correctClean = (typeof qItem.correctAnswer === 'string' ? qItem.correctAnswer : String(qItem.correctAnswer || '')).trim().toUpperCase();

                              const isStudentPick = Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0
                                ? ans.selectedOptions.some((sOpt: string) => {
                                    const sClean = (sOpt || '').trim().toUpperCase();
                                    return sClean === optClean || sClean === letter || optClean.startsWith(sClean) || (sClean.length > 1 && optClean.includes(sClean));
                                  })
                                : (studentClean === optClean ||
                                    (studentClean.length === 1 && (studentClean === letter || optClean.startsWith(studentClean))) ||
                                    (optClean.startsWith(studentClean) && studentClean.length > 0));

                              const isCorrectAnswer = Array.isArray(qItem.correctAnswers) && qItem.correctAnswers.length > 0
                                ? qItem.correctAnswers.some((cAns: string) => {
                                    const cClean = (cAns || '').trim().toUpperCase();
                                    return cClean === optClean || cClean === letter || optClean.startsWith(cClean) || (cClean.length > 1 && optClean.includes(cClean));
                                  })
                                : (qItem as any).scoringMap
                                ? (qItem.correctAnswer ? optClean.startsWith(correctClean.slice(0, 1)) : score === 5)
                                : (correctClean.length > 0 && (optClean === correctClean || optClean.startsWith(correctClean.slice(0, 1))));

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border transition-all ${
                                    isStudentPick && isCorrectAnswer
                                      ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-100 font-medium'
                                      : isStudentPick && !isCorrectAnswer
                                      ? 'bg-rose-950/40 border-rose-500/70 text-rose-100 font-medium'
                                      : isCorrectAnswer
                                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                                      : 'bg-slate-950 border-slate-800/60 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                      isStudentPick && isCorrectAnswer
                                        ? 'bg-emerald-500 text-slate-950'
                                        : isStudentPick && !isCorrectAnswer
                                        ? 'bg-rose-500 text-white'
                                        : isCorrectAnswer
                                        ? 'bg-emerald-800 text-emerald-200'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {letter}
                                    </span>
                                    <span className="line-clamp-2">{opt}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isStudentPick && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        isCorrectAnswer
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      }`}>
                                        {isCorrectAnswer ? '✓ Pilihan Siswa (Benar)' : '✕ Pilihan Siswa (Salah)'}
                                      </span>
                                    )}
                                    {isCorrectAnswer && !isStudentPick && (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                                        ★ Kunci Jawaban
                                      </span>
                                    )}
                                    {(qItem as any)?.scoringMap && (
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                        score === 5
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : score >= 3
                                          ? 'bg-blue-500/20 text-blue-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}>
                                        Skor {score}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!qItem?.options && (qItem?.sampleAnswer || qItem?.correctAnswer) && (
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
                          <span className="text-amber-400 font-semibold block mb-0.5">
                            Kunci Jawaban Acuan:
                          </span>
                          <p className="text-slate-200">{qItem.sampleAnswer || qItem.correctAnswer}</p>
                        </div>
                      )}

                      {/* Teks / Respon Jawaban Siswa */}
                      {!hasAnswer ? (
                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2 italic">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Siswa tidak memberikan teks jawaban maupun berkas pengerjaan pada nomor soal ini.</span>
                        </div>
                      ) : (
                        <>
                          {ans.essayAnswer && (
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                              <strong className="text-slate-400 text-[11px] block">Teks Jawaban Uraian Siswa:</strong>
                              <p className="text-slate-100 text-xs leading-relaxed whitespace-pre-wrap">{ans.essayAnswer}</p>
                            </div>
                          )}

                          {ans.subQuestionAnswers && Object.keys(ans.subQuestionAnswers).length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {Object.entries(ans.subQuestionAnswers).map(([subKey, txt]) => (
                                <div key={subKey} className="p-2.5 rounded bg-slate-900 border border-slate-800">
                                  <div className="text-[11px] text-slate-400 font-semibold mb-0.5">Jawaban Siswa ({subKey}):</div>
                                  <div className="text-slate-200 font-mono text-[11px]">{txt as string}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {ans.selectedOption && (
                            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-between">
                              <div>
                                <strong>Pilihan Siswa:</strong> <span className="font-bold text-amber-300">{ans.selectedOption}</span>
                              </div>
                              {(qItem as any)?.scoringMap && (
                                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  Skor Butir: {ans.score ?? (qItem as any).scoringMap[qItem.options?.indexOf(ans.selectedOption) >= 0 ? String.fromCharCode(65 + qItem.options.indexOf(ans.selectedOption)) : 'A'] ?? 1} / 5
                                </div>
                              )}
                            </div>
                          )}

                          {(qItem?.type === 'complex_mcq' || qItem?.type === 'pilihan_ganda_kompleks' || qItem?.type === 'complex_multiple_choice') && Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0 && (
                            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <strong className="text-slate-300 text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                  Pilihan Siswa (Pilihan Ganda Kompleks):
                                </strong>
                                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  {ans.selectedOptions.length} Opsi Terpilih • Skor: {ans.score ?? 0} / {maxQuestionPoints}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {ans.selectedOptions.map((optVal: string, oIdx: number) => (
                                  <span key={oIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                    {optVal}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0 && (
                            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                              <strong className="text-slate-400">Respons Pernyataan:</strong>
                              <div className="grid grid-cols-2 gap-1.5 pt-1">
                                {Object.entries(ans.complexAnswers).map(([stmtKey, val]) => (
                                  <div key={stmtKey} className="text-[11px] px-2 py-1 rounded bg-slate-950 border border-slate-800 flex justify-between">
                                    <span className="text-slate-400">{stmtKey}:</span>
                                    <span className={`font-bold ${val === 'Sesuai' || val === 'Tepat' || val === 'Benar' ? 'text-emerald-400' : 'text-rose-400'}`}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0 && (
                            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                              <strong className="text-slate-400">Pasangan Menjodohkan:</strong>
                              <div className="space-y-1 pt-1">
                                {Object.entries(ans.matchingAnswers).map(([colA, colB]) => (
                                  <div key={colA} className="text-[11px] px-2 py-1 rounded bg-slate-950 border border-slate-800 flex justify-between gap-2">
                                    <span className="text-amber-400 font-semibold">{colA}</span>
                                    <span className="text-slate-300 truncate">→ {colB}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(ans.shortAnswerText || ans.shortAnswerCalculation) && (
                            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                              {ans.shortAnswerText && (
                                <div>
                                  <strong className="text-slate-400">Jawaban Angka:</strong> <span className="font-mono text-amber-400 font-bold">{ans.shortAnswerText}</span>
                                </div>
                              )}
                              {ans.shortAnswerCalculation && (
                                <div>
                                  <div className="text-[11px] text-slate-400 font-semibold mb-0.5">Langkah Perhitungan:</div>
                                  <div className="text-slate-200 font-mono text-[11px] p-2 rounded bg-slate-950 whitespace-pre-wrap">{ans.shortAnswerCalculation}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* MONITORING BERKAS BUKTI YANG DIUPLOAD SISWA (Audio Verbal / Foto Tulisan Tangan / Dokumen) */}
                      {evidencesThisQ.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-3 mt-2">
                          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-1.5">
                            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              Berkas Bukti yang Diunggah Siswa ({evidencesThisQ.length} Berkas)
                            </span>
                            <span className="text-[10px] text-slate-400">Monitoring Berkas Asli</span>
                          </div>

                          <div className="space-y-2.5">
                            {evidencesThisQ.map((ev) => (
                              <div key={ev.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {ev.modalityType === 'audio' && <Volume2 className="w-4 h-4 text-rose-400" />}
                                    {ev.modalityType === 'handwriting' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                                    {ev.modalityType === 'document' && <FileText className="w-4 h-4 text-indigo-400" />}
                                    <span className="font-semibold text-slate-200">{ev.fileName}</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">{ev.uploadTime}</span>
                                </div>

                                {/* Preview Pemutar Audio */}
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

                                {/* Preview Foto Tulisan Tangan */}
                                {ev.modalityType === 'handwriting' && (ev.storageUrl || ev.fileData || ev.previewUrl) && (
                                  <div className="space-y-1.5">
                                    <div className="bg-black/60 p-2 rounded flex justify-center border border-slate-800">
                                      <img
                                        src={ev.storageUrl || ev.fileData || ev.previewUrl}
                                        alt="Tulisan Tangan Siswa"
                                        className="max-h-48 object-contain rounded cursor-pointer hover:opacity-90"
                                        onClick={() => setPreviewImageLightbox(ev.storageUrl || ev.fileData || ev.previewUrl || null)}
                                        title="Klik untuk memperbesar tampilan foto"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                      <span>Klik gambar untuk memperbesar</span>
                                      {(ev.storageUrl || ev.fileData) && (
                                        <a
                                          href={ev.storageUrl || ev.fileData}
                                          download={ev.fileName}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" /> Unduh Berkas Asli
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Preview Dokumen */}
                                {ev.modalityType === 'document' && (
                                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                                    <span className="text-slate-300 text-[11px]">Dokumen kerja terlampir aman</span>
                                    {(ev.storageUrl || ev.fileData) && (
                                      <a
                                        href={ev.storageUrl || ev.fileData}
                                        download={ev.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 rounded border border-indigo-500/40 text-[11px] flex items-center gap-1"
                                      >
                                        <Download className="w-3 h-3" /> Unduh Dokumen
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Hasil Ekstraksi AI STT/OCR jika sudah diproses */}
                                {ev.extractedText && (
                                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px]">
                                    <span className="text-amber-400 font-semibold block mb-0.5">
                                      Hasil Transkripsi AI ({ev.modalityType === 'audio' ? 'STT' : 'OCR'}):
                                    </span>
                                    <p className="text-slate-300 font-mono whitespace-pre-wrap">{ev.extractedText}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catatan Feedback AI Per Soal */}
                      {ans.teacherFeedback && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-200">
                          <strong className="text-emerald-400 block mb-0.5">Catatan Evaluasi Soal Ini:</strong>
                          <p>{ans.teacherFeedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  Lembar jawaban belum terisi atau sedang disiapkan.
                </div>
              )}
              </div>

              {/* Teacher Follow Up / Remedial Notes Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Catatan Pembekalan & Catatan Guru untuk Siswa
                </label>

                {selectedSubmission.teacherFollowUp ? (
                  <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/60 text-xs text-blue-200">
                    "{selectedSubmission.teacherFollowUp}"
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tuliskan saran perbaikan / tugas pembekalan..."
                    value={teacherFollowUpInput}
                    onChange={(e) => setTeacherFollowUpInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveFollowUp}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim Catatan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">Pilih Berkas Lembar Jawaban</div>
              <p className="text-xs text-slate-400">Klik nama siswa di panel sebelah kiri untuk memeriksa rincian skor dan memberikan masukan guru.</p>
            </div>
          )}
        </div>
      </div>

      {/* Multimodal & Rubric Inspection Modal */}
      {showMultimodalModal && selectedSubmission && (() => {
        const currentExam = exams.find(e => e.id === selectedSubmission.examId) || activeExamObj;
        const currentPkg = packages.find(p => p.id === currentExam?.packageId)
          || (currentExam?.packageId === 'pkg-employability-18' || selectedSubmission.examTitle?.toLowerCase().includes('non-tes') || selectedSubmission.examTitle?.toLowerCase().includes('employability') ? DEFAULT_EMPLOYABILITY_PACKAGE : undefined);

        return (
          <MultimodalReviewModal
            submission={selectedSubmission}
            packageObj={currentPkg}
            onClose={() => setShowMultimodalModal(false)}
            onUpdateSubmission={(updated) => {
              onUpdateSubmission(updated);
              setSelectedSubmission(updated);
            }}
          />
        );
      })()}

      {/* FULL VIEW MODAL: Jawaban Lengkap Siswa Per Soal & Monitoring Berkas Bukti */}
      {showFullViewModal && selectedSubmission && (() => {
        const currentExam = exams.find(e => e.id === selectedSubmission.examId) || activeExamObj;
        const currentPkg = packages.find(p => p.id === currentExam?.packageId)
          || (currentExam?.packageId === 'pkg-employability-18' || selectedSubmission.examTitle?.toLowerCase().includes('non-tes') || selectedSubmission.examTitle?.toLowerCase().includes('employability') ? DEFAULT_EMPLOYABILITY_PACKAGE : undefined);
        const questionEntries = Object.entries(selectedSubmission.answers || {}).sort(([aId], [bId]) => {
          const qA = currentPkg?.questions.find((q) => q.id === aId)
            || DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === aId);
          const qB = currentPkg?.questions.find((q) => q.id === bId)
            || DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === bId);
          const numA = qA?.number ?? parseInt(aId.replace(/\D/g, ''), 10) ?? 0;
          const numB = qB?.number ?? parseInt(bId.replace(/\D/g, ''), 10) ?? 0;
          return numA - numB;
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header Modal */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-blue-400" /> Mode Jawaban Lengkap (Full View)
                    </span>
                    <span className="text-xs text-slate-400">• Total {questionEntries.length} Soal</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    {selectedSubmission.studentName}
                    <span className="text-xs text-slate-400 font-mono">({selectedSubmission.studentNis})</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Kelas: <strong className="text-slate-100">{selectedSubmission.className}</strong> • Sekolah: <strong className="text-slate-100">{selectedSubmission.schoolName}</strong> • Ujian: <strong className="text-purple-300">{selectedSubmission.examTitle}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Nilai Akhir (Skala 100)</div>
                    <div className="text-lg font-black text-emerald-400">{selectedSubmission.totalScore} / 100</div>
                    {(() => {
                      const mRaw = Object.values(selectedSubmission.answers || {}).reduce((acc, a) => acc + (a.score || 0), 0);
                      const mMax = Object.values(selectedSubmission.answers || {}).reduce((acc, a) => acc + (a.maxScore || 5), 0) || (selectedSubmission.maxRawScore || 65);
                      return (
                        <div className="text-[10px] text-slate-400">Skor Mentah: {mRaw} / {mMax} Poin</div>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => setShowMultimodalModal(true)}
                    className="hidden sm:flex px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs items-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Inspeksi Rubrik AI</span>
                  </button>

                  <button
                    onClick={() => setShowFullViewModal(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Tutup Tampilan Penuh"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Jump Bar Per Soal */}
              <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
                <span className="text-[11px] text-slate-400 font-semibold shrink-0">Lompat ke Soal:</span>
                {questionEntries.map(([qKey, ansVal], qIdx) => {
                  const ans = ansVal as StudentAnswer;
                  const qItem = currentPkg?.questions.find((q) => q.id === qKey)
                    || DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === qKey);
                  const qNum = qItem?.number ?? (qIdx + 1);

                  const evidencesThisQ: MultimodalEvidence[] =
                    (ans.multimodalEvidences && ans.multimodalEvidences.length > 0)
                      ? ans.multimodalEvidences
                      : (selectedSubmission.evidences || []).filter((e) => e.questionId === qKey);

                  const isAnswered = Boolean(
                    (ans.essayAnswer && ans.essayAnswer.trim()) ||
                    ans.selectedOption ||
                    (ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0) ||
                    (ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) ||
                    (ans.shortAnswerText && ans.shortAnswerText.trim()) ||
                    (ans.shortAnswerCalculation && ans.shortAnswerCalculation.trim()) ||
                    (ans.subQuestionAnswers && Object.values(ans.subQuestionAnswers).some(v => Boolean(v && String(v).trim()))) ||
                    (evidencesThisQ.length > 0)
                  );

                  return (
                    <a
                      key={qKey}
                      href={`#full-view-q-${qNum}`}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition flex items-center gap-1 ${
                        isAnswered
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60'
                      }`}
                    >
                      <span>Soal #{qNum}</span>
                      {evidencesThisQ.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ada berkas bukti terunggah" />
                      )}
                    </a>
                  );
                })}
              </div>

              {/* Scrollable Questions Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* AI Evaluation Box jika sudah dianalisis */}
                {selectedSubmission.aiEvaluation && (() => {
                  let parsedDict: Record<string, any> | null = null;
                  try {
                    const raw = JSON.parse(selectedSubmission.aiEvaluation);
                    if (typeof raw === 'object' && raw !== null) parsedDict = raw;
                  } catch (e) {
                    parsedDict = null;
                  }

                  return (
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/80 space-y-2">
                      <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Ringkasan Ulasan Otomatis AI:
                        </span>
                        {parsedDict && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                            {Object.keys(parsedDict).length} Butir Soal Teranalisis
                          </span>
                        )}
                      </div>
                      {parsedDict ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {Object.entries(parsedDict).map(([qKey, evalItem]: [string, any], eIdx) => (
                            <div key={qKey} className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-emerald-900/40 flex items-start justify-between gap-2">
                              <div>
                                <span className="font-semibold text-emerald-300 block mb-0.5">Soal #{eIdx + 1} ({qKey}):</span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">{evalItem.feedback || 'Dievaluasi berdasarkan rubrik kompetensi.'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded font-bold text-xs shrink-0 ${
                                evalItem.score !== null && evalItem.score !== undefined && !evalItem.isPendingEvaluation
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {evalItem.score !== null && evalItem.score !== undefined && !evalItem.isPendingEvaluation
                                  ? `Skor: ${evalItem.score} / ${evalItem.maxScore}`
                                  : 'Belum Dinilai'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 leading-relaxed italic">
                          "{selectedSubmission.aiEvaluation}"
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Daftar Soal Full View */}
                {loadingSubmissionId === selectedSubmission.id ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold text-slate-300">Mengunduh lembar jawaban lengkap siswa...</span>
                  </div>
                ) : (
                  questionEntries.map(([qKey, ansVal], idx) => {
                  const ans = ansVal as StudentAnswer;
                  const qItem = currentPkg?.questions.find((q) => q.id === qKey)
                    || DEFAULT_EMPLOYABILITY_PACKAGE.questions.find((q) => q.id === qKey);

                  const evidencesThisQ: MultimodalEvidence[] =
                    (ans.multimodalEvidences && ans.multimodalEvidences.length > 0)
                      ? ans.multimodalEvidences
                      : (selectedSubmission.evidences || []).filter((e) => e.questionId === qKey);

                  const isAnswered = Boolean(
                    (ans.essayAnswer && ans.essayAnswer.trim()) ||
                    ans.selectedOption ||
                    (ans.selectedOptions && ans.selectedOptions.length > 0) ||
                    (ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0) ||
                    (ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) ||
                    (ans.shortAnswerText && ans.shortAnswerText.trim()) ||
                    (ans.shortAnswerCalculation && ans.shortAnswerCalculation.trim()) ||
                    (ans.subQuestionAnswers && Object.values(ans.subQuestionAnswers).some(v => Boolean(v && String(v).trim()))) ||
                    (evidencesThisQ.length > 0)
                  );

                  const maxQuestionPoints = ans.maxScore || qItem?.points || 10;
                  const isPending = ans.isPendingEvaluation || ans.score === undefined || ans.score === null;
                  const currentQuestionScore = ans.score ?? 0;

                  const qNum = qItem?.number ?? (idx + 1);

                  return (
                    <div
                      key={qKey}
                      id={`full-view-q-${qNum}`}
                      className={`p-5 rounded-2xl bg-slate-950 border transition scroll-mt-20 space-y-4 ${
                        !isAnswered ? 'border-rose-900/60 bg-rose-950/10' : 'border-slate-800'
                      }`}
                    >
                      {/* Baris Header Soal */}
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 font-black flex items-center justify-center text-sm border border-indigo-500/40">
                            #{qNum}
                          </span>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {qItem?.topic || qItem?.category || `Soal Nomor ${qNum}`}
                            </div>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px] uppercase font-semibold">
                              Tipe: {qItem?.type ? qItem.type.replace('_', ' ') : 'Esai'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isAnswered ? (
                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              ⚠️ Tidak Dijawab (Skor: 0 / {maxQuestionPoints})
                            </span>
                          ) : isPending ? (
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Belum Dinilai (Menunggu Evaluasi)
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Skor Diperoleh: {currentQuestionScore} / {maxQuestionPoints}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stimulus Kontekstual Soal (jika ada) */}
                      {qItem?.stimulus && (
                        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-1.5">
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" />
                            Stimulus Kontekstual Laboratorium:
                          </span>
                          <p className="text-sm text-blue-100/90 leading-relaxed font-serif whitespace-pre-wrap">
                            {qItem.stimulus}
                          </p>
                        </div>
                      )}

                      {/* Teks Pertanyaan Soal Asli */}
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                          Teks Pertanyaan Soal:
                        </span>
                        <p className="text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                          {qItem?.questionText || 'Pertanyaan asesmen esai vokasi...'}
                        </p>
                      </div>

                      {/* Kunci Jawaban Acuan Guru / Rubrik Non-Tes 1-5 */}
                      {(qItem as any)?.scoringMap ? (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                              <span>📊</span> Rubrik Penskoran Setiap Kunci Pilihan (Skala 1–5 Non-Tes):
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">
                              Maks 5 Poin / Butir
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {qItem.options?.map((opt: string, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const score = (qItem as any).scoringMap?.[letter] || (opt === qItem.correctAnswer ? 5 : 1);
                              const isStudentPick = ans.selectedOption === opt;
                              const isBest = score === 5;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border transition-all ${
                                    isStudentPick
                                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-100 font-medium'
                                      : isBest
                                      ? 'bg-emerald-950/30 border-emerald-800/40 text-slate-300'
                                      : 'bg-slate-950 border-slate-800/60 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                      isStudentPick ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {letter}
                                    </span>
                                    <span className="line-clamp-2">{opt}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isStudentPick && (
                                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">
                                        Pilihan Siswa
                                      </span>
                                    )}
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                      isBest
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : score >= 3
                                        ? 'bg-blue-500/20 text-blue-300'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {isBest ? `★ Skor ${score} (Acuan)` : `Skor ${score}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (qItem?.sampleAnswer || qItem?.correctAnswer) ? (
                        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/50 text-xs space-y-1">
                          <span className="text-amber-400 font-bold block flex items-center gap-1">
                            <span>🔑</span> Kunci Jawaban Acuan Standar Guru:
                          </span>
                          <p className="text-slate-200 leading-relaxed">{qItem.sampleAnswer || qItem.correctAnswer}</p>
                        </div>
                      ) : null}

                      {/* Respon / Jawaban Siswa */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Jawaban Siswa:
                        </span>

                        {!isAnswered ? (
                          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-rose-200 font-bold">Soal Ini Kosong / Tidak Dijawab</strong>
                              <p className="text-rose-300/90 mt-0.5">Siswa tidak mengisi teks uraian dan tidak melampirkan berkas bukti pada butir soal ini. Skor bernilai 0 mutlak.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {ans.essayAnswer && (
                              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                                <span className="text-[11px] font-semibold text-slate-400 block">Teks Uraian / Esai Siswa:</span>
                                <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">{ans.essayAnswer}</p>
                              </div>
                            )}

                            {ans.subQuestionAnswers && Object.keys(ans.subQuestionAnswers).length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[11px] font-semibold text-slate-400 block">Rincian Jawaban Sub-Soal:</span>
                                {Object.entries(ans.subQuestionAnswers).map(([subKey, txt]) => (
                                  <div key={subKey} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                                    <div className="text-xs text-indigo-300 font-bold mb-1">Subsoal ({subKey}):</div>
                                    <div className="text-slate-100 text-xs font-mono">{txt as string}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {ans.selectedOption && (
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="text-slate-400">Pilihan Siswa:</span>{' '}
                                  <strong className="text-amber-300">{ans.selectedOption}</strong>
                                </div>
                                {(qItem as any)?.scoringMap && (
                                  <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                    Skor Butir: {ans.score ?? (qItem as any).scoringMap[qItem.options?.indexOf(ans.selectedOption) >= 0 ? String.fromCharCode(65 + qItem.options.indexOf(ans.selectedOption)) : 'A'] ?? 1} / 5
                                  </div>
                                )}
                              </div>
                            )}

                            {(qItem?.type === 'complex_mcq' || qItem?.type === 'pilihan_ganda_kompleks' || qItem?.type === 'complex_multiple_choice') && ans.selectedOptions && ans.selectedOptions.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Pilihan Ganda Kompleks (Checkbox Terpilih):</span>
                                <div className="space-y-1">
                                  {ans.selectedOptions.map((optVal, oIdx) => (
                                    <div key={oIdx} className="text-xs p-2 rounded bg-slate-950 border border-slate-800 flex items-center gap-2 text-blue-200">
                                      <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                      <span>{optVal}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ans.complexAnswers && Object.keys(ans.complexAnswers).length > 0 && (
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Respons Pernyataan:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {Object.entries(ans.complexAnswers).map(([stmtKey, val]) => (
                                    <div key={stmtKey} className="text-xs p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
                                      <span className="text-slate-400">{stmtKey}:</span>
                                      <span className={`font-bold ${val === 'Sesuai' || val === 'Tepat' || val === 'Benar' ? 'text-emerald-400' : 'text-rose-400'}`}>{val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0 && (
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Pasangan Menjodohkan:</span>
                                <div className="space-y-1.5">
                                  {Object.entries(ans.matchingAnswers).map(([colA, colB]) => (
                                    <div key={colA} className="text-xs p-2 rounded bg-slate-950 border border-slate-800 flex justify-between gap-2">
                                      <span className="text-amber-400 font-semibold">{colA}</span>
                                      <span className="text-slate-300">→ {colB}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(ans.shortAnswerText || ans.shortAnswerCalculation) && (
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                {ans.shortAnswerText && (
                                  <div className="text-sm">
                                    <span className="text-slate-400">Hasil Jawaban Angka:</span>{' '}
                                    <span className="font-mono text-amber-400 font-bold">{ans.shortAnswerText}</span>
                                  </div>
                                )}
                                {ans.shortAnswerCalculation && (
                                  <div>
                                    <div className="text-xs text-slate-400 font-semibold mb-1">Langkah Perhitungan:</div>
                                    <div className="text-slate-200 font-mono text-xs p-3 rounded-lg bg-slate-950 whitespace-pre-wrap">{ans.shortAnswerCalculation}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* MONITORING BERKAS BUKTI YANG DIUNGGAH SISWA (AUDIO / GAMBAR / DOKUMEN) */}
                      {evidencesThisQ.length > 0 && (
                        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 mt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/30 pb-2">
                            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-400" />
                              Monitoring Berkas Bukti yang Diunggah Siswa ({evidencesThisQ.length} Berkas Terlampir)
                            </span>
                            <span className="text-[11px] text-slate-400">Arsip Otentik Multimodal</span>
                          </div>

                          <div className="space-y-3">
                            {evidencesThisQ.map((ev) => (
                              <div key={ev.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {ev.modalityType === 'audio' && <Volume2 className="w-4 h-4 text-rose-400" />}
                                    {ev.modalityType === 'handwriting' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                                    {ev.modalityType === 'document' && <FileText className="w-4 h-4 text-indigo-400" />}
                                    <span className="font-semibold text-slate-200 text-xs">{ev.fileName}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                                      {ev.modalityType}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">Diunggah: {ev.uploadTime}</span>
                                </div>

                                {/* Preview Pemutar Audio Suara Siswa */}
                                {ev.modalityType === 'audio' && (ev.storageUrl || ev.fileData || ev.previewUrl) && (
                                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <Volume2 className="w-3.5 h-3.5 text-rose-400" /> Pemutar Suara Rekaman Siswa:
                                      </span>
                                      {ev.audioDurationSeconds !== undefined && ev.audioDurationSeconds > 0 && (
                                        <span className="text-emerald-400 font-mono">
                                          {Math.floor(ev.audioDurationSeconds / 60)}:{(ev.audioDurationSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                      )}
                                    </div>
                                    <audio
                                      controls
                                      preload="metadata"
                                      src={ev.storageUrl || ev.fileData || ev.previewUrl}
                                      className="w-full h-9"
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
                                  </div>
                                )}

                                {/* Preview Foto Tulisan Tangan Siswa */}
                                {ev.modalityType === 'handwriting' && (ev.storageUrl || ev.fileData || ev.previewUrl) && (
                                  <div className="space-y-2">
                                    <div className="bg-black/70 p-3 rounded-lg border border-slate-800 flex justify-center">
                                      <img
                                        src={ev.storageUrl || ev.fileData || ev.previewUrl}
                                        alt="Tulisan Tangan Siswa"
                                        className="max-h-64 object-contain rounded cursor-pointer hover:opacity-90 shadow-md transition"
                                        onClick={() => setPreviewImageLightbox(ev.storageUrl || ev.fileData || ev.previewUrl || null)}
                                        title="Klik untuk memperbesar gambar foto"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                      <button
                                        onClick={() => setPreviewImageLightbox(ev.storageUrl || ev.fileData || ev.previewUrl || null)}
                                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Maximize2 className="w-3 h-3" /> Klik untuk Zoom Layar Penuh
                                      </button>
                                      {(ev.storageUrl || ev.fileData) && (
                                        <a
                                          href={ev.storageUrl || ev.fileData}
                                          download={ev.fileName}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" /> Unduh Berkas Asli
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Preview Dokumen PDF / Berkas */}
                                {ev.modalityType === 'document' && (
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                                    <span className="text-slate-300">Dokumen kerja terlampir aman dalam sistem</span>
                                    {(ev.storageUrl || ev.fileData) && (
                                      <a
                                        href={ev.storageUrl || ev.fileData}
                                        download={ev.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg border border-indigo-500/40 text-xs font-semibold flex items-center gap-1 transition"
                                      >
                                        <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Hasil Transkripsi STT / OCR AI jika sudah diproses */}
                                {ev.extractedText && (
                                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                                    <span className="text-amber-400 font-semibold block">
                                      Hasil Transkripsi AI ({ev.modalityType === 'audio' ? 'Speech-to-Text / Suara' : 'OCR Tulisan Tangan'}):
                                    </span>
                                    <p className="text-slate-300 font-mono text-xs whitespace-pre-wrap">{ev.extractedText}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catatan / Feedback Guru / AI */}
                      {ans.teacherFeedback && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200 space-y-1">
                          <strong className="text-emerald-400 block">Catatan Evaluasi / Ulasan:</strong>
                          <p className="leading-relaxed">{ans.teacherFeedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>

              {/* Footer Modal */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-3 shrink-0">
                <div className="text-xs text-slate-400">
                  Total Nilai Terkini: <strong className="text-emerald-400 font-bold">{selectedSubmission.totalScore} Poin</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowFullViewModal(false);
                      setShowMultimodalModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Buka Rubrik AI & Revisi Nilai</span>
                  </button>

                  <button
                    onClick={() => setShowFullViewModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition"
                  >
                    Tutup Full View
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX MODAL: Zoom Foto Tulisan Tangan Siswa */}
      {previewImageLightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImageLightbox(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={previewImageLightbox}
              download="Tulisan_Tangan_Siswa"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Berkas
            </a>
            <button
              onClick={() => setPreviewImageLightbox(null)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageLightbox}
              alt="Pratinjau Resolusi Penuh"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700"
            />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Klik di luar gambar atau tombol X untuk menutup
          </div>
        </div>
      )}

      {/* Modal Cleanup Permanen Artefak Pengujian (Admin Only) */}
      {cleanupModalSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Prosedur Cleanup Permanen</h3>
                <p className="text-xs text-red-300">Penghapusan permanen artefak pengujian (Khusus Admin)</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
              <p><strong>Siswa:</strong> {cleanupModalSubmission.studentName} ({cleanupModalSubmission.studentNis})</p>
              <p><strong>Ujian:</strong> {cleanupModalSubmission.examTitle}</p>
              <p><strong>Skor:</strong> {cleanupModalSubmission.totalScore}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alasan Penghapusan Permanen (Wajib untuk Audit Trail):
              </label>
              <textarea
                value={cleanupReason}
                onChange={e => setCleanupReason(e.target.value)}
                placeholder="Contoh: Pembersihan data dummy uji coba otomatis sistem..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-red-950/20 border border-red-900/40">
              <input
                type="checkbox"
                checked={cleanupConfirm}
                onChange={e => setCleanupConfirm(e.target.checked)}
                className="mt-0.5 rounded border-red-800 bg-slate-950 text-red-600"
              />
              <span>Saya memahami bahwa tindakan ini bersifat permanen dan tidak dapat dibatalkan. Jejak audit akan disimpan.</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCleanupModalSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCleanupPermanent}
                disabled={!cleanupConfirm || cleanupReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ekspor Excel */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        exams={exams}
        schools={schoolsList}
        classes={availableClasses}
        submissions={submissions}
        currentUser={currentUser}
        initialSchoolId={selectedSchoolId}
        initialClassId={selectedClassId}
        initialExamId={selectedExamId !== 'ALL' ? selectedExamId : undefined}
      />
    </div>
  );
};
