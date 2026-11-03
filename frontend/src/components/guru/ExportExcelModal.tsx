import React, { useState, useMemo } from 'react';
import { Exam, School, ClassRoom, User, ExamSubmission } from '../../types';
import { X, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Building2, GraduationCap, BookOpen, Filter } from 'lucide-react';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  schools: School[];
  classes: ClassRoom[];
  submissions: ExamSubmission[];
  currentUser?: User;
  initialSchoolId?: string;
  initialClassId?: string;
  initialExamId?: string;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  exams,
  schools,
  classes,
  submissions,
  currentUser,
  initialSchoolId,
  initialClassId,
  initialExamId
}) => {
  const isGuru = currentUser?.role === 'guru';
  const guruSchoolId = currentUser?.schoolId || schools.find(s => s.name === currentUser?.schoolName)?.id;

  // State Pilihan Filter
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    initialSchoolId || (isGuru && guruSchoolId ? guruSchoolId : (schools[0]?.id || 'ALL'))
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'ALL');
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || (exams[0]?.id || ''));
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [attemptsMode, setAttemptsMode] = useState<'latest' | 'all'>('latest');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Daftar Sekolah yang Berwenang
  const availableSchools = useMemo(() => {
    if (isGuru) {
      return schools.filter(s => s.id === guruSchoolId || (currentUser?.schoolName && s.name.toLowerCase() === currentUser.schoolName.toLowerCase()));
    }
    return schools;
  }, [schools, isGuru, guruSchoolId, currentUser]);

  // Daftar Kelas Tersedia Berdasarkan Sekolah Terpilih
  const availableClasses = useMemo(() => {
    let cls = classes;
    if (selectedSchoolId && selectedSchoolId !== 'ALL') {
      cls = cls.filter(c => c.schoolId === selectedSchoolId);
    }
    if (isGuru && currentUser?.assignedClassIds && currentUser.assignedClassIds.length > 0) {
      cls = cls.filter(c => currentUser.assignedClassIds?.includes(c.id));
    }
    return cls;
  }, [classes, selectedSchoolId, isGuru, currentUser]);

  // Daftar Ujian Tersedia Berdasarkan Sekolah & Kelas
  const availableExams = useMemo(() => {
    return exams.filter(e => {
      const matchSchool = selectedSchoolId === 'ALL' || !e.schoolId || e.schoolId === selectedSchoolId;
      const matchClass = selectedClassId === 'ALL' || !e.classId || e.classId === selectedClassId;
      return matchSchool && matchClass;
    });
  }, [exams, selectedSchoolId, selectedClassId]);

  // Update selected exam jika pilihan exam saat ini tidak ada di daftar
  React.useEffect(() => {
    if (availableExams.length > 0 && !availableExams.some(e => e.id === selectedExamId)) {
      setSelectedExamId(availableExams[0].id);
    }
  }, [availableExams, selectedExamId]);

  // Hitung Estimasi Jumlah Baris yang Akan Diekspor
  const eligibleSubmissionsCount = useMemo(() => {
    if (!selectedExamId) return 0;
    let list = submissions.filter(s => s.examId === selectedExamId);

    if (selectedClassId !== 'ALL') {
      const clsObj = classes.find(c => c.id === selectedClassId);
      list = list.filter(s => s.classId === selectedClassId || (clsObj && s.className === clsObj.name));
    }

    if (!includeArchived) {
      list = list.filter(s => !s.isArchived && !s.deletedAt);
    }

    if (attemptsMode === 'latest') {
      const studentMap = new Set<string>();
      list.forEach(s => studentMap.add(s.studentId || s.studentNis));
      return studentMap.size;
    }

    return list.length;
  }, [submissions, selectedExamId, selectedClassId, classes, includeArchived, attemptsMode]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!selectedExamId) {
      setErrorMsg('Silakan pilih ujian terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('voc_token') || sessionStorage.getItem('voc_token') || '';
      const params = new URLSearchParams();
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.append('classId', selectedClassId);
      }
      params.append('includeArchived', includeArchived ? 'true' : 'false');
      params.append('attemptsMode', attemptsMode);

      const url = `/api/exams/${selectedExamId}/export-excel?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {}
        throw new Error(errJson?.error || `Ekspor gagal dengan kode status HTTP ${response.status}`);
      }

      // Ambil nama file dari Content-Disposition atau X-Filename jika ada
      let filename = 'Hasil_Ujian.xlsx';
      const disposition = response.headers.get('Content-Disposition');
      const xFilename = response.headers.get('X-Filename');

      if (xFilename) {
        filename = xFilename;
      } else if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg(`File "${filename}" berhasil diunduh.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[Export Excel Modal] Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengekspor file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const currentSelectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-up">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md text-emerald-400 border border-white/10">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Ekspor Hasil Ujian ke Excel (.xlsx)</h3>
              <p className="text-xs text-blue-200">
                Format resmi: Nama, NIS, Jawaban & Feedback Soal 1..N dinamis, dan Total Skor akhir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-700 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Pemilihan Sekolah */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. Sekolah</span>
            </label>
            <select
              disabled={isGuru || loading}
              value={selectedSchoolId}
              onChange={e => {
                setSelectedSchoolId(e.target.value);
                setSelectedClassId('ALL');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
            >
              {!isGuru && <option value="ALL">Semua Sekolah (Admin)</option>}
              {availableSchools.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pemilihan Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>2. Kelas Rombel</span>
            </label>
            <select
              disabled={loading}
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kelas Terkait</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pemilihan Ujian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>3. Ujian yang Diekspor</span>
            </label>
            <select
              disabled={loading}
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableExams.length === 0 ? (
                <option value="">Tidak ada ujian pada filter ini</option>
              ) : (
                availableExams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} - ({e.className || 'Kelas Terdaftar'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 4. Opsi & Parameter Filter Tambahan */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Opsi Tambahan &amp; Kebijakan Percobaan</span>
            </div>

            {/* Toggle Status Arsip */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                disabled={loading}
                checked={includeArchived}
                onChange={e => setIncludeArchived(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-800">
                  Sertakan Submission yang Diarsipkan
                </span>
                <p className="text-xs text-slate-500">
                  Jika tidak dicentang, hanya submission aktif yang akan dimasukkan ke dalam sheet Excel.
                </p>
              </div>
            </label>

            {/* Pilihan Percobaan Siswa */}
            <div className="pt-2 border-t border-slate-200">
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Pilihan Percobaan (Multi-Attempt):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className={`flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  attemptsMode === 'latest' ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-medium' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="attemptsMode"
                    value="latest"
                    checked={attemptsMode === 'latest'}
                    onChange={() => setAttemptsMode('latest')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">Percobaan Terbaru (Default)</span>
                    <span className="text-[11px] text-slate-500">1 baris per siswa (attempt tertinggi)</span>
                  </div>
                </label>

                <label className={`flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  attemptsMode === 'all' ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-medium' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="attemptsMode"
                    value="all"
                    checked={attemptsMode === 'all'}
                    onChange={() => setAttemptsMode('all')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">Seluruh Percobaan</span>
                    <span className="text-[11px] text-slate-500">Semua riwayat retake disertakan</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Ringkasan Metadata Sebelum Ekspor */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
            <div>
              <span className="font-semibold block">
                Estimasi Data: {eligibleSubmissionsCount} baris submission siswa
              </span>
              <span className="text-blue-700">
                {currentSelectedExam ? `Ujian: ${currentSelectedExam.title}` : 'Pilih ujian'}
              </span>
            </div>
            <div className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded-md text-[11px]">
              {includeArchived ? 'Aktif + Arsip' : 'Hanya Aktif'}
            </div>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !selectedExamId || eligibleSubmissionsCount === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses XLSX...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh File Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
