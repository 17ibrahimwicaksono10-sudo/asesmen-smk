import React from 'react';
import { User, QuestionPackage, Exam, ClassRoom, ExamSubmission } from '../../types';
import { LayoutDashboard, GraduationCap, FileQuestion, ClipboardList, CheckCircle2, Clock, PlayCircle, BarChart3, ArrowUpRight } from 'lucide-react';

interface GuruDashboardProps {
  currentUser: User;
  packages: QuestionPackage[];
  exams: Exam[];
  classes: ClassRoom[];
  submissions: ExamSubmission[];
  setActiveTab: (tab: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  currentUser,
  packages,
  exams,
  classes,
  submissions,
  setActiveTab
}) => {
  const isSchoolMatch = (s1?: string, s2?: string) => {
    if (!s1 || !s2) return false;
    const c1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const c2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  const assigned = classes.filter(c => {
    const matchSchool = (currentUser.schoolId && c.schoolId === currentUser.schoolId) ||
      (currentUser.schoolName && isSchoolMatch(c.schoolName, currentUser.schoolName));
    if (!matchSchool) return false;
    return c.teacherId === currentUser.id || 
      c.teacherName === currentUser.name ||
      (currentUser.name && c.teacherName && c.teacherName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser.assignedClassIds && currentUser.assignedClassIds.includes(c.id));
  });

  const myClasses = assigned.length > 0 ? assigned : classes.filter(c => 
    (currentUser.schoolId && c.schoolId === currentUser.schoolId) ||
    (currentUser.schoolName && isSchoolMatch(c.schoolName, currentUser.schoolName))
  );

  const myExams = exams.filter(e => 
    e.teacherId === currentUser.id || 
    e.teacherName === currentUser.name || 
    (currentUser.schoolId && e.schoolId === currentUser.schoolId) ||
    (currentUser.schoolName && isSchoolMatch(e.schoolName, currentUser.schoolName))
  );

  const mySubmissions = submissions.filter(sub => {
    const matchClass = myClasses.some(c => c.name.toLowerCase() === sub.className?.toLowerCase());
    const matchExam = myExams.some(e => e.id === sub.examId);
    return matchClass || matchExam;
  });

  const displaySubmissions = mySubmissions.length > 0 ? mySubmissions : submissions;
  const myPackages = packages;

  const teknisCount = myPackages.filter(p => p.category === 'teknis_kimia').length;
  const employabilityCount = myPackages.filter(p => p.category === 'employability').length;

  const scheduledCount = myExams.filter(e => e.status === 'terjadwal').length;
  const runningCount = myExams.filter(e => e.status === 'berjalan').length;
  const finishedCount = myExams.filter(e => e.status === 'selesai').length;

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono font-bold text-emerald-400 mb-1">DASHBOARD GURU PENGUJI & PEMBIMBING</div>
          <h2 className="text-2xl font-black text-white tracking-tight">Selamat Datang, {currentUser.name}</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Sistem pengujian berstandar industri kimia. Pantau pelaksanaan ujian teknis & employability, evaluasi esai siswa dengan bantuan AI, serta susun tindak lanjut kesiapan kerja.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('ujian')}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Buat Jadwal Ujian Baru</span>
        </button>
      </div>

      {/* Primary Counter Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 flex justify-between items-center">
            <span>Rombel Kelas Dipampu</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{myClasses.length} Kelas</div>
          <div className="text-[11px] text-slate-400">Total {myClasses.reduce((acc, c) => acc + c.studentCount, 0)} Siswa</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 flex justify-between items-center">
            <span>Paket Soal Terdaftar</span>
            <FileQuestion className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{myPackages.length} Paket</div>
          <div className="text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{teknisCount} Teknis</span> • <span className="text-amber-400 font-semibold">{employabilityCount} Soft Skills</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 flex justify-between items-center">
            <span>Ujian Sedang Berjalan</span>
            <PlayCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{runningCount} Sesi</div>
          <div className="text-[11px] text-slate-400">Monitoring real-time aktif</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 flex justify-between items-center">
            <span>Jawaban Masuk / Dinilai</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{displaySubmissions.length} Berkas</div>
          <div className="text-[11px] text-slate-400">Siap diberi ulasan & tindak lanjut</div>
        </div>
      </div>

      {/* Active Exams & Recent Submissions Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Active Exam List */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              Sesi Ujian Aktif & Terjadwal
            </h3>
            <button onClick={() => setActiveTab('ujian')} className="text-xs text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
              Kelola Semua <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {myExams.map(ex => (
              <div key={ex.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ex.status === 'berjalan' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      ex.status === 'terjadwal' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {ex.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-white">{ex.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kelas: <strong>{ex.className}</strong> • Tanggal: {ex.scheduleDate} ({ex.startTime} - {ex.endTime})
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-emerald-400">{ex.completedStudents}/{ex.totalStudents} Siswa</div>
                  <button
                    onClick={() => setActiveTab('monitoring')}
                    className="mt-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                  >
                    Pantau Hasil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Submissions needing Review */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Hasil Masuk & Evaluasi AI
            </h3>
            <button onClick={() => setActiveTab('monitoring')} className="text-xs text-purple-400 hover:underline cursor-pointer flex items-center gap-1">
              Lihat Detail <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {displaySubmissions.map(sub => (
              <div key={sub.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-white">{sub.studentName} ({sub.studentNis})</div>
                    <div className="text-[11px] text-slate-400">{sub.className} • {sub.submitTime}</div>
                  </div>
                  <span className="text-sm font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Skor: {sub.totalScore}
                  </span>
                </div>

                {sub.aiEvaluation && (
                  <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800/80 italic">
                    "AI Note: {sub.aiEvaluation}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
