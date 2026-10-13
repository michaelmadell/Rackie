// Shrinks images in the browser before upload: re-encoded as WebP (JPEG where the
// browser can't write WebP), keeping full detail up to 4096px on the long edge,
// which is a 12-megapixel phone photo at full size. Other files are sent as they
// are and compressed by the server if that helps.

const MAX_EDGE = 4096;
const PHOTO_QUALITY = 0.85; // photos: visually lossless for documentation
const GRAPHIC_QUALITY = 0.92; // PNG screenshots/diagrams: keep text crisp
const THUMB_EDGE = 400;

export type Prepared = {
  blob: Blob;
  name: string;
  type: string;
  originalSize: number;
  thumb?: Blob;
};

// Formats the browser can decode and that are worth re-encoding (not GIF: may be animated; not SVG: vector).
const REENCODE = /^image\/(jpeg|png|webp|bmp|avif)$/;

async function encode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  // Safari can't write WebP: use JPEG on a white background (JPEG has no transparency).
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return (await toBlob('image/jpeg'))!;
}

const renamed = (name: string, type: string) =>
  `${name.replace(/\.[^.]+$/, '') || 'image'}.${type === 'image/webp' ? 'webp' : 'jpg'}`;

export async function prepareUpload(file: File): Promise<Prepared> {
  const original: Prepared = { blob: file, name: file.name, type: file.type || 'application/octet-stream', originalSize: file.size };
  if (!REENCODE.test(file.type)) return original;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the photo's EXIF rotation
  } catch {
    return original; // a format this browser can't open: upload unchanged
  }
  try {
    const thumb = await encode(bitmap, THUMB_EDGE, 0.75);
    const smaller = await encode(bitmap, MAX_EDGE, file.type === 'image/png' ? GRAPHIC_QUALITY : PHOTO_QUALITY);
    // Keep the original if re-encoding wouldn't save at least 10% (already well compressed).
    if (smaller.size > file.size * 0.9) return { ...original, thumb };
    return { blob: smaller, name: renamed(file.name, smaller.type), type: smaller.type, originalSize: file.size, thumb };
  } finally {
    bitmap.close();
  }
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;