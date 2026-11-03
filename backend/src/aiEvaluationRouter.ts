/**
 * AI Evaluation Router EmployaSkills
 * 
 * ATURAN ARSITEKTUR KETAT:
 * 1. Jawaban Ketikan Siswa (typed_text)        -> Strictly DeepSeek API (Rubrik & Penilaian)
 * 2. Bukti Foto / Tulisan Tangan (image_upload) -> Strictly Gemini Vision Multimodal (Membaca & Menilai Langsung)
 * 3. Rekaman Suara Siswa (microphone_audio)     -> Gemini STT (Hanya Transkripsi) -> DeepSeek API (Rubrik & Penilaian)
 * 
 * Pencegahan Pelanggaran:
 * - Gemini dilarang digunakan untuk menilai teks ketikan biasa maupun teks hasil transkripsi audio.
 * - DeepSeek dilarang digunakan untuk memproses berkas gambar/foto.
 * - Kegagalan ekstraksi/jaringan tidak boleh menghasilkan nilai 0 otomatis atau teks fiktif;
 *   wajib ditandai status 'perlu_review_guru' dengan requires_teacher_review: true.
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getDb, getEvidenceStorageDir } from "./db";
import { getR2ObjectBuffer } from "./services/r2StorageService";

export async function resolveMediaBase64(mediaDataOrUrl?: string): Promise<string> {
  if (!mediaDataOrUrl) return '';
  if (mediaDataOrUrl.startsWith('data:') || (mediaDataOrUrl.length > 500 && !mediaDataOrUrl.includes('/'))) {
    return mediaDataOrUrl;
  }

  // 1. Coba periksa apakah berkas tersimpan di Cloudflare R2
  try {
    let r2Key = mediaDataOrUrl;
    if (mediaDataOrUrl.includes('/api/evidence/r2/')) {
      const parts = mediaDataOrUrl.split('/api/evidence/r2/');
      r2Key = decodeURIComponent(parts[1] || '');
    }

    if (r2Key && (r2Key.startsWith('schools/') || r2Key.startsWith('certificates/') || r2Key.startsWith('reports/'))) {
      const r2Obj = await getR2ObjectBuffer(r2Key);
      if (r2Obj && r2Obj.buffer) {
        return `data:${r2Obj.contentType};base64,${r2Obj.buffer.toString('base64')}`;
      }
    }
  } catch (r2Err) {
    console.warn('[AI Router] Warning resolving media from R2:', r2Err);
  }

  // 2. Fallback disk lokal
  try {
    const filename = path.basename(mediaDataOrUrl);
    const storageDir = getEvidenceStorageDir();
    const filePath = path.join(storageDir, filename);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return buf.toString('base64');
    }
  } catch (err) {
    console.warn('[AI Router] Error resolving media file locally:', err);
  }
  return mediaDataOrUrl;
}

export type AssessmentInputType = 'typed_text' | 'image_upload' | 'microphone_audio';

export interface RubricScoreItem {
  indicator: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

export interface StandardAIEvaluationResult {
  question_id: string;
  attempt_id: string;
  input_type: AssessmentInputType;
  model_used: string;
  transcription_or_extraction: string;
  rubric_scores: RubricScoreItem[];
  total_score: number;
  maximum_score: number;
  feedback: string;
  scoring_reason: string;
  assessment_status: 'completed' | 'perlu_review_guru' | 'failed';
  requires_teacher_review: boolean;
  evaluated_at: string;
  prompt_version: string;
}

export interface QuestionEvaluationContext {
  questionId: string;
  attemptId: string;
  questionText: string;
  answerKey?: string;
  rubricGuide?: string;
  rubricComponents?: Array<{ name: string; maxPoints: number; criteria: string }>;
  maxScore: number;
}

export function getDeepSeekConfig() {
  const db = getDb();
  const settings = (db.settings as any) || {};

  let apiKey = settings.deepseekApiKey || "";
  if (!apiKey && Array.isArray(settings.providers)) {
    const prov = settings.providers.find((p: any) => p.type?.toLowerCase() === 'deepseek' || p.id?.includes('deepseek'));
    if (prov?.apiKey && !prov.apiKey.includes('***')) {
      apiKey = prov.apiKey;
    }
  }
  if (!apiKey) {
    apiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  let model = (settings.deepseekModel || "").trim();
  if (!model && Array.isArray(settings.providers)) {
    const prov = settings.providers.find((p: any) => p.type?.toLowerCase() === 'deepseek' || p.id?.includes('deepseek'));
    if (prov?.model) {
      model = prov.model.trim();
    }
  }
  if (!model) {
    model = (process.env.DEEPSEEK_MODEL || "deepseek-chat").trim();
  }

  let baseUrl = (settings.deepseekBaseUrl || "").trim();
  if (!baseUrl && Array.isArray(settings.providers)) {
    const prov = settings.providers.find((p: any) => p.type?.toLowerCase() === 'deepseek' || p.id?.includes('deepseek'));
    if (prov?.baseUrl) {
      baseUrl = prov.baseUrl.trim();
    }
  }
  if (!baseUrl) {
    baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim();
  }
  baseUrl = baseUrl.replace(/\/$/, "");

  return { apiKey, model, baseUrl };
}

// Preferensi model Google Generative AI (Gemini 3.x - Flash & Flash Lite)
// DILARANG keras fallback ke model lawas atau model 404 seperti gemini-1.5-pro / gemini-1.5-flash / 2.0
export function getGeminiConfig() {
  const db = getDb();
  const settings = (db.settings as any) || {};

  // 1. Ambil API Key dari settings.geminiApiKey, providers array, atau process.env
  let apiKey = settings.geminiApiKey || "";
  if (!apiKey && Array.isArray(settings.providers)) {
    const prov = settings.providers.find((p: any) => p.type?.toLowerCase() === 'gemini' || p.id?.includes('gemini'));
    if (prov?.apiKey && !prov.apiKey.includes('***')) {
      apiKey = prov.apiKey;
    }
  }
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || "";
  }

  // 2. Ambil Model Aktif: Prioritaskan settings.geminiModel, providers array, atau env
  let model = (settings.geminiModel || "").trim();
  if (!model && Array.isArray(settings.providers)) {
    const prov = settings.providers.find((p: any) => p.type?.toLowerCase() === 'gemini' || p.id?.includes('gemini'));
    if (prov?.model) {
      model = prov.model.trim();
    }
  }
  if (!model) {
    model = (process.env.GEMINI_MODEL || "").trim();
  }
  // Model default: gemini-3.5-flash-lite (preferensi 3.5), dengan gemini-3.6-flash sebagai alternatif eksplisit
  if (!model || model.includes('1.5') || model.includes('2.0')) {
    model = "gemini-3.5-flash-lite";
  }

  // 3. Base URL
  const baseUrl = (settings.geminiBaseUrl || process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");

  // 4. Kandidat model terverifikasi (Model utama pertama, diikuti alternatif 3.x eksplisit)
  const candidateModels: string[] = [model];
  if (model === "gemini-3.5-flash-lite") {
    candidateModels.push("gemini-3.6-flash");
  } else if (model === "gemini-3.6-flash") {
    candidateModels.push("gemini-3.5-flash-lite");
  } else if (!candidateModels.includes("gemini-3.5-flash-lite")) {
    candidateModels.push("gemini-3.5-flash-lite");
  }

  return { apiKey, model, baseUrl, candidateModels };
}

export function getGeminiApiKey(): string {
  return getGeminiConfig().apiKey;
}

/**
 * 1. JAWABAN KETIKAN SISWA: DEEPSEEK
 * Menilai teks ketikan langsung menggunakan DeepSeek API berdasarkan rubrik.
 * GEMINI DILARANG DIPANGGIL DI SINI.
 */
export async function evaluateTypedEssayWithDeepSeek(
  context: QuestionEvaluationContext,
  studentText: string
): Promise<StandardAIEvaluationResult> {
  const now = new Date().toISOString();
  const { apiKey, model, baseUrl } = getDeepSeekConfig();

  const baseResult: StandardAIEvaluationResult = {
    question_id: context.questionId,
    attempt_id: context.attemptId,
    input_type: 'typed_text',
    model_used: `DeepSeek (${model})`,
    transcription_or_extraction: studentText || '',
    rubric_scores: [],
    total_score: undefined,
    maximum_score: context.maxScore || 10,
    feedback: '',
    scoring_reason: '',
    assessment_status: 'failed',
    requires_teacher_review: true,
    evaluated_at: now,
    prompt_version: 'v3.0-typed-deepseek-only'
  };

  const cleanText = (studentText || '').trim();
  if (!cleanText) {
    return {
      ...baseResult,
      total_score: 0,
      feedback: 'Siswa tidak memberikan teks jawaban pada butir soal ini.',
      scoring_reason: 'Teks jawaban kosong.',
      assessment_status: 'completed',
      requires_teacher_review: false
    };
  }

  if (!apiKey) {
    return {
      ...baseResult,
      feedback: 'Jawaban tersimpan dengan aman di database. Layanan DeepSeek API belum terkonfigurasi untuk penilaian otomatis.',
      scoring_reason: 'Kunci API DeepSeek belum dikonfigurasi pada server.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const prompt = `
Anda adalah Evaluator Rubrik Asesmen Vokasi SMK Kimia Industri.
Tugas Anda menilai jawaban ketikan siswa secara objektif berdasarkan Rubrik dan Kunci Jawaban.
DILARANG memberikan skor melebihi skor maksimal (${context.maxScore}).

=== INFORMASI SOAL & KUNCI ===
Pertanyaan: ${context.questionText}
Kunci Jawaban Acuan: ${context.answerKey || 'Sesuai SOP industri kimia'}
Pedoman Rubrik: ${context.rubricGuide || 'Penilaian ketepatan konsep, kelengkapan prosedur, dan analisis risiko'}
Komponen Rubrik: ${JSON.stringify(context.rubricComponents || [], null, 2)}
Skor Maksimal: ${context.maxScore}

=== JAWABAN KETIKAN SISWA ===
${cleanText}

Berikan output JSON dengan format persis:
{
  "total_score": number,
  "scoring_reason": "Alasan penilaian ringkas dan objektif...",
  "feedback": "Umpan balik konstruktif untuk siswa...",
  "rubric_scores": [
    {
      "indicator": "Nama indikator rubrik",
      "score": number,
      "maxScore": number,
      "feedback": "Keterangan capaian indikator"
    }
  ],
  "requires_teacher_review": boolean
}`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Anda adalah Rubric AI Scoring Engine profesional. Jawab selalu dalam format JSON valid sesuai skema yang diminta." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AI DeepSeek] HTTP ${response.status}: ${errText}`);
      return {
        ...baseResult,
        feedback: 'Jawaban tersimpan aman. Terjadi kendala saat menghubungi layanan DeepSeek.',
        scoring_reason: `DeepSeek API HTTP ${response.status}. Memerlukan review guru.`,
        assessment_status: 'failed',
        requires_teacher_review: true
      };
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const safeTotal = Math.min(context.maxScore, Math.max(0, Number(parsed.total_score) || 0));
    const rubricScores: RubricScoreItem[] = Array.isArray(parsed.rubric_scores)
      ? parsed.rubric_scores.map((r: any) => ({
          indicator: String(r.indicator || 'Indikator Kompetensi'),
          score: Math.max(0, Number(r.score) || 0),
          maxScore: Math.max(1, Number(r.maxScore) || 1),
          feedback: r.feedback ? String(r.feedback) : undefined
        }))
      : [];

    return {
      ...baseResult,
      rubric_scores: rubricScores,
      total_score: safeTotal,
      feedback: parsed.feedback || 'Jawaban telah dinilai oleh DeepSeek berdasarkan rubrik.',
      scoring_reason: parsed.scoring_reason || 'Penilaian rubrik DeepSeek selesai.',
      assessment_status: 'completed',
      requires_teacher_review: Boolean(parsed.requires_teacher_review)
    };
  } catch (err: any) {
    console.error('[AI DeepSeek] Error evaluating typed essay:', err.message);
    return {
      ...baseResult,
      feedback: 'Jawaban tersimpan aman di sistem. Penilaian otomatis ditunda untuk diperiksa guru.',
      scoring_reason: `Pengecualian jaringan/API: ${err.message}`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }
}

/**
 * 2. BUKTI FOTO / TULISAN TANGAN: GEMINI MULTIMODAL VISION MURNI
 * Gemini membaca sekaligus menilai gambar siswa secara langsung berdasarkan soal dan rubrik.
 * DILARANG mengirim hasil OCR gambar ke DeepSeek untuk penilaian.
 */
export async function evaluateImageWithGeminiVision(
  context: QuestionEvaluationContext,
  rawImageData: string, // Base64 data URL atau clean base64
  mimeType: string = 'image/jpeg'
): Promise<StandardAIEvaluationResult> {
  const now = new Date().toISOString();
  const { apiKey, baseUrl, candidateModels } = getGeminiConfig();

  const baseResult: StandardAIEvaluationResult = {
    question_id: context.questionId,
    attempt_id: context.attemptId,
    input_type: 'image_upload',
    model_used: 'Gemini Multimodal Vision',
    transcription_or_extraction: '',
    rubric_scores: (context.rubricComponents && context.rubricComponents.length > 0)
      ? context.rubricComponents.map(r => ({
          indicator: r.name || (r as any).indicator || 'Kriteria Penilaian',
          score: 0,
          maxScore: r.maxPoints || (r as any).maxScore || Math.round((context.maxScore || 10) / context.rubricComponents!.length),
          feedback: 'Menunggu peninjauan langsung bukti foto oleh guru'
        }))
      : [],
    total_score: undefined,
    maximum_score: context.maxScore || 10,
    feedback: '',
    scoring_reason: '',
    assessment_status: 'failed',
    requires_teacher_review: true,
    evaluated_at: now,
    prompt_version: 'v4.0-gemini-direct-vision'
  };

  const resolvedMedia = await resolveMediaBase64(rawImageData);
  if (!resolvedMedia) {
    return {
      ...baseResult,
      feedback: 'Tidak ada berkas gambar yang dilampirkan atau berkas tidak ditemukan di penyimpanan server.',
      scoring_reason: 'Berkas bukti gambar kosong atau berkas fisik tidak ditemukan.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  if (!apiKey) {
    return {
      ...baseResult,
      feedback: 'Foto lembar jawaban tersimpan dengan aman di server. Kunci Gemini API belum terkonfigurasi untuk penilaian otomatis.',
      scoring_reason: 'Kunci API Gemini belum dikonfigurasi pada server. Memerlukan peninjauan dan penilaian langsung oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const base64Clean = resolvedMedia.replace(/^data:[^;]+;base64,/, '');
  const cleanMime = resolvedMedia.startsWith('data:')
    ? resolvedMedia.split(';')[0].replace('data:', '')
    : mimeType;

  const directVisionPrompt = `
Anda adalah Evaluator Rubrik Asesmen Vokasi SMK Kimia Industri yang ahli dalam menganalisis dokumen dan lembar kerja tulisan tangan laboratorium.
Tugas Anda:
1. Analisis dan baca tulisan tangan/jawaban pada gambar ini (termasuk rumus kimia, angka perhitungan, dan prosedur kerja).
2. Lakukan penilaian langsung secara objektif berdasarkan Rubrik, Kunci Jawaban Acuan, dan Skor Maksimal.
3. DILARANG memberikan skor melebihi skor maksimal (${context.maxScore}).
4. ATURAN KETERBACAAN & KELAYAKAN BUKTI:
   a. Jika tulisan tangan JELAS:
      - Ekstrak seluruh teks jawaban pada "transcription".
      - Nilai dengan teliti sesuai kriteria rubrik.
      - Berikan skor penuh/parsial yang sah.
   b. Jika tulisan tangan HANYA SEBAGIAN TERBACA:
      - Berikan skor secara adil HANYA untuk bagian yang benar-benar terbaca dan memenuhi rubrik.
      - DILARANG mengarang isi tulisan yang buram atau tidak terbaca.
      - DILARANG memberi skor 0 otomatis hanya karena sebagian teks tidak terbaca.
      - Jelaskan secara spesifik pada "uncertainty_reason" bagian mana yang tidak terbaca.
      - Tandai "requires_teacher_review": true.
   c. Jika gambar SAMA SEKALI BURAM, GELAP, RUSAK, atau TIDAK TERBACA:
      - Set "is_readable": false.
      - Set "total_score": null.
      - Set "requires_teacher_review": true.
      - Jelaskan pada "uncertainty_reason" alasan fisik gambar tidak terbaca.

=== INFORMASI SOAL & PANDUAN RUBRIK ===
Pertanyaan: ${context.questionText}
Kunci Jawaban Acuan: ${context.answerKey || 'Sesuai SOP industri kimia dan ketelitian analitik'}
Pedoman Rubrik: ${context.rubricGuide || 'Penilaian ketepatan konsep, kelengkapan prosedur, dan analisis risiko'}
Komponen Rubrik: ${JSON.stringify(context.rubricComponents || [], null, 2)}
Skor Maksimal: ${context.maxScore}

Berikan output JSON dengan skema persis:
{
  "transcription": "Teks lengkap yang berhasil terbaca dari gambar...",
  "total_score": number atau null,
  "scoring_reason": "Alasan penilaian ringkas dan objektif...",
  "feedback": "Umpan balik konstruktif untuk siswa...",
  "rubric_scores": [
    {
      "indicator": "Nama indikator rubrik",
      "score": number,
      "maxScore": number,
      "feedback": "Keterangan capaian indikator"
    }
  ],
  "is_readable": boolean,
  "confidence_level": "high" | "medium" | "low",
  "uncertainty_reason": "Keterangan bagian yang tidak terbaca atau kendala pembuktian, atau null",
  "requires_teacher_review": boolean
}`;

  let evalSuccess = false;
  let modelUsed = '';
  let parsedData: any = null;
  let lastErr = '';
  let isGeoRestricted = false;

  for (const model of candidateModels) {
    if (evalSuccess) break;
    try {
      const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: cleanMime, data: base64Clean } },
                { text: directVisionPrompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = (errJson as any)?.error?.message || res.statusText;
        if (res.status === 400 && (errMsg.includes('User location is not supported') || errMsg.includes('location'))) {
          isGeoRestricted = true;
          lastErr = `Gemini Geo-Restriction (HTTP 400): ${errMsg}`;
          break; // Stop further candidate loop if whole location is blocked
        }
        if (res.status === 404) {
          lastErr = `Gemini Model ${model} tidak ditemukan (HTTP 404): ${errMsg}`;
          continue;
        }
        lastErr = `Gemini ${model} HTTP ${res.status}: ${errMsg}`;
        continue;
      }

      const json = await res.json() as any;
      const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        parsedData = JSON.parse(responseText);
        evalSuccess = true;
        modelUsed = model;
      }
    } catch (modelErr: any) {
      lastErr = `Gemini ${model} exception: ${modelErr.message}`;
    }
  }

  // 1. Penanganan Kegagalan Layanan / Lokasi VPS
  if (isGeoRestricted) {
    return {
      ...baseResult,
      feedback: 'Berkas foto lembar jawaban tersimpan aman di server. Layanan Gemini API dibatasi wilayah geografis (Geo-restricted).',
      scoring_reason: `Akses Gemini API dibatasi wilayah geografis VPS (${lastErr}). Berkas foto asli tersimpan untuk diperiksa langsung oleh Guru.`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  if (!evalSuccess || !parsedData) {
    return {
      ...baseResult,
      feedback: 'Berkas foto lembar jawaban tersimpan aman di server. Terjadi kendala teknis saat memproses gambar dengan model Gemini.',
      scoring_reason: `Gagal memanggil Gemini Multimodal Vision API (${lastErr || 'Respons kosong'}). Memerlukan evaluasi langsung oleh Guru.`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const transcription = (parsedData.transcription || parsedData.extracted_text || '').trim();
  const isReadable = parsedData.is_readable !== false;
  const isUnreadableTotal = !isReadable || (parsedData.total_score === null && !transcription);

  // 2. Penanganan Gambar Sama Sekali Tidak Terbaca (Zero Fake Score Policy: skor undefined, BUKAN 0 palsu)
  if (isUnreadableTotal) {
    return {
      ...baseResult,
      model_used: `Gemini Multimodal (${modelUsed})`,
      transcription_or_extraction: transcription || '[Foto tulisan tangan buram atau tidak terbaca jelas]',
      total_score: undefined,
      feedback: parsedData.feedback || 'Berkas foto lembar jawaban tersimpan aman di server. Tulisan tangan pada foto tidak cukup jelas untuk dibaca secara otomatis.',
      scoring_reason: parsedData.uncertainty_reason || parsedData.scoring_reason || 'Bukti foto buram/rusak/tidak terbaca. Memerlukan evaluasi langsung bukti foto oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  // 3. Penilaian Sukses (Penuh atau Parsial dengan Catatan Ketidakpastian)
  const rawScore = parsedData.total_score !== null && parsedData.total_score !== undefined
    ? Number(parsedData.total_score)
    : 0;
  const safeTotal = Math.min(context.maxScore, Math.max(0, isNaN(rawScore) ? 0 : rawScore));

  const rubricScores: RubricScoreItem[] = Array.isArray(parsedData.rubric_scores)
    ? parsedData.rubric_scores.map((r: any) => ({
        indicator: String(r.indicator || 'Indikator Rubrik'),
        score: Math.max(0, Number(r.score) || 0),
        maxScore: Math.max(1, Number(r.maxScore) || 1),
        feedback: r.feedback ? String(r.feedback) : undefined
      }))
    : [];

  const uncertaintyText = parsedData.uncertainty_reason ? `[Catatan Keterbacaan: ${parsedData.uncertainty_reason}] ` : '';

  return {
    ...baseResult,
    model_used: `Gemini Multimodal (${modelUsed})`,
    transcription_or_extraction: transcription,
    rubric_scores: rubricScores,
    total_score: safeTotal,
    feedback: parsedData.feedback || 'Jawaban foto telah dinilai langsung oleh Gemini Multimodal Vision berdasarkan rubrik.',
    scoring_reason: uncertaintyText + (parsedData.scoring_reason || 'Penilaian multimodal langsung selesai.'),
    assessment_status: 'completed',
    requires_teacher_review: Boolean(parsedData.requires_teacher_review || parsedData.uncertainty_reason)
  };
}

/**
 * 3. REKAMAN SUARA SISWA: KOMBINASI 2-STEP
 * Tahap 1: Gemini STT (HANYA transkripsi audio, dilarang memberi nilai).
 * Tahap 2: DeepSeek API menilai teks transkrip berdasarkan soal dan rubrik.
 * Jika transkrip sudah tersedia, langsung jalankan DeepSeek tanpa mengulang STT!
 */
export async function evaluateAudioWithGeminiSTTAndDeepSeek(
  context: QuestionEvaluationContext,
  rawAudioData: string, // Base64 data URL atau clean base64
  mimeType: string = 'audio/webm',
  existingTranscript?: string
): Promise<StandardAIEvaluationResult> {
  const now = new Date().toISOString();
  const { apiKey, baseUrl, candidateModels } = getGeminiConfig();

  const baseResult: StandardAIEvaluationResult = {
    question_id: context.questionId,
    attempt_id: context.attemptId,
    input_type: 'microphone_audio',
    model_used: 'Gemini STT + DeepSeek',
    transcription_or_extraction: '',
    rubric_scores: [],
    total_score: undefined,
    maximum_score: context.maxScore || 10,
    feedback: '',
    scoring_reason: '',
    assessment_status: 'failed',
    requires_teacher_review: true,
    evaluated_at: now,
    prompt_version: 'v4.0-audio-stt-deepseek'
  };

  // 1. OPTIMISASI CEPAT: Jika transkrip yang valid sudah tersedia, langsung nilai dengan DeepSeek!
  const cleanExisting = (existingTranscript || '').trim();
  if (cleanExisting && !cleanExisting.startsWith('[') && cleanExisting.length > 3) {
    console.log(`[AI Audio] Transkrip audio sudah tersedia (${cleanExisting.substring(0, 50)}...). Melanjutkan evaluasi DeepSeek.`);
    const deepseekResult = await evaluateTypedEssayWithDeepSeek(context, cleanExisting);
    return {
      ...deepseekResult,
      input_type: 'microphone_audio',
      model_used: `Transkrip Tersimpan → ${deepseekResult.model_used}`,
      transcription_or_extraction: cleanExisting,
      prompt_version: 'v4.0-audio-stt-deepseek'
    };
  }

  const resolvedMedia = await resolveMediaBase64(rawAudioData);
  if (!resolvedMedia) {
    return {
      ...baseResult,
      feedback: 'Tidak ada berkas rekaman audio yang dilampirkan atau berkas tidak ditemukan di penyimpanan server.',
      scoring_reason: 'Berkas bukti rekaman suara kosong atau tidak ditemukan.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  if (!apiKey) {
    return {
      ...baseResult,
      feedback: 'Berkas rekaman suara tersimpan aman di server. Kunci Gemini API belum terkonfigurasi untuk transkripsi audio otomatis.',
      scoring_reason: 'Kunci API Gemini belum dikonfigurasi. Rekaman asli tersimpan untuk didengarkan langsung oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const base64Clean = resolvedMedia.replace(/^data:[^;]+;base64,/, '');
  const cleanMime = resolvedMedia.startsWith('data:')
    ? resolvedMedia.split(';')[0].replace('data:', '')
    : mimeType;

  // TAHAP 1: GEMINI HANYA UNTUK STT (SPEECH-TO-TEXT) MENGGUNAKAN CANDIDATE 3.x
  const sttPrompt = `
Anda adalah sistem Transkripsi Audio Vokasi SMK (Speech-to-Text Transcriber).
Transkripsikan rekaman audio siswa ini ke dalam teks bahasa Indonesia secara akurat dan lengkap.
Sertakan istilah teknis kimia analitik, K3, dan langkah laboratorium yang diucapkan siswa.

DILARANG MEMBERIKAN NILAI ATAU EVALUASI SKOR.
Hanya lakukan transkripsi dan periksa kejelasan rekaman audio.

Berikan output JSON dengan format:
{
  "transcript": "Teks lengkap hasil transkripsi rekaman suara...",
  "audio_clarity": "clear" | "noisy" | "inaudible",
  "is_inaudible": boolean,
  "inaudible_reason": "Alasan jika rekaman audio tidak jelas atau null"
}`;

  let transcript = '';
  let sttSuccess = false;
  let sttModelUsed = '';
  let isAudioInaudible = false;
  let inaudibleReason = '';
  let lastErr = '';
  let isGeoRestricted = false;

  for (const model of candidateModels) {
    if (sttSuccess) break;
    try {
      const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: cleanMime, data: base64Clean } },
                { text: sttPrompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = (errJson as any)?.error?.message || res.statusText;
        if (res.status === 400 && (errMsg.includes('User location is not supported') || errMsg.includes('location'))) {
          isGeoRestricted = true;
          lastErr = `Gemini Geo-Restriction (HTTP 400): ${errMsg}`;
          break;
        }
        if (res.status === 404) {
          lastErr = `Gemini Model ${model} tidak ditemukan (HTTP 404): ${errMsg}`;
          continue;
        }
        lastErr = `Gemini ${model} HTTP ${res.status}: ${errMsg}`;
        continue;
      }

      const json = await res.json() as any;
      const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        transcript = (parsed.transcript || '').trim();
        isAudioInaudible = Boolean(parsed.is_inaudible) || (!transcript && Boolean(parsed.inaudible_reason));
        inaudibleReason = parsed.inaudible_reason || '';
        sttModelUsed = model;
        sttSuccess = true;
      }
    } catch (modelErr: any) {
      lastErr = `Gemini ${model} exception: ${modelErr.message}`;
    }
  }

  if (isGeoRestricted) {
    return {
      ...baseResult,
      feedback: 'Berkas rekaman suara tersimpan aman di server. Layanan Gemini STT dibatasi oleh wilayah geografis server.',
      scoring_reason: `Akses Gemini API dibatasi wilayah geografis VPS (${lastErr}). Rekaman suara asli tersimpan untuk diperiksa langsung oleh Guru.`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  // Jika STT gagal atau rekaman tidak bersuara/rusak
  if (!sttSuccess || isAudioInaudible || !transcript) {
    return {
      ...baseResult,
      model_used: sttModelUsed ? `Gemini STT (${sttModelUsed})` : 'Gemini STT',
      transcription_or_extraction: transcript || '[Rekaman audio tidak terdengar jelas atau bising]',
      feedback: 'Rekaman suara tersimpan aman di server. Suara tidak cukup jelas untuk ditranskripsikan secara otomatis.',
      scoring_reason: inaudibleReason || `Rekaman audio bising atau tidak terdengar jelas (${lastErr || 'tidak terbaca'}). Memerlukan evaluasi langsung oleh Guru.`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  // TAHAP 2: DEEPSEEK MENILAI TEKS HASIL TRANSKRIPSI GEMINI
  const deepseekResult = await evaluateTypedEssayWithDeepSeek(context, transcript);

  return {
    ...deepseekResult,
    input_type: 'microphone_audio',
    model_used: `Gemini STT (${sttModelUsed}) → ${deepseekResult.model_used}`,
    transcription_or_extraction: transcript,
    prompt_version: 'v4.0-audio-stt-deepseek'
  };
}

/**
 * Dispatcher Terpusat Berdasarkan Tipe Input
 */
export async function evaluateStudentAnswerStandard(
  arg1: AssessmentInputType | any,
  arg2?: QuestionEvaluationContext,
  arg3?: {
    typedText?: string;
    mediaData?: string;
    mimeType?: string;
    existingTranscript?: string;
  }
): Promise<StandardAIEvaluationResult> {
  let inputType: AssessmentInputType;
  let context: QuestionEvaluationContext;
  let payload: { typedText?: string; mediaData?: string; mimeType?: string; existingTranscript?: string };

  if (typeof arg1 === 'object' && arg1 !== null && (arg1.input_type || arg1.inputType)) {
    const raw = arg1;
    inputType = (raw.input_type || raw.inputType) as AssessmentInputType;
    context = {
      questionId: raw.question_id || raw.questionId || 'unknown',
      attemptId: raw.attempt_id || raw.attemptId || 'unknown',
      questionText: raw.question_text || raw.questionText || '',
      answerKey: raw.answer_key_or_exemplar || raw.answerKey || '',
      rubricGuide: raw.rubric_guide || raw.rubricGuide || '',
      rubricComponents: raw.rubric_indicators || raw.rubricComponents || [],
      maxScore: raw.max_score !== undefined ? raw.max_score : (raw.maxScore || 10)
    };
    payload = {
      typedText: raw.student_text || raw.typedText || '',
      mediaData: raw.image_base64 || raw.audio_base64 || raw.mediaData || '',
      mimeType: raw.image_mime_type || raw.audio_mime_type || raw.mimeType || 'image/jpeg',
      existingTranscript: raw.existing_transcript || raw.existingTranscript || ''
    };
  } else {
    inputType = arg1 as AssessmentInputType;
    context = arg2 || {} as any;
    payload = arg3 || {};
  }

  if (inputType === 'typed_text') {
    return evaluateTypedEssayWithDeepSeek(context, payload.typedText || '');
  } else if (inputType === 'image_upload') {
    return evaluateImageWithGeminiVision(context, payload.mediaData || '', payload.mimeType || 'image/jpeg');
  } else if (inputType === 'microphone_audio') {
    return evaluateAudioWithGeminiSTTAndDeepSeek(context, payload.mediaData || '', payload.mimeType || 'audio/webm', payload.existingTranscript);
  }

  return {
    question_id: context.questionId,
    attempt_id: context.attemptId,
    input_type: inputType,
    model_used: 'None',
    transcription_or_extraction: '',
    rubric_scores: [],
    total_score: 0,
    maximum_score: context.maxScore || 10,
    feedback: 'Tipe input tidak didukung.',
    scoring_reason: `Tipe input '${inputType}' tidak dikenali.`,
    assessment_status: 'failed',
    requires_teacher_review: true,
    evaluated_at: new Date().toISOString(),
    prompt_version: 'v3.0-standard'
  };
}
