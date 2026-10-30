import React from 'react';
import { Role } from '../../types';
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Users,
  FileQuestion,
  Settings,
  Archive,
  BookOpen,
  ClipboardList,
  BarChart3,
  Award,
  Sparkles,
  Briefcase,
  UserCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'kesiapan_kerja', label: 'Profil & Validasi AI Siswa', icon: Award, highlight: true },
          { id: 'sekolah', label: 'Kelola Sekolah', icon: School },
          { id: 'kelas', label: 'Kelola Kelas', icon: GraduationCap },
          { id: 'guru', label: 'Kelola Guru', icon: Users },
          { id: 'siswa', label: 'Kelola Akun Siswa', icon: UserCheck },
          { id: 'soal', label: 'Master Soal & Paket', icon: FileQuestion },
          { id: 'settings', label: 'Pengaturan & Arsip', icon: Settings }
        ];

      case 'guru':
        return [
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'kesiapan_kerja', label: 'Profil & Validasi AI Siswa', icon: Award, highlight: true },
          { id: 'monitoring', label: 'Monitoring & Validasi Guru', icon: BarChart3 },
          { id: 'paket_soal', label: 'Paket Soal & Soal', icon: FileQuestion },
          { id: 'kelas', label: 'Kelola Kelas Saya', icon: GraduationCap },
          { id: 'ujian', label: 'Jadwal & Kelola Ujian', icon: ClipboardList }
        ];

      case 'siswa':
        return [
          { id: 'overview', label: 'Dashboard Saya', icon: LayoutDashboard },
          { id: 'portofolio', label: 'Portofolio & Sertifikat', icon: Briefcase },
          { id: 'kelas', label: 'Kelas Saya', icon: BookOpen },
          { id: 'ujian', label: 'Ujian & Asesmen', icon: ClipboardList },
          { id: 'kesiapan_kerja', label: 'Profil Kesiapan Kerja', icon: Award }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const renderNavList = () => (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-5">
        {/* Role Identity Tag */}
        <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Mode Navigasi</div>
            <div className="text-xs font-bold text-slate-200 capitalize">{role} Dashboard</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                } ${item.highlight ? 'border border-amber-500/30 text-amber-300 hover:text-amber-200' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.highlight && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Info Widget */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 mt-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Vokasi Kimia & DUDI</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Mendukung SKKNI & ISO 17025 Laboratorium Kimia Industri.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-4">
        {renderNavList()}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Slide-Over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Menu Navigasi {role}</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderNavList()}
        </div>
      </div>
    </>
  );
};
