import { School, ClassRoom, Teacher, QuestionPackage, Exam, ExamSubmission, JobPosition, PortfolioItem, User, SystemSettings, ArchivedItem } from '../types';
import { INITIAL_REVISED_PACKAGES } from './revisedQuestions';
import { INITIAL_NON_TEST_PACKAGE } from './nonTestInstrument';

export const INITIAL_SETTINGS: SystemSettings = {
  appName: 'Sistem Asesmen & Profil Kesiapan Kerja SMK',
  academicYear: '2024/2025 Genap',
  emailNotifications: true,
  geminiModel: 'gemini-2.5-flash',
  autoGradeEssays: true,
  aiReadinessAnalysis: true,
  speechToTextEnabled: true,
  speechLanguage: 'id-ID',
  micSensitivity: 'sedang',
  // Providers & API Keys (Sesuai Gambar 2)
  providers: [
    {
      id: 'prov-deepseek-flash',
      name: 'DeepSeek Chat (V3)',
      type: 'Deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-987d****************',
      baseUrl: 'https://api.deepseek.com',
      status: 'Active'
    },
    {
      id: 'prov-deepseek-pro',
      name: 'DeepSeek Reasoner (R1)',
      type: 'Deepseek',
      model: 'deepseek-reasoner',
      apiKey: 'sk-987d****************',
      baseUrl: 'https://api.deepseek.com',
      status: 'Active'
    },
    {
      id: 'prov-gemini-flash',
      name: 'gemini-2.5-flash',
      type: 'Gemini',
      model: 'gemini-2.5-flash',
      apiKey: 'AIzaSy****************7I0E',
      status: 'Active'
    }
  ],
  // 3 Modality Routing Pipelines
  modalityRouting: {
    text: {
      mode: 'Use API provider',
      providerId: 'prov-deepseek-flash',
      prompt: 'Evaluasi ketepatan konsep kimia analitik, prosedur K3, dan sistematika penulisan jawaban esai teks siswa.'
    },
    image: {
      mode: 'Use API provider',
      providerId: 'prov-gemini-flash',
      prompt: 'Ekstraksi OCR tulisan tangan dan nilai kebenaran alur hitungan, rumus, serta gambar skema laboratorium.'
    },
    audio: {
      mode: 'Use API provider',
      providerId: 'default',
      prompt: 'Transkripsi audio penjelasan verbal siswa dan nilai pemahaman konseptual serta artikulasi istilah kimia.'
    }
  },
  // Legacy fields
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  deepseekEnabled: true,
  deepseekBaseUrl: 'https://api.deepseek.com',
};

export const INITIAL_SCHOOLS: School[] = [];

export const INITIAL_CLASSES: ClassRoom[] = [];

export const INITIAL_TEACHERS: Teacher[] = [];

export const PRESET_USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Ibrahim Wicaksono, S.Pd.',
    email: 'admin@app.com',
    password: 'password',
    role: 'admin',
    identityNo: '197603152002121001',
    schoolName: 'Dinas & Pusat Asesmen Vocational SMK'
  }
];

export const INITIAL_PACKAGES: QuestionPackage[] = [
  INITIAL_NON_TEST_PACKAGE,
  ...INITIAL_REVISED_PACKAGES,
  {
    id: 'pkg-1',
    code: 'PKG-TK-01',
    title: 'Asesmen Teknis Titrasi Volumetri & Spektrofotometri UV-Vis',
    description: 'Menguji penguasaan penyiapan larutan standar, otomatisasi kurva kalibrasi, dan analisis sampel obat/kimia.',
    category: 'teknis_kimia',
    durationMinutes: 60,
    totalQuestions: 3,
    isActive: true,
    createdAt: '2025-01-15',
    createdBy: 'Tim Pengembang Asesmen Vokasi',
    questions: [
      {
        id: 'q-1',
        code: 'TK-01',
        category: 'teknis_kimia',
        topic: 'Standarisasi Larutan NaOH dengan Asam Oksalat',
        questionText: 'Seorang analis QC menimbang 0.6300 gram Asam Oksalat Dihidrat (H2C2O4.2H2O, BM = 126 g/mol) dan dilarutkan dalam labu ukur 100 mL. Sebanyak 10 mL larutan ini dititrasi dengan larutan NaOH hingga titik akhir fenoftalein terlampaui. Rata-rata volume NaOH dibutuhkan adalah 9.80 mL.',
        type: 'essay_subquestions',
        rubricGuide: 'Skor maks 100. Poin diberikan berdasarkan kebenaran rumus mol, kalkulasi molaritas NaOH, serta analisis faktor kesalahan pembacaan meniskus.',
        subQuestions: [
          {
            id: 'sub-1a',
            text: 'Hitunglah molaritas persis larutan standar primer Asam Oksalat.',
            points: 30,
            answerKey: '0.05 M H2C2O4',
            rubric: '30 poin jika perhitungan mol (0.63/126 = 0.005 mol) dan molaritas (0.005 / 0.1L = 0.05 M) benar.'
          },
          {
            id: 'sub-1b',
            text: 'Tuliskan persamaan reaksi netralisasi antara H2C2O4 dan NaOH, lalu hitung Konsentrasi NaOH (M).',
            points: 40,
            answerKey: 'H2C2O4 + 2 NaOH -> Na2C2O4 + 2 H2O. M NaOH = (2 x M_asam x V_asam) / V_NaOH = (2 x 0.05 x 10) / 9.8 = 0.102 M',
            rubric: '40 poin jika stokiometri 1:2 dipertimbangkan dengan benar dan M NaOH = 0.102 M.'
          },
          {
            id: 'sub-1c',
            text: 'Jelaskan akibat keselamatan (K3) jika larutan NaOH pekat terkena kulit analis dan langkah pertolongan pertamanya.',
            points: 30,
            answerKey: 'NaOH bersifat korosif/basa kuat, merusak jaringan. Pembilasan dengan air mengalir minimal 15 menit dan penetralan ringan/penanganan medik.',
            rubric: '30 poin jika menyebutkan sifat korosif basa dan pembilasan air mengalir 15 menit.'
          }
        ]
      },
      {
        id: 'q-2',
        code: 'TK-02',
        category: 'teknis_kimia',
        topic: 'Pengoperasian Spektrofotometer UV-Vis',
        questionText: 'Pada analisis kadar Parasetamol menggunakan Spektrofotometer UV-Vis pada panjang gelombang maksimum 243 nm, langkah pertama setelah pembuatan kurva kalibrasi adalah melakukan blanko otomatis. Mengapa larutan blanko sangat penting dalam penetapan kadar spektrofotometri?',
        type: 'essay_subquestions',
        rubricGuide: 'Evaluasi pemahaman absorbansi dan Hukum Lambert-Beer.',
        subQuestions: [
          {
            id: 'sub-2a',
            text: 'Fungsi utama larutan blanko dan komponen apa saja yang terkandung di dalam larutan blanko.',
            points: 50,
            answerKey: 'Blanko digunakan untuk mengukur absorbansi pelarut dan reagen tanpa matriks analit sehingga absorbansi pembacaan murni analit.',
            rubric: '50 poin jika menyebutkan koreksi absorbansi pelarut dan reagen.'
          },
          {
            id: 'sub-2b',
            text: 'Jika kuvet kuarsa ternoda sidik jari pada sisi beningnya, bagaimana dampaknya terhadap nilai absorbansi sampel?',
            points: 50,
            answerKey: 'Sidik jari akan mendifraksikan/mensuspensikan cahaya, sehingga absorbansi terbaca lebih tinggi dari seharusnya (positif palsu).',
            rubric: '50 poin jika menjelaskan pemantulan/penyerapan cahaya ekstra yang meningkatkan nilai absorbansi.'
          }
        ]
      },
      {
        id: 'q-3',
        code: 'TK-03',
        category: 'teknis_kimia',
        topic: 'Identifikasi Reagen & Simbol Bahaya Bahan Kimia (GHS)',
        questionText: 'Pilihlah simbol bahaya GHS yang sesuai untuk Asam Klorida Pekat (HCl 37%):',
        type: 'multiple_choice',
        options: ['Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)', 'Mudah Terbakar (Flammable)', 'Mudah Meledak (Explosive)', 'Gas Bertekanan'],
        correctAnswer: 'Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)',
        rubricGuide: '100% untuk jawaban pilihan ganda tepat.'
      }
    ]
  },
  {
    id: 'pkg-2',
    code: 'PKG-EMP-01',
    title: 'Asesmen Employability Skills & K3 Industri Kimia',
    description: 'Menguji kecakapan komunikasi di laboratorium, etika kerja tim, troubleshooting insiden K3, dan kepatuhan ISO 17025.',
    category: 'employability',
    durationMinutes: 45,
    totalQuestions: 2,
    isActive: true,
    createdAt: '2025-01-20',
    createdBy: 'Tim Pengembang Asesmen Vokasi',
    questions: [
      {
        id: 'q-emp-1',
        code: 'EMP-01',
        category: 'employability',
        topic: 'Studi Kasus K3 & Kerjasama Tim Pabrik',
        questionText: 'Rekan kerja Anda di laboratorium QC tidak sengaja memecahkan labu penampung sampel limbah pelarut organik beracun (Benzena) di dekat area kerja utama. Rekan Anda terlihat panik dan mencoba mengelapnya dengan tisu biasa tanpa APD respirasi.',
        type: 'scenario_assessment',
        rubricGuide: 'Poin dinilai dari urutan respon: Keselamatan diri & tim -> Penggunaan Spill Kit -> Pelaporan Supervisor -> Dokumentasi LDP/MSDS.',
        subQuestions: [
          {
            id: 'sub-e1a',
            text: 'Langkah taktis instan apa yang Anda ambil untuk mengamankan tim dan area laboratorium?',
            points: 50,
            answerKey: 'Hentikan tindakan rekan, evakuasi personil dari uap Benzena, aktifkan exhaust/fume hood, pasang APD respirator dan pelindung uap.',
            rubric: '50 poin jika mencakup evakuasi, penghentian lap tisu biasa, dan penggunaan APD yang sesuai (respirator uap organik).'
          },
          {
            id: 'sub-e1b',
            text: 'Bagaimana cara Anda mengomunikasikan insiden ini kepada Supervisor QC secara profesional tanpa menyudutkan rekan?',
            points: 50,
            answerKey: 'Melaporkan fakta tumpahan bahan beracun secara objektif, tindakan isolasi awal yang telah diambil, dan memohon arahan penanganan limbah B3 sesuai prosedur ISO 14001.',
            rubric: '50 poin jika menyampaikan laporan objektif berfokus pada keselamatan dan prosedur standar tanpa tuduhan personal.'
          }
        ]
      },
      {
        id: 'q-emp-2',
        code: 'EMP-02',
        category: 'employability',
        topic: 'Etika Penanganan Data Hasil Uji Lab (ISO 17025)',
        questionText: 'Seorang Analis QC mendapati hasil uji kadar kemurnian sampel bahan baku produk tidak memenuhi spesifikasi (Out of Specification / OOS). Supervisor produksi meminta analis mengubah sedikit angka desimal agar meloloskan batch pengiriman. Bagaimana Anda bersikap sebagai profesional?',
        type: 'scenario_assessment',
        rubricGuide: 'Penilaian integritas data & kepatuhan prosedur pengujian berulang.',
        subQuestions: [
          {
            id: 'sub-e2a',
            text: 'Uraikan integritas dan etika analis serta Prosedur Penanganan OOS yang baku.',
            points: 100,
            answerKey: 'Menolak manipulasi data. Melakukan verifikasi alat & pengujian ulang (re-test) sesuai protokol OOS ter-dokumentasi. Jika tetap OOS, buat laporan NCR (Non-Conformance Report).',
            rubric: '100 poin jika tegas menolak falsifikasi data dan menjelaskan alur baku penyelidikan OOS (Uji Ulang -> Investigasi Alat/SOP -> Laporan NCR).'
          }
        ]
      }
    ]
  }
];

export const INITIAL_EXAMS: Exam[] = [];

export const INITIAL_SUBMISSIONS: ExamSubmission[] = [];

export const TARGET_JOBS: JobPosition[] = [
  {
    id: 'job-1',
    title: 'Quality Control (QC) Analyst Chemical Lab',
    department: 'Quality Assurance & Control Dept',
    description: 'Melakukan analisis kuantitatif bahan baku, sampel proses, dan produk jadi menggunakan titrasi, spektrofotometri, dan HPLC sesuai panduan ISO 17025.',
    requiredTechnicalSkills: {
      'Analisis Titrimetri & Gravimetri': 85,
      'Instrumental HPLC / UV-Vis': 80,
      'Keselamatan Kerja Lab (K3)': 90,
      'Penyiapan Sampel & Reagen': 85,
      'Pengolahan Data Hasil Uji': 80
    },
    requiredEmployabilitySkills: {
      'Komunikasi Efektif': 80,
      'Pemecahan Masalah (Problem Solving)': 85,
      'Kerjasama Tim (Teamwork)': 85,
      'Etika & Kedisiplinan Kerja': 90,
      'Kepatuhan Prosedur ISO/SOP': 90
    }
  },
  {
    id: 'job-2',
    title: 'Chemical Process Operator (Operator Proses Kimia)',
    department: 'Production & Manufacturing Unit',
    description: 'Mengoperasikan reaktor kimia, sistem distilasi, pemantauan instrumen otomatisasi proses, dan penanganan bahaya bahan kimia skala industri.',
    requiredTechnicalSkills: {
      'Analisis Titrimetri & Gravimetri': 65,
      'Instrumental HPLC / UV-Vis': 60,
      'Keselamatan Kerja Lab (K3)': 95,
      'Penyiapan Sampel & Reagen': 75,
      'Pengolahan Data Hasil Uji': 70
    },
    requiredEmployabilitySkills: {
      'Komunikasi Efektif': 85,
      'Pemecahan Masalah (Problem Solving)': 85,
      'Kerjasama Tim (Teamwork)': 90,
      'Etika & Kedisiplinan Kerja': 90,
      'Kepatuhan Prosedur ISO/SOP': 95
    }
  },
  {
    id: 'job-3',
    title: 'R&D Assistant Analyst (Asisten Analis Litbang)',
    department: 'Research & Product Development',
    description: 'Membantu pengembangan formulasi baru, karakterisasi sifat fisik-kimia material, serta otomatisasi pengujian stabilitas bahan.',
    requiredTechnicalSkills: {
      'Analisis Titrimetri & Gravimetri': 80,
      'Instrumental HPLC / UV-Vis': 90,
      'Keselamatan Kerja Lab (K3)': 85,
      'Penyiapan Sampel & Reagen': 90,
      'Pengolahan Data Hasil Uji': 85
    },
    requiredEmployabilitySkills: {
      'Komunikasi Efektif': 80,
      'Pemecahan Masalah (Problem Solving)': 90,
      'Kerjasama Tim (Teamwork)': 80,
      'Etika & Kedisiplinan Kerja': 85,
      'Kepatuhan Prosedur ISO/SOP': 85
    }
  },
  {
    id: 'job-4',
    title: 'HSE & K3 Specialist Kimia',
    department: 'Health, Safety & Environment Division',
    description: 'Mengawasi penerapan K3LH di industri kimia, penanganan limbah B3, inspeksi ketersediaan APD, serta respon darurat insiden tumpahan kimia.',
    requiredTechnicalSkills: {
      'Analisis Titrimetri & Gravimetri': 60,
      'Instrumental HPLC / UV-Vis': 55,
      'Keselamatan Kerja Lab (K3)': 98,
      'Penyiapan Sampel & Reagen': 70,
      'Pengolahan Data Hasil Uji': 75
    },
    requiredEmployabilitySkills: {
      'Komunikasi Efektif': 90,
      'Pemecahan Masalah (Problem Solving)': 90,
      'Kerjasama Tim (Teamwork)': 85,
      'Etika & Kedisiplinan Kerja': 95,
      'Kepatuhan Prosedur ISO/SOP': 98
    }
  }
];

export const INITIAL_PORTFOLIOS: PortfolioItem[] = [];

export const INITIAL_ARCHIVES: ArchivedItem[] = [
  {
    id: 'arch-1',
    type: 'paket_soal',
    title: 'Paket Soal Kurikulum 2013 - Kimia Dasar XI (Arsip 2023)',
    archivedAt: '2024-06-15',
    reason: 'Pembaruan ke Kurikulum Merdeka Vocational'
  },
  {
    id: 'arch-2',
    type: 'ujian',
    title: 'Ujian Tryout UNK Kimia 2023 Batch 1',
    archivedAt: '2024-05-20',
    reason: 'Penyelesaian Tahun Ajaran Lalu'
  }
];
