import fs from 'fs';

async function testBootstrap(name, token) {
  const t0 = performance.now();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('http://localhost:5000/api/bootstrap', { headers });
  const text = await res.text();
  const durationMs = Math.round(performance.now() - t0);
  const sizeKb = Math.round(Buffer.byteLength(text, 'utf8') / 1024);
  const json = JSON.parse(text);

  console.log(`\n=== [${name}] ===`);
  console.log(`Status: ${res.status} ${res.statusText}`);
  console.log(`Duration: ${durationMs} ms`);
  console.log(`Payload Size: ${sizeKb} KB`);
  console.log(`Schools count: ${json.data?.schools?.length || 0}`);
  console.log(`Classes count: ${json.data?.classes?.length || 0}`);
  console.log(`Exams count: ${json.data?.exams?.length || 0}`);
  const hasExamSnapshot = json.data?.exams?.some(e => e.questionSnapshot && e.questionSnapshot.length > 0);
  console.log(`Any exam has questionSnapshot? ${hasExamSnapshot ? 'YES (BAD)' : 'NO (GOOD - Lightweight)'}`);
  console.log(`Submissions count: ${json.data?.submissions?.length || 0}`);
  const hasAnswers = json.data?.submissions?.some(s => s.answers && Object.keys(s.answers).length > 0);
  console.log(`Any submission has answers? ${hasAnswers}`);
  
  return { durationMs, sizeKb, json };
}

async function login(email, password) {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function main() {
  console.log('Testing /api/bootstrap performance across roles...');

  // 1. Unauthenticated (Publik / Anonymous)
  await testBootstrap('1. ANONYMOUS / UNREGISTERED', null);

  // 2. Admin
  const adminToken = await login('admin@app.com', 'password');
  await testBootstrap('2. ADMIN (Ibrahim Wicaksono)', adminToken);

  // 3. Guru
  const guruToken = await login('guru.kimia@smk.sch.id', 'password123');
  await testBootstrap('3. GURU (Drs. Budi Santoso, M.Pd.)', guruToken);

  // 4. Siswa
  const siswaToken = await login('siswa1.test@smk.sch.id', 'password123');
  const siswaRes = await testBootstrap('4. SISWA (Ahmad Rizki)', siswaToken);
  console.log(`Siswa submissions received: ${siswaRes.json.data?.submissions?.length}`);
  if (siswaRes.json.data?.submissions?.length > 0) {
    console.log(`Siswa own submission has answers: ${Boolean(siswaRes.json.data.submissions[0].answers)} (Expected: true for student self-inspection)`);
  }

  // 5. Check submission detail on demand for Guru/Admin
  console.log('\n=== [5. ON-DEMAND SUBMISSION DETAIL TEST] ===');
  const t0Detail = performance.now();
  const subId = 'sub-std2-1793569027760';
  const subDetailRes = await fetch(`http://localhost:5000/api/submissions/${subId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const subDetailText = await subDetailRes.text();
  const durDetail = Math.round(performance.now() - t0Detail);
  const subDetailJson = JSON.parse(subDetailText);
  console.log(`GET /api/submissions/${subId}: ${subDetailRes.status} in ${durDetail} ms, size: ${Math.round(Buffer.byteLength(subDetailText) / 1024)} KB`);
  console.log(`Detail has answers: ${Boolean(subDetailJson.submission?.answers)} (Keys count: ${Object.keys(subDetailJson.submission?.answers || {}).length})`);

  console.log('\nAll performance checks completed successfully.');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
