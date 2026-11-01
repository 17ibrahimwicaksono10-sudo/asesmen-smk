import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = "http://127.0.0.1:5000";

async function runRegressionSuite() {
  console.log("=================================================");
  console.log("   EMPLOYASKILLS REGRESSION & CRITICAL TEST SUITE");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log("❌ FAILED");
      console.error("  Error:", err.message);
      failed++;
    }
  }

  // 1. Health check & Summary endpoint
  await test("GET /api/health returns HTTP 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
  });

  await test("GET /api/dashboard/summary is lightweight (< 5 KB)", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/summary`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.length < 5000, `Summary size too large: ${text.length} bytes`);
    const data = JSON.parse(text);
    assert(data.success === true);
    const summaryObj = data.summary || data.data || {};
    assert("totalExams" in summaryObj);
    assert("totalSubmissions" in summaryObj);
  });

  // 2. Bootstrap Payload and Security Sanitization
  await test("GET /api/bootstrap sanitizes sensitive credentials and excludes base64", async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(!text.includes('"password"'), "CRITICAL: Password leaked in bootstrap response!");
    assert(!text.includes('sk-'), "CRITICAL: DeepSeek API Key leaked in bootstrap response!");
    assert(!text.includes('AIzaSy'), "CRITICAL: Gemini API Key leaked in bootstrap response!");
    assert(!text.includes('data:audio/'), "CRITICAL: Base64 audio blob leaked in bootstrap response!");
    assert(!text.includes('data:image/'), "CRITICAL: Base64 image blob leaked in bootstrap response!");
  });

  // 3. Authentication & RBAC Authorization
  let adminToken = "";
  let studentToken = "";
  let studentUser = null;

  await test("POST /api/auth/login validates credentials and issues token", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@app.com", password: "password" })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success === true);
    assert(data.token, "Token was not issued");
    assert.strictEqual(data.user.role, "admin");
    assert(!("password" in data.user), "User password leaked in login response");
    adminToken = data.token;
  });

  await test("POST /api/admin/reset-database rejects unauthorized or non-admin requests", async () => {
    // Tanpa token -> 401
    const unauth = await fetch(`${BASE_URL}/api/admin/reset-database`, { method: "POST" });
    assert.strictEqual(unauth.status, 401);

    // Dummy user token non-admin dengan email unik
    const uniqueTime = Date.now();
    const dummyUser = {
      id: `usr-std-test-${uniqueTime}`,
      name: "Siswa Test",
      email: `siswa.test.${uniqueTime}@example.com`,
      identityNo: `NIS-${uniqueTime}`,
      role: "siswa"
    };
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dummyUser, password: "password123" })
    });
    assert.strictEqual(regRes.status, 200);
    const regData = await regRes.json();
    studentToken = regData.token;
    studentUser = regData.user;

    // Siswa coba akses endpoint reset admin -> 403 Forbidden
    const forbidden = await fetch(`${BASE_URL}/api/admin/reset-database`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(forbidden.status, 403);
  });

  // 4. Multimodal Evidence Audio Storage & HTTP 206 Partial Content Range Streaming
  let uploadedAudioFileName = "";

  await test("POST /api/ai/process-multimodal-evidence extracts base64 audio to file on disk", async () => {
    // Generate dummy audio webm buffer (50 KB)
    const dummyAudioBuffer = Buffer.alloc(50000, 0x41); // 'A's
    const base64Audio = `data:audio/webm;codecs=opus;base64,${dummyAudioBuffer.toString("base64")}`;

    const res = await fetch(`${BASE_URL}/api/ai/process-multimodal-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidence: {
          id: `ev-test-${Date.now()}`,
          questionId: "q-1",
          modalityType: "audio",
          fileName: "rekaman_lisan_jawaban.webm",
          fileData: base64Audio,
          audioDurationSeconds: 42
        },
        studentNis: "12345",
        studentName: "Siswa Test",
        examId: "exam-test-1"
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success === true);
    assert(data.evidence.storageUrl, "storageUrl was not assigned");
    assert.strictEqual(data.evidence.fileData, undefined, "fileData was not stripped from server response");
    assert.strictEqual(data.evidence.audioDurationSeconds, 42);

    uploadedAudioFileName = path.basename(data.evidence.storageUrl);
    console.log(`(Saved to: ${uploadedAudioFileName})`);
  });

  await test("GET /api/evidence/file/:filename supports HTTP 206 Partial Content Range streaming", async () => {
    assert(uploadedAudioFileName, "No uploaded audio file from previous step");

    // Full file request -> HTTP 200 & Accept-Ranges
    const fullRes = await fetch(`${BASE_URL}/api/evidence/file/${uploadedAudioFileName}`);
    assert.strictEqual(fullRes.status, 200);
    assert.strictEqual(fullRes.headers.get("accept-ranges"), "bytes");
    assert(fullRes.headers.get("content-length"), "Content-Length header missing");

    // Partial Range request (bytes=0-1023) -> HTTP 206
    const rangeRes = await fetch(`${BASE_URL}/api/evidence/file/${uploadedAudioFileName}`, {
      headers: { Range: "bytes=0-1023" }
    });
    assert.strictEqual(rangeRes.status, 206, `Expected HTTP 206 Partial Content, got ${rangeRes.status}`);
    const rangeHeader = rangeRes.headers.get("content-range");
    assert(rangeHeader && rangeHeader.startsWith("bytes 0-"), `Invalid Content-Range: ${rangeHeader}`);
  });

  // 5. Submission Idempotency & Duplicate Prevention
  await test("POST /api/submissions is idempotent and prevents duplicate counter increments", async () => {
    const runId = Date.now();
    const examId = `exam-idempotency-${runId}`;
    const studentId = studentUser ? studentUser.id : `usr-std-idempotency-${runId}`;
    const studentNis = studentUser ? studentUser.identityNo : `NIS-${runId}`;
    const submissionId = `sub-${examId}-${studentId}`;

    // First Exam Creation
    await fetch(`${BASE_URL}/api/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: examId,
        title: "Ujian Tes Idempotensi",
        packageId: "pkg-1",
        completedStudents: 0
      })
    });

    const submissionPayload = {
      id: submissionId,
      examId,
      examTitle: "Ujian Tes Idempotensi",
      studentId,
      studentName: studentUser?.name || "Siswa Idempotensi",
      studentNis,
      submitTime: new Date().toISOString(),
      totalScore: 85,
      technicalScore: 85,
      employabilityScore: 0,
      status: "dinilai",
      answers: {},
      evidences: []
    };

    // First submission
    const res1 = await fetch(`${BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify(submissionPayload)
    });
    assert.strictEqual(res1.status, 200);

    // Check completedStudents in exams
    const examsRes1 = await fetch(`${BASE_URL}/api/exams`);
    const examsData1 = await examsRes1.json();
    const targetExam1 = (examsData1.data || examsData1.exams)?.find((e) => e.id === examId);
    assert.strictEqual(targetExam1?.completedStudents, 1, "completedStudents should be 1 after first submission");

    // Second submission with exact same (examId, studentId) - Rapid double submit simulation
    const res2 = await fetch(`${BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify(submissionPayload)
    });
    assert.strictEqual(res2.status, 200);

    // Verify completedStudents is STILL 1 (not 2!)
    const examsRes2 = await fetch(`${BASE_URL}/api/exams`);
    const examsData2 = await examsRes2.json();
    const targetExam2 = (examsData2.data || examsData2.exams)?.find((e) => e.id === examId);
    assert.strictEqual(targetExam2?.completedStudents, 1, `CRITICAL: completedStudents ballooned to ${targetExam2?.completedStudents}`);

    // Verify total submissions in database for this student & exam is 1
    const subRes = await fetch(`${BASE_URL}/api/submissions?examId=${examId}&studentId=${studentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const subData = await subRes.json();
    const subList = subData.submissions || subData.data || [];
    assert.strictEqual(subList.length, 1, "Submission records were duplicated in database");
  });

  // 6. Draft Autosave & Recovery
  await test("POST & GET /api/exams/:id/draft saves and restores student progress", async () => {
    const examId = "exam-draft-test";
    const studentNis = studentUser ? studentUser.identityNo : "112233";

    const draftData = {
      q1: { questionId: "q1", selectedOption: "A" },
      q2: { questionId: "q2", essayAnswer: "Konsentrasi larutan standar NaOH adalah 0.1 M" }
    };

    // Save draft
    const saveRes = await fetch(`${BASE_URL}/api/exams/${examId}/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({ studentNis, studentName: "Siswa Draft", draftData })
    });
    assert.strictEqual(saveRes.status, 200);

    // Retrieve draft
    const getRes = await fetch(`${BASE_URL}/api/exams/${examId}/draft?studentNis=${studentNis}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.success, true);
    assert.deepStrictEqual(getJson.data?.draftData, draftData);
  });

  console.log("=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
