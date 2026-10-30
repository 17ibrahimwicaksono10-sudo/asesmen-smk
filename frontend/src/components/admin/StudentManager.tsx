import React, { useState } from 'react';
import { User, School, ClassRoom } from '../../types';
import {
  Users,
  Search,
  KeyRound,
  School as SchoolIcon,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  Filter
} from 'lucide-react';

interface StudentManagerProps {
  students: User[];
  schools: School[];
  classes: ClassRoom[];
  onResetPassword: (studentId: string, newPassword: string) => Promise<boolean>;
  onUpdateStudent?: (student: User) => Promise<boolean>;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  schools,
  classes,
  onResetPassword
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Reset Password Modal State
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string; copied?: boolean } | null>(null);
  const [copiedInfo, setCopiedInfo] = useState(false);

  // Available classes based on selected school
  const availableClasses = classes.filter(c => {
    if (selectedSchoolId === 'ALL') return true;
    return c.schoolId === selectedSchoolId;
  });

  // Filter students (only role === 'siswa')
  const filteredStudents = students.filter(s => {
    if (s.role !== 'siswa') return false;

    // Filter School
    const matchSchool = selectedSchoolId === 'ALL' ||
      s.schoolId === selectedSchoolId ||
      (s.schoolName && schools.find(sch => sch.id === selectedSchoolId)?.name && s.schoolName.toLowerCase() === schools.find(sch => sch.id === selectedSchoolId)?.name.toLowerCase());

    // Filter Class
    const matchClass = selectedClassId === 'ALL' ||
      s.classId === selectedClassId ||
      (s.className && classes.find(c => c.id === selectedClassId)?.name && s.className.toLowerCase() === classes.find(c => c.id === selectedClassId)?.name.toLowerCase());

    // Search
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      s.name.toLowerCase().includes(term) ||
      (s.identityNo && s.identityNo.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term));

    return matchSchool && matchClass && matchSearch;
  });

  const handleOpenResetModal = (student: User) => {
    setSelectedStudent(student);
    setNewPassword('123456');
    setShowPassword(false);
    setResetFeedback(null);
    setCopiedInfo(false);
  };

  const handleCloseResetModal = () => {
    setSelectedStudent(null);
    setResetFeedback(null);
    setIsResetting(false);
    setCopiedInfo(false);
  };

  const handleExecuteReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent) return;

    if (!newPassword || newPassword.trim().length < 4) {
      setResetFeedback({
        type: 'error',
        message: 'Password baru minimal 4 karakter.'
      });
      return;
    }

    setIsResetting(true);
    setResetFeedback(null);

    try {
      const cleanPass = newPassword.trim();
      const success = await onResetPassword(selectedStudent.id, cleanPass);
      if (success) {
        setResetFeedback({
          type: 'success',
          message: `Password akun ${selectedStudent.name} berhasil direset menjadi: "${cleanPass}"`
        });
      } else {
        setResetFeedback({
          type: 'error',
          message: 'Gagal memperbarui password di server database.'
        });
      }
    } catch (err: any) {
      setResetFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat mereset password.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!selectedStudent) return;
    const infoText = `*Informasi Login Siswa SMK*\nNama: ${selectedStudent.name}\nNIS: ${selectedStudent.identityNo || '-'}\nEmail: ${selectedStudent.email}\nPassword Baru: ${newPassword.trim()}`;
    navigator.clipboard.writeText(infoText);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span>Manajemen Akun Siswa &amp; Reset Password</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola akun peserta asesmen, filter berdasarkan rombel/sekolah, dan reset password siswa yang lupa kredensial.
          </p>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Total Siswa Terdaftar</span>
          </div>
          <div className="text-2xl font-black text-white">
            {students.filter(s => s.role === 'siswa').length}
          </div>
          <div className="text-[10px] text-slate-500">Seluruh basis data sekolah</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <SchoolIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sekolah Terlibat</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {schools.length}
          </div>
          <div className="text-[10px] text-slate-500">Lembaga vokasi mitra</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Rombel / Kelas</span>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {classes.length}
          </div>
          <div className="text-[10px] text-slate-500">Kelas kejuruan kimia</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
            <span>Hasil Filter Aktif</span>
          </div>
          <div className="text-2xl font-black text-purple-400">
            {filteredStudents.length}
          </div>
          <div className="text-[10px] text-slate-500">Siswa sesuai kriteria pencarian</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS/identitas, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* School Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0 w-full sm:w-56">
              <select
                value={selectedSchoolId}
                onChange={(e) => {
                  setSelectedSchoolId(e.target.value);
                  setSelectedClassId('ALL');
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Sekolah ({schools.length})</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Class Dropdown */}
            <div className="relative shrink-0 w-full sm:w-48">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Kelas ({availableClasses.length})</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4">Nama Siswa &amp; Email</th>
                <th className="py-3 px-4">NIS / Identitas</th>
                <th className="py-3 px-4">Sekolah</th>
                <th className="py-3 px-4">Kelas / Rombel</th>
                <th className="py-3 px-4 text-center">Status Sandi</th>
                <th className="py-3 px-4 text-right">Aksi Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStudents.map((std, idx) => (
                <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {std.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white leading-tight">{std.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{std.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                      {std.identityNo || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <SchoolIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px]" title={std.schoolName}>
                        {std.schoolName || 'SMK Mitra'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{std.className || 'Umum'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Aktif</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenResetModal(std)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all border border-amber-500/30 hover:border-transparent shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Password</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-sm text-slate-300">Tidak ada siswa yang ditemukan</p>
                      <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter sekolah/kelas.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reset Password */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Password Siswa</h3>
                  <p className="text-xs text-slate-400">Atur ulang kata sandi peserta asesmen</p>
                </div>
              </div>
              <button
                onClick={handleCloseResetModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-white text-sm">{selectedStudent.name}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 border-t border-slate-900">
                <div>
                  <span className="text-slate-500 text-[10px] block">NIS / No Identitas</span>
                  <span className="font-mono text-slate-200">{selectedStudent.identityNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Rombel / Kelas</span>
                  <span className="text-slate-200">{selectedStudent.className || 'Umum'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] block">Email Terdaftar</span>
                  <span className="text-slate-200 font-mono">{selectedStudent.email}</span>
                </div>
              </div>
            </div>

            {/* Quick Action: Set Default 123456 */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-blue-300 block">Sandi Default (123456)</span>
                <span className="text-[11px] text-slate-400">Rekomendasi untuk siswa saat ujian</span>
              </div>
              <button
                type="button"
                onClick={() => setNewPassword('123456')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  newPassword === '123456'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-blue-300 hover:bg-slate-700'
                }`}
              >
                Pakai 123456
              </button>
            </div>

            {/* Form Input Password Baru */}
            <form onSubmit={handleExecuteReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password Baru yang Diinginkan
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Minimal 4 karakter. Siswa dapat login kembali menggunakan password ini segera.
                </p>
              </div>

              {/* Feedback Alert */}
              {resetFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    resetFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {resetFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="leading-relaxed font-semibold">{resetFeedback.message}</p>
                    {resetFeedback.type === 'success' && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-400">Siap dibagikan ke siswa</span>
                        <button
                          type="button"
                          onClick={handleCopyCredentials}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedInfo ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedInfo ? 'Tersalin!' : 'Salin Info Akun'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>{isResetting ? 'Menyimpan...' : 'Terapkan Password Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
