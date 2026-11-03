// =============================================================================
// Client-Side Image Compressor for Student Answer Handwriting & Diagrams
// EmployaSkills - Branch: migration/supabase-staging
// Target:
//   - Compress high-res camera photos to 300-500 KB
//   - Preserve maximum legibility for handwriting, math formulas, and chemical symbols
//   - Max canvas resolution 1920x1920 with high-quality bicubic smoothing
//   - Does NOT compress PDFs or audio files
// =============================================================================

export interface ImageCompressionResult {
  file: File | Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Kompresi foto tulisan tangan / gambar jawaban siswa di browser.
 * Target: 300 - 500 KB, menjaga keterbacaan tulisan dan rumus.
 */
export async function compressAnswerImage(
  fileOrBlob: File | Blob,
  fileName = 'jawaban_siswa.jpg'
): Promise<ImageCompressionResult> {
  const originalSize = fileOrBlob.size;

  // Jika bukan gambar (misal PDF atau dokumen), jangan dikompresi
  if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
    const dataUrl = await blobToDataUrl(fileOrBlob);
    return {
      file: fileOrBlob,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      mimeType: fileOrBlob.type,
      width: 0,
      height: 0
    };
  }

  // Jika ukuran sudah di bawah 350 KB, tidak perlu kompresi ulang agar ketajaman 100% terjaga
  if (originalSize <= 350 * 1024) {
    const dataUrl = await blobToDataUrl(fileOrBlob);
    return {
      file: fileOrBlob,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      mimeType: fileOrBlob.type || 'image/jpeg',
      width: 0,
      height: 0
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIMENSION = 1920; // 1080p - 1440p setara, sangat tajam untuk membaca rumus & tulisan tangan
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const fallbackUrl = await blobToDataUrl(fileOrBlob);
        return resolve({
          file: fileOrBlob,
          dataUrl: fallbackUrl,
          originalSize,
          compressedSize: originalSize,
          mimeType: fileOrBlob.type,
          width: img.width,
          height: img.height
        });
      }

      // Aktifkan anti-aliasing berkualitas tinggi untuk teks tajam
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Latar belakang putih untuk menangani PNG transparan menjadi JPEG yang rapi
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Iterasi kualitas kompresi target 300 - 500 KB
      const qualities = [0.85, 0.78, 0.70, 0.62];
      let bestBlob: Blob | null = null;
      let bestQuality = 0.85;

      for (const q of qualities) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', q);
        bestBlob = blob;
        bestQuality = q;
        // Jika ukuran sudah di bawah 500 KB, hentikan iterasi untuk mempertahankan kualitas visual
        if (blob.size <= 500 * 1024) {
          break;
        }
      }

      if (!bestBlob) {
        bestBlob = await canvasToBlob(canvas, 'image/jpeg', 0.75);
      }

      const compressedFile = new File([bestBlob], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const compressedDataUrl = canvas.toDataURL('image/jpeg', bestQuality);

      resolve({
        file: compressedFile,
        dataUrl: compressedDataUrl,
        originalSize,
        compressedSize: bestBlob.size,
        mimeType: 'image/jpeg',
        width,
        height
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat gambar untuk proses kompresi.'));
    };

    img.src = objectUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob || new Blob([], { type: mimeType }));
      },
      mimeType,
      quality
    );
  });
}
