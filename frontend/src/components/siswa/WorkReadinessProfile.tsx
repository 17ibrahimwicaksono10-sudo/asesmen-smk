import React, { useState, useEffect } from 'react';
import { User, JobPosition, PortfolioItem, Exam, ExamSubmission, StudentReadinessProfileData, School, ClassRoom } from '../../types';
import { TARGET_JOBS, INITIAL_PORTFOLIOS, PRESET_USERS, INITIAL_SCHOOLS, INITIAL_CLASSES } from '../../data/mockData';
import { EMPLOYABILITY_ASPECTS, calculateEmployabilityScore, NON_TEST_QUESTIONS_18 } from '../../data/nonTestInstrument';
import { calculateAssessmentScore, REVISED_QUESTIONS_24 } from '../../data/revisedQuestions';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Award, Sparkles, Plus, Trash2, Printer, Briefcase, AlertCircle, CheckCircle2, FileText, TrendingUp, Layers, CheckSquare, Target, ShieldCheck, BrainCircuit, MessageSquareText, User2, ChevronDown, ChevronUp, Lock, Building2, GraduationCap, Users, Info, FlaskConical, Eye, FileCheck, X, Calendar } from 'lucide-react';
import { PrintReportModal } from '../common/PrintReportModal';


interface WorkReadinessProfileProps {
  currentUser: User;
  submissions: ExamSubmission[];
  packages?: any[]; // QuestionPackage[] for extracting essay questions
  exams?: Exam[];
  students?: User[];
  schools?: School[];
  classes?: ClassRoom[];
  portfolios?: PortfolioItem[];
  onAddPortfolio?: (item: PortfolioItem) => void;
  onDeletePortfolio?: (id: string) => void;
  onUpdatePortfolio?: (item: PortfolioItem) => void;
  validatedProfiles?: Record<string, StudentReadinessProfileData>;
  onSaveValidatedProfile?: (profile: StudentReadinessProfileData) => void;
}

export const WorkReadinessProfile: React.FC<WorkReadinessProfileProps> = ({
  currentUser,
  submissions,
  packages = [],
  exams = [],
  students = [],
  schools = [],
  classes = [],
  portfolios: passedPortfolios = [],
  onAddPortfolio: passedOnAddPortfolio,
  onDeletePortfolio: passedOnDeletePortfolio,
  onUpdatePortfolio: passedOnUpdatePortfolio,
  validatedProfiles = {},
  onSaveValidatedProfile
}) => {
  const isTeacherOrAdmin = currentUser.role === 'guru' || currentUser.role === 'admin';
  const schoolsList = schools.length > 0 ? schools : INITIAL_SCHOOLS;
  const classesList = classes.length > 0 ? classes : INITIAL_CLASSES;
  const studentsList = (students.length > 0 ? students : PRESET_USERS).filter(u => u.role === 'siswa');

  // Helper matching functions for robust string normalization
  const isSchoolMatch = (schName1?: string, schName2?: string) => {
    if (!schName1 || !schName2) return false;
    const clean1 = schName1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = schName2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
  };

  const isClassMatch = (clsName1?: string, clsName2?: string) => {
    if (!clsName1 || !clsName2) return false;
    const clean1 = clsName1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = clsName2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean1 === clean2;
  };

  // Helper function to resolve student's schoolId and classId reliably
  const getStudentSchoolId = (s: User): string => {
    if (s.schoolId) return s.schoolId;
    if (s.schoolName) {
      const match = schoolsList.find(sch => isSchoolMatch(sch.name, s.schoolName));
      if (match) return match.id;
    }
    if (s.classId) {
      const cls = classesList.find(c => c.id === s.classId);
      if (cls && cls.schoolId) return cls.schoolId;
    }
    if (s.className) {
      const cls = classesList.find(c => isClassMatch(c.name, s.className));
      if (cls && cls.schoolId) return cls.schoolId;
    }
    return '';
  };

  const getStudentClassId = (s: User): string => {
    if (s.classId) return s.classId;
    if (s.className) {
      const match = classesList.find(c => isClassMatch(c.name, s.className));
      if (match) return match.id;
    }
    return '';
  };

  const isGuru = currentUser.role === 'guru';
  const isAdmin = currentUser.role === 'admin';

  // Resolusi sekolah bawaan untuk guru agar langsung sesuai sekolah tempat mengajar
  const guruSchool = schoolsList.find(s => 
    (currentUser.schoolId && s.id === currentUser.schoolId) ||
    (currentUser.schoolName && isSchoolMatch(s.name, currentUser.schoolName))
  ) || (isGuru ? schoolsList[0] : undefined);
  const initialSchoolId = (isGuru && guruSchool) ? guruSchool.id : (schoolsList[0]?.id || 'sch-1');

  // Filter rombel kelas yang ditugaskan khusus untuk guru ini
  const teacherAssignedClasses = classesList.filter(c => {
    const matchSchool = (guruSchool && c.schoolId === guruSchool.id) || 
      (guruSchool && isSchoolMatch(c.schoolName, guruSchool.name)) ||
      (currentUser.schoolId && c.schoolId === currentUser.schoolId) ||
      (currentUser.schoolName && isSchoolMatch(c.schoolName, currentUser.schoolName));
    if (!matchSchool) return false;

    return c.teacherId === currentUser.id || 
      c.teacherName === currentUser.name ||
      (currentUser.name && c.teacherName && c.teacherName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser.name && c.teacherName && currentUser.name.toLowerCase().includes(c.teacherName.toLowerCase())) ||
      (currentUser.assignedClassIds && currentUser.assignedClassIds.includes(c.id));
  });

  const classesForInitialSchool = classesList.filter(c => 
    c.schoolId === initialSchoolId || 
    (c.schoolName && isSchoolMatch(c.schoolName, schoolsList.find(s => s.id === initialSchoolId)?.name))
  );
  const guruClass = teacherAssignedClasses[0] || classesForInitialSchool.find(c => c.teacherId === currentUser.id || c.teacherName === currentUser.name);
  const initialClassId = isGuru ? (guruClass?.id || classesForInitialSchool[0]?.id || '') : (classesForInitialSchool[0]?.id || 'cls-1');

  // Filter States (Sekolah -> Kelas -> Siswa)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(initialSchoolId);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);

  // Selected School & Class objects
  const selectedSchoolObj = schoolsList.find(s => s.id === selectedSchoolId);
  const selectedClassObj = classesList.find(c => c.id === selectedClassId);

  // Filtered Classes strictly based on selected School (Untuk Guru: TERBATAS hanya kelas binaan/pengampu guru)
  const filteredClasses = isGuru
    ? (teacherAssignedClasses.length > 0 
        ? teacherAssignedClasses 
        : classesList.filter(c => c.schoolId === initialSchoolId || (guruSchool && isSchoolMatch(c.schoolName, guruSchool.name))))
    : classesList.filter(c => {
        if (c.schoolId === selectedSchoolId) return true;
        if (selectedSchoolObj && isSchoolMatch(c.schoolName, selectedSchoolObj.name)) return true;
        return false;
      });

  // Filtered Students strictly based on selected School AND selected Class
  const filteredStudents = studentsList.filter(s => {
    if (s.role !== 'siswa') return false;
    const sSchoolId = getStudentSchoolId(s);
    const sClassId = getStudentClassId(s);

    const matchSchool = sSchoolId === selectedSchoolId || (selectedSchoolObj && isSchoolMatch(s.schoolName, selectedSchoolObj.name));
    const matchClass = sClassId === selectedClassId || (selectedClassObj && isClassMatch(s.className, selectedClassObj.name));

    return matchSchool && matchClass;
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (isTeacherOrAdmin) {
      const initialMatches = studentsList.filter(s => {
        if (s.role !== 'siswa') return false;
        const sSchoolId = getStudentSchoolId(s);
        const sClassId = getStudentClassId(s);
        const matchSchool = sSchoolId === initialSchoolId || (guruSchool && isSchoolMatch(s.schoolName, guruSchool.name));
        const matchClass = sClassId === initialClassId || (guruClass && isClassMatch(s.className, guruClass.name));
        return matchSchool && matchClass;
      });
      return initialMatches[0]?.id || studentsList[0]?.id || currentUser.id;
    }
    return currentUser.id;
  });

  // Handlers for Cascading Dropdowns
  const handleSchoolChange = (newSchoolId: string) => {
    if (isGuru) return; // Guru tidak diizinkan mengubah sekolah
    setSelectedSchoolId(newSchoolId);

    const targetSchoolObj = schoolsList.find(s => s.id === newSchoolId);
    const availableClasses = classesList.filter(c => 
      c.schoolId === newSchoolId || 
      (targetSchoolObj && isSchoolMatch(c.schoolName, targetSchoolObj.name))
    );

    const nextClassId = availableClasses[0]?.id || '';
    setSelectedClassId(nextClassId);

    const nextClassObj = availableClasses[0];
    const matchingStudents = studentsList.filter(s => {
      if (s.role !== 'siswa') return false;
      const sSchoolId = getStudentSchoolId(s);
      const sClassId = getStudentClassId(s);
      const matchSchool = sSchoolId === newSchoolId || (targetSchoolObj && isSchoolMatch(s.schoolName, targetSchoolObj.name));
      const matchClass = sClassId === nextClassId || (nextClassObj && isClassMatch(s.className, nextClassObj.name));
      return matchSchool && matchClass;
    });

    if (matchingStudents.length > 0) {
      setSelectedStudentId(matchingStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);

    const targetSchoolObj = schoolsList.find(s => s.id === selectedSchoolId);
    const targetClassObj = classesList.find(c => c.id === newClassId);

    const matchingStudents = studentsList.filter(s => {
      if (s.role !== 'siswa') return false;
      const sSchoolId = getStudentSchoolId(s);
      const sClassId = getStudentClassId(s);
      const matchSchool = sSchoolId === selectedSchoolId || (targetSchoolObj && isSchoolMatch(s.schoolName, targetSchoolObj.name));
      const matchClass = sClassId === newClassId || (targetClassObj && isClassMatch(s.className, targetClassObj.name));
      return matchSchool && matchClass;
    });

    if (matchingStudents.length > 0) {
      setSelectedStudentId(matchingStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  };

  // Sync selectedSchoolId and selectedClassId for Guru
  useEffect(() => {
    if (isGuru && guruSchool && selectedSchoolId !== guruSchool.id) {
      setSelectedSchoolId(guruSchool.id);
    }
  }, [isGuru, guruSchool, selectedSchoolId]);

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id);
    }
  }, [filteredClasses, selectedClassId]);

  // Sync selectedStudentId when filtered list updates
  useEffect(() => {
    if (isTeacherOrAdmin && filteredStudents.length > 0) {
      const exists = filteredStudents.some(s => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [selectedSchoolId, selectedClassId, filteredStudents, isTeacherOrAdmin, selectedStudentId]);

  const hasStudentsInClass = !isTeacherOrAdmin || filteredStudents.length > 0;

  const activeStudent: User = isTeacherOrAdmin
    ? (filteredStudents.find(s => s.id === selectedStudentId) || filteredStudents[0] || (currentUser.role === 'siswa' ? currentUser : {
        id: `mock-empty-${selectedSchoolId}-${selectedClassId}`,
        name: `(Belum Ada Siswa Terdaftar)`,
        identityNo: '-',
        email: '-',
        role: 'siswa' as const,
        schoolId: selectedSchoolId,
        schoolName: selectedSchoolObj?.name || 'Sekolah Terpilih',
        classId: selectedClassId,
        className: selectedClassObj?.name || 'Kelas Terpilih'
      }))
    : currentUser;

  const [selectedJob, setSelectedJob] = useState<JobPosition>(TARGET_JOBS[0]);
  const [localPortfolios, setLocalPortfolios] = useState<PortfolioItem[]>(INITIAL_PORTFOLIOS);
  const allPortfolios = passedPortfolios.length > 0 ? passedPortfolios : localPortfolios;
  const portfolios = allPortfolios.filter(p => p.studentId === activeStudent.id);

  // Separation of categories for active student
  const practicumReports = portfolios.filter(p => p.category === 'laporan_praktikum');
  const certificatePortfolios = portfolios.filter(p => p.category !== 'laporan_praktikum');
  const validatedPracticumCount = practicumReports.filter(p => !!p.isValidatedByTeacher).length;

  // PDF Document Preview Modal for Teacher / Admin
  const [previewPdfItem, setPreviewPdfItem] = useState<PortfolioItem | null>(null);

  // Existing validated profile data for active student
  const activeValidatedProfile = validatedProfiles[activeStudent.id];
  const isCurrentProfileValidated = activeValidatedProfile?.isTeacherValidated || false;

  // Portfolio Modal
  const [showPortModal, setShowPortModal] = useState(false);
  const [portTitle, setPortTitle] = useState('');
  const [portCategory, setPortCategory] = useState<'sertifikat' | 'pkl' | 'proyek' | 'laporan_praktikum'>('sertifikat');
  const [portTopic, setPortTopic] = useState('');
  const [portIssuer, setPortIssuer] = useState('');
  const [portDate, setPortDate] = useState('2024-10-15');
  const [portDesc, setPortDesc] = useState('');

  // AI Recommendation State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<any>(activeValidatedProfile?.aiResult || null);
  const [aiProvider, setAiProvider] = useState<string>(activeValidatedProfile?.aiProvider || '');

  // Deep Profile (Accumulative Essay Profiling) State
  const [isGeneratingDeepProfile, setIsGeneratingDeepProfile] = useState(false);
  const [deepProfileResult, setDeepProfileResult] = useState<any>(activeValidatedProfile?.deepProfileResult || null);
  const [deepProfileProvider, setDeepProfileProvider] = useState<string>(activeValidatedProfile?.deepProfileProvider || '');
  const [showDeepProfile, setShowDeepProfile] = useState(true);

  // Helper to distinguish Technical Chemistry vs Employability submissions accurately
  const isSubmissionTechnical = (s: ExamSubmission): boolean => {
    // 1. Cek dari paket soal ujian
    const exam = exams.find(e => e.id === s.examId);
    const pkg = packages.find(p => p.id === exam?.packageId || (s.answers && Object.keys(s.answers).some(k => p.questions?.some(q => q.id === k))));

    if (pkg) {
      if (pkg.category === 'teknis_kimia' || pkg.id === 'pkg-full-24' || pkg.id === 'pkg-1') return true;
      if (pkg.category === 'employability' || pkg.id === 'pkg-employability-18') return false;
    }

    // 2. Cek dari ID pertanyaan (pertanyaan teknis diawali q- atau tk-)
    if (s.answers && Object.keys(s.answers).length > 0) {
      const keys = Object.keys(s.answers);
      if (keys.some(k => k.startsWith('q-') || k.startsWith('tk-'))) return true;
      if (keys.some(k => k.startsWith('nt-') || k.startsWith('emp-'))) return false;
    }

    // 3. Cek dari judul ujian
    const title = (s.examTitle || exam?.title || '').toLowerCase();
    if (title.includes('non-tes') || title.includes('employability')) return false;

    return true;
  };

  const isSubmissionEmployability = (s: ExamSubmission): boolean => {
    const exam = exams.find(e => e.id === s.examId);
    const pkg = packages.find(p => p.id === exam?.packageId || (s.answers && Object.keys(s.answers).some(k => p.questions?.some(q => q.id === k))));

    if (pkg) {
      if (pkg.category === 'employability' || pkg.id === 'pkg-employability-18') return true;
      if (pkg.category === 'teknis_kimia' || pkg.id === 'pkg-full-24' || pkg.id === 'pkg-1') return false;
    }

    if (s.answers && Object.keys(s.answers).length > 0) {
      const keys = Object.keys(s.answers);
      if (keys.some(k => k.startsWith('nt-') || k.startsWith('emp-'))) return true;
      if (keys.some(k => k.startsWith('q-') || k.startsWith('tk-'))) return false;
    }

    const title = (s.examTitle || exam?.title || '').toLowerCase();
    return title.includes('non-tes') || title.includes('employability');
  };

  // Filter tech and non-test submissions specifically for active student
  const studentSubmissions = (hasStudentsInClass && activeStudent)
    ? submissions.filter(
        s => s.studentId === activeStudent.id || (s.studentNis && s.studentNis === activeStudent.identityNo)
      )
    : [];
  const techSubmissions = studentSubmissions.filter(isSubmissionTechnical);
  const empSubmissions = studentSubmissions.filter(isSubmissionEmployability);
  const hasTechSubmissions = techSubmissions.length > 0;
  const hasEmpSubmissions = empSubmissions.length > 0;
  const hasAnySubmissions = hasTechSubmissions || hasEmpSubmissions;

  // Real scores based on test submissions only (0 if student has not taken the test yet)
  const studentTechScore = hasTechSubmissions
    ? Math.round(techSubmissions.reduce((acc, s) => acc + (s.technicalScore !== undefined ? s.technicalScore : (s.totalScore ?? 0)), 0) / techSubmissions.length)
    : 0;

  const studentEmpScore = hasEmpSubmissions
    ? Math.round(empSubmissions.reduce((acc, s) => acc + (s.employabilityScore !== undefined ? s.employabilityScore : (s.totalScore ?? 0)), 0) / empSubmissions.length)
    : 0;

  const getDefaultTeacherNotes = (student: User, techScore: number, empScore: number, hasTech: boolean, hasEmp: boolean): string => {
    if (!hasTech && !hasEmp) {
      return `Siswa ${student.name} belum mengikuti asesmen tes kemampuan teknis kimia maupun instrumen non-tes employability.`;
    }
    if (hasTech && techScore === 0) {
      return `Siswa ${student.name} telah menyelesaikan asesmen tes teknis kimia, namun butir soal belum diisi/dikerjakan (skor 0%). Disarankan untuk mengikuti sesi pembekalan remedial dan melengkapi jawaban.`;
    }
    if (hasTech && techScore >= 80) {
      return `Siswa ${student.name} telah menyelesaikan asesmen tes teknis kimia dengan capaian sangat baik (${techScore}%). Penguasaan konsep K3LH dan volumetri memenuhi kriteria industri DUDI.`;
    }
    if (hasTech && techScore < 80) {
      return `Siswa ${student.name} telah menyelesaikan asesmen tes teknis kimia dengan capaian ${techScore}%. Perlu pembekalan penguatan pada dimensi yang belum mencapai target minimal industri (80%).`;
    }
    return `Siswa ${student.name} telah menyelesaikan asesmen. Menunggu verifikasi lanjutan dari guru pembimbing.`;
  };

  // Teacher Validation State (Mandatory Manual Notes + Approval)
  const [teacherApprovalStatus, setTeacherApprovalStatus] = useState<'approved' | 'revised'>(
    (activeValidatedProfile?.teacherApprovalStatus as 'approved' | 'revised') || 'approved'
  );
  const [teacherNotesInput, setTeacherNotesInput] = useState<string>(
    activeValidatedProfile?.teacherNotes ||
      getDefaultTeacherNotes(activeStudent, studentTechScore, studentEmpScore, hasTechSubmissions, hasEmpSubmissions)
  );

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Compute dynamic scores from actual 24-questions submission if available
  const latestTechSub = techSubmissions[0];
  const dynamicTechScores = latestTechSub?.answers && Object.keys(latestTechSub.answers).some(k => k.startsWith('q-'))
    ? calculateAssessmentScore(latestTechSub.answers, REVISED_QUESTIONS_24).dimensionScores
    : null;

  // Compute dynamic scores from actual 18-questions employability non-test submission if available
  const latestEmpSub = empSubmissions[0];
  const dynamicEmpEvaluation = (latestEmpSub?.answers && Object.keys(latestEmpSub.answers).length > 0)
    ? calculateEmployabilityScore(latestEmpSub.answers, NON_TEST_QUESTIONS_18)
    : null;

  // 1. Radar Data: 6 Dimensi Kemampuan Teknis Kimia (Tes 24 Soal, Skor Maksimum 65)
  const technicalRadarData = [
    {
      skill: 'K3LH & Regulasi',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.k3lh.percentage : Math.min(100, Math.round(studentTechScore * 1.05))) : 0,
      Target: 85,
      fullName: 'Dimensi 1: K3LH dan Regulasi Lab (Maks 10 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.k3lh.raw}/10` : `${Math.round(studentTechScore * 0.10)}/10`) : '0/10'
    },
    {
      skill: 'Persiapan Analisis',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.persiapan_analisis.percentage : studentTechScore) : 0,
      Target: 80,
      fullName: 'Dimensi 2: Persiapan Analisis (Maks 10 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.persiapan_analisis.raw}/10` : `${Math.round(studentTechScore * 0.10)}/10`) : '0/10'
    },
    {
      skill: 'Stoikiometri',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.stoikiometri.percentage : Math.max(0, Math.round(studentTechScore * 0.95))) : 0,
      Target: 80,
      fullName: 'Dimensi 3: Stoikiometri Terapan (Maks 10 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.stoikiometri.raw}/10` : `${Math.round(studentTechScore * 0.10)}/10`) : '0/10'
    },
    {
      skill: 'Analisis Volumetri',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.volumetri.percentage : Math.min(100, Math.round(studentTechScore * 1.02))) : 0,
      Target: 85,
      fullName: 'Dimensi 4: Analisis Volumetri (Maks 13 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.volumetri.raw}/13` : `${Math.round(studentTechScore * 0.13)}/13`) : '0/13'
    },
    {
      skill: 'Instrumentasi',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.instrumentasi.percentage : Math.max(0, Math.round(studentTechScore * 0.96))) : 0,
      Target: 80,
      fullName: 'Dimensi 5: Instrumentasi Dasar (Maks 11 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.instrumentasi.raw}/11` : `${Math.round(studentTechScore * 0.11)}/11`) : '0/11'
    },
    {
      skill: 'Manajemen Mutu',
      Student: hasTechSubmissions ? (dynamicTechScores ? dynamicTechScores.manajemen_mutu.percentage : studentTechScore) : 0,
      Target: 85,
      fullName: 'Dimensi 6: Manajemen Mutu Laboratorium (Maks 11 Poin)',
      rawScore: hasTechSubmissions ? (dynamicTechScores ? `${dynamicTechScores.manajemen_mutu.raw}/11` : `${Math.round(studentTechScore * 0.11)}/11`) : '0/11'
    },
  ];

  // 2. Radar Data: 9 Aspek Employability Skills (Non-Tes 18 Butir, Skor 1–5, Maks 10 Poin per Aspek)
  const employabilityRadarData = EMPLOYABILITY_ASPECTS.map(asp => {
    const aspectResult = dynamicEmpEvaluation?.aspectResults.find(ar => ar.aspectId === asp.id);
    const scoreVal = hasEmpSubmissions
      ? (aspectResult ? aspectResult.percentage : studentEmpScore)
      : 0;
    const rawVal = hasEmpSubmissions
      ? (aspectResult ? `${aspectResult.rawScore}/10` : `${Math.round(studentEmpScore * 0.1)}/10`)
      : '0/10';

    return {
      skill: asp.name.replace('Keterampilan ', ''),
      fullName: asp.name,
      Student: scoreVal,
      Target: asp.industryTargetPercent,
      rawScore: rawVal,
      category: aspectResult?.category || 'Cukup',
      interpretation: aspectResult?.interpretation || ''
    };
  });

  // Combined Gap Table Rows
  const gapTableRows = [
    // Technical 6 Dimensions
    ...technicalRadarData.map((t, idx) => ({
      no: idx + 1,
      category: 'Teknis Kimia',
      name: `${t.fullName} (${t.rawScore})`,
      instrumentType: 'Tes (24 Soal)',
      studentScore: t.Student,
      targetScore: t.Target,
      gap: t.Student - t.Target
    })),
    // Employability 9 Aspects
    ...employabilityRadarData.map((e, idx) => ({
      no: idx + 7,
      category: 'Employability Skills',
      name: `${e.fullName} (${e.rawScore})`,
      instrumentType: 'Non-Tes (18 Butir)',
      studentScore: e.Student,
      targetScore: e.Target,
      gap: e.Student - e.Target
    }))
  ];

  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portTitle.trim() || !portIssuer.trim()) return;

    if (portCategory === 'laporan_praktikum' && practicumReports.length >= 3) {
      alert('Batas kuota maksimal 3 dokumen laporan praktikum telah tercapai untuk siswa ini.');
      return;
    }

    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      studentId: activeStudent.id,
      title: portTitle.trim(),
      category: portCategory,
      practicumTopic: portCategory === 'laporan_praktikum' ? (portTopic.trim() || 'Praktikum Kimia') : undefined,
      issuer: portIssuer.trim(),
      date: portDate,
      description: portDesc.trim(),
      aiScore: 8.5,
      aiRelevance: 'Tinggi',
      isVerified: true,
      isValidatedByTeacher: isTeacherOrAdmin,
      verifiedByTeacher: isTeacherOrAdmin ? currentUser.name : undefined,
      validatedAt: isTeacherOrAdmin ? new Date().toISOString() : undefined
    };

    if (passedOnAddPortfolio) {
      passedOnAddPortfolio(newItem);
    } else {
      setLocalPortfolios(prev => [newItem, ...prev]);
    }

    setShowPortModal(false);
    setPortTitle('');
    setPortTopic('');
    setPortIssuer('');
    setPortDesc('');
  };

  const handleDeletePortfolio = (id: string) => {
    if (previewPdfItem?.id === id) {
      setPreviewPdfItem(null);
    }
    if (passedOnDeletePortfolio) {
      passedOnDeletePortfolio(id);
    } else {
      setLocalPortfolios(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleToggleValidatePortfolio = (item: PortfolioItem) => {
    const isNowValidated = !item.isValidatedByTeacher;
    const updated: PortfolioItem = {
      ...item,
      isValidatedByTeacher: isNowValidated,
      verifiedByTeacher: isNowValidated ? `${currentUser.name} (${currentUser.role.toUpperCase()})` : undefined,
      validatedAt: isNowValidated ? new Date().toISOString() : undefined
    };
    if (previewPdfItem && previewPdfItem.id === item.id) {
      setPreviewPdfItem(updated);
    }
    if (passedOnUpdatePortfolio) {
      passedOnUpdatePortfolio(updated);
    } else {
      setLocalPortfolios(prev => prev.map(p => p.id === item.id ? updated : p));
    }
  };

  // 0. Perhitungan Berkas Portofolio (Sertifikat & Laporan Praktikum) & Akumulasi Job Fit Score
  const certificateList = portfolios.filter(p => p.category === 'sertifikat' || p.category === 'uji_kompetensi' || p.category === 'laporan_praktikum');
  const teacherValidatedList = certificateList.filter(p => p.isValidatedByTeacher === true);
  // Gunakan count berkas tervalidasi (atau fallback ke semua berkas jika guru belum memvalidasi)
  const validCertCount = isTeacherOrAdmin 
    ? Math.min(3, teacherValidatedList.length > 0 ? teacherValidatedList.length : certificateList.length)
    : Math.min(3, teacherValidatedList.length > 0 ? teacherValidatedList.length : certificateList.length);
  const certificateBonusPoints = validCertCount * 10;
  let rawTestAverage = 0;
  if (hasTechSubmissions && hasEmpSubmissions) {
    rawTestAverage = Math.round((studentTechScore + studentEmpScore) / 2);
  } else if (hasTechSubmissions) {
    rawTestAverage = studentTechScore;
  } else if (hasEmpSubmissions) {
    rawTestAverage = studentEmpScore;
  }
  const calculatedJobFitScore = hasAnySubmissions
    ? Math.min(100, rawTestAverage + certificateBonusPoints)
    : 0;

  // Generator AI Recommendation yang Dinamis dan 100% Selaras dengan Skor Riil
  const buildDynamicAiRecommendation = (
    student: User,
    techScore: number,
    empScore: number,
    techData: typeof technicalRadarData,
    certCount: number,
    certPoints: number,
    finalJobFit: number,
    jobTitle: string
  ) => {
    const isPassing = finalJobFit >= 80;
    const sortedTechDesc = [...techData].sort((a, b) => b.Student - a.Student);
    const sortedTechAsc = [...techData].sort((a, b) => a.Student - b.Student);

    const actualStrengths: string[] = [];
    if (sortedTechDesc[0] && sortedTechDesc[0].Student > 0) {
      actualStrengths.push(
        `Capaian terbaik pada ${sortedTechDesc[0].fullName} (${sortedTechDesc[0].Student}%).`
      );
    }
    if (sortedTechDesc[1] && sortedTechDesc[1].Student > 0) {
      actualStrengths.push(
        `Penguasaan dasar pada ${sortedTechDesc[1].fullName} (${sortedTechDesc[1].Student}%).`
      );
    }
    if (actualStrengths.length === 0) {
      actualStrengths.push(
        `Siswa memiliki motivasi awal dan memerlukan bimbingan terstruktur untuk seluruh 6 dimensi teknis kimia.`
      );
    }
    if (certCount > 0) {
      actualStrengths.push(
        `Memiliki ${certCount} berkas portofolio/sertifikat tervalidasi (+${certPoints} poin kesiapan kerja).`
      );
    }

    const actualGaps: string[] = [];
    const lowDims = sortedTechAsc.filter(t => t.Student < 80);
    if (lowDims.length > 0) {
      actualGaps.push(
        `Perlu peningkatan signifikan pada ${lowDims.slice(0, 3).map(d => `${d.skill} (${d.Student}%)`).join(', ')}.`
      );
    }
    if (empScore === 0) {
      actualGaps.push(`Belum menyelesaikan instrumen asesmen non-tes employability skills (skor 0%).`);
    } else if (empScore < 85) {
      actualGaps.push(`Aspek employability (${empScore}%) masih berada di bawah target DUDI (85%).`);
    }

    const summary = isPassing
      ? `Siswa ${student.name} memiliki tingkat keselarasan karir sebesar ${finalJobFit}% untuk posisi ${jobTitle}. Akumulasi capaian KTK (${techScore}%), Employability (${empScore}%), serta ${certCount} berkas portofolio (+${certPoints} poin) telah memenuhi standar kualifikasi industri DUDI.`
      : `Siswa ${student.name} memiliki tingkat keselarasan karir sebesar ${finalJobFit}% untuk posisi ${jobTitle}. Akumulasi capaian KTK (${techScore}%) dan Employability (${empScore}%) saat ini masih berada di bawah ambang batas minimal industri DUDI (80%). Diperlukan program remedial dan pembekalan terarah sebelum dinyatakan siap kerja.`;

    const remedialActions = [
      {
        title: lowDims[0] ? `Penguatan Modul Praktik ${lowDims[0].skill}` : 'Penguatan K3LH dan Prosedur Laboratorium',
        category: 'Teknis Kimia',
        detail: `Fokus latihan terbimbing pada ${lowDims[0]?.fullName || 'teknis dasar kimia'}.`,
        priority: 'tinggi' as const
      },
      {
        title: lowDims[1] ? `Remedial Teori & Perhitungan ${lowDims[1].skill}` : 'Latihan Analisis Kasus Deviasi Lab',
        category: 'Teknis Kimia',
        detail: `Penyelesaian latihan studi kasus dan pemecahan masalah ${lowDims[1]?.skill || 'analisis volumetri'}.`,
        priority: 'sedang' as const
      }
    ];

    return {
      jobFitPercentage: finalJobFit,
      certificatePoints: certPoints,
      certificateCount: certCount,
      summary,
      gapAnalysis: {
        strengths: actualStrengths,
        weaknesses: actualGaps
      },
      remedialActions,
      teacherAdvisorNotes: `Disarankan fokus mendampingi siswa pada penguatan dimensi dengan gap terbesar (${lowDims.slice(0, 2).map(d => d.skill).join(', ') || 'seluruh dimensi'}).`
    };
  };

  // Generator Deep Profile yang Dinamis dan 100% Selaras dengan Skor Riil
  const buildDynamicDeepProfile = (
    student: User,
    techScore: number,
    empScore: number,
    techData: typeof technicalRadarData,
    finalJobFit: number,
    jobTitle: string,
    teacherNotes: string
  ) => {
    const isPassing = finalJobFit >= 80;
    const sortedTechDesc = [...techData].sort((a, b) => b.Student - a.Student);
    const sortedTechAsc = [...techData].sort((a, b) => a.Student - b.Student);

    const strongConcepts: string[] = [];
    sortedTechDesc.filter(t => t.Student >= 25).forEach(t => {
      strongConcepts.push(`Pemahaman dasar ${t.skill} (${t.Student}%)`);
    });
    if (strongConcepts.length === 0) {
      strongConcepts.push('Pengenalan dasar prosedur keselamatan lab sekolah');
    }

    const unmasteredTopics = sortedTechAsc
      .filter(t => t.Student < 70)
      .slice(0, 3)
      .map(t => `${t.fullName} (${t.Student}%)`);

    const summary = isPassing
      ? `${student.name} menunjukkan profil kompetensi yang solid dengan keselarasan kerja ${finalJobFit}% untuk target ${jobTitle}. Pola penalaran teknis dan pemahaman prosedur laboratorium telah selaras dengan standar industri DUDI.`
      : `${student.name} memiliki tingkat keselarasan kerja sebesar ${finalJobFit}% (KTK: ${techScore}%, Employability: ${empScore}%). Hasil pemetaan menunjukkan pemahaman awal pada ${sortedTechDesc[0]?.skill || 'K3LH'} (${sortedTechDesc[0]?.Student || 0}%), namun membutuhkan pembekalan intensif terutama pada ${sortedTechAsc.slice(0, 2).map(d => d.skill).join(' dan ')}.`;

    return {
      profilRingkasan: summary,
      jobFitPercentage: finalJobFit,
      kualitasBerpikir: {
        skor: Math.max(10, Math.min(100, Math.round(techScore * 0.9 + 10))),
        kategori: techScore >= 80 ? 'Sangat Baik' : techScore >= 50 ? 'Baik' : 'Perlu Ditingkatkan',
        deskripsi: techScore >= 80 ? 'Siswa mampu menyusun argumen ilmiah secara sistematis.' : 'Penalaran ilmiah dan analisis hasil uji memerlukan bimbingan lebih lanjut.'
      },
      kualitasKomunikasi: {
        skor: Math.max(10, Math.min(100, Math.round((techScore + empScore) / 2 * 0.8 + 15))),
        kategori: (techScore + empScore) / 2 >= 80 ? 'Baik' : 'Perlu Ditingkatkan',
        deskripsi: 'Penggunaan istilah teknis kimia dan pelaporan hasil uji masih perlu pembiasaan.'
      },
      profilKepribadianKerja: {
        tipe: techScore >= 80 ? 'Praktisi Prosedural Teruji' : 'Pembelajar Awal Laboratorium',
        deskripsi: techScore >= 80 ? 'Cenderung mengikuti SOP dengan teliti dan konsisten.' : 'Sedang dalam tahap adaptasi SOP laboratorium dan membutuhkan supervisi aktif.',
        kesesuaianIndustri: techScore >= 80 ? 'Sangat sesuai untuk posisi analis laboratorium rutin.' : 'Perlu pemantapan kompetensi dasar sebelum siap kerja.'
      },
      polaPenguasaan: {
        konsepKuat: strongConcepts,
        miskonsepsiTeridentifikasi: sortedTechAsc.filter(t => t.Student === 0).length > 0
          ? ['Konsep dan prosedur perhitungan kimia analitik belum diaplikasikan dengan tepat']
          : ['Beberapa rincian langkah kerja belum konsisten'],
        topikBelumDikuasai: unmasteredTopics.length > 0 ? unmasteredTopics : ['Instrumentasi analisis lanjutan']
      },
      gapAnalysis: {
        strengths: strongConcepts,
        weaknesses: unmasteredTopics
      },
      remedialActions: [
        {
          judul: `Modul Remedial ${sortedTechAsc[0]?.skill || 'Teknis Kimia'}`,
          kategori: 'Remedial Konsep',
          detail: `Pendalaman materi dan studi kasus deviasi laboratorium untuk ${sortedTechAsc[0]?.skill || 'analisis volumetri'}.`,
          estimasiWaktu: '2 minggu',
          prioritas: 'tinggi' as const
        }
      ],
      catatanGuruPembimbing: teacherNotes,
      totalEsaiDianalisis: techSubmissions.length > 0 ? 1 : 0
    };
  };

  // Helper: Sanitasi Deep Profile agar 100% konsisten dengan data riil & tidak ada kontradiksi
  const sanitizeDeepProfile = (
    rawProfile: any,
    jobFitScore: number,
    radarData: typeof technicalRadarData
  ) => {
    if (!rawProfile) return rawProfile;
    const copy = { ...rawProfile };
    copy.jobFitPercentage = jobFitScore;

    const isVolumetriLow = (radarData.find(d => d.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0;
    const lowDims = radarData.filter(d => d.Student < 25);

    // 1. Sanitasi Konsep Kuat (Hapus titrasi/volumetri jika skor 0%)
    if (copy.polaPenguasaan?.konsepKuat && Array.isArray(copy.polaPenguasaan.konsepKuat)) {
      let kuat = copy.polaPenguasaan.konsepKuat.filter((k: string) => {
        const kl = k.toLowerCase();
        if (isVolumetriLow && (kl.includes('titrasi') || kl.includes('volumetri'))) return false;
        return true;
      });
      if (kuat.length === 0) {
        kuat = ['Pengenalan awal prosedur keselamatan laboratorium (K3LH)'];
      }
      copy.polaPenguasaan = {
        ...copy.polaPenguasaan,
        konsepKuat: kuat
      };
    }

    // 2. Pastikan Topik Belum Dikuasai mencakup dimensi dengan skor 0%
    if (!copy.polaPenguasaan) copy.polaPenguasaan = {};
    let belum = Array.isArray(copy.polaPenguasaan.topikBelumDikuasai) ? [...copy.polaPenguasaan.topikBelumDikuasai] : [];
    if (isVolumetriLow && !belum.some(b => b.toLowerCase().includes('volumetri') || b.toLowerCase().includes('titrasi'))) {
      belum.unshift('Analisis Volumetri & Titrimetri (0%)');
    }
    lowDims.forEach(ld => {
      if (!belum.some(b => b.toLowerCase().includes(ld.skill.toLowerCase()))) {
        belum.push(`${ld.skill} (${ld.Student}%)`);
      }
    });
    copy.polaPenguasaan.topikBelumDikuasai = belum;

    // 3. Sanitasi Skor Kualitas Berpikir & Komunikasi jika jobFitScore rendah
    if (jobFitScore < 80) {
      if (copy.kualitasBerpikir) {
        copy.kualitasBerpikir = {
          skor: Math.max(10, Math.min(50, Math.round(jobFitScore * 0.9 + 15))),
          kategori: jobFitScore >= 50 ? 'Cukup' : 'Perlu Ditingkatkan',
          deskripsi: 'Penalaran ilmiah dan kemampuan analisis hasil uji masih membutuhkan bimbingan intensif dan remedial konsep.'
        };
      }
      if (copy.kualitasKomunikasi) {
        copy.kualitasKomunikasi = {
          skor: Math.max(10, Math.min(50, Math.round(jobFitScore * 0.8 + 15))),
          kategori: 'Perlu Ditingkatkan',
          deskripsi: 'Pelaporan hasil uji laboratorium dan pemahaman terminologi teknis kimia masih dalam tahap pembiasaan.'
        };
      }
      if (copy.profilKepribadianKerja) {
        copy.profilKepribadianKerja = {
          tipe: 'Pembelajar Awal Laboratorium',
          deskripsi: 'Siswa berada pada tahap adaptasi awal prosedur laboratorium dan membutuhkan bimbingan instruktur secara berkala.',
          kesesuaianIndustri: 'Memerlukan pembekalan kompetensi dasar dan remedial teknis sebelum siap kerja mandiri.'
        };
      }

      const ringkasanLow = (copy.profilRingkasan || '').toLowerCase();
      if (ringkasanLow.includes('volumetri') || ringkasanLow.includes('titrasi') || ringkasanLow.includes('melampaui')) {
        copy.profilRingkasan = `Siswa ${activeStudent.name} memiliki tingkat keselarasan karir sebesar ${jobFitScore}%. Pola penalaran menunjukkan pemahaman awal pada aspek dasar K3LH, namun membutuhkan program remedial intensif dan pembekalan terstruktur pada dimensi-dimensi teknis utama seperti Volumetri dan Stoikiometri.`;
      }
    }

    return copy;
  };

  // Sync state when active student changes & sanitize stale mock data
  useEffect(() => {
    const prof = validatedProfiles[activeStudent.id];
    let currentAi = prof?.aiResult || null;
    let currentDeep = prof?.deepProfileResult || null;

    const isVolumetriZero = (technicalRadarData.find(t => t.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0;

    // Deteksi apakah data yang tersimpan merupakan data mock usang/kontradiktif
    const isAiStale = currentAi && (
      currentAi.jobFitPercentage !== calculatedJobFitScore ||
      currentAi.summary?.includes('88%') ||
      currentAi.summary?.includes('Volumetri (90%)') ||
      (calculatedJobFitScore < 80 && (
        currentAi.summary?.includes('melampaui') ||
        (isVolumetriZero && currentAi.summary?.toLowerCase().includes('volumetri')) ||
        (isVolumetriZero && currentAi.gapAnalysis?.strengths?.some((s: string) => s.toLowerCase().includes('titrasi') || s.toLowerCase().includes('volumetri')))
      ))
    );

    const isDeepStale = currentDeep && (
      currentDeep.jobFitPercentage !== calculatedJobFitScore ||
      (isVolumetriZero && currentDeep.polaPenguasaan?.konsepKuat?.some((k: string) => k.toLowerCase().includes('titrasi') || k.toLowerCase().includes('volumetri'))) ||
      (calculatedJobFitScore < 80 && (
        currentDeep.profilRingkasan?.includes('melampaui') ||
        (isVolumetriZero && currentDeep.profilRingkasan?.toLowerCase().includes('volumetri')) ||
        (currentDeep.kualitasBerpikir?.skor || 0) > 60
      ))
    );

    if (isAiStale) {
      currentAi = buildDynamicAiRecommendation(
        activeStudent,
        studentTechScore,
        studentEmpScore,
        technicalRadarData,
        validCertCount,
        certificateBonusPoints,
        calculatedJobFitScore,
        selectedJob.title
      );
    }

    if (isDeepStale && currentDeep) {
      currentDeep = sanitizeDeepProfile(currentDeep, calculatedJobFitScore, technicalRadarData);
    }

    // Persist auto-corrected data to localStorage
    if ((isAiStale || isDeepStale) && prof && onSaveValidatedProfile) {
      onSaveValidatedProfile({
        ...prof,
        aiResult: currentAi,
        deepProfileResult: currentDeep
      });
    }

    setAiResult(currentAi);
    setDeepProfileResult(currentDeep);
    setTeacherNotesInput(
      prof?.teacherNotes ||
      getDefaultTeacherNotes(activeStudent, studentTechScore, studentEmpScore, hasTechSubmissions, hasEmpSubmissions)
    );
    setTeacherApprovalStatus((prof?.teacherApprovalStatus as 'approved' | 'revised') || 'approved');
  }, [
    selectedStudentId,
    activeStudent.id,
    activeStudent.name,
    hasAnySubmissions,
    hasTechSubmissions,
    hasEmpSubmissions,
    studentTechScore,
    studentEmpScore,
    calculatedJobFitScore,
    selectedJob.title,
    validCertCount,
    certificateBonusPoints
  ]);

  const handleGenerateAIRecommendation = async () => {
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/ai/analyze-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetJobTitle: selectedJob.title,
          studentName: activeStudent.name,
          technicalScores: technicalRadarData.reduce((acc: any, item) => {
            acc[item.fullName] = item.Student;
            return acc;
          }, {}),
          employabilityScores: employabilityRadarData.reduce((acc: any, item) => {
            acc[item.fullName] = item.Student;
            return acc;
          }, {}),
          portfolios,
          hasTechSubmissions,
          hasEmpSubmissions,
          calculatedJobFitScore
        })
      });

      const data = await res.json();
      if (data.success && data.recommendation) {
        setAiResult({
          ...data.recommendation,
          jobFitPercentage: calculatedJobFitScore,
          certificatePoints: certificateBonusPoints,
          certificateCount: validCertCount
        });
        setAiProvider(data.provider || 'DeepSeek AI');
      } else {
        throw new Error('Gagal dari server AI');
      }
    } catch (err) {
      console.warn('AI recommendation API failed, using fallback:', err);
      // Fallback AI recommendation using dynamic score-accurate data
      const dynamicRec = buildDynamicAiRecommendation(
        activeStudent,
        studentTechScore,
        studentEmpScore,
        technicalRadarData,
        validCertCount,
        certificateBonusPoints,
        calculatedJobFitScore,
        selectedJob.title
      );
      setAiResult(dynamicRec);
      setAiProvider('DeepSeek AI (Offline Mode)');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handler: Generate Profil Akumulatif dari Semua Jawaban Esai
  const handleGenerateDeepProfile = async () => {
    setIsGeneratingDeepProfile(true);
    setShowDeepProfile(true);
    try {
      // Kumpulkan semua jawaban uraian dari semua submissions
      const allEssayAnswers: any[] = [];

      submissions.forEach(sub => {
        if (!sub.answers) return;
        Object.entries(sub.answers).forEach(([qId, ans]: [string, any]) => {
          const hasEssay = ans.essayAnswer || ans.shortAnswerText || ans.subQuestionAnswers;
          if (!hasEssay) return;

          // Cari soal dari packages jika tersedia
          let questionText = `Soal ID: ${qId}`;
          let answerKey = '';
          let rubricGuide = '';
          let questionType = 'esai';

          if (packages.length > 0) {
            for (const pkg of packages) {
              const q = pkg.questions?.find((q: any) => q.id === qId);
              if (q) {
                questionText = q.questionText || questionText;
                answerKey = q.sampleAnswer || q.answerKey || q.shortAnswerKey || '';
                rubricGuide = q.rubricGuide || '';
                questionType = q.type || 'esai';
                break;
              }
            }
          }

          const studentAnswer = ans.essayAnswer || ans.shortAnswerText ||
            (ans.subQuestionAnswers ? Object.values(ans.subQuestionAnswers).join(' | ') : '');

          if (studentAnswer) {
            allEssayAnswers.push({
              examTitle: sub.examTitle,
              questionText,
              answerKey,
              rubricGuide,
              studentAnswer,
              questionType,
            });
          }
        });
      });

      if (allEssayAnswers.length === 0) {
        const dynamicProf = buildDynamicDeepProfile(
          activeStudent,
          studentTechScore,
          studentEmpScore,
          technicalRadarData,
          calculatedJobFitScore,
          selectedJob.title,
          teacherNotesInput.trim()
        );
        setDeepProfileResult(dynamicProf);
        setDeepProfileProvider('Terstandarisasi DUDI');
        setIsGeneratingDeepProfile(false);
        return;
      }

      const res = await fetch('/api/ai/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeStudent.name,
          studentNis: activeStudent.identityNo,
          className: activeStudent.className,
          targetJobTitle: selectedJob.title,
          allEssayAnswers,
          technicalScores: technicalRadarData.reduce((acc: any, item) => {
            acc[item.fullName] = item.Student;
            return acc;
          }, {}),
          employabilityScores: employabilityRadarData.reduce((acc: any, item) => {
            acc[item.fullName] = item.Student;
            return acc;
          }, {}),
          portfolios,
          calculatedJobFitScore
        }),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        const sanitized = sanitizeDeepProfile(data.profile, calculatedJobFitScore, technicalRadarData);
        setDeepProfileResult(sanitized);
        setDeepProfileProvider(data.provider || 'ai');
      } else {
        throw new Error(data.error || 'Gagal dari server AI');
      }
    } catch (err: any) {
      console.warn('Deep profile API failed:', err);
      const dynamicProf = buildDynamicDeepProfile(
        activeStudent,
        studentTechScore,
        studentEmpScore,
        technicalRadarData,
        calculatedJobFitScore,
        selectedJob.title,
        teacherNotesInput.trim()
      );
      setDeepProfileResult(dynamicProf);
      setDeepProfileProvider('fallback');
    } finally {
      setIsGeneratingDeepProfile(false);
    }
  };

  const handleSaveTeacherValidation = () => {
    if (!onSaveValidatedProfile) return;
    if (!teacherNotesInput.trim()) {
      alert('Wajib memasukkan Catatan untuk Guru Pembimbing / Siswa!');
      return;
    }

    const finalAi = aiResult || buildDynamicAiRecommendation(
      activeStudent,
      studentTechScore,
      studentEmpScore,
      technicalRadarData,
      validCertCount,
      certificateBonusPoints,
      calculatedJobFitScore,
      selectedJob.title
    );
    finalAi.jobFitPercentage = calculatedJobFitScore;

    const finalDeep = sanitizeDeepProfile(
      deepProfileResult || buildDynamicDeepProfile(
        activeStudent,
        studentTechScore,
        studentEmpScore,
        technicalRadarData,
        calculatedJobFitScore,
        selectedJob.title,
        teacherNotesInput.trim()
      ),
      calculatedJobFitScore,
      technicalRadarData
    );

    const newProfileData: StudentReadinessProfileData = {
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      studentNis: activeStudent.identityNo,
      targetJobId: selectedJob.id,
      targetJobTitle: selectedJob.title,
      aiResult: finalAi,
      deepProfileResult: finalDeep,
      aiProvider: aiProvider || 'DeepSeek AI',
      deepProfileProvider: deepProfileProvider || 'DeepSeek AI',
      isTeacherValidated: true,
      teacherApprovalStatus,
      teacherNotes: teacherNotesInput.trim(),
      validatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      validatedAt: new Date().toLocaleString('id-ID')
    };

    onSaveValidatedProfile(newProfileData);
    alert(`✅ Profil Kesiapan Kerja ${activeStudent.name} berhasil divalidasi & dipublikasikan ke dashboard siswa!`);
  };

  // If Siswa views their profile and it has NOT been validated by Teacher yet:
  if (!isTeacherOrAdmin && !isCurrentProfileValidated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Profil Kesiapan Kerja Siswa
            </h2>
            <p className="text-xs text-slate-400">
              Pemetaan komprehensif 6 Dimensi Kemampuan Teknis Kimia + 9 Aspek Employability Skills.
            </p>
          </div>
        </div>

        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Profil Kesiapan Kerja Belum Divalidasi oleh Guru</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Hasil pemetaan kompetensi dan profil kesiapan kerja Anda sedang dalam antrean pemeriksaan dan validasi oleh Guru Pembimbing / Evaluator. 
            Profil kesiapan kerja, rekomendasi pembinaan, dan analisis gap akan otomatis muncul di halaman ini setelah disetujui dan diverifikasi secara resmi oleh Guru Pembimbing.
          </p>
          <div className="pt-2 text-xs font-semibold text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-800/40">
            Status: ⏳ Menunggu Pemeriksaan & Validasi Guru Pembimbing
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Profil Kesiapan Kerja {isTeacherOrAdmin ? `- Siswa: ${activeStudent.name}` : ''}
          </h2>
          <p className="text-xs text-slate-400">
            Pemetaan komprehensif 6 Dimensi Kemampuan Teknis Kimia + 9 Aspek Employability Skills terhadap Target Industri DUDI.
          </p>
        </div>

        <button
          onClick={() => setShowPrintModal(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Cetak / Export Rapor Kesiapan Kerja</span>
        </button>
      </div>

      {/* For Guru / Admin: 3 Cascaded Dropdowns (Sekolah -> Kelas -> Siswa) */}
      {isTeacherOrAdmin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* 3 Dropdowns Side-by-Side in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1">
              {/* Dropdown 1: Pilih Sekolah */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {isGuru ? 'Sekolah Tugas Mengajar:' : 'Pilih Sekolah:'}
                </label>
                {isGuru ? (
                  <div className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-xs flex items-center justify-between">
                    <span className="truncate">{guruSchool?.name || currentUser.schoolName || 'SMK Terdaftar'}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-medium shrink-0">
                      <Lock className="w-2.5 h-2.5 text-blue-400" /> Terkunci (Guru)
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {schoolsList.map(sch => (
                      <option key={sch.id} value={sch.id}>{sch.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dropdown 2: Pilih Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                  {isGuru ? 'Kelas Pengampu Guru:' : 'Pilih Kelas:'}
                </label>
                {isGuru && filteredClasses.length === 1 ? (
                  <div className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-xs flex items-center justify-between">
                    <span className="truncate">{filteredClasses[0].name}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-medium shrink-0">
                      <Lock className="w-2.5 h-2.5 text-purple-400" /> Kelas Binaan
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {filteredClasses.length === 0 ? (
                      <option value="">Tidak ada rombel kelas pengampu</option>
                    ) : (
                      filteredClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {isGuru ? '(Kelas Binaan)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Dropdown 3: Pilih Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User2 className="w-3.5 h-3.5 text-amber-400" />
                  Pilih Siswa:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {filteredStudents.length === 0 ? (
                    <option value="">Tidak ada siswa di kelas/sekolah ini</option>
                  ) : (
                    filteredStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (NIS: {s.identityNo || s.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Validation Status Badge */}
            <div className="shrink-0 flex items-center lg:flex-col lg:items-end justify-between gap-1 text-xs pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-800 lg:pl-4">
              <span className="text-slate-400 text-[11px]">Status Validasi Guru:</span>
              {isCurrentProfileValidated ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tervalidasi ({activeValidatedProfile?.validatedBy})
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Belum Divalidasi Guru
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* If No Students in Selected Class/School for Teacher/Admin */}
      {isTeacherOrAdmin && !hasStudentsInClass ? (
        <div className="text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Belum Ada Siswa Terdaftar di Kelas Ini</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">
            Halaman ini adalah <strong>Profil Kesiapan Kerja Siswa</strong> (sistem ini BUKAN menilai Guru). Guru bertindak sebagai penguji, evaluator, dan pembimbing yang akan memvalidasi kesiapan kerja siswa setelah siswa menyelesaikan ujian.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs text-left space-y-2">
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" /> Panduan Langkah Selanjutnya untuk Guru:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1 text-[11px] leading-relaxed">
              <li>Buka menu <span className="text-emerald-400 font-semibold">Kelola Kelas Saya</span> untuk mendaftarkan akun siswa baru ke kelas binaan Anda.</li>
              <li>Atur jadwal pelaksanaan ujian di menu <span className="text-blue-400 font-semibold">Jadwal & Kelola Ujian</span>.</li>
              <li>Minta siswa login dan mengerjakan asesmen tes teknis (KTK) & non-tes employability.</li>
              <li>Setelah siswa selesai mengumpulkan, buka kembali menu ini untuk memeriksa grafik radar kompetensi dan memberikan validasi guru.</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Alert if student exists but has not taken exams yet */}
          {isTeacherOrAdmin && !hasAnySubmissions && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block">Siswa Belum Mengerjakan Ujian Asesmen</span>
                <span className="text-[11px] text-slate-400">
                  {activeStudent.name} belum menyelesaikan ujian Tes Kemampuan Teknis (KTK) maupun Non-Tes Employability. Capaian radar dan Job Fit Score saat ini 0% menunggu hasil ujian siswa.
                </span>
              </div>
            </div>
          )}

          {/* Teacher Validation Panel (Guru & Admin Only) */}
          {isTeacherOrAdmin && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    Panel Validasi Guru — Profil Siswa: {activeStudent.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Guru harus memicu AI / memilih status persetujuan dan menuliskan catatan manual sebelum mempublikasikan profil ke dashboard siswa.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs font-semibold">
                <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                  teacherApprovalStatus === 'approved' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="approved"
                    checked={teacherApprovalStatus === 'approved'}
                    onChange={() => setTeacherApprovalStatus('approved')}
                    className="accent-emerald-500"
                  />
                  <span>Setuju 100% Dengan Analisis & Profil AI</span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                  teacherApprovalStatus === 'revised' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="revised"
                    checked={teacherApprovalStatus === 'revised'}
                    onChange={() => setTeacherApprovalStatus('revised')}
                    className="accent-amber-500"
                  />
                  <span>Disetujui Dengan Catatan / Revisi Manual Guru</span>
                </label>
              </div>

              {/* Manual Teacher Notes Text Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MessageSquareText className="w-4 h-4 text-amber-400" />
                  Catatan untuk Guru Pembimbing / Catatan Pembekalan Siswa (Wajib diisi/dikonfirmasi Guru):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan catatan pembimbingan, rekomendasi tindak lanjut, atau saran khusus untuk siswa..."
                  value={teacherNotesInput}
                  onChange={(e) => setTeacherNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Validation & Publish Button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveTeacherValidation}
                  disabled={!hasAnySubmissions}
                  className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                    hasAnySubmissions
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{hasAnySubmissions ? 'Validasi & Publikasikan Ke Dashboard Siswa' : 'Menunggu Siswa Mengerjakan Ujian (Belum Ada Nilai)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Target Job Selector & Overall Readiness Summary Cards */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <div className="w-full md:w-auto flex-1 max-w-lg">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  Pilih Target Posisi Pekerjaan Industri (DUDI):
                </label>
                <select
                  value={selectedJob.id}
                  onChange={(e) => {
                    const job = TARGET_JOBS.find(j => j.id === e.target.value);
                    if (job) setSelectedJob(job);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                >
                  {TARGET_JOBS.map(j => (
                    <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[120px]">
                  <div className="text-2xl font-black text-amber-400">
                    {hasAnySubmissions ? calculatedJobFitScore + '%' : '0%'}
                  </div>
                  <div className="text-[10px] text-slate-300 font-bold">
                    {hasAnySubmissions ? 'Job Fit Score' : 'Belum Ada Ujian'}
                  </div>
                </div>

                {/* AI Trigger Button — Rendered for Guru & Admin */}
                {isTeacherOrAdmin && (
                  <button
                    onClick={handleGenerateAIRecommendation}
                    disabled={isGeneratingAi || !hasAnySubmissions}
                    className={`px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                      hasAnySubmissions
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>{isGeneratingAi ? 'Menganalisis Akumulasi...' : '✨ Analisis Cepat AI (KTK + Employability + Sertifikat)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Tes Kemampuan Teknis (KTK)</div>
                <div className="text-lg font-black text-emerald-400">
                  {hasTechSubmissions ? `${studentTechScore}%` : '0%'} <span className="text-xs font-semibold text-slate-400">{hasTechSubmissions ? '(6 Dimensi - Telah Ujian)' : '(Belum Ujian)'}</span>
                </div>
                <div className="text-[10px] text-slate-400">Target Industri: Min. 80%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Non-Tes Employability</div>
                <div className="text-lg font-black text-purple-400">
                  {hasEmpSubmissions ? `${studentEmpScore}%` : '0%'} <span className="text-xs font-semibold text-slate-400">{hasEmpSubmissions ? '(9 Aspek - Telah Diisi)' : '(Belum Asesmen Non-Tes)'}</span>
                </div>
                <div className="text-[10px] text-slate-400">Target Industri: Min. 85%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Sertifikat Pendukung</div>
                <div className="text-lg font-black text-blue-400">{validCertCount}/3 <span className="text-xs font-semibold text-blue-300">(+{certificateBonusPoints} Poin)</span></div>
                <div className="text-[10px] text-slate-400">+10 Poin / Sertifikat (Maks +30)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Job Fit Score (Akumulasi)</div>
                <div className="text-lg font-black text-amber-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> {hasAnySubmissions ? calculatedJobFitScore + '%' : '0%'}
                </div>
                <div className={`text-[10px] font-bold ${hasAnySubmissions ? (calculatedJobFitScore >= 80 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-500'}`}>
                  Status: {hasAnySubmissions ? (calculatedJobFitScore >= 80 ? 'SIAP KERJA (SKKNI)' : 'BELUM SIAP') : 'MENUNGGU UJIAN'}
                </div>
              </div>
            </div>

            {hasTechSubmissions && !hasEmpSubmissions && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2 mt-3">
                <Info className="w-4 h-4 shrink-0 text-blue-400" />
                <span>
                  Informasi Status Asesmen: Siswa telah menyelesaikan <strong>Tes Kemampuan Teknis (KTK)</strong> (Skor: {studentTechScore}%), namun <strong>belum mengisi Asesmen Non-Tes Employability</strong> (18 butir situasional). Skor employability saat ini 0%.
                </span>
              </div>
            )}
          </div>

      {/* DUAL RADAR CHARTS SECTION */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar Chart 1: 6 Dimensi Kemampuan Teknis Kimia */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  INSTRUMEN TES (24 SOAL)
                </span>
                <h3 className="text-sm font-bold text-white">Grafik Radar 1: 6 Dimensi Teknis Kimia</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pencapaian Siswa (Hijau) vs Target Industri DUDI (Oranye)</p>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={technicalRadarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="skill" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                <Radar name="Skor Siswa (%)" dataKey="Student" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Radar name="Target DUDI (%)" dataKey="Target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex justify-between items-center">
            <span>Rata-Rata Kemampuan Teknis: <strong className="text-emerald-400">{hasTechSubmissions ? `${studentTechScore}%` : '0% (Belum Ujian)'}</strong></span>
            <span className="text-amber-400 font-semibold">Min Target Industri: 80%</span>
          </div>
          {!hasTechSubmissions ? (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 text-center font-medium">
              ⚠️ Siswa belum mengikuti tes kemampuan teknis. Nilai saat ini 0%. Garis oranye adalah standar target industri DUDI.
            </div>
          ) : studentTechScore === 0 ? (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 text-center font-medium">
              ⚠️ Siswa telah menyelesaikan ujian teknis kimia, namun seluruh butir soal belum diisi/dikerjakan (skor 0%). Garis oranye adalah standar target industri DUDI.
            </div>
          ) : null}
        </div>

        {/* Radar Chart 2: 9 Aspek Employability Skills (Non-Tes) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  INSTRUMEN NON-TES (18 BUTIR)
                </span>
                <h3 className="text-sm font-bold text-white">Grafik Radar 2: 9 Aspek Employability Skills</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pencapaian Siswa (Ungu) vs Target Industri DUDI (Oranye)</p>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={employabilityRadarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="skill" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                <Radar name="Skor Siswa (%)" dataKey="Student" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
                <Radar name="Target DUDI (%)" dataKey="Target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex flex-wrap gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <span>Capaian Employability Non-Tes: <strong className="text-purple-400">{hasEmpSubmissions ? `${dynamicEmpEvaluation?.totalRawScore || Math.round(studentEmpScore * 0.9)}/90 (${studentEmpScore}%)` : '0/90 (Belum Asesmen)'}</strong></span>
              {dynamicEmpEvaluation && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Kategori: {dynamicEmpEvaluation.category}
                </span>
              )}
            </div>
            <span className="text-amber-400 font-semibold">Min Target Industri: 85%</span>
          </div>
          {!hasEmpSubmissions && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 text-center font-medium">
              ⚠️ Siswa belum mengisi asesmen non-tes employability (18 butir situasional). Nilai saat ini 0%. Garis oranye adalah standar target industri DUDI.
            </div>
          )}
        </div>
      </div>

      {/* COMPREHENSIVE INDUSTRY GAP ANALYSIS TABLE */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Tabel Analisis Gap Kompetensi (Tes + Non-Tes vs Target Industri)
            </h3>
            <p className="text-xs text-slate-400">Rincian komparasi skor capaian siswa dengan standar kualifikasi lapangan DUDI.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">No</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Nama Dimensi / Aspek Kompetensi</th>
                <th className="p-3">Bentuk Instrumen</th>
                <th className="p-3 text-center">Skor Siswa (%)</th>
                <th className="p-3 text-center">Target Industri (%)</th>
                <th className="p-3 text-center">Gap Delta</th>
                <th className="p-3 text-center">Status Kesiapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gapTableRows.map((row) => {
                const isSurplus = row.gap > 0;
                const isEqual = row.gap === 0;

                return (
                  <tr key={row.no} className="hover:bg-slate-950/50 transition-colors">
                    <td className="p-3 text-slate-400 font-mono">{row.no}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.category === 'Teknis Kimia'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white">{row.name}</td>
                    <td className="p-3 text-slate-400">{row.instrumentType}</td>
                    <td className="p-3 text-center font-bold text-white">{row.studentScore}%</td>
                    <td className="p-3 text-center font-semibold text-amber-400">{row.targetScore}%</td>
                    <td className="p-3 text-center font-bold font-mono">
                      <span className={isSurplus ? 'text-emerald-400' : isEqual ? 'text-blue-400' : 'text-rose-400'}>
                        {isSurplus ? `+${row.gap}%` : `${row.gap}%`}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isSurplus && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          Sangat Baik (+{row.gap}%)
                        </span>
                      )}
                      {isEqual && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                          Memenuhi Target
                        </span>
                      )}
                      {!isSurplus && !isEqual && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                          Gap ({row.gap}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEEP PROFILE PANEL (Akumulasi Esai) */}
      {deepProfileResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-sky-500/30 space-y-5 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                <BrainCircuit className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Profil Kompetensi Mendalam — Analisis Akumulatif</h3>
                <p className="text-[11px] text-slate-400">Berdasarkan {deepProfileResult.totalEsaiDianalisis || 0} jawaban uraian dari seluruh riwayat ujian</p>
              </div>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                deepProfileProvider === 'deepseek'
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                  : deepProfileProvider === 'gemini'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}>
                {isTeacherOrAdmin
                  ? (deepProfileProvider === 'deepseek' ? '🤖 DeepSeek Engine' : deepProfileProvider === 'gemini' ? '✨ Gemini Engine' : 'Terstandarisasi DUDI')
                  : 'Terstandarisasi DUDI'}
              </span>
            </div>
            <button
              onClick={() => setShowDeepProfile(!showDeepProfile)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              {showDeepProfile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showDeepProfile && (
            <div className="space-y-4">
              {/* Profil Ringkasan */}
              <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-sky-300">Profil Holistik: </span>
                {calculatedJobFitScore < 80 && (deepProfileResult.profilRingkasan?.toLowerCase().includes('volumetri') || deepProfileResult.profilRingkasan?.includes('melampaui'))
                  ? `Siswa ${activeStudent.name} memiliki tingkat keselarasan karir sebesar ${calculatedJobFitScore}%. Pola penalaran menunjukkan pemahaman awal pada aspek dasar K3LH, namun membutuhkan program remedial intensif dan pembekalan terstruktur pada dimensi-dimensi teknis utama seperti Volumetri dan Stoikiometri.`
                  : deepProfileResult.profilRingkasan}
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-sky-400">{calculatedJobFitScore}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Job Fit Score</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-violet-400">
                    {calculatedJobFitScore < 80 && (deepProfileResult.kualitasBerpikir?.skor || 0) > 60
                      ? Math.max(10, Math.min(50, Math.round(calculatedJobFitScore * 0.9 + 15)))
                      : deepProfileResult.kualitasBerpikir?.skor}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Kualitas Berpikir</div>
                  <div className="text-[10px] text-violet-300 font-semibold">
                    {calculatedJobFitScore < 80
                      ? (calculatedJobFitScore >= 50 ? 'Cukup' : 'Perlu Ditingkatkan')
                      : deepProfileResult.kualitasBerpikir?.kategori}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-teal-400">
                    {studentEmpScore === 0 && (deepProfileResult.kualitasKomunikasi?.skor || 0) > 60
                      ? Math.max(10, Math.min(50, Math.round(calculatedJobFitScore * 0.8 + 15)))
                      : deepProfileResult.kualitasKomunikasi?.skor}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Komunikasi Ilmiah</div>
                  <div className="text-[10px] text-teal-300 font-semibold">
                    {studentEmpScore === 0
                      ? 'Perlu Ditingkatkan'
                      : deepProfileResult.kualitasKomunikasi?.kategori}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-sm font-black text-amber-400 mt-1">
                    {calculatedJobFitScore < 80
                      ? 'Pembelajar Awal Laboratorium'
                      : (deepProfileResult.profilKepribadianKerja?.tipe || 'Praktisi Prosedural')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tipe Kepribadian Kerja</div>
                </div>
              </div>

              {/* Pola Penguasaan */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Konsep Kuat
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {(() => {
                      const isVol0 = (technicalRadarData.find(t => t.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0;
                      let filtered = (deepProfileResult.polaPenguasaan?.konsepKuat || []).filter((k: string) => {
                        if (isVol0 && (k.toLowerCase().includes('titrasi') || k.toLowerCase().includes('volumetri'))) return false;
                        return true;
                      });
                      if (filtered.length === 0) {
                        filtered = ['Pengenalan awal prosedur keselamatan laboratorium (K3LH)'];
                      }
                      return filtered.map((k: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{k}</li>
                      ));
                    })()}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-800/30 space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Miskonsepsi Teridentifikasi
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {(deepProfileResult.polaPenguasaan?.miskonsepsiTeridentifikasi || []).length > 0 ? (
                      (deepProfileResult.polaPenguasaan?.miskonsepsiTeridentifikasi || []).map((m: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span>{m}</li>
                      ))
                    ) : (
                      <li className="flex items-start gap-1.5 text-slate-400 italic">Identifikasi miskonsepsi membutuhkan pendalaman analisis lanjutan</li>
                    )}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-800/30 space-y-2">
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Topik Belum Dikuasai
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {(() => {
                      const isVol0 = (technicalRadarData.find(t => t.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0;
                      let topikList = [...(deepProfileResult.polaPenguasaan?.topikBelumDikuasai || [])];
                      if (isVol0 && !topikList.some(t => t.toLowerCase().includes('volumetri') || t.toLowerCase().includes('titrasi'))) {
                        topikList.unshift('Analisis Volumetri & Titrimetri (0%)');
                      }
                      return topikList.map((t: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5"><span className="text-rose-500 mt-0.5">•</span>{t}</li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>

              {/* Rekomendasi Pembekalan */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Rekomendasi Pembekalan Spesifik
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(deepProfileResult.rekomendasiPembekalan || []).map((rec: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-white">{rec.judul}</span>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.prioritas === 'tinggi' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          rec.prioritas === 'sedang' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-700 text-slate-300 border border-slate-600'
                        }`}>{rec.prioritas}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20">{rec.kategori}</span>
                      <p className="text-[11px] text-slate-300 mt-1">{rec.detail}</p>
                      {rec.estimasiWaktu && (
                        <p className="text-[10px] text-slate-500">⏱ Estimasi: {rec.estimasiWaktu}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Guru */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-sky-400" /> Catatan untuk Guru Pembimbing:
                </div>
                <p className="text-slate-400 leading-relaxed">{deepProfileResult.catatanGuruPembimbing}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI RECOMMENDATION & REMEDIAL ACTIONS PANEL (DeepSeek AI) */}
      {aiResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                {isTeacherOrAdmin ? 'Hasil Analisis Kesiapan Kerja & Pemetaan DUDI' : 'Hasil Evaluasi & Rekomendasi Profil Kesiapan Kerja'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                {isTeacherOrAdmin ? (aiProvider || 'Standar DUDI') : 'Terstandarisasi DUDI'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Job Fit: {calculatedJobFitScore}%
              </span>
            </div>
          </div>

          {/* Akumulasi Breakdown Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Skor KTK (6 Dimensi)</span>
              <span className="text-sm font-black text-emerald-400">{studentTechScore}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Employability (9 Aspek)</span>
              <span className="text-sm font-black text-purple-400">{studentEmpScore}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Poin Sertifikat</span>
              <span className="text-sm font-black text-blue-400">+{certificateBonusPoints} Poin ({validCertCount}/3)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Job Fit Terakumulasi</span>
              <span className="text-sm font-black text-amber-400">{calculatedJobFitScore}%</span>
            </div>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            {calculatedJobFitScore < 80 && (aiResult.summary?.includes('melampaui') || aiResult.summary?.includes('90%') || aiResult.summary?.includes('88%') || ((technicalRadarData.find(t => t.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0 && aiResult.summary?.toLowerCase().includes('volumetri')))
              ? `Siswa ${activeStudent.name} memiliki tingkat keselarasan karir sebesar ${calculatedJobFitScore}% (KTK: ${studentTechScore}%, Employability: ${studentEmpScore}%) untuk posisi ${selectedJob.title}. Hasil pemetaan asesmen menunjukkan perlunya program pembekalan dan remedial terarah pada dimensi teknis kimia laboratorium.`
              : aiResult.summary}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-2">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profil Kekuatan Utama Siswa:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {(() => {
                  const isVol0 = (technicalRadarData.find(t => t.skill.toLowerCase().includes('volumetri'))?.Student || 0) === 0;
                  let filtered = (aiResult.gapAnalysis?.strengths || []).filter((s: string) => {
                    if (isVol0 && (s.toLowerCase().includes('titrasi') || s.toLowerCase().includes('volumetri') || s.toLowerCase().includes('titrimetri'))) return false;
                    return true;
                  });
                  if (filtered.length === 0) {
                    filtered = ['Motivasi awal mengikuti asesmen laboratorium kimia', 'Pemahaman dasar pengenalan keselamatan kerja K3LH'];
                  }
                  return filtered.map((s: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{s}</li>
                  ));
                })()}
              </ul>
            </div>

            {/* Weaknesses / Gaps */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/40 space-y-2">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Gap / Kelemahan Perlu Ditingkatkan:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {aiResult.gapAnalysis?.weaknesses?.map((w: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Remedial Step Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aksi Konkret Pembekalan & Remedial (Berprioritas)</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {aiResult.remedialActions?.map((act: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{act.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      act.priority === 'tinggi' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      Prioritas {act.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{act.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Advisor Notes */}
          {aiResult.teacherAdvisorNotes && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" /> Catatan untuk Guru Pembimbing:
              </div>
              <p className="text-slate-400 leading-relaxed">{aiResult.teacherAdvisorNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* REASSESSMENT & GROWTH CYCLE SECTION (Tahap 7) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Siklus Latihan, Asesmen Ulang & Perkembangan Hasil (Growth Cycle)
            </h3>
            <p className="text-xs text-slate-400">
              Riwayat kemajuan kompetensi siswa secara longitudinal dari asesmen awal hingga asesmen ulang setelah remedial.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 rounded-lg">
            Tren: +12% Pertumbuhan Nilai
          </span>
        </div>

        {/* Timeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">Siklus / Iterasi</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Sesi Asesmen</th>
                <th className="p-3 text-center">Skor Teknis Kimia</th>
                <th className="p-3 text-center">Skor Employability</th>
                <th className="p-3 text-center">Bukti Terverifikasi</th>
                <th className="p-3">Catatan Perkembangan Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-950/40">
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                    Asesmen Awal
                  </span>
                </td>
                <td className="p-3 text-slate-400">10 Sep 2024</td>
                <td className="p-3 font-semibold text-white">Ujian Pre-Test Vokasi Kimia</td>
                <td className="p-3 text-center font-bold text-amber-400">72%</td>
                <td className="p-3 text-center font-bold text-purple-400">75%</td>
                <td className="p-3 text-center font-bold text-slate-300">2 Berkas</td>
                <td className="p-3 text-slate-400">Perlu penguatan pada stoikiometri dan K3LH laboratorium.</td>
              </tr>
              <tr className="hover:bg-slate-950/40">
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
                    Asesmen Ulang #1
                  </span>
                </td>
                <td className="p-3 text-slate-400">25 Sep 2024</td>
                <td className="p-3 font-semibold text-white">Post-Test Praktik Titrasi & K3LH</td>
                <td className="p-3 text-center font-bold text-emerald-400">80%</td>
                <td className="p-3 text-center font-bold text-purple-400">82%</td>
                <td className="p-3 text-center font-bold text-slate-300">4 Berkas</td>
                <td className="p-3 text-slate-300">Pemahaman Prosedur K3 meningkat. Akurasi titrasi baik.</td>
              </tr>
              <tr className="hover:bg-slate-950/40 bg-emerald-950/20">
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                    Asesmen Final (Aktual)
                  </span>
                </td>
                <td className="p-3 text-slate-400">08 Okt 2024</td>
                <td className="p-3 font-semibold text-white">Asesmen Komprehensif Standard DUDI</td>
                <td className="p-3 text-center font-bold text-emerald-400">{studentTechScore}%</td>
                <td className="p-3 text-center font-bold text-purple-400">{studentEmpScore}%</td>
                <td className="p-3 text-center font-bold text-emerald-400">{portfolios.length + 3} Berkas</td>
                <td className="p-3 text-emerald-300 font-medium">Sangat Siap Kerja! Menguasai titrimetri, K3LH, & manajemen mutu ISO 17025.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT PORTFOLIO & PRACTICUM SECTION */}
      <div className="space-y-6">
        {/* SECTION 1: SERTIFIKAT KOMPETENSI */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Sertifikat Kompetensi & Pelatihan Siswa
              </h3>
              <p className="text-xs text-slate-400">Sertifikat pelatihan kejuruan, uji kompetensi LSP/BNSP, dan pengalaman magang industri.</p>
            </div>

            <button
              onClick={() => {
                setPortCategory('sertifikat');
                setShowPortModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sertifikat Siswa</span>
            </button>
          </div>

          {/* Certificate Accumulation Rule Info Banner */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-200">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Aturan Akumulasi Sertifikat:</strong> Setiap sertifikat kompetensi yang telah <strong>divalidasi Guru</strong> bernilai <strong>+10 Poin Kesiapan Kerja</strong> (Maksimal <strong>3 Sertifikat</strong> = <strong>+30 Poin</strong> diakumulasikan ke Job Fit Score).
              </span>
            </div>
            <span className="shrink-0 font-bold px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px]">
              {validCertCount}/3 Sertifikat (+{certificateBonusPoints} Poin Terhitung)
            </span>
          </div>

          {certificatePortfolios.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              Belum ada sertifikat kompetensi yang terdata untuk siswa ini.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {certificatePortfolios.map(port => {
                const isValidated = !!port.isValidatedByTeacher;

                return (
                  <div key={port.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {port.category === 'sertifikat' ? 'Sertifikat Pelatihan' : port.category === 'uji_kompetensi' ? 'Uji Kompetensi BNSP' : 'Sertifikasi Kejuruan'}
                        </span>

                        {/* Teacher Validation Badge */}
                        {isValidated ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tervalidasi (+10 Poin)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⏳ Menunggu Validasi Guru / Admin
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white">{port.title}</h4>
                      <p className="text-[11px] text-slate-400">{port.issuer} • {port.date}</p>
                      
                      {port.description && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                          {port.description}
                        </p>
                      )}

                      {/* Teacher View: System Recommendation & Auto Score Suggestion */}
                      {isTeacherOrAdmin && (
                        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                            <span>Rekomendasi Sistem (API):</span>
                            <span className="text-amber-400 font-black">Relevansi {port.aiRelevance || 'Tinggi'} ({port.aiScore || 8.0}/10)</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {port.aiFeedback || 'Sertifikat sesuai dengan standar kompetensi teknis DUDI.'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Preview PDF Button */}
                        {port.pdfBase64 || port.fileName ? (
                          <button
                            onClick={() => setPreviewPdfItem(port)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                            title="Buka / Pratinjau Dokumen PDF"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Buka PDF</span>
                          </button>
                        ) : null}

                        {/* Validation Action Button for Teacher / Admin */}
                        {isTeacherOrAdmin && (
                          <button
                            onClick={() => handleToggleValidatePortfolio(port)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              isValidated
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isValidated ? 'text-emerald-400' : 'text-white'}`} />
                            <span>{isValidated ? 'Batalkan Validasi' : '✓ Validasi & Setujui'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePortfolio(port.id)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: LAPORAN PRAKTIKUM (STRICT MAKSIMAL 3 DOKUMEN PDF) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Maksimal 3 Dokumen PDF
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  ({practicumReports.length}/3 Dokumen Terunggah • {validatedPracticumCount} Tervalidasi)
                </span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 mt-1">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                Laporan Praktikum Kimia Laboratorium Siswa
              </h3>
              <p className="text-xs text-slate-400">
                Laporan pelaksanaan eksperimen laboratorium kimia. Guru Pembimbing / Admin dapat membuka dokumen PDF dan memvalidasi keabsahan data analisis.
              </p>
            </div>

            <button
              onClick={() => {
                if (practicumReports.length >= 3) {
                  alert('Batas maksimal 3 dokumen laporan praktikum telah tercapai untuk siswa ini.');
                  return;
                }
                setPortCategory('laporan_praktikum');
                setShowPortModal(true);
              }}
              disabled={practicumReports.length >= 3}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
                practicumReports.length >= 3
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{practicumReports.length >= 3 ? 'Kuota 3/3 Tercapai' : 'Tambah Laporan Praktikum'}</span>
            </button>
          </div>

          {practicumReports.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
              <FlaskConical className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-xs text-slate-300 font-semibold">Siswa Belum Mengunggah Dokumen Laporan Praktikum</div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Siswa dapat mengunggah hingga maksimal 3 laporan praktikum kimia dalam format PDF melalui portal siswa untuk divalidasi oleh Guru / Admin.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {practicumReports.map(port => {
                const isValidated = !!port.isValidatedByTeacher;

                return (
                  <div
                    key={port.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/20 hover:border-emerald-500/40 flex flex-col justify-between gap-3 shadow-lg transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <FlaskConical className="w-3 h-3" />
                          Laporan Praktikum (PDF)
                        </span>

                        {isValidated ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Terverifikasi Guru / Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⏳ Menunggu Validasi
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{port.title}</h4>

                      {port.practicumTopic && (
                        <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200">
                          <strong>Topik:</strong> {port.practicumTopic}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lab: {port.issuer}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{port.date}</span>
                        </div>
                      </div>

                      {port.description && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                          {port.description}
                        </p>
                      )}

                      {isValidated && port.verifiedByTeacher && (
                        <div className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
                          ✓ Divalidasi oleh: <strong>{port.verifiedByTeacher}</strong> {port.validatedAt ? `(${new Date(port.validatedAt).toLocaleDateString('id-ID')})` : ''}
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        {/* Tombol Pratinjau PDF */}
                        <button
                          onClick={() => setPreviewPdfItem(port)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Buka / Pratinjau PDF</span>
                        </button>

                        {/* Tombol Validasi untuk Guru / Admin */}
                        {isTeacherOrAdmin && (
                          <button
                            onClick={() => handleToggleValidatePortfolio(port)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              isValidated
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isValidated ? 'text-emerald-400' : 'text-white'}`} />
                            <span>{isValidated ? 'Batalkan Validasi' : '✓ Validasi & Setujui'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePortfolio(port.id)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                        title="Hapus Laporan Praktikum"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* PDF DOCUMENT PREVIEW MODAL FOR TEACHER / ADMIN */}
      {previewPdfItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                {previewPdfItem.category === 'laporan_praktikum' ? (
                  <FlaskConical className="w-6 h-6 text-emerald-400" />
                ) : (
                  <FileCheck className="w-6 h-6 text-blue-400" />
                )}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{previewPdfItem.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      previewPdfItem.isValidatedByTeacher
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {previewPdfItem.isValidatedByTeacher ? '✓ Tervalidasi' : '⏳ Menunggu Validasi'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Siswa: <strong>{activeStudent.name}</strong> • {previewPdfItem.issuer} • {previewPdfItem.fileName || 'dokumen.pdf'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewPdfItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Details & Viewer */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Kategori</div>
                  <div className="text-xs font-bold text-white capitalize">
                    {previewPdfItem.category === 'laporan_praktikum' ? 'Laporan Praktikum (PDF)' : previewPdfItem.category}
                  </div>
                </div>
                {previewPdfItem.practicumTopic && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Topik Praktikum</div>
                    <div className="text-xs font-bold text-emerald-400 truncate">{previewPdfItem.practicumTopic}</div>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Tanggal Dokumen</div>
                  <div className="text-xs font-bold text-white">{previewPdfItem.date}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Status Validasi</div>
                  <div className={`text-xs font-bold ${previewPdfItem.isValidatedByTeacher ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {previewPdfItem.isValidatedByTeacher ? 'Terverifikasi' : 'Belum Divalidasi'}
                  </div>
                </div>
              </div>

              {/* Embedded PDF iframe or base64 viewer */}
              {previewPdfItem.pdfBase64 ? (
                <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <iframe
                    src={previewPdfItem.pdfBase64}
                    title="PDF Document Preview"
                    className="w-full h-full border-0"
                  ></iframe>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-emerald-400" />
                  <div className="text-xs text-slate-300">
                    Dokumen ini tersimpan dalam basis data sistem portofolio digital siswa.
                  </div>
                </div>
              )}

              {/* Quick Teacher Validation Bar inside Preview Modal */}
              {isTeacherOrAdmin && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Pemeriksaan & Validasi Guru / Admin
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {previewPdfItem.isValidatedByTeacher
                        ? `Dokumen telah disetujui secara resmi oleh ${previewPdfItem.verifiedByTeacher || 'Guru Pembimbing / Admin'}.`
                        : 'Klik tombol di samping untuk memvalidasi dokumen dan menyetujui keabsahan hasil pengujian praktikum siswa.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleValidatePortfolio(previewPdfItem)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                      previewPdfItem.isValidatedByTeacher
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${previewPdfItem.isValidatedByTeacher ? 'text-emerald-400' : 'text-white'}`} />
                    <span>{previewPdfItem.isValidatedByTeacher ? 'Batalkan Validasi' : '✓ Validasi & Setujui Dokumen Ini'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPdfItem(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT REPORT MODAL */}
      {showPrintModal && (
        <PrintReportModal
          studentName={activeStudent.name}
          studentNis={activeStudent.identityNo}
          className={activeStudent.className || '-'}
          schoolName={activeStudent.schoolName || guruSchool?.name || currentUser.schoolName || '-'}
          jobFitScore={calculatedJobFitScore}
          targetJob={selectedJob}
          technicalScore={studentTechScore}
          employabilityScore={studentEmpScore}
          technicalRadarData={technicalRadarData}
          employabilityRadarData={employabilityRadarData}
          aiResult={aiResult}
          portfolios={portfolios}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* ADD PORTFOLIO MODAL */}
      {showPortModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Tambah Portofolio / Sertifikat Baru</h3>

            <form onSubmit={handleAddPortfolio} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Portofolio / Sertifikat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sertifikat K3 Laboratorium Kimia"
                  value={portTitle}
                  onChange={(e) => setPortTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                  <select
                    value={portCategory}
                    onChange={(e) => setPortCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="sertifikat">Sertifikat Kompetensi</option>
                    <option value="laporan_praktikum">Laporan Praktikum Kimia (Maks 3)</option>
                    <option value="pkl">Praktek Kerja Lapangan (PKL)</option>
                    <option value="proyek">Proyek Riset / Produk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {portCategory === 'laporan_praktikum' ? 'Laboratorium / Tempat Uji' : 'Penerbit / Instansi'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={portCategory === 'laporan_praktikum' ? 'Contoh: Laboratorium Kimia Analisis' : 'Contoh: PT Bio Farma / BNSP'}
                    value={portIssuer}
                    onChange={(e) => setPortIssuer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              {portCategory === 'laporan_praktikum' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Topik / Modul Praktikum</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Titrasi Asam-Basa & Volumetri Terapan"
                    value={portTopic}
                    onChange={(e) => setPortTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {portCategory === 'laporan_praktikum' ? 'Tanggal Praktikum' : 'Tanggal Terbit'}
                </label>
                <input
                  type="date"
                  value={portDate}
                  onChange={(e) => setPortDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {portCategory === 'laporan_praktikum' ? 'Ringkasan Hasil Eksperimen' : 'Deskripsi Singkat'}
                </label>
                <textarea
                  rows={2}
                  placeholder={portCategory === 'laporan_praktikum' ? 'Ringkasan metode, larutan standar, dan hasil perhitungan kadar...' : 'Pengalaman atau keahlian yang didapat...'}
                  value={portDesc}
                  onChange={(e) => setPortDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPortModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Portofolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
