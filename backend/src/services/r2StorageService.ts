// =============================================================================
// Cloudflare R2 Storage Service (S3-Compatible)
// EmployaSkills - Branch: migration/supabase-staging
// Handles:
//   - S3-compatible client for Cloudflare R2 (Private bucket)
//   - Canonical unique object key generation scoped by school, student, exam/portfolio
//   - Presigned Upload (PUT) and Presigned Download (GET) with short TTL
//   - Server-side direct buffer upload & streaming
//   - Server-side buffer retrieval for Gemini Vision & STT (100% private, no public URL needed)
//   - Object deletion & integrity check (SHA-256)
//   - Graceful fallback to local disk storage when R2 credentials are not set
// =============================================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getEvidenceStorageDir } from '../db';

export interface R2Config {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket: string;
  isConfigured: boolean;
}

export interface StoredFileMetadata {
  id: string;
  ownerId: string; // studentId or userId
  ownerNis?: string;
  ownerName?: string;
  schoolId?: string;
  category: 'evidence_image' | 'evidence_audio' | 'evidence_document' | 'certificate' | 'practicum_report';
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  storageProvider: 'r2' | 'local';
  fileHash: string;
  uploadTime: string;
  examId?: string;
  submissionId?: string;
  questionId?: string;
  audioDurationSeconds?: number;
}

let s3ClientInstance: S3Client | null = null;

export function getR2Config(): R2Config {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = (process.env.R2_BUCKET || 'employaskills-evidence').trim();

  const isConfigured = Boolean(endpoint && accessKeyId && secretAccessKey && bucket);

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    isConfigured
  };
}

export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured) {
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!
      }
    });
  }

  return s3ClientInstance;
}

/**
 * Buat object key unik yang terikat pada sekolah, siswa, context, dan tipe file.
 * Format:
 * - Exam Evidence: schools/{schoolId}/students/{studentNis}/exams/{examId}/q_{questionId}/{timestamp}_{hash10}_{safeFileName}
 * - Certificate  : schools/{schoolId}/students/{studentId}/certificates/{timestamp}_{hash10}_{safeFileName}
 * - Report       : schools/{schoolId}/students/{studentId}/reports/{timestamp}_{hash10}_{safeFileName}
 */
export function generateR2ObjectKey(params: {
  schoolId?: string;
  studentIdOrNis: string;
  category: 'evidence_image' | 'evidence_audio' | 'evidence_document' | 'certificate' | 'practicum_report';
  fileName: string;
  fileHash?: string;
  examId?: string;
  questionId?: string;
  submissionId?: string;
}): string {
  const school = (params.schoolId || 'school-general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const student = (params.studentIdOrNis || 'std-unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const hash10 = (params.fileHash ? params.fileHash.substring(0, 10) : randomSuffix);

  const ext = path.extname(params.fileName || '').toLowerCase();
  const baseName = path.basename(params.fileName || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = `${baseName}${ext}`;

  if (params.category.startsWith('evidence')) {
    const exam = (params.examId || 'general-exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    const q = (params.questionId || 'q-general').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `schools/${school}/students/${student}/exams/${exam}/q_${q}/${timestamp}_${hash10}_${safeName}`;
  }

  if (params.category === 'certificate') {
    return `schools/${school}/students/${student}/certificates/${timestamp}_${hash10}_${safeName}`;
  }

  return `schools/${school}/students/${student}/reports/${timestamp}_${hash10}_${safeName}`;
}

/**
 * Periksa apakah fallback ke penyimpanan disk lokal diizinkan.
 * Hanya diizinkan jika mode development atau ALLOW_LOCAL_STORAGE_FALLBACK=true.
 * Di staging/production, fallback lokal dilarang keras untuk mencegah inkonsistensi.
 */
export function isLocalStorageFallbackAllowed(): boolean {
  return process.env.ALLOW_LOCAL_STORAGE_FALLBACK === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Unggah berkas ke Cloudflare R2 atau fallback lokal (hanya jika diizinkan eksplisit).
 */
export async function uploadFileToR2OrLocal(options: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  category: 'evidence_image' | 'evidence_audio' | 'evidence_document' | 'certificate' | 'practicum_report';
  ownerId: string;
  ownerNis?: string;
  ownerName?: string;
  schoolId?: string;
  examId?: string;
  submissionId?: string;
  questionId?: string;
  audioDurationSeconds?: number;
}): Promise<StoredFileMetadata> {
  const { buffer, fileName, mimeType, category, ownerId, ownerNis, ownerName, schoolId } = options;

  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer file kosong. Tidak dapat menyimpan berkas.');
  }

  // Hitung SHA-256 untuk audit ketertelusuran
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const fileSize = buffer.length;
  const uploadTime = new Date().toISOString();
  const fileId = `file-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const storageKey = generateR2ObjectKey({
    schoolId,
    studentIdOrNis: ownerNis || ownerId,
    category,
    fileName,
    fileHash,
    examId: options.examId,
    questionId: options.questionId,
    submissionId: options.submissionId
  });

  const client = getR2Client();
  const config = getR2Config();

  if (config.isConfigured) {
    if (!client) {
      throw new Error('[Cloudflare R2 Storage Error] Klien Cloudflare R2 gagal diinisialisasi.');
    }

    try {
      // Unggah ke Cloudflare R2
      const putCommand = new PutObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          'file-id': fileId,
          'owner-id': ownerId,
          'owner-nis': ownerNis || '',
          'school-id': schoolId || '',
          'file-hash': fileHash,
          'upload-time': uploadTime,
          'original-filename': encodeURIComponent(fileName)
        }
      });

      await client.send(putCommand);

      const metadata: StoredFileMetadata = {
        id: fileId,
        ownerId,
        ownerNis,
        ownerName,
        schoolId,
        category,
        fileName,
        fileSize,
        mimeType,
        storageKey,
        storageUrl: `/api/evidence/r2/${encodeURIComponent(storageKey)}`,
        storageProvider: 'r2',
        fileHash,
        uploadTime,
        examId: options.examId,
        submissionId: options.submissionId,
        questionId: options.questionId,
        audioDurationSeconds: options.audioDurationSeconds
      };

      return metadata;
    } catch (r2Err: any) {
      // PEMERIKSAAN KEAMANAN 1: Jangan diam-diam menyimpan ke lokal jika R2 sudah dikonfigurasi!
      console.error(`[Cloudflare R2 Storage Error] Gagal mengunggah berkas '${fileName}' ke bucket R2 '${config.bucket}':`, r2Err.message);
      throw new Error(`[Cloudflare R2 Storage Error] Gagal mengunggah berkas ke Cloudflare R2: ${r2Err.message}`);
    }
  }

  // Jika R2 belum dikonfigurasi, periksa apakah fallback lokal diizinkan secara eksplisit
  if (!isLocalStorageFallbackAllowed()) {
    throw new Error('[Cloudflare R2 Storage Error] Cloudflare R2 belum dikonfigurasi dan fallback penyimpanan lokal dinonaktifkan di lingkungan staging/production.');
  }

  // Fallback lokal hanya untuk mode development yang diaktifkan secara eksplisit
  const storageDir = getEvidenceStorageDir();
  const localDiskFileName = path.basename(storageKey);
  const localFilePath = path.join(storageDir, localDiskFileName);

  fs.writeFileSync(localFilePath, buffer);

  const metadata: StoredFileMetadata = {
    id: fileId,
    ownerId,
    ownerNis,
    ownerName,
    schoolId,
    category,
    fileName,
    fileSize,
    mimeType,
    storageKey,
    storageUrl: `/api/evidence/file/${localDiskFileName}`,
    storageProvider: 'local',
    fileHash,
    uploadTime,
    examId: options.examId,
    submissionId: options.submissionId,
    questionId: options.questionId,
    audioDurationSeconds: options.audioDurationSeconds
  };

  return metadata;
}

/**
 * Dapatkan Presigned URL untuk membaca/mengunduh berkas privat dari Cloudflare R2.
 * Masa berlaku pendek (default 15 menit = 900 detik).
 */
export async function getPresignedR2DownloadUrl(storageKey: string, ttlSeconds = 900): Promise<string> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    throw new Error('Cloudflare R2 belum dikonfigurasi. Tidak dapat membuat presigned URL.');
  }

  const getCommand = new GetObjectCommand({
    Bucket: config.bucket,
    Key: storageKey
  });

  return getSignedUrl(client, getCommand, { expiresIn: ttlSeconds });
}

/**
 * Dapatkan Presigned URL untuk unggah langsung dari browser ke Cloudflare R2 (PUT).
 * Masa berlaku pendek (default 10 menit = 600 detik).
 */
export async function getPresignedR2UploadUrl(options: {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  ttlSeconds?: number;
}): Promise<{ uploadUrl: string; storageKey: string; expiresIn: number }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    throw new Error('Cloudflare R2 belum dikonfigurasi. Tidak dapat membuat presigned upload URL.');
  }

  const ttl = options.ttlSeconds || 600;
  const putCommand = new PutObjectCommand({
    Bucket: config.bucket,
    Key: options.storageKey,
    ContentType: options.mimeType,
    ContentLength: options.fileSize
  });

  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: ttl });

  return {
    uploadUrl,
    storageKey: options.storageKey,
    expiresIn: ttl
  };
}

/**
 * Ambil Buffer berkas langsung dari Cloudflare R2 untuk AI processing (Gemini Vision / STT)
 * secara aman di sisi server tanpa memerlukan URL publik.
 */
export async function getR2ObjectBuffer(storageKey: string): Promise<{ buffer: Buffer; contentType: string; contentLength: number }> {
  const client = getR2Client();
  const config = getR2Config();

  if (client && config.isConfigured) {
    const getCommand = new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey
    });

    const response = await client.send(getCommand);
    if (!response.Body) {
      throw new Error(`Isi objek R2 kosong untuk key: ${storageKey}`);
    }

    // Stream ke Buffer
    const streamToBuffer = async (stream: any): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    };

    const buffer = await streamToBuffer(response.Body);
    const contentType = response.ContentType || 'application/octet-stream';
    const contentLength = response.ContentLength || buffer.length;

    return {
      buffer,
      contentType,
      contentLength
    };
  }

  // Jika R2 belum dikonfigurasi, periksa apakah fallback lokal diizinkan
  if (!isLocalStorageFallbackAllowed()) {
    throw new Error(`[Cloudflare R2 Storage Error] Cloudflare R2 belum dikonfigurasi dan fallback penyimpanan lokal dinonaktifkan: ${storageKey}`);
  }

  const storageDir = getEvidenceStorageDir();
  const diskName = path.basename(storageKey);
  const localPath = path.join(storageDir, diskName);
  if (fs.existsSync(localPath)) {
    const buf = fs.readFileSync(localPath);
    const ext = path.extname(diskName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.webm': 'audio/webm',
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    const inferredMime = mimeMap[ext] || 'application/octet-stream';
    return {
      buffer: buf,
      contentType: inferredMime,
      contentLength: buf.length
    };
  }
  throw new Error(`Berkas tidak ditemukan pada storage lokal: ${storageKey}`);
}

/**
 * Hapus objek dari Cloudflare R2
 */
export async function deleteR2Object(storageKey: string): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    // Hapus dari disk lokal jika fallback diizinkan
    if (!isLocalStorageFallbackAllowed()) {
      return false;
    }
    const storageDir = getEvidenceStorageDir();
    const localPath = path.join(storageDir, path.basename(storageKey));
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storageKey
    });
    await client.send(deleteCommand);
    return true;
  } catch (err) {
    console.warn(`[R2 Storage] Gagal menghapus objek ${storageKey}:`, err);
    return false;
  }
}

/**
 * Cek apakah objek ada di Cloudflare R2
 */
export async function checkR2ObjectExists(storageKey: string): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    if (!isLocalStorageFallbackAllowed()) {
      return false;
    }
    const storageDir = getEvidenceStorageDir();
    const localPath = path.join(storageDir, path.basename(storageKey));
    return fs.existsSync(localPath);
  }

  try {
    const headCommand = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: storageKey
    });
    await client.send(headCommand);
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

export interface VerifiedR2Object {
  exists: boolean;
  contentLength: number;
  contentType: string;
  eTag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

/**
 * Verifikasi fisik keberadaan, ukuran, tipe, dan ETag objek di Cloudflare R2 (HeadObject)
 * setelah browser melakukan upload via presigned PUT.
 */
export async function verifyR2UploadedObject(
  storageKey: string,
  options?: { expectedMimeType?: string }
): Promise<VerifiedR2Object> {
  const client = getR2Client();
  const config = getR2Config();

  if (client && config.isConfigured) {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: config.bucket,
        Key: storageKey
      });
      const response = await client.send(headCommand);

      const contentLength = response.ContentLength ?? 0;
      const contentType = response.ContentType || 'application/octet-stream';
      const cleanETag = (response.ETag || '').replace(/"/g, '');

      return {
        exists: true,
        contentLength,
        contentType,
        eTag: cleanETag,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return {
          exists: false,
          contentLength: 0,
          contentType: ''
        };
      }
      throw new Error(`[Cloudflare R2 Verification Error] Gagal memverifikasi objek di R2: ${err.message}`);
    }
  }

  // Jika R2 belum dikonfigurasi, periksa apakah fallback lokal diizinkan
  if (!isLocalStorageFallbackAllowed()) {
    throw new Error('[Cloudflare R2 Verification Error] Cloudflare R2 belum dikonfigurasi dan fallback penyimpanan lokal dinonaktifkan.');
  }

  const storageDir = getEvidenceStorageDir();
  const diskName = path.basename(storageKey);
  const localPath = path.join(storageDir, diskName);

  if (fs.existsSync(localPath)) {
    const stats = fs.statSync(localPath);
    return {
      exists: true,
      contentLength: stats.size,
      contentType: options?.expectedMimeType || 'application/octet-stream',
      lastModified: stats.mtime
    };
  }

  return {
    exists: false,
    contentLength: 0,
    contentType: ''
  };
}
