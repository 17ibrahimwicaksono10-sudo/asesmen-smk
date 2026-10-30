import React, { useState } from 'react';
import { User, Exam, ExamSubmission } from '../../types';
import { ClipboardList, PlayCircle, Award, Calendar, Clock, CheckCircle2, ArrowRight, AlertCircle, X } from 'lucide-react';

interface SiswaExamViewProps {
  currentUser: User;
  exams: Exam[];
  submissions: ExamSubmission[];
  onStartExam: (exam: Exam) => void;
  onViewResult: (examId: string) => void;
}

export const SiswaExamView: React.FC<SiswaExamViewProps> = ({
  currentUser,
  exams,
  submissions,
  onStartExam,
  onViewResult
}) => {
  const [filterStatus, setFilterStatus] = useState<'semua' | 'berjalan' | 'terjadwal' | 'selesai'>('semua');
  const [confirmingExam, setConfirmingExam] = useState<Exam | null>(null);

  // Filter submissions khusus milik siswa yang sedang aktif login
  const mySubmissions = currentUser
    ? submissions.filter(s =>
        (s.studentId && s.studentId === currentUser.id) ||
        (currentUser.identityNo && (s.studentNis === currentUser.identityNo || s.studentId === `usr-std-${currentUser.identityNo}`)) ||
        (currentUser.email && (s as any).studentEmail && (s as any).studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.name && s.studentName && s.studentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      )
    : submissions;

  // Filter tab pengerjaan bagi siswa (berbasis perseorangan)
  const filteredExams = exams.filter(ex => {
    const hasSubmitted = mySubmissions.some(s => s.examId === ex.id);

    // PRINSIP PERSEORANGAN: Jika ujian sudah selesai (lewat) dan siswa ini belum pernah mengerjakan,
    // maka otomatis tidak ada di daftar siswa ini (sudah lewat, bukan susulan)
    if (ex.status === 'selesai' && !hasSubmitted) {
      return false;
    }

    if (filterStatus === 'semua') return true;
    if (filterStatus === 'berjalan') return !hasSubmitted && ex.status === 'berjalan';
    if (filterStatus === 'terjadwal') return !hasSubmitted && ex.status === 'terjadwal';
    if (filterStatus === 'selesai') return hasSubmitted;
    return true;
  });

  const latestSubmissions = [...mySubmissions].sort(
    (a, b) => new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime()
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-blue-400" />
          Jadwal Ujian & Hasil Asesmen
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Daftar jadwal asesmen kompetensi teknis kimia dan riwayat hasil asesmen terbaru Anda.
        </p>
      </div>

      {/* Section 1: Jadwal Ujian */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Jadwal Ujian & Asesmen Vokasi
          </h2>

          {/* Filter Pills */}
          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            {(['semua', 'berjalan', 'terjadwal', 'selesai'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredExams.map(ex => {
            const hasSubmitted = mySubmissions.some(s => s.examId === ex.id);

            return (
              <div
                key={ex.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        hasSubmitted
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : ex.status === 'terjadwal'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {hasSubmitted ? 'Selesai Dikerjakan' : ex.status === 'terjadwal' ? 'Terjadwal' : 'Berjalan'}
                    </span>
                    <h3 className="text-sm font-bold text-white">{ex.title}</h3>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-3">
                    <span>{ex.packageTitle}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {ex.durationMinutes} Menit
                    </span>
                    <span>•</span>
                    <span>Target Skor: {ex.targetScore}</span>
                  </p>
                </div>

                {hasSubmitted ? (
                  <button
                    onClick={() => onViewResult(ex.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs cursor-pointer transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <span>Lihat Hasil Asesmen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : ex.status === 'terjadwal' ? (
                  <span className="text-xs text-slate-500 italic shrink-0 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800">
                    Belum Dibuka
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingExam(ex)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0 flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Mulai Kerjakan</span>
                  </button>
                )}
              </div>
            );
          })}

          {filteredExams.length === 0 && (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Tidak ada ujian yang sesuai dengan filter status yang dipilih.
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Hasil Asesmen Terbaru */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Hasil Asesmen Terbaru Anda
        </h2>

        <div className="space-y-3">
          {latestSubmissions.map(sub => (
            <div
              key={sub.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-4"
            >
              <div>
                <h4 className="text-xs font-bold text-white">{sub.examTitle}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Diselesaikan pada: {sub.submitTime ? new Date(sub.submitTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                </p>
              </div>

              <button
                onClick={() => onViewResult(sub.examId)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs cursor-pointer transition-all shrink-0 flex items-center gap-1"
              >
                <span>Lihat Detail Capaian</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {latestSubmissions.length === 0 && (
            <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
              Belum ada riwayat hasil asesmen yang dikirimkan.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Before Starting Exam */}
      {confirmingExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
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
                    Waktu ujian akan <strong>langsung berjalan</strong> begitu Anda menekan tombol di bawah. Pastikan koneksi internet stabil dan jangan menutup peramban hingga seluruh jawaban terkirim.
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
