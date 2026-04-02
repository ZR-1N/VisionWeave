import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';

/**
 * Preprocess: ImageData (RGBA) -> Float32 Tensor (NCHW, normalized to [0, 1], RGB)
 * Includes a safety resize step for very large images to prevent WebGPU memory overflow.
 */
export function preprocess(input: ImageTensor): { tensor: ort.Tensor; resizedWidth: number; resizedHeight: number } {
  const MAX_AI_DIMENSION = 1280; // Safety limit for WebGPU VRAM
  let { width, height, data } = input;

  let targetWidth = width;
  let targetHeight = height;

  // 1. Calculate safety dimensions
  if (width > MAX_AI_DIMENSION || height > MAX_AI_DIMENSION) {
    const ratio = Math.min(MAX_AI_DIMENSION / width, MAX_AI_DIMENSION / height);
    targetWidth = Math.floor(width * ratio);
    targetHeight = Math.floor(height * ratio);

    // Perform resize using an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw original data to canvas then get resized data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d')!.putImageData(new ImageData(data, width, height), 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
    data = new Uint8ClampedArray(ctx.getImageData(0, 0, targetWidth, targetHeight).data.buffer);
  }

  const size = targetWidth * targetHeight;
  const float32Data = new Float32Array(3 * size);

  const rOffset = 0;
  const gOffset = size;
  const bOffset = 2 * size;

  for (let i = 0; i < size; i++) {
    const rgbaIndex = i * 4;
    float32Data[rOffset + i] = data[rgbaIndex] / 255.0;
    float32Data[gOffset + i] = data[rgbaIndex + 1] / 255.0;
    float32Data[bOffset + i] = data[rgbaIndex + 2] / 255.0;
  }

  const tensor = new ort.Tensor('float32', float32Data, [1, 3, targetHeight, targetWidth]);
  return { tensor, resizedWidth: targetWidth, resizedHeight: targetHeight };
}
