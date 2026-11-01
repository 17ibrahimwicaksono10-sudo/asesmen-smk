import fs from "fs";
import { getDatabasePaths } from "./db";
import { hashPassword } from "./auth";

export function emergencyResetPassword(targetEmailOrRole: string, newPlainPassword: string, customDbPath?: string): {
  success: boolean;
  email: string;
  name: string;
  role: string;
} {
  if (!newPlainPassword || newPlainPassword.trim().length < 6) {
    throw new Error("Password baru harus memiliki panjang minimal 6 karakter.");
  }

  const { targetFile } = getDatabasePaths();
  const dbFile = customDbPath || targetFile;
  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database tidak ditemukan di: ${dbFile}`);
  }

  const raw = fs.readFileSync(dbFile, "utf-8");
  const db = JSON.parse(raw);

  const cleanTarget = (targetEmailOrRole || "").trim().toLowerCase();
  const users = Array.isArray(db.users) ? db.users : [];

  let userIdx = -1;
  if (cleanTarget === "admin" || cleanTarget === "role:admin") {
    userIdx = users.findIndex((u: any) => u.role === "admin");
  } else {
    userIdx = users.findIndex((u: any) => u.email.toLowerCase() === cleanTarget);
  }

  if (userIdx < 0) {
    throw new Error(`Pengguna dengan email/role "${targetEmailOrRole}" tidak ditemukan dalam database.`);
  }

  // Backup database sebelum perubahan darurat
  const backupPath = `${dbFile}.pre_emergency_reset_${Date.now()}.backup.json`;
  fs.copyFileSync(dbFile, backupPath);

  const hashedPassword = hashPassword(newPlainPassword.trim());
  const user = users[userIdx];
  user.password = hashedPassword;
  user.mustChangePassword = true; // Flag untuk mewajibkan perubahan password pada login pertama

  // Jika akun adalah guru, sinkronkan ke db.teachers
  if (user.role === "guru" && Array.isArray(db.teachers)) {
    const teacherIdx = db.teachers.findIndex((t: any) => t.id === user.id || t.email.toLowerCase() === user.email.toLowerCase());
    if (teacherIdx >= 0) {
      db.teachers[teacherIdx].password = hashedPassword;
      db.teachers[teacherIdx].mustChangePassword = true;
    }
  }

  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");

  console.log(`[EMERGENCY-RESET] Password akun ${user.name} (${user.email}) berhasil direset secara aman.`);
  console.log(`[EMERGENCY-RESET] Status hashing: scrypt (Garam kriptografis unik).`);
  console.log(`[EMERGENCY-RESET] Flag wajib ganti password (mustChangePassword): AKTIF.`);

  return {
    success: true,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

// CLI Runner
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Gunakan: npm run emergency:reset-password -- <email-atau-admin> <password-baru>");
    console.error("Contoh 1: npm run emergency:reset-password -- admin@app.com PasswordBaru123!");
    console.error("Contoh 2: npm run emergency:reset-password -- admin PasswordBaru123!");
    process.exit(1);
  }

  try {
    const res = emergencyResetPassword(args[0], args[1]);
    console.log("\n==================================================================");
    console.log("✅ RESET PASSWORD DARURAT BERHASIL!");
    console.log(`- Nama Pengguna : ${res.name}`);
    console.log(`- Email         : ${res.email}`);
    console.log(`- Peran Akun    : ${res.role}`);
    console.log("- Pengguna dapat login sekarang menggunakan password baru tersebut.");
    console.log("==================================================================\n");
  } catch (err: any) {
    console.error(`\n❌ [EMERGENCY-RESET ERROR]: ${err.message}\n`);
    process.exit(1);
  }
}
