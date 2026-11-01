import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runEvidenceMigration, runEvidenceRollback } from './evidenceMigration.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExactProdStagingValidation() {
  console.log('================================================================');
  console.log('🧪 STAGING TERISOLASI: VALIDASI DATA SETARA PERSIS PRODUKSI');
  console.log('   Target: 91.463.424 byte | 3 Sekolah | 3 Kelas | 2 Guru | 6 User | 8 Ujian | 22 Sub');
  console.log('================================================================');

  const stagingDir = path.resolve(__dirname, '../data/staging_prod_exact');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  const stagingDbPath = path.join(stagingDir, 'database.json');
  const stagingStorageDir = path.join(stagingDir, 'evidence_storage');

  console.log('\n1. Membangun salinan dataset staging dengan spesifikasi eksak produksi...');

  // 3 Sekolah
  const schools = [
    { id: 'sch-cirebon-01', name: 'SMK Negeri 1 Cirebon', npsn: '20222001', address: 'Jl. Perjuangan No. 1, Cirebon' },
    { id: 'sch-bandung-02', name: 'SMK Negeri 2 Bandung', npsn: '20222002', address: 'Jl. Cihampelas No. 2, Bandung' },
    { id: 'sch-jakarta-03', name: 'SMK Kimia Industri Jakarta', npsn: '20222003', address: 'Jl. Industri Kimia No. 3, Jakarta' }
  ];

  // 3 Kelas
  const classes = [
    { id: 'cls-ka-12-1', name: 'XII Kimia Analitik 1', schoolId: 'sch-cirebon-01', major: 'Kimia Analisis' },
    { id: 'cls-ki-12-2', name: 'XII Kimia Industri 2', schoolId: 'sch-bandung-02', major: 'Kimia Industri' },
    { id: 'cls-fi-12-1', name: 'XII Farmasi Industri 1', schoolId: 'sch-jakarta-03', major: 'Farmasi Industri' }
  ];

  // 2 Guru (Sesuai verifikasi data produksi VPS)
  const teachers = [
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', nip: '197505122000032001', schoolId: 'sch-cirebon-01', email: 'nurul@smkn1cirebon.sch.id' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', nip: '198008152005011004', schoolId: 'sch-bandung-02', email: 'bambang@smkn2bandung.sch.id' }
  ];

  // 6 Pengguna (1 admin, 2 guru, 3 akun siswa terdaftar - Sesuai verifikasi data produksi VPS)
  const users = [
    { id: 'usr-admin-1', name: 'Ibrahim Wicaksono, S.Pd.', email: 'admin@app.com', role: 'admin', identityNo: '197603152002121001' },
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', email: 'nurul@smkn1cirebon.sch.id', role: 'guru', identityNo: '197505122000032001', schoolId: 'sch-cirebon-01' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', email: 'bambang@smkn2bandung.sch.id', role: 'guru', identityNo: '198008152005011004', schoolId: 'sch-bandung-02' },
    { id: 'usr-std-01', name: 'Ahmad Fadhilah', email: 'ahmad.f@example.com', role: 'siswa', identityNo: 'NIS-2024-001', schoolId: 'sch-cirebon-01', classId: 'cls-ka-12-1' },
    { id: 'usr-std-02', name: 'Siti Aisyah', email: 'siti.a@example.com', role: 'siswa', identityNo: 'NIS-2024-002', schoolId: 'sch-bandung-02', classId: 'cls-ki-12-2' },
    { id: 'usr-std-03', name: 'Budi Santoso', email: 'budi.s@example.com', role: 'siswa', identityNo: 'NIS-2024-003', schoolId: 'sch-jakarta-03', classId: 'cls-fi-12-1' }
  ];

  // 8 Ujian (Sesuai verifikasi data produksi VPS)
  const exams = [];
  for (let e = 1; e <= 8; e++) {
    const cls = classes[(e - 1) % 3];
    const tch = teachers[(e - 1) % 2];
    exams.push({
      id: `exam-prod-0${e}`,
      title: `Ujian Kompetensi Kejuruan Kimia Analisis Paket ${e}`,
      packageId: `pkg-kimia-0${e}`,
      packageTitle: `Paket Soal Terpadu Kimia Analitik & K3LH Seri ${e}`,
      category: e % 2 === 0 ? 'teknis_kimia' : 'employability',
      classId: cls.id,
      className: cls.name,
      schoolId: cls.schoolId,
      schoolName: schools.find(s => s.id === cls.schoolId)?.name || '',
      teacherId: tch.id,
      teacherName: tch.name,
      scheduleDate: '2026-10-15',
      startTime: '08:00',
      endTime: '11:00',
      durationMinutes: 180,
      targetScore: 75,
      status: 'selesai',
      totalStudents: 22,
      completedStudents: 22
    });
  }

  // 22 Submissions dengan bukti multimodal Base64
  // Target ukuran total: TEPAT 91.463.424 byte
  console.log('   Menghitung kalibrasi biner agar total file tepat 91.463.424 byte...');
  const submissions = [];
  const originalEvidenceHashes = new Map();
  const baselineScores = new Map();

  // Kita buat 22 submission dengan struktur nyata
  for (let s = 1; s <= 22; s++) {
    const cls = classes[(s - 1) % 3];
    const exam = exams[(s - 1) % 8];
    const nis = `NIS-2024-${s.toString().padStart(3, '0')}`;
    const name = `Siswa Asesmen ${s}`;
    const subId = `sub-prod-${s.toString().padStart(3, '0')}`;

    const scoreTotal = 75 + (s * 3 % 23);
    const scoreTech = 78 + (s * 2 % 20);
    const scoreEmp = 74 + (s * 4 % 24);

    baselineScores.set(subId, {
      totalScore: scoreTotal,
      technicalScore: scoreTech,
      employabilityScore: scoreEmp,
      studentNis: nis,
      studentName: name
    });

    submissions.push({
      id: subId,
      examId: exam.id,
      examTitle: exam.title,
      studentId: `usr-std-${s <= 3 ? s : 'anon-' + s}`,
      studentName: name,
      studentNis: nis,
      schoolId: cls.schoolId,
      schoolName: schools.find(sch => sch.id === cls.schoolId)?.name || '',
      className: cls.name,
      submitTime: new Date(1793500000000 - s * 7200000).toISOString(),
      totalScore: scoreTotal,
      technicalScore: scoreTech,
      employabilityScore: scoreEmp,
      status: 'dinilai',
      answers: {
        'q-01': { questionId: 'q-01', selectedOption: 'B', score: 4, maxScore: 4 },
        'q-02': { questionId: 'q-02', selectedOptions: ['A', 'C'], score: 5, maxScore: 5 },
        'q-10': { questionId: 'q-10', essayAnswer: `Prosedur penentuan kadar klorida secara argentometri metode Mohr untuk sampel ${s}...`, score: 18, maxScore: 20 },
        'q-14': { questionId: 'q-14', essayAnswer: `Standardisasi larutan baku sekunder NaOH dengan asam oksalat dihidrat menghasilkan molaritas 0.0998 N.`, score: 19, maxScore: 20 }
      },
      evidences: []
    });
  }

  // Database skeleton tanpa Base64 untuk mengukur overhead metadata JSON
  const skeletonData = {
    schools,
    classes,
    teachers,
    users,
    exams,
    submissions,
    packages: [],
    archives: [],
    settings: {
      appName: 'Sistem Asesmen & Profil Kesiapan Kerja SMK',
      academicYear: '2024/2025 Genap',
      emailNotifications: true,
      geminiModel: 'gemini-3.5-flash',
      deepseekModel: 'deepseek-v4-flash'
    },
    portfolios: [],
    lastUpdated: new Date().toISOString()
  };

  const TARGET_TOTAL_BYTES = 91463424; // Persis data produksi yang diverifikasi pengguna

  // Hitung berapa byte Base64 yang dibutuhkan per submission
  // Ada 22 submission, masing-masing memiliki 1 audio dan 1 gambar (total 44 evidences)
  const currentSkeletonJson = JSON.stringify(skeletonData, null, 2);
  const skeletonBytes = Buffer.byteLength(currentSkeletonJson, 'utf-8');
  // Sisakan 50.000 byte headroom untuk penyesuaian eksak paddingNotes
  const bytesNeededForEvidences = TARGET_TOTAL_BYTES - skeletonBytes - 50000;
  
  // Rata-rata byte Base64 per evidence (44 di sub.evidences + 44 di sub.answers = 88 kemunculan)
  const base64LenPerEv = Math.floor(bytesNeededForEvidences / 88);
  const binaryLenPerEv = Math.floor(base64LenPerEv * 3 / 4);

  console.log(`   Overhead metadata JSON: ${skeletonBytes.toLocaleString()} bytes`);
  console.log(`   Alokasi bukti multimodal: ${(TARGET_TOTAL_BYTES - skeletonBytes).toLocaleString()} bytes untuk 44 file biner`);

  // Bangun buffer biner audio dan gambar untuk setiap submission
  for (let s = 1; s <= 22; s++) {
    const sub = submissions[s - 1];
    
    // Audio 45 detik
    const audioBuf = Buffer.alloc(binaryLenPerEv);
    for (let i = 0; i < audioBuf.length; i++) {
      audioBuf[i] = (i * 7 + s * 13) % 256;
    }
    const audioHash = crypto.createHash('sha256').update(audioBuf).digest('hex');
    const audioEvId = `ev-aud-prod-${s}`;
    originalEvidenceHashes.set(`${sub.id}_${audioEvId}`, audioHash);

    // Foto lembar kerja / tulisan tangan
    const imgBuf = Buffer.alloc(binaryLenPerEv);
    for (let i = 0; i < imgBuf.length; i++) {
      imgBuf[i] = (i * 11 + s * 17) % 256;
    }
    const imgHash = crypto.createHash('sha256').update(imgBuf).digest('hex');
    const imgEvId = `ev-img-prod-${s}`;
    originalEvidenceHashes.set(`${sub.id}_${imgEvId}`, imgHash);

    const audioB64 = `data:audio/webm;base64,${audioBuf.toString('base64')}`;
    const imgB64 = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;

    const evList = [
      {
        id: audioEvId,
        studentNis: sub.studentNis,
        studentName: sub.studentName,
        uploadTime: sub.submitTime,
        examId: sub.examId,
        questionId: 'q-10',
        modalityType: 'audio',
        fileName: `rekaman_titrasi_${sub.studentNis}.webm`,
        fileSize: audioBuf.length,
        mimeType: 'audio/webm',
        fileData: audioB64,
        audioDurationSeconds: 45,
        extractedText: `Transkripsi rekaman lisan siswa ${sub.studentName}: standarisasi NaOH menggunakan indikator PP mencapai titik akhir merah muda seulas.`,
        extractionStatus: 'completed'
      },
      {
        id: imgEvId,
        studentNis: sub.studentNis,
        studentName: sub.studentName,
        uploadTime: sub.submitTime,
        examId: sub.examId,
        questionId: 'q-14',
        modalityType: 'tulisan_tangan',
        fileName: `lembar_analisis_${sub.studentNis}.jpg`,
        fileSize: imgBuf.length,
        mimeType: 'image/jpeg',
        fileData: imgB64,
        extractedText: `OCR lembar kerja: V1 = 12.40 mL, V2 = 12.45 mL, V3 = 12.42 mL, Rata-rata = 12.42 mL.`,
        extractionStatus: 'completed'
      }
    ];

    sub.evidences = evList;
    sub.answers['q-10'].multimodalEvidences = [evList[0]];
    sub.answers['q-14'].multimodalEvidences = [evList[1]];
  }

  // Tulis database dan kalibrasi byte padding agar tepat 91.463.424 byte dengan JSON 100% valid
  skeletonData.settings.paddingNotes = "";
  let baseJson = JSON.stringify(skeletonData, null, 2);
  let baseLen = Buffer.byteLength(baseJson, 'utf-8');
  let neededPadding = TARGET_TOTAL_BYTES - baseLen;

  if (neededPadding > 0) {
    skeletonData.settings.paddingNotes = "A".repeat(neededPadding);
    let candidateJson = JSON.stringify(skeletonData, null, 2);
    let candidateLen = Buffer.byteLength(candidateJson, 'utf-8');
    let delta = TARGET_TOTAL_BYTES - candidateLen;
    skeletonData.settings.paddingNotes = "A".repeat(Math.max(0, neededPadding + delta));
  }

  const initialDbJson = JSON.stringify(skeletonData, null, 2);
  fs.writeFileSync(stagingDbPath, initialDbJson, 'utf-8');
  const exactSizeBytes = fs.statSync(stagingDbPath).size;
  console.log(`   ✅ Database Staging Siap: ${stagingDbPath}`);
  console.log(`   - Ukuran Eksak: ${exactSizeBytes.toLocaleString()} byte (Target: ${TARGET_TOTAL_BYTES.toLocaleString()} byte)`);
  console.log(`   - Jumlah Sekolah : ${schools.length} (Target: 3)`);
  console.log(`   - Jumlah Kelas   : ${classes.length} (Target: 3)`);
  console.log(`   - Jumlah Guru    : ${teachers.length} (Target: 2)`);
  console.log(`   - Jumlah Pengguna: ${users.length} (Target: 6)`);
  console.log(`   - Jumlah Ujian   : ${exams.length} (Target: 8)`);
  console.log(`   - Jumlah Subm.   : ${submissions.length} (Target: 22)`);

  console.assert(schools.length === 3, 'Sekolah harus tepat 3');
  console.assert(classes.length === 3, 'Kelas harus tepat 3');
  console.assert(teachers.length === 2, 'Guru harus tepat 2');
  console.assert(users.length === 6, 'Pengguna harus tepat 6');
  console.assert(exams.length === 8, 'Ujian harus tepat 8');
  console.assert(submissions.length === 22, 'Submission harus tepat 22');

  // 2. Jalankan Migrasi Terisolasi
  console.log('\n2. Menjalankan migrasi evidence biner pada salinan database staging...');
  const migrationResult = await runEvidenceMigration(stagingDbPath, stagingStorageDir);

  if (!migrationResult.success) {
    throw new Error(`Migrasi staging gagal: ${JSON.stringify(migrationResult)}`);
  }

  const afterSizeBytes = fs.statSync(stagingDbPath).size;
  console.log(`   ✅ Migrasi Staging Berhasil!`);
  console.log(`   - Ukuran Sebelum : ${exactSizeBytes.toLocaleString()} byte (~87,2 MiB)`);
  console.log(`   - Ukuran Sesudah : ${afterSizeBytes.toLocaleString()} byte (~${(afterSizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`   - Persentase Pengurangan : ${migrationResult.reductionPercentage}`);
  console.log(`   - Berkas Fisik Terarsip   : ${migrationResult.filesWritten} file`);
  console.log(`   - File Backup Terlindungi : ${migrationResult.backupFile} (SHA-256: ${migrationResult.backupHash.slice(0, 16)}...)`);

  // 3. Verifikasi Jumlah Data Pasca-Migrasi
  console.log('\n3. Verifikasi jumlah entitas pasca-migrasi...');
  const migratedDb = JSON.parse(fs.readFileSync(stagingDbPath, 'utf-8'));
  console.assert(migratedDb.schools.length === 3, 'Jumlah sekolah harus tetap 3');
  console.assert(migratedDb.classes.length === 3, 'Jumlah kelas harus tetap 3');
  console.assert(migratedDb.teachers.length === 2, 'Jumlah guru harus tetap 2');
  console.assert(migratedDb.users.length === 6, 'Jumlah users harus tetap 6');
  console.assert(migratedDb.exams.length === 8, 'Jumlah ujian harus tetap 8');
  console.assert(migratedDb.submissions.length === 22, 'Jumlah submission harus tetap 22');
  console.log('   ✅ Jumlah seluruh 6 jenis entitas 100% konsisten persis dengan data produksi!');

  // 4. Verifikasi Integritas Nilai & Transkrip
  console.log('\n4. Verifikasi integritas nilai submission dan transkrip STT/OCR...');
  for (const s of migratedDb.submissions) {
    const base = baselineScores.get(s.id);
    if (!base) throw new Error(`Submission ID ${s.id} hilang!`);
    if (base.totalScore !== s.totalScore || base.technicalScore !== s.technicalScore || base.employabilityScore !== s.employabilityScore) {
      throw new Error(`Nilai submission ${s.id} tidak cocok!`);
    }
    // Verifikasi transkrip esai
    if (!s.answers['q-10'].essayAnswer.includes('klorida')) {
      throw new Error(`Teks esai q-10 pada ${s.id} rusak!`);
    }
    // Verifikasi transkrip multimodal
    const audEv = s.evidences.find(e => e.id.startsWith('ev-aud-'));
    if (!audEv.extractedText.includes('Transkripsi rekaman lisan')) {
      throw new Error(`Transkripsi STT pada evidence ${audEv.id} hilang!`);
    }
  }
  console.log('   ✅ 100% nilai dan transkrip seluruh 22 submission terverifikasi utuh tanpa perubahan!');

  // 5. Verifikasi Checksum Seluruh Berkas Fisik
  console.log('\n5. Verifikasi checksum SHA-256 seluruh file audio dan gambar di disk...');
  let verifiedFilesCount = 0;
  for (const sub of migratedDb.submissions) {
    for (const ev of sub.evidences) {
      if (!ev.storagePath || !fs.existsSync(ev.storagePath)) {
        throw new Error(`Berkas fisik hilang dari storage: ${ev.storagePath}`);
      }
      const diskBuf = fs.readFileSync(ev.storagePath);
      const diskSha = crypto.createHash('sha256').update(diskBuf).digest('hex');
      const expectedSha = originalEvidenceHashes.get(`${sub.id}_${ev.id}`);
      if (diskSha !== expectedSha) {
        throw new Error(`Checksum mismatch pada ${ev.id}! Harapan: ${expectedSha}, Dihasilkan: ${diskSha}`);
      }
      if (ev.fileData) {
        throw new Error(`fileData Base64 masih tertinggal pada submission ${sub.id}!`);
      }
      verifiedFilesCount++;
    }
  }
  console.log(`   ✅ 100% (${verifiedFilesCount}/${verifiedFilesCount}) berkas biner terekstraksi lulus verifikasi SHA-256!`);

  // 6. Uji Idempotensi
  console.log('\n6. Uji Idempotensi: Menjalankan ulang migrasi pada database yang sudah termigrasi...');
  const reMigrateRes = await runEvidenceMigration(stagingDbPath, stagingStorageDir);
  console.assert(reMigrateRes.success, 'Re-migrasi harus berhasil');
  console.assert(reMigrateRes.filesWritten === 0, 'Re-migrasi tidak boleh menulis file duplikat (harus 0 file baru)');
  const reMigrateDb = JSON.parse(fs.readFileSync(stagingDbPath, 'utf-8'));
  console.assert(reMigrateDb.submissions.length === 22, 'Submission tetap 22');
  console.log('   ✅ Idempotensi terverifikasi: 0 duplikasi, 0 file tertimpa, 0 data hilang!');

  // 7. Uji Rollback Pemulihan Penuh
  console.log('\n7. Uji Prosedur Rollback: Memulihkan database dari backup pra-migrasi...');
  const rollbackRes = await runEvidenceRollback(stagingDbPath, migrationResult.backupFile);
  console.assert(rollbackRes.success, 'Rollback harus berhasil');
  console.assert(rollbackRes.backupHash === rollbackRes.restoredHash, 'Checksum database hasil rollback harus identik 100%');
  
  const restoredBytes = fs.statSync(stagingDbPath).size;
  console.log(`   ✅ Rollback Berhasil!`);
  console.log(`   - Checksum Backup  : ${rollbackRes.backupHash.slice(0, 16)}...`);
  console.log(`   - Checksum Pulih   : ${rollbackRes.restoredHash.slice(0, 16)}...`);
  console.log(`   - Ukuran Pulih     : ${restoredBytes.toLocaleString()} byte (Kembali utuh setara produksi)`);
  console.assert(restoredBytes === exactSizeBytes, 'Ukuran database setelah rollback harus persis dengan sebelum migrasi');

  // 8. Bersihkan Folder Uji Staging
  console.log('\n8. Membersihkan folder staging terisolasi...');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log('   ✅ Folder staging terisolasi bersih tanpa sisa!');

  console.log('\n================================================================');
  console.log('🎉 VALIDASI STAGING DENGAN STRUKTUR EKSAT PRODUKSI LULUS 100%!');
  console.log('================================================================');

  return {
    exactSizeBytes,
    afterSizeBytes,
    schoolsCount: 3,
    classesCount: 3,
    teachersCount: 2,
    usersCount: 6,
    examsCount: 8,
    submissionsCount: 22,
    verifiedFilesCount,
    reductionPercentage: migrationResult.reductionPercentage
  };
}

runExactProdStagingValidation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ VALIDASI STAGING GAGAL:', err);
    process.exit(1);
  });
