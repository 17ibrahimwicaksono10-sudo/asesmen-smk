const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, headers: res.headers, body: json };
}

async function runFrontendBackendIntegrationTest() {
  console.log('================================================================');
  console.log('🌐 VALIDASI 5: INTEGRASI FRONTEND-BACKEND & KELAYAKAN SISTEM');
  console.log('================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition, name) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ [LULUS] ${name}`);
      passedTests++;
    } else {
      console.error(`   ❌ [GAGAL] ${name}`);
      throw new Error(`Test Failed: ${name}`);
    }
  }

  // 1. Uji Login 3 Peran (Admin, Guru, Siswa)
  console.log('\n1. Menguji Autentikasi Frontend-Backend untuk 3 Peran Pengguna...');
  // Admin Login
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@app.com', password: 'password' }
  });
  assertTest(adminLogin.status === 200 && adminLogin.body.token, 'Login Admin berhasil dengan Bearer Token');
  const adminToken = adminLogin.body.token;
  const adminUser = adminLogin.body.user;
  assertTest(adminUser.role === 'admin', 'Identitas role Admin terkonfirmasi');

  // Guru Login
  const guruLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'nurul@smkn1cirebon.sch.id', password: 'password123' }
  });
  assertTest(guruLogin.status === 200 && guruLogin.body.token, 'Login Guru berhasil dengan Bearer Token');
  const guruToken = guruLogin.body.token;
  const guruUser = guruLogin.body.user;
  assertTest(guruUser.role === 'guru', 'Identitas role Guru terkonfirmasi');

  // Siswa Registration & Login
  const testSuffix = Date.now().toString().slice(-4);
  const siswaReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Siswa Integrasi ${testSuffix}`,
      email: `siswa.int.${testSuffix}@example.com`,
      identityNo: `NIS-INT-${testSuffix}`,
      schoolId: 'sch-cirebon-01',
      schoolName: 'SMK Negeri 1 Cirebon',
      classId: 'cls-ka-12-1',
      className: 'XII Kimia Analitik 1',
      password: 'password123'
    }
  });
  assertTest(siswaReg.status === 200 && siswaReg.body.token, 'Registrasi Siswa berhasil');
  const siswaToken = siswaReg.body.token;
  const siswaUser = siswaReg.body.user;
  assertTest(siswaUser.role === 'siswa', 'Identitas role Siswa terkonfirmasi');

  // 2. Uji Dashboard Summary untuk Masing-Masing Peran
  console.log('\n2. Menguji Kompatibilitas Endpoint Dashboard (/api/dashboard/summary)...');
  const adminDash = await request('/api/dashboard/summary', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assertTest(adminDash.status === 200 && adminDash.body.success, 'Dashboard Summary Admin merespon HTTP 200');
  assertTest(adminDash.body.summary.totalSchools !== undefined, 'Statistik total sekolah tersedia di dashboard admin');
  assertTest(adminDash.body.summary.totalTeachers !== undefined, 'Statistik total guru tersedia di dashboard admin');

  const guruDash = await request('/api/dashboard/summary', {
    headers: { Authorization: `Bearer ${guruToken}` }
  });
  assertTest(guruDash.status === 200 && guruDash.body.success, 'Dashboard Summary Guru merespon HTTP 200');
  assertTest(guruDash.body.summary.totalStudents !== undefined, 'Statistik siswa binaan guru tersedia');

  const siswaDash = await request('/api/dashboard/summary', {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  assertTest(siswaDash.status === 200 && siswaDash.body.success, 'Dashboard Summary Siswa merespon HTTP 200');
  assertTest(siswaDash.body.summary.myExamsCount !== undefined, 'Statistik ujian siswa tersedia di dashboard siswa');

  // 3. Uji Daftar Ujian & Monitoring
  console.log('\n3. Menguji Kompatibilitas Daftar Ujian & Monitoring (/api/exams)...');
  const examsList = await request('/api/exams', {
    headers: { Authorization: `Bearer ${siswaToken}` }
  });
  assertTest(examsList.status === 200 && examsList.body.success, 'Daftar ujian merespon HTTP 200');
  assertTest(Array.isArray(examsList.body.exams), 'Daftar ujian berbentuk array valid');

  const monitorExams = await request('/api/exams', {
    headers: { Authorization: `Bearer ${guruToken}` }
  });
  assertTest(monitorExams.status === 200 && Array.isArray(monitorExams.body.exams), 'Monitoring ujian oleh Guru dapat diakses dengan baik');

  // 4. Uji Monitoring Penilaian AI (Grading Queue)
  console.log('\n4. Menguji Monitoring Antrian Penilaian AI (/api/ai/grading-queue)...');
  const gradingQueue = await request('/api/ai/grading-queue', {
    headers: { Authorization: `Bearer ${guruToken}` }
  });
  assertTest(gradingQueue.status === 200 && gradingQueue.body.success, 'Antrian penilaian AI merespon HTTP 200');
  assertTest(Array.isArray(gradingQueue.body.queue), 'Daftar antrian penilaian AI terformat rapi');

  // 5. Uji Validasi Penilaian Guru terhadap Hasil Ujian Siswa
  console.log('\n5. Menguji Alur Validasi Penilaian oleh Guru (/api/submissions/:id)...');
  // Siswa membuat 1 submission
  const subId = `sub-int-${testSuffix}`;
  await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaToken}` },
    body: {
      id: subId,
      examId: 'exam-tk-01',
      examTitle: 'Ujian Kimia Analitik Terpadu',
      studentId: siswaUser.id,
      studentName: siswaUser.name,
      studentNis: siswaUser.identityNo,
      schoolId: siswaUser.schoolId,
      schoolName: siswaUser.schoolName,
      className: siswaUser.className,
      answers: {
        'q-01': { questionId: 'q-01', selectedOption: 'B', score: 4, maxScore: 4 },
        'q-10': { questionId: 'q-10', essayAnswer: 'Prosedur titrasi...', score: 18, maxScore: 20 }
      },
      totalScore: 82,
      technicalScore: 82,
      employabilityScore: 80,
      status: 'perlu_pemeriksaan'
    }
  });

  // Guru memvalidasi dan merevisi nilai
  const teacherReviewRes = await request(`/api/submissions/${subId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${guruToken}` },
    body: {
      status: 'dinilai',
      validationStatus: 'approved',
      validatedBy: guruUser.name,
      teacherScoreTotal: 85,
      teacherFollowUp: 'Hasil kerja sudah memenuhi standar SOP laboratorium SMK Negeri 1 Cirebon.'
    }
  });
  assertTest(teacherReviewRes.status === 200 && teacherReviewRes.body.success, 'Guru berhasil memvalidasi dan mengonfirmasi nilai ujian siswa');
  assertTest(teacherReviewRes.body.submission.teacherScoreTotal === 85, 'Skor akhir guru (85) tersimpan secara persisten');

  // 6. Uji Hasil Asesmen & Analitika Riset Tesis (Psychometric & Agreement Metrics)
  console.log('\n6. Menguji Analitika Hasil Asesmen Riset (/api/research/analytics)...');
  const analyticsRes = await request('/api/research/analytics');
  assertTest(analyticsRes.status === 200 && analyticsRes.body.success, 'Endpoint analitika riset merespon HTTP 200');
  const analytics = analyticsRes.body.analytics;
  assertTest(analytics.weightedCohensKappa !== undefined, 'Metrik reliabilitas Weighted Cohen Kappa dihitung valid');
  assertTest(analytics.iccScore !== undefined, 'Metrik kesepakatan penilai ICC (Intraclass Correlation) dihitung valid');
  assertTest(analytics.maeScore !== undefined && analytics.rmseScore !== undefined, 'Metrik akurasi MAE dan RMSE tersedia');

  const exportDatasetRes = await request('/api/research/export-dataset');
  assertTest(exportDatasetRes.status === 200 && exportDatasetRes.body.success, 'Ekspor dataset riset anonim merespon HTTP 200');
  assertTest(Array.isArray(exportDatasetRes.body.dataset), 'Dataset riset teranonimkan berhasil diekspor');

  console.log(`\n================================================================`);
  console.log(`🎉 VALIDASI 5 SELESAI: SEMUA ${passedTests}/${totalTests} INTEGRASI FRONTEND-BACKEND LULUS!`);
  console.log(`================================================================`);
  return { passedTests, totalTests };
}

runFrontendBackendIntegrationTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ VALIDASI 5 GAGAL:', err);
    process.exit(1);
  });
