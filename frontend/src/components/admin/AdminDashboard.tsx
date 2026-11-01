import React from 'react';
import { School, ClassRoom, Teacher, QuestionPackage, Exam } from '../../types';
import { School as SchoolIcon, GraduationCap, Users, FileQuestion, ClipboardList, CheckCircle2, Clock, PlayCircle, BarChart2 } from 'lucide-react';

interface AdminDashboardProps {
  schools: School[];
  classes: ClassRoom[];
  teachers: Teacher[];
  packages: QuestionPackage[];
  exams: Exam[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  schools,
  classes,
  teachers,
  packages,
  exams
}) => {
  const scheduledExams = exams.filter(e => e.status === 'terjadwal').length;
  const runningExams = exams.filter(e => e.status === 'berjalan').length;
  const finishedExams = exams.filter(e => e.status === 'selesai').length;
  const totalStudents = schools.reduce((acc, s) => acc + s.totalStudents, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Dashboard Overview Administrator</h2>
        <p className="text-xs text-slate-400">Ringkasan statistik ekosistem sekolah, kelas, guru, dan aktivitas asesmen vokasi.</p>
      </div>

      {/* Primary Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <SchoolIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{schools.length}</div>
            <div className="text-xs text-slate-400 font-medium">Total Sekolah Terdaftar</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{classes.length}</div>
            <div className="text-xs text-slate-400 font-medium">Total Rombel / Kelas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{teachers.length} Guru / {totalStudents} Siswa</div>
            <div className="text-xs text-slate-400 font-medium">Total Akun Pengguna</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{packages.length}</div>
            <div className="text-xs text-slate-400 font-medium">Master Paket Soal</div>
          </div>
        </div>
      </div>

      {/* Assessment Status Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          Status Pelaksanaan Ujian Vokasi Terkini
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">Ujian Terjadwal</div>
                <div className="text-[11px] text-slate-400">Menunggu jadwal buka</div>
              </div>
            </div>
            <span className="text-lg font-black text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              {scheduledExams}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PlayCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-white">Ujian Berjalan</div>
                <div className="text-[11px] text-slate-400">Siswa sedang mengerjakan</div>
              </div>
            </div>
            <span className="text-lg font-black text-emerald-400 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              {runningExams}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs font-bold text-white">Ujian Selesai</div>
                <div className="text-[11px] text-slate-400">Telah dinilai & diarsip</div>
              </div>
            </div>
            <span className="text-lg font-black text-blue-400 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
              {finishedExams}
            </span>
          </div>
        </div>
      </div>

      {/* Schools & Classes Active Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SchoolIcon className="w-4 h-4 text-blue-400" />
              Daftar Sekolah & Statistik
            </h3>
            <span className="text-xs text-slate-400">{schools.length} Sekolah</span>
          </div>

          <div className="space-y-2.5">
            {schools.map(s => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">{s.name}</div>
                  <div className="text-[11px] text-slate-400">{s.address}</div>
                </div>
                <div className="text-right text-[11px] text-slate-300">
                  <div><strong>{s.totalClasses}</strong> Kelas</div>
                  <div><strong>{s.totalStudents}</strong> Siswa</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Aktivitas Ujian Terbaru
            </h3>
            <span className="text-xs text-slate-400">{exams.length} Ujian Terdaftar</span>
          </div>

          <div className="space-y-2.5">
            {exams.map(e => (
              <div key={e.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">{e.title}</div>
                  <div className="text-[11px] text-slate-400">{e.className} • {e.schoolName}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  e.status === 'berjalan' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  e.status === 'terjadwal' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {(e.status || 'draft').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
