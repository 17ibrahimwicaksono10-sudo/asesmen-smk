import fs from "fs";
import path from "path";
import {
  User,
  School,
  ClassRoom,
  Teacher,
  QuestionPackage,
  Exam,
  ExamSubmission,
  ArchivedItem,
  SystemSettings
} from "./types";
import {
  PRESET_USERS,
  INITIAL_SCHOOLS,
  INITIAL_CLASSES,
  INITIAL_TEACHERS,
  INITIAL_PACKAGES,
  INITIAL_EXAMS,
  INITIAL_SUBMISSIONS,
  INITIAL_ARCHIVES,
  INITIAL_SETTINGS
} from "./data/mockData";
import { FULL_TECHNICAL_CHEMISTRY_PACKAGE } from "./data/revisedQuestions";
import { DEFAULT_EMPLOYABILITY_PACKAGE } from "./data/nonTestInstrument";

export interface DatabaseSchema {
  users: User[];
  schools: School[];
  classes: ClassRoom[];
  teachers: Teacher[];
  packages: QuestionPackage[];
  exams: Exam[];
  submissions: ExamSubmission[];
  archives: ArchivedItem[];
  settings: SystemSettings;
  portfolios: PortfolioItem[];
  lastUpdated: string;
}

// Fungsi helper untuk menemukan lokasi path database.json yang konsisten
function getDatabasePaths(): { targetDir: string; targetFile: string } {
  const candidateDirs = [
    path.resolve(process.cwd(), "backend", "data"),
    path.resolve(process.cwd(), "data"),
  ];

  // Jika sudah ada file database.json di salah satu kandidat folder, pakai folder tersebut
  for (const dir of candidateDirs) {
    const file = path.join(dir, "database.json");
    if (fs.existsSync(file)) {
      return { targetDir: dir, targetFile: file };
    }
  }

  // Jika belum ada file tapi ada foldernya, gunakan folder yang sudah ada
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return { targetDir: dir, targetFile: path.join(dir, "database.json") };
    }
  }

  // Default fallback
  const defaultDir = candidateDirs[0];
  return { targetDir: defaultDir, targetFile: path.join(defaultDir, "database.json") };
}

// In-memory cache
let dbCache: DatabaseSchema | null = null;

export function getInitialData(): DatabaseSchema {
  return {
    users: [...PRESET_USERS],
    schools: [...INITIAL_SCHOOLS],
    classes: [...INITIAL_CLASSES],
    teachers: [...INITIAL_TEACHERS],
    packages: [...INITIAL_PACKAGES],
    exams: [...INITIAL_EXAMS],
    submissions: [...INITIAL_SUBMISSIONS],
    archives: [...INITIAL_ARCHIVES],
    settings: { ...INITIAL_SETTINGS },
    portfolios: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function initDb(): DatabaseSchema {
  try {
    const { targetDir, targetFile } = getDatabasePaths();

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, "utf-8");
      dbCache = JSON.parse(raw) as DatabaseSchema;
      // Pastikan array users ada
      if (!Array.isArray(dbCache.users)) {
        dbCache.users = [...PRESET_USERS];
      }
      // Pastikan array portfolios ada
      if (!Array.isArray(dbCache.portfolios)) {
        dbCache.portfolios = [];
      }
      // Pastikan paket soal teknis kimia (24 butir) & non-tes employability (18 butir) selalu ter-sinkronisasi dengan instrumen terbaru
      if (Array.isArray(dbCache.packages)) {
        dbCache.packages = dbCache.packages.filter(p => p.id !== 'pkg-full-24' && p.id !== 'pkg-teknis-kimia-24' && p.id !== 'pkg-employability-18');
        dbCache.packages.unshift(DEFAULT_EMPLOYABILITY_PACKAGE);
        dbCache.packages.splice(1, 0, FULL_TECHNICAL_CHEMISTRY_PACKAGE[0]);
        // Simpan langsung agar disk tersinkronisasi
        fs.writeFileSync(targetFile, JSON.stringify(dbCache, null, 2), "utf-8");
      }
      console.log(`[DB] Database berhasil dimuat dari ${targetFile}`);
      return dbCache;
    } else {
      console.log(`[DB] Database belum ada. Membuat data awal di ${targetFile}`);
      dbCache = getInitialData();
      fs.writeFileSync(targetFile, JSON.stringify(dbCache, null, 2), "utf-8");
      return dbCache;
    }
  } catch (err) {
    console.error("[DB] Gagal memuat database, menggunakan data default:", err);
    dbCache = getInitialData();
    return dbCache;
  }
}

export function getDb(): DatabaseSchema {
  if (!dbCache) {
    return initDb();
  }
  return dbCache;
}

export function saveDb(): boolean {
  if (!dbCache) return false;
  try {
    dbCache.lastUpdated = new Date().toISOString();
    const { targetDir, targetFile } = getDatabasePaths();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetFile, JSON.stringify(dbCache, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[DB] Gagal menyimpan ke disk:", err);
    return false;
  }
}

export function resetDb(): DatabaseSchema {
  dbCache = getInitialData();
  saveDb();
  return dbCache;
}
