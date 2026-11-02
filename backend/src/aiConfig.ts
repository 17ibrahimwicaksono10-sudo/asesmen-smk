import { getDb } from './db';

export interface GeminiConfig {
  apiKey: string;
  primaryModel: string;
  candidateModels: string[];
}

export const DEFAULT_GEMINI_PRIMARY_MODEL = 'gemini-3.8-flash';
export const DEFAULT_GEMINI_ALTERNATIVE_MODEL = 'gemini-3-flash-preview';

/**
 * Daftar resmi model Gemini 3 yang didukung sistem EmployaSkills.
 * Model utama default: gemini-3.8-flash
 * Model alternatif pengujian: gemini-3-flash-preview
 */
export const OFFICIAL_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite'
] as const;

/**
 * Konfigurasi terpusat Gemini Model:
 * 1. Prioritas 1: Pengaturan tersimpan di Database Admin (db.settings.geminiModel)
 * 2. Prioritas 2: Environment Variable process.env.GEMINI_MODEL
 * 3. Default: gemini-3.8-flash
 */
export function getGeminiConfig(): GeminiConfig {
  let dbSettings: any = {};
  try {
    const db = getDb();
    dbSettings = (db && db.settings) || {};
  } catch {
    dbSettings = {};
  }

  const apiKey = dbSettings.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const configuredModel = dbSettings.geminiModel || process.env.GEMINI_MODEL || DEFAULT_GEMINI_PRIMARY_MODEL;

  // Bangun urutan model kandidat tanpa duplikat
  const candidateModels = Array.from(new Set([
    configuredModel,
    DEFAULT_GEMINI_PRIMARY_MODEL,
    DEFAULT_GEMINI_ALTERNATIVE_MODEL
  ])).filter(Boolean);

  return {
    apiKey,
    primaryModel: candidateModels[0],
    candidateModels
  };
}
