import fs from "fs";
import path from "path";

const BASE_URL = "http://127.0.0.1:5000";

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// 10 Paket B Questions: Keselamatan Kerja Laboratorium (K3LH)
const PAKET_B_QUESTIONS_10 = Array.from({ length: 10 }, (_, i) => {
  const num = i + 1;
  return {
    id: `q-k3-${num.toString().padStart(2, "0")}`,
    code: `K3-${num.toString().padStart(2, "0")}`,
    number: num,
    category: "teknis_kimia", // Kategori sengaja 'teknis_kimia' untuk membuktikan anti-fallback
    topic: "Keselamatan Kerja Laboratorium Kimia (K3LH)",
    questionText: `Soal K3LH No. ${num}: Prosedur penanganan keselamatan laboratorium kimia ${num}`,
    type: num <= 6 ? "multiple_choice" : num <= 8 ? "complex_mcq" : "essay",
    options: num <= 8 ? ["APD Lengkap", "Kacamata Google Saja", "Jas Lab Tanpa Masker", "Sarung Tangan Lateks"] : undefined,
    correctAnswer: num <= 6 ? "APD Lengkap" : undefined,
    correctAnswers: num > 6 && num <= 8 ? ["APD Lengkap", "Sarung Tangan Lateks"] : undefined,
    sampleAnswer: num > 8 ? `Penanganan tumpahan bahan kimia no ${num} menggunakan pasir/absorben asam dan bilas air mengalir.` : undefined,
    rubricGuide: num > 8 ? "Penilaian ketepatan prosedur K3 dan isolasi area tumpahan" : undefined,
    points: num > 8 ? 10 : 5,
    maxScore: num > 8 ? 10 : 5
  };
});

const PAKET_B_DEFINITION = {
  id: "pkg-keselamatan-k3-10",
  code: "PKG-K3-10",
  title: "Paket B: Keselamatan Kerja Laboratorium",
  description: "Instrumen Ujian K3LH dan Keselamatan Laboratorium Kimia (10 Soal)",
  category: "teknis_kimia",
  durationMinutes: 45,
  totalQuestions: 10,
  questions: PAKET_B_QUESTIONS_10,
  isActive: true,
  version: 1,
  createdAt: "2025-02-15",
  createdBy: "Drs. Budi Santoso, M.Pd."
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Detail: ${details}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log("======================================================================");
  console.log("  SUITE PENGUJIAN INTEGRITAS PEMETAAN PAKET SOAL (10 PENGUJIAN WAJIB)");
  console.log("======================================================================\n");

  // 1. Dapatkan Token Otentik dari Server
  console.log("[Auth] Memperoleh token autentik Admin, Guru, dan Siswa dari server...");
  const adminLogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: "admin@app.com", password: "password" }
  });
  assert(adminLogin.ok && adminLogin.data.token, "Login Admin sah berhasil");
  const adminToken = adminLogin.data.token;

  // Daftarkan Guru Uji jika belum ada
  const guruEmail = "guru.kimia@smk.sch.id";
  const guruReg = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      name: "Drs. Budi Santoso, M.Pd.",
      email: guruEmail,
      password: "password123",
      role: "guru",
      identityNo: "198001012005011001",
      schoolName: "SMK Negeri 1 Surabaya"
    }
  });
  const guruLogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: guruEmail, password: "password123" }
  });
  const guruToken = (guruLogin.ok && guruLogin.data?.token) || (guruReg.ok && guruReg.data?.token) || adminToken;

  // Daftarkan Siswa 1
  const s1Email = "siswa1.test@smk.sch.id";
  const s1Reg = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      name: "Ahmad Rizki",
      email: s1Email,
      password: "password123",
      role: "siswa",
      identityNo: "1029384756",
      schoolId: "sch-1",
      schoolName: "SMK Negeri 1 Surabaya",
      classId: "cls-1",
      className: "XII Kimia Analitik 1"
    }
  });
  const s1Login = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: s1Email, password: "password123" }
  });
  const siswa1Token = (s1Login.ok && s1Login.data?.token) || (s1Reg.ok && s1Reg.data?.token);
  assert(siswa1Token, "Token Siswa 1 sah berhasil diperoleh");

  // Daftarkan Siswa 2
  const s2Email = "siswa2.test@smk.sch.id";
  const s2Reg = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      name: "Siti Nurhaliza",
      email: s2Email,
      password: "password123",
      role: "siswa",
      identityNo: "1029384757",
      schoolId: "sch-1",
      schoolName: "SMK Negeri 1 Surabaya",
      classId: "cls-1",
      className: "XII Kimia Analitik 1"
    }
  });
  const s2Login = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: s2Email, password: "password123" }
  });
  const siswa2Token = (s2Login.ok && s2Login.data?.token) || (s2Reg.ok && s2Reg.data?.token);
  assert(siswa2Token, "Token Siswa 2 sah berhasil diperoleh");

  // Setup: Simpan Paket B ke backend
  console.log("\n[Setup] Menyimpan Paket B (Keselamatan Kerja Laboratorium - 10 Soal) ke Server...");
  const savePkgRes = await apiRequest("/api/packages", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: PAKET_B_DEFINITION
  });
  assert(savePkgRes.ok, "Setup Paket B tersimpan di server");

  // --------------------------------------------------------------------
  // Pengujian 1: Paket A menampilkan tepat 24 soal Paket A
  // --------------------------------------------------------------------
  const runTimestamp = Date.now();
  console.log("\n--- UJI 1: Verifikasi Paket A (Kemampuan Teknis Kimia, 24 Soal) ---");
  const examAReq = {
    id: `ex-test-paket-a-${runTimestamp}`,
    title: "Ujian Teknis Kimia Komprehensif",
    packageId: "pkg-full-24",
    classId: "cls-1",
    className: "XII Kimia Analitik 1",
    schoolId: "sch-1",
    schoolName: "SMK Negeri 1 Surabaya",
    teacherId: "usr-guru-1",
    teacherName: "Drs. Budi Santoso, M.Pd.",
    scheduleDate: "2025-02-20",
    startTime: "08:00",
    endTime: "09:30",
    durationMinutes: 90,
    targetScore: 75,
    status: "berjalan",
    totalStudents: 30,
    completedStudents: 0
  };

  const createExamARes = await apiRequest("/api/exams", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: examAReq
  });
  assert(createExamARes.ok, "Jadwal Ujian Paket A berhasil dibuat");

  const openExamARes = await apiRequest(`/api/exams/${examAReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  assert(openExamARes.ok, "Siswa berhasil membuka soal Ujian Paket A");
  assert(
    openExamARes.data.totalQuestions === 24,
    "Paket A menampilkan tepat 24 butir soal",
    `Ditemukan: ${openExamARes.data.totalQuestions}`
  );
  assert(
    openExamARes.data.questions?.length === 24,
    "Array butir soal Paket A berukuran 24",
    `Array length: ${openExamARes.data.questions?.length}`
  );
  assert(
    openExamARes.data.packageTitle?.includes("Kimia"),
    "Judul paket soal Paket A sesuai",
    `Judul: ${openExamARes.data.packageTitle}`
  );

  // --------------------------------------------------------------------
  // Pengujian 2: Paket B menampilkan tepat 10 soal Paket B
  // --------------------------------------------------------------------
  console.log("\n--- UJI 2: Verifikasi Paket B (Keselamatan Kerja Laboratorium, 10 Soal) ---");
  const examBReq = {
    id: `ex-test-paket-b-${runTimestamp}`,
    title: "Ujian K3LH dan Keselamatan Laboratorium",
    packageId: "pkg-keselamatan-k3-10",
    classId: "cls-1",
    className: "XII Kimia Analitik 1",
    schoolId: "sch-1",
    schoolName: "SMK Negeri 1 Surabaya",
    teacherId: "usr-guru-1",
    teacherName: "Drs. Budi Santoso, M.Pd.",
    scheduleDate: "2025-02-21",
    startTime: "08:00",
    endTime: "08:45",
    durationMinutes: 45,
    targetScore: 80,
    status: "berjalan",
    totalStudents: 30,
    completedStudents: 0
  };

  const createExamBRes = await apiRequest("/api/exams", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: examBReq
  });
  assert(createExamBRes.ok, "Jadwal Ujian Paket B berhasil dibuat");

  const openExamBRes = await apiRequest(`/api/exams/${examBReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  assert(openExamBRes.ok, "Siswa berhasil membuka soal Ujian Paket B");
  assert(
    openExamBRes.data.totalQuestions === 10,
    "Paket B menampilkan tepat 10 butir soal (BUKAN 24 soal kimia)",
    `Ditemukan: ${openExamBRes.data.totalQuestions}`
  );
  assert(
    openExamBRes.data.questions?.[0]?.topic?.includes("K3LH"),
    "Soal pertama Paket B adalah topik K3LH",
    `Topik: ${openExamBRes.data.questions?.[0]?.topic}`
  );
  assert(
    openExamBRes.data.questions?.every(q => q.id.startsWith("q-k3-")),
    "Seluruh 10 soal berasal dari ID q-k3-* Paket B",
    "Ada soal dengan ID selain q-k3-*"
  );
  assert(
    openExamBRes.data.questions?.every(q => q.correctAnswer === undefined && q.correctAnswers === undefined && q.rubricGuide === undefined),
    "Siswa tidak menerima correctAnswer, correctAnswers, atau rubricGuide rahasia",
    "Kunci jawaban atau rubrik rahasia bocor di respons siswa!"
  );

  // Verifikasi proteksi akses: Siswa kelas lain dilarang membuka soal ujian ini
  const unauthEmail = `siswa.luar.${Date.now()}@smk.sch.id`;
  const unauthReg = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      name: "Siswa Luar Kelas",
      email: unauthEmail,
      password: "password123",
      role: "siswa",
      identityNo: `99${Date.now()}`.slice(0, 10),
      schoolId: "sch-1",
      schoolName: "SMK Negeri 1 Surabaya",
      classId: "cls-other-99",
      className: "XI Kimia Industri 2" // BUKAN XII Kimia Analitik 1!
    }
  });
  const unauthLogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: unauthEmail, password: "password123" }
  });
  const unauthToken = (unauthLogin.ok && unauthLogin.data?.token) || (unauthReg.ok && unauthReg.data?.token);
  assert(unauthToken, "Token Siswa Luar Kelas berhasil diperoleh");

  const unauthExamRes = await apiRequest(`/api/exams/${examBReq.id}/questions`, {
    headers: { Authorization: `Bearer ${unauthToken}` }
  });
  assert(
    unauthExamRes.status === 403,
    "Siswa dari kelas lain dilarang mengambil soal ujian (HTTP 403 Forbidden)",
    `Status diterima: ${unauthExamRes.status}`
  );

  // --------------------------------------------------------------------
  // Pengujian 3: Paket C menampilkan tepat 18 butir Paket C
  // --------------------------------------------------------------------
  console.log("\n--- UJI 3: Verifikasi Paket C (Employability Skills, 18 Butir) ---");
  const examCReq = {
    id: `ex-test-paket-c-${runTimestamp}`,
    title: "Asesmen Kesiapan Kerja Siswa (Non-Tes)",
    packageId: "pkg-employability-18",
    classId: "cls-1",
    className: "XII Kimia Analitik 1",
    schoolId: "sch-1",
    schoolName: "SMK Negeri 1 Surabaya",
    teacherId: "usr-guru-1",
    teacherName: "Drs. Budi Santoso, M.Pd.",
    scheduleDate: "2025-02-22",
    startTime: "09:00",
    endTime: "09:40",
    durationMinutes: 40,
    targetScore: 70,
    status: "berjalan",
    totalStudents: 30,
    completedStudents: 0
  };

  const createExamCRes = await apiRequest("/api/exams", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: examCReq
  });
  assert(createExamCRes.ok, "Jadwal Ujian Paket C berhasil dibuat");

  const openExamCRes = await apiRequest(`/api/exams/${examCReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa2Token}` }
  });
  assert(openExamCRes.ok, "Siswa berhasil membuka butir Asesmen Paket C");
  assert(
    openExamCRes.data.totalQuestions === 18,
    "Paket C menampilkan tepat 18 butir instrumen non-tes",
    `Ditemukan: ${openExamCRes.data.totalQuestions}`
  );
  assert(
    openExamCRes.data.packageTitle?.includes("Employability"),
    "Judul paket soal Paket C sesuai",
    `Judul: ${openExamCRes.data.packageTitle}`
  );

  // --------------------------------------------------------------------
  // Pengujian 4: Mengganti paket saat jadwal diubah, soal benar-benar berubah
  // --------------------------------------------------------------------
  console.log("\n--- UJI 4: Perubahan Paket pada Jadwal Mengubah Soal Secara Nyata ---");
  const updateExamRes = await apiRequest(`/api/exams/${examAReq.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: {
      ...examAReq,
      title: "Ujian Dialihkan ke Paket B",
      packageId: "pkg-keselamatan-k3-10" // dialihkan dari Paket A (24 soal) ke Paket B (10 soal)
    }
  });
  assert(updateExamRes.ok, "Jadwal ujian berhasil diperbarui ke Paket B");

  const openSwitchedExam = await apiRequest(`/api/exams/${examAReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  assert(
    openSwitchedExam.data.totalQuestions === 10,
    "Setelah paket diubah dari Paket A ke Paket B, jumlah soal berubah menjadi 10",
    `Ditemukan: ${openSwitchedExam.data.totalQuestions}`
  );
  assert(
    openSwitchedExam.data.packageId === "pkg-keselamatan-k3-10",
    "packageId ujian berubah menjadi pkg-keselamatan-k3-10",
    `packageId: ${openSwitchedExam.data.packageId}`
  );

  // Kembalikan ke Paket A untuk kelanjutan pengujian
  await apiRequest(`/api/exams/${examAReq.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: examAReq
  });

  // --------------------------------------------------------------------
  // Pengujian 5: Refresh browser tidak mengubah paket atau soal
  // --------------------------------------------------------------------
  console.log("\n--- UJI 5: Simulasi Refresh Browser Tidak Mengubah Paket atau Soal ---");
  // Panggilan ke-1 (sebelum refresh)
  const reqBeforeRefresh = await apiRequest(`/api/exams/${examBReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  // Panggilan ke-2 (simulasi refresh halaman setelah reload)
  const reqAfterRefresh = await apiRequest(`/api/exams/${examBReq.id}/questions`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  // Panggilan bootstrap
  const bootstrapRes = await apiRequest("/api/bootstrap", {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });

  assert(
    reqBeforeRefresh.data.totalQuestions === reqAfterRefresh.data.totalQuestions &&
    reqAfterRefresh.data.totalQuestions === 10,
    "Jumlah soal tetap 10 sebelum dan sesudah refresh browser",
    `Sebelum: ${reqBeforeRefresh.data.totalQuestions}, Sesudah: ${reqAfterRefresh.data.totalQuestions}`
  );
  assert(
    reqBeforeRefresh.data.questions?.[0]?.id === reqAfterRefresh.data.questions?.[0]?.id,
    "Identitas soal pertama identik sebelum dan sesudah refresh",
    `ID: ${reqAfterRefresh.data.questions?.[0]?.id}`
  );
  const examInBootstrap = bootstrapRes.data.data?.exams?.find(e => e.id === examBReq.id);
  assert(
    examInBootstrap?.packageId === "pkg-keselamatan-k3-10",
    "Data exam pada endpoint bootstrap tetap menunjuk ke Paket B",
    `Bootstrap packageId: ${examInBootstrap?.packageId}`
  );

  // --------------------------------------------------------------------
  // Pengujian 6: Dua siswa mengerjakan paket berbeda secara bersamaan
  // --------------------------------------------------------------------
  console.log("\n--- UJI 6: Dua Siswa Mengerjakan Paket Berbeda Secara Bersamaan ---");
  // Siswa 1 mengerjakan Paket B (Ujian Keselamatan Lab - 10 Soal Lengkap)
  const subSiswa1Req = {
    id: `sub-std1-${Date.now()}`,
    examId: examBReq.id,
    examTitle: examBReq.title,
    studentId: "usr-std-001",
    studentName: "Ahmad Rizki",
    studentNis: "1029384756",
    className: "XII Kimia Analitik 1",
    submitTime: new Date().toISOString(),
    status: "dinilai",
    answers: {
      "q-k3-01": { questionId: "q-k3-01", selectedOption: "APD Lengkap" },
      "q-k3-02": { questionId: "q-k3-02", selectedOption: "APD Lengkap" },
      "q-k3-03": { questionId: "q-k3-03", selectedOption: "APD Lengkap" },
      "q-k3-04": { questionId: "q-k3-04", selectedOption: "APD Lengkap" },
      "q-k3-05": { questionId: "q-k3-05", selectedOption: "APD Lengkap" },
      "q-k3-06": { questionId: "q-k3-06", selectedOption: "APD Lengkap" },
      "q-k3-07": { questionId: "q-k3-07", selectedOptions: ["APD Lengkap", "Sarung Tangan Lateks"] },
      "q-k3-08": { questionId: "q-k3-08", selectedOptions: ["APD Lengkap", "Sarung Tangan Lateks"] },
      "q-k3-09": { questionId: "q-k3-09", essayAnswer: "Gunakan pasir dan bilas air mengalir", score: 10 },
      "q-k3-10": { questionId: "q-k3-10", essayAnswer: "Gunakan shower keselamatan darurat", score: 10 }
    }
  };

  // Siswa 2 mengerjakan Paket C (Employability non-tes - 18 Butir Lengkap)
  const subSiswa2Answers = {};
  (openExamCRes.data.questions || []).forEach((q, idx) => {
    subSiswa2Answers[q.id] = {
      questionId: q.id,
      selectedOption: idx % 2 === 0 ? "B" : "D"
    };
  });

  const subSiswa2Req = {
    id: `sub-std2-${Date.now()}`,
    examId: examCReq.id,
    examTitle: examCReq.title,
    studentId: "usr-std-002",
    studentName: "Siti Nurhaliza",
    studentNis: "1029384757",
    className: "XII Kimia Analitik 1",
    submitTime: new Date().toISOString(),
    status: "dinilai",
    answers: subSiswa2Answers
  };

  // Kirim secara paralel
  const [resSub1, resSub2] = await Promise.all([
    apiRequest("/api/submissions", {
      method: "POST",
      headers: { Authorization: `Bearer ${siswa1Token}` },
      body: subSiswa1Req
    }),
    apiRequest("/api/submissions", {
      method: "POST",
      headers: { Authorization: `Bearer ${siswa2Token}` },
      body: subSiswa2Req
    })
  ]);

  assert(resSub1.ok, "Submission Siswa 1 (Paket B) berhasil disimpan");
  assert(resSub2.ok, "Submission Siswa 2 (Paket C) berhasil disimpan");

  const sub1Id = resSub1.data.submission?.id || subSiswa1Req.id;
  const sub2Id = resSub2.data.submission?.id || subSiswa2Req.id;

  const detailSub1 = await apiRequest(`/api/submissions/${sub1Id}`, {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  const detailSub2 = await apiRequest(`/api/submissions/${sub2Id}`, {
    headers: { Authorization: `Bearer ${siswa2Token}` }
  });

  assert(
    detailSub1.data.submission?.packageId === "pkg-keselamatan-k3-10",
    "Submission Siswa 1 terikat ke Paket B",
    `Paket Siswa 1: ${detailSub1.data.submission?.packageId}`
  );
  assert(
    detailSub2.data.submission?.packageId === "pkg-employability-18",
    "Submission Siswa 2 terikat ke Paket C",
    `Paket Siswa 2: ${detailSub2.data.submission?.packageId}`
  );
  assert(
    Object.keys(detailSub1.data.submission?.answers || {}).every(k => k.startsWith("q-k3-")),
    "Jawaban Siswa 1 murni berisi soal Paket B tanpa terkontaminasi Paket C",
    "Ditemukan kunci jawaban selain q-k3-*"
  );
  assert(
    Object.keys(detailSub2.data.submission?.answers || {}).every(k => k.startsWith("nt-")),
    "Jawaban Siswa 2 murni berisi butir Paket C tanpa terkontaminasi Paket B",
    "Ditemukan kunci jawaban selain nt-*"
  );

  // --------------------------------------------------------------------
  // Pengujian 7: Jawaban, nilai, rubrik, dan hasil guru selalu cocok dengan paket
  // --------------------------------------------------------------------
  console.log("\n--- UJI 7: Kesesuaian Nilai, Rubrik, dan Hasil Guru dengan Paket ---");
  assert(
    detailSub1.data.submission?.technicalScore === 100 && detailSub1.data.submission?.employabilityScore === 0,
    "Paket B menghasilkan skor teknis murni (100%) tanpa tercampur skor employability",
    `Teknis: ${detailSub1.data.submission?.technicalScore}, Employability: ${detailSub1.data.submission?.employabilityScore}`
  );
  assert(
    detailSub2.data.submission?.employabilityScore > 0 && detailSub2.data.submission?.technicalScore === 0,
    "Paket C menghasilkan skor employability murni tanpa tercampur skor teknis",
    `Teknis: ${detailSub2.data.submission?.technicalScore}, Employability: ${detailSub2.data.submission?.employabilityScore}`
  );

  // Verifikasi Anti-Manipulasi Browser: Nilai totalScore kiriman browser 999 ditolak dan dihitung ulang di server
  const tamperAttempt = await apiRequest("/api/submissions", {
    method: "POST",
    headers: { Authorization: `Bearer ${siswa1Token}` },
    body: {
      id: `sub-tamper-${Date.now()}`,
      examId: examBReq.id,
      totalScore: 999, // Manipulasi!
      technicalScore: 999,
      questionSnapshot: [{ id: "fake-question", points: 999 }], // Manipulasi snapshot!
      allowRetake: true,
      attemptNumber: 2,
      answers: {
        "q-k3-01": { questionId: "q-k3-01", selectedOption: "SALAH_MUTLAK" }
      }
    }
  });
  assert(
    tamperAttempt.data.submission?.totalScore !== 999 && tamperAttempt.data.submission?.questionSnapshot?.[0]?.id !== "fake-question",
    "Server menolak manipulasi nilai browser (totalScore 999 dihitung ulang secara objektif dari database)",
    `Nilai tercatat di server: ${tamperAttempt.data.submission?.totalScore}`
  );

  // --------------------------------------------------------------------
  // Pengujian 8: Paket yang tidak ditemukan menghasilkan error yang jelas
  // --------------------------------------------------------------------
  console.log("\n--- UJI 8: Paket Tidak Ditemukan Menghasilkan Pesan Error yang Jelas ---");
  const examBrokenReq = {
    id: "ex-broken-package",
    title: "Ujian dengan Paket Fiktif",
    packageId: "pkg-tidak-ada-999",
    classId: "cls-1",
    className: "XII Kimia Analitik 1",
    schoolId: "sch-1",
    schoolName: "SMK Negeri 1 Surabaya",
    teacherId: "usr-guru-1",
    teacherName: "Drs. Budi Santoso, M.Pd.",
    scheduleDate: "2025-02-23",
    startTime: "08:00",
    endTime: "09:00",
    durationMinutes: 60,
    targetScore: 75,
    status: "berjalan",
    totalStudents: 30,
    completedStudents: 0
  };

  // Mencoba menjadwalkan paket yang tidak ada harus ditolak 400
  const brokenCreateRes = await apiRequest("/api/exams", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: examBrokenReq
  });
  assert(
    brokenCreateRes.status === 400,
    "Menjadwalkan ujian dengan paket fiktif ditolak HTTP 400",
    `Status: ${brokenCreateRes.status}`
  );
  assert(
    brokenCreateRes.data.error?.toLowerCase().includes("tidak ditemukan"),
    "Pesan error menyebutkan paket soal tidak ditemukan",
    `Pesan error: ${brokenCreateRes.data.error}`
  );

  // Mencoba membuka soal untuk ujian fiktif harus menghasilkan HTTP 404 yang jelas
  const brokenOpenRes = await apiRequest("/api/exams/ex-tidak-ada/questions", {
    headers: { Authorization: `Bearer ${siswa1Token}` }
  });
  assert(
    brokenOpenRes.status === 404,
    "Membuka soal ujian yang tidak ada menghasilkan HTTP 404",
    `Status: ${brokenOpenRes.status}`
  );
  assert(
    brokenOpenRes.data.error?.toLowerCase().includes("tidak ditemukan"),
    "Pesan error 404 jelas dan deskriptif",
    `Pesan error: ${brokenOpenRes.data.error}`
  );

  // --------------------------------------------------------------------
  // Pengujian 9: Paket baru buatan guru tetap tersedia setelah logout & login
  // --------------------------------------------------------------------
  console.log("\n--- UJI 9: Persistensi Paket Baru Buatan Guru Pasca Logout & Login ---");
  const NEW_CUSTOM_PACKAGE = {
    id: "pkg-guru-analisis-5",
    code: "PKG-ANA-05",
    title: "Paket Buatan Guru: Analisis Gravimetri Lanjutan",
    description: "Paket soal khusus dibuat oleh guru pengampu",
    category: "teknis_kimia",
    durationMinutes: 30,
    totalQuestions: 5,
    questions: Array.from({ length: 5 }, (_, idx) => ({
      id: `q-ana-${idx + 1}`,
      code: `ANA-${idx + 1}`,
      number: idx + 1,
      category: "teknis_kimia",
      topic: "Analisis Gravimetri",
      questionText: `Pertanyaan Gravimetri nomor ${idx + 1}`,
      type: "multiple_choice",
      options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      correctAnswer: "Pilihan A",
      points: 20,
      maxScore: 20
    })),
    isActive: true,
    version: 1,
    createdAt: "2025-02-25",
    createdBy: "Drs. Budi Santoso, M.Pd."
  };

  // Guru menyimpan paket
  const saveCustomRes = await apiRequest("/api/packages", {
    method: "POST",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: NEW_CUSTOM_PACKAGE
  });
  assert(saveCustomRes.ok, "Paket baru guru berhasil disimpan ke server");

  // Simulasi logout & login sesi baru
  const guruRelogin = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email: guruEmail, password: "password123" }
  });
  const guruNewSessionToken = guruRelogin.data.token || guruToken;

  // Ambil paket melalui sesi login baru
  const getPkgRes = await apiRequest(`/api/packages/${NEW_CUSTOM_PACKAGE.id}`, {
    headers: { Authorization: `Bearer ${guruNewSessionToken}` }
  });
  assert(getPkgRes.ok, "Paket baru dapat diambil kembali setelah login dengan sesi baru");
  assert(
    getPkgRes.data.package?.id === NEW_CUSTOM_PACKAGE.id && getPkgRes.data.package?.totalQuestions === 5,
    "Paket baru tetap utuh dengan 5 butir soal setelah login ulang",
    `Paket ID: ${getPkgRes.data.package?.id}, total: ${getPkgRes.data.package?.totalQuestions}`
  );

  // --------------------------------------------------------------------
  // Pengujian 10: Perubahan paket yang sudah dipakai tidak mengubah riwayat
  // --------------------------------------------------------------------
  console.log("\n--- UJI 10: Immutabilitas Riwayat Ujian Sebelumnya Pasca Perubahan Paket ---");
  // Guru mengedit Paket B (menambahkan 1 butir soal menjadi 11 butir soal)
  const modifiedPaketB = {
    ...PAKET_B_DEFINITION,
    totalQuestions: 11,
    questions: [
      ...PAKET_B_QUESTIONS_10,
      {
        id: "q-k3-11",
        code: "K3-11",
        number: 11,
        category: "teknis_kimia",
        topic: "K3LH Tambahan",
        questionText: "Pertanyaan tambahan baru setelah ujian selesai",
        type: "multiple_choice",
        options: ["Ya", "Tidak"],
        correctAnswer: "Ya",
        points: 5,
        maxScore: 5
      }
    ]
  };

  const updatePkgBRes = await apiRequest(`/api/packages/${modifiedPaketB.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${guruToken}` },
    body: modifiedPaketB
  });
  assert(updatePkgBRes.ok, "Paket B berhasil diperbarui menjadi 11 soal di master paket");

  // Periksa kembali submission Siswa 1 yang dikerjakan saat Paket B masih 10 soal
  const historicalSubCheck = await apiRequest(`/api/submissions/${sub1Id}`, {
    headers: { Authorization: `Bearer ${guruToken}` }
  });
  const subData = historicalSubCheck.data.submission;
  assert(
    subData && subData.totalScore === 100,
    "Skor riwayat ujian siswa tetap 100 dan tidak berubah",
    `Skor: ${subData?.totalScore}`
  );
  assert(
    subData && (!subData.questionSnapshot || subData.questionSnapshot.length === 10),
    "Snapshot butir soal pada submission historis tetap 10 butir (tidak bertambah ke 11)",
    `Snapshot length: ${subData?.questionSnapshot?.length}`
  );
  assert(
    subData && !subData.answers["q-k3-11"],
    "Tidak ada pencemaran soal q-k3-11 pada submission historis siswa",
    "Soal q-k3-11 ditemukan di submission lama"
  );

  console.log("\n======================================================================");
  console.log(`  HASIL AKHIR PENGUJIAN: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
