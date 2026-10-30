import React, { useState } from 'react';
import { User, Exam, ClassRoom, ExamSubmission } from '../../types';
import {
  PlayCircle,
  Award,
  ArrowRight,
  Sparkles,
  Calendar,
  Briefcase,
  AlertCircle,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';

interface SiswaDashboardProps {
  currentUser: User;
  classes: ClassRoom[];
  exams: Exam[];
  submissions: ExamSubmission[];
  setActiveTab: (tab: string) => void;
  onStartExam: (exam: Exam) => void;
  onViewResult: (examId: string) => void;
}

export const SiswaDashboard: React.FC<SiswaDashboardProps> = ({
  currentUser,
  classes,
  exams,
  submissions,
  setActiveTab,
  onStartExam,
  onViewResult
}) => {
  const [confirmingExam, setConfirmingExam] = useState<Exam | null>(null);

  // Joined class information
  const myClass = classes.find(c => c.name === currentUser.className || c.id === currentUser.classId) || classes[0];

  // Latest assessment results khusus milik siswa yang sedang login
  const studentSubs = submissions.filter(s =>
    (s.studentId && s.studentId === currentUser.id) ||
    (currentUser.identityNo && (s.studentNis === currentUser.identityNo || s.studentId === `usr-std-${currentUser.identityNo}`)) ||
    (currentUser.email && (s as any).studentEmail && (s as any).studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
    (currentUser.name && s.studentName && s.studentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );

  // Exams relevant for student's class and school (perseorangan)
  const myClassExams = exams.filter(e => {
    const hasSubmitted = studentSubs.some(s => s.examId === e.id);
    // PRINSIP PERSEORANGAN: Jika ujian sudah selesai (lewat) dan siswa ini belum pernah mengerjakan,
    // maka otomatis tidak ada di daftar siswa ini (sudah lewat, bukan susulan)
    if (e.status === 'selesai' && !hasSubmitted) {
      return false;
    }

    if (e.classId && currentUser.classId && e.classId === currentUser.classId) return true;
    if (e.className && currentUser.className) {
      const cleanE = e.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanU = currentUser.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanE === cleanU) return true;
    }
    if (e.className?.toLowerCase() === 'semua kelas' || e.classId === 'all') {
      return !e.schoolName || e.schoolName.trim().toLowerCase() === currentUser.schoolName?.trim().toLowerCase();
    }
    if (!e.classId && !e.className && e.schoolName && currentUser.schoolName) {
      return e.schoolName.trim().toLowerCase() === currentUser.schoolName.trim().toLowerCase();
    }
    if (e.schoolName && currentUser.schoolName && e.schoolName.trim().toLowerCase() === currentUser.schoolName.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  // Ujian yang aktif & belum dikerjakan oleh siswa ini (hanya yang statusnya berjalan)
  const activeUnsubmittedExams = myClassExams.filter(e => {
    const hasSubmitted = studentSubs.some(s => s.examId === e.id);
    return !hasSubmitted && e.status === 'berjalan';
  });

  // Daftar ringkas ujian di dashboard (prioritas ujian belum selesai & jadwal aktif)
  const dashboardExamsList = [...myClassExams].sort((a, b) => {
    const subA = studentSubs.some(s => s.examId === a.id);
    const subB = studentSubs.some(s => s.examId === b.id);
    if (!subA && subB) return -1;
    if (subA && !subB) return 1;
    return new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime();
  }).slice(0, 5);

  const latestSubmissions = [...studentSubs]
    .sort((a, b) => new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime())
    .slice(0, 3);

  // Helper deteksi kategori submission (Teknis Kimia vs Employability)
  const isSubmissionTechnical = (s: ExamSubmission) => {
    const parentExam = exams.find(e => e.id === s.examId);
    const pkg = parentExam?.package;
    if (pkg?.category === 'teknis_kimia' || pkg?.id?.includes('teknis') || pkg?.id?.includes('full-24')) return true;
    if (pkg?.category === 'employability' || pkg?.id?.includes('employability') || pkg?.id?.includes('non-tes')) return false;
    const title = (s.examTitle || parentExam?.title || '').toLowerCase();
    if (title.includes('non-tes') || title.includes('employability') || title.includes('sikap') || title.includes('karakter')) return false;
    if (title.includes('teknis') || title.includes('kimia') || title.includes('kejuruan') || title.includes('vokasi') || title.includes('k3lh') || title.includes('analisis')) return true;
    const ansKeys = Object.keys(s.answers || {});
    if (ansKeys.some(k => k.startsWith('q-') || k.startsWith('tk-') || k.startsWith('tk_'))) return true;
    if (ansKeys.some(k => k.startsWith('nt-') || k.startsWith('emp-'))) return false;
    return true;
  };

  const isSubmissionEmployability = (s: ExamSubmission) => {
    const parentExam = exams.find(e => e.id === s.examId);
    const pkg = parentExam?.package;
    if (pkg?.category === 'employability' || pkg?.id?.includes('employability') || pkg?.id?.includes('non-tes')) return true;
    if (pkg?.category === 'teknis_kimia' || pkg?.id?.includes('teknis') || pkg?.id?.includes('full-24')) return false;
    const title = (s.examTitle || parentExam?.title || '').toLowerCase();
    if (title.includes('non-tes') || title.includes('employability') || title.includes('sikap') || title.includes('karakter')) return true;
    const ansKeys = Object.keys(s.answers || {});
    if (ansKeys.some(k => k.startsWith('nt-') || k.startsWith('emp-'))) return true;
    return false;
  };

  // Compute readiness scores for quick preview
  const techSubs = studentSubs.filter(isSubmissionTechnical);
  const empSubs = studentSubs.filter(isSubmissionEmployability);

  const techScore = techSubs.length > 0
    ? Math.round(techSubs.reduce((acc, s) => acc + (s.technicalScore || 0), 0) / techSubs.length)
    : 0;

  const empScore = empSubs.length > 0
    ? Math.round(empSubs.reduce((acc, s) => acc + (s.employabilityScore || 0), 0) / empSubs.length)
    : 0;

  return (
    <div className="space-y-7">
      {/* Welcome Banner with Proper Spacing & Padding */}
      <div className="p-7 sm:p-9 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border border-slate-800 shadow-xl space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>Portal Asesmen Mandiri & Kesiapan Kerja Siswa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Halo, {currentUser.name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Rombel: <strong className="text-white font-bold">{myClass?.name || 'XII Kimia Analitik 1'}</strong> • NIS: <strong className="text-white font-bold">{currentUser.identityNo}</strong> • Sekolah: <strong className="text-white font-bold">{currentUser.schoolName || 'SMK Negeri 1 Kimia Industri Bandung'}</strong>
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('kesiapan_kerja')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02]"
          >
            <Award className="w-4 h-4" />
            <span>Lihat Profil Kesiapan Kerja</span>
          </button>
          <button
            onClick={() => setActiveTab('portofolio')}
            className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>Portofolio & Sertifikat</span>
          </button>
        </div>
      </div>

      {/* Alert for Active Exam (Unsubmitted) */}
      {activeUnsubmittedExams.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <PlayCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Asesmen Aktif Tersedia
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{activeUnsubmittedExams[0].title}</h3>
              <p className="text-xs text-slate-300">
                Durasi: <strong className="text-emerald-300">{activeUnsubmittedExams[0].durationMinutes} Menit</strong> • Target Skor: <strong className="text-amber-300">{activeUnsubmittedExams[0].targetScore}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setConfirmingExam(activeUnsubmittedExams[0])}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer shrink-0 transition-transform transform hover:scale-[1.02]"
          >
            <span>MULAI UJIAN SEKARANG</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upcoming & Finished Exams Sections */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Available Exams */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Jadwal Asesmen Saya
          </h3>
          <ul className="space-y-3">
            {dashboardExamsList.map(ex => {
              const hasSubmitted = studentSubs.some(s => s.examId === ex.id);
              return (
                <li key={ex.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex justify-between items-center gap-3">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-white">{ex.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ex.packageTitle} • Durasi {ex.durationMinutes} Menit</p>
                  </div>
                  {hasSubmitted ? (
                    <button
                      onClick={() => onViewResult(ex.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs cursor-pointer transition-all shrink-0"
                    >
                      Hasil
                    </button>
                  ) : ex.status === 'terjadwal' ? (
                    <span className="text-[11px] text-slate-400 italic shrink-0 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                      Belum Dibuka
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingExam(ex)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md shrink-0 transition-colors"
                    >
                      Kerjakan
                    </button>
                  )}
                </li>
              );
            })}
            {dashboardExamsList.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada jadwal asesmen saat ini.</p>
            )}
          </ul>
        </div>

        {/* Right: Quick Job Readiness Radar Preview */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Profil Kesiapan Kerja Ringkas
            </h3>
            <button onClick={() => setActiveTab('kesiapan_kerja')} className="text-xs text-amber-400 hover:underline cursor-pointer font-semibold">
              Buka Radar Lengkap →
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs text-slate-300">
              Posisi Target Karir saat ini:
              <div className="font-bold text-amber-400 text-sm mt-0.5">{currentUser.targetJobTitle || 'Quality Control Analyst Chemical Lab'}</div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Kompetensi Teknis Kimia</span>
                  <strong className={techScore > 0 ? "text-emerald-400" : "text-slate-400"}>
                    {techScore > 0 ? `${techScore}%` : 'Belum Ada Ujian'}
                  </strong>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${techScore}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Employability Skills</span>
                  <strong className={empScore > 0 ? "text-amber-400" : "text-slate-400"}>
                    {empScore > 0 ? `${empScore}%` : 'Belum Ada Ujian'}
                  </strong>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${empScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assessment Results */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Hasil Asesmen Terbaru
        </h3>
        <div className="space-y-3">
          {latestSubmissions.map(sub => (
            <div key={sub.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-white">{sub.examTitle}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Diselesaikan: {sub.submitTime ? new Date(sub.submitTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Terdata'}
                </p>
              </div>
              <button onClick={() => onViewResult(sub.examId)} className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs cursor-pointer transition-all shrink-0">
                Lihat Detail
              </button>
            </div>
          ))}
          {latestSubmissions.length === 0 && <p className="text-slate-400 text-xs py-2">Belum ada riwayat hasil asesmen yang dikirimkan.</p>}
        </div>
      </div>

      {/* Confirmation Modal Before Starting Exam */}
      {confirmingExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfirmasi Mulai Asesmen</h3>
                  <p className="text-xs text-slate-400">Pastikan Anda telah siap mengerjakan ujian</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmingExam(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ujian Sedang Aktif
                </span>
                <h4 className="text-sm font-bold text-white leading-snug">{confirmingExam.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Durasi: <strong className="text-white">{confirmingExam.durationMinutes} Menit</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target Skor: <strong className="text-white">{confirmingExam.targetScore} Poin</strong></span>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Pemberitahuan Pengerjaan:</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Waktu ujian akan <strong>langsung berjalan</strong> begitu Anda menekan tombol di bawah. Pastikan koneksi internet stabil dan jangan menutup halaman hingga seluruh jawaban terkirim.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingExam(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal / Belum Siap
              </button>
              <button
                type="button"
                onClick={() => {
                  const examToStart = confirmingExam;
                  setConfirmingExam(null);
                  onStartExam(examToStart);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02]"
              >
                <span>Ya, Mulai Kerjakan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
