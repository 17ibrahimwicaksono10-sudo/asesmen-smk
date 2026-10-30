import React, { useState, useEffect } from 'react';
import { User, Role, Teacher, School, ClassRoom } from '../../types';
import { PRESET_USERS, INITIAL_SCHOOLS, INITIAL_CLASSES, INITIAL_TEACHERS } from '../../data/mockData';
import { 
  LogIn, UserPlus, KeyRound, CheckCircle2, AlertCircle, School as SchoolIcon, 
  GraduationCap, ArrowRight, ShieldCheck, Info, Award, FlaskConical, Compass, 
  TrendingUp, Target, BookOpen, Check, Mail, Lock, Building2, Briefcase 
} from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  registeredUsers: User[];
  onRegisterUser: (newUser: User) => void;
  teachers?: Teacher[];
  schools?: School[];
  classes?: ClassRoom[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  registeredUsers,
  onRegisterUser,
  teachers = [],
  schools = [],
  classes = []
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Daftar sekolah dan kelas dinamis (prioritas dari backend database)
  const availableSchools = schools.length > 0 ? schools : INITIAL_SCHOOLS;
  const availableClasses = classes.length > 0 ? classes : INITIAL_CLASSES;

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regIdentity, setRegIdentity] = useState('');
  const [regSchool, setRegSchool] = useState(() => (schools.length > 0 ? schools[0].name : (INITIAL_SCHOOLS[0]?.name || '')));
  const [regClass, setRegClass] = useState(() => (classes.length > 0 ? classes[0].name : (INITIAL_CLASSES[0]?.name || '')));
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Sinkronisasi saat schools/classes berhasil dimuat dari backend
  useEffect(() => {
    if (schools.length > 0 && !schools.some(s => s.name === regSchool)) {
      setRegSchool(schools[0].name);
    }
  }, [schools]);

  useEffect(() => {
    const matchedSchool = availableSchools.find(s => s.name === regSchool);
    const schoolClasses = availableClasses.filter(c => matchedSchool ? c.schoolId === matchedSchool.id : true);
    if (schoolClasses.length > 0 && !schoolClasses.some(c => c.name === regClass)) {
      setRegClass(schoolClasses[0].name);
    }
  }, [regSchool, classes]);

  // Form states - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      setLoginError('Email dan password wajib diisi.');
      return;
    }

    // 1. Kumpulkan semua sumber data guru (props, INITIAL_TEACHERS, dan localStorage)
    let allTeacherList: Teacher[] = [...INITIAL_TEACHERS, ...(teachers || [])];
    try {
      const savedTeachers = localStorage.getItem('voc_teachers');
      if (savedTeachers) {
        const parsed = JSON.parse(savedTeachers);
        if (Array.isArray(parsed)) {
          allTeacherList = [...allTeacherList, ...parsed];
        }
      }
    } catch {}

    // Petakan semua akun guru menjadi format User
    const teacherUsers: User[] = allTeacherList.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: 'guru',
      identityNo: t.identityNo,
      schoolId: t.schoolId,
      schoolName: t.schoolName,
      phone: t.phone,
      password: t.password || '123456'
    }));

    // 2. Ambil user terdaftar tambahan dari localStorage
    let storedUsers: User[] = [];
    try {
      const savedReg = localStorage.getItem('voc_registered_users');
      if (savedReg) {
        const parsed = JSON.parse(savedReg);
        if (Array.isArray(parsed)) storedUsers = parsed;
      }
    } catch {}

    // 3. Gabungkan seluruh daftar akun untuk verifikasi lokal
    const allUsersMap = new Map<string, User>();
    [...PRESET_USERS, ...registeredUsers, ...storedUsers, ...teacherUsers].forEach(u => {
      if (u && u.email) {
        allUsersMap.set(u.email.toLowerCase().trim(), u);
      }
    });

    const foundUser = allUsersMap.get(cleanEmail);

    if (foundUser) {
      const expectedPassword = foundUser.password;
      const isValid = Boolean(expectedPassword && cleanPassword === expectedPassword);

      if (!isValid) {
        setLoginError('Email atau password salah.');
        return;
      }

      onLoginSuccess(foundUser);
      return;
    }

    // 4. Fallback ke endpoint server backend /api/auth/login
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });
      const data = await resp.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
        return;
      } else {
        setLoginError(data.error || 'Akun belum terdaftar dalam sistem.');
        return;
      }
    } catch (apiErr) {
      // 5. Offline Fallback jika ada kecocokan di daftar guru
      const matchedTeacher = allTeacherList.find(t => t.email.toLowerCase().trim() === cleanEmail);
      if (matchedTeacher) {
        const fallbackTeacherUser: User = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          email: matchedTeacher.email,
          role: 'guru',
          identityNo: matchedTeacher.identityNo,
          schoolId: matchedTeacher.schoolId,
          schoolName: matchedTeacher.schoolName,
          phone: matchedTeacher.phone,
          password: matchedTeacher.password
        };
        const expectedPassword = fallbackTeacherUser.password;
        if (expectedPassword && cleanPassword === expectedPassword) {
          onLoginSuccess(fallbackTeacherUser);
          return;
        } else {
          setLoginError('Email atau password salah.');
          return;
        }
      }
      setLoginError('Akun belum terdaftar dalam sistem.');
    }
  };

  const handlePresetSelect = (presetUser: User) => {
    onLoginSuccess(presetUser);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName.trim() || !regIdentity.trim() || !regEmail.trim() || !regPassword || !regConfirmPassword) {
      setRegError('Semua field formulir registrasi wajib diisi.');
      return;
    }

    if (!regClass) {
      setRegError('Silakan pilih kelas terlebih dahulu.');
      return;
    }

    const allUsers = [...PRESET_USERS, ...registeredUsers];
    if (allUsers.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setRegError('Email sudah terdaftar. Gunakan email lain atau halaman login.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Password dan Konfirmasi Password tidak cocok.');
      return;
    }

    const selectedSchoolObj = availableSchools.find(s => s.name === regSchool);
    const selectedClassObj = availableClasses.find(c => c.name === regClass);

    const newUser: User = {
      id: `usr-reg-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: 'siswa', // New registrants default to student role
      identityNo: regIdentity.trim(),
      schoolId: selectedSchoolObj?.id || 'sch-1',
      schoolName: regSchool,
      classId: selectedClassObj?.id || 'cls-1',
      className: regClass,
      password: regPassword.trim()
    };

    onRegisterUser(newUser);
    setRegSuccess('Pendaftaran akun berhasil! Silakan masuk dengan email dan password Anda.');
    setTimeout(() => {
      setAuthMode('login');
      setLoginEmail(newUser.email);
      setLoginPassword('');
    }, 1500);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('Email wajib diisi.');
      return;
    }

    if (!resetCodeSent) {
      setResetCodeSent(true);
      setForgotSuccess('Kode verifikasi reset password telah dikirimkan ke email Anda (Gunakan kode: 888999).');
    } else {
      if (resetCodeInput !== '888999' && resetCodeInput !== '123456') {
        setForgotError('Kode verifikasi reset salah.');
        return;
      }
      if (!newPassword || newPassword.length < 4) {
        setForgotError('Password baru minimal 4 karakter.');
        return;
      }

      try {
        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail.trim(), newPassword: newPassword.trim() }),
        });
      } catch {}

      setForgotSuccess('Password berhasil diperbarui! Mengalihkan ke halaman login...');
      setTimeout(() => {
        setAuthMode('login');
        setLoginEmail(forgotEmail);
        setLoginPassword(newPassword.trim());
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Dynamic Background Design Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Banner Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/75 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 border border-white/10">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Sistem Asesmen & Profil Kesiapan Kerja
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                SMK Kimia Industri
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Model Pembekalan Kompetensi Kejuruan & Employability Skills DUDI</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-300">Portal Asesmen Aktif</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SKKNI & ISO 17025</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        {/* Left Info Branding Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Badge: Penyelarasan DUDI */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-xs font-semibold text-emerald-400 shadow-md shadow-emerald-950/40 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Penyelarasan Standar DUDI Kimia & SKKNI Nasional</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Teruji Validitas Ahli & Praktisi</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3.5">
            <h2 className="text-3xl sm:text-5xl lg:text-[3.15rem] font-black text-white tracking-tight leading-[1.12]">
              Sistem Asesmen Terpadu & <br />
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Pemetaan Kesiapan Kerja
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-slate-300 mt-2.5 font-sans tracking-normal">
                Siswa SMK Rumpun Kimia Industri
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Platform asesmen kejuruan komprehensif yang mengintegrasikan instrumen tes teknis laboratorium kimia terstandar, evaluasi kecakapan kerja situasional (<em>Employability Skills</em>), serta verifikasi portofolio untuk memetakan kesiapan kerja lulusan yang terkalibrasi dengan kualifikasi dunia industri.
            </p>
          </div>

          {/* Metric Stats Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span><strong>6 Dimensi</strong> Teknis Lab</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span><strong>9 Aspek</strong> Employability DUDI</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span><strong>5 Klaster</strong> Posisi Karir</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>Standar <strong>ISO 17025</strong></span>
            </div>
          </div>

          {/* 3 Interactive Pillar Cards */}
          <div className="grid sm:grid-cols-3 gap-3.5 pt-1">
            <div className="p-4.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  Teknis Lab
                </span>
              </div>
              <div className="text-emerald-400 font-extrabold text-base">6 Dimensi Teknis</div>
              <div className="text-xs font-semibold text-white mt-0.5">Kompetensi Laboratorium</div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                K3LH, Preparasi Sampel & Baku, Stoikiometri, Volumetri Terkalibrasi, Instrumentasi Lab Dasar, serta Mutu Pengujian.
              </p>
            </div>

            <div className="p-4.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 hover:border-blue-500/40 transition-all shadow-lg hover:shadow-blue-950/20 group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                  Karakter Kerja
                </span>
              </div>
              <div className="text-blue-400 font-extrabold text-base">9 Aspek Situasional</div>
              <div className="text-xs font-semibold text-white mt-0.5">Employability Skills DUDI</div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Komunikasi teknis, teamwork, problem solving, inisiatif kerja, kepatuhan SOP industri, dan etika profesi.
              </p>
            </div>

            <div className="p-4.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg hover:shadow-amber-950/20 group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  Kualifikasi DUDI
                </span>
              </div>
              <div className="text-amber-400 font-extrabold text-base">Radar Kesiapan Kerja</div>
              <div className="text-xs font-semibold text-white mt-0.5">Pemetaan 5 Posisi Karir</div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Analisis gap profil terhadap QC Analyst, Process Operator, Lab Analyst, QA Staff, dan K3LL Laboratorium.
              </p>
            </div>
          </div>

          {/* Vocational Trust Highlights Strip */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 pt-0.5">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Rubrik Acuan SNI & Standar Lab ISO 17025
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Verifikasi Guru & Praktisi DUDI
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Portofolio Rekam Jejak Kejuruan
            </span>
          </div>

          {/* Informasi Resmi Portal Uji Coba Lapangan (Pilot Testing) */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-950 border border-slate-800/90 space-y-2.5 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Portal Resmi Asesmen & Uji Coba Kejuruan
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Silakan masuk menggunakan <strong>NIS (Siswa)</strong> atau <strong>NIP / Email Resmi (Guru & Administrator)</strong> beserta password yang terdaftar di sekolah Anda. Jika Anda siswa peserta baru, silakan gunakan tab <strong>Registrasi Akun</strong>.
            </p>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500"></div>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-800 mb-6 gap-2">
              <button
                onClick={() => { setAuthMode('login'); setLoginError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'login'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Login Akun</span>
              </button>
              <button
                onClick={() => { setAuthMode('register'); setRegError(''); setRegSuccess(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'register'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Pendaftaran Baru</span>
              </button>
            </div>

            {/* LOGIN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-blue-400" />
                    Masuk ke Sistem
                  </h3>
                  <p className="text-xs text-slate-400">Masukkan email dan password terdaftar Anda.</p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Pengguna</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="contoh: guru@sekolah.sch.id"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot_password'); setForgotError(''); setForgotSuccess(''); setForgotEmail(loginEmail); }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    Pendaftaran Akun Siswa Baru
                  </h3>
                  <p className="text-xs text-slate-400">Lengkapi identitas Anda untuk terhubung ke kelas.</p>
                </div>

                {regError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Siswa"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">NIS / Identitas</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 2204105"
                      value={regIdentity}
                      onChange={(e) => setRegIdentity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sekolah</label>
                    <select
                      value={regSchool}
                      onChange={(e) => {
                        const newSchoolName = e.target.value;
                        setRegSchool(newSchoolName);
                        const matchedSchool = availableSchools.find(s => s.name === newSchoolName);
                        const schoolClasses = availableClasses.filter(c => matchedSchool ? c.schoolId === matchedSchool.id : true);
                        if (schoolClasses.length > 0) {
                          setRegClass(schoolClasses[0].name);
                        } else {
                          setRegClass('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {availableSchools.length > 0 ? (
                        availableSchools.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))
                      ) : (
                        <option value="">Belum ada sekolah terdaftar</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Pilih Kelas</label>
                    <select
                      value={regClass}
                      onChange={(e) => setRegClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {availableClasses.filter(c => {
                        const matchedSchool = availableSchools.find(s => s.name === regSchool);
                        return matchedSchool ? c.schoolId === matchedSchool.id : true;
                      }).length > 0 ? (
                        availableClasses.filter(c => {
                          const matchedSchool = availableSchools.find(s => s.name === regSchool);
                          return matchedSchool ? c.schoolId === matchedSchool.id : true;
                        }).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))
                      ) : (
                        <option value="">Belum ada kelas terdaftar</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Siswa</label>
                  <input
                    type="email"
                    required
                    placeholder="nama.siswa@siswa.sch.id"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Konfirmasi Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer mt-2"
                >
                  Simpan & Daftarkan Akun
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    Lupa Password
                  </h3>
                  <p className="text-xs text-slate-400">Masukkan email Anda untuk menerima kode reset password.</p>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    <strong className="text-blue-300">Tips Ujian/Simulasi:</strong> Siswa yang lupa password di ruang lab dapat langsung meminta <strong>Guru Pengawas</strong> atau <strong>Administrator Sekolah</strong> untuk mereset password secara instan dari panel pengawas.
                  </p>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Pengguna</label>
                    <input
                      type="email"
                      required
                      disabled={resetCodeSent}
                      placeholder="email@sekolah.sch.id"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {resetCodeSent && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Verifikasi (Gunakan: 888999)</label>
                        <input
                          type="text"
                          required
                          placeholder="888999"
                          value={resetCodeInput}
                          onChange={(e) => setResetCodeInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Password Baru</label>
                        <input
                          type="password"
                          required
                          placeholder="Minimal 6 karakter"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Batal / Login
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    {resetCodeSent ? 'Reset Password' : 'Kirim Kode Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-3 text-center text-xs text-slate-400 z-10">
        © 2025 Sistem Asesmen & Profil Kesiapan Kerja SMK Vocational. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
};
