import fs from "fs";
import path from "path";
import { getDatabasePaths } from "./db";
import { hashPassword } from "./auth";

export function runPasswordMigration(customDbPath?: string): {
  success: boolean;
  totalUsers: number;
  migratedUsers: number;
  alreadyHashedUsers: number;
  totalTeachers: number;
  migratedTeachers: number;
} {
  const { targetFile } = getDatabasePaths();
  const dbFile = customDbPath || targetFile;

  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database file not found at: ${dbFile}`);
  }

  // Buat backup database sebelum migrasi
  const backupFile = `${dbFile}.pre_password_hash_${Date.now()}.backup.json`;
  fs.copyFileSync(dbFile, backupFile);
  console.log(`[PASS-MIGRATE] Backup database dibuat di: ${backupFile}`);

  const raw = fs.readFileSync(dbFile, "utf-8");
  const db = JSON.parse(raw);

  let migratedUsers = 0;
  let alreadyHashedUsers = 0;
  const users = Array.isArray(db.users) ? db.users : [];

  for (const user of users) {
    if (user.password) {
      if (user.password.startsWith("scrypt:")) {
        alreadyHashedUsers++;
      } else {
        user.password = hashPassword(user.password);
        migratedUsers++;
      }
    }
  }

  let migratedTeachers = 0;
  const teachers = Array.isArray(db.teachers) ? db.teachers : [];
  for (const teacher of teachers) {
    if (teacher.password) {
      if (!teacher.password.startsWith("scrypt:")) {
        teacher.password = hashPassword(teacher.password);
        migratedTeachers++;
      }
    }
  }

  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");

  console.log(`[PASS-MIGRATE] Migrasi password selesai:`);
  console.log(`   - Total akun pengguna: ${users.length}`);
  console.log(`   - Berhasil dimigrasikan ke scrypt: ${migratedUsers}`);
  console.log(`   - Sudah menggunakan scrypt: ${alreadyHashedUsers}`);
  console.log(`   - Guru disinkronkan: ${migratedTeachers}`);

  return {
    success: true,
    totalUsers: users.length,
    migratedUsers,
    alreadyHashedUsers,
    totalTeachers: teachers.length,
    migratedTeachers,
  };
}

// Eksekusi langsung jika dipanggil via CLI
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  try {
    runPasswordMigration();
  } catch (err: any) {
    console.error("[PASS-MIGRATE] Error:", err.message);
    process.exit(1);
  }
}
