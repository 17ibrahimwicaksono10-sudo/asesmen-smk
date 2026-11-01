import assert from 'assert';
import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

console.log('================================================================');
console.log(' AUDIT KEAMANAN OTORISASI LINTAS SEKOLAH & LINTAS KELAS EMPLOYASKILLS');
console.log(` Target Server: ${BASE_URL}`);
console.log('================================================================\n');

async function login(email, password = 'password123') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runAudit() {
  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${desc}: ${err.message}`);
      failed++;
    }
  }

  // 1. ANONYMOUS ACCESS TEST
  console.log('--- 1. Uji Akses Pengguna Anonim (Tanpa Token) ---');
  await test('Anonim mengakses /api/bootstrap -> Tidak menerima data submission siswa', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.submissions.length, 0, 'Submissions harus kosong untuk pengguna anonim');
  });

  await test('Anonim mengakses /api/bootstrap -> Butir soal tersanitasi (tanpa correctAnswer & rubricGuide)', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`);
    const json = await res.json();
    const pkgs = json.data.packages || [];
    assert(pkgs.length > 0, 'Harus ada paket soal');
    for (const pkg of pkgs) {
      for (const q of pkg.questions || []) {
        assert.strictEqual(q.correctAnswer, undefined, `Bocor correctAnswer pada ${q.id}`);
        assert.strictEqual(q.rubricGuide, undefined, `Bocor rubricGuide pada ${q.id}`);
        assert.strictEqual(q.sampleAnswer, undefined, `Bocor sampleAnswer pada ${q.id}`);
        if (q.statements) {
          for (const s of q.statements) {
            assert.strictEqual(s.correctAnswer, undefined, `Bocor statement correctAnswer pada ${q.id}`);
          }
        }
        if (q.matchingColumnA) {
          for (const m of q.matchingColumnA) {
            assert.strictEqual(m.correctMatch, undefined, `Bocor matching correctMatch pada ${q.id}`);
          }
        }
      }
    }
  });

  await test('Anonim mengakses GET /api/submissions -> Ditolak 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/submissions`);
    assert.strictEqual(res.status, 401);
  });

  // 2. SISWA ACCESS ISOLATION TEST
  console.log('\n--- 2. Uji Isolasi Data Siswa ---');
  const siswa1 = await login('siswa1.test@smk.sch.id', 'password123');
  const siswa2 = await login('siswa2.test@smk.sch.id', 'password123');

  await test('Siswa 1 mengakses /api/bootstrap -> Hanya menerima submission miliknya sendiri', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`, {
      headers: { 'Authorization': `Bearer ${siswa1.token}` }
    });
    const json = await res.json();
    assert.strictEqual(json.success, true);
    const subs = json.data.submissions || [];
    for (const s of subs) {
      assert(
        s.studentId === siswa1.user.id || s.studentNis === siswa1.user.identityNo || s.studentEmail === siswa1.user.email,
        `Siswa 1 menerima submission siswa lain: ${s.studentName}`
      );
    }
  });

  await test('Siswa 1 mengakses /api/bootstrap -> Tidak menerima kunci jawaban atau rubrik rahasia', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`, {
      headers: { 'Authorization': `Bearer ${siswa1.token}` }
    });
    const json = await res.json();
    const pkgs = json.data.packages || [];
    for (const pkg of pkgs) {
      for (const q of pkg.questions || []) {
        assert.strictEqual(q.correctAnswer, undefined, `Bocor correctAnswer pada ${q.id}`);
        assert.strictEqual(q.rubricGuide, undefined, `Bocor rubricGuide pada ${q.id}`);
      }
    }
  });

  await test('Siswa 1 mengakses GET /api/submissions/:id milik Siswa 2 -> Ditolak 403 Forbidden', async () => {
    // Cari submission siswa 2
    const res2 = await fetch(`${BASE_URL}/api/bootstrap`, {
      headers: { 'Authorization': `Bearer ${siswa2.token}` }
    });
    const json2 = await res2.json();
    const sub2 = json2.data.submissions?.[0];
    if (sub2) {
      const attackRes = await fetch(`${BASE_URL}/api/submissions/${sub2.id}`, {
        headers: { 'Authorization': `Bearer ${siswa1.token}` }
      });
      assert.strictEqual(attackRes.status, 403);
    } else {
      console.log('    (Info: Siswa 2 belum ada submission di database, verifikasi hak akses endpoint siswa lain)');
      const attackRes = await fetch(`${BASE_URL}/api/submissions/sub-ex-test-paket-a-1793543786421-usr-reg-1793516544094`, {
        headers: { 'Authorization': `Bearer ${siswa2.token}` }
      });
      assert.strictEqual(attackRes.status, 403, 'Siswa 2 harus dilarang mengakses submission siswa 1');
    }
  });

  // 3. GURU CROSS-SCHOOL & CROSS-CLASS ISOLATION TEST
  console.log('\n--- 3. Uji Isolasi Guru Lintas Sekolah & Lintas Kelas ---');
  const guruSurabaya = await login('guru.kimia@smk.sch.id', 'password123');
  const guruCirebon = await login('nurul@smkn1cirebon.sch.id', 'password123').catch(() => null);

  await test('Guru SMKN 1 Surabaya mengakses /api/bootstrap -> Hanya melihat berkas SMKN 1 Surabaya', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`, {
      headers: { 'Authorization': `Bearer ${guruSurabaya.token}` }
    });
    const json = await res.json();
    assert.strictEqual(json.success, true);
    const subs = json.data.submissions || [];
    for (const s of subs) {
      if (s.schoolName) {
        assert(
          s.schoolName.toLowerCase().includes('surabaya'),
          `Bocor berkas sekolah lain ke Guru Surabaya: ${s.schoolName} (${s.studentName})`
        );
      }
    }
  });

  if (guruCirebon) {
    await test('Guru SMKN 1 Cirebon mengakses /api/bootstrap -> Tidak bocor berkas siswa SMKN 1 Surabaya', async () => {
      const res = await fetch(`${BASE_URL}/api/bootstrap`, {
        headers: { 'Authorization': `Bearer ${guruCirebon.token}` }
      });
      const json = await res.json();
      assert.strictEqual(json.success, true);
      const subs = json.data.submissions || [];
      for (const s of subs) {
        if (s.schoolName) {
          assert(
            !s.schoolName.toLowerCase().includes('surabaya'),
            `Bocor berkas siswa Surabaya ke Guru Cirebon: ${s.schoolName}`
          );
        }
      }
    });

    await test('Guru SMKN 1 Cirebon mengakses GET /api/submissions/:id milik siswa Surabaya -> Ditolak 403 Forbidden', async () => {
      const surabayaSubId = 'sub-ex-test-paket-a-1793543786421-usr-reg-1793516544094';
      const crossRes = await fetch(`${BASE_URL}/api/submissions/${surabayaSubId}`, {
        headers: { 'Authorization': `Bearer ${guruCirebon.token}` }
      });
      assert.strictEqual(crossRes.status, 403, 'Akses lintas sekolah harus ditolak 403 Forbidden');
    });
  }

  // 4. ADMIN FULL ACCESS TEST
  console.log('\n--- 4. Uji Hak Akses Administrator ---');
  const admin = await login('admin@app.com', 'password');
  await test('Admin mengakses /api/bootstrap -> Berhak mengakses seluruh data ujian', async () => {
    const res = await fetch(`${BASE_URL}/api/bootstrap`, {
      headers: { 'Authorization': `Bearer ${admin.token}` }
    });
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(Array.isArray(json.data.submissions), 'Admin harus menerima daftar submissions');
    assert(Array.isArray(json.data.packages), 'Admin harus menerima paket');
    assert(Array.isArray(json.data.schools), 'Admin harus menerima sekolah');
  });

  console.log('\n================================================================');
  console.log(` HASIL AUDIT KEAMANAN: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
