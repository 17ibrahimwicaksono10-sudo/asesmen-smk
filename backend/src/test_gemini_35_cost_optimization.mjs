import assert from 'assert';
import http from 'http';
import { getGeminiConfig, DEFAULT_GEMINI_PRIMARY_MODEL, DEFAULT_GEMINI_FALLBACK_MODEL } from './aiConfig.ts';
import { evaluateImageWithGeminiVision, evaluateAudioWithGeminiSTTAndDeepSeek, evaluateTypedEssayWithDeepSeek } from './aiEvaluationRouter.ts';
import { getDb, saveDb } from './db.ts';

console.log('================================================================');
console.log('🧪 PENGUJIAN KOMPREHENSIF KONFIGURASI GEMINI 3.5 FLASH LITE');
console.log('   Fokus: Penghematan Biaya, Ekstraksi OCR/STT, Evaluasi Rubrik DeepSeek,');
console.log('   Pencegahan Penimpaan db.settings Lama, & Proteksi Skor Palsu');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function pass(name, detail = '') {
  passCount++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, detail = '') {
  failCount++;
  console.error(`  ❌ [FAIL] ${name}: ${detail}`);
}

async function runTests() {
  const db = getDb();
  const originalSettings = JSON.parse(JSON.stringify(db.settings || {}));

  try {
    // -------------------------------------------------------------
    // TEST 1: Verifikasi Model Utama & Fallback Default
    // -------------------------------------------------------------
    console.log('--- TEST 1: Verifikasi Konfigurasi Model Terpusat ---');
    assert.strictEqual(DEFAULT_GEMINI_PRIMARY_MODEL, 'gemini-3.5-flash-lite');
    assert.strictEqual(DEFAULT_GEMINI_FALLBACK_MODEL, 'gemini-3.1-flash-lite');
    
    // Pastikan env bersih
    delete process.env.GEMINI_MODEL;
    db.settings = { ...originalSettings };
    delete db.settings.geminiModel;

    const config = getGeminiConfig();
    assert.strictEqual(config.primaryModel, 'gemini-3.5-flash-lite');
    assert.strictEqual(config.fallbackModel, 'gemini-3.1-flash-lite');
    assert.deepStrictEqual(config.candidateModels, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
    pass('Model utama default gemini-3.5-flash-lite dan fallback gemini-3.1-flash-lite aktif');

    // -------------------------------------------------------------
    // TEST 2: Pencegahan Penimpaan db.settings.geminiModel Lama (Gemini 3.8 Flash / 2.5 Flash)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Verifikasi Proteksi Nilai db.settings Lama ---');
    
    // Uji skenario A: Database lama memiliki nilai 'gemini-3.8-flash'
    db.settings.geminiModel = 'gemini-3.8-flash';
    const config38 = getGeminiConfig();
    assert.strictEqual(
      config38.primaryModel, 
      'gemini-3.5-flash-lite', 
      'Nilai lama gemini-3.8-flash harus dimigrasikan otomatis ke gemini-3.5-flash-lite'
    );
    assert.strictEqual(
      db.settings.geminiModel, 
      'gemini-3.5-flash-lite', 
      'db.settings.geminiModel harus otomatis diperbarui di database'
    );
    pass('Nilai lama db.settings.geminiModel="gemini-3.8-flash" berhasil dicegah dan termigrasi');

    // Uji skenario B: Database lama memiliki nilai 'gemini-2.5-flash'
    db.settings.geminiModel = 'gemini-2.5-flash';
    const config25 = getGeminiConfig();
    assert.strictEqual(
      config25.primaryModel, 
      'gemini-3.5-flash-lite', 
      'Nilai lama gemini-2.5-flash harus dimigrasikan otomatis ke gemini-3.5-flash-lite'
    );
    assert.strictEqual(
      db.settings.geminiModel, 
      'gemini-3.5-flash-lite'
    );
    pass('Nilai lama db.settings.geminiModel="gemini-2.5-flash" berhasil dicegah dan termigrasi');

    // -------------------------------------------------------------
    // TEST 3: Mock Server Uji Pipeline OCR -> DeepSeek Rubric
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Pipeline 2-Step: Ekstraksi OCR Gemini -> Penilaian Rubrik DeepSeek ---');

    let geminiOcrCalled = false;
    let geminiModelUsed = '';
    let deepseekGradingCalled = false;
    let deepseekInputText = '';

    // Mock HTTP server lokal untuk merespons Gemini API & DeepSeek API
    const mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        // Mock Gemini generateContent
        if (req.url.includes('generativelanguage.googleapis.com') || req.url.includes('/v1beta/models/')) {
          geminiOcrCalled = true;
          const match = req.url.match(/models\/([^:]+):generateContent/);
          geminiModelUsed = match ? match[1] : '';

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        extracted_text: 'Reaksi titrasi HCl dengan NaOH: HCl + NaOH -> NaCl + H2O. V1=25mL, N1=0.1N, V2=24.8mL, N2=(25*0.1)/24.8=0.1008N. Prosedur K3 menggunakan sarung tangan nitril dan kacamata pengaman.',
                        is_readable: true,
                        unreadable_reason: null
                      })
                    }
                  ]
                }
              }
            ]
          }));
          return;
        }

        // Mock DeepSeek chat/completions
        if (req.url.includes('/chat/completions')) {
          deepseekGradingCalled = true;
          try {
            const parsedBody = JSON.parse(body);
            deepseekInputText = parsedBody.messages?.find(m => m.role === 'user')?.content || '';
          } catch {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rubric_scores: [
                      { indicator: 'Ketepatan Rumus Kimia', score: 5, maxScore: 5, feedback: 'Reaksi stoikiometri tepat' },
                      { indicator: 'Kalkulasi Konsentrasi', score: 4, maxScore: 5, feedback: 'Hasil 0.1008N benar' },
                      { indicator: 'Kepatuhan K3', score: 5, maxScore: 5, feedback: 'APD lengkap' }
                    ],
                    total_score: 14,
                    feedback: 'Analisis titrasi kimia dan perhitungan siswa sangat baik dan memenuhi standar industri.',
                    scoring_reason: 'Semua langkah titrasi dan K3 diuraikan secara runtut.',
                    requires_teacher_review: false
                  })
                }
              }
            ]
          }));
          return;
        }

        res.writeHead(404);
        res.end();
      });
    });

    await new Promise(resolve => mockServer.listen(5099, '127.0.0.1', resolve));

    // Arahkan konfigurasi ke mock server lokal
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const localUrl = urlStr.replace('https://generativelanguage.googleapis.com', 'http://127.0.0.1:5099');
        return originalFetch(localUrl, options);
      }
      if (urlStr.includes('api.deepseek.com')) {
        const localUrl = urlStr.replace('https://api.deepseek.com', 'http://127.0.0.1:5099');
        return originalFetch(localUrl, options);
      }
      return originalFetch(url, options);
    };

    db.settings.geminiApiKey = 'test-gemini-key-12345';
    db.settings.deepseekApiKey = 'sk-test-deepseek-key-12345';
    db.settings.deepseekBaseUrl = 'http://127.0.0.1:5099';

    const testContext = {
      questionId: 'q-kimia-01',
      attemptId: 'att-test-01',
      questionText: 'Tuliskan persamaan reaksi titrasi asam basa antara HCl dan NaOH beserta perhitungannya.',
      answerKey: 'HCl + NaOH -> NaCl + H2O',
      rubricGuide: 'Skor 15: Reaksi, perhitungan, dan K3 benar.',
      rubricComponents: [
        { name: 'Ketepatan Rumus Kimia', maxPoints: 5, criteria: 'Reaksi benar' },
        { name: 'Kalkulasi Konsentrasi', maxPoints: 5, criteria: 'Hitungan akurat' },
        { name: 'Kepatuhan K3', maxPoints: 5, criteria: 'APD tertera' }
      ],
      maxScore: 15
    };

    // 1x1 transparent PNG
    const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const imageEvalResult = await evaluateImageWithGeminiVision(testContext, dummyImageBase64, 'image/png');

    assert.strictEqual(geminiOcrCalled, true, 'Gemini harus dipanggil untuk ekstraksi OCR');
    assert.strictEqual(geminiModelUsed, 'gemini-3.5-flash-lite', 'Model Gemini yang dipanggil harus gemini-3.5-flash-lite');
    assert.strictEqual(deepseekGradingCalled, true, 'DeepSeek harus dipanggil untuk menilai teks hasil ekstraksi OCR');
    assert.strictEqual(imageEvalResult.input_type, 'image_upload');
    assert.strictEqual(imageEvalResult.total_score, 14);
    assert.strictEqual(imageEvalResult.assessment_status, 'completed');
    assert.strictEqual(imageEvalResult.requires_teacher_review, false);
    assert(imageEvalResult.model_used.includes('gemini-3.5-flash-lite'), 'model_used mencatat gemini-3.5-flash-lite');
    assert(imageEvalResult.model_used.includes('DeepSeek'), 'model_used mencatat DeepSeek');
    pass('Pipeline OCR: Gemini 3.5 Flash Lite hanya mengekstrak teks; DeepSeek menilai rubrik');

    // -------------------------------------------------------------
    // TEST 4: Pipeline 2-Step Audio STT -> DeepSeek Rubric
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Pipeline 2-Step: Transkripsi Audio STT Gemini -> Penilaian DeepSeek ---');

    let geminiSttCalled = false;
    let geminiSttModelUsed = '';
    deepseekGradingCalled = false;

    // Override mock server untuk STT
    mockServer.removeAllListeners('request');
    mockServer.on('request', (req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        if (req.url.includes('generativelanguage.googleapis.com') || req.url.includes('/v1beta/models/')) {
          geminiSttCalled = true;
          const match = req.url.match(/models\/([^:]+):generateContent/);
          geminiSttModelUsed = match ? match[1] : '';

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        transcript: 'Saya melakukan standardisasi larutan natrium hidroksida dengan kalium hidrogen ftalat menggunakan indikator fenolftalein hingga titik akhir merah muda pucat.',
                        audio_clarity: 'clear',
                        is_inaudible: false,
                        inaudible_reason: null
                      })
                    }
                  ]
                }
              }
            ]
          }));
          return;
        }

        if (req.url.includes('/chat/completions')) {
          deepseekGradingCalled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rubric_scores: [
                      { indicator: 'Prosedur Standardisasi', score: 5, maxScore: 5, feedback: 'Penggunaan KHP dan indikator PP tepat' }
                    ],
                    total_score: 5,
                    feedback: 'Penjelasan verbal siswa sangat runut dan menunjukkan pemahaman praktikum.',
                    scoring_reason: 'Transkripsi audio memenuhi kriteria rubrik teknis.',
                    requires_teacher_review: false
                  })
                }
              }
            ]
          }));
          return;
        }

        res.writeHead(404);
        res.end();
      });
    });

    const dummyAudioBase64 = 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    const audioEvalResult = await evaluateAudioWithGeminiSTTAndDeepSeek(testContext, dummyAudioBase64, 'audio/wav');

    assert.strictEqual(geminiSttCalled, true, 'Gemini harus dipanggil untuk STT');
    assert.strictEqual(geminiSttModelUsed, 'gemini-3.5-flash-lite', 'STT harus memanggil gemini-3.5-flash-lite');
    assert.strictEqual(deepseekGradingCalled, true, 'DeepSeek harus dipanggil untuk penilaian rubrik audio');
    assert.strictEqual(audioEvalResult.input_type, 'microphone_audio');
    assert.strictEqual(audioEvalResult.total_score, 5);
    assert(audioEvalResult.model_used.includes('gemini-3.5-flash-lite'));
    assert(audioEvalResult.model_used.includes('DeepSeek'));
    pass('Pipeline Audio STT: Gemini 3.5 Flash Lite mentranskripsikan audio; DeepSeek menilai rubrik');

    // -------------------------------------------------------------
    // TEST 5: Proteksi Lokasi / FAILED_PRECONDITION (Zero Skor Palsu)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Penanganan Penolakan Lokasi / API (Zero Skor Palsu) ---');

    mockServer.removeAllListeners('request');
    mockServer.on('request', (req, res) => {
      // Simulasikan penolakan lokasi Google AI Studio (HTTP 400 FAILED_PRECONDITION)
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: 400,
          message: "User location is not supported for the API use.",
          status: "FAILED_PRECONDITION"
        }
      }));
    });

    const failedImageResult = await evaluateImageWithGeminiVision(testContext, dummyImageBase64, 'image/png');

    assert.strictEqual(
      failedImageResult.assessment_status, 
      'perlu_review_guru', 
      'Status asesmen wajib "perlu_review_guru" saat API menolak lokasi'
    );
    assert.strictEqual(
      failedImageResult.requires_teacher_review, 
      true, 
      'requires_teacher_review wajib bernilai true'
    );
    assert.strictEqual(
      failedImageResult.total_score, 
      0, 
      'DILARANG membuat skor fiktif atau skor perkiraan saat API gagal'
    );
    assert(
      failedImageResult.scoring_reason.includes('FAILED_PRECONDITION') || failedImageResult.scoring_reason.includes('User location') || failedImageResult.scoring_reason.includes('Gagal mengekstrak'),
      'Alasan kegagalan harus transparan dan jujur menyatakan kendala layanan/foto'
    );
    pass('Penolakan lokasi Google menghasilkan status "perlu_review_guru" dengan skor 0 (Zero Skor Palsu)');

    // Kembalikan konfigurasi asli
    global.fetch = originalFetch;
    await new Promise(resolve => mockServer.close(resolve));

  } finally {
    // Pulihkan db.settings
    db.settings = originalSettings;
    saveDb();
  }

  console.log('\n================================================================');
  console.log(` HASIL PENGUJIAN: ${passCount} PASS, ${failCount} FAIL`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
