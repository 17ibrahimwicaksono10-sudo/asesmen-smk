/**
 * DIAGNOSTIK LIVE GEMINI API DARI VPS (ZERO CREDENTIAL LEAKAGE)
 * 
 * Skrip ini dirancang untuk dijalankan langsung pada VPS (Tencent Cloud Jakarta)
 * untuk memverifikasi ketersediaan dan kebijakan geolokasi Google AI Studio
 * terhadap model gemini-3.5-flash-lite dan gemini-3.1-flash-lite.
 * 
 * KEAMANAN:
 * - API Key tidak pernah dicetak utuh ke terminal, stdout, atau file log.
 * - Masking wajib: AIzaSy****************XXXX
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Muat variabel lingkungan
const envPaths = [
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve('/home/ubuntu/Prototype/backend/.env'),
  path.resolve('/home/ubuntu/Prototype/.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    break;
  }
}

const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();

function maskApiKey(key) {
  if (!key) return '[TIDAK TERPASANG]';
  if (key.length <= 10) return '***';
  return key.substring(0, 6) + '****************' + key.substring(key.length - 4);
}

console.log('================================================================');
console.log('🔍 DIAGNOSTIK LIVE GEMINI API (VPS TENCENT CLOUD JAKARTA)');
console.log('================================================================');
console.log(` Status API Key   : ${maskApiKey(rawApiKey)} (${rawApiKey.length} karakter)`);
console.log(` Model Utama      : gemini-3.5-flash-lite`);
console.log(` Model Fallback   : gemini-3.1-flash-lite`);
console.log('----------------------------------------------------------------\n');

if (!rawApiKey || rawApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('❌ GEMINI_API_KEY belum dikonfigurasi pada file .env.');
  console.log('   Silakan isi GEMINI_API_KEY pada backend/.env sebelum menjalankan diagnostik ini.');
  process.exit(1);
}

const MODELS_TO_DIAGNOSE = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash'
];

async function testModelDiagnostic(modelName) {
  console.log(`\n▶ Menguji Akses Model: [${modelName}]`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${rawApiKey}`;

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Halo Google, jawab singkat JSON: {"status": "aktif", "model": "' + modelName + '"}' }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    const duration = Date.now() - startTime;
    console.log(`   HTTP Status : ${res.status} ${res.statusText} (${duration} ms)`);

    if (res.ok) {
      const data = await res.json();
      const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`   ✅ Respons Valid: ${output?.trim()}`);
      return { success: true, status: res.status, duration, error: null };
    } else {
      const errText = await res.text();
      let parsedErr = {};
      try { parsedErr = JSON.parse(errText); } catch {}
      const errMsg = parsedErr.error?.message || errText;
      console.log(`   ❌ Respons Error: HTTP ${res.status} - ${errMsg}`);

      if (errMsg.includes('FAILED_PRECONDITION') || errMsg.includes('User location is not supported')) {
        console.log('   🚨 GEOLOKASI: Google AI Studio menolak akses dari IP VPS (Tencent Cloud Jakarta).');
        console.log('      Penyebab: IP data center sering kali belum masuk dalam whitelist consumer API.');
      } else if (res.status === 404) {
        console.log(`   ℹ️ Model ${modelName} belum tersedia atau nama endpoint berbeda.`);
      }

      return { success: false, status: res.status, duration, error: errMsg };
    }
  } catch (netErr) {
    console.log(`   ❌ Exception Jaringan: ${netErr.message}`);
    return { success: false, status: 0, duration: 0, error: netErr.message };
  }
}

async function testSyntheticOCR(modelName) {
  console.log(`\n▶ Menguji Ekstraksi OCR Bukti Gambar Sintetis: [${modelName}]`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${rawApiKey}`;
  // 1x1 transparent PNG
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/png', data: samplePngBase64 } },
              { text: 'Anda adalah OCR Vokasi. Jawab JSON: {"extracted_text": "Teks terbaca", "is_readable": true}' }
            ]
          }
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ Ekstraksi OCR Gambar Berhasil: ${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`);
    } else {
      const errText = await res.text();
      console.log(`   ❌ OCR Gagal (HTTP ${res.status}): ${errText}`);
    }
  } catch (err) {
    console.log(`   ❌ Exception OCR: ${err.message}`);
  }
}

async function runAllDiagnostics() {
  const results = {};
  for (const m of MODELS_TO_DIAGNOSE) {
    results[m] = await testModelDiagnostic(m);
  }

  // Uji OCR dengan model utama
  await testSyntheticOCR('gemini-3.5-flash-lite');

  console.log('\n================================================================');
  console.log('📊 RANGKUMAN DIAGNOSTIK & KEPATUHAN PRODUKSI:');
  console.log('================================================================');
  for (const [m, r] of Object.entries(results)) {
    console.log(` • ${m.padEnd(25)}: ${r.success ? '✅ BERHASIL (' + r.duration + 'ms)' : '❌ GAGAL (HTTP ' + r.status + ')'}`);
  }

  console.log(`
🛡️ ANALISIS KEBIJAKAN PRIVASI SISWA (< 18 TAHUN) & INTEGRITAS AI:
1. Integritas Penilaian:
   - Jika endpoint consumer Google AI Studio menghasilkan FAILED_PRECONDITION (User location is not supported),
     sistem EmployaSkills secara otomatis menandai lembar jawaban dengan status:
     "perlu_review_guru" (requires_teacher_review: true).
   - Sistem EmployaSkills TIDAK PERNAH menghasilkan skor AI palsu / fiktif.

2. Pemisahan Peran & Privasi:
   - DeepSeek API (berbayar) digunakan secara eksklusif untuk mengevaluasi jawaban esai teks sesuai rubrik.
   - Gemini HANYA difungsikan untuk OCR pembaca tulisan tangan dan STT transkripsi audio.
   - Hasil ekstraksi kemudian diteruskan ke DeepSeek untuk dinilai secara objektif.

3. Solusi Akses VPS jika Google AI Studio Membatasi Lokasi:
   - Menggunakan Google Cloud Vertex AI (Enterprise endpoint di region asia-southeast1 / Jakarta)
     atau proxy resmi agar tidak terhalang pembatasan lokasi consumer API.
  `);
}

runAllDiagnostics().catch(console.error);
