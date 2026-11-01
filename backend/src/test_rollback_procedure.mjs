import fs from "fs";
import path from "path";
import { runEvidenceMigration, runEvidenceRollback, calculateSha256 } from "./evidenceMigration.ts";

console.log("==================================================================");
console.log("🔄 TEST PROSEDUR ROLLBACK & PENANGANAN SUBMISSION PASCA-MIGRASI");
console.log("==================================================================\n");

const scratchDir = path.join(process.cwd(), "scratch_test_rollback");
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

const testDbPath = path.join(scratchDir, "database.json");
const testEvidenceDir = path.join(scratchDir, "evidence_storage");

// 1. Siapkan database awal dengan 22 submission
const initialSubmissions = Array.from({ length: 22 }, (_, idx) => ({
  id: `sub-orig-${idx + 1}`,
  examId: `ex-${(idx % 8) + 1}`,
  studentId: `std-${idx + 1}`,
  studentName: `Siswa Asli ${idx + 1}`,
  studentNis: `NIS-00${idx + 1}`,
  totalScore: 75 + (idx % 20),
  technicalScore: 75 + (idx % 20),
  employabilityScore: 0,
  status: "dinilai",
  submitTime: "2025-02-15T10:00:00Z",
  answers: {
    "q-1": {
      questionId: "q-1",
      essayAnswer: `Jawaban siswa asli nomor ${idx + 1}`,
      multimodalEvidences: [
        {
          id: `ev-orig-${idx + 1}`,
          fileName: `rekaman_${idx + 1}.webm`,
          modalityType: "audio",
          fileData: Buffer.from(`DATA_AUDIO_BASE64_ASLI_${idx + 1}`).toString("base64")
        }
      ]
    }
  }
}));

const initialDb = {
  schools: [{ id: "sch-1", name: "SMK 1" }, { id: "sch-2", name: "SMK 2" }, { id: "sch-3", name: "SMK 3" }],
  classes: [{ id: "cls-1", name: "Kelas A" }, { id: "cls-2", name: "Kelas B" }, { id: "cls-3", name: "Kelas C" }],
  teachers: [{ id: "t-1", name: "Guru 1" }, { id: "t-2", name: "Guru 2" }],
  users: [{ id: "u-1", name: "Admin" }, { id: "u-2", name: "Guru 1" }, { id: "u-3", name: "Guru 2" }],
  exams: Array.from({ length: 8 }, (_, i) => ({ id: `ex-${i + 1}`, title: `Ujian ${i + 1}` })),
  packages: [{ id: "pkg-1", title: "Paket 1", questions: [] }],
  submissions: initialSubmissions
};

fs.writeFileSync(testDbPath, JSON.stringify(initialDb, null, 2), "utf-8");
const hashOriginal = calculateSha256(fs.readFileSync(testDbPath));
console.log(`[1] Database awal dibuat: 22 submission (SHA-256: ${hashOriginal.slice(0, 16)}...)`);

// 2. Jalankan migrasi
console.log("\n[2] Menjalankan migrasi evidence...");
const migReport = runEvidenceMigration(testDbPath, testEvidenceDir, { createBackup: true });
console.log(`  ✅ Migrasi sukses: File backup dibuat di ${path.basename(migReport.backupFile)}`);
console.log(`  ✅ Checksum backup SHA-256: ${migReport.backupHash.slice(0, 16)}...`);

// 3. Simulasikan penambahan submission baru pasca-migrasi
console.log("\n[3] Mensimulasikan siswa mengumpulkan 3 submission baru pasca-migrasi...");
const currentDb = JSON.parse(fs.readFileSync(testDbPath, "utf-8"));
const newPostMigrationSubmissions = [
  {
    id: "sub-post-mig-01",
    examId: "ex-1",
    studentId: "std-new-1",
    studentName: "Siswa Baru Pasca Migrasi 1",
    totalScore: 92,
    status: "dinilai",
    submitTime: "2025-02-28T14:30:00Z"
  },
  {
    id: "sub-post-mig-02",
    examId: "ex-2",
    studentId: "std-new-2",
    studentName: "Siswa Baru Pasca Migrasi 2",
    totalScore: 88,
    status: "dinilai",
    submitTime: "2025-02-28T14:45:00Z"
  },
  {
    id: "sub-post-mig-03",
    examId: "ex-3",
    studentId: "std-new-3",
    studentName: "Siswa Baru Pasca Migrasi 3",
    totalScore: 95,
    status: "dinilai",
    submitTime: "2025-02-28T15:00:00Z"
  }
];
currentDb.submissions = [...newPostMigrationSubmissions, ...currentDb.submissions];
fs.writeFileSync(testDbPath, JSON.stringify(currentDb, null, 2), "utf-8");
console.log(`  ✅ Total submission saat ini sebelum rollback: ${currentDb.submissions.length} (22 asli + 3 baru)`);

// 4. Jalankan Prosedur Rollback
console.log("\n[4] Menjalankan prosedur rollback resmi...");
const rollbackReport = runEvidenceRollback(testDbPath, migReport.backupFile, { preserveNewSubmissions: true });

console.log("\n[5] Verifikasi hasil rollback:");
console.log(`  - Status Rollback                : ${rollbackReport.success ? "BERHASIL" : "GAGAL"}`);
console.log(`  - Submission baru yang diamankan : ${rollbackReport.newSubmissionsPreserved}`);
console.log(`  - File cadangan submission baru  : ${rollbackReport.preservedSubmissionsFile ? path.basename(rollbackReport.preservedSubmissionsFile) : "None"}`);

const restoredDb = JSON.parse(fs.readFileSync(testDbPath, "utf-8"));
const restoredIds = new Set(restoredDb.submissions.map(s => s.id));

let all22OriginalPresent = true;
initialSubmissions.forEach(s => {
  if (!restoredIds.has(s.id)) all22OriginalPresent = false;
});

let all3NewPresent = true;
newPostMigrationSubmissions.forEach(s => {
  if (!restoredIds.has(s.id)) all3NewPresent = false;
});

console.log(`  ✅ Seluruh 22 submission pra-migrasi ada dalam database: ${all22OriginalPresent ? "YA (LENGKAP)" : "TIDAK"}`);
console.log(`  ✅ Seluruh 3 submission baru pasca-migrasi tidak hilang: ${all3NewPresent ? "YA (TERJAGA)" : "TIDAK"}`);
console.log(`  ✅ Total submission dalam database pasca-rollback: ${restoredDb.submissions.length}`);

// Bersihkan scratch test
fs.rmSync(scratchDir, { recursive: true, force: true });

if (rollbackReport.success && all22OriginalPresent && all3NewPresent) {
  console.log("\n==================================================================");
  console.log("🎉 SEMUA UJI PROSEDUR ROLLBACK & DATA PRESERVATION LULUS 100%!");
  console.log("==================================================================\n");
  process.exit(0);
} else {
  console.error("❌ Verifikasi rollback gagal!");
  process.exit(1);
}
