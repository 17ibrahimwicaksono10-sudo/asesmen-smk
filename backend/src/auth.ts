import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Role, User, SystemSettings } from './types';
import { getDatabasePaths } from './db';

// Cryptographically secure secret key resolution
function resolveAuthSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim();
  }

  try {
    const { targetDir } = getDatabasePaths();
    const secretPath = path.join(targetDir, '.auth_secret');
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const newSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
    return newSecret;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const AUTH_SECRET = resolveAuthSecret();
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthPayload {
  userId: string;
  id?: string;
  email: string;
  name: string;
  role: Role;
  identityNo?: string;
  nis?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  iat: number;
  exp: number;
}

// Extend Express Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

/**
 * Hash password using Node.js crypto.scryptSync with a unique cryptographically secure salt
 */
export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored hash (scrypt) or legacy plaintext with timing attack protection
 */
export function verifyPassword(password: string, storedHashOrPlain?: string): boolean {
  if (!storedHashOrPlain || !password) return false;

  if (storedHashOrPlain.startsWith('scrypt:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const key = parts[2];
    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const keyBuf = Buffer.from(key, 'hex');
      return keyBuf.length === derivedKey.length && crypto.timingSafeEqual(keyBuf, derivedKey);
    } catch {
      return false;
    }
  }

  // Legacy plaintext fallback (safe string comparison to protect against timing attacks)
  const passBuf = Buffer.from(password);
  const storedBuf = Buffer.from(storedHashOrPlain);
  if (passBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(passBuf, storedBuf);
}

/**
 * Generate a cryptographically signed HMAC-SHA256 token
 */
export function generateAuthToken(user: User): string {
  const now = Date.now();
  const payload: AuthPayload = {
    userId: user.id,
    id: user.id,
    email: (user.email || '').toLowerCase(),
    name: user.name,
    role: user.role,
    identityNo: user.identityNo,
    nis: (user as any).nis || user.identityNo,
    schoolId: user.schoolId,
    schoolName: user.schoolName,
    classId: user.classId,
    className: user.className,
    iat: now,
    exp: now + TOKEN_MAX_AGE_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 token
 */
export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return null;
    }

    const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: AuthPayload = JSON.parse(payloadStr);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    if (!payload.id && payload.userId) payload.id = payload.userId;
    if (!payload.userId && payload.id) payload.userId = payload.id;

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Requires a valid Bearer token in Authorization header
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Sesi login telah kedaluwarsa atau tidak valid. Silakan login kembali.',
      code: 'TOKEN_INVALID',
    });
  }

  req.user = payload;
  next();
}

/**
 * Optional Auth Middleware: Extracts user if token is provided, otherwise continues
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyAuthToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/**
 * Middleware: Requires user to have one of the allowed roles
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autentikasi diperlukan.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak. Fitur ini memerlukan peran: ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Strips password and sensitive credentials from User object
 */
export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...safe } = user;
  return safe;
}

/**
 * Strips API keys and provider credentials from SystemSettings
 */
export function sanitizeSettings(settings: SystemSettings): Record<string, any> {
  const safe = { ...settings };
  // Redact secrets
  delete (safe as any).deepseekApiKey;
  delete (safe as any).geminiApiKey;
  if (Array.isArray(safe.providers)) {
    safe.providers = safe.providers.map(p => ({
      ...p,
      apiKey: p.apiKey ? '********' : '',
    }));
  }
  return safe;
}

// =============================================================================
// TOKEN AKSES FILE KHUSUS (SCOPED FILE TOKEN)
// Mencegah kebocoran JWT login utama pada query parameter (?token=...)
// Memiliki masa berlaku pendek (default 5 menit) dan terikat pada storageKey spesifik.
// =============================================================================

export interface ScopedFileTokenPayload {
  tokenType: 'scoped_file_token';
  userId: string;
  role: Role;
  schoolId?: string;
  storageKey: string;
  iat: number;
  exp: number;
}

export function generateScopedFileToken(params: {
  userId: string;
  role: Role;
  schoolId?: string;
  storageKey: string;
  expiresInSeconds?: number;
}): string {
  const now = Date.now();
  const ttlMs = (params.expiresInSeconds || 300) * 1000;
  const payload: ScopedFileTokenPayload = {
    tokenType: 'scoped_file_token',
    userId: params.userId,
    role: params.role,
    schoolId: params.schoolId,
    storageKey: params.storageKey,
    iat: now,
    exp: now + ttlMs,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET + '_file_scope')
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifyScopedFileToken(token: string, expectedStorageKey: string): ScopedFileTokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET + '_file_scope')
      .update(payloadBase64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedSigBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return null;

    const payload: ScopedFileTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.tokenType !== 'scoped_file_token') return null;

    if (Date.now() > payload.exp) {
      return null;
    }

    if (payload.storageKey !== expectedStorageKey) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}
