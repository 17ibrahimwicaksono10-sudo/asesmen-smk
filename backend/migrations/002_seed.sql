-- =============================================================================
-- SEED DATA – dari database.json
-- File: 002_seed.sql
-- =============================================================================

-- -------------------------
-- SCHOOLS
-- -------------------------
INSERT INTO schools (id, name, code, address, total_classes, total_teachers, total_students) VALUES
('sch-1', 'SMK Negeri 1 Kimia Industri Bandung',  'SMKN1-KIM-BDG', 'Jl. Soekarno-Hatta No. 450, Bandung', 8, 24, 320),
('sch-2', 'SMK Analis Kimia YPK Bogor',            'SMK-AK-BGR',    'Jl. Pemuda No. 12, Bogor',             6, 18, 240),
('sch-3', 'SMK Tunas Kimia Cilegon',               'SMK-TKC-CLG',   'Jl. Industri Rayon No. 88, Cilegon',  5, 15, 190)
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- USERS (admin & guru dahulu, siswa belakangan karena FK class_id)
-- -------------------------
INSERT INTO users (id, name, email, role, identity_no, school_id, school_name, class_id, class_name) VALUES
('usr-admin-1',              'Ibrahim Wicaksono, S.Pd.',               'admin@app.com',                     'admin',  '197603152002121001', NULL,    'Dinas & Pusat Asesmen Vocational SMK', NULL,    NULL),
('usr-guru-1',               'Hendra Wijaya, S.Si., M.Pd.',           'hendra.wijaya@sekolah.sch.id',      'guru',   '198204122008011005', 'sch-1', 'SMK Negeri 1 Kimia Industri Bandung',  NULL,    NULL),
('usr-guru-2',               'Dr. Ratna Dewi, M.T.',                  'ratna.dewi@sekolah.sch.id',         'guru',   '198509202010122003', 'sch-2', 'SMK Analis Kimia YPK Bogor',           NULL,    NULL),
('usr-siswa-1',              'Bintang Pratama',                        'bintang.pratama@siswa.sch.id',      'siswa',  '2204101',            'sch-1', 'SMK Negeri 1 Kimia Industri Bandung',  'cls-1', 'XII Kimia Analitik 1'),
('usr-siswa-2',              'Siti Aminah',                            'siti.aminah@siswa.sch.id',          'siswa',  '2204102',            'sch-1', 'SMK Negeri 1 Kimia Industri Bandung',  'cls-1', 'XII Kimia Analitik 1'),
('usr-reg-1790657403677',    'Ahmad Fauzi',                            'ahmad.fauzi@siswa.sch.id',          'siswa',  '2204199',            NULL,    'SMK Mitra Industri',                   NULL,    NULL),
('usr-reg-1790657572369',    'Ibrahim Wicaksono',                      '17ibrahimwicaksono10@gmail.com',    'siswa',  '4301422053',         'sch-1', 'SMK Negeri 1 Kimia Industri Bandung',  NULL,    'XII Kimia Analitik 1')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- CLASSES
-- -------------------------
INSERT INTO classes (id, name, school_id, school_name, teacher_id, teacher_name, academic_year, student_count, exam_count, class_code) VALUES
('cls-1', 'XII Kimia Analitik 1',     'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2024/2025', 32, 4, 'KA1-2024'),
('cls-2', 'XII Proses Kimia 2',       'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2024/2025', 30, 3, 'PK2-2024'),
('cls-3', 'XII Analis Instrumen & QC','sch-2', 'SMK Analis Kimia YPK Bogor',          'usr-guru-2', 'Dr. Ratna Dewi, M.T.',         '2024/2025', 28, 5, 'AIQC-BGR')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- TEACHER ASSIGNED CLASSES
-- -------------------------
INSERT INTO teacher_assigned_classes (teacher_id, class_id) VALUES
('usr-guru-1', 'cls-1'),
('usr-guru-1', 'cls-2'),
('usr-guru-2', 'cls-3')
ON CONFLICT DO NOTHING;

-- -------------------------
-- PACKAGES
-- -------------------------
INSERT INTO packages (id, code, title, description, category, duration_minutes, total_questions, is_active, created_at_date, created_by) VALUES
('pkg-employability-18', 'PKG-EMP-18',     'Instrumen Non-Tes Employability Skills Siswa SMK Kimia (18 Butir Situasional)', 'Instrumen asesmen non-tes pengukuran 9 aspek employability skills melalui pilihan respons situasional A–E (skor 1–5 per butir).', 'employability',  45, 18, TRUE, '2025-02-15', 'Tim Pengembangan Kurikulum Vokasi SMK'),
('pkg-full-24',          'PKG-KIM-FULL',   'Instrumen Tes Kemampuan Teknis Kimia Siswa SMK Rumpun Kimia (24 Soal - 6 Dimensi)', 'Satu paket komprehensif instrumen tes kemampuan teknis kimia yang mengintegrasikan seluruh 6 dimensi kompetensi.', 'teknis_kimia',   90, 24, TRUE, '2025-02-01', 'Pusat Asesmen & Tim Pengembang Vokasi Kimia'),
('pkg-1',                'PKG-TK-01',      'Asesmen Teknis Titrasi Volumetri & Spektrofotometri UV-Vis', 'Menguji penguasaan penyiapan larutan standar, otomatisasi kurva kalibrasi, dan analisis sampel obat/kimia.', 'teknis_kimia',   60,  3, TRUE, '2025-01-15', 'Hendra Wijaya, S.Si., M.Pd.'),
('pkg-2',                'PKG-EMP-01',     'Asesmen Employability Skills & K3 Industri Kimia', 'Menguji kecakapan komunikasi di laboratorium, etika kerja tim, troubleshooting insiden K3, dan kepatuhan ISO 17025.', 'employability',  45,  2, TRUE, '2025-01-20', 'Hendra Wijaya, S.Si., M.Pd.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- QUESTIONS – Employability 18 butir (nt-1 s/d nt-18)
-- Disimpan dengan data JSON di kolom options & scoring_map
-- -------------------------
INSERT INTO questions (id, package_id, code, number, category, type, aspect_id, aspect_name, topic, question_text, correct_answer, rubric_guide, options, scoring_map) VALUES
('nt-1', 'pkg-employability-18', 'EMP-01', 1, 'employability', 'multiple_choice', 'komunikasi', 'Keterampilan Komunikasi', 'Komunikasi Kerja Hasil Pengujian',
'1. Saat praktik pengujian kualitas air limbah di laboratorium sekolah, Anda bertugas mengukur pH tiga sampel limbah cair menggunakan pH meter. Sampel A memiliki pH 3,2; sampel B memiliki pH 6,9; dan sampel C memiliki pH 10,5. Setelah pengukuran selesai, pembimbing meminta Anda menyampaikan hasil kepada kelompok dan menjelaskan sampel mana yang perlu mendapat perhatian lebih lanjut sebelum dilakukan proses penanganan limbah. Tindakan yang paling sesuai adalah …', 'E',
'Pilihan E = 5 Poin (Sangat Baik - Respons Profesional Komprehensif).',
'["A. Menyampaikan bahwa seluruh hasil sudah dicatat di buku kerja, lalu meminta pembimbing atau anggota kelompok membaca sendiri data tersebut agar Anda tidak salah menjelaskan.","B. Menyampaikan bahwa sampel A bersifat asam dan sampel C bersifat basa, tetapi tidak menyebutkan nilai pH, kode sampel, alasan ilmiah, maupun tindakan lanjutan yang diperlukan.","C. Menyebutkan nilai pH setiap sampel secara lengkap, tetapi tidak menghubungkan hasil pengukuran tersebut dengan sifat larutan, potensi risiko, atau kebutuhan penanganan limbah.","D. Menyampaikan kode sampel, nilai pH, sifat larutan, dan sampel yang perlu diprioritaskan untuk penanganan, tetapi belum menjelaskan kemungkinan perlunya pemeriksaan ulang pada data yang ekstrem.","E. Menyampaikan kode sampel, nilai pH, sifat larutan, prioritas penanganan, alasan berdasarkan data, serta menyarankan pemeriksaan ulang pada sampel yang sangat asam atau basa sebelum keputusan pembuangan limbah dilakukan."]'::JSONB,
'{"A":1,"B":2,"C":3,"D":4,"E":5}'::JSONB
),
('nt-2', 'pkg-employability-18', 'EMP-02', 2, 'employability', 'multiple_choice', 'komunikasi', 'Keterampilan Komunikasi', 'Klarifikasi Instruksi Kerja',
'2. Anda diminta pembimbing untuk menyiapkan larutan kerja yang akan digunakan dalam kegiatan titrasi. Pembimbing hanya mengatakan, "Buat larutan seperti biasa untuk titrasi hari ini," tetapi tidak menjelaskan konsentrasi akhir, volume larutan, jenis pelarut, dan botol penyimpanan yang harus digunakan. Tindakan yang paling sesuai adalah …', 'D',
'Pilihan D = 5 Poin (Sangat Baik - Klarifikasi instruksi berbasis SOP).',
'["A. Langsung membuat larutan berdasarkan pengalaman praktikum sebelumnya karena biasanya konsentrasi larutan yang digunakan sama.","B. Bertanya kepada teman sekelompok dan mengikuti jawaban mayoritas meskipun teman-teman juga belum melihat instruksi resmi atau SOP tertulis.","C. Menunggu pembimbing kembali tanpa melakukan persiapan apa pun, meskipun sebenarnya Anda dapat membaca ulang lembar kerja atau SOP yang tersedia.","D. Membaca kembali lembar kerja, mengecek SOP atau catatan praktikum, lalu mengonfirmasi konsentrasi, volume akhir, pelarut, dan wadah penyimpanan kepada pembimbing sebelum mulai bekerja.","E. Membuat larutan dengan konsentrasi lebih tinggi agar nanti dapat diencerkan apabila ternyata konsentrasi yang diminta berbeda."]'::JSONB,
'{"A":2,"B":3,"C":2,"D":5,"E":1}'::JSONB
),
('nt-3', 'pkg-employability-18', 'EMP-03', 3, 'employability', 'multiple_choice', 'kerjasama', 'Keterampilan Kerja Sama', 'Kontribusi Tim Laboratorium',
'3. Kelompok Anda mendapat tugas melakukan analisis kadar asam pada sampel cuka. Pekerjaan yang harus dilakukan meliputi menyiapkan alat, membuat larutan standar, menyiapkan sampel, melakukan titrasi, mencatat volume titran, menghitung kadar asam, dan menyusun laporan singkat. Waktu praktikum terbatas, tetapi beberapa anggota kelompok belum mengambil peran dan hanya menunggu arahan. Tindakan yang paling sesuai adalah …', 'D',
'Pilihan D = 5 Poin (Sangat Baik - Kolaborasi tim terorganisir).',
'["A. Mengambil alih seluruh pekerjaan penting agar hasil kelompok cepat selesai dan tidak bergantung pada anggota lain yang belum aktif.","B. Memilih pekerjaan yang paling mudah terlebih dahulu, lalu membiarkan anggota lain menentukan sendiri bagian pekerjaan yang tersisa.","C. Menunggu guru membagi tugas secara langsung karena pembagian kerja seharusnya menjadi tanggung jawab guru atau laboran.","D. Mengajak kelompok membagi tugas berdasarkan kemampuan masing-masing, menyepakati alur kerja, memastikan setiap anggota memahami tanggung jawabnya, dan mengecek data bersama sebelum dilaporkan.","E. Menyerahkan pekerjaan utama kepada teman yang paling pintar, sedangkan anggota lain cukup membantu jika diminta agar risiko kesalahan berkurang."]'::JSONB,
'{"A":3,"B":2,"C":1,"D":5,"E":2}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- Sisa soal employability (nt-4 s/d nt-18) disimpan sebagai JSON per paket
-- untuk efisiensi seed; aplikasi bisa load dari package questions JSONB

-- -------------------------
-- QUESTIONS – Teknis Kimia PKG-1 (q-1, q-2, q-3)
-- -------------------------
INSERT INTO questions (id, package_id, code, category, type, topic, question_text, rubric_guide, sub_questions) VALUES
('q-1', 'pkg-1', 'TK-01', 'teknis_kimia', 'essay_subquestions', 'Standarisasi Larutan NaOH dengan Asam Oksalat',
'Seorang analis QC menimbang 0.6300 gram Asam Oksalat Dihidrat (H2C2O4.2H2O, BM = 126 g/mol) dan dilarutkan dalam labu ukur 100 mL. Sebanyak 10 mL larutan ini dititrasi dengan larutan NaOH hingga titik akhir fenoftalein terlampaui. Rata-rata volume NaOH dibutuhkan adalah 9.80 mL.',
'Skor maks 100. Poin diberikan berdasarkan kebenaran rumus mol, kalkulasi molaritas NaOH, serta analisis faktor kesalahan pembacaan meniskus.',
'[{"id":"sub-1a","text":"Hitunglah molaritas persis larutan standar primer Asam Oksalat.","points":30,"answerKey":"0.05 M H2C2O4","rubric":"30 poin jika perhitungan mol (0.63/126 = 0.005 mol) dan molaritas (0.005 / 0.1L = 0.05 M) benar."},{"id":"sub-1b","text":"Tuliskan persamaan reaksi netralisasi antara H2C2O4 dan NaOH, lalu hitung Konsentrasi NaOH (M).","points":40,"answerKey":"H2C2O4 + 2 NaOH -> Na2C2O4 + 2 H2O. M NaOH = (2 x M_asam x V_asam) / V_NaOH = (2 x 0.05 x 10) / 9.8 = 0.102 M","rubric":"40 poin jika stokiometri 1:2 dipertimbangkan dengan benar dan M NaOH = 0.102 M."},{"id":"sub-1c","text":"Jelaskan akibat keselamatan (K3) jika larutan NaOH pekat terkena kulit analis dan langkah pertolongan pertamanya.","points":30,"answerKey":"NaOH bersifat korosif/basa kuat, merusak jaringan. Pembilasan dengan air mengalir minimal 15 menit dan penetralan ringan/penanganan medik.","rubric":"30 poin jika menyebutkan sifat korosif basa dan pembilasan air mengalir 15 menit."}]'::JSONB
),
('q-2', 'pkg-1', 'TK-02', 'teknis_kimia', 'essay_subquestions', 'Pengoperasian Spektrofotometer UV-Vis',
'Pada analisis kadar Parasetamol menggunakan Spektrofotometer UV-Vis pada panjang gelombang maksimum 243 nm, langkah pertama setelah pembuatan kurva kalibrasi adalah melakukan blanko otomatis. Mengapa larutan blanko sangat penting dalam penetapan kadar spektrofotometri?',
'Evaluasi pemahaman absorbansi dan Hukum Lambert-Beer.',
'[{"id":"sub-2a","text":"Fungsi utama larutan blanko dan komponen apa saja yang terkandung di dalam larutan blanko.","points":50,"answerKey":"Blanko digunakan untuk mengukur absorbansi pelarut dan reagen tanpa matriks analit sehingga absorbansi pembacaan murni analit.","rubric":"50 poin jika menyebutkan koreksi absorbansi pelarut dan reagen."},{"id":"sub-2b","text":"Jika kuvet kuarsa ternoda sidik jari pada sisi beningnya, bagaimana dampaknya terhadap nilai absorbansi sampel?","points":50,"answerKey":"Sidik jari akan mendifraksikan/mensuspensikan cahaya, sehingga absorbansi terbaca lebih tinggi dari seharusnya (positif palsu).","rubric":"50 poin jika menjelaskan pemantulan/penyerapan cahaya ekstra yang meningkatkan nilai absorbansi."}]'::JSONB
),
('q-3', 'pkg-1', 'TK-03', 'teknis_kimia', 'multiple_choice', 'Identifikasi Reagen & Simbol Bahaya Bahan Kimia (GHS)',
'Pilihlah simbol bahaya GHS yang sesuai untuk Asam Klorida Pekat (HCl 37%):',
'100% untuk jawaban pilihan ganda tepat.',
NULL
)
ON CONFLICT (id) DO NOTHING;

-- Options untuk q-3
UPDATE questions SET
    options = '["Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)","Mudah Terbakar (Flammable)","Mudah Meledak (Explosive)","Gas Bertekanan"]'::JSONB,
    correct_answer = 'Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)'
WHERE id = 'q-3';

-- -------------------------
-- EXAMS
-- -------------------------
INSERT INTO exams (id, title, package_id, package_title, category, class_id, class_name, school_id, school_name, teacher_id, teacher_name, schedule_date, start_time, end_time, duration_minutes, target_score, status, total_students, completed_students) VALUES
('ex-non-test-18', 'Asesmen Non-Tes Employability Skills Siswa SMK Kimia (18 Butir)', 'pkg-employability-18', 'Instrumen Non-Tes Employability Skills Siswa SMK Kimia (18 Butir Situasional)', 'employability', 'cls-1', 'XII Kimia Analitik 1', 'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2025-02-15', '09:30', '10:15', 45, 85, 'berjalan', 32, 22),
('ex-full-24',     'Asesmen Pemetaan Kemampuan Teknis Kimia SMK (24 Soal - 6 Dimensi)', 'pkg-full-24',          'Instrumen Tes Kemampuan Teknis Kimia Siswa SMK Rumpun Kimia (24 Soal - 6 Dimensi)', 'teknis_kimia',  'cls-1', 'XII Kimia Analitik 1', 'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2025-02-15', '08:00', '09:30', 90, 80, 'berjalan', 32, 18),
('ex-1',           'Ujian Akhir Semester Teknis Titrasi & Spektrofotometri',            'pkg-1',                'Asesmen Teknis Titrasi Volumetri & Spektrofotometri UV-Vis',                          'teknis_kimia',  'cls-1', 'XII Kimia Analitik 1', 'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2025-02-10', '08:00', '09:00', 60, 80, 'berjalan', 32, 28),
('ex-2',           'Sertifikasi Employability & Etika Industri Kimia',                  'pkg-2',                'Asesmen Employability Skills & K3 Industri Kimia',                                   'employability', 'cls-1', 'XII Kimia Analitik 1', 'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2025-02-12', '10:00', '10:45', 45, 85, 'terjadwal', 32, 0),
('ex-3',           'Ujian Kesiapan Kerjasama & Problem Solving Lab',                    'pkg-2',                'Asesmen Employability Skills & K3 Industri Kimia',                                   'employability', 'cls-2', 'XII Proses Kimia 2',  'sch-1', 'SMK Negeri 1 Kimia Industri Bandung', 'usr-guru-1', 'Hendra Wijaya, S.Si., M.Pd.', '2025-01-28', '09:00', '09:45', 45, 75, 'selesai',   30, 30)
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- SUBMISSIONS
-- -------------------------
INSERT INTO submissions (id, exam_id, exam_title, student_id, student_name, student_nis, class_name, submit_time, total_score, technical_score, employability_score, status, teacher_follow_up, ai_evaluation, answers) VALUES
('sub-full-24', 'ex-full-24', 'Asesmen Pemetaan Kemampuan Teknis Kimia SMK (24 Soal - 6 Dimensi)',
 'usr-siswa-1', 'Bintang Pratama', '2204101', 'XII Kimia Analitik 1', '2025-02-15 09:20:00+07',
 88, 88, 87, 'dinilai',
 'Pencapaian sangat baik pada seluruh 6 dimensi. Perhitungan stoikiometri dan teknik penanganan buret sangat presisi.',
 'Skor Total Mentah: 72/80 (90%). Evaluasi analitis mencakup 6 dimensi kemampuan teknis kimia sesuai rubrik penskoran standar.',
 '{"q-k3lh-1":{"questionId":"q-k3lh-1","complexAnswers":{"k3lh-1a":"Sesuai","k3lh-1b":"Tidak Sesuai","k3lh-1c":"Sesuai","k3lh-1d":"Tidak Sesuai"},"score":4,"maxScore":4},"q-k3lh-2":{"questionId":"q-k3lh-2","selectedOption":"C. membilas bagian yang terkena dengan air mengalir dalam jumlah cukup dan segera melaporkan kejadian kepada guru atau laboran","score":1,"maxScore":1}}'::JSONB
),
('sub-1', 'ex-1', 'Ujian Akhir Semester Teknis Titrasi & Spektrofotometri',
 'usr-siswa-1', 'Bintang Pratama', '2204101', 'XII Kimia Analitik 1', '2025-02-10 08:52:00+07',
 88, 88, 85, 'dinilai',
 'Sangat baik pada teknik titrasi asam basa. Perlu pendalaman pada penghitungan ketidakpastian kurva spektrofotometri.',
 'Bintang menunjukkan pemahaman stokiometri larutan yang solid (90%). Penanganan K3 basa kuat lengkap. Rekomendasi: Latihan variasi sampel kompleks.',
 '{"q-1":{"questionId":"q-1","subQuestionAnswers":{"sub-1a":"0.05 Molar Asam Oksalat.","sub-1b":"H2C2O4 + 2NaOH -> Na2C2O4 + 2H2O. Konsentrasi NaOH = (2 x 0.05 x 10) / 9.8 = 0.102 M","sub-1c":"NaOH korosif untuk kulit. Langkah: siram air mengalir minimal 15 menit dan laporkan ke teknisi lab."},"score":95,"maxScore":100,"teacherFeedback":"Sempurna. Perhitungan stokiometri 1:2 dipertimbangkan dengan cermat."},"q-2":{"questionId":"q-2","subQuestionAnswers":{"sub-2a":"Blanko mengeliminasi penyerapan pelarut dan reagen agar absorbansi Murni analit parasetamol.","sub-2b":"Sidik jari membiaskan sinar UV sehingga absorbansi terbaca lebih tinggi."},"score":90,"maxScore":100,"teacherFeedback":"Jawaban runtut dan sesuai kaidah spektrofotometri."},"q-3":{"questionId":"q-3","selectedOption":"Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)","score":100,"maxScore":100}}'::JSONB
),
('sub-2', 'ex-1', 'Ujian Akhir Semester Teknis Titrasi & Spektrofotometri',
 'usr-siswa-2', 'Siti Aminah', '2204102', 'XII Kimia Analitik 1', '2025-02-10 08:55:00+07',
 78, 78, 92, 'dinilai',
 'Konsep dasar titrasi sudah dikuasai, namun melewatkan perkalian koefisien 2 pada asam diprotik.',
 'Siti unggul pada konsep K3 dan prosedur ISO lab (92%). Perlu latihan remedi stokiometri asam diprotik.',
 '{"q-1":{"questionId":"q-1","subQuestionAnswers":{"sub-1a":"0.05 M","sub-1b":"0.051 M (lupa perkalian valensi asam)","sub-1c":"Bilas air mengalir."},"score":70,"maxScore":100},"q-2":{"questionId":"q-2","subQuestionAnswers":{"sub-2a":"Blanko untuk nolkan alat.","sub-2b":"Kotoran membuat hasil tidak akurat."},"score":75,"maxScore":100},"q-3":{"questionId":"q-3","selectedOption":"Logam Korosif & Bahaya Kesehatan (Corrosive & Skin Corrosion)","score":100,"maxScore":100}}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- ARCHIVES
-- -------------------------
INSERT INTO archives (id, type, title, archived_at, reason) VALUES
('arch-1', 'paket_soal', 'Paket Soal Kurikulum 2013 - Kimia Dasar XI (Arsip 2023)', '2024-06-15', 'Pembaruan ke Kurikulum Merdeka Vocational'),
('arch-2', 'ujian',      'Ujian Tryout UNK Kimia 2023 Batch 1',                      '2024-05-20', 'Penyelesaian Tahun Ajaran Lalu')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- SETTINGS
-- -------------------------
INSERT INTO settings (key, value) VALUES
('appName',              'Sistem Asesmen & Profil Kesiapan Kerja SMK'),
('academicYear',         '2024/2025 Genap'),
('emailNotifications',   'true'),
('geminiModel',          'gemini-3.6-flash'),
('autoGradeEssays',      'true'),
('aiReadinessAnalysis',  'true'),
('speechToTextEnabled',  'true'),
('speechLanguage',       'id-ID'),
('micSensitivity',       'sedang')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
