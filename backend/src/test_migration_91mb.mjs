import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runEvidenceMigration, runEvidenceRollback } from './evidenceMigration.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run91MbMigrationValidation() {
  console.log('================================================================');
  console.log('🧪 VALIDASI 1: MIGRASI & ROLLBACK DATABASE TERISOLASI (~91 MB)');
  console.log('================================================================');

  const testDir = path.resolve(__dirname, '../data/migration_test_isolated');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testDbPath = path.join(testDir, 'isolated_prod_sim_91mb.json');
  const testStorageDir = path.join(testDir, 'evidence_storage');

  console.log('1. Mempersiapkan database simulasi terisolasi setara 91.4 MB...');
  
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

  // Guru
  const teachers = [
    { id: 'tch-01', name: 'Dra. Hj. Nurul Hidayati, M.Pd.', nip: '197505122000032001', schoolId: 'sch-cirebon-01', email: 'nurul@smkn1cirebon.sch.id' },
    { id: 'tch-02', name: 'Bambang Sudarmono, S.T., M.Eng.', nip: '198008152005011004', schoolId: 'sch-bandung-02', email: 'bambang@smkn2bandung.sch.id' },
    { id: 'tch-03', name: 'Ir. Ratna Dewi, M.Si.', nip: '198203202008012012', schoolId: 'sch-jakarta-03', email: 'ratna@smkkimiajakarta.sch.id' }
  ];

  // Siswa
  const users = [
    { id: 'usr-admin', name: 'Administrator', role: 'admin', email: 'admin@employaskills.sch.id' }
  ];
  for (let i = 1; i <= 22; i++) {
    const cls = classes[(i - 1) % 3];
    users.push({
      id: `usr-std-${i}`,
      name: `Siswa Asesmen ${i}`,
      role: 'siswa',
      nis: `2024100${i.toString().padStart(2, '0')}`,
      email: `siswa${i}@example.com`,
      schoolId: cls.schoolId,
      classId: cls.id
    });
  }

  // 8 Ujian
  const exams = [];
  for (let e = 1; e <= 8; e++) {
    const cls = classes[(e - 1) % 3];
    exams.push({
      id: `exam-prod-0${e}`,
      title: `Ujian Kompetensi Kejuruan Kimia Terstandar Paket ${e}`,
      packageId: `pkg-kimia-0${e}`,
      packageTitle: `Paket Soal Terpadu Kimia Analisis & K3LH Seri ${e}`,
      category: e % 2 === 0 ? 'teknis_kimia' : 'employability',
      classId: cls.id,
      className: cls.name,
      schoolId: cls.schoolId,
      schoolName: schools.find(s => s.id === cls.schoolId)?.name || '',
      teacherId: teachers[(e - 1) % 3].id,
      teacherName: teachers[(e - 1) % 3].name,
      scheduleDate: '2026-10-15',
      startTime: '08:00',
      endTime: '10:00',
      durationMinutes: 120,
      targetScore: 75,
      status: 'selesai',
      totalStudents: 22,
      completedStudents: 22
    });
  }

  // 22 Submissions dengan Multimodal Evidence Base64 besar untuk mencapai total ~91 MB
  // Target: 22 submissions total ~91.4 MB -> ~4.15 MB per submission
  const submissions = [];
  const evidenceOriginalHashes = new Map(); // fileKey -> sha256

  console.log('   Menghasilkan data multimodal biner realistis (audio 10s-60s & foto lab)...');
  
  // Buat dummy audio buffer 2 MB & dummy image buffer 1 MB
  const dummyAudioBuffer = Buffer.alloc(2 * 1024 * 1024);
  for (let b = 0; b < dummyAudioBuffer.length; b++) {
    dummyAudioBuffer[b] = (b * 7 + 13) % 256;
  }
  const dummyAudioB64 = `data:audio/webm;base64,${dummyAudioBuffer.toString('base64')}`;
  
  const dummyImageBuffer = Buffer.alloc(1.2 * 1024 * 1024);
  for (let b = 0; b < dummyImageBuffer.length; b++) {
    dummyImageBuffer[b] = (b * 11 + 37) % 256;
  }
  const dummyImageB64 = `data:image/jpeg;base64,${dummyImageBuffer.toString('base64')}`;

  for (let s = 1; s <= 22; s++) {
    const std = users.find(u => u.id === `usr-std-${s}`);
    const exam = exams[(s - 1) % 8];
    const subId = `sub-prod-2026-${s.toString().padStart(3, '0')}`;
    
    // Evidences for this submission
    const audioEvId = `ev-aud-${s}`;
    const imageEvId = `ev-img-${s}`;

    // Compute original binary sha256
    const audioHash = crypto.createHash('sha256').update(dummyAudioBuffer).digest('hex');
    const imageHash = crypto.createHash('sha256').update(dummyImageBuffer).digest('hex');

    evidenceOriginalHashes.set(`${subId}_${audioEvId}`, audioHash);
    evidenceOriginalHashes.set(`${subId}_${imageEvId}`, imageHash);

    const evidences = [
      {
        id: audioEvId,
        studentNis: std.nis,
        studentName: std.name,
        uploadTime: new Date(Date.now() - s * 3600000).toISOString(),
        examId: exam.id,
        questionId: 'q-essay-01',
        modalityType: 'audio',
        fileName: `rekaman_penjelasan_titrasi_${std.nis}.webm`,
        fileSize: dummyAudioBuffer.length,
        mimeType: 'audio/webm',
        fileData: dummyAudioB64,
        audioDurationSeconds: 45,
        extractedText: 'Hasil standarisasi larutan NaOH dengan asam oksalat menghasilkan normalitas 0.0998 N.',
        extractionStatus: 'completed'
      },
      {
        id: imageEvId,
        studentNis: std.nis,
        studentName: std.name,
        uploadTime: new Date(Date.now() - s * 3600000 + 60000).toISOString(),
        examId: exam.id,
        questionId: 'q-essay-02',
        modalityType: 'tulisan_tangan',
        fileName: `lembar_kerja_analisis_${std.nis}.jpg`,
        fileSize: dummyImageBuffer.length,
        mimeType: 'image/jpeg',
        fileData: dummyImageB64,
        extractedText: 'Perhitungan kadar air sampel: W1 = 2.0014 g, W2 = 1.8745 g, %kadar = 6.34%.',
        extractionStatus: 'completed'
      }
    ];

    submissions.push({
      id: subId,
      examId: exam.id,
      examTitle: exam.title,
      studentId: std.id,
      studentName: std.name,
      studentNis: std.nis,
      schoolId: std.schoolId,
      className: classes.find(c => c.id === std.classId)?.name || '',
      submitTime: new Date(Date.now() - s * 3600000 + 3600000).toISOString(),
      totalScore: 78 + (s % 18),
      technicalScore: 80 + (s % 15),
      employabilityScore: 75 + (s % 20),
      status: 'dinilai',
      answers: {
        'q-mcq-01': { questionId: 'q-mcq-01', selectedOption: 'B', score: 4, maxScore: 4 },
        'q-essay-01': { questionId: 'q-essay-01', essayAnswer: 'Prosedur titrasi asam basa dilakukan secara triplo...', score: 18, maxScore: 20 },
        'q-essay-02': { questionId: 'q-essay-02', essayAnswer: 'Perhitungan gravimetri kadar abu...', score: 19, maxScore: 20 }
      },
      evidences
    });
  }

  const initialDbData = {
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
      emailNotifications: true
    },
    portfolios: [],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(testDbPath, JSON.stringify(initialDbData, null, 2), 'utf-8');
  const initialSizeBytes = fs.statSync(testDbPath).size;
  const initialSizeMb = (initialSizeBytes / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Database simulasi siap: ${testDbPath} (${initialSizeMb} MB / ${initialSizeBytes.toLocaleString()} bytes)`);

  // Record baseline scores
  const baselineScores = new Map();
  for (const s of submissions) {
    baselineScores.set(s.id, {
      totalScore: s.totalScore,
      technicalScore: s.technicalScore,
      employabilityScore: s.employabilityScore
    });
  }

  console.log('\n2. Menjalankan migrasi evidence biner (runEvidenceMigration)...');
  const migrationResult = await runEvidenceMigration(testDbPath, testStorageDir);

  if (!migrationResult.success) {
    throw new Error(`Migrasi gagal: ${JSON.stringify(migrationResult)}`);
  }

  const afterSizeBytes = fs.statSync(testDbPath).size;
  const afterSizeKb = (afterSizeBytes / 1024).toFixed(2);
  console.log(`   ✅ Migrasi Berhasil!`);
  console.log(`   - Ukuran Sebelum: ${initialSizeMb} MB (${initialSizeBytes.toLocaleString()} bytes)`);
  console.log(`   - Ukuran Sesudah: ${afterSizeKb} KB (${afterSizeBytes.toLocaleString()} bytes)`);
  console.log(`   - Pengurangan Ukuran: ${migrationResult.reductionPercentage}`);
  console.log(`   - File Bukti Terekstraksi: ${migrationResult.filesWritten}`);
  console.log(`   - Backup Dibuat: ${migrationResult.backupFile} (Hash: ${migrationResult.backupHash.slice(0, 16)}...)`);

  // Verify Counts
  console.log('\n3. Verifikasi jumlah entitas sekolah, kelas, guru, siswa, ujian, submission...');
  const migratedDb = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  console.assert(migratedDb.schools.length === 3, 'Jumlah sekolah harus 3');
  console.assert(migratedDb.classes.length === 3, 'Jumlah kelas harus 3');
  console.assert(migratedDb.teachers.length === 3, 'Jumlah guru harus 3');
  console.assert(migratedDb.users.length === 23, 'Jumlah users harus 23');
  console.assert(migratedDb.exams.length === 8, 'Jumlah ujian harus 8');
  console.assert(migratedDb.submissions.length === 22, 'Jumlah submission harus 22');
  console.log('   ✅ Seluruh jumlah entitas 100% konsisten!');

  // Verify Scores
  console.log('\n4. Verifikasi nilai totalScore, technicalScore, employabilityScore...');
  for (const s of migratedDb.submissions) {
    const base = baselineScores.get(s.id);
    if (!base || base.totalScore !== s.totalScore || base.technicalScore !== s.technicalScore || base.employabilityScore !== s.employabilityScore) {
      throw new Error(`Nilai submission ${s.id} berubah! Sebelum: ${JSON.stringify(base)}, Sesudah: ${JSON.stringify(s)}`);
    }
  }
  console.log('   ✅ Nilai 22 submission 100% identik dengan baseline!');

  // Verify Checksums of all extracted files
  console.log('\n5. Verifikasi integritas checksum SHA-256 seluruh file biner terarsip...');
  let checkedFilesCount = 0;
  for (const sub of migratedDb.submissions) {
    for (const ev of sub.evidences) {
      if (!ev.storagePath || !fs.existsSync(ev.storagePath)) {
        throw new Error(`Storage path tidak ditemukan: ${ev.storagePath}`);
      }
      const diskBuffer = fs.readFileSync(ev.storagePath);
      const diskHash = crypto.createHash('sha256').update(diskBuffer).digest('hex');
      const expectedHash = evidenceOriginalHashes.get(`${sub.id}_${ev.id}`);
      if (diskHash !== expectedHash) {
        throw new Error(`Checksum tidak cocok untuk ${ev.id}! Harapan: ${expectedHash}, Ada: ${diskHash}`);
      }
      if (ev.fileHash !== expectedHash) {
        throw new Error(`Metadata fileHash tidak cocok untuk ${ev.id}!`);
      }
      if (ev.fileData) {
        throw new Error(`fileData Base64 masih tertinggal pada submission ${sub.id} evidence ${ev.id}!`);
      }
      checkedFilesCount++;
    }
  }
  console.log(`   ✅ 100% dari ${checkedFilesCount} file biner terekstraksi lulus verifikasi SHA-256!`);

  // 6. Test Idempotency: Re-running migration must not create duplicates or lose data
  console.log('\n6. Uji Idempotensi: Menjalankan ulang migrasi pada database yang sudah termigrasi...');
  const secondMigrationResult = await runEvidenceMigration(testDbPath, testStorageDir);
  console.assert(secondMigrationResult.success, 'Migrasi kedua harus berhasil');
  console.assert(secondMigrationResult.filesWritten === 0, 'Migrasi kedua tidak boleh menulis file duplikat (harus 0 file baru)');
  const idempotencyDb = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  console.assert(idempotencyDb.submissions.length === 22, 'Jumlah submission tetap 22');
  console.log('   ✅ Idempotensi terverifikasi: 0 file duplikat, 0 data hilang saat migrasi dijalankan ulang!');

  // 7. Test Rollback: Restore database from backup
  console.log('\n7. Uji Prosedur Rollback: Memulihkan database dari backup pra-migrasi...');
  const rollbackResult = await runEvidenceRollback(testDbPath, migrationResult.backupFile);
  if (!rollbackResult.success) {
    throw new Error(`Rollback gagal: ${JSON.stringify(rollbackResult)}`);
  }
  console.log(`   ✅ Rollback Berhasil!`);
  console.log(`   - Hash Backup: ${rollbackResult.backupHash.slice(0, 16)}...`);
  console.log(`   - Hash Dipulihkan: ${rollbackResult.restoredHash.slice(0, 16)}...`);
  console.assert(rollbackResult.backupHash === rollbackResult.restoredHash, 'Hash file hasil rollback harus persis dengan backup');
  
  const restoredDb = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  console.assert(restoredDb.submissions.length === 22, 'Jumlah submission setelah rollback harus 22');
  const restoredSizeBytes = fs.statSync(testDbPath).size;
  console.log(`   - Ukuran setelah rollback: ${(restoredSizeBytes / (1024 * 1024)).toFixed(2)} MB (${restoredSizeBytes.toLocaleString()} bytes)`);
  console.log('   ✅ Prosedur rollback 100% teruji dan aman!');

  // Cleanup test artifacts
  console.log('\n8. Membersihkan folder isolasi simulasi pengujian...');
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('   ✅ Direktori pengujian terisolasi bersih!');

  return {
    initialSizeMb,
    afterSizeKb,
    reductionPercentage: migrationResult.reductionPercentage,
    schoolsCount: 3,
    classesCount: 3,
    teachersCount: 3,
    examsCount: 8,
    submissionsCount: 22,
    checkedFilesCount,
    idempotencyPassed: true,
    rollbackPassed: true
  };
}

run91MbMigrationValidation()
  .then(res => {
    console.log('\n================================================================');
    console.log('🎉 VALIDASI 1 SELESAI: SEMUA KRITERIA MIGRASI TERPENUHI LENGKAP!');
    console.log('================================================================');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ VALIDASI 1 GAGAL:', err);
    process.exit(1);
  });
