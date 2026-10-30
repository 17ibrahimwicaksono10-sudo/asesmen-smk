import React, { useState } from 'react';
import { ClassRoom, School, Teacher, User } from '../../types';
import { GraduationCap, Plus, Edit2, Trash2, Search, Filter, Users, School as SchoolIcon, Key, Check, AlertCircle, Lock } from 'lucide-react';

interface ClassManagerProps {
  classes: ClassRoom[];
  schools: School[];
  teachers: Teacher[];
  students: User[];
  currentUser?: User;
  onAddClass: (newClass: ClassRoom) => void;
  onUpdateClass: (updatedClass: ClassRoom) => void;
  onDeleteClass: (classId: string) => void;
  onResetPassword?: (studentId: string, newPassword: string) => Promise<boolean>;
}

export const ClassManager: React.FC<ClassManagerProps> = ({
  classes,
  schools,
  teachers,
  students,
  currentUser,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onResetPassword
}) => {
  const isSchoolMatch = (s1?: string, s2?: string) => {
    if (!s1 || !s2) return false;
    const c1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const c2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  const isGuru = currentUser?.role === 'guru';
  const guruSchool = currentUser ? schools.find(s => 
    (currentUser.schoolId && s.id === currentUser.schoolId) ||
    (currentUser.schoolName && isSchoolMatch(s.name, currentUser.schoolName))
  ) : undefined;

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isGuru && guruSchool ? guruSchool.id : (isGuru && currentUser?.schoolId ? currentUser.schoolId : 'ALL')
  );
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDetailClass, setShowDetailClass] = useState<ClassRoom | null>(null);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Form states
  const [className, setClassName] = useState('');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [academicYear, setAcademicYear] = useState('2024/2025');
  const [studentCount, setStudentCount] = useState(30);
  const [classCode, setClassCode] = useState('');
  const [formError, setFormError] = useState('');

  // Reset Password State
  const [resetModalStudent, setResetModalStudent] = useState<User | null>(null);
  const [resetPassInput, setResetPassInput] = useState('123456');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Filter logic
  const filteredClasses = classes.filter(c => {
    const selectedSchoolObj = schools.find(s => s.id === selectedSchoolId);
    const matchSchool = selectedSchoolId === 'ALL' || c.schoolId === selectedSchoolId ||
      (selectedSchoolObj && c.schoolName && c.schoolName.toLowerCase() === selectedSchoolObj.name.toLowerCase());
    const matchYear = selectedYear === 'ALL' || c.academicYear === selectedYear;
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.classCode.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSchool && matchYear && matchSearch;
  });

  const openAddModal = () => {
    setEditingClass(null);
    setClassName('');
    const defSchool = isGuru && guruSchool ? guruSchool.id : (schools[0]?.id || '');
    setSchoolId(defSchool);
    const defTeacher = isGuru ? (currentUser?.id || teachers[0]?.id || '') : (teachers[0]?.id || '');
    setTeacherId(defTeacher);
    setAcademicYear('2024/2025');
    setStudentCount(30);
    setClassCode(`KIM-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setClassName(c.name);
    setSchoolId(c.schoolId);
    setTeacherId(c.teacherId);
    setAcademicYear(c.academicYear);
    setStudentCount(c.studentCount);
    setClassCode(c.classCode);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim()) {
      setFormError('Nama kelas dan kode kelas wajib diisi.');
      return;
    }

    const selectedSchoolObj = schools.find(s => s.id === schoolId);
    const selectedTeacherObj = teachers.find(t => t.id === teacherId);

    if (editingClass) {
      onUpdateClass({
        ...editingClass,
        name: className.trim(),
        schoolId,
        schoolName: selectedSchoolObj?.name || editingClass.schoolName,
        teacherId,
        teacherName: selectedTeacherObj?.name || editingClass.teacherName,
        academicYear,
        studentCount,
        classCode: classCode.trim()
      });
    } else {
      onAddClass({
        id: `cls-${Date.now()}`,
        name: className.trim(),
        schoolId,
        schoolName: selectedSchoolObj?.name || 'SMK Negeri 1 Bandung',
        teacherId,
        teacherName: selectedTeacherObj?.name || 'Guru Pembimbing',
        academicYear,
        studentCount,
        examCount: 0,
        classCode: classCode.trim()
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            Kelola Rombongan Belajar / Kelas
          </h2>
          <p className="text-xs text-slate-400">Atur pengampu kelas, kode entri siswa, dan asosiasi sekolah.</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kelas Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Sekolah Terdaftar</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tahun Ajaran</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua Tahun Ajaran</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2023/2024">2023/2024</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pencarian Kelas</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kelas atau kode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Class List Table / Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map(c => (
          <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {c.academicYear}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{c.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <SchoolIcon className="w-3 h-3 text-slate-400" />
                  {c.schoolName}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(c)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  title="Edit Kelas"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Hapus kelas "${c.name}"?`)) onDeleteClass(c.id);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                  title="Hapus Kelas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Guru Wali/Pengampu:</span>
                <span className="font-semibold text-white">{c.teacherName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kode Gabung Siswa:</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[11px] border border-blue-500/30 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  {c.classCode}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{c.studentCount} Siswa • {c.examCount} Ujian</span>
              </div>

              <button
                onClick={() => setShowDetailClass(c)}
                className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
              >
                Daftar Siswa →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingClass ? 'Edit Rombel Kelas' : 'Buat Rombel Kelas Baru'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII Kimia Analitik 1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isGuru ? 'Sekolah Tugas' : 'Pilih Sekolah'}
                  </label>
                  {isGuru ? (
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-xs flex items-center justify-between">
                      <span className="truncate">{guruSchool?.name || currentUser?.schoolName || 'SMK Terdaftar'}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-medium shrink-0">
                        <Lock className="w-2.5 h-2.5 text-blue-400" /> Terkunci
                      </span>
                    </div>
                  ) : (
                    <select
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Guru Pengampu</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estimasi Siswa</label>
                  <input
                    type="number"
                    value={studentCount}
                    onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Gabung</label>
                  <input
                    type="text"
                    required
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Student Detail Modal */}
      {showDetailClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Daftar Siswa Rombel - {showDetailClass.name}</h3>
                <p className="text-xs text-slate-400">{showDetailClass.schoolName} • Kode: {showDetailClass.classCode}</p>
              </div>
              <button
                onClick={() => setShowDetailClass(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(() => {
                const classStudents = students.filter(s => 
                  s.role === 'siswa' && 
                  (s.classId === showDetailClass.id || (s.className && s.className.toLowerCase() === showDetailClass.name.toLowerCase())) &&
                  (!s.schoolId || s.schoolId === showDetailClass.schoolId || (s.schoolName && showDetailClass.schoolName && s.schoolName.toLowerCase() === showDetailClass.schoolName.toLowerCase()))
                );

                if (classStudents.length === 0) {
                  return (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-950 rounded-xl">
                      Belum ada siswa yang mendaftar ke kelas ini. Bagikan Kode Gabung <code className="text-emerald-400 font-bold">{showDetailClass.classCode}</code> kepada siswa.
                    </div>
                  );
                }

                return classStudents.map((std, idx) => (
                  <div key={std.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white">{std.name}</div>
                        <div className="text-slate-400">NIS: {std.identityNo} • {std.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Terverifikasi</span>
                      {onResetPassword && (
                        <button
                          onClick={() => {
                            setResetModalStudent(std);
                            setResetPassInput('123456');
                            setResetSuccessMsg('');
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer border border-amber-500/30"
                          title="Reset Password Siswa"
                        >
                          <Key className="w-2.5 h-2.5" />
                          <span>Reset PW</span>
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Quick Reset Password Modal */}
      {resetModalStudent && onResetPassword && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Reset Sandi Siswa</h4>
                  <p className="text-[11px] text-slate-400">{resetModalStudent.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalStudent(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400">NIS: <strong className="text-white">{resetModalStudent.identityNo || '-'}</strong></div>
              <div className="text-slate-400">Email: <strong className="text-white">{resetModalStudent.email}</strong></div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Password Baru</label>
                <button
                  type="button"
                  onClick={() => setResetPassInput('123456')}
                  className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  Pakai 123456
                </button>
              </div>
              <input
                type="text"
                value={resetPassInput}
                onChange={(e) => setResetPassInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                placeholder="Password minimal 4 karakter..."
              />
            </div>

            {resetSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResetModalStudent(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isResetting || !resetPassInput}
                onClick={async () => {
                  setIsResetting(true);
                  const ok = await onResetPassword(resetModalStudent.id, resetPassInput.trim());
                  setIsResetting(false);
                  if (ok) {
                    setResetSuccessMsg(`Sandi berhasil diubah ke: "${resetPassInput.trim()}"`);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow disabled:opacity-50"
              >
                {isResetting ? 'Menyimpan...' : 'Terapkan Sandi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
