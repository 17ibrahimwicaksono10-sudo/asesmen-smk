import React from 'react';
import { User } from '../../types';
import { LogOut, School, Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  activeAcademicYear: string;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, activeAcademicYear, onToggleMobileSidebar }) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Administrator</span>;
      case 'guru':
        return <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Guru Penguji</span>;
      case 'siswa':
        return <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Peserta Asesmen</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* App Branding & Mobile Menu Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Buka Menu Navigasi"
            className="md:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
        )}

        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
          K
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[170px] sm:max-w-none">
              Sistem Asesmen & Profil Kesiapan Kerja
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              {currentUser.role === 'siswa' ? 'Standar Industri DUDI' : 'Sistem Terstandarisasi DUDI'}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-md">
            {currentUser.schoolName || 'SMK Vocational Kimia Industri'}
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <School className="w-3.5 h-3.5 text-blue-400" />
          <span>T.A: <strong className="text-white">{activeAcademicYear}</strong></span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5 truncate max-w-[130px]">
              <span>{currentUser.name}</span>
            </div>
            <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
          </div>

          <button
            onClick={onLogout}
            title="Keluar dari Akun"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:border-rose-500 border border-slate-700 text-slate-300 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline font-semibold">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
