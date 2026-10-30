import React, { useState } from 'react';
import { User, PortfolioItem, JobPosition } from '../../types';
import { TARGET_JOBS } from '../../data/mockData';
import {
  Briefcase,
  UploadCloud,
  FileText,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
  Award,
  RefreshCw,
  Info,
  Layers,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  Eye,
  FileCheck,
  FlaskConical,
  Filter
} from 'lucide-react';

interface SiswaPortfolioProps {
  currentUser: User;
  portfolios: PortfolioItem[];
  onAddPortfolio: (item: PortfolioItem) => void;
  onDeletePortfolio: (id: string) => void;
  onUpdatePortfolio?: (item: PortfolioItem) => void;
  onUpdateCurrentUser?: (user: User) => void;
  setActiveTab?: (tab: string) => void;
}

export const SiswaPortfolio: React.FC<SiswaPortfolioProps> = ({
  currentUser,
  portfolios,
  onAddPortfolio,
  onDeletePortfolio,
  onUpdatePortfolio,
  onUpdateCurrentUser,
  setActiveTab
}) => {
  const [selectedTargetJob, setSelectedTargetJob] = useState<string>(
    currentUser.targetJobTitle || TARGET_JOBS[0].title
  );

  // Filter portfolios for this student
  const studentPortfolios = portfolios.filter(p => p.studentId === currentUser.id);

  // Separation of categories
  const practicumReports = studentPortfolios.filter(p => p.category === 'laporan_praktikum');
  const certificatePortfolios = studentPortfolios.filter(p => p.category !== 'laporan_praktikum');
  const MAX_PRACTICUM_COUNT = 3;
  const isPracticumLimitReached = practicumReports.length >= MAX_PRACTICUM_COUNT;

  // Filter Tab State
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'sertifikat' | 'laporan_praktikum'>('all');

  // Certificate Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'sertifikat' | 'pkl' | 'proyek' | 'uji_kompetensi'>('sertifikat');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState('');

  // Practicum Report Modal State (Strict Max 3 Documents)
  const [showPracticumModal, setShowPracticumModal] = useState(false);
  const [practicumTitle, setPracticumTitle] = useState('');
  const [practicumTopic, setPracticumTopic] = useState('');
  const [practicumLab, setPracticumLab] = useState('Laboratorium Kimia Analisis');
  const [practicumDate, setPracticumDate] = useState(new Date().toISOString().split('T')[0]);
  const [practicumDesc, setPracticumDesc] = useState('');
  const [practicumPdfFile, setPracticumPdfFile] = useState<File | null>(null);
  const [practicumPdfBase64, setPracticumPdfBase64] = useState<string>('');
  const [practicumFileError, setPracticumFileError] = useState<string>('');
  const [isPracticumProcessing, setIsPracticumProcessing] = useState(false);
  const [practicumFormError, setPracticumFormError] = useState('');

  // PDF Preview Modal
  const [previewPdfItem, setPreviewPdfItem] = useState<PortfolioItem | null>(null);

  // Target Job Update Handler
  const handleTargetJobChange = (newTarget: string) => {
    setSelectedTargetJob(newTarget);
    if (onUpdateCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        targetJobTitle: newTarget
      };
      onUpdateCurrentUser(updatedUser);
      try {
        localStorage.setItem('voc_user', JSON.stringify(updatedUser));
      } catch {}
    }
  };

  // Certificate PDF File Handler (Strict Max 1MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Format file wajib berupa PDF (*.pdf).');
      setPdfFile(null);
      setPdfBase64('');
      return;
    }

    // Validate max 1MB = 1,048,576 bytes
    const maxSizeBytes = 1024 * 1024; // 1 MB
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileError(`Ukuran file (${sizeMB} MB) melebihi batas maksimal 1 MB.`);
      setPdfFile(null);
      setPdfBase64('');
      return;
    }

    setPdfFile(file);

    // Read base64 for offline storage/preview
    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Practicum PDF File Handler (Strict PDF, Max 2MB)
  const handlePracticumFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPracticumFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPracticumFileError('Format berkas wajib PDF (*.pdf).');
      setPracticumPdfFile(null);
      setPracticumPdfBase64('');
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setPracticumFileError(`Ukuran file (${sizeMB} MB) melebihi batas maksimal 2 MB.`);
      setPracticumPdfFile(null);
      setPracticumPdfBase64('');
      return;
    }

    setPracticumPdfFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPracticumPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit and Evaluate in Background
  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !issuer.trim()) {
      setFormError('Judul sertifikat dan lembaga penerbit wajib diisi.');
      return;
    }

    setIsProcessing(true);

    try {
      // Background AI API evaluation for teacher validation backend
      const response = await fetch('/api/ai/evaluate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          issuer: issuer.trim(),
          date,
          description: description.trim(),
          targetJobTitle: selectedTargetJob,
          fileName: pdfFile?.name || 'sertifikat.pdf',
          studentName: currentUser.name
        })
      });

      const resJson = await response.json();
      let aiScore = 8.5;
      let aiRelevance: 'Sangat Tinggi' | 'Tinggi' | 'Cukup' | 'Dasar' = 'Tinggi';
      let aiFeedback = `Sertifikat ${title.trim()} memberikan bobot kompetensi yang kuat untuk target karir ${selectedTargetJob}.`;
      let aiKeySkills = ['Kompetensi Terapan Laboratorium', 'Kepatuhan Standar SOP Industri'];

      if (resJson.success && resJson.evaluation) {
        aiScore = Number(resJson.evaluation.score) || 8.5;
        aiRelevance = resJson.evaluation.relevance || 'Tinggi';
        aiFeedback = resJson.evaluation.feedback || aiFeedback;
        aiKeySkills = resJson.evaluation.keySkills || aiKeySkills;
      }

      const newItem: PortfolioItem = {
        id: `port-${Date.now()}`,
        studentId: currentUser.id,
        title: title.trim(),
        category,
        issuer: issuer.trim(),
        date,
        description: description.trim(),
        fileName: pdfFile?.name || (pdfBase64 ? 'dokumen_sertifikat.pdf' : undefined),
        fileSize: pdfFile?.size,
        pdfBase64: pdfBase64 || undefined,
        targetJobTitle: selectedTargetJob,
        aiScore,
        aiRelevance,
        aiFeedback,
        aiKeySkills,
        aiEvaluatedAt: new Date().toISOString(),
        isVerified: true,
        isValidatedByTeacher: false // Requires teacher validation
      };

      onAddPortfolio(newItem);
      setShowUploadModal(false);
      resetForm();
    } catch (err: any) {
      console.warn('Evaluation service fallback:', err);
      const newItem: PortfolioItem = {
        id: `port-${Date.now()}`,
        studentId: currentUser.id,
        title: title.trim(),
        category,
        issuer: issuer.trim(),
        date,
        description: description.trim(),
        fileName: pdfFile?.name,
        fileSize: pdfFile?.size,
        pdfBase64: pdfBase64 || undefined,
        targetJobTitle: selectedTargetJob,
        aiScore: 8.0,
        aiRelevance: 'Tinggi',
        aiFeedback: `Sertifikat ${title.trim()} berhasil diunggah untuk target posisi ${selectedTargetJob}.`,
        aiKeySkills: ['Kompetensi Kimia Industri', 'Praktik Laboratorium'],
        aiEvaluatedAt: new Date().toISOString(),
        isVerified: true,
        isValidatedByTeacher: false
      };
      onAddPortfolio(newItem);
      setShowUploadModal(false);
      resetForm();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('sertifikat');
    setIssuer('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPdfFile(null);
    setPdfBase64('');
    setFileError('');
    setFormError('');
  };

  // Submit Practicum Report (Strict Max 3 Documents)
  const handleSubmitPracticum = async (e: React.FormEvent) => {
    e.preventDefault();
    setPracticumFormError('');

    if (isPracticumLimitReached) {
      setPracticumFormError('Batas maksimal 3 dokumen laporan praktikum telah tercapai.');
      return;
    }

    if (!practicumTitle.trim() || !practicumTopic.trim()) {
      setPracticumFormError('Judul laporan praktikum dan topik/materi wajib diisi.');
      return;
    }

    if (!practicumPdfFile && !practicumPdfBase64) {
      setPracticumFormError('Berkas laporan praktikum dalam format PDF wajib diunggah.');
      return;
    }

    setIsPracticumProcessing(true);

    try {
      const newItem: PortfolioItem = {
        id: `port-prak-${Date.now()}`,
        studentId: currentUser.id,
        title: practicumTitle.trim(),
        category: 'laporan_praktikum',
        practicumTopic: practicumTopic.trim(),
        issuer: practicumLab.trim() || 'Laboratorium Kimia Analisis',
        date: practicumDate,
        description: practicumDesc.trim(),
        fileName: practicumPdfFile?.name || 'laporan_praktikum.pdf',
        fileSize: practicumPdfFile?.size,
        pdfBase64: practicumPdfBase64 || undefined,
        targetJobTitle: selectedTargetJob,
        aiScore: 8.5,
        aiRelevance: 'Tinggi',
        aiFeedback: `Laporan praktikum ${practicumTitle.trim()} topik ${practicumTopic.trim()} memperkuat bukti kompetensi kerja laboratorium.`,
        aiKeySkills: ['Prosedur Analisis Laboratorium', 'Pencatatan Presisi Hasil Uji', 'Kepatuhan SOP K3LH'],
        aiEvaluatedAt: new Date().toISOString(),
        isVerified: true,
        isValidatedByTeacher: false
      };

      onAddPortfolio(newItem);
      setShowPracticumModal(false);
      resetPracticumForm();
    } catch (err: any) {
      console.error(err);
      setPracticumFormError('Gagal mengunggah laporan praktikum.');
    } finally {
      setIsPracticumProcessing(false);
    }
  };

  const resetPracticumForm = () => {
    setPracticumTitle('');
    setPracticumTopic('');
    setPracticumLab('Laboratorium Kimia Analisis');
    setPracticumDate(new Date().toISOString().split('T')[0]);
    setPracticumDesc('');
    setPracticumPdfFile(null);
    setPracticumPdfBase64('');
    setPracticumFileError('');
    setPracticumFormError('');
  };

  // Statistics
  const totalCount = studentPortfolios.length;
  const validatedCount = studentPortfolios.filter(p => p.isValidatedByTeacher).length;
  const pendingCount = totalCount - validatedCount;

  // Filtered list based on active tab
  const displayedPortfolios = studentPortfolios.filter(item => {
    if (activeFilterTab === 'sertifikat') return item.category !== 'laporan_praktikum';
    if (activeFilterTab === 'laporan_praktikum') return item.category === 'laporan_praktikum';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Target Career Configuration */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Rekam Jejak Portofolio & Kualifikasi Kejuruan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-blue-400" />
              Portofolio, Sertifikat & Laporan Praktikum
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Unggah sertifikat kompetensi dan laporan praktikum kimia (maksimal 3 dokumen PDF). Seluruh berkas akan ditinjau dan divalidasi oleh Guru Pembimbing / Admin untuk portofolio kesiapan kerja.
            </p>
          </div>

          {/* Action Buttons: Sertifikat + Laporan Praktikum (Maks 3) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {/* Tombol Unggah Laporan Praktikum (Maks 3 Dokumen PDF) */}
            <button
              onClick={() => {
                if (isPracticumLimitReached) {
                  alert('Batas kuota maksimal 3 dokumen laporan praktikum telah tercapai. Hapus salah satu berkas lama jika ingin mengganti dokumen baru.');
                  return;
                }
                setShowPracticumModal(true);
              }}
              disabled={isPracticumLimitReached}
              className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                isPracticumLimitReached
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 transform hover:scale-[1.02]'
              }`}
              title={isPracticumLimitReached ? 'Maksimal 3 dokumen laporan praktikum telah diunggah' : 'Unggah Laporan Praktikum Kimia'}
            >
              <FlaskConical className="w-4 h-4 text-emerald-300" />
              <span>Unggah Laporan Praktikum (PDF)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isPracticumLimitReached ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-950/60 text-emerald-200 border border-emerald-400/30'
              }`}>
                {practicumReports.length}/3
              </span>
            </button>

            {/* Tombol Unggah Sertifikat PDF */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Sertifikat PDF</span>
            </button>
          </div>
        </div>

        {/* Quota Banner Notification for Laporan Praktikum */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              <strong>Ketentuan Laporan Praktikum:</strong> Format wajib PDF (maksimal 2 MB), kuota <strong>maksimal 3 dokumen</strong> per siswa untuk divalidasi oleh Guru / Admin.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
              isPracticumLimitReached
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}>
              {practicumReports.length}/3 Dokumen Praktikum Terunggah
            </span>
          </div>
        </div>

        {/* Target Job Selector in User Profile Identity */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Target Posisi Profesi / Karir:</div>
              <div className="text-xs font-bold text-white">{selectedTargetJob}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Ganti Target:</label>
            <select
              value={selectedTargetJob}
              onChange={(e) => handleTargetJobChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {TARGET_JOBS.map(job => (
                <option key={job.id} value={job.title}>{job.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Portofolio</div>
            <div className="text-xl font-bold text-white">{totalCount} Dokumen</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Laporan Praktikum</div>
            <div className="text-xl font-bold text-teal-400">{practicumReports.length}/3 PDF</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Terverifikasi Guru/Admin</div>
            <div className="text-xl font-bold text-emerald-400">{validatedCount} Berkas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Menunggu Validasi</div>
            <div className="text-xl font-bold text-amber-400">{pendingCount} Berkas</div>
          </div>
        </div>
      </div>

      {/* Portfolios & Practicum List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Daftar Dokumen Portofolio & Laporan Praktikum
            </h3>
            <span className="text-xs text-slate-400">({displayedPortfolios.length} berkas)</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilterTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({studentPortfolios.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('sertifikat')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilterTab === 'sertifikat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sertifikat ({certificatePortfolios.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('laporan_praktikum')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilterTab === 'laporan_praktikum'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400/90 hover:text-emerald-300'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Praktikum ({practicumReports.length}/3 PDF)</span>
            </button>
          </div>
        </div>

        {displayedPortfolios.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              {activeFilterTab === 'laporan_praktikum' ? (
                <FlaskConical className="w-8 h-8 text-emerald-400" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">
                {activeFilterTab === 'laporan_praktikum'
                  ? 'Belum Ada Laporan Praktikum yang Diunggah'
                  : 'Belum Ada Dokumen yang Diunggah'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {activeFilterTab === 'laporan_praktikum'
                  ? 'Unggah laporan praktikum kimia laboratorium Anda (format PDF maksimal 3 dokumen) untuk divalidasi oleh Guru / Admin.'
                  : 'Unggah sertifikat pelatihan kejuruan, sertifikasi K3, atau laporan praktikum dalam format PDF untuk melengkapi profil kesiapan kerja.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (isPracticumLimitReached) {
                    alert('Batas maksimal 3 dokumen laporan praktikum telah tercapai.');
                    return;
                  }
                  setShowPracticumModal(true);
                }}
                disabled={isPracticumLimitReached}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Unggah Laporan Praktikum (PDF)</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Unggah Sertifikat</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedPortfolios.map(item => {
              const isValidated = !!item.isValidatedByTeacher;
              const isPracticum = item.category === 'laporan_praktikum';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border space-y-4 shadow-xl transition-all relative flex flex-col justify-between ${
                    isPracticum
                      ? 'bg-slate-900/90 border-emerald-500/20 hover:border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Category + Teacher Validation Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border inline-flex items-center gap-1.5 ${
                          isPracticum
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : item.category === 'sertifikat'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : item.category === 'pkl'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                        }`}>
                          {isPracticum && <FlaskConical className="w-3 h-3" />}
                          {isPracticum
                            ? 'Laporan Praktikum Kimia (PDF)'
                            : item.category === 'sertifikat'
                            ? 'Sertifikat Pelatihan'
                            : item.category === 'pkl'
                            ? 'Laporan PKL / Magang'
                            : item.category === 'uji_kompetensi'
                            ? 'Uji Kompetensi BNSP'
                            : 'Proyek Vokasi'}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">{item.title}</h4>
                      </div>

                      {/* Teacher Validation Badge */}
                      {isValidated ? (
                        <div className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shrink-0 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Terverifikasi Guru/Admin</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shrink-0 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Menunggu Validasi</span>
                        </div>
                      )}
                    </div>

                    {/* Practicum Topic Badge (if practicum) */}
                    {isPracticum && item.practicumTopic && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs flex items-center gap-2 text-emerald-200">
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>Topik Praktikum:</strong> {item.practicumTopic}</span>
                      </div>
                    )}

                    {/* Issuer and Date */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.issuer}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Status Note */}
                    {isValidated ? (
                      <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-emerald-300">
                            Telah Divalidasi oleh {item.verifiedByTeacher || 'Guru Pembimbing / Admin'}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            Dokumen ini telah diperiksa dan disetujui untuk masuk dalam rekam jejak capaian profil kesiapan kerja Anda.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-300">Menunggu Pemeriksaan Guru / Admin</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Berkas telah tersimpan di sistem dan masuk dalam antrean verifikasi oleh Guru Pembimbing / Admin.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions: File Preview / Download + Delete */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      {item.fileName ? (
                        <button
                          onClick={() => setPreviewPdfItem(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate max-w-[150px]">{item.fileName}</span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Dokumen Terdata
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onDeletePortfolio(item.id)}
                      className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal (PDF Max 1MB + Details) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Unggah Sertifikat & Portofolio Baru</h3>
                  <p className="text-xs text-slate-400">Format PDF maksimal 1 MB • Terhubung ke rekam jejak portofolio</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCertificate} className="space-y-4">
              {/* PDF File Upload Zone (Max 1MB) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>File Sertifikat (Format PDF, Maks 1 MB) *</span>
                  <span className="text-[10px] text-slate-400">Maks. 1.048.576 bytes</span>
                </label>

                <div className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 ${
                  pdfFile
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : fileError
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}>
                  <input
                    type="file"
                    id="pdf-upload"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer block space-y-2">
                    <UploadCloud className={`w-8 h-8 mx-auto ${pdfFile ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {pdfFile ? (
                      <div>
                        <div className="text-xs font-bold text-emerald-300">{pdfFile.name}</div>
                        <div className="text-[11px] text-slate-400">{(pdfFile.size / 1024).toFixed(1)} KB (Memenuhi syarat ≤ 1 MB) • Klik untuk mengganti</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-bold text-white">Klik untuk memilih file PDF dari komputer</div>
                        <div className="text-[11px] text-slate-400">Hanya dokumen PDF dengan ukuran maksimal 1 MB</div>
                      </div>
                    )}
                  </label>
                </div>
                {fileError && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fileError}
                  </p>
                )}
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Judul / Nama Sertifikat *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sertifikasi K3 Laboratorium Kimia"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kategori Portofolio</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="sertifikat">Sertifikat Pelatihan / Kompetensi</option>
                    <option value="uji_kompetensi">Uji Kompetensi BNSP / LSP</option>
                    <option value="pkl">Laporan PKL / Magang Industri</option>
                    <option value="proyek">Proyek Analisis / Lomba Vokasi</option>
                  </select>
                </div>
              </div>

              {/* Issuer & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Lembaga / Instansi Penerbit *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BNSP / Balai Standardisasi / PT Bio Farma"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Penerbitan</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description & Competencies */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Deskripsi & Ruang Lingkup Keterampilan yang Dikuasai
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan keterampilan spesifik yang diperoleh, instrumen yang digunakan (misal HPLC, UV-Vis, Titrasi), atau modul penanganan bahaya B3..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* Target Career Notification */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-indigo-300">
                <Building2 className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-200">Target Profesi: {selectedTargetJob}</span>
                  <p className="text-[11px] text-slate-400">
                    Sertifikat yang diunggah akan diajukan ke Guru Pembimbing untuk verifikasi kualifikasi standar industri.
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sedang Mengunggah Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Simpan & Ajukan Portofolio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Unggah Laporan Praktikum (Strict Maks 3 Dokumen PDF) */}
      {showPracticumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Unggah Laporan Praktikum Kimia (PDF)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      Maks. 3 Berkas ({practicumReports.length + 1}/3)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Format PDF maksimal 2 MB • Divalidasi oleh Guru / Admin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPracticumModal(false);
                  resetPracticumForm();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {practicumFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{practicumFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPracticum} className="space-y-4">
              {/* PDF File Upload Zone (Max 2MB) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Berkas Laporan Praktikum (Format PDF) *</span>
                  <span className="text-[10px] text-slate-400">Maks. 2.097.152 bytes (2 MB)</span>
                </label>

                <div className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 ${
                  practicumPdfFile
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : practicumFileError
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950 border-slate-800 hover:border-emerald-700/60'
                }`}>
                  <input
                    type="file"
                    id="practicum-pdf-upload"
                    accept="application/pdf"
                    onChange={handlePracticumFileChange}
                    className="hidden"
                  />
                  <label htmlFor="practicum-pdf-upload" className="cursor-pointer block space-y-2">
                    <FlaskConical className={`w-8 h-8 mx-auto ${practicumPdfFile ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {practicumPdfFile ? (
                      <div>
                        <div className="text-xs font-bold text-emerald-300">{practicumPdfFile.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {(practicumPdfFile.size / 1024).toFixed(1)} KB (Memenuhi syarat PDF ≤ 2 MB) • Klik untuk ganti
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-bold text-white">Klik untuk memilih file PDF Laporan Praktikum</div>
                        <div className="text-[11px] text-slate-400">Hanya dokumen PDF dengan ukuran maksimal 2 MB</div>
                      </div>
                    )}
                  </label>
                </div>
                {practicumFileError && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {practicumFileError}
                  </p>
                )}
              </div>

              {/* Title & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Judul Praktikum *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Analisis Titrimetri Sampel Air Limbah"
                    value={practicumTitle}
                    onChange={(e) => setPracticumTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Topik / Modul Praktikum *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Titrasi Asam-Basa & Volumetri"
                    value={practicumTopic}
                    onChange={(e) => setPracticumTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lab & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Laboratorium / Tempat Uji *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Laboratorium Kimia Analisis Terpadu"
                    value={practicumLab}
                    onChange={(e) => setPracticumLab(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Praktikum</label>
                  <input
                    type="date"
                    value={practicumDate}
                    onChange={(e) => setPracticumDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description / Summary of Results */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ringkasan Prosedur & Temuan Eksperimen
                </label>
                <textarea
                  rows={3}
                  placeholder="Ringkas alat dan instrumen yang digunakan, larutan baku, indikator, hasil titrasi / perhitungan kadar analit, dan kesimpulan pengujian..."
                  value={practicumDesc}
                  onChange={(e) => setPracticumDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              {/* Quota reminder */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
                <FlaskConical className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-300">
                    Kuota Siswa: Maksimal 3 Dokumen Laporan Praktikum PDF
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Laporan yang diunggah akan masuk ke daftar verifikasi Guru / Admin dan dapat dibuka pratinjau PDF-nya langsung untuk disetujui.
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPracticumModal(false);
                    resetPracticumForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPracticumProcessing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  {isPracticumProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sedang Mengunggah Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Simpan & Ajukan Laporan Praktikum</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewPdfItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                {previewPdfItem.category === 'laporan_praktikum' ? (
                  <FlaskConical className="w-6 h-6 text-emerald-400" />
                ) : (
                  <FileCheck className="w-6 h-6 text-blue-400" />
                )}
                <div>
                  <h3 className="text-base font-bold text-white">{previewPdfItem.title}</h3>
                  <p className="text-xs text-slate-400">
                    {previewPdfItem.category === 'laporan_praktikum' ? (
                      <>Topik: {previewPdfItem.practicumTopic || 'Praktikum Kimia'} • {previewPdfItem.issuer} • {previewPdfItem.fileName || 'laporan_praktikum.pdf'}</>
                    ) : (
                      <>{previewPdfItem.issuer} • {previewPdfItem.fileName || 'sertifikat.pdf'}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewPdfItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Details & Viewer */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Status Validasi</div>
                  <div className={`text-xs font-bold ${previewPdfItem.isValidatedByTeacher ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {previewPdfItem.isValidatedByTeacher ? '✓ Terverifikasi Guru / Admin' : '⏳ Menunggu Validasi'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Kategori Dokumen</div>
                  <div className="text-xs font-bold text-white capitalize">
                    {previewPdfItem.category === 'laporan_praktikum' ? 'Laporan Praktikum (PDF)' : previewPdfItem.category}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Tanggal Dokumen</div>
                  <div className="text-xs font-bold text-white">{previewPdfItem.date}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Ukuran File</div>
                  <div className="text-xs font-bold text-emerald-400">
                    {previewPdfItem.fileSize ? `${(previewPdfItem.fileSize / 1024).toFixed(1)} KB` : '< 2 MB'}
                  </div>
                </div>
              </div>

              {/* Embedded PDF iframe or base64 viewer */}
              {previewPdfItem.pdfBase64 ? (
                <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <iframe
                    src={previewPdfItem.pdfBase64}
                    title="PDF Document Preview"
                    className="w-full h-full border-0"
                  ></iframe>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-emerald-400" />
                  <div className="text-xs text-slate-300">
                    Dokumen PDF ini tersimpan dan terdata dalam rekam jejak portofolio digital Anda.
                  </div>
                </div>
              )}

              {/* Status Note */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Verifikasi Rekam Jejak Portofolio
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  {previewPdfItem.isValidatedByTeacher
                    ? `Dokumen ini telah disetujui secara resmi oleh ${previewPdfItem.verifiedByTeacher || 'Guru Pembimbing / Admin'}.`
                    : 'Dokumen ini dalam antrean verifikasi oleh Guru Pembimbing / Evaluator Sekolah.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPdfItem(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
