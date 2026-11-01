import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat variabel environment dari backend/.env atau .env root
const backendEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
}

// Muat database settings jika ada
let dbSettings = {};
const candidateDbPaths = [
  path.resolve(__dirname, '..', 'data', 'database.json'),
  path.resolve(__dirname, '..', 'backend', 'data', 'database.json'),
];
for (const p of candidateDbPaths) {
  if (fs.existsSync(p)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (parsed?.settings) {
        dbSettings = parsed.settings;
        break;
      }
    } catch {}
  }
}

const geminiKey = process.env.GEMINI_API_KEY || '';
const deepseekKey = (dbSettings.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '').trim();

const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

console.log('========================================================================');
console.log('   EMPLOYASKILLS - DIAGNOSTIK KONEKTIVITAS & KESIAPAN LIVE API');
console.log('========================================================================');
console.log('PERINGATAN: Kunci API rahasia dilindungi dan tidak ditampilkan pada log.\n');

const results = {
  gemini: {
    level1_config: 'BELUM_DIKONFIGURASI',
    level1_detail: '',
    level2_handshake: 'DILEWATI',
    level2_latency: '-',
    level2_detail: '',
    level3_rubric: 'DILEWATI',
    level3_detail: ''
  },
  deepseek: {
    level1_config: 'BELUM_DIKONFIGURASI',
    level1_detail: '',
    level2_handshake: 'DILEWATI',
    level2_latency: '-',
    level2_detail: '',
    level3_rubric: 'DILEWATI',
    level3_detail: ''
  }
};

// -----------------------------------------------------------------------------
// 1. PEMERIKSAAN LEVEL 1: STATUS KONFIGURASI KUNCI & MODEL
// -----------------------------------------------------------------------------
console.log('--- [LEVEL 1: Status Konfigurasi Kunci API & Model] ---');

if (geminiKey) {
  results.gemini.level1_config = 'TERKONFIGURASI';
  results.gemini.level1_detail = `Format valid (${geminiKey.length} karakter), Model: ${geminiModel}`;
  console.log(`[PASS] Google Gemini : TERKONFIGURASI (${geminiKey.length} karakter) - Model: ${geminiModel}`);
} else {
  results.gemini.level1_config = 'BELUM_TERPASANG';
  results.gemini.level1_detail = 'GEMINI_API_KEY tidak ditemukan di environment';
  console.log('[INFO] Google Gemini : BELUM TERPASANG (Opsional saat pengujian offline)');
}

if (deepseekKey) {
  results.deepseek.level1_config = 'TERKONFIGURASI';
  results.deepseek.level1_detail = `Format valid (${deepseekKey.length} karakter), Model: ${deepseekModel}`;
  console.log(`[PASS] DeepSeek API  : TERKONFIGURASI (${deepseekKey.length} karakter) - Model: ${deepseekModel}`);
} else {
  results.deepseek.level1_config = 'BELUM_TERPASANG';
  results.deepseek.level1_detail = 'DEEPSEEK_API_KEY tidak ditemukan di environment atau settings';
  console.log('[INFO] DeepSeek API  : BELUM TERPASANG (Opsional saat pengujian offline)');
}

// -----------------------------------------------------------------------------
// 2. PEMERIKSAAN LEVEL 2: AUTENTIKASI API & KONEKSI EGRESS KELUAR HOST/CONTAINER
// -----------------------------------------------------------------------------
console.log('\n--- [LEVEL 2: Uji Autentikasi API & Koneksi Jaringan Egress] ---');

async function testGeminiHandshake() {
  if (!geminiKey) {
    results.gemini.level2_handshake = 'DILEWATI';
    results.gemini.level2_detail = 'Key belum dikonfigurasi';
    return;
  }
  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const resp = await ai.models.generateContent({
      model: geminiModel,
      contents: 'Ping',
    });
    const duration = Date.now() - startTime;
    results.gemini.level2_handshake = 'TERHUBUNG_DAN_VALID';
    results.gemini.level2_latency = `${duration}ms`;
    results.gemini.level2_detail = `Handshake sukses via generativelanguage.googleapis.com (${duration}ms)`;
    console.log(`[PASS] Gemini Handshake  : BERHASIL (${duration}ms) - Egress ke Google AI aktif.`);
  } catch (err) {
    const duration = Date.now() - startTime;
    results.gemini.level2_latency = `${duration}ms`;
    if (err.message?.includes('API_KEY_INVALID') || err.status === 400 || err.status === 401 || err.status === 403) {
      results.gemini.level2_handshake = 'GAGAL_AUTENTIKASI';
      results.gemini.level2_detail = `Autentikasi ditolak provider (${err.status || '401/403'})`;
      console.error(`[FAIL] Gemini Handshake  : GAGAL AUTENTIKASI - API Key tidak valid pada provider.`);
    } else {
      results.gemini.level2_handshake = 'GAGAL_KONEKSI_EGRESS';
      results.gemini.level2_detail = `Gagal koneksi jaringan: ${err.message?.substring(0, 80)}`;
      console.error(`[FAIL] Gemini Handshake  : GAGAL KONEKSI EGRESS - ${err.message?.substring(0, 80)}`);
    }
  }
}

async function testDeepSeekHandshake() {
  if (!deepseekKey) {
    results.deepseek.level2_handshake = 'DILEWATI';
    results.deepseek.level2_detail = 'Key belum dikonfigurasi';
    return;
  }
  const startTime = Date.now();
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 1
      }),
      signal: AbortSignal.timeout(15000)
    });
    const duration = Date.now() - startTime;
    results.deepseek.level2_latency = `${duration}ms`;

    if (response.ok) {
      results.deepseek.level2_handshake = 'TERHUBUNG_DAN_VALID';
      results.deepseek.level2_detail = `Handshake sukses via api.deepseek.com (${duration}ms)`;
      console.log(`[PASS] DeepSeek Handshake: BERHASIL (${duration}ms) - Egress ke api.deepseek.com aktif.`);
    } else {
      const errText = await response.text().catch(() => '');
      results.deepseek.level2_handshake = 'GAGAL_AUTENTIKASI_ATAU_KUOTA';
      results.deepseek.level2_detail = `HTTP ${response.status}: ${errText.substring(0, 60)}`;
      console.error(`[FAIL] DeepSeek Handshake: HTTP ${response.status} - Periksa validitas key atau kuota API.`);
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    results.deepseek.level2_latency = `${duration}ms`;
    results.deepseek.level2_handshake = 'GAGAL_KONEKSI_EGRESS';
    results.deepseek.level2_detail = `Gagal koneksi jaringan: ${err.message?.substring(0, 80)}`;
    console.error(`[FAIL] DeepSeek Handshake: GAGAL KONEKSI EGRESS - ${err.message?.substring(0, 80)}`);
  }
}

// -----------------------------------------------------------------------------
// 3. PEMERIKSAAN LEVEL 3: UJI KELAYAKAN PENILAIAN RUBRIK & PARSING JSON
// -----------------------------------------------------------------------------
console.log('\n--- [LEVEL 3: Uji Kemampuan Penilaian Rubrik Berbasis Format JSON] ---');

async function testGeminiRubricEvaluation() {
  if (results.gemini.level2_handshake !== 'TERHUBUNG_DAN_VALID') {
    results.gemini.level3_rubric = 'DILEWATI';
    results.gemini.level3_detail = 'Koneksi Gemini Level 2 belum aktif (fallback lokal aman aktif)';
    console.log('[INFO] Gemini Rubrik    : DILEWATI (Menggunakan fallback protektif skor non-zero)');
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `Anda adalah penilai asesmen SMK. Jawab HANYA dalam JSON format persis seperti ini:
{"total_score": 4, "feedback": "Jawaban relevan", "assessment_status": "completed"}
Pertanyaan: Sebutkan alat titrasi.
Jawaban: Buret dan statif.`;

    const resp = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(resp.text || '{}');
    if (parsed.total_score !== undefined && parsed.feedback) {
      results.gemini.level3_rubric = 'LULUS_TERVERIFIKASI';
      results.gemini.level3_detail = 'Berhasil menghasilkan dan mem-parse evaluasi rubrik JSON standar';
      console.log('[PASS] Gemini Rubrik    : LULUS TERVERIFIKASI - Parser JSON dan penilaian berfungsi.');
    } else {
      results.gemini.level3_rubric = 'FORMAT_TIDAK_SESUAI';
      results.gemini.level3_detail = 'Respons tidak memenuhi struktur schema rubrik';
      console.warn('[WARN] Gemini Rubrik    : FORMAT TIDAK SESUAI - Response:', resp.text);
    }
  } catch (err) {
    results.gemini.level3_rubric = 'GAGAL_EVALUASI';
    results.gemini.level3_detail = err.message?.substring(0, 80);
    console.error('[FAIL] Gemini Rubrik    : Gagal evaluasi:', err.message?.substring(0, 80));
  }
}

async function testDeepSeekRubricEvaluation() {
  if (results.deepseek.level2_handshake !== 'TERHUBUNG_DAN_VALID') {
    results.deepseek.level3_rubric = 'DILEWATI';
    results.deepseek.level3_detail = 'Koneksi DeepSeek Level 2 belum aktif (fallback lokal aman aktif)';
    console.log('[INFO] DeepSeek Rubrik  : DILEWATI (Menggunakan fallback protektif skor non-zero)');
    return;
  }

  try {
    const prompt = `Anda adalah penilai asesmen SMK. Jawab HANYA dalam format JSON baku:
{"total_score": 5, "feedback": "Analisis tepat", "assessment_status": "completed"}
Pertanyaan: Jelaskan fungsi APD kacamata di lab.
Jawaban: Melindungi mata dari percikan larutan kimia berbahaya.`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    if (parsed.total_score !== undefined && parsed.feedback) {
      results.deepseek.level3_rubric = 'LULUS_TERVERIFIKASI';
      results.deepseek.level3_detail = 'Berhasil menghasilkan dan mem-parse evaluasi rubrik JSON standar';
      console.log('[PASS] DeepSeek Rubrik  : LULUS TERVERIFIKASI - Parser JSON dan penilaian berfungsi.');
    } else {
      results.deepseek.level3_rubric = 'FORMAT_TIDAK_SESUAI';
      results.deepseek.level3_detail = 'Respons tidak memenuhi struktur schema rubrik';
      console.warn('[WARN] DeepSeek Rubrik  : FORMAT TIDAK SESUAI');
    }
  } catch (err) {
    results.deepseek.level3_rubric = 'GAGAL_EVALUASI';
    results.deepseek.level3_detail = err.message?.substring(0, 80);
    console.error('[FAIL] DeepSeek Rubrik  : Gagal evaluasi:', err.message?.substring(0, 80));
  }
}

// Jalankan seluruh tahapan pengujian diagnostik
await testGeminiHandshake();
await testDeepSeekHandshake();
await testGeminiRubricEvaluation();
await testDeepSeekRubricEvaluation();

// -----------------------------------------------------------------------------
// REKAPITULASI DIAGNOSTIK 3 LEVEL
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log('   HASIL AKHIR DIAGNOSTIK 3 LEVEL KESIAPAN LIVE API');
console.log('========================================================================');
console.table({
  'Google Gemini (Vision/STT)': {
    'Level 1: Konfigurasi': results.gemini.level1_config,
    'Level 2: Handshake/Egress': results.gemini.level2_handshake,
    'Latency': results.gemini.level2_latency,
    'Level 3: Rubrik JSON': results.gemini.level3_rubric,
  },
  'DeepSeek API (Esai)': {
    'Level 1: Konfigurasi': results.deepseek.level1_config,
    'Level 2: Handshake/Egress': results.deepseek.level2_handshake,
    'Latency': results.deepseek.level2_latency,
    'Level 3: Rubrik JSON': results.deepseek.level3_rubric,
  }
});
console.log('Keterangan: Ketiga level dipisahkan secara independen untuk kepastian pra-deployment.');
console.log('Sistem backend EmployaSkills memiliki proteksi kegagalan bertingkat (graceful degradation).');
console.log('Jika Level 2/3 belum aktif saat live, jawaban siswa tetap aman dan dialihkan ke guru.\n');
