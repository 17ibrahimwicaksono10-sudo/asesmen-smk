import React, { useState, useEffect } from 'react';
import { User, School, ClassRoom, Teacher, QuestionPackage, Exam, ExamSubmission, ArchivedItem, SystemSettings, StudentReadinessProfileData, PortfolioItem } from './types';
import {
  PRESET_USERS,
  INITIAL_SCHOOLS,
  INITIAL_CLASSES,
  INITIAL_TEACHERS,
  INITIAL_PACKAGES,
  INITIAL_EXAMS,
  INITIAL_SUBMISSIONS,
  INITIAL_ARCHIVES,
  INITIAL_SETTINGS,
  INITIAL_PORTFOLIOS
} from './data/mockData';
import { REVISED_QUESTIONS_24 } from './data/revisedQuestions';
import { LayoutDashboard, ClipboardList, Award, Briefcase, Menu, Users, BarChart3, GraduationCap, Settings, AlertTriangle } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiFetch, clearAuthToken, getAuthToken, setAuthToken } from './services/api';

// Layout Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { AuthModal } from './components/auth/AuthModal';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SchoolManager } from './components/admin/SchoolManager';
import { ClassManager } from './components/admin/ClassManager';
import { TeacherManager } from './components/admin/TeacherManager';
import { PackageMaster } from './components/admin/PackageMaster';
import { SettingsAndArchive } from './components/admin/SettingsAndArchive';
import { StudentManager } from './components/admin/StudentManager';

// Guru Components
import { GuruDashboard } from './components/guru/GuruDashboard';
import { ExamManager } from './components/guru/ExamManager';
import { ExamMonitor } from './components/guru/ExamMonitor';

// Siswa Components
import { SiswaDashboard } from './components/siswa/SiswaDashboard';
import { SiswaClassView } from './components/siswa/SiswaClassView';
import { SiswaExamView } from './components/siswa/SiswaExamView';
import { ExamRunner } from './components/siswa/ExamRunner';
import { WorkReadinessProfile } from './components/siswa/WorkReadinessProfile';
import { SiswaPortfolio } from './components/siswa/SiswaPortfolio';

export default function App() {
  // Auth State: Pulihkan user aktif dari localStorage jika sesi valid (admin, guru, atau siswa)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('voc_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) return parsed;
      }
    } catch {}
    return null;
  });
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  // Strictly filter only registered & preset students (role: 'siswa') without duplicates
  const allStudents = React.useMemo(() => {
    const studentMap = new Map<string, User>();
    PRESET_USERS.filter(u => u.role === 'siswa').forEach(u => studentMap.set(u.id, u));
    registeredUsers.filter(u => u.role === 'siswa').forEach(u => studentMap.set(u.id, u));
    return Array.from(studentMap.values());
  }, [registeredUsers]);

  // Master States: Default kosong murni untuk fresh pilot testing
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);

  // Strictly isolate classes assigned to the active teacher (role === 'guru')
  const guruAssignedClasses = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'guru') return classes;
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
        (currentUser.name && c.teacherName && currentUser.name.toLowerCase().includes(c.teacherName.toLowerCase())) ||
        (currentUser.assignedClassIds && currentUser.assignedClassIds.includes(c.id));
    });

    return assigned.length > 0 ? assigned : classes.filter(c => 
      (currentUser.schoolId && c.schoolId === currentUser.schoolId) ||
      (currentUser.schoolName && isSchoolMatch(c.schoolName, currentUser.schoolName))
    );
  }, [classes, currentUser]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [packages, setPackages] = useState<QuestionPackage[]>(() => {
    try {
      const saved = localStorage.getItem('voc_packages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PACKAGES;
  });
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem('voc_exams');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [archives, setArchives] = useState<ArchivedItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem('voc_portfolios');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Strictly filter exams for active student (role: 'siswa') secara perseorangan
  const studentClassExams = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'siswa') return exams;

    const mySubExamIds = new Set(
      submissions
        .filter(s =>
          (s.studentId && s.studentId === currentUser.id) ||
          (currentUser.identityNo && (s.studentNis === currentUser.identityNo || s.studentId === `usr-std-${currentUser.identityNo}`)) ||
          (currentUser.email && (s as any).studentEmail && (s as any).studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.name && s.studentName && s.studentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        )
        .map(s => s.examId)
    );

    return exams.filter(e => {
      let isMatch = false;
      if (e.classId && currentUser.classId && e.classId === currentUser.classId) isMatch = true;
      else if (e.className && currentUser.className) {
        const cleanE = e.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanU = currentUser.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanE === cleanU) isMatch = true;
      } else if (e.className?.toLowerCase() === 'semua kelas' || e.classId === 'all') {
        isMatch = !e.schoolName || e.schoolName.trim().toLowerCase() === currentUser.schoolName?.trim().toLowerCase();
      } else if (!e.classId && !e.className && e.schoolName && currentUser.schoolName) {
        isMatch = e.schoolName.trim().toLowerCase() === currentUser.schoolName.trim().toLowerCase();
      } else if (e.schoolName && currentUser.schoolName && e.schoolName.trim().toLowerCase() === currentUser.schoolName.trim().toLowerCase()) {
        isMatch = true;
      }

      if (!isMatch) return false;

      // PRINSIP PERSEORANGAN: Jika ujian sudah selesai (lewat) di kelas,
      // dan siswa ini BELUM PERNAH mengerjakan (misal siswa baru masuk setelah ujian lewat),
      // maka paket soal TIDAK DITAMPILKAN sama sekali (bukan susulan).
      const hasSubmitted = mySubExamIds.has(e.id);
      if (e.status === 'selesai' && !hasSubmitted) {
        return false;
      }

      return true;
    });
  }, [exams, currentUser, submissions]);

  const handleAddPortfolio = async (item: PortfolioItem) => {
    setPortfolios(prev => {
      const updated = [item, ...prev.filter(p => p.id !== item.id)];
      try {
        localStorage.setItem('voc_portfolios', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (e) { console.error(e); }
  };

  const handleDeletePortfolio = async (id: string) => {
    setPortfolios(prev => {
      const updated = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem('voc_portfolios', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch(`/api/portfolios/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const handleUpdatePortfolio = async (item: PortfolioItem) => {
    setPortfolios(prev => {
      const updated = prev.map(p => p.id === item.id ? item : p);
      try {
        localStorage.setItem('voc_portfolios', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch(`/api/portfolios/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (e) { console.error(e); }
  };

  const handleUpdateCurrentUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('voc_user', JSON.stringify(user));
    } catch {}
  };

  const [validatedProfiles, setValidatedProfiles] = useState<Record<string, StudentReadinessProfileData>>(() => {
    try {
      const saved = localStorage.getItem('voc_validated_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        let hasModified = false;
        Object.keys(parsed).forEach(id => {
          const prof = parsed[id];
          if (
            prof?.aiResult?.jobFitPercentage === 89 ||
            prof?.deepProfileResult?.jobFitPercentage === 85 ||
            prof?.aiResult?.summary?.includes('88%') ||
            prof?.deepProfileResult?.profilRingkasan?.includes('volumetri')
          ) {
            delete parsed[id];
            hasModified = true;
          }
        });
        if (hasModified) {
          localStorage.setItem('voc_validated_profiles', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {}
    return {};
  });

  const handleSaveValidatedProfile = (profile: StudentReadinessProfileData) => {
    setValidatedProfiles(prev => {
      const updated = { ...prev, [profile.studentId]: profile };
      try {
        localStorage.setItem('voc_validated_profiles', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Active Tab State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Exam Taking Runner State: Pulihkan dari sessionStorage jika siswa me-refresh halaman saat ujian berlangsung
  const [runningExam, setRunningExam] = useState<{ exam: Exam; pkg: QuestionPackage } | null>(() => {
    try {
      const savedSession = sessionStorage.getItem('voc_active_exam_session');
      if (savedSession) {
        return JSON.parse(savedSession);
      }
    } catch {}
    return null;
  });

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load persistent data from Backend Database
  useEffect(() => {
    async function loadBackendData() {
      setIsInitialLoading(true);
      setLoadError(null);

      // 1. Verifikasi dan pulihkan auth token jika tersimpan di sesi browser
      try {
        const storedToken = getAuthToken();
        if (storedToken) {
          const tokenRes = await fetch('/api/auth/restore-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`
            },
            body: JSON.stringify({ token: storedToken })
          });
          const tokenJson = await tokenRes.json().catch(() => ({}));
          if (tokenRes.ok && tokenJson.token) {
            setAuthToken(tokenJson.token);
            if (tokenJson.user) {
              setCurrentUser(tokenJson.user);
              try {
                localStorage.setItem('voc_user', JSON.stringify(tokenJson.user));
              } catch {}
            }
            console.log('[Frontend] Sesi autentikasi berhasil dipulihkan secara aman.');
          } else {
            // Sesi kedaluwarsa atau token tidak valid: hapus dari browser
            setAuthToken(null);
            setCurrentUser(null);
            try {
              localStorage.removeItem('voc_token');
              localStorage.removeItem('voc_user');
            } catch {}
            console.warn('[Frontend] Sesi tersimpan tidak valid atau telah kedaluwarsa.');
          }
        }
      } catch (tokenErr) {
        console.warn('[Frontend] Gagal memeriksa pemulihan auth token:', tokenErr);
      }

      // 2. Ambil data bootstrap dari backend
      try {
        const json = await apiGet('/api/bootstrap');
        if (json.success && json.data) {
          const { users, schools: s, classes: c, teachers: t, packages: p, exams: e, submissions: sub, archives: a, settings: set, portfolios: port } = json.data;
          if (Array.isArray(s)) setSchools(s);
          if (Array.isArray(c)) setClasses(c);
          if (Array.isArray(t)) {
            setTeachers(t);
            try {
              localStorage.setItem('voc_teachers', JSON.stringify(t));
            } catch {}
          }
          if (Array.isArray(p)) {
            setPackages(p);
            try {
              localStorage.setItem('voc_packages', JSON.stringify(p));
            } catch {}
          }
          if (Array.isArray(e)) {
            setExams(e);
            try {
              localStorage.setItem('voc_exams', JSON.stringify(e));
            } catch {}
          }
          if (Array.isArray(sub)) setSubmissions(sub);
          if (Array.isArray(a)) setArchives(a);
          if (set) setSettings(set);
          if (Array.isArray(port) && port.length > 0) {
            setPortfolios(port);
            try {
              localStorage.setItem('voc_portfolios', JSON.stringify(port));
            } catch {}
          }
          if (Array.isArray(users) || Array.isArray(t)) {
            setRegisteredUsers(() => {
              const map = new Map<string, User>();
              if (Array.isArray(users)) {
                users.forEach((u: User) => map.set(u.email.toLowerCase(), u));
              }
              if (Array.isArray(t)) {
                t.forEach((item: Teacher) => {
                  map.set(item.email.toLowerCase(), {
                    id: item.id,
                    name: item.name,
                    email: item.email,
                    role: 'guru',
                    identityNo: item.identityNo,
                    schoolId: item.schoolId,
                    schoolName: item.schoolName,
                    phone: item.phone,
                    password: item.password || '123456'
                  });
                });
              }
              const merged = Array.from(map.values());
              try {
                localStorage.setItem('voc_registered_users', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
          console.log('[Frontend] Data berhasil disinkronkan dari database backend.');
        } else {
          setLoadError(json.error || 'Gagal memuat data dari database.');
        }
      } catch (err: any) {
        console.warn('[Frontend] Gagal terhubung ke backend bootstrap:', err);
        setLoadError('Gagal terhubung ke backend server. Periksa koneksi jaringan Anda.');
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadBackendData();
  }, []);

  // Handlers for Auth
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('voc_user', JSON.stringify(user));
    } catch {}
    setActiveTab('overview');
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    try {
      localStorage.removeItem('voc_user');
      sessionStorage.removeItem('voc_active_exam_session');
    } catch {}
    setRunningExam(null);
  };

  const handleRegisterUser = async (newUser: User) => {
    setRegisteredUsers(prev => {
      const updated = [...prev.filter(u => u.id !== newUser.id && u.email.toLowerCase() !== newUser.email.toLowerCase()), newUser];
      try {
        localStorage.setItem('voc_registered_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      console.log('[Frontend] Siswa baru berhasil disimpan permanen ke server database.');
    } catch (err) {
      console.error('[Frontend] Gagal menyimpan ke backend:', err);
    }
  };

  // CRUD - Schools
  const handleAddSchool = async (newSchool: School) => {
    setSchools(prev => [...prev, newSchool]);
    try {
      await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchool)
      });
    } catch (e) { console.error(e); }
  };
  const handleUpdateSchool = async (updatedSchool: School) => {
    setSchools(prev => prev.map(s => s.id === updatedSchool.id ? updatedSchool : s));
    try {
      await fetch(`/api/schools/${updatedSchool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchool)
      });
    } catch (e) { console.error(e); }
  };
  const handleDeleteSchool = async (schoolId: string) => {
    setSchools(prev => prev.filter(s => s.id !== schoolId));
    try {
      await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // CRUD - Classes
  const handleAddClass = async (newClass: ClassRoom) => {
    setClasses(prev => [...prev, newClass]);
    try {
      await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
      });
    } catch (e) { console.error(e); }
  };
  const handleUpdateClass = async (updatedClass: ClassRoom) => {
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    try {
      await fetch(`/api/classes/${updatedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClass)
      });
    } catch (e) { console.error(e); }
  };
  const handleDeleteClass = async (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
    try {
      await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // CRUD - Teachers
  const handleAddTeacher = async (newTeacher: Teacher) => {
    setTeachers(prev => {
      const updated = [...prev.filter(t => t.id !== newTeacher.id), newTeacher];
      try {
        localStorage.setItem('voc_teachers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Automatically create corresponding User account with role 'guru' so teacher can login
    const teacherUser: User = {
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.email,
      role: 'guru',
      identityNo: newTeacher.identityNo,
      schoolId: newTeacher.schoolId,
      schoolName: newTeacher.schoolName,
      phone: newTeacher.phone,
      password: newTeacher.password || '123456'
    };

    setRegisteredUsers(prev => {
      const updated = [...prev.filter(u => u.id !== teacherUser.id && u.email.toLowerCase() !== teacherUser.email.toLowerCase()), teacherUser];
      try {
        localStorage.setItem('voc_registered_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher)
      });
    } catch (e) { console.error(e); }
  };

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    setTeachers(prev => {
      const updated = prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
      try {
        localStorage.setItem('voc_teachers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRegisteredUsers(prev => {
      const userIdx = prev.findIndex(u => u.id === updatedTeacher.id || u.email.toLowerCase() === updatedTeacher.email.toLowerCase());
      if (userIdx >= 0) {
        const updated = [...prev];
        updated[userIdx] = {
          ...updated[userIdx],
          name: updatedTeacher.name,
          email: updatedTeacher.email,
          identityNo: updatedTeacher.identityNo,
          schoolId: updatedTeacher.schoolId,
          schoolName: updatedTeacher.schoolName,
          phone: updatedTeacher.phone,
          password: updatedTeacher.password || updated[userIdx].password || '123456'
        };
        try {
          localStorage.setItem('voc_registered_users', JSON.stringify(updated));
        } catch {}
        return updated;
      } else {
        const newTeacherUser: User = {
          id: updatedTeacher.id,
          name: updatedTeacher.name,
          email: updatedTeacher.email,
          role: 'guru',
          identityNo: updatedTeacher.identityNo,
          schoolId: updatedTeacher.schoolId,
          schoolName: updatedTeacher.schoolName,
          phone: updatedTeacher.phone,
          password: updatedTeacher.password || '123456'
        };
        const updated = [...prev, newTeacherUser];
        try {
          localStorage.setItem('voc_registered_users', JSON.stringify(updated));
        } catch {}
        return updated;
      }
    });

    try {
      await fetch(`/api/teachers/${updatedTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeacher)
      });
    } catch (e) { console.error(e); }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    const teacherToDelete = teachers.find(t => t.id === teacherId);
    setTeachers(prev => {
      const updated = prev.filter(t => t.id !== teacherId);
      try {
        localStorage.setItem('voc_teachers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRegisteredUsers(prev => {
      const updated = prev.filter(u => u.id !== teacherId && (!teacherToDelete || u.email.toLowerCase() !== teacherToDelete.email.toLowerCase()));
      try {
        localStorage.setItem('voc_registered_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await fetch(`/api/teachers/${teacherId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // CRUD - Packages
  const handleAddPackage = async (newPkg: QuestionPackage) => {
    setPackages(prev => {
      const updated = [...prev.filter(p => p.id !== newPkg.id), newPkg];
      try {
        localStorage.setItem('voc_packages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiPost('/api/packages', newPkg);
    } catch (e) {
      console.error('[App] Gagal menyimpan paket baru ke server:', e);
    }
  };
  const handleUpdatePackage = async (updatedPkg: QuestionPackage) => {
    setPackages(prev => {
      const updated = prev.map(p => p.id === updatedPkg.id ? updatedPkg : p);
      try {
        localStorage.setItem('voc_packages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiPut(`/api/packages/${updatedPkg.id}`, updatedPkg);
    } catch (e) {
      console.error('[App] Gagal memperbarui paket ke server:', e);
    }
  };
  const handleDeletePackage = async (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setArchives(prev => [
        {
          id: `arch-${Date.now()}`,
          type: 'paket_soal',
          title: pkg.title,
          archivedAt: new Date().toISOString().split('T')[0],
          reason: 'Diarsipkan oleh Pengguna'
        },
        ...prev
      ]);
    }
    setPackages(prev => {
      const updated = prev.filter(p => p.id !== pkgId);
      try {
        localStorage.setItem('voc_packages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiDelete(`/api/packages/${pkgId}`);
    } catch (e) {
      console.error('[App] Gagal menghapus paket dari server:', e);
    }
  };

  // CRUD - Exams
  const handleAddExam = async (newExam: Exam) => {
    // Pastikan snapshot butir soal disertakan dari paket jika belum ada
    if (!newExam.questionSnapshot || newExam.questionSnapshot.length === 0) {
      const selectedPkg = packages.find(p => p.id === newExam.packageId);
      if (selectedPkg && Array.isArray(selectedPkg.questions)) {
        newExam.questionSnapshot = JSON.parse(JSON.stringify(selectedPkg.questions));
        newExam.packageTitle = selectedPkg.title;
        newExam.category = selectedPkg.category;
      }
    }
    setExams(prev => {
      const updated = [newExam, ...prev.filter(e => e.id !== newExam.id)];
      try {
        localStorage.setItem('voc_exams', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiPost('/api/exams', newExam);
    } catch (e) {
      console.error('[App] Gagal menjadwalkan ujian ke server:', e);
    }
  };
  const handleUpdateExam = async (updatedExam: Exam) => {
    const selectedPkg = packages.find(p => p.id === updatedExam.packageId);
    if (selectedPkg && Array.isArray(selectedPkg.questions)) {
      updatedExam.packageTitle = selectedPkg.title;
      updatedExam.category = selectedPkg.category;
      if (!updatedExam.questionSnapshot || updatedExam.questionSnapshot.length === 0) {
        updatedExam.questionSnapshot = JSON.parse(JSON.stringify(selectedPkg.questions));
      }
    }
    setExams(prev => {
      const updated = prev.map(e => e.id === updatedExam.id ? updatedExam : e);
      try {
        localStorage.setItem('voc_exams', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiPut(`/api/exams/${updatedExam.id}`, updatedExam);
    } catch (e) {
      console.error('[App] Gagal memperbarui ujian ke server:', e);
    }
  };
  const handleDeleteExam = async (examId: string) => {
    setExams(prev => {
      const updated = prev.filter(e => e.id !== examId);
      try {
        localStorage.setItem('voc_exams', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await apiDelete(`/api/exams/${examId}`);
    } catch (e) {
      console.error('[App] Gagal menghapus ujian dari server:', e);
    }
  };

  // Submissions
  const handleUpdateSubmission = async (updatedSubmission: ExamSubmission) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === updatedSubmission.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedSubmission;
        return copy;
      }
      return [updatedSubmission, ...prev];
    });
    try {
      await fetch(`/api/submissions/${updatedSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubmission)
      });
    } catch (e) { console.error(e); }
  };

  // Student Actions
  const handleJoinClassByCode = (code: string): boolean => {
    const foundClass = classes.find(c => c.classCode.toLowerCase() === code.toLowerCase());
    if (foundClass && currentUser) {
      const updatedUser: User = {
        ...currentUser,
        classId: foundClass.id,
        className: foundClass.name,
        schoolId: foundClass.schoolId || currentUser.schoolId,
        schoolName: foundClass.schoolName
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('voc_user', JSON.stringify(updatedUser));
      } catch {}
      setRegisteredUsers(prev => {
        const uIdx = prev.findIndex(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (uIdx >= 0) {
          const copy = [...prev];
          copy[uIdx] = updatedUser;
          try {
            localStorage.setItem('voc_registered_users', JSON.stringify(copy));
          } catch {}
          return copy;
        }
        return prev;
      });
      fetch(`/api/auth/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      }).catch(console.error);
      return true;
    }
    return false;
  };

  const handleStartExam = async (exam: Exam) => {
    try {
      // 1. Ambil butir soal terverifikasi langsung dari backend endpoint resolver
      let resolvedQuestions: QuestionItem[] = [];
      let resolvedPackage: QuestionPackage | undefined;

      try {
        const res = await apiGet<{
          success: boolean;
          examId: string;
          packageId: string;
          packageTitle: string;
          questions: QuestionItem[];
          packageObj?: QuestionPackage;
        }>(`/api/exams/${exam.id}/questions`);

        if (res && res.success && Array.isArray(res.questions) && res.questions.length > 0) {
          resolvedQuestions = res.questions;
          resolvedPackage = res.packageObj || packages.find(p => p.id === exam.packageId);
        }
      } catch (apiErr: any) {
        console.warn('[handleStartExam] Backend resolver warning, falling back to local snapshot:', apiErr);
      }

      // 2. Jika offline atau resolver jaringan gagal, gunakan snapshot ujian atau paket lokal
      if (resolvedQuestions.length === 0) {
        if (Array.isArray(exam.questionSnapshot) && exam.questionSnapshot.length > 0) {
          resolvedQuestions = exam.questionSnapshot;
        } else {
          const localPkg = packages.find(p => p.id === exam.packageId);
          if (localPkg && Array.isArray(localPkg.questions) && localPkg.questions.length > 0) {
            resolvedQuestions = localPkg.questions;
            resolvedPackage = localPkg;
          }
        }
      }

      // 3. Larangan keras: Jangan gunakan soal Kemampuan Teknis Kimia sebagai fallback!
      // Jika paket atau daftar soal tidak valid, tampilkan pesan error yang jelas.
      if (resolvedQuestions.length === 0) {
        alert(`Gagal membuka ujian "${exam.title}": Paket soal "${exam.packageTitle || exam.packageId}" tidak ditemukan atau belum memiliki butir soal. Silakan hubungi guru pengawas.`);
        return;
      }

      const activePkg: QuestionPackage = resolvedPackage || {
        id: exam.packageId,
        code: exam.packageId,
        title: exam.packageTitle || 'Paket Ujian',
        description: exam.title,
        category: exam.category,
        durationMinutes: exam.durationMinutes,
        totalQuestions: resolvedQuestions.length,
        questions: resolvedQuestions,
        isActive: true,
        createdAt: exam.scheduleDate,
        createdBy: exam.teacherName
      };

      const examWithSnapshot: Exam = {
        ...exam,
        questionSnapshot: resolvedQuestions
      };

      const sessionData = { exam: examWithSnapshot, pkg: { ...activePkg, questions: resolvedQuestions } };
      try {
        sessionStorage.setItem('voc_active_exam_session', JSON.stringify(sessionData));
      } catch {}
      setRunningExam(sessionData);
    } catch (err: any) {
      console.error('[handleStartExam] Error:', err);
      alert(`Terjadi kesalahan saat memulai ujian: ${err.message || err}`);
    }
  };

  const handleSubmitExamRunner = async (newSubmission: ExamSubmission) => {
    try {
      const res = await apiPost('/api/submissions', newSubmission);
      if (!res || res.success === false) {
        throw new Error(res?.error || 'Server menolak pengiriman ujian.');
      }

      setSubmissions(prev => {
        const filtered = prev.filter(s => s.id !== newSubmission.id);
        return [newSubmission, ...filtered];
      });

      // Update completed student count in exam if not duplicate
      setExams(prev => prev.map(e => {
        if (e.id === newSubmission.examId) {
          const alreadySubmitted = submissions.some(s => s.examId === e.id && s.studentId === newSubmission.studentId);
          return { ...e, completedStudents: alreadySubmitted ? (e.completedStudents || 1) : ((e.completedStudents || 0) + 1) };
        }
        return e;
      }));

      try {
        sessionStorage.removeItem('voc_active_exam_session');
      } catch {}
      setRunningExam(null);
      setActiveTab('kesiapan_kerja');
    } catch (err: any) {
      console.error('[Frontend] Submit exam failed:', err);
      throw err;
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) { console.error(e); }
  };

  // Archives handlers
  const handleRestoreArchive = (id: string) => {
    setArchives(prev => prev.filter(a => a.id !== id));
  };
  const handleDeleteArchive = (id: string) => {
    setArchives(prev => prev.filter(a => a.id !== id));
  };

  // Reset Password Siswa oleh Admin/Guru
  const handleResetStudentPassword = async (studentId: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setRegisteredUsers(prev => {
          const updated = prev.map(u => u.id === studentId ? { ...u, password: newPassword } : u);
          try {
            localStorage.setItem('voc_registered_users', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error resetting password:', err);
      return false;
    }
  };

  // Loading screen saat sinkronisasi data awal
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-4 shadow-xl">
          <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Memuat EmployaSkills</h2>
        <p className="text-xs text-slate-400">Sinkronisasi data asesmen dan profil kesiapan kerja...</p>
      </div>
    );
  }

  // Load error screen jika data sama sekali kosong dan koneksi terputus
  if (loadError && !schools.length && !exams.length && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Gagal Menghubungkan ke Server</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{loadError}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-blue-600/30"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  // If user is not logged in, show AuthModal
  if (!currentUser) {
    return (
      <AuthModal
        onLoginSuccess={handleLoginSuccess}
        registeredUsers={registeredUsers}
        onRegisterUser={handleRegisterUser}
        teachers={teachers}
        schools={schools}
        classes={classes}
      />
    );
  }

  // If student is actively taking an exam in runner mode
  if (runningExam) {
    return (
      <ExamRunner
        exam={runningExam.exam}
        packageObj={runningExam.pkg}
        studentId={currentUser.id}
        studentName={currentUser.name}
        studentNis={currentUser.identityNo}
        studentEmail={currentUser.email}
        schoolName={currentUser.schoolName}
        className={currentUser.className || 'XII Kimia Analitik 1'}
        onSubmitExam={handleSubmitExamRunner}
        onCancelExam={() => {
          try {
            sessionStorage.removeItem('voc_active_exam_session');
          } catch {}
          setRunningExam(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeAcademicYear={settings.academicYear}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dynamic Role Sidebar (Desktop & Mobile Drawer) */}
        <Sidebar
          role={currentUser.role}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content View Container */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {/* ADMIN ROLE VIEWS */}
          {currentUser.role === 'admin' && (
            <>
              {activeTab === 'overview' && (
                <AdminDashboard
                  schools={schools}
                  classes={classes}
                  teachers={teachers}
                  packages={packages}
                  exams={exams}
                />
              )}

              {activeTab === 'sekolah' && (
                <SchoolManager
                  schools={schools}
                  onAddSchool={handleAddSchool}
                  onUpdateSchool={handleUpdateSchool}
                  onDeleteSchool={handleDeleteSchool}
                />
              )}

              {activeTab === 'kelas' && (
                <ClassManager
                  classes={classes}
                  schools={schools}
                  teachers={teachers}
                  students={allStudents}
                  onAddClass={handleAddClass}
                  onUpdateClass={handleUpdateClass}
                  onDeleteClass={handleDeleteClass}
                  onResetPassword={handleResetStudentPassword}
                />
              )}

              {activeTab === 'guru' && (
                <TeacherManager
                  teachers={teachers}
                  schools={schools}
                  classes={classes}
                  onAddTeacher={handleAddTeacher}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                />
              )}

              {activeTab === 'siswa' && (
                <StudentManager
                  students={allStudents}
                  schools={schools}
                  classes={classes}
                  onResetPassword={handleResetStudentPassword}
                />
              )}

              {activeTab === 'soal' && (
                <PackageMaster
                  packages={packages}
                  onAddPackage={handleAddPackage}
                  onUpdatePackage={handleUpdatePackage}
                  onDeletePackage={handleDeletePackage}
                  authorName={currentUser.name}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsAndArchive
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  archives={archives}
                  onRestoreArchive={handleRestoreArchive}
                  onDeleteArchive={handleDeleteArchive}
                />
              )}

              {activeTab === 'kesiapan_kerja' && (
                <WorkReadinessProfile
                  currentUser={currentUser}
                  submissions={submissions}
                  packages={packages}
                  exams={exams}
                  schools={schools}
                  classes={classes}
                  portfolios={portfolios}
                  onAddPortfolio={handleAddPortfolio}
                  onDeletePortfolio={handleDeletePortfolio}
                  onUpdatePortfolio={handleUpdatePortfolio}
                  students={allStudents}
                  validatedProfiles={validatedProfiles}
                  onSaveValidatedProfile={handleSaveValidatedProfile}
                />
              )}
            </>
          )}

          {/* GURU ROLE VIEWS */}
          {currentUser.role === 'guru' && (
            <>
              {activeTab === 'overview' && (
                <GuruDashboard
                  currentUser={currentUser}
                  packages={packages}
                  exams={exams}
                  classes={guruAssignedClasses}
                  submissions={submissions}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'kesiapan_kerja' && (
                <WorkReadinessProfile
                  currentUser={currentUser}
                  submissions={submissions}
                  packages={packages}
                  exams={exams}
                  schools={schools}
                  classes={guruAssignedClasses}
                  portfolios={portfolios}
                  onAddPortfolio={handleAddPortfolio}
                  onDeletePortfolio={handleDeletePortfolio}
                  onUpdatePortfolio={handleUpdatePortfolio}
                  students={allStudents}
                  validatedProfiles={validatedProfiles}
                  onSaveValidatedProfile={handleSaveValidatedProfile}
                />
              )}

              {activeTab === 'paket_soal' && (
                <PackageMaster
                  packages={packages}
                  onAddPackage={handleAddPackage}
                  onUpdatePackage={handleUpdatePackage}
                  onDeletePackage={handleDeletePackage}
                  authorName={currentUser.name}
                />
              )}

              {activeTab === 'kelas' && (
                <ClassManager
                  classes={guruAssignedClasses}
                  schools={schools}
                  teachers={teachers}
                  students={allStudents}
                  currentUser={currentUser}
                  onAddClass={handleAddClass}
                  onUpdateClass={handleUpdateClass}
                  onDeleteClass={handleDeleteClass}
                  onResetPassword={handleResetStudentPassword}
                />
              )}

              {activeTab === 'ujian' && (
                <ExamManager
                  exams={exams}
                  packages={packages}
                  classes={guruAssignedClasses}
                  schools={schools}
                  currentUser={currentUser}
                  submissions={submissions}
                  students={allStudents}
                  onAddExam={handleAddExam}
                  onUpdateExam={handleUpdateExam}
                  onDeleteExam={handleDeleteExam}
                  onUpdateSubmission={handleUpdateSubmission}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'monitoring' && (
                <ExamMonitor
                  exams={exams}
                  submissions={submissions}
                  packages={packages}
                  schools={schools}
                  classes={guruAssignedClasses}
                  currentUser={currentUser}
                  onUpdateSubmission={handleUpdateSubmission}
                />
              )}
            </>
          )}

          {/* SISWA ROLE VIEWS */}
          {currentUser.role === 'siswa' && (
            <>
              {activeTab === 'overview' && (
                <SiswaDashboard
                  currentUser={currentUser}
                  classes={classes}
                  exams={studentClassExams}
                  submissions={submissions}
                  setActiveTab={setActiveTab}
                  onStartExam={handleStartExam}
                  onViewResult={() => setActiveTab('kesiapan_kerja')}
                />
              )}

              {activeTab === 'portofolio' && (
                <SiswaPortfolio
                  currentUser={currentUser}
                  portfolios={portfolios}
                  onAddPortfolio={handleAddPortfolio}
                  onDeletePortfolio={handleDeletePortfolio}
                  onUpdatePortfolio={handleUpdatePortfolio}
                  onUpdateCurrentUser={handleUpdateCurrentUser}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'kelas' && (
                <SiswaClassView
                  currentUser={currentUser}
                  classes={classes}
                  onJoinClassByCode={handleJoinClassByCode}
                />
              )}

              {activeTab === 'ujian' && (
                <SiswaExamView
                  currentUser={currentUser}
                  exams={studentClassExams}
                  submissions={submissions}
                  onStartExam={handleStartExam}
                  onViewResult={() => setActiveTab('kesiapan_kerja')}
                />
              )}

              {activeTab === 'kesiapan_kerja' && (
                <WorkReadinessProfile
                  currentUser={currentUser}
                  submissions={submissions}
                  packages={packages}
                  exams={exams}
                  schools={schools}
                  classes={classes}
                  portfolios={portfolios}
                  onAddPortfolio={handleAddPortfolio}
                  onDeletePortfolio={handleDeletePortfolio}
                  onUpdatePortfolio={handleUpdatePortfolio}
                  students={allStudents}
                  validatedProfiles={validatedProfiles}
                  onSaveValidatedProfile={handleSaveValidatedProfile}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-1.5 px-2 flex justify-around items-center shadow-2xl">
        {currentUser.role === 'siswa' && (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Beranda</span>
            </button>
            <button
              onClick={() => setActiveTab('ujian')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'ujian' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Ujian</span>
            </button>
            <button
              onClick={() => setActiveTab('kesiapan_kerja')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'kesiapan_kerja' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Profil AI</span>
            </button>
            <button
              onClick={() => setActiveTab('portofolio')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'portofolio' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Portofolio</span>
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </>
        )}

        {currentUser.role === 'guru' && (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Beranda</span>
            </button>
            <button
              onClick={() => setActiveTab('ujian')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'ujian' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Jadwal</span>
            </button>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'monitoring' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Monitoring</span>
            </button>
            <button
              onClick={() => setActiveTab('kesiapan_kerja')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'kesiapan_kerja' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Profil AI</span>
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </>
        )}

        {currentUser.role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('kesiapan_kerja')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'kesiapan_kerja' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Profil AI</span>
            </button>
            <button
              onClick={() => setActiveTab('guru')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'guru' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Guru</span>
            </button>
            <button
              onClick={() => setActiveTab('siswa')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'siswa' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Siswa</span>
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
