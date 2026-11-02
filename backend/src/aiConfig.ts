import { getDb } from './db';

export interface GeminiConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
  candidateModels: string[];
}

export const DEFAULT_GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

/**
 * Daftar model lama / berbiaya tinggi yang harus dicegah dan dimigrasikan secara otomatis
 * ke gemini-3.5-flash-lite agar tidak menimpa pengaturan hemat biaya API.
 */
export const OBSOLETE_OR_EXPENSIVE_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

/**
 * Daftar resmi model Gemini yang aktif didukung untuk OCR & STT:
 * 1. gemini-3.5-flash-lite (Primary - Hemat biaya API)
 * 2. gemini-3.1-flash-lite (Fallback opsional)
 */
export const SUPPORTED_GEMINI_MODELS = [
  DEFAULT_GEMINI_PRIMARY_MODEL,
  DEFAULT_GEMINI_FALLBACK_MODEL
] as const;

/**
 * Konfigurasi terpusat Gemini Model:
 * Memastikan nilai lama di database (seperti gemini-3.8-flash atau gemini-2.5-flash)
 * tidak memaksakan model mahal dan otomatis termigrasi ke gemini-3.5-flash-lite.
 */
export function getGeminiConfig(): GeminiConfig {
  let dbSettings: any = {};
  let dbInstance: any = null;
  try {
    dbInstance = getDb();
    dbSettings = (dbInstance && dbInstance.settings) || {};
  } catch {
    dbSettings = {};
  }

  const apiKey = (dbSettings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  let configuredModel = typeof dbSettings.geminiModel === 'string' ? dbSettings.geminiModel.trim() : '';
  let envModel = (process.env.GEMINI_MODEL || '').trim();

  // Migrasi otomatis: cegah nilai lama memaksakan model 3.8 Flash atau 2.5 Flash
  if (configuredModel && OBSOLETE_OR_EXPENSIVE_GEMINI_MODELS.includes(configuredModel)) {
    console.log(`[AI Config] Migrasi otomatis model lama '${configuredModel}' di database ke '${DEFAULT_GEMINI_PRIMARY_MODEL}'`);
    if (dbInstance && dbInstance.settings) {
      dbInstance.settings.geminiModel = DEFAULT_GEMINI_PRIMARY_MODEL;
    }
    configuredModel = DEFAULT_GEMINI_PRIMARY_MODEL;
  }

  if (envModel && OBSOLETE_OR_EXPENSIVE_GEMINI_MODELS.includes(envModel)) {
    envModel = DEFAULT_GEMINI_PRIMARY_MODEL;
  }

  const primaryModel = configuredModel || envModel || DEFAULT_GEMINI_PRIMARY_MODEL;
  const fallbackModel = DEFAULT_GEMINI_FALLBACK_MODEL;

  const candidateModels = Array.from(new Set([
    primaryModel,
    fallbackModel
  ])).filter(Boolean);

  return {
    apiKey,
    primaryModel,
    fallbackModel,
    candidateModels
  };
}
