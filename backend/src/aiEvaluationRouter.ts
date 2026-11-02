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

export function resolveMediaBase64(mediaDataOrUrl?: string): string {
  if (!mediaDataOrUrl) return '';
  if (mediaDataOrUrl.startsWith('data:') || mediaDataOrUrl.length > 500) {
    return mediaDataOrUrl;
  }
  try {
    const filename = path.basename(mediaDataOrUrl);
    const storageDir = getEvidenceStorageDir();
    const filePath = path.join(storageDir, filename);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return buf.toString('base64');
    }
  } catch (err) {
    console.warn('[AI Router] Error resolving media file:', err);
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

// Model fallback resmi Google Generative AI (Vision & Multimodal STT)
const VALID_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

function getDeepSeekConfig() {
  const db = getDb();
  const settings = (db.settings as any) || {};
  const apiKey = settings.deepseekApiKey || process.env.DEEPSEEK_API_KEY || "";
  const model = settings.deepseekModel || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const baseUrl = (settings.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

export function getGeminiConfig() {
  const db = getDb();
  const settings = (db.settings as any) || {};
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  const baseUrl = (settings.geminiBaseUrl || process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  return { apiKey, baseUrl };
}

function getGeminiApiKey(): string {
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
    rubric_scores: (context.rubricComponents && context.rubricComponents.length > 0)
      ? context.rubricComponents.map(r => ({
          indicator: r.name || (r as any).indicator || 'Kriteria Penilaian',
          score: 0,
          maxScore: r.maxPoints || (r as any).maxScore || Math.round((context.maxScore || 10) / context.rubricComponents!.length),
          feedback: 'Menunggu validasi guru'
        }))
      : [],
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
 * 2. BUKTI FOTO / TULISAN TANGAN: GEMINI MULTIMODAL VISION
 * Mengirim gambar asli langsung ke Gemini Vision API untuk membaca tulisan tangan
/**
 * 2. JAWABAN GAMBAR / TULISAN TANGAN: KOMBINASI 2-STEP
 * Tahap 1: Gemini OCR (HANYA membaca/mengekstrak tulisan tangan, dilarang memberi nilai).
 * Tahap 2: Jika ekstraksi sukses, kirim teks hasil OCR ke DeepSeek API untuk dinilai dengan rubrik.
 * GEMINI DILARANG MEMBERIKAN NILAI AKHIR.
 */
export async function evaluateImageWithGeminiVision(
  context: QuestionEvaluationContext,
  rawImageData: string, // Base64 data URL atau clean base64
  mimeType: string = 'image/jpeg'
): Promise<StandardAIEvaluationResult> {
  const now = new Date().toISOString();
  const { apiKey, baseUrl } = getGeminiConfig();

  const baseResult: StandardAIEvaluationResult = {
    question_id: context.questionId,
    attempt_id: context.attemptId,
    input_type: 'image_upload',
    model_used: 'Gemini OCR + DeepSeek',
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
    prompt_version: 'v3.0-image-ocr-deepseek'
  };

  const resolvedMedia = resolveMediaBase64(rawImageData);
  if (!resolvedMedia) {
    return {
      ...baseResult,
      feedback: 'Tidak ada berkas gambar yang dilampirkan atau berkas tidak ditemukan di penyimpanan.',
      scoring_reason: 'Berkas bukti gambar kosong.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  if (!apiKey) {
    return {
      ...baseResult,
      feedback: 'Foto lembar jawaban tersimpan dengan aman. Kunci Gemini API belum terpasang untuk OCR otomatis.',
      scoring_reason: 'Kunci API Gemini belum dikonfigurasi. Memerlukan peninjauan langsung foto asli oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const base64Clean = resolvedMedia.replace(/^data:[^;]+;base64,/, '');
  const cleanMime = resolvedMedia.startsWith('data:')
    ? resolvedMedia.split(';')[0].replace('data:', '')
    : mimeType;

  // TAHAP 1: GEMINI HANYA UNTUK OCR (OPTICAL CHARACTER RECOGNITION)
  const ocrPrompt = `
Anda adalah sistem OCR Asesmen Vokasi SMK Kimia Industri.
Tugas Anda membaca dan mengekstrak seluruh teks, tulisan tangan, rumus kimia, angka perhitungan, dan langkah kerja dari gambar lembar jawaban siswa ini secara akurat dan lengkap.

DILARANG MEMBERIKAN NILAI ATAU EVALUASI SKOR.
Hanya lakukan ekstraksi tulisan tangan dan periksa keterbacaan gambar.

Berikan output JSON dengan format persis:
{
  "extracted_text": "Teks lengkap tulisan tangan yang terbaca...",
  "is_readable": boolean,
  "unreadable_reason": "Alasan jika tulisan buram, gelap, terpotong, atau tidak terbaca, atau null"
}`;

  let extractedText = '';
  let ocrSuccess = false;
  let ocrModelUsed = '';
  let isImageUnreadable = false;
  let unreadableReason = '';
  let lastErr = '';

  for (const model of VALID_GEMINI_MODELS) {
    if (ocrSuccess) break;
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
                { text: ocrPrompt }
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
        lastErr = `${model} HTTP ${res.status}: ${errMsg}`;
        continue;
      }

      const json = await res.json() as any;
      const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        extractedText = (parsed.extracted_text || parsed.transcription_or_extraction || '').trim();
        isImageUnreadable = parsed.is_readable === false || (!extractedText && Boolean(parsed.unreadable_reason));
        unreadableReason = parsed.unreadable_reason || '';
        ocrSuccess = true;
        ocrModelUsed = model;
      }
    } catch (modelErr: any) {
      lastErr = `${model} exception: ${modelErr.message}`;
    }
  }

  // Jika semua model Gemini gagal atau gambar tidak terbaca
  if (!ocrSuccess || isImageUnreadable || !extractedText) {
    return {
      ...baseResult,
      model_used: ocrModelUsed ? `Gemini OCR (${ocrModelUsed})` : 'Gemini OCR',
      transcription_or_extraction: extractedText || '[Foto tulisan tangan buram atau tidak terbaca jelas]',
      feedback: 'Berkas foto lembar jawaban tersimpan aman di server. Tulisan tangan tidak cukup jelas untuk dibaca secara otomatis.',
      scoring_reason: unreadableReason || `Gagal mengekstrak teks dari foto via Gemini OCR (${lastErr || 'buram/tidak terbaca'}). Memerlukan evaluasi langsung oleh Guru.`,
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  // TAHAP 2: DEEPSEEK MENILAI TEKS HASIL EKSTRAKSI OCR GEMINI BERDASARKAN RUBRIK
  const deepseekResult = await evaluateTypedEssayWithDeepSeek(context, extractedText);

  return {
    ...deepseekResult,
    input_type: 'image_upload',
    model_used: `Gemini OCR (${ocrModelUsed}) → DeepSeek`,
    transcription_or_extraction: extractedText,
    prompt_version: 'v3.0-image-ocr-deepseek'
  };
}

/**
 * 3. REKAMAN SUARA SISWA: KOMBINASI 2-STEP
 * Tahap 1: Gemini STT (HANYA transkripsi, dilarang memberi nilai).
 * Tahap 2: Jika transkripsi sukses, kirim teks ke DeepSeek API untuk dinilai dengan rubrik.
 */
export async function evaluateAudioWithGeminiSTTAndDeepSeek(
  context: QuestionEvaluationContext,
  rawAudioData: string, // Base64 data URL atau clean base64
  mimeType: string = 'audio/webm'
): Promise<StandardAIEvaluationResult> {
  const now = new Date().toISOString();
  const { apiKey, baseUrl } = getGeminiConfig();

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
    prompt_version: 'v3.0-audio-stt-deepseek'
  };

  const resolvedMedia = resolveMediaBase64(rawAudioData);
  if (!resolvedMedia) {
    return {
      ...baseResult,
      feedback: 'Tidak ada berkas rekaman audio yang dilampirkan atau berkas tidak ditemukan di penyimpanan.',
      scoring_reason: 'Berkas audio kosong.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  if (!apiKey) {
    return {
      ...baseResult,
      feedback: 'Berkas rekaman suara tersimpan aman di server. Kunci Gemini API belum terpasang untuk transkripsi otomatis.',
      scoring_reason: 'Kunci API Gemini belum dikonfigurasi. Rekaman asli tersimpan untuk didengarkan langsung oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  const base64Clean = resolvedMedia.replace(/^data:[^;]+;base64,/, '');
  const cleanMime = resolvedMedia.startsWith('data:')
    ? resolvedMedia.split(';')[0].replace('data:', '')
    : mimeType;

  // TAHAP 1: GEMINI HANYA UNTUK STT (SPEECH-TO-TEXT)
  const sttPrompt = `
Anda adalah sistem Transkripsi Audio Vokasi SMK (Speech-to-Text Transcriber).
Transkripsikan rekaman audio siswa ini ke dalam teks bahasa Indonesia secara akurat dan lengkap.
Sertakan istilah teknis kimia dan langkah laboratorium yang diucapkan.

DILARANG MEMBERIKAN NILAI ATAU EVALUASI SKOR.
Hanya lakukan transkripsi dan periksa kejelasan suara.

Berikan output JSON dengan format:
{
  "transcript": "Teks lengkap hasil transkripsi audio...",
  "audio_clarity": "clear" | "noisy" | "inaudible",
  "is_inaudible": boolean,
  "inaudible_reason": "Alasan jika suara tidak jelas atau null"
}`;

  let transcript = '';
  let sttSuccess = false;
  let sttModelUsed = '';
  let isAudioInaudible = false;
  let inaudibleReason = '';

  for (const model of VALID_GEMINI_MODELS) {
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

      if (!res.ok) continue;

      const json = await res.json() as any;
      const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        transcript = (parsed.transcript || '').trim();
        isAudioInaudible = Boolean(parsed.is_inaudible) || !transcript;
        inaudibleReason = parsed.inaudible_reason || '';
        sttModelUsed = model;
        sttSuccess = true;
      }
    } catch {}
  }

  // Jika STT gagal atau rekaman tidak bersuara/rusak
  if (!sttSuccess || isAudioInaudible || !transcript) {
    return {
      ...baseResult,
      model_used: sttModelUsed ? `Gemini STT (${sttModelUsed})` : 'Gemini STT',
      transcription_or_extraction: transcript || '[Rekaman audio tidak terdengar jelas atau bising]',
      feedback: 'Rekaman suara tersimpan aman di server. Suara tidak cukup jelas untuk ditranskripsikan secara otomatis.',
      scoring_reason: inaudibleReason || 'Rekaman audio bising atau tidak terdengar jelas. Memerlukan evaluasi langsung oleh Guru.',
      assessment_status: 'failed',
      requires_teacher_review: true
    };
  }

  // TAHAP 2: DEEPSEEK MENILAI TEKS HASIL TRANSKRIPSI GEMINI
  const deepseekResult = await evaluateTypedEssayWithDeepSeek(context, transcript);

  return {
    ...deepseekResult,
    input_type: 'microphone_audio',
    model_used: `Gemini STT (${sttModelUsed}) → DeepSeek`,
    transcription_or_extraction: transcript,
    prompt_version: 'v3.0-audio-stt-deepseek'
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
  }
): Promise<StandardAIEvaluationResult> {
  let inputType: AssessmentInputType;
  let context: QuestionEvaluationContext;
  let payload: { typedText?: string; mediaData?: string; mimeType?: string };

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
      mimeType: raw.image_mime_type || raw.audio_mime_type || raw.mimeType || 'image/jpeg'
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
    return evaluateAudioWithGeminiSTTAndDeepSeek(context, payload.mediaData || '', payload.mimeType || 'audio/webm');
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
