/**
 * Utility resolusi URL bukti media aman (EmployaSkills - Cloudflare R2 & Private Storage)
 *
 * Aturan Keamanan:
 * 1. Tidak pernah menyisipkan JWT login utama pada query parameter (?token=...).
 * 2. Mengambil presigned GET URL berumur pendek (15 menit) langsung ke R2.
 * 3. Jika fallback lokal, menggunakan Scoped File Token terikat storageKey.
 */

const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function resolveEvidenceMediaUrl(urlOrKey?: string): Promise<string> {
  if (!urlOrKey || typeof urlOrKey !== 'string') return '';

  const clean = urlOrKey.trim();
  // Format lokal sementara atau inline data base64 langsung aman
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Jika sudah memiliki presigned signature AWS S3/R2 atau fileToken khusus, gunakan langsung
  if (clean.includes('X-Amz-Signature') || clean.includes('fileToken=')) {
    return clean;
  }

  // Ekstrak storageKey kanonikal
  let storageKey = clean;
  if (storageKey.startsWith('/api/evidence/r2/')) {
    storageKey = decodeURIComponent(storageKey.replace('/api/evidence/r2/', ''));
  }

  // Cek cache memori (buffer 60 detik sebelum expired)
  const cached = presignedUrlCache.get(storageKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  try {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const response = await fetch('/api/storage/presigned-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ storageKey })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.downloadUrl) {
        const expiresInSec = data.expiresIn || 900;
        presignedUrlCache.set(storageKey, {
          url: data.downloadUrl,
          expiresAt: now + expiresInSec * 1000
        });
        return data.downloadUrl;
      }
    }
  } catch (err) {
    console.warn('[EvidenceUrlHelper] Gagal mengambil presigned URL, fallback ke URL dasar:', err);
  }

  return clean;
}
