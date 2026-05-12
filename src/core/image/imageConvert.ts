import { ImageTensor } from '../../types/image';

const MAX_UPLOAD_LONG_EDGE = 4096;
const MAX_UPLOAD_PIXELS = 12_000_000;

export interface ImageTensorConversionResult {
  tensor: ImageTensor;
  originalWidth: number;
  originalHeight: number;
  resized: boolean;
}

export function imageToTensor(img: HTMLImageElement): ImageTensorConversionResult {
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;
  const scale = getSafeUploadScale(originalWidth, originalHeight);
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  return {
    tensor: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      data: imageData.data,
    },
    originalWidth,
    originalHeight,
    resized: targetWidth !== originalWidth || targetHeight !== originalHeight,
  };
}

function getSafeUploadScale(width: number, height: number): number {
  const longEdgeScale = MAX_UPLOAD_LONG_EDGE / Math.max(width, height);
  const pixelScale = Math.sqrt(MAX_UPLOAD_PIXELS / (width * height));
  return Math.min(1, longEdgeScale, pixelScale);
}
