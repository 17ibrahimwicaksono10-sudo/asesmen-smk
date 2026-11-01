import { QuestionPackage, QuestionItem, RubricComponent } from '../types';

// ==========================================
// 6 STIMULUS KONTEKSTUAL LABORATORIUM
// ==========================================

export const STIMULUS_1_K3LH = `Laboratorium QC melakukan kegiatan persiapan larutan dan analisis sampel. Bahan kimia yang digunakan meliputi NaOH padat, HNO₃ pekat, etanol 96%, serta larutan yang mengandung ion Cu²⁺. Dalam kegiatan persiapan larutan, NaOH padat ditimbang menggunakan cawan petri yang bagian atasnya dilapisi plastik.
Berdasarkan informasi keselamatan bahan, NaOH bersifat korosif, HNO₃ merupakan asam kuat dan oksidator, etanol bersifat mudah terbakar, sedangkan limbah yang mengandung ion Cu²⁺ tidak boleh dibuang langsung ke saluran air.
• seorang siswa menimbang NaOH tanpa menggunakan kacamata keselamatan;
• botol HNO₃ ditempatkan berdekatan dengan etanol;
• larutan asam mengenai tangan seorang siswa;
• setelah analisis terdapat limbah yang mengandung Cu²⁺ dan sisa larutan asam.
Gunakan informasi tersebut untuk menjawab soal nomor 1-4.`;

export const STIMULUS_2_PERSIAPAN = `Laboratorium QC menyiapkan 250,0 mL larutan NaCl 0,100 M sebagai larutan kerja. Dalam pembuatannya, petugas laboratorium menimbang NaCl padat menggunakan neraca analitik, melarutkannya dengan akuades, kemudian memindahkan larutan secara kuantitatif ke dalam labu ukur 250,0 mL dan menetapkan volumenya hingga tanda batas.
Dari larutan kerja tersebut, selanjutnya dibuat 50,00 mL larutan NaCl 0,020 M melalui proses pengenceran.
Gunakan informasi tersebut untuk menjawab soal nomor 5-8.`;

export const STIMULUS_3_STOIKIOMETRI = `Laboratorium QC menyiapkan beberapa larutan kerja untuk kegiatan analisis kuantitatif.
1. Sebanyak 250,0 mL larutan Na₂CO₃ 0,1000 N akan dibuat dari Na₂CO₃ murni. Diketahui Mr Na₂CO₃ = 106,0 g/mol dan dalam reaksi asam-basa bobot ekuivalen Na₂CO₃ adalah 53,0 g/ekuivalen.
2. Sebanyak 250,0 mL larutan HCl 0,100 N akan dibuat dari larutan stok HCl 1,00 N.
3. Sebanyak 250,0 mL larutan NaOH 0,200 M akan dibuat menggunakan NaOH teknis dengan kemurnian 80,0%. Diketahui Mr NaOH = 40,0 g/mol. Larutan tersebut selanjutnya distandardisasi sebelum digunakan.
4. Hasil standardisasi tiga larutan NaOH masing-masing adalah 0,094 N; 0,100 N; dan 0,104 N. SOP laboratorium menetapkan bahwa larutan kerja dapat digunakan apabila konsentrasinya berada pada rentang 0,098-0,102 N.
Gunakan informasi tersebut untuk menjawab soal nomor 9-12.`;

export const STIMULUS_4_VOLUMETRI = `Stimulus 4 - Titrasi Argentometri
Laboratorium QC melakukan penentuan kadar ion klorida (Cl⁻) dalam sampel air proses menggunakan titrasi argentometri.
Sebanyak 25,00 mL sampel dipipet ke dalam erlenmeyer kemudian ditambahkan indikator kromat sesuai prosedur. Sampel dititrasi menggunakan larutan AgNO₃ 0,0500 M. Selama penambahan titran, ion Ag⁺ bereaksi dengan ion Cl⁻ sehingga terbentuk endapan putih AgCl yang dapat diamati secara visual.
Reaksi yang terjadi adalah:
Ag⁺(aq) + Cl⁻(aq) → AgCl(s)
Titrasi dilanjutkan hingga terjadi perubahan warna indikator yang menunjukkan tercapainya titik akhir titrasi. Pada salah satu pengujian diperlukan 12,40 mL AgNO₃ 0,0500 M hingga titik akhir tercapai.
Hasil empat pengulangan terhadap sampel yang sama adalah sebagai berikut.
Pengujian 1: 12,40 mL
Pengujian 2: 12,45 mL
Pengujian 3: 12,42 mL
Pengujian 4: 14,80 mL
Gunakan informasi tersebut untuk menjawab soal nomor 13-16.`;

export const STIMULUS_5_INSTRUMENTASI = `Laboratorium QC melakukan dua jenis pengujian.
Pengujian pertama dilakukan untuk menentukan pH sampel limbah cair secara kuantitatif sebelum proses netralisasi.
Pengujian kedua dilakukan untuk menentukan absorbansi larutan berwarna menggunakan spektrofotometer UV-Vis.
Sebelum pengukuran sampel, pH meter perlu dikalibrasi menggunakan larutan buffer yang sesuai. Pada pengukuran UV-Vis, salah satu sampel menunjukkan nilai absorbansi jauh lebih tinggi daripada pengukuran sebelumnya. Setelah dilakukan pemeriksaan ditemukan sidik jari pada sisi optik kuvet dan gelembung udara pada sampel di jalur cahaya.
Gunakan informasi tersebut untuk menjawab soal nomor 17-20.`;

export const STIMULUS_6_MANAJEMEN_MUTU = `Laboratorium QC melakukan pengujian rutin. Pada pemeriksaan dokumen dan hasil analisis ditemukan beberapa kondisi berikut.
1. Botol larutan NaOH hanya diberi tulisan “NaOH”, tanpa konsentrasi, tanggal pembuatan, maupun identitas pembuat.
2. Hasil pengukuran suatu sampel menunjukkan pH 4,20, tetapi seorang siswa mengubah data menjadi pH 7,00 karena beranggapan bahwa sampel yang jernih seharusnya netral.
3. Laporan analisis tidak mencantumkan kode sampel, metode analisis, tanggal pengujian, dan identitas analis.
4. Hasil tiga pengulangan pengujian volumetri adalah 15,10 mL; 15,15 mL; dan 22,40 mL.
Gunakan informasi tersebut untuk menjawab soal nomor 21-24.`;

// ==========================================
// 24 SOAL INSTRUMEN KEMAMPUAN TEKNIS KIMIA
// TOTAL SKOR MENTAH MAKSIMUM = 65
// ==========================================

export const REVISED_QUESTIONS_24: QuestionItem[] = [
  // ----------------------------------------------------
  // DIMENSI 1: K3LH DAN REGULASI (Soal 1–4, Skor Maks = 10)
  // ----------------------------------------------------
  {
    id: 'q-k3lh-1',
    code: 'K3LH-01',
    number: 1,
    category: 'teknis_kimia',
    dimensionId: 'k3lh',
    dimensionName: 'K3LH dan Regulasi',
    topic: 'Prinsip APD dan Penanganan Bahan Kimia Berbahaya',
    indicator: 'Menerapkan prinsip penggunaan APD dan penanganan bahan kimia berdasarkan karakteristik bahaya bahan',
    context: 'NaOH, HNO₃, etanol, informasi keselamatan bahan',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_1_K3LH,
    questionText: 'Pilihlah dua tindakan yang paling sesuai dengan prinsip K3LH.',
    type: 'complex_mcq',
    maxScore: 2,
    points: 2,
    options: [
      'A. Menggunakan jas laboratorium, sarung tangan, dan kacamata keselamatan saat menimbang NaOH.',
      'B. Menimbang NaOH tanpa kacamata keselamatan karena bahan tersebut berbentuk padatan.',
      'C. Membaca label dan informasi keselamatan bahan sebelum melakukan penimbangan NaOH.',
      'D. Mendekatkan wajah ke wadah HNO₃ untuk mengenali karakteristik bahan sebelum digunakan.'
    ],
    correctAnswers: [
      'A. Menggunakan jas laboratorium, sarung tangan, dan kacamata keselamatan saat menimbang NaOH.',
      'C. Membaca label dan informasi keselamatan bahan sebelum melakukan penimbangan NaOH.'
    ],
    rubricGuide: 'Siswa memilih tepat dua alternatif; setiap pilihan benar = 1 (A = Benar, C = Benar); skor maksimum = 2.'
  },
  {
    id: 'q-k3lh-2',
    code: 'K3LH-02',
    number: 2,
    category: 'teknis_kimia',
    dimensionId: 'k3lh',
    dimensionName: 'K3LH dan Regulasi',
    topic: 'Tindakan Awal Paparan Bahan Kimia',
    indicator: 'Menentukan tindakan awal yang tepat ketika terjadi paparan bahan kimia pada pekerja',
    context: 'Paparan larutan asam pada kulit',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_1_K3LH,
    questionText: 'Seorang siswa terkena percikan larutan asam pada kulit tangannya. Tindakan awal yang paling tepat adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. Mengelap bagian yang terkena menggunakan tisu hingga kering',
      'B. Menetralkan bagian yang terkena menggunakan larutan basa pekat',
      'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian',
      'D. Menunggu hingga rasa perih pada bagian yang terkena berkurang',
      'E. Menutup bagian yang terkena menggunakan sarung tangan pelindung'
    ],
    correctAnswer: 'C. Membilas bagian yang terkena dengan air mengalir dan segera melaporkan kejadian',
    rubricGuide: 'Skor maks 1. Memilih C = 1 poin; jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-k3lh-3',
    code: 'K3LH-03',
    number: 3,
    category: 'teknis_kimia',
    dimensionId: 'k3lh',
    dimensionName: 'K3LH dan Regulasi',
    topic: 'Prinsip Penyimpanan dan Kompatibilitas Bahan Kimia',
    indicator: 'Menentukan prinsip penyimpanan bahan kimia berdasarkan sifat dan kompatibilitasnya',
    context: 'HNO₃, etanol, NaOH, larutan Cu²⁺',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_1_K3LH,
    questionText: 'Pasangkan bahan pada Kolom A dengan prinsip penyimpanan yang paling tepat pada Kolom B.',
    type: 'matching',
    maxScore: 4,
    points: 4,
    matchingColumnA: [
      { id: 'm-k3lh-a', columnAText: 'A. HNO₃ pekat', correctMatch: '3. Disimpan sebagai bahan asam pengoksidasi dan dipisahkan dari bahan organik atau mudah terbakar' },
      { id: 'm-k3lh-b', columnAText: 'B. Etanol 96%', correctMatch: '1. Disimpan pada area bahan mudah terbakar dan dijauhkan dari sumber nyala serta oksidator' },
      { id: 'm-k3lh-c', columnAText: 'C. NaOH padat', correctMatch: '2. Disimpan tertutup rapat pada tempat kering dan dipisahkan dari kelompok asam' },
      { id: 'm-k3lh-d', columnAText: 'D. Larutan yang mengandung Cu²⁺', correctMatch: '4. Disimpan dalam wadah berlabel dan dicegah agar tidak terlepas ke lingkungan' }
    ],
    matchingColumnB: [
      '1. Disimpan pada area bahan mudah terbakar dan dijauhkan dari sumber nyala serta oksidator',
      '2. Disimpan tertutup rapat pada tempat kering dan dipisahkan dari kelompok asam',
      '3. Disimpan sebagai bahan asam pengoksidasi dan dipisahkan dari bahan organik atau mudah terbakar',
      '4. Disimpan dalam wadah berlabel dan dicegah agar tidak terlepas ke lingkungan'
    ],
    rubricGuide: 'Skor maks 4. Setiap pasangan tepat = 1 poin (A->3, B->1, C->2, D->4).'
  },
  {
    id: 'q-k3lh-4',
    code: 'K3LH-04',
    number: 4,
    category: 'teknis_kimia',
    dimensionId: 'k3lh',
    dimensionName: 'K3LH dan Regulasi',
    topic: 'Pengelolaan Limbah Berbahaya (B3) Logam Berat & Asam',
    indicator: 'Mengevaluasi cara penanganan dan pengelolaan limbah kimia berdasarkan risiko terhadap keselamatan dan lingkungan',
    context: 'Limbah Cu²⁺ dan limbah asam',
    cognitiveLevel: 'C5',
    stimulus: STIMULUS_1_K3LH,
    questionText: 'Setelah pengujian selesai, seorang siswa mengusulkan agar limbah yang mengandung ion Cu²⁺ dan sisa larutan asam diencerkan dengan air kemudian langsung dibuang ke wastafel.\nEvaluasilah tindakan tersebut dan jelaskan penanganan yang seharusnya dilakukan berdasarkan prinsip keselamatan dan pengelolaan limbah laboratorium.',
    type: 'essay',
    maxScore: 3,
    points: 3,
    sampleAnswer: '1. Keputusan: Usulan siswa tidak dapat diterima, limbah yang mengandung Cu²⁺ dan sisa larutan asam tidak boleh langsung dibuang ke wastafel hanya dengan pengenceran.\n2. Alasan: Pengenceran tidak menghilangkan keberadaan Cu²⁺ sebagai logam berat maupun potensi bahaya toksisitas dan sifat korosif asam terhadap keselamatan dan lingkungan.\n3. Tindak lanjut: Limbah harus ditampung dalam wadah penampung limbah khusus yang sesuai, dipisahkan berdasarkan kompatibilitas bahan, diberi label identitas limbah, dan dikelola sesuai SOP pengelolaan limbah laboratorium.',
    rubricGuide: 'Skor maks 3. Komponen: (1) Keputusan menolak pembuangan = 1; (2) Alasan pengenceran tidak hilangkan bahaya Cu2+/asam = 1; (3) Tindak lanjut penampungan wadah berlabel sesuai SOP = 1.',
    rubricComponents: [
      { name: 'Keputusan', maxPoints: 1, criteria: 'Menyatakan bahwa limbah yang mengandung Cu²⁺ dan sisa larutan asam tidak boleh langsung dibuang ke wastafel hanya dengan pengenceran.' },
      { name: 'Alasan', maxPoints: 1, criteria: 'Menjelaskan bahwa pengenceran tidak menghilangkan keberadaan Cu²⁺ maupun potensi bahaya limbah terhadap keselamatan dan lingkungan.' },
      { name: 'Tindak lanjut', maxPoints: 1, criteria: 'Menjelaskan bahwa limbah harus ditampung dalam wadah yang sesuai, dipisahkan/diberi label, dan dikelola sesuai SOP pengelolaan limbah laboratorium.' }
    ]
  },

  // ----------------------------------------------------
  // DIMENSI 2: PERSIAPAN ANALISIS (Soal 5–8, Skor Maks = 10)
  // ----------------------------------------------------
  {
    id: 'q-pa-5',
    code: 'PA-01',
    number: 5,
    category: 'teknis_kimia',
    dimensionId: 'persiapan_analisis',
    dimensionName: 'Persiapan Analisis',
    topic: 'Pemilihan Alat Volumetrik Presisi',
    indicator: 'Memilih alat volumetrik yang sesuai berdasarkan volume dan ketelitian yang dibutuhkan',
    context: 'Pengambilan 10,00 mL larutan NaCl',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_2_PERSIAPAN,
    questionText: 'Untuk mengambil secara tepat 10,00 mL larutan NaCl 0,100 M dalam proses pengenceran, alat yang paling tepat digunakan adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. Gelas ukur 10 ml',
      'B. Gelas beker 25 ml',
      'C. Pipet tetes',
      'D. Pipet volumetrik 10 ml',
      'E. Buret 50 ml'
    ],
    correctAnswer: 'D. Pipet volumetrik 10 ml',
    rubricGuide: 'Skor maks 1. Memilih D (Pipet volumetrik 10 ml) = 1 poin; jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-pa-6',
    code: 'PA-02',
    number: 6,
    category: 'teknis_kimia',
    dimensionId: 'persiapan_analisis',
    dimensionName: 'Persiapan Analisis',
    topic: 'Prosedur Baku Pembuatan Larutan dalam Labu Ukur',
    indicator: 'Menerapkan prosedur pembuatan larutan yang benar untuk menjamin konsentrasi sesuai target',
    context: 'Pembuatan larutan NaCl dalam labu ukur',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_2_PERSIAPAN,
    questionText: 'Pilihlah dua tindakan yang paling tepat dalam pembuatan larutan.',
    type: 'complex_mcq',
    maxScore: 2,
    points: 2,
    options: [
      'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
      'B. Membilas wadah pelarutan dengan akuades, tetapi membuang hasil bilasan sebelum larutan dipindahkan ke dalam labu ukur.',
      'C. Mengisi labu ukur hingga melewati tanda batas kemudian mengeluarkan sebagian larutan sampai tepat tanda batas.',
      'D. Membaca bagian bawah meniskus sejajar dengan mata ketika menetapkan volume akhir larutan jernih.'
    ],
    correctAnswers: [
      'A. Melarutkan seluruh NaCl terlebih dahulu sebelum menetapkan volume akhir dalam labu ukur.',
      'D. Membaca bagian bawah meniskus sejajar dengan mata ketika menetapkan volume akhir larutan jernih.'
    ],
    rubricGuide: 'Siswa memilih tepat dua alternatif; setiap pilihan benar = 1 (A = Benar, D = Benar); skor maksimum = 2.'
  },
  {
    id: 'q-pa-7',
    code: 'PA-03',
    number: 7,
    category: 'teknis_kimia',
    dimensionId: 'persiapan_analisis',
    dimensionName: 'Persiapan Analisis',
    topic: 'Analisis Hubungan Kesalahan Prosedur dan Hasil Uji',
    indicator: 'Menganalisis hubungan antara kesalahan prosedur persiapan dengan akibat terhadap hasil analisis',
    context: 'Pemindahan kuantitatif, meniskus, kontaminasi, volume akhir',
    cognitiveLevel: 'C4',
    stimulus: STIMULUS_2_PERSIAPAN,
    questionText: 'Pasangkan kesalahan pada Kolom A dengan akibat yang paling mungkin terjadi pada Kolom B.',
    type: 'matching',
    maxScore: 4,
    points: 4,
    matchingColumnA: [
      { id: 'm-pa-a', columnAText: 'A. Sebagian larutan tertinggal pada gelas beker ketika dipindahkan', correctMatch: '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil' },
      { id: 'm-pa-b', columnAText: 'B. Volume akhir melewati tanda batas labu ukur', correctMatch: '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan' },
      { id: 'm-pa-c', columnAText: 'C. Menentukan meniskus dengan posisi mata terlalu tinggi', correctMatch: '3. Menimbulkan kesalahan paralaks' },
      { id: 'm-pa-d', columnAText: 'D. Menggunakan pipet volumetrik yang terkontaminasi larutan lain', correctMatch: '4. Komposisi atau konsentrasi larutan dapat berubah' }
    ],
    matchingColumnB: [
      '1. Volume larutan menjadi lebih besar daripada volume yang ditetapkan',
      '2. Jumlah zat terlarut yang masuk ke labu ukur menjadi lebih kecil',
      '3. Menimbulkan kesalahan paralaks',
      '4. Komposisi atau konsentrasi larutan dapat berubah'
    ],
    rubricGuide: 'Skor maks 4. Setiap pasangan tepat = 1 poin (A->2, B->1, C->3, D->4).'
  },
  {
    id: 'q-pa-8',
    code: 'PA-04',
    number: 8,
    category: 'teknis_kimia',
    dimensionId: 'persiapan_analisis',
    dimensionName: 'Persiapan Analisis',
    topic: 'Evaluasi Prosedur dan Urutan Kerja Pembuatan Larutan',
    indicator: 'Mengevaluasi prosedur pembuatan larutan dan menyusun urutan kerja yang tepat',
    context: 'Pembuatan larutan NaCl 0,100 M',
    cognitiveLevel: 'C5',
    stimulus: STIMULUS_2_PERSIAPAN,
    questionText: 'Seorang siswa menimbang NaCl kemudian memasukkannya ke dalam labu ukur 250,0 mL. Akuades ditambahkan hingga tanda batas ketika masih terdapat sebagian kristal NaCl yang belum larut. Labu kemudian dikocok hingga seluruh kristal NaCl larut. Setelah itu, siswa bermaksud langsung menggunakan larutan tersebut.\nEvaluasilah prosedur tersebut dan jelaskan tindakan yang seharusnya dilakukan setelah seluruh NaCl larut agar volume dan konsentrasi larutan sesuai target.',
    type: 'essay',
    maxScore: 3,
    points: 3,
    sampleAnswer: '1. Evaluasi: Prosedur tersebut tidak tepat dan larutan belum seharusnya langsung digunakan sebelum ketepatan volume diperiksa kembali setelah seluruh NaCl larut.\n2. Alasan/analisis: Penambahan pelarut saat kristal belum larut dapat menyebabkan kontraksi volume saat kristal melarut, sehingga volume akhir cairan berpotensi turun di bawah tanda batas.\n3. Tindak lanjut: Periksa kembali posisi miniskus terhadap tanda batas setelah seluruh NaCl larut sempurna, lakukan penyesuaian volume dengan menambah akuades tetes demi tetes sampai tepat tanda batas jika diperlukan, kemudian homogenkan larutan sebelum digunakan.',
    rubricGuide: 'Skor maks 3. Komponen: (1) Evaluasi belum seharusnya langsung digunakan = 1; (2) Alasan perlunya periksa meniskus/volume setelah larut = 1; (3) Tindak lanjut penyesuaian hingga tanda batas & homogenisasi = 1.',
    rubricComponents: [
      { name: 'Evaluasi', maxPoints: 1, criteria: 'Menyatakan bahwa larutan belum seharusnya langsung digunakan sebelum ketepatan volume diperiksa kembali setelah seluruh NaCl larut.' },
      { name: 'Alasan/analisis', maxPoints: 1, criteria: 'Menjelaskan perlunya memeriksa kembali posisi meniskus/volume terhadap tanda batas setelah seluruh NaCl larut.' },
      { name: 'Tindak lanjut', maxPoints: 1, criteria: 'Menyesuaikan volume hingga tanda batas bila diperlukan, kemudian menghomogenkan larutan sebelum digunakan.' }
    ]
  },

  // ----------------------------------------------------
  // DIMENSI 3: STOIKIOMETRI TERAPAN (Soal 9–12, Skor Maks = 10)
  // ----------------------------------------------------
  {
    id: 'q-st-9',
    code: 'ST-01',
    number: 9,
    category: 'teknis_kimia',
    dimensionId: 'stoikiometri',
    dimensionName: 'Stoikiometri Terapan',
    topic: 'Perhitungan Massa Bahan Baku Standar Primer',
    indicator: 'Menghitung massa bahan yang diperlukan berdasarkan konsentrasi normalitas dan volume larutan',
    context: 'Na₂CO₃ murni, BE = 53,0 g/ekuivalen',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_3_STOIKIOMETRI,
    questionText: 'Massa Na₂CO₃ yang diperlukan untuk membuat 250,0 mL larutan Na₂CO₃ 0,1000 N adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. 0,530 g',
      'B. 1,060 g',
      'C. 1,325 g',
      'D. 2,650 g',
      'E. 5,300 g'
    ],
    correctAnswer: 'C. 1,325 g',
    rubricGuide: 'Skor maks 1. Memilih C = 1 poin (m = N x V x BE = 0,1000 x 0,2500 x 53,0 = 1,325 g); jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-st-10',
    code: 'ST-02',
    number: 10,
    category: 'teknis_kimia',
    dimensionId: 'stoikiometri',
    dimensionName: 'Stoikiometri Terapan',
    topic: 'Perhitungan Volume Pengenceran Larutan Asam',
    indicator: 'Menghitung volume larutan stok yang diperlukan dalam proses pengenceran',
    context: 'HCl 1,00 N menjadi HCl 0,100 N',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_3_STOIKIOMETRI,
    questionText: 'Laboratorium QC akan menyiapkan 250,0 mL larutan HCl 0,100 N dari larutan stok HCl 1,00 N.\nTentukan volume larutan stok HCl yang diperlukan. Tunjukkan proses perhitungan yang digunakan.',
    type: 'essay',
    maxScore: 3,
    points: 3,
    sampleAnswer: '1. Rumus/prinsip: Menggunakan hubungan pengenceran N₁ × V₁ = N₂ × V₂.\n2. Proses perhitungan: 1,00 N × V₁ = 0,100 N × 250,0 mL => V₁ = (0,100 × 250,0) / 1,00 = 25,0 mL.\n3. Hasil akhir: Volume larutan stok HCl yang diperlukan adalah 25,0 mL.',
    rubricGuide: 'Skor maks 3. Komponen: (1) Rumus/prinsip N1V1 = N2V2 = 1; (2) Proses perhitungan substitusi benar = 1; (3) Hasil akhir V1 = 25,0 mL dengan satuan benar = 1.',
    rubricComponents: [
      { name: 'Rumus/prinsip', maxPoints: 1, criteria: 'Menggunakan hubungan pengenceran yang tepat, N₁V₁ = N₂V₂.' },
      { name: 'Proses perhitungan', maxPoints: 1, criteria: 'Melakukan substitusi dan perhitungan secara benar, misalnya 1,00 x V₁ = 0,100 x 250,0.' },
      { name: 'Hasil akhir', maxPoints: 1, criteria: 'Memperoleh V₁ = 25,0 mL dengan satuan yang benar.' }
    ]
  },
  {
    id: 'q-st-11',
    code: 'ST-03',
    number: 11,
    category: 'teknis_kimia',
    dimensionId: 'stoikiometri',
    dimensionName: 'Stoikiometri Terapan',
    topic: 'Perhitungan Massa Bahan Memperhitungkan Kemurnian',
    indicator: 'Menghitung massa bahan dengan mempertimbangkan kemurnian bahan kimia',
    context: 'NaOH teknis kemurnian 80%',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_3_STOIKIOMETRI,
    questionText: 'Laboratorium membutuhkan 250,0 mL larutan NaOH 0,200 M. NaOH teknis yang tersedia memiliki kemurnian 80,0%. Tentukan massa NaOH teknis yang perlu ditimbang sebelum larutan distandardisasi. Tunjukkan proses perhitungan yang digunakan.',
    type: 'essay',
    maxScore: 3,
    points: 3,
    sampleAnswer: '1. Rumus/prinsip: Mol = M × V, massa murni = mol × Mr, massa teknis = massa murni / kemurnian (80,0%).\n2. Proses perhitungan:\n- Mol NaOH murni = 0,200 mol/L × 0,2500 L = 0,0500 mol.\n- Massa NaOH murni = 0,0500 mol × 40,0 g/mol = 2,00 g.\n- Massa NaOH teknis = 2,00 g / 0,800 = 2,50 g.\n3. Hasil akhir: Massa NaOH teknis yang perlu ditimbang adalah 2,50 g.',
    rubricGuide: 'Skor maks 3. Komponen: (1) Rumus/prinsip hubungan mol-massa dan kemurnian = 1; (2) Proses perhitungan kebutuhan murni & koreksi 80% = 1; (3) Hasil akhir 2,50 g dengan satuan benar = 1.',
    rubricComponents: [
      { name: 'Rumus/prinsip', maxPoints: 1, criteria: 'Menggunakan hubungan mol-massa dan memperhitungkan kemurnian bahan secara benar.' },
      { name: 'Proses perhitungan', maxPoints: 1, criteria: 'Menghitung kebutuhan NaOH murni dan melakukan koreksi kemurnian 80,0% secara benar.' },
      { name: 'Hasil akhir', maxPoints: 1, criteria: 'Memperoleh massa NaOH teknis = 2,50 g dengan satuan yang benar.' }
    ]
  },
  {
    id: 'q-st-12',
    code: 'ST-04',
    number: 12,
    category: 'teknis_kimia',
    dimensionId: 'stoikiometri',
    dimensionName: 'Stoikiometri Terapan',
    topic: 'Evaluasi Toleransi Konsentrasi & Tindak Lanjut Standardisasi',
    indicator: 'Mengevaluasi kesesuaian konsentrasi aktual larutan terhadap spesifikasi laboratorium dan menentukan tindak lanjut',
    context: 'Standardisasi NaOH (0,094 N, 0,100 N, 0,104 N vs rentang 0,098-0,102 N)',
    cognitiveLevel: 'C5',
    stimulus: STIMULUS_3_STOIKIOMETRI,
    questionText: 'SOP laboratorium menetapkan bahwa larutan NaOH dapat digunakan apabila konsentrasinya berada pada rentang 0,098-0,102 N. Hasil standardisasi tiga larutan adalah sebagai berikut.\nLarutan A: 0,094 N\nLarutan B: 0,100 N\nLarutan C: 0,104 N\nPilihlah satu larutan yang memenuhi spesifikasi untuk digunakan dalam analisis kuantitatif. Jelaskan dasar keputusan Anda dan tindakan yang perlu dilakukan terhadap larutan yang tidak memenuhi spesifikasi.',
    type: 'essay',
    maxScore: 3,
    points: 3,
    sampleAnswer: '1. Pilihan: Memilih Larutan B (0,100 N) sebagai larutan yang memenuhi spesifikasi.\n2. Dasar keputusan: Konsentrasi Larutan B (0,100 N) berada di dalam rentang spesifikasi 0,098–0,102 N, sedangkan Larutan A (0,094 N) berada di bawah rentang dan Larutan C (0,104 N) berada di atas rentang.\n3. Tindak lanjut: Larutan yang tidak memenuhi spesifikasi (A dan C) tidak boleh langsung digunakan, harus ditindaklanjuti sesuai SOP (penyesuaian konsentrasi/pembuatan ulang), lalu distandardisasi kembali sebelum digunakan.',
    rubricGuide: 'Skor maks 3. Komponen: (1) Memilih Larutan B = 1; (2) Dasar keputusan rentang spesifikasi = 1; (3) Tindak lanjut penyesuaian/standardisasi kembali = 1.',
    rubricComponents: [
      { name: 'Pilihan', maxPoints: 1, criteria: 'Memilih Larutan B (0,100 N) sebagai larutan yang memenuhi spesifikasi 0,098-0,102 N.' },
      { name: 'Dasar keputusan', maxPoints: 1, criteria: 'Menjelaskan bahwa 0,100 N berada dalam rentang spesifikasi, sedangkan 0,094 N berada di bawah dan 0,104 N berada di atas rentang.' },
      { name: 'Tindak lanjut', maxPoints: 1, criteria: 'Menjelaskan bahwa larutan yang tidak memenuhi spesifikasi tidak langsung digunakan dan perlu ditindaklanjuti sesuai SOP, termasuk koreksi/pembuatan ulang dan verifikasi atau standardisasi kembali sebelum digunakan.' }
    ]
  },

  // ----------------------------------------------------
  // DIMENSI 4: ANALISIS VOLUMETRI (Soal 13–16, Skor Maks = 13)
  // ----------------------------------------------------
  {
    id: 'q-av-13',
    code: 'AV-01',
    number: 13,
    category: 'teknis_kimia',
    dimensionId: 'volumetri',
    dimensionName: 'Analisis Volumetri',
    topic: 'Prosedur Titrasi Mendekati Titik Akhir Argentometri',
    indicator: 'Menentukan prosedur titrasi yang tepat ketika mendekati titik akhir analisis',
    context: 'Argentometri penentuan kadar klorida',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_4_VOLUMETRI,
    questionText: 'Ketika titrasi telah mendekati titik akhir, tindakan yang paling tepat adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. Menambahkan larutan AgNO₃ dalam jumlah lebih banyak agar pembentukan endapan berlangsung lebih cepat.',
      'B. Menambahkan titran secara bertahap sambil menghomogenkan larutan serta mengamati terbentuknya endapan putih AgCl dan perubahan warna hingga titik akhir titrasi.',
      'C. Memasukkan indikator kromat ke dalam buret bersama larutan AgNO₃ agar perubahan warna lebih mudah diamati.',
      'D. Menghentikan penambahan titran segera setelah endapan putih AgCl mulai terlihat di dalam larutan sampel.',
      'E. Menambahkan indikator kromat dalam jumlah lebih banyak agar perubahan warna pada akhir titrasi terlihat lebih jelas.'
    ],
    correctAnswer: 'B. Menambahkan titran secara bertahap sambil menghomogenkan larutan serta mengamati terbentuknya endapan putih AgCl dan perubahan warna hingga titik akhir titrasi.',
    rubricGuide: 'Skor maks 1. Memilih B = 1 poin; jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-av-14',
    code: 'AV-02',
    number: 14,
    category: 'teknis_kimia',
    dimensionId: 'volumetri',
    dimensionName: 'Analisis Volumetri',
    topic: 'Kalkulasi Stoikiometri dan Kadar Klorida Argentometri',
    indicator: 'Menghitung konsentrasi molar dan kadar analit dalam satuan mg/L berdasarkan data titrasi',
    context: '25,00 mL sampel, 12,40 mL AgNO₃ 0,0500 M',
    cognitiveLevel: 'C4',
    stimulus: STIMULUS_4_VOLUMETRI,
    questionText: 'Sebanyak 25,00 mL sampel membutuhkan 12,40 mL AgNO₃ 0,0500 M hingga mencapai titik akhir titrasi. Reaksi Ag⁺ dengan Cl⁻ berlangsung dengan perbandingan mol 1 : 1. Diketahui Ar Ag = 107,87; Ar N = 14,01; Ar O = 16,00; dan Ar Cl = 35,45. Tentukan konsentrasi molar ion Cl⁻ dan kadar ion Cl⁻ dalam sampel dalam mg/L. Tunjukkan proses perhitungan yang digunakan.',
    type: 'essay',
    maxScore: 5,
    points: 5,
    sampleAnswer: '1. Jumlah mol titran AgNO₃:\nn(AgNO₃) = M × V = 0,0500 mol/L × 0,01240 L = 6,20 × 10⁻⁴ mol.\n2. Stoikiometri:\nAg⁺ + Cl⁻ → AgCl (perbandingan 1 : 1), sehingga n(Cl⁻) = 6,20 × 10⁻⁴ mol.\n3. Konsentrasi molar ion Cl⁻:\n[Cl⁻] = (6,20 × 10⁻⁴ mol) / 0,02500 L = 0,0248 M.\n4. Konversi kadar ke mg/L:\nKadar Cl⁻ = [Cl⁻] × Ar Cl × 1000 mg/g = 0,0248 mol/L × 35,45 g/mol × 1000 mg/g = 879,16 mg/L (sekitar 879 mg/L).\n5. Hasil akhir: Konsentrasi molar [Cl⁻] = 0,0248 M dan kadar ion Cl⁻ = 879 mg/L (atau 879,16 mg/L).',
    rubricGuide: 'Skor maks 5. Komponen: (1) n AgNO3 = 6,20 x 10^-4 mol = 1; (2) Stoikiometri 1:1 = 1; (3) [Cl-] = 0,0248 M = 1; (4) Konversi Ar Cl 35,45 = 1; (5) Hasil akhir sekitar 879 mg/L dengan satuan benar = 1.',
    rubricComponents: [
      { name: 'Jumlah mol titran', maxPoints: 1, criteria: 'Menghitung jumlah mol AgNO₃/Ag⁺ dengan hubungan n = M × V secara benar sehingga diperoleh 6,20 × 10⁻⁴ mol.' },
      { name: 'Stoikiometri', maxPoints: 1, criteria: 'Menggunakan perbandingan mol Ag⁺ : Cl⁻ = 1 : 1 sehingga jumlah mol Cl⁻ ditetapkan sebesar 6,20 × 10⁻⁴ mol.' },
      { name: 'Konsentrasi molar', maxPoints: 1, criteria: 'Menghitung konsentrasi molar Cl⁻ berdasarkan volume sampel 25,00 mL sehingga diperoleh [Cl⁻] = 0,0248 M.' },
      { name: 'Konversi kadar', maxPoints: 1, criteria: 'Mengonversi konsentrasi Cl⁻ ke mg/L menggunakan Ar Cl = 35,45 secara benar sehingga diperoleh sekitar 879 mg/L.' },
      { name: 'Hasil akhir', maxPoints: 1, criteria: 'Menuliskan hasil akhir konsentrasi molar dan kadar Cl⁻ beserta satuan yang benar.' }
    ]
  },
  {
    id: 'q-av-15',
    code: 'AV-03',
    number: 15,
    category: 'teknis_kimia',
    dimensionId: 'volumetri',
    dimensionName: 'Analisis Volumetri',
    topic: 'Pengaruh Kesalahan Prosedural terhadap Ketepatan Titrasi',
    indicator: 'Menganalisis pengaruh kesalahan prosedural terhadap ketepatan hasil titrasi',
    context: 'Gelembung buret, penambahan titran cepat, buret basah, kesalahan paralaks',
    cognitiveLevel: 'C4',
    stimulus: STIMULUS_4_VOLUMETRI,
    questionText: 'Pilihlah tepat dua pernyataan yang benar mengenai ketepatan prosedur titrasi.',
    type: 'complex_mcq',
    maxScore: 2,
    points: 2,
    options: [
      'A. Gelembung udara pada ujung buret pada awal titrasi dapat menyebabkan volume yang terbaca tidak seluruhnya menggambarkan titran yang masuk ke sampel.',
      'B. Penambahan titran secara cepat ketika mendekati titik akhir tidak memengaruhi ketepatan hasil selama perubahan warna akhirnya terlihat.',
      'C. Buret yang hanya dibilas dengan akuades kemudian langsung diisi AgNO₃ tanpa conditioning tidak akan memengaruhi konsentrasi titran.',
      'D. Pembacaan buret dilakukan dengan posisi mata sejajar dengan meniskus untuk mengurangi kesalahan paralaks.'
    ],
    correctAnswers: [
      'A. Gelembung udara pada ujung buret pada awal titrasi dapat menyebabkan volume yang terbaca tidak seluruhnya menggambarkan titran yang masuk ke sampel.',
      'D. Pembacaan buret dilakukan dengan posisi mata sejajar dengan meniskus untuk mengurangi kesalahan paralaks.'
    ],
    rubricGuide: 'Siswa memilih tepat dua alternatif; setiap pilihan benar = 1 (A = Benar, D = Benar); skor maksimum = 2.'
  },
  {
    id: 'q-av-16',
    code: 'AV-04',
    number: 16,
    category: 'teknis_kimia',
    dimensionId: 'volumetri',
    dimensionName: 'Analisis Volumetri',
    topic: 'Evaluasi Data Presisi & Penanganan Data Menyimpang',
    indicator: 'Mengevaluasi konsistensi data titrasi dan menentukan pemeriksaan yang diperlukan sebelum pelaporan',
    context: 'Data volume 12,40; 12,45; 12,42; 14,80 mL',
    cognitiveLevel: 'C5',
    stimulus: STIMULUS_4_VOLUMETRI,
    questionText: 'Hasil empat pengulangan titrasi terhadap sampel yang sama adalah 12,40 mL; 12,45 mL; 12,42 mL; dan 14,80 mL. Seorang siswa langsung menghitung rata-rata seluruh hasil tersebut dan menggunakan nilai tersebut sebagai hasil akhir.\nEvaluasilah tindakan siswa tersebut dan jelaskan langkah yang seharusnya dilakukan sebelum hasil analisis dilaporkan.',
    type: 'essay',
    maxScore: 5,
    points: 5,
    sampleAnswer: '1. Evaluasi: Menyatakan bahwa keempat hasil tidak boleh langsung dirata-ratakan karena terdapat hasil yang berbeda secara mencolok.\n2. Identifikasi data: Mengidentifikasi 14,80 mL sebagai data yang menyimpang dibandingkan tiga data lainnya (12,40 mL; 12,45 mL; dan 12,42 mL).\n3. Analisis/investigasi: Menjelaskan perlunya memeriksa kemungkinan penyebab penyimpangan (pembacaan buret, gelembung udara pada ujung buret, kelebihan titran/titik akhir terlewat, atau kekeliruan pencatatan).\n4. Verifikasi: Menjelaskan perlunya verifikasi dan/atau pengulangan pengujian sesuai prosedur sebelum menentukan data yang digunakan.\n5. Pelaporan: Menetapkan hasil akhir hanya berdasarkan data yang valid serta mendokumentasikan proses evaluasi dan investigasi data menyimpang tersebut sebelum dilaporkan.',
    rubricGuide: 'Skor maks 5. Komponen: (1) Evaluasi tidak boleh langsung dirata-ratakan = 1; (2) Identifikasi 14,80 mL data menyimpang = 1; (3) Analisis penyebab buret/titik akhir = 1; (4) Verifikasi/pengulangan sesuai prosedur = 1; (5) Pelaporan dokumentasi valid = 1.',
    rubricComponents: [
      { name: 'Evaluasi', maxPoints: 1, criteria: 'Menyatakan bahwa keempat hasil tidak boleh langsung dirata-ratakan karena terdapat hasil yang berbeda secara mencolok.' },
      { name: 'Identifikasi data', maxPoints: 1, criteria: 'Mengidentifikasi 14,80 mL sebagai data yang menyimpang dibandingkan 12,40 mL; 12,45 mL; dan 12,42 mL.' },
      { name: 'Analisis/investigasi', maxPoints: 1, criteria: 'Menjelaskan perlunya memeriksa kemungkinan penyebab penyimpangan, seperti pembacaan buret, gelembung udara, titik akhir, titran, prosedur, atau pencatatan.' },
      { name: 'Verifikasi', maxPoints: 1, criteria: 'Menjelaskan perlunya verifikasi dan/atau pengulangan pengujian sesuai prosedur sebelum menentukan data yang digunakan.' },
      { name: 'Pelaporan', maxPoints: 1, criteria: 'Menetapkan hasil akhir berdasarkan data yang telah dinyatakan valid serta mendokumentasikan proses evaluasi sebelum hasil dilaporkan.' }
    ]
  },

  // ----------------------------------------------------
  // DIMENSI 5: INSTRUMENTASI DASAR (Soal 17–20, Skor Maks = 11)
  // ----------------------------------------------------
  {
    id: 'q-id-17',
    code: 'ID-01',
    number: 17,
    category: 'teknis_kimia',
    dimensionId: 'instrumentasi',
    dimensionName: 'Instrumentasi Dasar',
    topic: 'Prosedur Kalibrasi pH Meter untuk Hasil Andal',
    indicator: 'Menentukan prosedur penggunaan instrumen yang sesuai untuk menghasilkan data yang dapat dipertanggungjawabkan',
    context: 'Kalibrasi pH meter',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_5_INSTRUMENTASI,
    questionText: 'Prosedur yang paling tepat untuk memperoleh hasil pengukuran pH yang dapat dipertanggungjawabkan adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. Menggunakan kertas lakmus untuk menentukan nilai pH sampel',
      'B. Menggunakan pH meter selama alat masih menunjukkan angka',
      'C. Mengkalibrasi pH meter dengan larutan buffer yang sesuai sebelum mengukur sampel',
      'D. Menggunakan spektrofotometer untuk menentukan tingkat keasaman sampel',
      'E. Memperkirakan pH berdasarkan warna dan kejernihan sampel'
    ],
    correctAnswer: 'C. Mengkalibrasi pH meter dengan larutan buffer yang sesuai sebelum mengukur sampel',
    rubricGuide: 'Skor maks 1. Memilih C = 1 poin; jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-id-18',
    code: 'ID-02',
    number: 18,
    category: 'teknis_kimia',
    dimensionId: 'instrumentasi',
    dimensionName: 'Instrumentasi Dasar',
    topic: 'Fungsi Utama Instrumen Laboratorium',
    indicator: 'Menghubungkan instrumen laboratorium dengan fungsi pengukuran yang sesuai',
    context: 'pH meter, UV-Vis, neraca analitik, buret',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_5_INSTRUMENTASI,
    questionText: 'Pasangkan instrumen pada Kolom A dengan fungsi utamanya pada Kolom B.',
    type: 'matching',
    maxScore: 4,
    points: 4,
    matchingColumnA: [
      { id: 'm-id-a', columnAText: 'A. pH meter', correctMatch: '3. Mengukur derajat keasaman secara kuantitatif' },
      { id: 'm-id-b', columnAText: 'B. Spektrofotometer UV-Vis', correctMatch: '4. Mengukur absorbansi larutan pada panjang gelombang tertentu' },
      { id: 'm-id-c', columnAText: 'C. Neraca analitik', correctMatch: '1. Menentukan massa bahan dengan ketelitian tinggi' },
      { id: 'm-id-d', columnAText: 'D. Buret', correctMatch: '2. Mengukur volume titran secara teliti selama titrasi' }
    ],
    matchingColumnB: [
      '1. Menentukan massa bahan dengan ketelitian tinggi',
      '2. Mengukur volume titran secara teliti selama titrasi',
      '3. Mengukur derajat keasaman secara kuantitatif',
      '4. Mengukur absorbansi larutan pada panjang gelombang tertentu'
    ],
    rubricGuide: 'Skor maks 4. Setiap pasangan tepat = 1 poin (A->3, B->4, C->1, D->2).'
  },
  {
    id: 'q-id-19',
    code: 'ID-03',
    number: 19,
    category: 'teknis_kimia',
    dimensionId: 'instrumentasi',
    dimensionName: 'Instrumentasi Dasar',
    topic: 'Operasional pH Meter dan Spektrofotometer UV-Vis',
    indicator: 'Menerapkan prosedur penggunaan pH meter dan spektrofotometer secara benar',
    context: 'Elektroda, kuvet, jalur cahaya',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_5_INSTRUMENTASI,
    questionText: 'Pilihlah tepat dua tindakan yang tepat dalam penggunaan pH meter dan spektrofotometer UV-Vis.',
    type: 'complex_mcq',
    maxScore: 2,
    points: 2,
    options: [
      'A. Mengukur sampel terlebih dahulu dan melakukan kalibrasi pH meter hanya apabila hasil pengukuran terlihat tidak wajar.',
      'B. Membilas elektroda sesuai prosedur ketika berpindah dari satu larutan ke larutan lainnya.',
      'C. Memegang bagian optik kuvet dengan jari ketika memasukkan kuvet ke spektrofotometer.',
      'D. Memastikan tidak terdapat gelembung udara pada jalur cahaya sebelum pembacaan absorbansi dilakukan.'
    ],
    correctAnswers: [
      'B. Membilas elektroda sesuai prosedur ketika berpindah dari satu larutan ke larutan lainnya.',
      'D. Memastikan tidak terdapat gelembung udara pada jalur cahaya sebelum pembacaan absorbansi dilakukan.'
    ],
    rubricGuide: 'Siswa memilih tepat dua alternatif; setiap pilihan benar = 1 (B = Benar, D = Benar); skor maksimum = 2.'
  },
  {
    id: 'q-id-20',
    code: 'ID-04',
    number: 20,
    category: 'teknis_kimia',
    dimensionId: 'instrumentasi',
    dimensionName: 'Instrumentasi Dasar',
    topic: 'Troubleshooting Spektrofotometri (Sidik Jari & Gelembung Kuvet)',
    indicator: 'Menganalisis penyebab penyimpangan hasil instrumen dan menentukan tindakan korektif',
    context: 'Sidik jari dan gelembung udara pada kuvet UV-Vis',
    cognitiveLevel: 'C4',
    stimulus: STIMULUS_5_INSTRUMENTASI,
    questionText: 'Suatu sampel memberikan nilai absorbansi jauh lebih tinggi dibandingkan hasil pengukuran sebelumnya. Setelah dilakukan pemeriksaan, ditemukan sidik jari pada permukaan optik kuvet dan gelembung udara pada sampel di jalur cahaya.\nAnalisislah kemungkinan pengaruh kondisi tersebut terhadap hasil pengukuran dan jelaskan tindakan yang seharusnya dilakukan sebelum pengukuran diulangi.',
    type: 'essay',
    maxScore: 4,
    points: 4,
    sampleAnswer: '1. Pengaruh sidik jari: Menjelaskan bahwa sidik jari pada permukaan optik kuvet dapat mengganggu jalannya cahaya (menyerap dan menghamburkan cahaya) sehingga hasil absorbansi menjadi tidak akurat.\n2. Pengaruh gelembung: Menjelaskan bahwa gelembung udara pada jalur cahaya dapat mengganggu pembacaan cahaya (membiaskan berkas sinar) sehingga nilai absorbansi menjadi tidak dapat dipertanggungjawabkan.\n3. Tindakan korektif: Menjelaskan bahwa permukaan optik kuvet harus dibersihkan menggunakan kertas lensa sesuai prosedur sebelum digunakan kembali.\n4. Tindak lanjut: Menjelaskan bahwa gelembung udara harus dihilangkan, kondisi sampel diperiksa kembali, kemudian pengukuran diulang dengan kuvet yang bersih dan kondisi pengukuran yang benar.',
    rubricGuide: 'Skor maks 4. Komponen: (1) Pengaruh sidik jari = 1; (2) Pengaruh gelembung = 1; (3) Tindakan pembersihan optik = 1; (4) Tindak lanjut hilangkan gelembung & ukur ulang = 1.',
    rubricComponents: [
      { name: 'Pengaruh sidik jari', maxPoints: 1, criteria: 'Menjelaskan bahwa sidik jari pada permukaan optik kuvet dapat mengganggu jalannya cahaya sehingga hasil absorbansi menjadi tidak akurat.' },
      { name: 'Pengaruh gelembung', maxPoints: 1, criteria: 'Menjelaskan bahwa gelembung udara pada jalur cahaya dapat mengganggu pembacaan cahaya sehingga nilai absorbansi menjadi tidak dapat dipertanggungjawabkan.' },
      { name: 'Tindakan korektif', maxPoints: 1, criteria: 'Menjelaskan bahwa permukaan optik kuvet harus dibersihkan sesuai prosedur sebelum digunakan kembali.' },
      { name: 'Tindak lanjut', maxPoints: 1, criteria: 'Menjelaskan bahwa gelembung udara harus dihilangkan, kondisi sampel diperiksa kembali, kemudian pengukuran diulang dengan kuvet yang bersih dan kondisi pengukuran yang benar.' }
    ]
  },

  // ----------------------------------------------------
  // DIMENSI 6: MANAJEMEN MUTU LABORATORIUM (Soal 21–24, Skor Maks = 11)
  // ----------------------------------------------------
  {
    id: 'q-mm-21',
    code: 'MM-01',
    number: 21,
    category: 'teknis_kimia',
    dimensionId: 'manajemen_mutu',
    dimensionName: 'Manajemen Mutu Laboratorium',
    topic: 'Kelengkapan Pelabelan Reagen Kerja Keterlacakan',
    indicator: 'Menentukan informasi yang diperlukan pada label larutan untuk menjamin identifikasi dan keterlacakan',
    context: 'Pelabelan larutan NaOH',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_6_MANAJEMEN_MUTU,
    questionText: 'Informasi pada label larutan kerja yang paling mendukung identifikasi dan keterlacakan adalah ....',
    type: 'multiple_choice',
    maxScore: 1,
    points: 1,
    options: [
      'A. Nama larutan dan identitas laboratorium pembuatnya',
      'B. Nama larutan, warna larutan, dan ukuran wadahnya',
      'C. Nama larutan, konsentrasi, tanggal pembuatan, dan identitas pembuat',
      'D. Nama larutan, nomor pembuat, dan ukuran wadah penyimpanan',
      'E. Nama larutan, warna larutan, dan lokasi penyimpanan bahan'
    ],
    correctAnswer: 'C. Nama larutan, konsentrasi, tanggal pembuatan, dan identitas pembuat',
    rubricGuide: 'Skor maks 1. Memilih C = 1 poin; jawaban lain atau kosong = 0.'
  },
  {
    id: 'q-mm-22',
    code: 'MM-02',
    number: 22,
    category: 'teknis_kimia',
    dimensionId: 'manajemen_mutu',
    dimensionName: 'Manajemen Mutu Laboratorium',
    topic: 'Prinsip Integritas Data Hasil Uji Laboratorium',
    indicator: 'Menganalisis tindakan yang sesuai dengan prinsip integritas data laboratorium',
    context: 'Pencatatan pH, perubahan data, dokumentasi',
    cognitiveLevel: 'C4',
    stimulus: STIMULUS_6_MANAJEMEN_MUTU,
    questionText: 'Pilihlah tepat dua tindakan yang sesuai dengan prinsip integritas data laboratorium.',
    type: 'complex_mcq',
    maxScore: 2,
    points: 2,
    options: [
      'A. Mencatat hasil pH 4,20 sesuai pembacaan alat dan melakukan pemeriksaan ulang apabila hasil dinilai tidak wajar.',
      'B. Mengubah hasil pengukuran menjadi nilai yang dianggap lebih sesuai dengan perkiraan tanpa melakukan pengukuran ulang.',
      'C. Mencatat kode sampel, metode analisis, tanggal pengujian, dan identitas analis pada rekaman hasil.',
      'D. Menghapus hasil yang berbeda dari data lainnya tanpa mendokumentasikan alasan dan proses investigasi.'
    ],
    correctAnswers: [
      'A. Mencatat hasil pH 4,20 sesuai pembacaan alat dan melakukan pemeriksaan ulang apabila hasil dinilai tidak wajar.',
      'C. Mencatat kode sampel, metode analisis, tanggal pengujian, dan identitas analis pada rekaman hasil.'
    ],
    rubricGuide: 'Siswa memilih tepat dua alternatif; setiap pilihan benar = 1 (A = Benar, C = Benar); skor maksimum = 2.'
  },
  {
    id: 'q-mm-23',
    code: 'MM-03',
    number: 23,
    category: 'teknis_kimia',
    dimensionId: 'manajemen_mutu',
    dimensionName: 'Manajemen Mutu Laboratorium',
    topic: 'Komponen Rekaman Dokumentasi & Keterlacakan (Traceability)',
    indicator: 'Menghubungkan komponen dokumentasi dengan fungsinya dalam keterlacakan hasil analisis',
    context: 'Kode sampel, metode, analis, tanggal analisis',
    cognitiveLevel: 'C3',
    stimulus: STIMULUS_6_MANAJEMEN_MUTU,
    questionText: 'Pasangkan informasi pada Kolom A dengan fungsi utamanya dalam keterlacakan hasil laboratorium pada Kolom B.',
    type: 'matching',
    maxScore: 4,
    points: 4,
    matchingColumnA: [
      { id: 'm-mm-a', columnAText: 'A. Kode sampel', correctMatch: '2. Memungkinkan identitas sampel dibedakan dan ditelusuri' },
      { id: 'm-mm-b', columnAText: 'B. Metode analisis', correctMatch: '3. Menunjukkan prosedur yang digunakan untuk memperoleh hasil' },
      { id: 'm-mm-c', columnAText: 'C. Identitas analis', correctMatch: '1. Menunjukkan personel yang bertanggung jawab melakukan analisis' },
      { id: 'm-mm-d', columnAText: 'D. Tanggal analisis', correctMatch: '4. Menunjukkan waktu pelaksanaan analisis' }
    ],
    matchingColumnB: [
      '1. Menunjukkan personel yang bertanggung jawab melakukan analisis',
      '2. Memungkinkan identitas sampel dibedakan dan ditelusuri',
      '3. Menunjukkan prosedur yang digunakan untuk memperoleh hasil',
      '4. Menunjukkan waktu pelaksanaan analisis'
    ],
    rubricGuide: 'Skor maks 4. Setiap pasangan tepat = 1 poin (A->2, B->3, C->1, D->4).'
  },
  {
    id: 'q-mm-24',
    code: 'MM-04',
    number: 24,
    category: 'teknis_kimia',
    dimensionId: 'manajemen_mutu',
    dimensionName: 'Manajemen Mutu Laboratorium',
    topic: 'Investigasi Deviasi Data & Dokumentasi Pelaporan Mutu',
    indicator: 'Mengevaluasi data hasil pengujian yang menyimpang dan menentukan prosedur investigasi serta dokumentasi',
    context: 'Data 15,10 mL; 15,15 mL; 22,40 mL',
    cognitiveLevel: 'C5',
    stimulus: STIMULUS_6_MANAJEMEN_MUTU,
    questionText: 'Seorang siswa memperoleh hasil pengujian 15,10 mL; 15,15 mL; dan 22,40 mL. Siswa tersebut langsung menghitung rata-rata ketiga data dan melaporkannya sebagai hasil akhir tanpa melakukan pemeriksaan lebih lanjut.\nEvaluasilah tindakan tersebut berdasarkan prinsip manajemen mutu laboratorium dan jelaskan langkah yang seharusnya dilakukan sebelum hasil akhir dilaporkan.',
    type: 'essay',
    maxScore: 4,
    points: 4,
    sampleAnswer: '1. Evaluasi: Menyatakan bahwa ketiga data tidak boleh langsung dirata-ratakan karena terdapat hasil yang berbeda secara mencolok.\n2. Identifikasi data: Mengidentifikasi 22,40 mL sebagai hasil yang menyimpang dibandingkan dengan 15,10 mL dan 15,15 mL.\n3. Investigasi/verifikasi: Menjelaskan bahwa penyebab penyimpangan perlu diperiksa atau diinvestigasi (seperti kebocoran buret, titik akhir terlewat, atau kekeliruan pencatatan) dan pengujian perlu diverifikasi atau diulang sesuai prosedur.\n4. Pelaporan/dokumentasi: Menjelaskan bahwa hasil akhir hanya dilaporkan berdasarkan data yang telah dinyatakan valid serta proses pemeriksaan penyimpangan harus didokumentasikan.',
    rubricGuide: 'Skor maks 4. Komponen: (1) Evaluasi tidak boleh langsung dirata-ratakan = 1; (2) Identifikasi 22,40 mL menyimpang = 1; (3) Investigasi/verifikasi = 1; (4) Pelaporan data valid & dokumentasi = 1.',
    rubricComponents: [
      { name: 'Evaluasi', maxPoints: 1, criteria: 'Menyatakan bahwa ketiga data tidak boleh langsung dirata-ratakan karena terdapat hasil yang berbeda secara mencolok.' },
      { name: 'Identifikasi data', maxPoints: 1, criteria: 'Mengidentifikasi 22,40 mL sebagai hasil yang menyimpang dibandingkan dengan 15,10 mL dan 15,15 mL.' },
      { name: 'Investigasi/verifikasi', maxPoints: 1, criteria: 'Menjelaskan bahwa penyebab penyimpangan perlu diperiksa atau diinvestigasi dan pengujian perlu diverifikasi atau diulang sesuai prosedur.' },
      { name: 'Pelaporan/dokumentasi', maxPoints: 1, criteria: 'Menjelaskan bahwa hasil akhir hanya dilaporkan berdasarkan data yang telah dinyatakan valid serta proses pemeriksaan penyimpangan harus didokumentasikan.' }
    ]
  }
];

export const FULL_TECHNICAL_CHEMISTRY_PACKAGE: QuestionPackage[] = [
  {
    id: 'pkg-full-24',
    code: 'PKG-KIM-FULL',
    title: 'Instrumen Tes Kemampuan Teknis Kimia Siswa SMK Rumpun Kimia (24 Soal - 6 Dimensi)',
    description: 'Satu paket komprehensif instrumen tes kemampuan teknis kimia yang mengintegrasikan seluruh 6 dimensi kompetensi: K3LH dan Regulasi (Soal 1–4, Maks 10), Persiapan Analisis (Soal 5–8, Maks 10), Stoikiometri Terapan (Soal 9–12, Maks 10), Analisis Volumetri (Soal 13–16, Maks 13), Instrumentasi Dasar (Soal 17–20, Maks 11), dan Manajemen Mutu Laboratorium (Soal 21–24, Maks 11) dengan total skor mentah maksimum 65.',
    category: 'teknis_kimia',
    durationMinutes: 90,
    totalQuestions: 24,
    questions: REVISED_QUESTIONS_24,
    isActive: true,
    createdAt: '2025-02-01',
    createdBy: 'Pusat Asesmen & Tim Pengembang Vokasi Kimia'
  }
];

export const INITIAL_REVISED_PACKAGES = FULL_TECHNICAL_CHEMISTRY_PACKAGE;

// Evaluasi semantik jawaban esai (apabila belum dinilai oleh AI eksternal atau fallback offline)
export function evaluateEssaySemantic(questionNumber: number, text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const lower = text.toLowerCase();

  switch (questionNumber) {
    case 4: {
      // Dimensi 1 - Soal 4: Evaluasi Limbah Cu²⁺ dan Asam (Skor Maks 3)
      let score = 0;
      // 1. Keputusan: tidak boleh langsung dibuang ke wastafel hanya dengan pengenceran (1 pt)
      if (lower.includes('tidak boleh') || lower.includes('tidak dapat') || lower.includes('ditolak') || lower.includes('bukan') || lower.includes('salah')) {
        score += 1;
      }
      // 2. Alasan: pengenceran tidak menghilangkan ion Cu²⁺ / bahaya limbah (1 pt)
      if (lower.includes('cu') || lower.includes('tembaga') || lower.includes('logam berat') || lower.includes('tidak menghilangkan') || lower.includes('bahaya') || lower.includes('toksik') || lower.includes('korosif')) {
        score += 1;
      }
      // 3. Tindak lanjut: wadah berlabel, dikelola sesuai SOP limbah lab (1 pt)
      if (lower.includes('wadah') || lower.includes('tampung') || lower.includes('label') || lower.includes('sop') || lower.includes('prosedur') || lower.includes('pengelolaan limbah')) {
        score += 1;
      }
      return Math.min(3, Math.max(0, score));
    }

    case 8: {
      // Dimensi 2 - Soal 8: Evaluasi Prosedur Pelarutan NaCl (Skor Maks 3)
      let score = 0;
      // 1. Evaluasi: belum seharusnya langsung digunakan sebelum ketepatan volume diperiksa kembali (1 pt)
      if (lower.includes('belum') || lower.includes('tidak boleh') || lower.includes('tidak tepat') || lower.includes('salah') || lower.includes('keliru')) {
        score += 1;
      }
      // 2. Alasan: memeriksa kembali posisi meniskus/volume setelah seluruh NaCl larut (1 pt)
      if (lower.includes('meniskus') || lower.includes('tanda batas') || lower.includes('periksa') || lower.includes('larut') || lower.includes('kontraksi')) {
        score += 1;
      }
      // 3. Tindak lanjut: menyesuaikan volume hingga tanda batas & homogenkan (1 pt)
      if (lower.includes('tanda batas') || lower.includes('tambah') || lower.includes('homogen') || lower.includes('kocok') || lower.includes('bolak-balik')) {
        score += 1;
      }
      return Math.min(3, Math.max(0, score));
    }

    case 10: {
      // Dimensi 3 - Soal 10: Pengenceran HCl (Skor Maks 3)
      let score = 0;
      // 1. Rumus/prinsip N1V1 = N2V2 (1 pt)
      if (lower.includes('n1') || lower.includes('v1') || lower.includes('pengenceran') || lower.includes('m1')) score += 1;
      // 2. Proses perhitungan substitusi 1,00 x V1 = 0,100 x 250 (1 pt)
      if ((lower.includes('1,00') || lower.includes('1.00') || lower.includes('1.0') || lower.includes('1,0')) &&
          (lower.includes('250') || lower.includes('0,100') || lower.includes('0.100') || lower.includes('0.1') || lower.includes('0,1'))) score += 1;
      // 3. Hasil akhir 25,0 mL (1 pt)
      if (lower.includes('25') || lower.includes('25.0') || lower.includes('25,0')) score += 1;
      return Math.min(3, Math.max(0, score));
    }

    case 11: {
      // Dimensi 3 - Soal 11: Massa NaOH Teknis 80% (Skor Maks 3)
      let score = 0;
      // 1. Rumus/prinsip mol-massa (1 pt)
      if (lower.includes('mol') || lower.includes('0,05') || lower.includes('0.05') || lower.includes('2,00') || lower.includes('2.00') || lower.includes('2 g') || lower.includes('2,0 g') || lower.includes('2.0 g')) score += 1;
      // 2. Koreksi kemurnian 80% (1 pt)
      if (lower.includes('80%') || lower.includes('0.8') || lower.includes('0,8') || lower.includes('0.800') || lower.includes('0,800') || lower.includes('kemurnian')) score += 1;
      // 3. Hasil akhir 2,50 g (1 pt)
      if (lower.includes('2.5') || lower.includes('2,5') || lower.includes('2.50') || lower.includes('2,50')) score += 1;
      return Math.min(3, Math.max(0, score));
    }

    case 12: {
      // Dimensi 3 - Soal 12: Evaluasi Toleransi Konsentrasi NaOH (Skor Maks 3)
      let score = 0;
      // 1. Pilihan Larutan B 0,100 N (1 pt)
      if (lower.includes('larutan b') || lower.includes('b (0,100') || lower.includes('b (0.100') || lower.includes('0,100 n') || lower.includes('0.100 n')) {
        score += 1;
      }
      // 2. Dasar keputusan rentang spesifikasi (1 pt)
      if (lower.includes('rentang') || lower.includes('spesifikasi') || lower.includes('0,098') || lower.includes('0.098') || lower.includes('0,102') || lower.includes('0.102')) {
        score += 1;
      }
      // 3. Tindak lanjut tidak langsung digunakan & ditindaklanjuti/standardisasi ulang (1 pt)
      if (lower.includes('tidak langsung') || lower.includes('tidak dapat digunakan') || lower.includes('standardisasi') || lower.includes('standarisasi') || lower.includes('koreksi') || lower.includes('buat ulang')) {
        score += 1;
      }
      return Math.min(3, Math.max(0, score));
    }

    case 14: {
      // Dimensi 4 - Soal 14: Perhitungan Titrasi Argentometri (Skor Maks 5)
      let score = 0;
      // 1. Mol AgNO3 = 6,20 x 10^-4 mol (1 pt)
      if (lower.includes('6.2') || lower.includes('6,2') || lower.includes('0.0124') || lower.includes('12.4') || lower.includes('12,4') || lower.includes('6,20') || lower.includes('6.20')) score += 1;
      // 2. Stoikiometri 1 : 1 (1 pt)
      if (lower.includes('1 : 1') || lower.includes('1:1') || lower.includes('ag+') || lower.includes('cl-') || lower.includes('agcl')) score += 1;
      // 3. Konsentrasi molar [Cl-] = 0,0248 M (1 pt)
      if (lower.includes('0.0248') || lower.includes('0,0248') || lower.includes('2.48') || lower.includes('2,48')) score += 1;
      // 4. Konversi Ar Cl = 35,45 (1 pt)
      if (lower.includes('35.45') || lower.includes('35,45') || lower.includes('35.5') || lower.includes('35,5')) score += 1;
      // 5. Hasil akhir sekitar 879 mg/L (1 pt)
      if (lower.includes('879') || lower.includes('879.16') || lower.includes('879,16') || lower.includes('879.2') || lower.includes('879,2')) score += 1;
      return Math.min(5, Math.max(0, score));
    }

    case 16: {
      // Dimensi 4 - Soal 16: Evaluasi Data Menyimpang Titrasi 14,80 mL (Skor Maks 5)
      let score = 0;
      // 1. Evaluasi tidak boleh langsung dirata-ratakan (1 pt)
      if (lower.includes('tidak boleh') || lower.includes('jangan') || lower.includes('tidak tepat') || lower.includes('tidak dirata')) {
        score += 1;
      }
      // 2. Identifikasi 14,80 mL data menyimpang / outlier (1 pt)
      if (lower.includes('14,80') || lower.includes('14.80') || lower.includes('keempat') || lower.includes('ke-4') || lower.includes('menyimpang') || lower.includes('outlier')) {
        score += 1;
      }
      // 3. Investigasi buret, gelembung, titik akhir, titran, prosedur (1 pt)
      if (lower.includes('buret') || lower.includes('gelembung') || lower.includes('titik akhir') || lower.includes('titran') || lower.includes('prosedur') || lower.includes('investigasi')) {
        score += 1;
      }
      // 4. Verifikasi dan/atau pengulangan (1 pt)
      if (lower.includes('verifikasi') || lower.includes('pengulangan') || lower.includes('ulang')) {
        score += 1;
      }
      // 5. Pelaporan hasil data valid & dokumentasi (1 pt)
      if (lower.includes('valid') || lower.includes('dokumentasi') || lower.includes('didokumentasikan') || lower.includes('catat') || lower.includes('logbook') || lower.includes('12,42') || lower.includes('12.42')) {
        score += 1;
      }
      return Math.min(5, Math.max(0, score));
    }

    case 20: {
      // Dimensi 5 - Soal 20: Troubleshooting UV-Vis Sidik Jari & Gelembung (Skor Maks 4)
      let score = 0;
      // 1. Pengaruh sidik jari mengganggu jalannya cahaya / transmisi (1 pt)
      if (lower.includes('sidik jari') && (lower.includes('cahaya') || lower.includes('transmisi') || lower.includes('serap') || lower.includes('hambur') || lower.includes('akurat'))) {
        score += 1;
      }
      // 2. Pengaruh gelembung mengganggu pembacaan cahaya (1 pt)
      if (lower.includes('gelembung') && (lower.includes('jalur cahaya') || lower.includes('cahaya') || lower.includes('bias') || lower.includes('tidak reliabel') || lower.includes('tinggi'))) {
        score += 1;
      }
      // 3. Tindakan pembersihan permukaan optik kuvet (1 pt)
      if (lower.includes('bersihkan') || lower.includes('tisu lensa') || lower.includes('lens paper') || lower.includes('lap')) {
        score += 1;
      }
      // 4. Tindak lanjut hilangkan gelembung & ukur ulang (1 pt)
      if (lower.includes('hilangkan gelembung') || lower.includes('ketuk') || lower.includes('isi ulang') || lower.includes('ukur ulang') || lower.includes('pengukuran ulang') || lower.includes('diulang')) {
        score += 1;
      }
      return Math.min(4, Math.max(0, score));
    }

    case 24: {
      // Dimensi 6 - Soal 24: Investigasi Deviasi Mutu 22,40 mL & Dokumentasi (Skor Maks 4)
      let score = 0;
      // 1. Evaluasi tidak boleh langsung dirata-ratakan (1 pt)
      if (lower.includes('tidak boleh') || lower.includes('jangan') || lower.includes('tidak tepat') || lower.includes('menyimpang')) {
        score += 1;
      }
      // 2. Identifikasi 22,40 mL sebagai hasil menyimpang (1 pt)
      if (lower.includes('22,40') || lower.includes('22.40') || lower.includes('berbeda') || lower.includes('menyimpang') || lower.includes('outlier')) {
        score += 1;
      }
      // 3. Investigasi / verifikasi penyebab penyimpangan (1 pt)
      if (lower.includes('investigasi') || lower.includes('penyebab') || lower.includes('buret') || lower.includes('verifikasi') || lower.includes('ulang')) {
        score += 1;
      }
      // 4. Pelaporan data valid & dokumentasi (1 pt)
      if (lower.includes('valid') || lower.includes('dokumentasi') || lower.includes('didokumentasikan') || lower.includes('catat') || lower.includes('rekaman') || lower.includes('logbook')) {
        score += 1;
      }
      return Math.min(4, Math.max(0, score));
    }

    default:
      return 0;
  }
}

export function calculateAssessmentScore(answers: Record<string, any>, questions: QuestionItem[] = REVISED_QUESTIONS_24) {
  let totalRawScore = 0;
  const maxRawScore = 65; // Total skor mentah maksimum instrumen baru = 65

  const dimensionScores: Record<string, { raw: number; max: number; percentage: number; name: string }> = {
    k3lh: { raw: 0, max: 10, percentage: 0, name: 'K3LH dan Regulasi' },
    persiapan_analisis: { raw: 0, max: 10, percentage: 0, name: 'Persiapan Analisis' },
    stoikiometri: { raw: 0, max: 10, percentage: 0, name: 'Stoikiometri Terapan' },
    volumetri: { raw: 0, max: 13, percentage: 0, name: 'Analisis Volumetri' },
    instrumentasi: { raw: 0, max: 11, percentage: 0, name: 'Instrumentasi Dasar' },
    manajemen_mutu: { raw: 0, max: 11, percentage: 0, name: 'Manajemen Mutu Laboratorium' }
  };

  questions.forEach(q => {
    const ans = answers[q.id];
    let qScore = 0;
    const itemMax = q.maxScore || (q.points || 1);

    if (ans) {
      // 1. Multiple Choice (Soal 2, 5, 9, 13, 17, 21) -> Skor maks = 1
      if (q.type === 'multiple_choice') {
        const studentPick = (ans.selectedOption || '').toString().trim().toUpperCase();
        const correctPick = (q.correctAnswer || '').toString().trim().toUpperCase();
        // Cek kecocokan huruf awalan A/B/C/D/E atau teks lengkap
        const studentLetter = studentPick.slice(0, 1);
        const correctLetter = correctPick.slice(0, 1);
        if (studentPick === correctPick || (studentLetter && studentLetter === correctLetter)) {
          qScore = 1;
        }
      }
      // 2. Complex MCQ (Checkbox GForm: Soal 1, 6, 15, 19, 22) -> Skor maks = 2 (1 poin per pilihan benar)
      else if (q.type === 'complex_mcq') {
        // Dukung checkbox array selectedOptions
        if (Array.isArray(ans.selectedOptions)) {
          const studentLetters = ans.selectedOptions.map((opt: any) => (opt ? String(opt) : '').trim().slice(0, 1).toUpperCase());
          const correctLetters = (q.correctAnswers || []).map((opt: any) => (opt ? String(opt) : '').trim().slice(0, 1).toUpperCase());
          let matchCount = 0;
          studentLetters.forEach((letter: string) => {
            if (correctLetters.includes(letter)) {
              matchCount++;
            }
          });
          qScore = Math.min(itemMax, matchCount);
        }
        // Fallback untuk backward-compatibility tabel statements jika ada
        else if (q.statements && ans.complexAnswers) {
          let correctCount = 0;
          q.statements.forEach(stmt => {
            if (ans.complexAnswers && ans.complexAnswers[stmt.id] === stmt.correctAnswer) {
              correctCount++;
            }
          });
          // Skala proporsional ke itemMax
          qScore = Math.round((correctCount / q.statements.length) * itemMax);
        }
      }
      // 3. Matching (Soal 3, 7, 18, 23) -> Skor maks = 4 (1 poin per pasangan benar)
      else if (q.type === 'matching' && q.matchingColumnA) {
        let correctCount = 0;
        q.matchingColumnA.forEach(item => {
          const studentVal = (ans.matchingAnswers && ans.matchingAnswers[item.id] || '').trim();
          const targetVal = (item.correctMatch || '').trim();
          // Cek kesamaan teks atau awalan nomor '1', '2', '3', '4'
          if (studentVal && (studentVal === targetVal || studentVal.slice(0, 1) === targetVal.slice(0, 1))) {
            correctCount++;
          }
        });
        qScore = correctCount; // 0, 1, 2, 3, or 4
      }
      // 4. Essay (Soal 4, 8, 10, 11, 12, 14, 16, 20, 24)
      else if (q.type === 'essay' || q.type === 'short_answer') {
        if (ans.score !== undefined && ans.score !== null) {
          qScore = Math.min(itemMax, Math.max(0, ans.score));
        } else {
          // Gabungkan teks esai, teks shortAnswer, kalkulasi, dan hasil ekstraksi bukti multimodal (STT/Dokumen)
          const evidenceTexts = (ans.multimodalEvidences || [])
            .map((e: any) => e.extractedText || '')
            .filter(Boolean)
            .join(' ');
          const essayText = [
            ans.essayAnswer || '',
            ans.shortAnswerText || '',
            ans.shortAnswerCalculation || '',
            evidenceTexts
          ].filter(Boolean).join(' ').trim();
          qScore = essayText ? evaluateEssaySemantic(q.number || 0, essayText) : 0;
        }
      }
    }

    // Clamp score
    qScore = Math.min(itemMax, Math.max(0, qScore));
    totalRawScore += qScore;

    if (q.dimensionId && dimensionScores[q.dimensionId]) {
      dimensionScores[q.dimensionId].raw += qScore;
    }
  });

  // Calculate percentage per dimension:
  // Skor Dimensi = (Skor yang diperoleh pada dimensi / Skor maksimum dimensi) x 100
  Object.keys(dimensionScores).forEach(dimKey => {
    const dim = dimensionScores[dimKey];
    dim.percentage = Math.round((dim.raw / dim.max) * 100);
  });

  // Skor Kemampuan Teknis Total = (Skor total yang diperoleh / 65) x 100
  const finalPercentage = Math.round((totalRawScore / maxRawScore) * 100);

  return {
    totalRawScore,
    maxRawScore: 65,
    finalPercentage,
    dimensionScores
  };
}
