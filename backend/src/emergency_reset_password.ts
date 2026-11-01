import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { getDatabasePaths } from "./db";
import { hashPassword } from "./auth";

/**
 * Prompt password with masked input (echoes asterisks in TTY, silent in pipe)
 * Never leaks the plain password to process table, shell history, or logs.
 */
export async function promptPasswordMasked(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(promptText);

    if (!process.stdin.isTTY) {
      // Non-interactive / piped stdin
      const rl = readline.createInterface({ input: process.stdin, terminal: false });
      rl.once("line", (line) => {
        rl.close();
        resolve(line.trim());
      });
      return;
    }

    // Interactive TTY mode: mask keystrokes
    let pass = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");

    const onData = (char: string) => {
      // Enter / Return
      if (char === "\n" || char === "\r" || char === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(pass.trim());
      } else if (char === "\u0003") {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\nOperasi dibatalkan.\n");
        process.exit(130);
      } else if (char === "\b" || char === "\x7f") {
        // Backspace
        if (pass.length > 0) {
          pass = pass.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        pass += char;
        process.stdout.write("*");
      }
    };

    process.stdin.on("data", onData);
  });
}

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
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) {
  const rawArgs = process.argv.slice(2);
  let targetUser = "";
  let explicitPassword = "";
  let targetDbArg = process.env.VOC_DATABASE_PATH;

  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--db" && rawArgs[i + 1]) {
      targetDbArg = rawArgs[i + 1];
      i++;
    } else if (!targetUser) {
      targetUser = rawArgs[i];
    } else if (!explicitPassword) {
      explicitPassword = rawArgs[i];
    }
  }

  if (!targetUser) targetUser = "admin@app.com";

  (async () => {
    try {
      let passwordToSet = "";

      // Prioritas 1: Jika password tidak diberikan pada argumen CLI (Rekomendasi Keamanan Utama), minta input tersembunyi
      if (explicitPassword) {
        passwordToSet = explicitPassword;
        console.warn("[PERINGATAN KEAMANAN]: Mengirim password via argumen terminal dapat terbaca di process table (ps aux). Disarankan menggunakan input interaktif tersembunyi.");
      } else {
        passwordToSet = await promptPasswordMasked(`Masukkan Password Baru untuk [${targetUser}] (Input Terselubung): `);
      }

      if (!passwordToSet || passwordToSet.length < 6) {
        console.error("\n❌ Gagal: Password minimal 6 karakter.");
        process.exit(1);
      }

      const res = emergencyResetPassword(targetUser, passwordToSet, targetDbArg);
      console.log("\n==================================================================");
      console.log("✅ RESET PASSWORD DARURAT BERHASIL!");
      console.log(`- Nama Pengguna : ${res.name}`);
      console.log(`- Email         : ${res.email}`);
      console.log(`- Peran Akun    : ${res.role}`);
      console.log("- Status Hashing: scrypt (16-byte random salt, 64-byte key)");
      console.log("- Password tersimpan aman dan TIDAK dicetak di log terminal.");
      console.log("- Pengguna dapat login sekarang menggunakan password baru tersebut.");
      console.log("==================================================================\n");
    } catch (err: any) {
      console.error(`\n❌ [EMERGENCY-RESET ERROR]: ${err.message}\n`);
      process.exit(1);
    }
  })();
}
