// ====================================================================
// TEST SUITE: PENGUJIAN NYATA ROLLBACK DATABASE & RESET PASSWORD
// Mengeksekusi dist/safe_rollback_database.js & dist/emergency_reset_password.js
// ====================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
function verifyPassword(password, storedHashOrPlain) {
  if (!storedHashOrPlain || !password) return false;
  if (storedHashOrPlain.startsWith("scrypt:")) {
    const parts = storedHashOrPlain.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const key = parts[2];
    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const keyBuf = Buffer.from(key, "hex");
      return keyBuf.length === derivedKey.length && crypto.timingSafeEqual(keyBuf, derivedKey);
    } catch {
      return false;
    }
  }
  return password === storedHashOrPlain;
}

let passedCount = 0;
let failedCount = 0;

function pass(name) {
  passedCount++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name, detail = "") {
  failedCount++;
  console.log(`  ❌ [FAIL] ${name}`);
  if (detail) console.log(`     Detail: ${detail}`);
}

const testDir = path.resolve(process.cwd(), "scratch_test_staging_rollback");
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

console.log("======================================================================");
console.log("   UJI NYATA STAGING: DATABASE ROLLBACK & EMERGENCY PASSWORD RESET    ");
console.log("======================================================================");

// ------------------------------------------------------------------
// DATASET SINTETIS: 22 SUBMISSION AWAL & 3 SUBMISSION BARU
// ------------------------------------------------------------------
const initial22Submissions = Array.from({ length: 22 }, (_, idx) => ({
  id: `sub-orig-${String(idx + 1).padStart(2, "0")}`,
  examId: `exam-kimia-${(idx % 4) + 1}`,
  studentId: `std-${idx + 1}`,
  studentName: `Siswa Asli ${idx + 1}`,
  studentNis: `1000${idx + 1}`,
  totalScore: 80 + (idx % 15),
  autoScore: 60,
  essayScore: 20 + (idx % 15),
  status: "dinilai",
  submitTime: "2026-10-30T08:00:00Z",
  answers: {
    "q-1": {
      questionId: "q-1",
      selectedOption: "Opsi A",
      score: 20
    },
    "q-2": {
      questionId: "q-2",
      essayAnswer: `Jawaban analisis K3 siswa nomor ${idx + 1}`,
      score: 20
    }
  },
  evidences: [
    {
      id: `ev-orig-${idx + 1}`,
      fileName: `rekaman_${idx + 1}.webm`,
      storageUrl: `/api/evidence/file/rekaman_${idx + 1}.webm`,
      modalityType: "audio"
    }
  ]
}));

const new3PostDeploySubmissions = Array.from({ length: 3 }, (_, idx) => ({
  id: `sub-new-postdeploy-${idx + 1}`,
  examId: "exam-e2e-special",
  studentId: `std-new-${idx + 1}`,
  studentName: `Siswa Baru Pasca-Deploy ${idx + 1}`,
  studentNis: `2000${idx + 1}`,
  totalScore: 90 + idx,
  autoScore: 70,
  essayScore: 20 + idx,
  status: "dinilai",
  submitTime: "2026-11-01T12:00:00Z",
  answers: {
    "q-new-1": {
      questionId: "q-new-1",
      essayAnswer: `Bukti jawaban siswa baru ${idx + 1}`,
      score: 25
    }
  },
  evidences: [
    {
      id: `ev-new-${idx + 1}`,
      fileName: `audio_baru_${idx + 1}.webm`,
      storageUrl: `/api/evidence/file/audio_baru_${idx + 1}.webm`,
      modalityType: "audio"
    }
  ]
}));

// ------------------------------------------------------------------
// SKENARIO 1: ROLLBACK SUKSES DENGAN CHECKSUM & PRESERVASI SUBMISSION
// ------------------------------------------------------------------
console.log("\n[Skenario 1] Uji Rollback Sukses (22 Asli + 3 Baru = 25 Total)...");

const backupFile1 = path.join(testDir, "database-backup-valid.json");
const backupData1 = {
  version: "1.0.0",
  schools: [{ id: "sch-1", name: "SMK Negeri 1" }],
  classes: [{ id: "cls-1", name: "XII Kimia" }],
  users: [{ id: "usr-admin", email: "admin@app.com", role: "admin", password: "old" }],
  packages: [{ id: "pkg-1", title: "Paket 1" }],
  exams: [{ id: "exam-1", title: "Ujian 1" }],
  submissions: initial22Submissions
};

fs.writeFileSync(backupFile1, JSON.stringify(backupData1, null, 2), "utf-8");
const hash1 = crypto.createHash("sha256").update(fs.readFileSync(backupFile1)).digest("hex");
fs.writeFileSync(`${backupFile1}.sha256`, `${hash1}  ${path.basename(backupFile1)}\n`, "utf-8");

const activeDbFile = path.join(testDir, "active_database.json");
const newPostDeployUser = { id: "usr-new-teacher", email: "guru.baru@app.com", role: "guru", password: "hashed" };
const newPostDeployPackage = { id: "pkg-new-chem", title: "Paket Soal Baru Pasca-Deploy" };
const newPostDeployExam = { id: "exam-new-schedule", title: "Jadwal Ujian Baru Pasca-Deploy" };

const activeDbData = {
  ...backupData1,
  users: [...backupData1.users, newPostDeployUser],
  packages: [...backupData1.packages, newPostDeployPackage],
  exams: [...backupData1.exams, newPostDeployExam],
  submissions: [...initial22Submissions, ...new3PostDeploySubmissions] // 22 + 3 = 25
};
fs.writeFileSync(activeDbFile, JSON.stringify(activeDbData, null, 2), "utf-8");

try {
  // Jalankan file JavaScript hasil kompilasi produksi
  const cmd = `node dist/safe_rollback_database.js "${backupFile1}" "${activeDbFile}"`;
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: "pipe"
  });

  const restored = JSON.parse(fs.readFileSync(activeDbFile, "utf-8"));
  if (restored.submissions && restored.submissions.length === 25) {
    pass("Database berhasil di-restore dan memuat seluruh 25 submission (22 asli + 3 baru)");
  } else {
    fail("Jumlah submission setelah restore tidak cocok", `Ditemukan ${restored.submissions?.length}`);
  }

  const hasAllOrig = initial22Submissions.every(orig => restored.submissions.some(s => s.id === orig.id));
  const hasAllNew = new3PostDeploySubmissions.every(nw => restored.submissions.some(s => s.id === nw.id));

  if (hasAllOrig && hasAllNew) {
    pass("Seluruh 22 submission pra-deploy dan 3 submission pasca-deploy terpelihara utuh");
  } else {
    fail("Data submission hilang atau rusak setelah rollback!");
  }

  // Verifikasi akun, paket soal, dan jadwal baru pasca-deploy terpelihara
  const hasNewUser = restored.users && restored.users.some(u => u.id === newPostDeployUser.id);
  const hasNewPkg = restored.packages && restored.packages.some(p => p.id === newPostDeployPackage.id);
  const hasNewExam = restored.exams && restored.exams.some(e => e.id === newPostDeployExam.id);

  if (hasNewUser && hasNewPkg && hasNewExam) {
    pass("Akun pengguna, paket soal, dan jadwal ujian baru pasca-deploy 100% terpelihara (zero data loss)");
  } else {
    fail("Perubahan akun/paket/jadwal pasca-deploy hilang setelah rollback!");
  }

  // Verifikasi file preservasi dibuat
  const preservedFiles = fs.readdirSync(testDir).filter(f => f.includes("post_deploy_preserved_"));
  if (preservedFiles.length > 0) {
    pass(`File cadangan preservasi entitas baru berhasil dibuat: ${preservedFiles[0]}`);
  } else {
    fail("File cadangan preservasi submission baru tidak ditemukan");
  }
} catch (err) {
  fail("Skenario 1 gagal eksekusi", err.message);
}

// ------------------------------------------------------------------
// SKENARIO 2: CHECKSUM MISMATCH (GAGAL TANPA MENIMPA DATABASE AKTIF)
// ------------------------------------------------------------------
console.log("\n[Skenario 2] Uji Penolakan Checksum SHA-256 Tidak Cocok...");

const backupFile2 = path.join(testDir, "database-backup-tampered.json");
fs.writeFileSync(backupFile2, JSON.stringify(backupData1, null, 2), "utf-8");
fs.writeFileSync(`${backupFile2}.sha256`, `deadbeef00000000000000000000000000000000000000000000000000000000  ${path.basename(backupFile2)}\n`);

const hashActiveBefore2 = crypto.createHash("sha256").update(fs.readFileSync(activeDbFile)).digest("hex");

let failedChecksumAsExpected = false;
try {
  const cmd = `node dist/safe_rollback_database.js "${backupFile2}" "${activeDbFile}"`;
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: "pipe"
  });
} catch (err) {
  const errOutput = `${err.message || ""} ${err.stderr ? err.stderr.toString() : ""} ${err.stdout ? err.stdout.toString() : ""}`;
  if (errOutput.includes("CHECKSUM MISMATCH")) {
    failedChecksumAsExpected = true;
  }
}

const hashActiveAfter2 = crypto.createHash("sha256").update(fs.readFileSync(activeDbFile)).digest("hex");

if (failedChecksumAsExpected) {
  pass("Rollback dengan checksum SHA-256 salah ditolak seketika (Exit Code != 0)");
} else {
  fail("Rollback dengan checksum salah tidak melempar error!");
}

if (hashActiveBefore2 === hashActiveAfter2) {
  pass("Database aktif 100% TIDAK TERTELITI / TIDAK TERTINDAK saat checksum gagal");
} else {
  fail("Database aktif termodifikasi padahal checksum gagal!");
}

// ------------------------------------------------------------------
// SKENARIO 3: FILE BACKUP RUSAK / BUKAN JSON VALID
// ------------------------------------------------------------------
console.log("\n[Skenario 3] Uji Penolakan File Backup Korup (Invalid JSON)...");

const backupFile3 = path.join(testDir, "database-corrupted.json");
fs.writeFileSync(backupFile3, '{"submissions": [ {"id": "corrupt"', "utf-8"); // Broken JSON
const hash3 = crypto.createHash("sha256").update(fs.readFileSync(backupFile3)).digest("hex");
fs.writeFileSync(`${backupFile3}.sha256`, `${hash3}  ${path.basename(backupFile3)}\n`);

const hashActiveBefore3 = crypto.createHash("sha256").update(fs.readFileSync(activeDbFile)).digest("hex");

let failedCorruptJson = false;
try {
  const cmd = `node dist/safe_rollback_database.js "${backupFile3}" "${activeDbFile}"`;
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: "pipe"
  });
} catch (err) {
  const errOutput = `${err.message || ""} ${err.stderr ? err.stderr.toString() : ""} ${err.stdout ? err.stdout.toString() : ""}`;
  if (errOutput.includes("RUSAK") || errOutput.includes("JSON") || errOutput.includes("SyntaxError")) {
    failedCorruptJson = true;
  }
}

const hashActiveAfter3 = crypto.createHash("sha256").update(fs.readFileSync(activeDbFile)).digest("hex");

if (failedCorruptJson) {
  pass("Backup dengan JSON korup ditolak sebelum parsing atau penulisan");
} else {
  fail("Backup korup tidak melempar error yang sesuai");
}

if (hashActiveBefore3 === hashActiveAfter3) {
  pass("Database aktif 100% aman dan tidak terdistorsi oleh backup korup");
} else {
  fail("Database aktif terdistorsi oleh backup korup!");
}

// ------------------------------------------------------------------
// SKENARIO 4: FILE BACKUP TIDAK DITEMUKAN
// ------------------------------------------------------------------
console.log("\n[Skenario 4] Uji Penolakan File Backup Tidak Ditemukan...");

let failedMissingFile = false;
try {
  const cmd = `node dist/safe_rollback_database.js "${path.join(testDir, "non_existent.json")}" "${activeDbFile}"`;
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: "pipe"
  });
} catch (err) {
  const errOutput = `${err.message || ""} ${err.stderr ? err.stderr.toString() : ""} ${err.stdout ? err.stdout.toString() : ""}`;
  if (errOutput.includes("tidak ditemukan")) {
    failedMissingFile = true;
  }
}

if (failedMissingFile) {
  pass("File backup fiktif ditolak seketika");
} else {
  fail("File tidak ada tidak menghasilkan error");
}

// ------------------------------------------------------------------
// SKENARIO 5: UJI RESET PASSWORD DARURAT DENGAN INPUT TERSELUBUNG
// ------------------------------------------------------------------
console.log("\n[Skenario 5] Uji Reset Password Darurat (Masked Piped Input & Scrypt Hash)...");

const secretNewPass = "KatasandiAdminBaru2026!#";

try {
  // Simulasi input terselubung via stdin pipe (bukan parameter command line)
  const cmd = `node dist/emergency_reset_password.js admin@app.com --db "${activeDbFile}"`;
  const output = execSync(cmd, {
    cwd: process.cwd(),
    input: `${secretNewPass}\n`,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf-8"
  });

  const dbAfterReset = JSON.parse(fs.readFileSync(activeDbFile, "utf-8"));
  const adminUser = dbAfterReset.users.find(u => u.email === "admin@app.com");

  if (adminUser && adminUser.password.startsWith("scrypt:")) {
    pass("Password admin berhasil di-hash menggunakan algoritma scrypt aman");
  } else {
    fail("Password admin tidak berformat scrypt");
  }

  const isPasswordValid = verifyPassword(secretNewPass, adminUser.password);
  if (isPasswordValid) {
    pass("Verifikasi kredensial baru cocok 100% dengan hash scrypt yang tersimpan");
  } else {
    fail("Verifikasi password baru gagal!");
  }

  if (adminUser.mustChangePassword === true) {
    pass("Flag mustChangePassword diaktifkan untuk mewajibkan rotasi berkala");
  } else {
    fail("Flag mustChangePassword tidak aktif");
  }

  if (!output.includes(secretNewPass)) {
    pass("Password baru TIDAK PERNAH dicetak dalam log terminal / output stdout");
  } else {
    fail("KATA SANDI BOCOR DALAM LOG TERMINAL!");
  }
} catch (err) {
  fail("Skenario 5 gagal eksekusi", err.message);
}

// ------------------------------------------------------------------
// CLEANUP
// ------------------------------------------------------------------
fs.rmSync(testDir, { recursive: true, force: true });

console.log("\n======================================================================");
console.log(`  HASIL PENGUJIAN STAGING ROLLBACK & RESET: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("======================================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
