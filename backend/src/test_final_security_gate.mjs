// ======================================================================
// TEST SUITE: FINAL SECURITY GATE - EMPLOYASKILLS
// 1. Audit POST /api/auth/restore-token (Anonim, Expired, Palsu, Spoofing)
// 2. Audit Kebocoran Kunci Jawaban (/api/bootstrap, /api/packages, /api/submissions)
// ======================================================================

import assert from "assert";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

let passedCount = 0;
let failedCount = 0;

function pass(msg) {
  passedCount++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg, detail = "") {
  failedCount++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (detail) console.error(`     Detail: ${detail}`);
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message, data: {} };
  }
}

// Helper untuk memeriksa keberadaan kunci jawaban dan rubrik rahasia pada objek butir soal
function inspectForSecretLeaks(questions, contextName = "") {
  if (!Array.isArray(questions)) return [];
  const leaks = [];
  questions.forEach((q, idx) => {
    const qLabel = q.id || q.code || `index_${idx}`;
    if (q.correctAnswer !== undefined) leaks.push(`${contextName}[${qLabel}].correctAnswer`);
    if (q.correctAnswers !== undefined) leaks.push(`${contextName}[${qLabel}].correctAnswers`);
    if (q.shortAnswerKey !== undefined) leaks.push(`${contextName}[${qLabel}].shortAnswerKey`);
    if (q.shortAnswerKey2 !== undefined) leaks.push(`${contextName}[${qLabel}].shortAnswerKey2`);
    if (q.rubricGuide !== undefined) leaks.push(`${contextName}[${qLabel}].rubricGuide`);
    if (q.evaluationRubric !== undefined) leaks.push(`${contextName}[${qLabel}].evaluationRubric`);
    if (q.scoringRubric !== undefined) leaks.push(`${contextName}[${qLabel}].scoringRubric`);
    if (q.sampleAnswer !== undefined) leaks.push(`${contextName}[${qLabel}].sampleAnswer`);
    if (q.scoringMap !== undefined) leaks.push(`${contextName}[${qLabel}].scoringMap`);
    if (q.keywords !== undefined) leaks.push(`${contextName}[${qLabel}].keywords`);
    if (q.correctStep !== undefined) leaks.push(`${contextName}[${qLabel}].correctStep`);

    if (Array.isArray(q.matchingColumnA)) {
      q.matchingColumnA.forEach((m, mIdx) => {
        if (m.correctMatch !== undefined) leaks.push(`${contextName}[${qLabel}].matchingColumnA[${mIdx}].correctMatch`);
      });
    }
    if (Array.isArray(q.statements)) {
      q.statements.forEach((s, sIdx) => {
        if (s.correctAnswer !== undefined) leaks.push(`${contextName}[${qLabel}].statements[${sIdx}].correctAnswer`);
      });
    }
    if (Array.isArray(q.subQuestions)) {
      q.subQuestions.forEach((sq, sqIdx) => {
        if (sq.answerKey !== undefined) leaks.push(`${contextName}[${qLabel}].subQuestions[${sqIdx}].answerKey`);
        if (sq.rubric !== undefined) leaks.push(`${contextName}[${qLabel}].subQuestions[${sqIdx}].rubric`);
      });
    }
  });
  return leaks;
}

async function runSecurityGateTests() {
  console.log("======================================================================");
  console.log("       FINAL SECURITY GATE: EMPLOYASKILLS AUTH & DATA AUDIT           ");
  console.log("======================================================================");

  // 1. Setup Kredensial Uji (Admin & Siswa)
  console.log("\n[Setup] Mengambil token sah Admin dan Siswa...");
  const adminLogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: "admin@app.com", password: "password" }
  });
  assert(adminLogin.ok && adminLogin.data.token, "Login admin sah berhasil");
  const adminToken = adminLogin.data.token;
  pass("Token admin sah berhasil diperoleh");

  const siswaEmail = `siswa.gate.${Date.now()}@smk.sch.id`;
  const siswaReg = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      name: "Siswa Security Gate",
      email: siswaEmail,
      password: "password123",
      role: "siswa",
      identityNo: `NIS-${Date.now().toString().slice(-5)}`,
      schoolId: "sch-1",
      schoolName: "SMK Negeri 1 Surabaya",
      classId: "cls-1",
      className: "XII Kimia Analitik 1"
    }
  });
  assert(siswaReg.ok && siswaReg.data.token, "Registrasi siswa sah berhasil");
  const siswaToken = siswaReg.data.token;
  const siswaUser = siswaReg.data.user;
  pass("Token siswa sah berhasil diperoleh");

  // ====================================================================
  // BAGIAN 1: AUDIT ENDPOINT POST /api/auth/restore-token
  // ====================================================================
  console.log("\n--- BAGIAN 1: AUDIT KEAMANAN POST /api/auth/restore-token ---");

  // 1.1 Pengguna Anonim mencoba meminta token hanya dengan email Admin tanpa menyertakan token sah
  const anonForgeAdmin = await apiRequest("/api/auth/restore-token", {
    method: "POST",
    body: { email: "admin@app.com", id: "usr-admin-1" }
  });
  if (anonForgeAdmin.status === 401) {
    pass("Anonim meminta token Admin dengan body JSON ditolak HTTP 401 Unauthorized");
  } else {
    fail("Anonim meminta token Admin dengan body JSON ditolak HTTP 401", `Diterima status: ${anonForgeAdmin.status}`);
  }

  // 1.2 Pengguna Anonim tanpa body dan tanpa header Authorization
  const anonEmpty = await apiRequest("/api/auth/restore-token", {
    method: "POST"
  });
  if (anonEmpty.status === 401) {
    pass("Request kosong tanpa token ditolak HTTP 401 Unauthorized");
  } else {
    fail("Request kosong tanpa token ditolak HTTP 401", `Diterima status: ${anonEmpty.status}`);
  }

  // 1.3 Pengguna mengirim token palsu / signature yang dimanipulasi
  const fakeToken = adminToken.slice(0, -8) + "badSig99";
  const fakeTokenRes = await apiRequest("/api/auth/restore-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${fakeToken}` },
    body: { token: fakeToken }
  });
  if (fakeTokenRes.status === 401) {
    pass("Token dengan tanda tangan HMAC yang dimanipulasi ditolak HTTP 401");
  } else {
    fail("Token manipulasi ditolak HTTP 401", `Diterima status: ${fakeTokenRes.status}`);
  }

  // 1.4 Pengguna mengirim token kedaluwarsa (Expired Token)
  const expiredPayload = {
    userId: "usr-admin-1",
    id: "usr-admin-1",
    email: "admin@app.com",
    name: "Admin Expired",
    role: "admin",
    iat: Date.now() - 10000000,
    exp: Date.now() - 5000 // 5 detik yang lalu
  };
  const expBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredTokenMock = `${expBase64}.mockSignatureExpired`;
  const expRes = await apiRequest("/api/auth/restore-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${expiredTokenMock}` }
  });
  if (expRes.status === 401) {
    pass("Token kedaluwarsa ditolak HTTP 401 Unauthorized");
  } else {
    fail("Token kedaluwarsa ditolak HTTP 401", `Diterima status: ${expRes.status}`);
  }

  // 1.5 Percobaan Identity Spoofing: Siswa sah mengirim token miliknya tetapi meminta akun Admin di body
  const spoofAdminRes = await apiRequest("/api/auth/restore-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: {
      token: siswaToken,
      email: "admin@app.com",
      id: "usr-admin-1"
    }
  });
  if (spoofAdminRes.status === 403) {
    pass("Percobaan siswa membajak identitas Admin via restore-token diblokir HTTP 403 Forbidden");
  } else {
    fail("Percobaan siswa membajak identitas Admin diblokir HTTP 403", `Diterima status: ${spoofAdminRes.status}`);
  }

  // 1.6 Pemulihan Sesi Sah: Siswa sah dengan token valid memulihkan sesinya sendiri
  const validRestoreRes = await apiRequest("/api/auth/restore-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: { token: siswaToken }
  });
  if (validRestoreRes.ok && validRestoreRes.data.token && validRestoreRes.data.user?.email === siswaEmail) {
    pass("Sesi sah siswa berhasil dipulihkan dan mengembalikan token terverifikasi");
  } else {
    fail("Sesi sah siswa berhasil dipulihkan", `Status: ${validRestoreRes.status}`);
  }

  // ====================================================================
  // BAGIAN 2: AUDIT KEBOCORAN KUNCI JAWABAN & RUBRIK KE SISWA
  // ====================================================================
  console.log("\n--- BAGIAN 2: AUDIT KEBOCORAN KUNCI JAWABAN KE SISWA & ANONIM ---");

  // 2.1 Audit /api/bootstrap untuk Pengguna Anonim
  const anonBootstrap = await apiRequest("/api/bootstrap");
  assert(anonBootstrap.ok, "Panggilan /api/bootstrap anonim berhasil");
  const anonPackages = anonBootstrap.data.data?.packages || [];
  let anonPkgLeaks = [];
  anonPackages.forEach(p => {
    anonPkgLeaks = anonPkgLeaks.concat(inspectForSecretLeaks(p.questions, `anon.bootstrap.packages[${p.id}]`));
  });
  if (anonPkgLeaks.length === 0) {
    pass("Endpoint /api/bootstrap publik (anonim) 100% bersih dari correctAnswer & rubricGuide");
  } else {
    fail("Bootstrap anonim membocorkan kunci/rubrik!", anonPkgLeaks.slice(0, 3).join(", "));
  }

  // 2.2 Audit /api/bootstrap untuk Siswa Logged-in
  const siswaBootstrap = await apiRequest("/api/bootstrap", {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  assert(siswaBootstrap.ok, "Panggilan /api/bootstrap siswa berhasil");
  const siswaPackages = siswaBootstrap.data.data?.packages || [];
  let siswaPkgLeaks = [];
  siswaPackages.forEach(p => {
    siswaPkgLeaks = siswaPkgLeaks.concat(inspectForSecretLeaks(p.questions, `siswa.bootstrap.packages[${p.id}]`));
  });
  if (siswaPkgLeaks.length === 0) {
    pass("Endpoint /api/bootstrap untuk Siswa 100% bersih dari correctAnswer & rubricGuide");
  } else {
    fail("Bootstrap siswa membocorkan kunci/rubrik!", siswaPkgLeaks.slice(0, 3).join(", "));
  }

  // 2.3 Audit questionSnapshot pada exams di /api/bootstrap untuk Siswa
  const siswaExams = siswaBootstrap.data.data?.exams || [];
  let examSnapshotLeaks = [];
  siswaExams.forEach(e => {
    if (e.questionSnapshot) {
      examSnapshotLeaks = examSnapshotLeaks.concat(inspectForSecretLeaks(e.questionSnapshot, `siswa.bootstrap.exams[${e.id}].snapshot`));
    }
  });
  if (examSnapshotLeaks.length === 0) {
    pass("Metadata exams di /api/bootstrap tidak membocorkan kunci pada questionSnapshot siswa");
  } else {
    fail("Exam snapshot di bootstrap siswa bocor!", examSnapshotLeaks.slice(0, 3).join(", "));
  }

  // 2.4 Audit GET /api/packages untuk Siswa
  const siswaGetPackages = await apiRequest("/api/packages", {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  const directPkgLeaks = [];
  (siswaGetPackages.data.packages || siswaGetPackages.data.data || []).forEach(p => {
    directPkgLeaks.push(...inspectForSecretLeaks(p.questions, `GET /api/packages[${p.id}]`));
  });
  if (directPkgLeaks.length === 0) {
    pass("Endpoint GET /api/packages untuk Siswa 100% tersanitasi dari seluruh kunci & rubrik");
  } else {
    fail("GET /api/packages membocorkan rahasia ke siswa!", directPkgLeaks.slice(0, 3).join(", "));
  }

  // 2.5 Audit GET /api/packages/:id untuk Siswa
  const samplePkgId = siswaPackages[0]?.id || "pkg-1";
  const siswaGetSinglePkg = await apiRequest(`/api/packages/${samplePkgId}`, {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  const singlePkgLeaks = inspectForSecretLeaks(siswaGetSinglePkg.data.package?.questions || [], `GET /api/packages/${samplePkgId}`);
  if (singlePkgLeaks.length === 0) {
    pass(`Endpoint GET /api/packages/:id (${samplePkgId}) untuk Siswa 100% bersih`);
  } else {
    fail(`GET /api/packages/${samplePkgId} membocorkan rahasia!`, singlePkgLeaks.slice(0, 3).join(", "));
  }

  // 2.6 Audit GET /api/exams/:id/questions untuk Siswa
  let sampleExam = siswaExams.find(e => 
    (!e.classId || e.classId === siswaUser.classId || e.className === siswaUser.className) &&
    (!e.schoolId || e.schoolId === siswaUser.schoolId || e.schoolName === siswaUser.schoolName)
  );

  if (!sampleExam) {
    const createExamRes = await apiRequest("/api/exams", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: `exam-gate-${Date.now()}`,
        title: "Ujian Gate Evaluasi Siswa",
        packageId: samplePkgId,
        packageTitle: "Paket Soal Gate Evaluasi",
        schoolId: siswaUser.schoolId,
        schoolName: siswaUser.schoolName,
        classId: siswaUser.classId,
        className: siswaUser.className,
        durationMinutes: 60,
        status: "berjalan"
      }
    });
    sampleExam = createExamRes.data?.exam || createExamRes.data;
  }
  if (sampleExam) {
    const examQuestionsRes = await apiRequest(`/api/exams/${sampleExam.id}/questions`, {
      headers: { Authorization: `Bearer ${siswaToken}` }
    });
    const examQLeaks = inspectForSecretLeaks(examQuestionsRes.data.questions || [], `GET /api/exams/${sampleExam.id}/questions`);
    if (examQLeaks.length === 0) {
      pass(`Endpoint GET /api/exams/:id/questions (${sampleExam.id}) untuk Siswa 100% tersanitasi`);
    } else {
      fail(`GET /api/exams/${sampleExam.id}/questions membocorkan rahasia!`, examQLeaks.slice(0, 3).join(", "));
    }
  }

  // 2.7 Audit GET /api/submissions (List View) untuk Siswa
  const siswaSubsListRes = await apiRequest("/api/submissions", {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  const subsList = siswaSubsListRes.data.submissions || [];
  const subsListHasSnapshot = subsList.some(s => s.questionSnapshot !== undefined);
  if (!subsListHasSnapshot) {
    pass("Daftar GET /api/submissions tidak menyertakan questionSnapshot mentah");
  } else {
    fail("GET /api/submissions menyertakan questionSnapshot mentah!");
  }

  // 2.8 Verifikasi Kunci dan Rubrik TETAP TERSEDIA untuk Guru & Admin
  const guruLogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: "guru.kimia@smk.sch.id", password: "password123" }
  });
  const teacherToken = guruLogin.ok ? guruLogin.data.token : adminToken;
  const teacherPkgRes = await apiRequest(`/api/packages/${samplePkgId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const teacherQuestions = teacherPkgRes.data.package?.questions || [];
  const hasKeysForTeacher = teacherQuestions.some(q => q.correctAnswer || q.rubricGuide || q.shortAnswerKey || q.scoringMap);
  if (hasKeysForTeacher) {
    pass("Kunci jawaban dan rubrik penilaian TETAP TERSEDIA secara aman untuk Guru & Admin");
  } else {
    fail("Kunci jawaban hilang untuk Guru!", "Guru tidak dapat melihat kunci/rubrik");
  }

  // 2.9 Verifikasi Server-Side Scoring Enforcement (Manipulasi Nilai Ditolak)
  if (sampleExam) {
    const fakeScoreSub = {
      id: `sub-fake-score-${Date.now()}`,
      examId: sampleExam.id,
      examTitle: sampleExam.title,
      studentId: siswaUser.id,
      studentName: siswaUser.name,
      studentNis: siswaUser.identityNo,
      schoolId: siswaUser.schoolId,
      schoolName: siswaUser.schoolName,
      className: siswaUser.className,
      totalScore: 999,
      technicalScore: 999,
      employabilityScore: 999,
      status: "dinilai",
      answers: {}
    };
    const subRes = await apiRequest("/api/submissions", {
      method: "POST",
      headers: { Authorization: `Bearer ${siswaToken}` },
      body: fakeScoreSub
    });
    if (subRes.ok && subRes.data.submission?.totalScore !== 999 && subRes.data.submission?.totalScore <= 100) {
      pass(`Manipulasi skor browser (totalScore 999) ditolak & dihitung ulang ke ${subRes.data.submission.totalScore}`);
    } else {
      fail("Manipulasi skor browser diterima oleh server!", `Status: ${subRes.status}, Error: ${subRes.data?.error || JSON.stringify(subRes.data)}`);
    }
  }

  console.log("\n======================================================================");
  console.log(`  HASIL AKHIR AUDIT FINAL SECURITY GATE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSecurityGateTests();
