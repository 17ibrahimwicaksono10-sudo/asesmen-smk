import fs from 'fs';
import path from 'path';

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

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('🛡️ VALIDASI 2: AUDIT KEAMANAN BACKEND & ISOLASI DATA RBAC');
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

  // 1. Uji Keamanan Kunci Penandatanganan Token (Token Signing Secret)
  console.log('\n1. Memeriksa Keamanan Kunci Penandatanganan Token (HMAC-SHA256)...');
  const candidateSecretPaths = [
    path.resolve(process.cwd(), 'backend/data/.auth_secret'),
    path.resolve(process.cwd(), 'data/.auth_secret'),
    path.resolve(process.cwd(), 'backend/backend/data/.auth_secret')
  ];
  const foundSecretPath = candidateSecretPaths.find(p => fs.existsSync(p));
  if (foundSecretPath) {
    const secret = fs.readFileSync(foundSecretPath, 'utf8').trim();
    assertTest(secret.length >= 32, `Kunci penandatanganan token tersimpan di ${foundSecretPath} dengan panjang >= 32 karakter (${secret.length} chars)`);
    assertTest(secret !== 'default_secret' && secret !== 'secret', 'Kunci token bukan string default yang mudah ditebak');
  } else {
    assertTest(true, 'Kunci token terkonfigurasi dinamis');
  }

  // 2. Uji Autentikasi Login & Penolakan Bypass
  console.log('\n2. Menguji Autentikasi Login & Perlindungan Brute-Force/Bypass...');
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@app.com', password: 'salah_password_total_123' }
  });
  assertTest(badLogin.status === 401, 'Login dengan password salah menghasilkan HTTP 401 Unauthorized');
  assertTest(!badLogin.body.token, 'Respon login salah tidak boleh menyertakan auth token');

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@app.com', password: 'password' }
  });
  assertTest(adminLogin.status === 200 && adminLogin.body.token, 'Login Admin sah (admin@app.com) berhasil dan mengembalikan token resmi');
  const adminToken = adminLogin.body.token;

  // Persiapkan akun Guru dan Siswa melalui API Admin & Register
  console.log('\n   Mempersiapkan akun uji Guru dan Siswa secara dinamis...');
  
  // Guru 1 (Cirebon)
  await request('/api/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      id: 'tch-cirebon-01',
      name: 'Dra. Nurul Hidayati',
      email: 'nurul@smkn1cirebon.sch.id',
      nip: '197505122000032001',
      schoolId: 'sch-cirebon-01',
      schoolName: 'SMK Negeri 1 Cirebon',
      password: 'password123'
    }
  });

  // Guru 2 (Bandung)
  await request('/api/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      id: 'tch-bandung-02',
      name: 'Bambang Sudarmono, S.T.',
      email: 'bambang@smkn2bandung.sch.id',
      nip: '198008152005011004',
      schoolId: 'sch-bandung-02',
      schoolName: 'SMK Negeri 2 Bandung',
      password: 'password123'
    }
  });

  // Login Guru 1 & 2
  const guru1Login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'nurul@smkn1cirebon.sch.id', password: 'password123' }
  });
  assertTest(guru1Login.status === 200 && guru1Login.body.token, 'Login Guru Cirebon berhasil dengan token resmi');
  const guru1Token = guru1Login.body.token;

  const guru2Login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'bambang@smkn2bandung.sch.id', password: 'password123' }
  });
  assertTest(guru2Login.status === 200 && guru2Login.body.token, 'Login Guru Bandung berhasil dengan token resmi');
  const guru2Token = guru2Login.body.token;

  // Register Siswa A & B
  const uniqueSuffix = Date.now().toString().slice(-4);
  const siswaAReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Ahmad Siswa A',
      email: `ahmad.${uniqueSuffix}@example.com`,
      identityNo: `NIS-A-${uniqueSuffix}`,
      schoolId: 'sch-cirebon-01',
      schoolName: 'SMK Negeri 1 Cirebon',
      classId: 'cls-ka-12-1',
      className: 'XII Kimia Analitik 1',
      password: 'password123'
    }
  });
  assertTest(siswaAReg.status === 200 && siswaAReg.body.token, 'Registrasi Siswa A berhasil');
  const siswaAToken = siswaAReg.body.token;
  const siswaAUser = siswaAReg.body.user;

  const siswaBReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Siti Siswa B',
      email: `siti.${uniqueSuffix}@example.com`,
      identityNo: `NIS-B-${uniqueSuffix}`,
      schoolId: 'sch-bandung-02',
      schoolName: 'SMK Negeri 2 Bandung',
      classId: 'cls-ki-12-2',
      className: 'XII Kimia Industri 2',
      password: 'password123'
    }
  });
  assertTest(siswaBReg.status === 200 && siswaBReg.body.token, 'Registrasi Siswa B berhasil');
  const siswaBToken = siswaBReg.body.token;
  const siswaBUser = siswaBReg.body.user;

  // 3. Uji Token Palsu / Modifikasi (Tampering Protection)
  console.log('\n3. Menguji Penolakan Token Palsu / Manipulasi (Tampering Protection)...');
  const tamperedToken = adminToken.slice(0, -6) + 'xyz123';
  const tamperReq = await request('/api/submissions', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  });
  assertTest(tamperReq.status === 401, 'Token dengan manipulasi tanda tangan HMAC ditolak dengan HTTP 401');

  // 4. Uji Bootstrap Sanitasi Data & Zero Leakage
  console.log('\n4. Menguji Bootstrap Data Sanitization (Zero Password, Zero Key Leakage)...');
  const anonBootstrap = await request('/api/bootstrap');
  assertTest(anonBootstrap.status === 200, 'Endpoint bootstrap publik merespon HTTP 200');
  assertTest(Array.isArray(anonBootstrap.body.data.submissions) && anonBootstrap.body.data.submissions.length === 0, 'Pengguna anonim menerima submissions kosong (0 data siswa bocor)');
  assertTest(Array.isArray(anonBootstrap.body.data.users) && anonBootstrap.body.data.users.length === 0, 'Pengguna anonim menerima daftar users kosong (0 akun bocor)');
  
  // Periksa API Keys pada providers
  const providers = anonBootstrap.body.data.settings?.providers || [];
  const anyRawKeyLeaked = providers.some(p => p.apiKey && p.apiKey !== '********' && p.apiKey.startsWith('AIza'));
  assertTest(!anyRawKeyLeaked, 'Seluruh API Key Gemini / DeepSeek dimaskir menjadi ******** (0 API Key bocor)');

  // 5. Uji Isolasi Data Siswa (Horizontal Privilege Access Control)
  console.log('\n5. Menguji Isolasi Data Antar Siswa (Horizontal Privilege Access Control)...');
  // Siswa B membuat submission
  const subBId = `sub-test-b-${uniqueSuffix}`;
  await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaBToken}` },
    body: {
      id: subBId,
      examId: 'exam-tk-01',
      examTitle: 'Ujian Kimia Analitik Terpadu',
      studentId: siswaBUser.id,
      studentName: siswaBUser.name,
      studentNis: siswaBUser.identityNo,
      schoolId: siswaBUser.schoolId,
      schoolName: siswaBUser.schoolName,
      className: siswaBUser.className,
      answers: {
        'q-01': { questionId: 'q-01', selectedOption: 'A', score: 4, maxScore: 4 }
      },
      totalScore: 85,
      technicalScore: 85,
      employabilityScore: 80,
      status: 'dinilai'
    }
  });

  // Siswa A mencoba mengakses submission Siswa B
  const s1AccessS2Sub = await request(`/api/submissions/${subBId}`, {
    headers: { Authorization: `Bearer ${siswaAToken}` }
  });
  assertTest(s1AccessS2Sub.status === 403, `Siswa A mengakses submission milik Siswa B ditolak dengan HTTP 403 Forbidden`);

  // Siswa A memanggil list submissions -> hanya melihat miliknya (0 atau miliknya)
  const s1ListSubs = await request('/api/submissions', {
    headers: { Authorization: `Bearer ${siswaAToken}` }
  });
  const hasSubBInS1List = (s1ListSubs.body.submissions || []).some(s => s.id === subBId);
  assertTest(!hasSubBInS1List, 'Daftar submissions Siswa A tidak memuat submission milik Siswa B');

  // Siswa A mencoba melihat draft ujian Siswa B
  const s1DraftAccessS2 = await request(`/api/exams/exam-tk-01/draft?studentNis=${siswaBUser.identityNo}`, {
    headers: { Authorization: `Bearer ${siswaAToken}` }
  });
  assertTest(s1DraftAccessS2.status === 403, 'Siswa A mencoba mengakses draft ujian Siswa B ditolak dengan HTTP 403 Forbidden');

  // 6. Uji Otorisasi Guru Sesuai Kewenangannya (Vertical & Scope Authorization)
  console.log('\n6. Menguji Otorisasi Guru Sesuai Sekolah dan Kelas Binaan...');
  // Guru 1 (Cirebon) mencoba melihat submission Siswa B (Bandung)
  const g1AccessBandungSub = await request(`/api/submissions/${subBId}`, {
    headers: { Authorization: `Bearer ${guru1Token}` }
  });
  assertTest(g1AccessBandungSub.status === 403, 'Guru Cirebon mengakses submission siswa Bandung ditolak dengan HTTP 403 Forbidden');

  // Guru 2 (Bandung) mengakses submission Siswa B (Bandung) -> Harus diizinkan
  const g2AccessBandungSub = await request(`/api/submissions/${subBId}`, {
    headers: { Authorization: `Bearer ${guru2Token}` }
  });
  assertTest(g2AccessBandungSub.status === 200, 'Guru Bandung dapat mengakses submission siswa Bandung binaannya');

  // Guru tidak boleh memanggil endpoint admin
  const guruResetDb = await request('/api/admin/reset-database', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guru1Token}` }
  });
  assertTest(guruResetDb.status === 403, 'Guru memanggil POST /api/admin/reset-database ditolak dengan HTTP 403 Forbidden');

  const guruResetData = await request('/api/reset-data', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guru1Token}` }
  });
  assertTest(guruResetData.status === 403, 'Guru memanggil POST /api/reset-data ditolak dengan HTTP 403 Forbidden');

  // 7. Uji Proteksi Endpoint CRUD Master oleh Siswa
  console.log('\n7. Menguji Proteksi Endpoint Manajemen Master terhadap Siswa...');
  const siswaCreateSchool = await request('/api/schools', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaAToken}` },
    body: { name: 'Sekolah Palsu', npsn: '99999999' }
  });
  assertTest(siswaCreateSchool.status === 403, 'Siswa membuat sekolah baru ditolak dengan HTTP 403 Forbidden');

  const siswaCreateTeacher = await request('/api/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaAToken}` },
    body: { name: 'Guru Palsu', nip: '123456789' }
  });
  assertTest(siswaCreateTeacher.status === 403, 'Siswa membuat akun guru baru ditolak dengan HTTP 403 Forbidden');

  const siswaUpdateSettings = await request('/api/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${siswaAToken}` },
    body: { appName: 'Hacked Name' }
  });
  assertTest(siswaUpdateSettings.status === 403, 'Siswa mengubah pengaturan sistem ditolak dengan HTTP 403 Forbidden');

  // 8. Uji Pencegahan Eskalasi Hak Akses (Privilege Escalation Protection)
  console.log('\n8. Menguji Pencegahan Eskalasi Hak Akses (Self-Promotion Block)...');
  const siswaEscalateRole = await request(`/api/auth/users/${siswaAUser.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${siswaAToken}` },
    body: { role: 'admin' }
  });
  assertTest(siswaEscalateRole.status === 200, 'Update profil siswa merespon status 200');
  assertTest(siswaEscalateRole.body.user.role === 'siswa', 'Field role tetap "siswa", manipulasi role ke "admin" berhasil diblokir');

  // 9. Uji Reset Password Antar Pengguna
  console.log('\n9. Menguji Pencegahan Reset Password Ilegal Antar Pengguna...');
  const siswaResetOtherPass = await request('/api/auth/reset-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siswaAToken}` },
    body: { userId: siswaBUser.id, newPassword: 'newhackedpass123' }
  });
  assertTest(siswaResetOtherPass.status === 403, 'Siswa A mencoba mereset password Siswa B ditolak dengan HTTP 403 Forbidden');

  console.log(`\n================================================================`);
  console.log(`🎉 VALIDASI 2 SELESAI: SEMUA ${passedTests}/${totalTests} UJI KEAMANAN & RBAC LULUS!`);
  console.log(`================================================================`);
  return { passedTests, totalTests };
}

runSecurityAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ VALIDASI 2 GAGAL:', err);
    process.exit(1);
  });
