import React, { useState } from 'react';
import { Teacher, School, ClassRoom } from '../../types';
import { Users, Plus, Edit2, Trash2, Search, Mail, Phone, BookOpen, AlertCircle, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface TeacherManagerProps {
  teachers: Teacher[];
  schools: School[];
  classes: ClassRoom[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({
  teachers,
  schools,
  classes,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [identityNo, setIdentityNo] = useState('');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const filteredTeachers = teachers.filter(t => {
    const matchSchool = selectedSchoolId === 'ALL' || t.schoolId === selectedSchoolId;
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.identityNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSchool && matchSearch;
  });

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setIdentityNo(`198${Math.floor(10000000000 + Math.random() * 90000000000)}`);
    setSchoolId(schools[0]?.id || '');
    setEmail('');
    setPhone('081234567890');
    setPassword('123456');
    setShowPassword(false);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setIdentityNo(t.identityNo);
    setSchoolId(t.schoolId);
    setEmail(t.email);
    setPhone(t.phone);
    setPassword(t.password || '123456');
    setShowPassword(false);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identityNo.trim() || !email.trim()) {
      setFormError('Nama, NIP/Identitas, dan Email wajib diisi.');
      return;
    }

    const schoolObj = schools.find(s => s.id === schoolId);
    const resolvedPassword = password.trim() || '123456';

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        name: name.trim(),
        identityNo: identityNo.trim(),
        schoolId,
        schoolName: schoolObj?.name || editingTeacher.schoolName,
        email: email.trim(),
        phone: phone.trim(),
        password: resolvedPassword
      });
    } else {
      onAddTeacher({
        id: `usr-guru-${Date.now()}`,
        name: name.trim(),
        identityNo: identityNo.trim(),
        schoolId,
        schoolName: schoolObj?.name || 'SMK Negeri 1 Bandung',
        email: email.trim(),
        phone: phone.trim(),
        password: resolvedPassword,
        assignedClassIds: []
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
            <Users className="w-5 h-5 text-purple-400" />
            Kelola Master Data Guru & Penguji Vokasi
          </h2>
          <p className="text-xs text-slate-400">
            Manajemen akun pengajar, NIP, kredensial login, serta penugasan kelas dan pembuatan paket soal.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Sekolah</label>
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="ALL">Semua Sekolah</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pencarian Guru</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map(t => {
          const assignedClasses = classes.filter(c => c.teacherId === t.id || c.teacherName === t.name);

          return (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    NIP: {t.identityNo}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Edit Data Guru"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTeacher(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Hapus Akun Guru"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white">{t.name}</h3>
                <p className="text-xs text-slate-400">{t.schoolName}</p>

                <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-semibold">{t.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{t.phone}</span>
                  </div>
                  {/* Credentials Info Badge */}
                  <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-800/40 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Password: <strong className="text-white font-mono">{t.password || '123456'}</strong></span>
                    </div>
                    <span className="text-[10px] text-emerald-300/80">Siap Login</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-purple-400" />
                  Kelas Dipampu ({assignedClasses.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {assignedClasses.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">Belum diplot ke kelas</span>
                  ) : (
                    assignedClasses.map(ac => (
                      <span key={ac.id} className="px-2 py-0.5 rounded bg-slate-950 text-slate-200 border border-slate-800 text-[10px]">
                        {ac.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingTeacher ? 'Edit Data & Kredensial Guru' : 'Tambah Guru Penguji Baru'}
                </h3>
                <p className="text-xs text-slate-400">Akun ini dapat langsung login di halaman utama</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. Bambang Pamungkas, M.T."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NIP / Identitas *</label>
                  <input
                    type="text"
                    required
                    value={identityNo}
                    onChange={(e) => setIdentityNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sekolah Induk</label>
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Resmi (Untuk Login) *</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@sekolah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">No. Kontak WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Password Akun Guru (Untuk Login) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
                  </button>
                </div>

                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimal 6 karakter (Default: 123456)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Guru dapat langsung menggunakan <strong>Email</strong> dan <strong>Password</strong> ini untuk masuk dari halaman login awal.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  Simpan Guru & Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
