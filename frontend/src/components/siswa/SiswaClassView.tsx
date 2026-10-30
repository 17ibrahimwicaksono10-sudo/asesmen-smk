import React, { useState } from 'react';
import { User, ClassRoom } from '../../types';
import { GraduationCap, Key, CheckCircle2, AlertCircle, School, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';

interface SiswaClassViewProps {
  currentUser: User;
  classes: ClassRoom[];
  onJoinClassByCode: (code: string) => boolean;
}

export const SiswaClassView: React.FC<SiswaClassViewProps> = ({
  currentUser,
  classes,
  onJoinClassByCode
}) => {
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Find joined class
  const myClass = classes.find(c => c.name === currentUser.className || c.id === currentUser.classId) || classes[0];

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');

    if (!inputCode.trim()) {
      setJoinError('Silakan masukkan kode kelas dari guru Anda.');
      return;
    }

    const success = onJoinClassByCode(inputCode.trim());
    if (success) {
      setJoinSuccess(`Berhasil bergabung dengan rombel kelas baru!`);
      setInputCode('');
    } else {
      setJoinError('Kode kelas tidak ditemukan. Mohon periksa kembali kode unik yang diberikan guru.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-blue-400" />
          Kelas Saya & Rombel Vokasi
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Informasi rombel kelas aktif Anda dan fasilitas bergabung ke kelas baru menggunakan kode unik dari guru.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Active Class Info */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 w-fit mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kelas Aktif Saat Ini
                </span>
                <h2 className="text-xl font-bold text-white">{myClass?.name || currentUser.className || 'XII Kimia Analitik 1'}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  {myClass?.schoolName || currentUser.schoolName || 'SMK Negeri 1 Kimia Industri Bandung'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Guru Pengampu / Wali
                </div>
                <div className="text-xs font-bold text-white">{myClass?.teacherName || 'Dra. Endang Rahayu, M.Si'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Kode Unik Rombel
                </div>
                <div className="text-xs font-bold text-amber-400 font-mono">{myClass?.classCode || 'KA1-2024'}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 leading-relaxed">
              💡 <strong>Catatan Rombel:</strong> Seluruh asesmen teknis kimia dan penilaian employability skills Anda akan terhubung otomatis dengan laporan rekapitulasi nilai guru pengampu rombel ini.
            </div>
          </div>
        </div>

        {/* Right: Join Class via Code */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Gabung Kelas Baru
            </h3>
            <p className="text-xs text-slate-400">
              Punya kode unik rombel baru dari guru kimia atau asesor Anda? Masukkan di bawah ini untuk berpindah/bergabung kelas.
            </p>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kode Unik Kelas dari Guru
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KA1-2024 atau AIQC-BGR"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-all uppercase tracking-wider"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Gabung Rombel Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
