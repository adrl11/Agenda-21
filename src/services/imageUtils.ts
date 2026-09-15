/**
 * Utility for processing and compressing school and local government logo images
 * for inclusion in the letterhead (Kop Surat) and localStorage/Firestore persistence.
 */

export interface ProcessedLogoResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  width: number;
  height: number;
  reductionPercent: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function estimateBase64Size(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((base64Str.length * 3) / 4);
}

/**
 * Validates, resizes, and compresses logo images.
 * Caps dimension at 240px (optimal for ~2cm letterhead print at >250 DPI)
 * while preserving transparency for PNGs and keeping file sizes under 50KB.
 */
export async function processLogoFile(
  file: File, 
  maxDimension: number = 240
): Promise<ProcessedLogoResult> {
  // 1. Validate MIME type
  const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
    throw new Error('Format file tidak didukung. Silakan gunakan gambar PNG, JPG, WebP, atau SVG.');
  }

  // 2. Allow generous initial upload limit (up to 15MB) for raw phone/camera scans
  const MAX_INPUT_BYTES = 15 * 1024 * 1024;
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Ukuran file awal terlalu besar (maksimal 15 MB). Silakan pilih gambar lain.');
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;

      // Special case: Vector SVG
      if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
        const compressedSize = estimateBase64Size(rawDataUrl);
        const reduction = originalSize > 0 
          ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
          : 0;

        resolve({
          dataUrl: rawDataUrl,
          originalSize,
          compressedSize,
          originalSizeFormatted: formatBytes(originalSize),
          compressedSizeFormatted: formatBytes(compressedSize),
          width: 240,
          height: 240,
          reductionPercent: reduction,
        });
        return;
      }

      // Raster image: process via HTML5 Canvas
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width <= 0 || height <= 0) {
            throw new Error('Dimensi gambar tidak valid.');
          }

          // Calculate aspect ratio preserving dimensions
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('Gagal menginisialisasi canvas pemrosesan gambar.');
          }

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Check if the image has any transparent pixels
          let hasTransparency = false;
          try {
            const imageData = ctx.getImageData(0, 0, width, height).data;
            for (let i = 3; i < imageData.length; i += 4) {
              if (imageData[i] < 250) {
                hasTransparency = true;
                break;
              }
            }
          } catch {
            // Default to PNG if pixel reading is blocked by security context
            hasTransparency = true;
          }

          // Choose optimal compression format:
          // - Transparent logos: use PNG to preserve crisp transparent background
          // - Non-transparent logos: use JPEG at 0.88 quality for ultra-compact file
          let finalDataUrl = '';
          if (hasTransparency) {
            finalDataUrl = canvas.toDataURL('image/png');
          } else {
            finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }

          const compressedSize = estimateBase64Size(finalDataUrl);
          const reduction = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
            : 0;

          resolve({
            dataUrl: finalDataUrl,
            originalSize,
            compressedSize,
            originalSizeFormatted: formatBytes(originalSize),
            compressedSizeFormatted: formatBytes(compressedSize),
            width,
            height,
            reductionPercent: reduction,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Gagal mengompresi gambar.';
          reject(new Error(msg));
        }
      };

      img.onerror = () => {
        reject(new Error('File gambar rusak atau tidak dapat dimuat oleh browser.'));
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari penyimpanan perangkat.'));
    };

    reader.readAsDataURL(file);
  });
}
