import { QuestionItem, QuestionPackage } from '../types';

export interface EmployabilityAspect {
  id: string;
  name: string;
  itemNumbers: number[];
  industryTargetPercent: number; // e.g. 85%
  indicator: string;
  mappingGoal: string;
}

export const EMPLOYABILITY_ASPECTS: EmployabilityAspect[] = [
  {
    id: 'komunikasi',
    name: 'Keterampilan Komunikasi',
    itemNumbers: [1, 2],
    industryTargetPercent: 85,
    indicator: 'Kemampuan menerima, menyampaikan, dan mengklarifikasi informasi kerja secara jelas dan sesuai konteks.',
    mappingGoal: 'Komunikasi Kerja & Klarifikasi Informasi'
  },
  {
    id: 'kerjasama',
    name: 'Keterampilan Kerja Sama',
    itemNumbers: [3, 4],
    industryTargetPercent: 85,
    indicator: 'Kemampuan berkoordinasi, berbagi tanggung jawab, mendukung anggota tim, dan menyelesaikan pekerjaan bersama.',
    mappingGoal: 'Koordinasi Tim & Penyelesaian Bersama'
  },
  {
    id: 'pemecahan_masalah',
    name: 'Keterampilan Pemecahan Masalah',
    itemNumbers: [5, 6],
    industryTargetPercent: 85,
    indicator: 'Kemampuan mengidentifikasi masalah, menelusuri informasi, mempertimbangkan alternatif, dan menentukan tindakan secara sistematis.',
    mappingGoal: 'Identifikasi Masalah & Tindakan Sistematis'
  },
  {
    id: 'inisiatif_kewirausahaan',
    name: 'Keterampilan Inisiatif dan Kewirausahaan',
    itemNumbers: [7, 8],
    industryTargetPercent: 80,
    indicator: 'Kemampuan mengenali peluang perbaikan, mengusulkan gagasan, dan mengambil inisiatif dengan mempertimbangkan manfaat, sumber daya, dan risiko.',
    mappingGoal: 'Peluang Perbaikan & Inisiatif Solutif'
  },
  {
    id: 'perencanaan_pengorganisasian',
    name: 'Keterampilan Perencanaan dan Pengorganisasian',
    itemNumbers: [9, 10],
    industryTargetPercent: 85,
    indicator: 'Kemampuan menentukan prioritas, mengatur waktu dan sumber daya, serta menyesuaikan rencana dengan perubahan pekerjaan.',
    mappingGoal: 'Skala Prioritas & Manajemen Waktu Kerja'
  },
  {
    id: 'manajemen_diri',
    name: 'Keterampilan Manajemen Diri',
    itemNumbers: [11, 12],
    industryTargetPercent: 90,
    indicator: 'Kemampuan mengendalikan respons pribadi, menjaga tanggung jawab, mengelola tekanan, dan mempertahankan kualitas pekerjaan.',
    mappingGoal: 'Kendali Diri & Tanggung Jawab Kerja'
  },
  {
    id: 'belajar',
    name: 'Keterampilan Belajar',
    itemNumbers: [13, 14],
    industryTargetPercent: 80,
    indicator: 'Kemampuan mencari sumber belajar, menerima umpan balik, merefleksikan pengalaman, dan meningkatkan kemampuan secara berkelanjutan.',
    mappingGoal: 'Refleksi Diri & Peningkatan Berkelanjutan'
  },
  {
    id: 'teknologi',
    name: 'Keterampilan Teknologi',
    itemNumbers: [15, 16],
    industryTargetPercent: 85,
    indicator: 'Kemampuan menggunakan teknologi kerja secara tepat, efisien, bertanggung jawab, dan melakukan verifikasi terhadap informasi yang dihasilkan.',
    mappingGoal: 'Pemanfaatan Teknologi & Verifikasi Data'
  },
  {
    id: 'k3',
    name: 'Keselamatan dan Kesehatan Kerja',
    itemNumbers: [17, 18],
    industryTargetPercent: 90,
    indicator: 'Kemampuan menunjukkan tanggung jawab terhadap keselamatan diri dan orang lain melalui keputusan, komunikasi, dan kepatuhan terhadap budaya kerja aman.',
    mappingGoal: 'Tanggung Jawab K3 & Budaya Kerja Aman'
  }
];

export interface NonTestQuestionItem extends QuestionItem {
  scoringMap: Record<string, number>; // Skor 1 - 5 untuk opsi A, B, C, D, E
  aspectId: string;
  aspectName: string;
}

export const NON_TEST_QUESTIONS_18: NonTestQuestionItem[] = [
  {
    id: 'nt-1',
    code: 'EMP-01',
    number: 1,
    category: 'employability',
    aspectId: 'komunikasi',
    aspectName: 'Keterampilan Komunikasi',
    topic: 'Klarifikasi Instruksi Kerja Laboratorium',
    questionText: '1. Saat PKL di laboratorium, pembimbing memberikan beberapa instruksi pekerjaan. Setelah pembimbing pergi, Anda menyadari ada satu bagian instruksi yang belum dipahami, sedangkan pekerjaan perlu segera dimulai. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mendiskusikan bagian yang belum jelas dengan rekan, lalu memakai kesepakatan kelompok sebagai dasar untuk mulai bekerja.',
      'B. Menghubungi pembimbing dan memastikan bagian instruksi yang belum dipahami sebelum bagian pekerjaan tersebut dilaksanakan.',
      'C. Memulai pekerjaan berdasarkan pemahaman awal, lalu menanyakan kembali jika selama proses muncul kesulitan atau keraguan.',
      'D. Mengerjakan bagian yang sudah jelas terlebih dahulu sambil menyiapkan pertanyaan untuk dikonfirmasikan kepada pembimbing.',
      'E. Menunggu pembimbing kembali sebelum melakukan pekerjaan agar seluruh instruksi dapat dipastikan kembali secara langsung.'
    ],
    scoringMap: { A: 3, B: 5, C: 2, D: 4, E: 1 },
    correctAnswer: 'B',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: B (Skor 5). Bobot: A=3, B=5, C=2, D=4, E=1.'
  },
  {
    id: 'nt-2',
    code: 'EMP-02',
    number: 2,
    category: 'employability',
    aspectId: 'komunikasi',
    aspectName: 'Keterampilan Komunikasi',
    topic: 'Penyampaian Informasi Kritis Antar Anggota Tim',
    questionText: '2. Anda menemukan informasi pada hasil pekerjaan yang perlu diketahui anggota kelompok sebelum tahap berikutnya dilakukan. Anggota lain sedang sibuk menyelesaikan tugas masing-masing. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Menyampaikan informasi kepada anggota yang terkait dan memastikan bagian penting telah dipahami sebelum pekerjaan mereka dilanjutkan.',
      'B. Menuliskan informasi pada catatan kelompok agar anggota lain dapat membacanya ketika memiliki waktu untuk memeriksa hasil.',
      'C. Menyampaikan informasi secara singkat kepada kelompok, kemudian kembali bekerja tanpa memastikan bagaimana informasi tersebut dipahami.',
      'D. Menunggu sampai seluruh anggota selesai bekerja agar informasi dapat dijelaskan sekaligus tanpa mengganggu pekerjaan yang berlangsung.',
      'E. Menyampaikan informasi kepada ketua kelompok dan meminta ketua menentukan siapa saja yang perlu menerima informasi tersebut.'
    ],
    scoringMap: { A: 5, B: 3, C: 4, D: 1, E: 2 },
    correctAnswer: 'A',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: A (Skor 5). Bobot: A=5, B=3, C=4, D=1, E=2.'
  },
  {
    id: 'nt-3',
    code: 'EMP-03',
    number: 3,
    category: 'employability',
    aspectId: 'kerjasama',
    aspectName: 'Keterampilan Kerja Sama',
    topic: 'Koordinasi Penyesuaian Beban Tugas Kelompok',
    questionText: '3. Dalam kegiatan laboratorium kelompok, seorang anggota tertinggal dalam menyelesaikan tugasnya. Tahap pekerjaan anggota lain bergantung pada hasil tugas tersebut. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Menyelesaikan sebagian pekerjaan anggota tersebut agar keterlambatan kelompok dapat dikurangi dan tahap berikutnya segera dimulai.',
      'B. Menanyakan kendala yang dialami anggota tersebut dan membantu menemukan cara agar tugasnya dapat diselesaikan dengan baik.',
      'C. Meminta anggota tersebut tetap menyelesaikan tugasnya sendiri karena pembagian pekerjaan telah disepakati sejak awal kegiatan.',
      'D. Mengajak kelompok meninjau pembagian tugas dan menyesuaikan pekerjaan agar target tetap tercapai secara bersama dan terkoordinasi.',
      'E. Mengingatkan anggota tersebut tentang batas waktu, lalu melanjutkan tugas sendiri agar bagian pekerjaan Anda tetap selesai.'
    ],
    scoringMap: { A: 2, B: 4, C: 1, D: 5, E: 3 },
    correctAnswer: 'D',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: D (Skor 5). Bobot: A=2, B=4, C=1, D=5, E=3.'
  },
  {
    id: 'nt-4',
    code: 'EMP-04',
    number: 4,
    category: 'employability',
    aspectId: 'kerjasama',
    aspectName: 'Keterampilan Kerja Sama',
    topic: 'Penyelesaian Perbedaan Pendapat Teknis Laporan',
    questionText: '4. Dua anggota kelompok berbeda pendapat mengenai cara menyajikan hasil kegiatan. Perbedaan tersebut mulai menghambat penyelesaian laporan. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengajak keduanya menjelaskan alasan masing-masing lalu memilih pendekatan yang paling sesuai dengan kebutuhan dan tujuan laporan.',
      'B. Mengusulkan penggunaan pendapat yang mendapat dukungan anggota terbanyak agar pekerjaan dapat segera dilanjutkan oleh kelompok.',
      'C. Memilih salah satu pendapat yang menurut Anda lebih baik dan meminta kelompok mengikuti keputusan tersebut untuk menghemat waktu.',
      'D. Mengusulkan penggabungan bagian yang masih dapat dipadukan sambil menyepakati bagian yang memang harus dipilih salah satu.',
      'E. Membiarkan kedua anggota menyelesaikan perbedaan tersebut karena mereka yang pertama kali mengusulkan masing-masing cara penyajian.'
    ],
    scoringMap: { A: 5, B: 3, C: 2, D: 4, E: 1 },
    correctAnswer: 'A',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: A (Skor 5). Bobot: A=5, B=3, C=2, D=4, E=1.'
  },
  {
    id: 'nt-5',
    code: 'EMP-05',
    number: 5,
    category: 'employability',
    aspectId: 'pemecahan_masalah',
    aspectName: 'Keterampilan Pemecahan Masalah',
    topic: 'Investigasi Deviasi dan Anomali Hasil Analisis',
    questionText: '5. Saat PKL, hasil pekerjaan yang Anda peroleh berbeda cukup jauh dari hasil sebelumnya. Penyebabnya belum diketahui dan dapat berasal dari proses kerja, peralatan, atau kondisi sampel. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengulangi pekerjaan dengan cara yang sama untuk mengetahui apakah hasil yang berbeda tersebut kembali muncul pada pengukuran berikutnya.',
      'B. Menggunakan hasil sebelumnya karena data tersebut sudah lebih sering diperoleh dan dianggap lebih mewakili kondisi sampel.',
      'C. Mencatat hasil yang berbeda lalu berkonsultasi dengan pembimbing sebelum melakukan pemeriksaan pada bagian tertentu dari proses.',
      'D. Membandingkan hasil dengan milik rekan dan menggunakan data yang paling mendekati hasil yang diperoleh sebagian besar kelompok.',
      'E. Menelusuri tahapan kerja dan informasi yang tersedia, menetapkan kemungkinan penyebab, lalu memeriksa faktor yang paling relevan.'
    ],
    scoringMap: { A: 3, B: 1, C: 4, D: 2, E: 5 },
    correctAnswer: 'E',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: E (Skor 5). Bobot: A=3, B=1, C=4, D=2, E=5.'
  },
  {
    id: 'nt-6',
    code: 'EMP-06',
    number: 6,
    category: 'employability',
    aspectId: 'pemecahan_masalah',
    aspectName: 'Keterampilan Pemecahan Masalah',
    topic: 'Penyesuaian Rencana Kerja saat Keterbatasan Alat',
    questionText: '6. Kelompok Anda harus menyelesaikan pekerjaan hari itu, tetapi salah satu alat yang biasa digunakan masih dipakai kelompok lain. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Meminta kelompok lain mempercepat penggunaan alat karena pekerjaan kelompok Anda juga memiliki batas waktu yang harus dipenuhi.',
      'B. Membahas kondisi dengan kelompok, memeriksa alternatif yang diperbolehkan, lalu menyesuaikan rencana kerja tanpa mengubah prosedur.',
      'C. Mengerjakan bagian lain yang masih dapat dilakukan sambil menunggu alat tersebut tersedia kembali sesuai urutan pemakaian.',
      'D. Menggunakan alat lain yang fungsinya hampir sama agar pekerjaan tidak tertunda meskipun belum memastikan kesesuaian penggunaannya.',
      'E. Menunggu alat tersedia sesuai giliran sambil menyiapkan bahan dan informasi yang akan diperlukan pada tahap pekerjaan berikutnya.'
    ],
    scoringMap: { A: 2, B: 5, C: 3, D: 1, E: 4 },
    correctAnswer: 'B',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: B (Skor 5). Bobot: A=2, B=5, C=3, D=1, E=4.'
  },
  {
    id: 'nt-7',
    code: 'EMP-07',
    number: 7,
    category: 'employability',
    aspectId: 'inisiatif_kewirausahaan',
    aspectName: 'Keterampilan Inisiatif dan Kewirausahaan',
    topic: 'Efisiensi dan Perbaikan Alur Pencatatan Sampel',
    questionText: '7. Saat PKL, Anda melihat pencatatan sampel sering memakan waktu karena informasi yang sama ditulis berulang pada beberapa lembar. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Membuat contoh format pencatatan yang lebih ringkas lalu menunjukkan hasilnya kepada pembimbing untuk dipertimbangkan penggunaannya.',
      'B. Menggunakan format pribadi pada pekerjaan sendiri karena cara tersebut lebih cepat dan tetap menyimpan informasi yang diperlukan.',
      'C. Mengidentifikasi bagian yang berulang, mendiskusikan kebutuhan pengguna, lalu mengusulkan perbaikan yang tetap memenuhi prosedur pencatatan.',
      'D. Menyampaikan kepada rekan bahwa sistem pencatatan kurang efisien dan mengumpulkan pendapat mereka mengenai kemungkinan perubahan.',
      'E. Tetap mengikuti cara yang digunakan karena perubahan sistem pencatatan merupakan kewenangan pihak yang mengelola laboratorium.'
    ],
    scoringMap: { A: 4, B: 2, C: 5, D: 3, E: 1 },
    correctAnswer: 'C',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: C (Skor 5). Bobot: A=4, B=2, C=5, D=3, E=1.'
  },
  {
    id: 'nt-8',
    code: 'EMP-08',
    number: 8,
    category: 'employability',
    aspectId: 'inisiatif_kewirausahaan',
    aspectName: 'Keterampilan Inisiatif dan Kewirausahaan',
    topic: 'Penghematan dan Optimasi Bahan Habis Pakai',
    questionText: '8. Dalam kegiatan laboratorium, Anda melihat bahan habis pakai cukup sering terbuang meskipun sebagian penggunaan sebenarnya masih dapat dioptimalkan secara aman. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengurangi pemakaian pada bagian yang Anda kerjakan sendiri tanpa mengubah cara kerja anggota kelompok yang lain.',
      'B. Mencatat pola penggunaan bahan dan membahas kemungkinan penghematan dengan anggota kelompok sebelum mengusulkan perubahan lebih lanjut.',
      'C. Mengusulkan agar seluruh anggota segera mengurangi jumlah bahan pada kegiatan berikutnya agar penggunaan menjadi lebih hemat.',
      'D. Menyusun usulan penghematan berdasarkan kebutuhan kerja dan membahasnya dengan penanggung jawab sebelum perubahan diterapkan.',
      'E. Tetap mengikuti kebiasaan penggunaan yang ada sambil menunggu evaluasi resmi mengenai kebutuhan dan persediaan bahan laboratorium.'
    ],
    scoringMap: { A: 2, B: 4, C: 3, D: 5, E: 1 },
    correctAnswer: 'D',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: D (Skor 5). Bobot: A=2, B=4, C=3, D=5, E=1.'
  },
  {
    id: 'nt-9',
    code: 'EMP-09',
    number: 9,
    category: 'employability',
    aspectId: 'perencanaan_pengorganisasian',
    aspectName: 'Keterampilan Perencanaan dan Pengorganisasian',
    topic: 'Pengaturan Prioritas Tugas dengan Alat Bersama',
    questionText: '9. Pada satu hari PKL, Anda memiliki beberapa tugas dengan waktu penyelesaian berbeda dan dua tugas membutuhkan peralatan yang sama. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Menyelesaikan tugas yang paling mudah terlebih dahulu agar jumlah pekerjaan yang belum selesai dapat berkurang lebih cepat.',
      'B. Menentukan urutan berdasarkan tenggat, keterkaitan pekerjaan, dan ketersediaan alat kemudian menyusun jadwal pelaksanaan yang realistis.',
      'C. Mengerjakan tugas sesuai urutan ketika diberikan supaya tidak perlu mengubah rencana kerja yang sudah terbentuk sebelumnya.',
      'D. Menentukan pekerjaan yang paling mendesak terlebih dahulu kemudian menyesuaikan tugas lain dengan waktu dan alat yang tersedia.',
      'E. Membagi waktu secara sama pada setiap tugas agar seluruh pekerjaan mendapat porsi perhatian yang seimbang sepanjang kegiatan.'
    ],
    scoringMap: { A: 3, B: 5, C: 1, D: 4, E: 2 },
    correctAnswer: 'B',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: B (Skor 5). Bobot: A=3, B=5, C=1, D=4, E=2.'
  },
  {
    id: 'nt-10',
    code: 'EMP-10',
    number: 10,
    category: 'employability',
    aspectId: 'perencanaan_pengorganisasian',
    aspectName: 'Keterampilan Perencanaan dan Pengorganisasian',
    topic: 'Penyesuaian Jadwal Terhadap Perubahan Tenggat Waktu',
    questionText: '10. Jadwal kegiatan kelompok berubah karena salah satu kegiatan harus diselesaikan lebih awal daripada rencana semula. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Meninjau kembali jadwal kelompok dan mengubah urutan tugas dengan mempertimbangkan pekerjaan yang saling bergantung satu sama lain.',
      'B. Mengikuti jadwal lama sampai ada instruksi resmi karena perubahan mendadak dapat membingungkan anggota kelompok saat bekerja.',
      'C. Memprioritaskan kegiatan yang dipercepat dan membiarkan anggota lain menentukan sendiri penyesuaian tugas yang menjadi tanggung jawabnya.',
      'D. Menunda tugas yang kurang mendesak tanpa mengubah pembagian kerja yang sudah disepakati agar kelompok tetap bekerja seperti biasa.',
      'E. Menyusun ulang prioritas, membagi penyesuaian tugas, dan memastikan seluruh anggota memahami jadwal kerja yang telah diperbarui.'
    ],
    scoringMap: { A: 4, B: 2, C: 3, D: 1, E: 5 },
    correctAnswer: 'E',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: E (Skor 5). Bobot: A=4, B=2, C=3, D=1, E=5.'
  },
  {
    id: 'nt-11',
    code: 'EMP-11',
    number: 11,
    category: 'employability',
    aspectId: 'manajemen_diri',
    aspectName: 'Keterampilan Manajemen Diri',
    topic: 'Sikap Positif Menanggapi Masukan Pembimbing',
    questionText: '11. Pembimbing mengembalikan pekerjaan Anda karena terdapat beberapa bagian yang perlu diperbaiki, sementara Anda merasa sudah mengerjakannya dengan sungguh-sungguh. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mempelajari masukan, memastikan bagian yang belum jelas, lalu memperbaiki pekerjaan sesuai kebutuhan yang disampaikan pembimbing.',
      'B. Memperbaiki bagian yang ditandai tanpa membahas masukan lebih lanjut agar pekerjaan dapat segera diserahkan kembali.',
      'C. Meminta teman menilai pekerjaan terlebih dahulu untuk mengetahui apakah masukan pembimbing juga terlihat dari sudut pandang lain.',
      'D. Mencatat masukan yang diberikan dan menggunakan hal tersebut sebagai bahan memperbaiki cara kerja pada tugas berikutnya.',
      'E. Menjelaskan alasan Anda menggunakan cara tersebut sebelum memutuskan bagian mana yang memang perlu diperbaiki kembali.'
    ],
    scoringMap: { A: 5, B: 3, C: 1, D: 4, E: 2 },
    correctAnswer: 'A',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: A (Skor 5). Bobot: A=5, B=3, C=1, D=4, E=2.'
  },
  {
    id: 'nt-12',
    code: 'EMP-12',
    number: 12,
    category: 'employability',
    aspectId: 'manajemen_diri',
    aspectName: 'Keterampilan Manajemen Diri',
    topic: 'Menjaga Ketelitian Kerja saat Mengalami Kelelahan',
    questionText: '12. Menjelang akhir kegiatan, Anda mulai merasa lelah tetapi masih ada pekerjaan yang memerlukan ketelitian dan harus selesai hari itu. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengatur ulang urutan pekerjaan dan mengambil jeda singkat yang wajar sebelum menyelesaikan bagian yang memerlukan ketelitian tinggi.',
      'B. Meminta rekan mengambil alih bagian yang paling kritis karena kondisi lelah dapat memengaruhi kualitas pekerjaan yang dilakukan.',
      'C. Menilai kondisi diri, membahas pembagian atau waktu kerja bila diperlukan, lalu memilih langkah yang tetap menjaga kualitas hasil.',
      'D. Mempercepat pekerjaan yang tersisa agar seluruh tugas selesai sebelum konsentrasi menurun lebih jauh karena kelelahan.',
      'E. Melanjutkan pekerjaan dengan kecepatan biasa sambil lebih sering memeriksa hasil agar kesalahan dapat segera diketahui.'
    ],
    scoringMap: { A: 4, B: 2, C: 5, D: 1, E: 3 },
    correctAnswer: 'C',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: C (Skor 5). Bobot: A=4, B=2, C=5, D=1, E=3.'
  },
  {
    id: 'nt-13',
    code: 'EMP-13',
    number: 13,
    category: 'employability',
    aspectId: 'belajar',
    aspectName: 'Keterampilan Belajar',
    topic: 'Prosedur Belajar Mengoperasikan Alat Laboratorium Baru',
    questionText: '13. Anda diminta menggunakan perangkat laboratorium yang pernah dipelajari, tetapi belum pernah dioperasikan sendiri dalam situasi kerja. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengingat kembali praktik yang pernah dilakukan lalu mencoba mengoperasikan alat secara bertahap sambil memperhatikan respons alat.',
      'B. Menunggu sampai ada rekan yang berpengalaman agar Anda dapat mengikuti cara yang biasa mereka gunakan saat bekerja.',
      'C. Membaca petunjuk yang tersedia, mengamati prosedur, lalu mencoba setelah memperoleh informasi dasar yang diperlukan untuk bekerja.',
      'D. Mempelajari panduan, mengklarifikasi bagian penting kepada pihak yang kompeten, kemudian berlatih menggunakan alat sesuai prosedur.',
      'E. Meminta pembimbing melakukan pengoperasian pertama sementara Anda mencatat langkah-langkah yang dilakukan untuk dicoba kemudian.'
    ],
    scoringMap: { A: 3, B: 1, C: 4, D: 5, E: 2 },
    correctAnswer: 'D',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: D (Skor 5). Bobot: A=3, B=1, C=4, D=5, E=2.'
  },
  {
    id: 'nt-14',
    code: 'EMP-14',
    number: 14,
    category: 'employability',
    aspectId: 'belajar',
    aspectName: 'Keterampilan Belajar',
    topic: 'Peningkatan Efisiensi Berdasarkan Saran Pembimbing',
    questionText: '14. Setelah menyelesaikan sebuah tugas, pembimbing menjelaskan bahwa cara kerja Anda benar tetapi masih kurang efisien dibandingkan prosedur yang biasa digunakan. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mencatat metode yang disarankan dan mencoba menerapkannya pada pekerjaan berikutnya untuk melihat perbedaan hasil dan waktu.',
      'B. Meninjau kembali cara kerja, mempelajari alasan perbedaannya, lalu merencanakan perubahan yang sesuai pada pekerjaan berikutnya.',
      'C. Menggunakan cara pembimbing pada tugas berikutnya karena pengalaman pembimbing lebih banyak dan kemungkinan lebih tepat digunakan.',
      'D. Mempertahankan cara lama selama hasil akhirnya masih memenuhi ketentuan yang berlaku dan tidak menimbulkan masalah.',
      'E. Mendiskusikan saran tersebut dengan teman untuk mengetahui cara mana yang paling sering digunakan dalam pekerjaan serupa.'
    ],
    scoringMap: { A: 4, B: 5, C: 2, D: 1, E: 3 },
    correctAnswer: 'B',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: B (Skor 5). Bobot: A=4, B=5, C=2, D=1, E=3.'
  },
  {
    id: 'nt-15',
    code: 'EMP-15',
    number: 15,
    category: 'employability',
    aspectId: 'teknologi',
    aspectName: 'Keterampilan Teknologi',
    topic: 'Verifikasi dan Troubleshooting Rumus Spreadsheet',
    questionText: '15. Anda mengolah data hasil kegiatan menggunakan spreadsheet dan menemukan beberapa nilai tampak berbeda setelah rumus disalin ke baris lain. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengganti nilai yang berbeda secara manual agar tabel kembali konsisten dengan pola hasil pada baris lainnya.',
      'B. Membandingkan beberapa hasil perhitungan dan melanjutkan pekerjaan apabila selisih yang muncul masih terlihat relatif kecil.',
      'C. Memeriksa rumus, referensi sel, dan data sumber sebelum menggunakan hasil perhitungan tersebut untuk laporan akhir.',
      'D. Menghitung ulang nilai yang berbeda dengan kalkulator lalu mengganti hasil spreadsheet apabila hasil manual dianggap lebih tepat.',
      'E. Meminta rekan yang lebih terbiasa menggunakan spreadsheet memeriksa file sebelum Anda melakukan perubahan pada rumus atau data.'
    ],
    scoringMap: { A: 1, B: 3, C: 5, D: 2, E: 4 },
    correctAnswer: 'C',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: C (Skor 5). Bobot: A=1, B=3, C=5, D=2, E=4.'
  },
  {
    id: 'nt-16',
    code: 'EMP-16',
    number: 16,
    category: 'employability',
    aspectId: 'teknologi',
    aspectName: 'Keterampilan Teknologi',
    topic: 'Adaptasi Penggunaan Aplikasi Baru Pencatatan Lab',
    questionText: '16. Tempat PKL mulai menggunakan aplikasi baru untuk pencatatan hasil kerja. Anda memahami fungsi dasarnya tetapi belum terbiasa dengan seluruh menu. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Menggunakan fungsi yang sudah dipahami dan mencatat bagian yang masih perlu dipelajari sebelum memakai fitur yang lainnya.',
      'B. Tetap menggunakan cara pencatatan lama sampai Anda memahami seluruh fungsi aplikasi baru dan merasa benar-benar siap.',
      'C. Mengikuti cara rekan lain menggunakan aplikasi dan menyesuaikan langkah Anda dengan kebiasaan yang mereka lakukan sehari-hari.',
      'D. Mempelajari panduan, mencoba fitur yang relevan secara terkontrol, dan memastikan data tersimpan sesuai prosedur kerja.',
      'E. Meminta rekan mendampingi penggunaan awal lalu mencoba sendiri setelah memahami alur kerja dasar pada aplikasi tersebut.'
    ],
    scoringMap: { A: 4, B: 2, C: 1, D: 5, E: 3 },
    correctAnswer: 'D',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: D (Skor 5). Bobot: A=4, B=2, C=1, D=5, E=3.'
  },
  {
    id: 'nt-17',
    code: 'EMP-17',
    number: 17,
    category: 'employability',
    aspectId: 'k3',
    aspectName: 'Keselamatan dan Kesehatan Kerja',
    topic: 'Respons Terhadap Pengabaian APD Keselamatan',
    questionText: '17. Saat kegiatan laboratorium berlangsung, seorang rekan melepas perlengkapan keselamatan karena merasa pekerjaan hanya akan berlangsung sebentar. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Mengingatkan rekan mengenai risiko dan meminta penggunaan perlengkapan yang sesuai sebelum pekerjaan tersebut dilanjutkan kembali.',
      'B. Mengingatkan secara singkat, kemudian membiarkan keputusan berikutnya menjadi tanggung jawab rekan tersebut selama bekerja.',
      'C. Menyampaikan kondisi tersebut kepada anggota kelompok lain agar mereka ikut memperhatikan keselamatan rekan selama kegiatan.',
      'D. Menghentikan keterlibatan pada pekerjaan terkait dan mengoordinasikan tindakan sesuai aturan keselamatan yang berlaku di laboratorium.',
      'E. Membiarkan pekerjaan selesai terlebih dahulu lalu mengingatkan rekan agar tindakan serupa tidak diulangi pada kegiatan berikutnya.'
    ],
    scoringMap: { A: 5, B: 3, C: 2, D: 4, E: 1 },
    correctAnswer: 'A',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: A (Skor 5). Bobot: A=5, B=3, C=2, D=4, E=1.'
  },
  {
    id: 'nt-18',
    code: 'EMP-18',
    number: 18,
    category: 'employability',
    aspectId: 'k3',
    aspectName: 'Keselamatan dan Kesehatan Kerja',
    topic: 'Pelaporan Insiden Hampir Celaka (Near Miss)',
    questionText: '18. Setelah kegiatan selesai, Anda mengetahui telah terjadi kejadian hampir celaka yang tidak menimbulkan cedera maupun kerusakan. Tindakan yang paling mungkin Anda lakukan adalah ...',
    type: 'multiple_choice',
    options: [
      'A. Menceritakan kejadian tersebut kepada teman agar semua anggota menjadi lebih berhati-hati ketika melakukan kegiatan yang serupa.',
      'B. Menyampaikan kejadian kepada pembimbing dan memberikan informasi yang diperlukan agar tindak lanjut dapat ditentukan secara tepat.',
      'C. Tidak melaporkannya karena kejadian tersebut tidak menimbulkan cedera, kerusakan, atau gangguan terhadap hasil pekerjaan.',
      'D. Mencatat kejadian untuk pengingat pribadi dan melaporkannya apabila kondisi yang sama kembali terjadi pada kegiatan berikutnya.',
      'E. Melaporkan kejadian, menjelaskan kondisi yang terjadi, dan mendukung pencatatan serta tindak lanjut sesuai prosedur yang berlaku.'
    ],
    scoringMap: { A: 2, B: 4, C: 1, D: 3, E: 5 },
    correctAnswer: 'E',
    points: 5,
    maxScore: 5,
    rubricGuide: 'Respons Paling Profesional: E (Skor 5). Bobot: A=2, B=4, C=1, D=3, E=5.'
  }
];

export const INITIAL_NON_TEST_PACKAGE: QuestionPackage = {
  id: 'pkg-employability-18',
  code: 'PKG-EMP-18',
  title: 'Instrumen Non-Tes Employability Skills Siswa SMK Kimia (18 Butir Situasional)',
  description: 'Instrumen asesmen non-tes pengukuran 9 aspek employability skills melalui pilihan respons situasional A–E (skor 1–5 per butir, total skor 18–90).',
  category: 'employability',
  durationMinutes: 45,
  totalQuestions: 18,
  questions: NON_TEST_QUESTIONS_18,
  isActive: true,
  createdAt: '2025-02-15',
  createdBy: 'Tim Pengembangan Kurikulum Vokasi SMK'
};

export const DEFAULT_EMPLOYABILITY_PACKAGE = INITIAL_NON_TEST_PACKAGE;

export interface AspectScoreResult {
  aspectId: string;
  aspectName: string;
  rawScore: number; // 2 - 10
  maxRawScore: number; // 10
  percentage: number; // 0 - 100%
  category: 'Sangat baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat kurang';
  interpretation: string;
  industryTargetPercent: number;
  gapPercent: number; // percentage - industryTargetPercent
}

export interface EmployabilityEvaluationResult {
  totalRawScore: number; // 18 - 90
  maxTotalRawScore: number; // 90
  finalPercentage: number; // 0 - 100%
  category: 'Sangat tinggi' | 'Tinggi' | 'Sedang' | 'Rendah' | 'Sangat rendah';
  interpretation: string;
  aspectResults: AspectScoreResult[];
  radarData: Array<{
    aspect: string;
    fullName: string;
    Student: number;
    Target: number;
    rawScore: string;
  }>;
}

export function calculateEmployabilityScore(
  answersState: Record<string, any>,
  questions: QuestionItem[] = NON_TEST_QUESTIONS_18
): EmployabilityEvaluationResult {
  const aspectScoresMap: Record<string, { rawSum: number; count: number }> = {};

  EMPLOYABILITY_ASPECTS.forEach(asp => {
    aspectScoresMap[asp.id] = { rawSum: 0, count: 0 };
  });

  let totalRawScore = 0;

  questions.forEach(q => {
    const nonTestQ = NON_TEST_QUESTIONS_18.find(nq => nq.id === q.id || nq.code === q.code || nq.number === q.number) || (q as NonTestQuestionItem);
    const aspectId = nonTestQ.aspectId || 'komunikasi';

    const studentAns = answersState[q.id];
    let selectedOptionLetter = '';

    if (studentAns) {
      const opt = studentAns.selectedOption || studentAns.answer || '';
      if (typeof opt === 'string') {
        const match = opt.match(/^([A-E])[.s]/);
        if (match) {
          selectedOptionLetter = match[1];
        } else if (['A', 'B', 'C', 'D', 'E'].includes(opt.trim().toUpperCase())) {
          selectedOptionLetter = opt.trim().toUpperCase();
        } else if (opt.startsWith('A.')) selectedOptionLetter = 'A';
        else if (opt.startsWith('B.')) selectedOptionLetter = 'B';
        else if (opt.startsWith('C.')) selectedOptionLetter = 'C';
        else if (opt.startsWith('D.')) selectedOptionLetter = 'D';
        else if (opt.startsWith('E.')) selectedOptionLetter = 'E';
      }
    }

    const map = nonTestQ.scoringMap || { A: 1, B: 2, C: 3, D: 4, E: 5 };
    // Jika siswa tidak menjawab butir soal, skor bernilai 0 mutlak (bukan otomatis dapat poin)
    const itemScore = selectedOptionLetter ? (map[selectedOptionLetter] !== undefined ? map[selectedOptionLetter] : 0) : 0;

    totalRawScore += itemScore;

    if (!aspectScoresMap[aspectId]) {
      aspectScoresMap[aspectId] = { rawSum: 0, count: 0 };
    }
    aspectScoresMap[aspectId].rawSum += itemScore;
    aspectScoresMap[aspectId].count += 1;
  });

  // Pedoman Skor Per Aspek (Maks 10 Poin, Min 0 Poin jika tidak dijawab)
  const aspectResults: AspectScoreResult[] = EMPLOYABILITY_ASPECTS.map(asp => {
    const data = aspectScoresMap[asp.id] || { rawSum: 0, count: 0 };
    const rawScore = Math.max(0, Math.min(10, data.rawSum));
    const percentage = Math.round((rawScore / 10) * 100);

    let category: AspectScoreResult['category'] = 'Baik';
    let interpretation = '';

    if (rawScore === 0) {
      category = 'Sangat kurang';
      interpretation = 'Siswa belum memberikan respon pada butir soal aspek ini (soal tidak dijawab).';
    } else if (rawScore >= 9) {
      category = 'Sangat baik';
      interpretation = 'Siswa menunjukkan penguasaan aspek employability yang sangat kuat dan konsisten dalam situasi kerja.';
    } else if (rawScore >= 7) {
      category = 'Baik';
      interpretation = 'Siswa menunjukkan keterampilan kerja yang baik, tetapi masih dapat ditingkatkan pada beberapa situasi tertentu.';
    } else if (rawScore >= 5) {
      category = 'Cukup';
      interpretation = 'Siswa sudah memiliki dasar keterampilan kerja, tetapi masih memerlukan pembiasaan dan penguatan.';
    } else if (rawScore >= 3) {
      category = 'Kurang';
      interpretation = 'Siswa belum menunjukkan keterampilan kerja yang memadai dan membutuhkan pendampingan.';
    } else {
      category = 'Sangat kurang';
      interpretation = 'Siswa menunjukkan kesenjangan employability yang besar dan memerlukan pembinaan intensif.';
    }

    return {
      aspectId: asp.id,
      aspectName: asp.name,
      rawScore,
      maxRawScore: 10,
      percentage,
      category,
      interpretation,
      industryTargetPercent: asp.industryTargetPercent,
      gapPercent: percentage - asp.industryTargetPercent
    };
  });

  // Pedoman Skor Total Employability Skills (Maks 90, 0 jika tidak ada respon)
  const finalPercentage = Math.round((totalRawScore / 90) * 100);

  let category: EmployabilityEvaluationResult['category'] = 'Tinggi';
  let interpretation = '';

  if (totalRawScore === 0) {
    category = 'Sangat rendah';
    interpretation = 'Siswa tidak menjawab butir asesmen employability (Skor 0 Poin / 0%). Seluruh butir berstatus tidak dijawab.';
  } else if (totalRawScore >= 73) {
    category = 'Sangat tinggi';
    interpretation = 'Siswa memiliki employability skills yang sangat baik dan menunjukkan kesiapan tinggi untuk menghadapi lingkungan kerja atau magang.';
  } else if (totalRawScore >= 59) {
    category = 'Tinggi';
    interpretation = 'Siswa memiliki employability skills yang baik, tetapi masih memerlukan penguatan pada beberapa aspek tertentu.';
  } else if (totalRawScore >= 46) {
    category = 'Sedang';
    interpretation = 'Siswa memiliki employability skills yang cukup, tetapi masih membutuhkan pembinaan sebelum memasuki dunia kerja atau magang.';
  } else if (totalRawScore >= 24) {
    category = 'Rendah';
    interpretation = 'Siswa belum memiliki employability skills yang memadai dan memerlukan pendampingan lebih intensif.';
  } else {
    category = 'Sangat rendah';
    interpretation = 'Siswa memiliki kesenjangan employability skills yang besar dan membutuhkan pembekalan dasar secara menyeluruh.';
  }

  const radarData = aspectResults.map(ar => ({
    aspect: ar.aspectName.replace('Keterampilan ', ''),
    fullName: ar.aspectName,
    Student: ar.percentage,
    Target: ar.industryTargetPercent,
    rawScore: `${ar.rawScore}/10`
  }));

  return {
    totalRawScore,
    maxTotalRawScore: 90,
    finalPercentage,
    category,
    interpretation,
    aspectResults,
    radarData
  };
}
