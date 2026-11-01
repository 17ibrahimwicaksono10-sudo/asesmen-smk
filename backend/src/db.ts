import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  User,
  School,
  ClassRoom,
  Teacher,
  QuestionPackage,
  Exam,
  ExamSubmission,
  ArchivedItem,
  SystemSettings,
  PortfolioItem
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
export function getDatabasePaths(): { targetDir: string; targetFile: string } {
  if (process.env.VOC_DATABASE_PATH && process.env.VOC_DATABASE_PATH.trim()) {
    const customFile = path.resolve(process.env.VOC_DATABASE_PATH.trim());
    return { targetDir: path.dirname(customFile), targetFile: customFile };
  }

  const candidateDirs = [
    path.resolve(process.cwd(), "backend", "backend", "data"),
    path.resolve(process.cwd(), "backend", "data"),
    path.resolve(process.cwd(), "data"),
    path.join(__dirname, "../data"),
    path.join(__dirname, "../../data"),
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
  const defaultDir = candidateDirs[1] || candidateDirs[0];
  return { targetDir: defaultDir, targetFile: path.join(defaultDir, "database.json") };
}

export function getEvidenceStorageDir(): string {
  const { targetDir } = getDatabasePaths();
  const target = path.join(targetDir, "evidence_storage");
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

/**
 * Migrasi otomatis non-destruktif:
 * Mengonversi Base64 pada bukti multimodal 22 submission yang ada ke file fisik di disk,
 * mengisikan storageUrl, dan membersihkan properti fileData dari database.json.
 */
export function migrateEvidenceBase64(db: DatabaseSchema, storageDir: string): boolean {
  if (!Array.isArray(db.submissions) || db.submissions.length === 0) return false;
  let migratedCount = 0;

  const processEvidenceItem = (ev: any) => {
    if (!ev || !ev.fileData || typeof ev.fileData !== "string") return false;
    if (!ev.fileData.startsWith("data:") && ev.fileData.length < 500) return false;

    try {
      const base64Data = ev.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      
      const isAudio = ev.modalityType === "audio" || (ev.mimeType && ev.mimeType.includes("audio"));
      const isHandwriting = ev.modalityType === "handwriting" || (ev.mimeType && ev.mimeType.includes("image"));
      const ext = path.extname(ev.fileName || "") || (isAudio ? ".webm" : isHandwriting ? ".jpg" : ".pdf");
      const safeBase = path.basename(ev.fileName || "evidence", ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const storedFileName = `${ev.id || Date.now()}_${hash.substring(0, 10)}_${safeBase}${ext}`;
      const filePath = path.join(storageDir, storedFileName);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }

      ev.storageUrl = `/api/evidence/file/${storedFileName}`;
      ev.storagePath = filePath;
      ev.fileHash = hash;
      ev.previewUrl = ev.storageUrl;
      ev.isArchived = true;
      delete ev.fileData; // Hapus Base64 raksasa dari memori & file JSON
      migratedCount++;
      return true;
    } catch (err) {
      console.warn(`[MIGRATE] Gagal memigrasikan item bukti ${ev.id}:`, err);
      return false;
    }
  };

  db.submissions.forEach((sub) => {
    if (Array.isArray(sub.evidences)) {
      sub.evidences.forEach(processEvidenceItem);
    }
    if (sub.answers && typeof sub.answers === "object") {
      Object.values(sub.answers).forEach((ans: any) => {
        if (Array.isArray(ans?.multimodalEvidences)) {
          ans.multimodalEvidences.forEach(processEvidenceItem);
        }
      });
    }
  });

  if (migratedCount > 0) {
    console.log(`[MIGRATE] ✅ Berhasil memigrasikan ${migratedCount} berkas bukti multimodal dari Base64 ke disk.`);
    return true;
  }
  return false;
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
      // Pastikan paket bawaan tersedia jika belum ada, tanpa merusak paket kustom guru/admin
      if (Array.isArray(dbCache.packages)) {
        const hasEmp = dbCache.packages.some(p => p.id === 'pkg-employability-18');
        if (!hasEmp) {
          dbCache.packages.unshift(DEFAULT_EMPLOYABILITY_PACKAGE);
        }
        const hasTech = dbCache.packages.some(p => p.id === 'pkg-full-24' || p.id === 'pkg-teknis-kimia-24');
        if (!hasTech) {
          dbCache.packages.push(FULL_TECHNICAL_CHEMISTRY_PACKAGE[0]);
        }
      }

      // Migrasi Base64 bukti multimodal HANYA dijalankan jika diizinkan secara eksplisit via environment variable
      if (process.env.RUN_AUTO_MIGRATION === 'true') {
        const evidenceDir = getEvidenceStorageDir();
        migrateEvidenceBase64(dbCache, evidenceDir);
      }

      // Simpan jika ada perubahan paket atau hasil migrasi
      fs.writeFileSync(targetFile, JSON.stringify(dbCache, null, 2), "utf-8");

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
