/**
 * Utility resolusi URL bukti media aman (EmployaSkills - Cloudflare R2 & Private Storage)
 *
 * Aturan Keamanan & Integritas:
 * 1. Tidak pernah menyisipkan JWT login utama pada query parameter (?token=...).
 * 2. Mengambil presigned GET URL berumur pendek (15 menit) langsung ke Cloudflare R2 setelah otorisasi.
 * 3. Jika fallback lokal aktif, menggunakan Scoped File Token terikat storageKey.
 * 4. Multi-tenant: Mendukung key ter-encode (%2F) dan normalisasi jalur berkas.
 * 5. Auto-refresh saat token/URL mendekati masa kedaluwarsa.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { getAuthToken, resolveApiUrl } from '../services/api';

const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Normalisasi storage key dari URL atau path mentah.
 * Menghilangkan prefix API dan mendekode ganda (%2F -> /).
 */
export function extractCanonicalStorageKey(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let key = raw.trim();

  // Format inline base64 atau blob tidak dinormalisasi
  if (key.startsWith('data:') || key.startsWith('blob:')) {
    return key;
  }

  // Bersihkan prefix endpoint
  if (key.startsWith('/api/evidence/r2/')) {
    key = key.replace(/^\/api\/evidence\/r2\//, '');
  } else if (key.startsWith('api/evidence/r2/')) {
    key = key.replace(/^api\/evidence\/r2\//, '');
  } else if (key.startsWith('/api/evidence/file/')) {
    key = key.replace(/^\/api\/evidence\/file\//, '');
  } else if (key.startsWith('api/evidence/file/')) {
    key = key.replace(/^api\/evidence\/file\//, '');
  }

  // Hilangkan query string
  key = key.split('?')[0];

  // Dekode rekursif untuk mencegah double-encoding
  try {
    let prev = '';
    while (key !== prev && (key.includes('%25') || key.includes('%2F') || key.includes('%2f') || key.includes('%20') || key.includes('%3A') || key.includes('%3a'))) {
      prev = key;
      key = decodeURIComponent(key);
    }
  } catch (_) {}

  return key.replace(/^\/+/, '');
}

/**
 * Mengambil Presigned GET URL R2 berumur pendek (15 menit) melalui API backend yang terotentikasi.
 */
export async function resolveEvidenceMediaUrl(urlOrKey?: string): Promise<string> {
  if (!urlOrKey || typeof urlOrKey !== 'string') return '';

  const clean = urlOrKey.trim();

  // Format lokal sementara atau inline data base64 langsung aman
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Jika sudah memiliki signature S3 presigned URL aktif atau fileToken khusus, gunakan langsung
  if (clean.includes('X-Amz-Signature') || clean.includes('fileToken=')) {
    return clean;
  }

  // Ekstrak storageKey kanonikal
  const storageKey = extractCanonicalStorageKey(clean);
  if (!storageKey) return clean;

  // Cek cache memori (buffer 60 detik sebelum kedaluwarsa)
  const cached = presignedUrlCache.get(storageKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  try {
    const token = getAuthToken() ||
      localStorage.getItem('voc_token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('voc_token') ||
      sessionStorage.getItem('auth_token');

    const downloadEndpoint = resolveApiUrl('/api/storage/presigned-download');

    const response = await fetch(downloadEndpoint, {
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
        let resolvedDownloadUrl = data.downloadUrl;

        // Jika URL berupa relative path lokal, sesuaikan dengan resolveApiUrl
        if (resolvedDownloadUrl.startsWith('/api')) {
          resolvedDownloadUrl = resolveApiUrl(resolvedDownloadUrl);
        }

        presignedUrlCache.set(storageKey, {
          url: resolvedDownloadUrl,
          expiresAt: now + expiresInSec * 1000
        });

        return resolvedDownloadUrl;
      }
    } else {
      console.warn(`[EvidenceUrlHelper] Presigned download request returned status ${response.status}`);
    }
  } catch (err) {
    console.warn('[EvidenceUrlHelper] Gagal mengambil presigned URL, fallback ke URL dasar:', err);
  }

  // Fallback ke format URL dasar yang di-resolve
  return resolveApiUrl(clean.startsWith('/') ? clean : `/api/evidence/r2/${encodeURIComponent(storageKey)}`);
}

/**
 * Hook React untuk resolusi reaktif URL bukti terotorisasi dengan auto-refresh.
 */
export function useEvidenceUrl(urlOrKey?: string): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!urlOrKey) return '';
    if (urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:') || urlOrKey.includes('X-Amz-Signature') || urlOrKey.includes('fileToken=')) {
      return urlOrKey;
    }
    const key = extractCanonicalStorageKey(urlOrKey);
    const cached = presignedUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now() + 30000) {
      return cached.url;
    }
    return '';
  });

  useEffect(() => {
    let isMounted = true;
    if (!urlOrKey) {
      setResolved('');
      return;
    }

    resolveEvidenceMediaUrl(urlOrKey)
      .then((url) => {
        if (isMounted) {
          setResolved(url);
        }
      })
      .catch(() => {
        if (isMounted) setResolved(urlOrKey);
      });

    return () => {
      isMounted = false;
    };
  }, [urlOrKey]);

  return resolved || urlOrKey || '';
}

/**
 * Komponen gambar aman yang secara otomatis mengambil Presigned GET URL R2
 * tanpa mengekspos JWT login utama pada browser native request.
 */
export function SecureEvidenceImage({
  src,
  alt = 'Bukti Asesmen Siswa',
  className = '',
  onClick,
  title,
  style
}: {
  src?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  const resolvedUrl = useEvidenceUrl(src);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setHasError(false);
  }, [src, resolvedUrl, retryCount]);

  if (!src) return null;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-3 text-center bg-slate-900 border border-slate-800 rounded text-slate-400 text-xs ${className}`}
        style={style}
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 mb-1" />
        <span className="text-[11px] font-medium">Foto bukti tidak dapat dimuat</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (src) {
              const key = extractCanonicalStorageKey(src);
              presignedUrlCache.delete(key);
            }
            setRetryCount((prev) => prev + 1);
          }}
          className="mt-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl || src}
      alt={alt}
      className={className}
      onClick={onClick}
      title={title}
      style={style}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

/**
 * Komponen pemutar audio aman untuk bukti rekaman suara.
 */
export function SecureEvidenceAudio({
  src,
  className = 'w-full h-8',
  controls = true,
  onLoadedMetadata
}: {
  src?: string;
  className?: string;
  controls?: boolean;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
}) {
  const resolvedUrl = useEvidenceUrl(src);

  if (!src) return null;

  return (
    <audio
      src={resolvedUrl || src}
      controls={controls}
      className={className}
      preload="metadata"
      onLoadedMetadata={onLoadedMetadata}
    />
  );
}

/**
 * Helper unduh berkas bukti asli dengan penanganan Cross-Origin Presigned S3/R2 URL.
 */
export async function downloadEvidenceFile(urlOrKey?: string, fileName?: string): Promise<void> {
  if (!urlOrKey) return;

  const resolvedUrl = await resolveEvidenceMediaUrl(urlOrKey);
  const effectiveName = fileName || 'berkas_bukti_employaskills';

  try {
    // Upayakan unduh via blob agar nama berkas sesuai dan tidak membuka tab baru
    const response = await fetch(resolvedUrl);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = effectiveName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch (err) {
    console.warn('[EvidenceUrlHelper] Unduh langsung via blob gagal, membuka direct link:', err);
  }

  // Fallback jika CORS fetch blob dibatasi: trigger anchor direct
  const a = document.createElement('a');
  a.href = resolvedUrl;
  a.target = '_blank';
  a.rel = 'noreferrer';
  a.download = effectiveName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
