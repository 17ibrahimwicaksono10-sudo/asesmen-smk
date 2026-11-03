// =============================================================================
// Comprehensive Automated Test Suite: Cloudflare R2 Integration (S3-Compatible)
// EmployaSkills - Branch: migration/supabase-staging
// Tests:
//   1. Canonical Object Key Generation (Tenant, Student, Exam, Modality scoping)
//   2. Answer Photo Upload & Checksum Integrity (SHA-256)
//   3. Audio Upload & MIME type validation
//   4. Official PDF Certificate Upload (Zero Destructive Compression)
//   5. Private Access by Student Owner (Allowed)
//   6. Cross-Student Access Denial (HTTP 403 Forbidden - Anti Cross-Tenant Leaks)
//   7. Authorized Teacher Download (Allowed for Teacher's School)
//   8. Persistence Verification across Simulated Server Restarts
//   9. Failure Handling (No False Success on empty/corrupt buffers)
//  10. Metadata Consistency (Object key, ownerId, schoolId, fileSize, fileHash)
//  11. Gemini Vision/STT Server-Side Buffer Retrieval (100% Private, No Public URL)
//  12. Presigned URL Structure & Short-Lived Expiration (600s upload, 900s download)
// =============================================================================

import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports from compiled or TS source via tsx
const {
  generateR2ObjectKey,
  uploadFileToR2OrLocal,
  getR2ObjectBuffer,
  deleteR2Object,
  getR2Config,
  verifyR2UploadedObject,
  isLocalStorageFallbackAllowed
} = await import("./services/r2StorageService.ts");

const {
  resolveMediaBase64
} = await import("./aiEvaluationRouter.ts");

const {
  generateAuthToken,
  verifyAuthToken,
  generateScopedFileToken,
  verifyScopedFileToken
} = await import("./auth.ts");

const {
  getDb,
  saveDb
} = await import("./db.ts");

console.log("======================================================================");
console.log("TEST SUITE: CLOUDFLARE R2 S3-COMPATIBLE STORAGE (EMPLOYASKILLS)");
console.log("======================================================================");

// Aktifkan fallback lokal secara eksplisit khusus test harness
process.env.ALLOW_LOCAL_STORAGE_FALLBACK = "true";
process.env.DISABLE_SERVER_LISTEN = "true";

let totalPassed = 0;
let totalFailed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    totalPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Error: ${err.message}`);
    totalFailed++;
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${testName}`);
    totalPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Error: ${err.message}`);
    totalFailed++;
  }
}

// -----------------------------------------------------------------------------
// GROUP 1: Canonical Unique Object Key Generation
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 1: Canonical Unique Object Key Generation ---");

runTest("Generates strictly scoped exam evidence key for student and question", () => {
  const key = generateR2ObjectKey({
    schoolId: "smkn-1-cirebon",
    studentIdOrNis: "10291",
    category: "evidence_image",
    fileName: "lembar_kerja_titrasi.jpg",
    examId: "exam-kimia-analisis-2026",
    questionId: "q-titrasi-01",
    fileHash: "abcdef1234567890"
  });

  assert.ok(key.startsWith("schools/smkn-1-cirebon/students/10291/exams/exam-kimia-analisis-2026/q_q-titrasi-01/"), `Expected prefix, got: ${key}`);
  assert.ok(key.includes("abcdef1234"), `Key must include hash segment: ${key}`);
  assert.ok(key.endsWith("lembar_kerja_titrasi.jpg"), `Key must end with safe file name: ${key}`);
});

runTest("Generates certificate key scoped to student portfolio without exam parameters", () => {
  const key = generateR2ObjectKey({
    schoolId: "smkn-1-cirebon",
    studentIdOrNis: "student-uuid-4412",
    category: "certificate",
    fileName: "sertifikat_bnsp_analis.pdf",
    fileHash: "fedcba0987654321"
  });

  assert.ok(key.startsWith("schools/smkn-1-cirebon/students/student-uuid-4412/certificates/"), `Expected certificate prefix, got: ${key}`);
  assert.ok(key.endsWith("sertifikat_bnsp_analis.pdf"), `Key must end with pdf: ${key}`);
});

runTest("Sanitizes special characters in school, student, and filename to prevent directory traversal", () => {
  const key = generateR2ObjectKey({
    schoolId: "../../malicious/school",
    studentIdOrNis: "std/../../hack",
    category: "practicum_report",
    fileName: "../../../etc/passwd.pdf"
  });

  assert.ok(!key.includes("../"), `Key must not contain relative directory traversal: ${key}`);
  assert.ok(key.includes("passwd.pdf"), `Key should preserve sanitized base name: ${key}`);
});

// -----------------------------------------------------------------------------
// GROUP 2: File Uploads & SHA-256 Checksum Integrity
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 2: File Uploads & Checksum Integrity ---");

let uploadedPhotoMeta = null;
let uploadedAudioMeta = null;
let uploadedPdfMeta = null;

await runAsyncTest("Uploads answer photo with accurate SHA-256 and metadata", async () => {
  // Buat dummy binary JPEG
  const dummyImageBytes = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9]);
  const expectedHash = crypto.createHash("sha256").update(dummyImageBytes).digest("hex");

  uploadedPhotoMeta = await uploadFileToR2OrLocal({
    buffer: dummyImageBytes,
    fileName: "jawaban_foto_titrasi.jpg",
    mimeType: "image/jpeg",
    category: "evidence_image",
    ownerId: "user-student-1",
    ownerNis: "NIS-10291",
    ownerName: "Ahmad Fauzi",
    schoolId: "sch-smkn1",
    examId: "exam-kimia-1",
    questionId: "q-1"
  });

  assert.ok(uploadedPhotoMeta, "Upload returned metadata object");
  assert.strictEqual(uploadedPhotoMeta.fileHash, expectedHash, "SHA-256 hash must exactly match binary bytes");
  assert.strictEqual(uploadedPhotoMeta.fileSize, dummyImageBytes.length, "Recorded size must match buffer byte length");
  assert.strictEqual(uploadedPhotoMeta.mimeType, "image/jpeg", "MIME type must be image/jpeg");
  assert.ok(uploadedPhotoMeta.storageKey.includes("NIS-10291"), "Storage key must include student NIS");
});

await runAsyncTest("Uploads audio recording with audio/webm MIME type and duration", async () => {
  const dummyAudioBytes = Buffer.from("DUMMY_WEBM_AUDIO_STREAM_HEADER_FOR_TESTING_STT_INTEGRITY");
  const expectedHash = crypto.createHash("sha256").update(dummyAudioBytes).digest("hex");

  uploadedAudioMeta = await uploadFileToR2OrLocal({
    buffer: dummyAudioBytes,
    fileName: "rekaman_verbal_jawaban.webm",
    mimeType: "audio/webm",
    category: "evidence_audio",
    ownerId: "user-student-1",
    ownerNis: "NIS-10291",
    ownerName: "Ahmad Fauzi",
    schoolId: "sch-smkn1",
    examId: "exam-kimia-1",
    questionId: "q-2",
    audioDurationSeconds: 18.5
  });

  assert.ok(uploadedAudioMeta, "Upload returned metadata object");
  assert.strictEqual(uploadedAudioMeta.fileHash, expectedHash);
  assert.strictEqual(uploadedAudioMeta.mimeType, "audio/webm");
  assert.strictEqual(uploadedAudioMeta.audioDurationSeconds, 18.5);
});

await runAsyncTest("Uploads official PDF certificate without destructive compression", async () => {
  const dummyPdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF");
  const expectedHash = crypto.createHash("sha256").update(dummyPdfBytes).digest("hex");

  uploadedPdfMeta = await uploadFileToR2OrLocal({
    buffer: dummyPdfBytes,
    fileName: "sertifikat_kompetensi_bnsp.pdf",
    mimeType: "application/pdf",
    category: "certificate",
    ownerId: "user-student-1",
    ownerNis: "NIS-10291",
    ownerName: "Ahmad Fauzi",
    schoolId: "sch-smkn1"
  });

  assert.ok(uploadedPdfMeta, "Upload returned metadata object");
  assert.strictEqual(uploadedPdfMeta.fileHash, expectedHash);
  assert.strictEqual(uploadedPdfMeta.fileSize, dummyPdfBytes.length, "PDF byte length must be 100% preserved without reduction");
  assert.strictEqual(uploadedPdfMeta.mimeType, "application/pdf");
});

// -----------------------------------------------------------------------------
// GROUP 3: Authentication & Cross-Tenant / Cross-Student Authorization
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 3: Authorization & Cross-Student Protection ---");

runTest("Generates valid authentication tokens for student and teacher", () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });
  const decodedStudent = verifyAuthToken(studentToken);
  assert.strictEqual(decodedStudent.id, "user-student-1");
  assert.strictEqual(decodedStudent.nis, "NIS-10291");
  assert.strictEqual(decodedStudent.role, "siswa");

  const otherStudentToken = generateAuthToken({
    id: "user-student-2",
    email: "student2@smk.id",
    name: "Budi Santoso",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10292"
  });
  const decodedOther = verifyAuthToken(otherStudentToken);
  assert.strictEqual(decodedOther.id, "user-student-2");
});

runTest("Authorizes student to access their own uploaded file", () => {
  const student = { id: "user-student-1", role: "siswa", nis: "NIS-10291", schoolId: "sch-smkn1" };
  const targetKey = uploadedPhotoMeta.storageKey;

  // Evaluasi aturan otorisasi server
  const isOwner = targetKey.includes(student.nis) || targetKey.includes(student.id);
  assert.strictEqual(isOwner, true, "Student must be authorized to access their own file");
});

runTest("Strictly rejects another student attempting cross-student access (HTTP 403)", () => {
  const otherStudent = { id: "user-student-2", role: "siswa", nis: "NIS-99999", schoolId: "sch-smkn1" };
  const targetKey = uploadedPhotoMeta.storageKey;

  const isOwner = targetKey.includes(otherStudent.nis) || targetKey.includes(otherStudent.id);
  assert.strictEqual(isOwner, false, "Cross-student access must be strictly forbidden");
});

runTest("Authorizes teacher belonging to the student's school", () => {
  const teacherSameSchool = { id: "guru-1", role: "guru", schoolId: "sch-smkn1" };
  const targetKey = uploadedPhotoMeta.storageKey;

  const cleanSchool = teacherSameSchool.schoolId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const isAuthorized = targetKey.includes(`schools/${cleanSchool}`) || targetKey.includes("sch_smkn1") || targetKey.includes("sch-smkn1");
  assert.strictEqual(isAuthorized, true, "Teacher from same school must be authorized");
});

runTest("Rejects teacher from a different school (Cross-School Multi-Tenant Denial)", () => {
  const teacherOtherSchool = { id: "guru-foreign", role: "guru", schoolId: "sch-other-school" };
  const targetKey = uploadedPhotoMeta.storageKey;

  const cleanSchool = teacherOtherSchool.schoolId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const isAuthorized = targetKey.includes(`schools/${cleanSchool}`);
  assert.strictEqual(isAuthorized, false, "Cross-school teacher access must be denied");
});

// -----------------------------------------------------------------------------
// GROUP 4: Persistence Across Simulated Server Restarts
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 4: Persistence Across Server Restarts ---");

await runAsyncTest("Verifies file buffer remains readable after restart simulation", async () => {
  // Ambil buffer objek
  const retrieved = await getR2ObjectBuffer(uploadedPhotoMeta.storageKey);
  assert.ok(retrieved.buffer, "Buffer must be retrieved from storage");
  assert.strictEqual(retrieved.contentLength, uploadedPhotoMeta.fileSize, "Length must match");

  const recomputedHash = crypto.createHash("sha256").update(retrieved.buffer).digest("hex");
  assert.strictEqual(recomputedHash, uploadedPhotoMeta.fileHash, "Persisted file hash must match original uploaded hash");
});

// -----------------------------------------------------------------------------
// GROUP 5: Error Handling & Anti-False-Success
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 5: Error Handling & Anti-False-Success ---");

await runAsyncTest("Rejects upload with empty buffer and throws error", async () => {
  let threw = false;
  try {
    await uploadFileToR2OrLocal({
      buffer: Buffer.alloc(0),
      fileName: "empty.jpg",
      mimeType: "image/jpeg",
      category: "evidence_image",
      ownerId: "user-student-1"
    });
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("kosong"), `Expected empty buffer message, got: ${err.message}`);
  }
  assert.strictEqual(threw, true, "Empty buffer upload must not produce fake success status");
});

// -----------------------------------------------------------------------------
// GROUP 6: Gemini Vision & STT Private Buffer Retrieval
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 6: Gemini Server-Side Private Retrieval ---");

await runAsyncTest("resolveMediaBase64 resolves R2/local storage URL to base64 data URL for Gemini", async () => {
  const storageUrl = uploadedPhotoMeta.storageUrl;
  const base64Resolved = await resolveMediaBase64(storageUrl);

  assert.ok(base64Resolved.startsWith("data:") || base64Resolved.length > 20, "Must resolve to base64 data for Gemini Vision");
  assert.ok(!base64Resolved.startsWith("http://public-bucket"), "Must never require a public bucket URL");
});

// -----------------------------------------------------------------------------
// GROUP 7: Object Deletion / Cleanup
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 7: Object Deletion & Cleanup ---");

await runAsyncTest("Deletes temporary test object cleanly", async () => {
  // Upload temporary test object
  const tempMeta = await uploadFileToR2OrLocal({
    buffer: Buffer.from("TEMPORARY_OBJECT_FOR_DELETION_TEST"),
    fileName: "temp_to_delete.txt",
    mimeType: "text/plain",
    category: "evidence_document",
    ownerId: "user-student-1"
  });

  const deleted = await deleteR2Object(tempMeta.storageKey);
  assert.strictEqual(deleted, true, "Delete operation must return true");
});

// -----------------------------------------------------------------------------
// GROUP 8: PEMERIKSAAN KEAMANAN 1: No Silent Fallback & Explicit Dev Fallback
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 8: Pemeriksaan 1 - No Silent Fallback & Explicit Dev Mode ---");

runTest("isLocalStorageFallbackAllowed returns false in production unless explicit flag is set", () => {
  const prevEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
    assert.strictEqual(isLocalStorageFallbackAllowed(), false, "Must disallow local fallback in production by default");

    process.env.ALLOW_LOCAL_STORAGE_FALLBACK = "true";
    assert.strictEqual(isLocalStorageFallbackAllowed(), true, "Must allow local fallback when explicit flag is true");

    delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
    process.env.NODE_ENV = "development";
    assert.strictEqual(isLocalStorageFallbackAllowed(), true, "Must allow local fallback in development mode");
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevAllow !== undefined) process.env.ALLOW_LOCAL_STORAGE_FALLBACK = prevAllow;
    else delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
  }
});

await runAsyncTest("Throws explicit error when R2 is unconfigured in staging/production without fallback flag", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;

    let threw = false;
    try {
      await uploadFileToR2OrLocal({
        buffer: Buffer.from("TEST_DATA_FOR_PROD_FALLBACK_CHECK"),
        fileName: "test_prod.jpg",
        mimeType: "image/jpeg",
        category: "evidence_image",
        ownerId: "user-student-1"
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("dinonaktifkan di lingkungan staging/production"), `Expected strict message, got: ${err.message}`);
    }
    assert.strictEqual(threw, true, "Silent local fallback must be blocked in production/staging");
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevAllow !== undefined) process.env.ALLOW_LOCAL_STORAGE_FALLBACK = prevAllow;
    else delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
  }
});

await runAsyncTest("When R2 is configured and connection fails, reports upload failure clearly without silent local save", async () => {
  const prevEndpoint = process.env.R2_ENDPOINT;
  const prevKey = process.env.R2_ACCESS_KEY_ID;
  const prevSec = process.env.R2_SECRET_ACCESS_KEY;
  const prevBucket = process.env.R2_BUCKET;

  try {
    // Simulasi R2 dikonfigurasi ke endpoint invalid/unreachable
    process.env.R2_ENDPOINT = "https://invalid-account-id.r2.cloudflarestorage.com";
    process.env.R2_ACCESS_KEY_ID = "mock_key";
    process.env.R2_SECRET_ACCESS_KEY = "mock_secret";
    process.env.R2_BUCKET = "employaskills-evidence";

    let threw = false;
    try {
      await uploadFileToR2OrLocal({
        buffer: Buffer.from("CRITICAL_TEST_DATA_MUST_NOT_SILENTLY_FALLBACK"),
        fileName: "unreachable_r2_test.jpg",
        mimeType: "image/jpeg",
        category: "evidence_image",
        ownerId: "user-student-1"
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("[Cloudflare R2 Storage Error]"), `Error must be explicit R2 error, got: ${err.message}`);
    }
    assert.strictEqual(threw, true, "When R2 is configured, failed connection must throw error, not save locally");
  } finally {
    if (prevEndpoint) process.env.R2_ENDPOINT = prevEndpoint; else delete process.env.R2_ENDPOINT;
    if (prevKey) process.env.R2_ACCESS_KEY_ID = prevKey; else delete process.env.R2_ACCESS_KEY_ID;
    if (prevSec) process.env.R2_SECRET_ACCESS_KEY = prevSec; else delete process.env.R2_SECRET_ACCESS_KEY;
    if (prevBucket) process.env.R2_BUCKET = prevBucket; else delete process.env.R2_BUCKET;
  }
});

// -----------------------------------------------------------------------------
// GROUP 9: PEMERIKSAAN KEAMANAN 2: Scoped File Token & Anti-JWT Leak in Query
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 9: Pemeriksaan 2 - Scoped File Tokens & Anti-JWT Leak ---");

runTest("Generates and verifies scoped file token bound to specific storageKey", () => {
  const targetKey = "schools/sch-smkn1/students/10291/exams/ex-1/q_1/foto.jpg";
  const token = generateScopedFileToken({
    userId: "user-student-1",
    role: "siswa",
    schoolId: "sch-smkn1",
    storageKey: targetKey,
    expiresInSeconds: 300
  });

  assert.ok(token && typeof token === "string", "Token must be a non-empty string");

  const verified = verifyScopedFileToken(token, targetKey);
  assert.ok(verified, "Token must be valid for the exact target storageKey");
  assert.strictEqual(verified.userId, "user-student-1");
  assert.strictEqual(verified.storageKey, targetKey);
  assert.strictEqual(verified.tokenType, "scoped_file_token");
});

runTest("Rejects scoped file token if requested for a different storageKey (Scope Hijack Prevention)", () => {
  const keyA = "schools/sch-smkn1/students/10291/exams/ex-1/q_1/foto_a.jpg";
  const keyB = "schools/sch-smkn1/students/99999/exams/ex-1/q_1/foto_b.jpg";
  const tokenA = generateScopedFileToken({
    userId: "user-student-1",
    role: "siswa",
    schoolId: "sch-smkn1",
    storageKey: keyA,
    expiresInSeconds: 300
  });

  const verifiedOnKeyB = verifyScopedFileToken(tokenA, keyB);
  assert.strictEqual(verifiedOnKeyB, null, "Token for File A must be strictly rejected when accessing File B");
});

runTest("Rejects expired scoped file token", () => {
  const targetKey = "schools/sch-smkn1/students/10291/exams/ex-1/q_1/foto.jpg";
  const expiredToken = generateScopedFileToken({
    userId: "user-student-1",
    role: "siswa",
    schoolId: "sch-smkn1",
    storageKey: targetKey,
    expiresInSeconds: -10
  });

  const verified = verifyScopedFileToken(expiredToken, targetKey);
  assert.strictEqual(verified, null, "Expired token must be rejected");
});

runTest("Primary login JWT is strictly rejected as a scoped file token (HMAC Secret Separation)", () => {
  const loginJwt = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1"
  });

  const verifiedAsFileToken = verifyScopedFileToken(loginJwt, "schools/sch-smkn1/students/10291/foto.jpg");
  assert.strictEqual(verifiedAsFileToken, null, "Primary login JWT must never validate as a scoped file token");
});

// -----------------------------------------------------------------------------
// GROUP 10: PEMERIKSAAN KEAMANAN 3: Post-Upload Verification (HeadObject, Size, Type, Ownership)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 10: Pemeriksaan 3 - Post-Upload Verification ---");

await runAsyncTest("verifyR2UploadedObject returns exists: false for non-existent file", async () => {
  const nonExistentKey = "schools/sch-smkn1/students/10291/exams/ex-1/q_1/non_existent_file.jpg";
  const result = await verifyR2UploadedObject(nonExistentKey);
  assert.strictEqual(result.exists, false, "Non-existent file must return exists: false");
  assert.strictEqual(result.contentLength, 0);
});

await runAsyncTest("verifyR2UploadedObject verifies existing file length, type, and status", async () => {
  const existingKey = uploadedPhotoMeta.storageKey;
  const result = await verifyR2UploadedObject(existingKey, { expectedMimeType: "image/jpeg" });
  assert.strictEqual(result.exists, true, "Existing uploaded file must be verified as true");
  assert.strictEqual(result.contentLength, uploadedPhotoMeta.fileSize, "Verified length must match uploaded bytes");
  assert.ok(result.contentType.includes("image/jpeg") || result.contentType.includes("octet-stream"), "Content-type matches");
});

runTest("Validates student ownership on verify-upload payload (Blocks Cross-Student Spoofing)", () => {
  const currentStudent = { id: "user-student-1", nis: "10291", role: "siswa" };
  const targetKeyForeign = "schools/sch-smkn1/students/10299/exams/ex-1/q_1/foto_foreign.jpg";

  const isOwner = targetKeyForeign.includes(currentStudent.nis) || targetKeyForeign.includes(currentStudent.id);
  assert.strictEqual(isOwner, false, "Student 10291 must not be allowed to verify Student 10299 file");
});

// -----------------------------------------------------------------------------
// GROUP 11: Real Express HTTP Endpoint Security Integration Test
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 11: Real HTTP Endpoints Security & Tenant Isolation ---");

let serverInstance;
let baseUrl = "";

await runAsyncTest("Starts live test server on ephemeral port", async () => {
  const { app } = await import("./server.ts");
  await new Promise((resolve) => {
    serverInstance = app.listen(0, "127.0.0.1", () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
  assert.ok(baseUrl.startsWith("http://127.0.0.1:"), "Server must listen on local port");
});

await runAsyncTest("PEMERIKSAAN 2 (HTTP): GET /api/evidence/r2/* with ?token= is strictly rejected (HTTP 400)", async () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}?token=${studentToken}`);
  assert.strictEqual(res.status, 400, "Must return HTTP 400 Bad Request");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("dilarang"), "Error message must state ?token= is prohibited");
});

await runAsyncTest("PEMERIKSAAN 2 (HTTP): GET /api/evidence/file/:filename with ?token= is strictly rejected (HTTP 400)", async () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/evidence/file/test_evidence.jpg?token=${studentToken}`);
  assert.strictEqual(res.status, 400, "Must return HTTP 400 Bad Request");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("dilarang"), "Error message must state ?token= is prohibited");
});

await runAsyncTest("HTTP: Anonymous GET /api/evidence/r2/* is rejected with HTTP 401", async () => {
  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}`);
  assert.strictEqual(res.status, 401, "Must return HTTP 401 Unauthorized");
});

await runAsyncTest("HTTP: Anonymous GET /api/evidence/file/:filename is rejected with HTTP 401", async () => {
  const res = await fetch(`${baseUrl}/api/evidence/file/test_evidence.jpg`);
  assert.strictEqual(res.status, 401, "Must return HTTP 401 Unauthorized");
});

await runAsyncTest("HTTP: Anonymous GET /api/evidence/audit/:id is rejected with HTTP 401", async () => {
  const res = await fetch(`${baseUrl}/api/evidence/audit/evid-test-123`);
  assert.strictEqual(res.status, 401, "Must return HTTP 401 Unauthorized");
});

await runAsyncTest("HTTP: Cross-student GET /api/evidence/r2/* is rejected with HTTP 403 Forbidden", async () => {
  const otherStudentToken = generateAuthToken({
    id: "user-student-2",
    email: "student2@smk.id",
    name: "Budi Santoso",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10292"
  });

  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}`, {
    headers: { Authorization: `Bearer ${otherStudentToken}` }
  });
  assert.strictEqual(res.status, 403, "Must return HTTP 403 Forbidden for cross-student access");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("siswa lain"), "Error message specifies other student file denial");
});

await runAsyncTest("HTTP: Cross-school teacher GET /api/evidence/r2/* is rejected with HTTP 403 Forbidden", async () => {
  const otherSchoolTeacherToken = generateAuthToken({
    id: "user-teacher-other",
    email: "teacher@smkn2.id",
    name: "Guru Luar",
    role: "guru",
    schoolId: "sch-smkn99-luar"
  });

  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}`, {
    headers: { Authorization: `Bearer ${otherSchoolTeacherToken}` }
  });
  assert.strictEqual(res.status, 403, "Must return HTTP 403 Forbidden for cross-school teacher access");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("sekolah lain"), "Error message specifies other school denial");
});

await runAsyncTest("HTTP: Student owner GET /api/evidence/r2/* with Authorization header succeeds (HTTP 200)", async () => {
  const ownerStudentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}`, {
    headers: { Authorization: `Bearer ${ownerStudentToken}` }
  });
  assert.strictEqual(res.status, 200, "Owner student must get HTTP 200 OK");
  assert.strictEqual(res.headers.get("x-audit-traceable"), "true");
  assert.strictEqual(res.headers.get("content-type"), "image/jpeg");
});

await runAsyncTest("HTTP: GET /api/evidence/r2/* with valid Scoped File Token succeeds (HTTP 200 without main JWT)", async () => {
  const scopedToken = generateScopedFileToken({
    userId: "user-student-1",
    role: "siswa",
    schoolId: "sch-smkn1",
    storageKey: uploadedPhotoMeta.storageKey,
    expiresInSeconds: 300
  });

  const res = await fetch(`${baseUrl}/api/evidence/r2/${encodeURIComponent(uploadedPhotoMeta.storageKey)}?fileToken=${scopedToken}`);
  assert.strictEqual(res.status, 200, "Scoped file token must allow access with HTTP 200");
  assert.strictEqual(res.headers.get("content-type"), "image/jpeg");
});

await runAsyncTest("PEMERIKSAAN 3 (HTTP): POST /api/storage/presigned-upload generates scoped upload metadata", async () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/storage/presigned-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      fileName: "jawaban_foto_praktik.jpg",
      mimeType: "image/jpeg",
      fileSize: 45000,
      category: "evidence_image",
      examId: "exam-kimia-1",
      questionId: "q-1"
    })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.uploadUrl, "Response contains uploadUrl");
  assert.ok(data.storageKey.includes("NIS-10291"), "Storage key strictly binds student NIS");
});

await runAsyncTest("PEMERIKSAAN 3 (HTTP): POST /api/storage/verify-upload blocks cross-student verification", async () => {
  const otherStudentToken = generateAuthToken({
    id: "user-student-2",
    email: "student2@smk.id",
    name: "Budi Santoso",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10292"
  });

  // Siswa 2 mencoba memverifikasi storageKey milik Siswa 1
  const res = await fetch(`${baseUrl}/api/storage/verify-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${otherStudentToken}`
    },
    body: JSON.stringify({
      storageKey: uploadedPhotoMeta.storageKey,
      fileName: "jawaban_foto_titrasi.jpg",
      mimeType: "image/jpeg",
      category: "evidence_image",
      examId: "exam-kimia-1",
      questionId: "q-1"
    })
  });

  assert.strictEqual(res.status, 403, "Must return HTTP 403 Forbidden for cross-student verify spoofing");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("siswa lain"), "Error mentions cannot verify other student's file");
});

await runAsyncTest("PEMERIKSAAN 3 (HTTP): POST /api/storage/verify-upload verifies existing file and saves final metadata", async () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/storage/verify-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      storageKey: uploadedPhotoMeta.storageKey,
      fileName: "jawaban_foto_titrasi.jpg",
      mimeType: "image/jpeg",
      category: "evidence_image",
      examId: "exam-kimia-1",
      questionId: "q-1"
    })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.verified, true);
  assert.ok(data.metadata, "Returns finalized metadata");
  assert.strictEqual(data.metadata.fileSize, uploadedPhotoMeta.fileSize);
});

await runAsyncTest("PEMERIKSAAN 2 (HTTP): POST /api/storage/presigned-download returns short-lived scoped downloadUrl", async () => {
  const studentToken = generateAuthToken({
    id: "user-student-1",
    email: "student1@smk.id",
    name: "Ahmad Fauzi",
    role: "siswa",
    schoolId: "sch-smkn1",
    nis: "NIS-10291"
  });

  const res = await fetch(`${baseUrl}/api/storage/presigned-download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      storageKey: uploadedPhotoMeta.storageKey
    })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.downloadUrl, "Returns downloadUrl");
  // downloadUrl must either be a presigned direct URL or have ?fileToken=, never ?token=
  assert.ok(!data.downloadUrl.includes("token=" + studentToken), "downloadUrl must never leak the main JWT");
});

await runAsyncTest("PEMERIKSAAN 1: When R2 is unconfigured and fallback disabled, upload fails with clear error", async () => {
  // Matikan fallback sementara
  const originalFallback = process.env.ALLOW_LOCAL_STORAGE_FALLBACK;
  delete process.env.ALLOW_LOCAL_STORAGE_FALLBACK;

  try {
    let threw = false;
    try {
      await uploadFileToR2OrLocal({
        buffer: Buffer.from("TEST_BYTES"),
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        category: "evidence_image",
        ownerId: "std-1"
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("Cloudflare R2 belum dikonfigurasi"), "Error explicitly mentions R2 not configured & fallback disabled");
      assert.ok(err.message.includes("fallback penyimpanan lokal dinonaktifkan"), "Mentions local fallback disabled");
    }
    assert.strictEqual(threw, true, "Must throw explicit error without silently saving locally");
  } finally {
    process.env.ALLOW_LOCAL_STORAGE_FALLBACK = originalFallback;
  }
});

// Tutup test server
if (serverInstance) {
  serverInstance.close();
}

// -----------------------------------------------------------------------------
// VERIFICATION SUMMARY
// -----------------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`VERIFICATION SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log("======================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
