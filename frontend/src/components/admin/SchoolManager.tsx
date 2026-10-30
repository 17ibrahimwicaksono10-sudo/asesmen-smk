import React, { useState } from 'react';
import { School } from '../../types';
import { School as SchoolIcon, Plus, Edit2, Trash2, Search, Building2, MapPin, Check, AlertCircle } from 'lucide-react';

interface SchoolManagerProps {
  schools: School[];
  onAddSchool: (school: School) => void;
  onUpdateSchool: (school: School) => void;
  onDeleteSchool: (schoolId: string) => void;
}

export const SchoolManager: React.FC<SchoolManagerProps> = ({
  schools,
  onAddSchool,
  onUpdateSchool,
  onDeleteSchool
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [totalClasses, setTotalClasses] = useState(6);
  const [totalTeachers, setTotalTeachers] = useState(18);
  const [totalStudents, setTotalStudents] = useState(240);
  const [formError, setFormError] = useState('');

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingSchool(null);
    setName('');
    setCode(`SMK-${Math.floor(100 + Math.random() * 900)}`);
    setAddress('');
    setTotalClasses(6);
    setTotalTeachers(15);
    setTotalStudents(200);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (s: School) => {
    setEditingSchool(s);
    setName(s.name);
    setCode(s.code);
    setAddress(s.address);
    setTotalClasses(s.totalClasses);
    setTotalTeachers(s.totalTeachers);
    setTotalStudents(s.totalStudents);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !address.trim()) {
      setFormError('Nama sekolah, kode, dan alamat wajib diisi.');
      return;
    }

    if (editingSchool) {
      onUpdateSchool({
        ...editingSchool,
        name: name.trim(),
        code: code.trim(),
        address: address.trim(),
        totalClasses,
        totalTeachers,
        totalStudents
      });
    } else {
      onAddSchool({
        id: `sch-${Date.now()}`,
        name: name.trim(),
        code: code.trim(),
        address: address.trim(),
        totalClasses,
        totalTeachers,
        totalStudents
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-blue-400" />
            Kelola Master Data Sekolah
          </h2>
          <p className="text-xs text-slate-400">Tambah, ubah, dan pantau statistik sekolah vokasi yang terdaftar.</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Sekolah Baru</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama sekolah, kode, atau alamat..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* School Grid Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchools.map(s => (
          <div key={s.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {s.code}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    title="Ubah Data"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus sekolah "${s.name}"?`)) {
                        onDeleteSchool(s.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                    title="Hapus Sekolah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{s.name}</h3>

              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span>{s.address}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-xs font-bold text-white">{s.totalClasses}</div>
                <div className="text-[10px] text-slate-400">Kelas</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-xs font-bold text-white">{s.totalTeachers}</div>
                <div className="text-[10px] text-slate-400">Guru</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-xs font-bold text-white">{s.totalStudents}</div>
                <div className="text-[10px] text-slate-400">Siswa</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingSchool ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMK Negeri 1 Kimia Industri Bandung"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Sekolah</label>
                  <input
                    type="text"
                    required
                    placeholder="SMKN1-KIM"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Kelas (Default)</label>
                  <input
                    type="number"
                    min="1"
                    value={totalClasses}
                    onChange={(e) => setTotalClasses(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jl. Industri Kimia No. 12..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jumlah Guru</label>
                  <input
                    type="number"
                    value={totalTeachers}
                    onChange={(e) => setTotalTeachers(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jumlah Siswa</label>
                  <input
                    type="number"
                    value={totalStudents}
                    onChange={(e) => setTotalStudents(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
