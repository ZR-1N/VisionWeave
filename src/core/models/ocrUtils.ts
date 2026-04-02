import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';

/**
 * Preprocess for OCR Detection (DB Net)
 * 1. Resize with padding to 640x640
 * 2. Normalize with Mean [0.798, 0.785, 0.772] and Std [0.264, 0.274, 0.287]
 * 3. Convert to NCHW Float32Array
 */
export function preprocessDetection(input: ImageTensor): { tensor: ort.Tensor; scale: number; padding: { x: number, y: number } } {
  const targetSize = 640;
  const { width, height, data } = input;

  const scale = Math.min(targetSize / width, targetSize / height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  
  const padX = Math.floor((targetSize - newWidth) / 2);
  const padY = Math.floor((targetSize - newHeight) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  
  // Fill with mean color or just black (doctr uses padding then normalization)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetSize, targetSize);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCanvas.getContext('2d')!.putImageData(new ImageData(data, width, height), 0, 0);
  
  ctx.drawImage(tempCanvas, 0, 0, width, height, padX, padY, newWidth, newHeight);
  const resizedData = ctx.getImageData(0, 0, targetSize, targetSize).data;

  const float32Data = new Float32Array(3 * targetSize * targetSize);
  const mean = [0.798, 0.785, 0.772];
  const std = [0.264, 0.274, 0.287];

  for (let i = 0; i < targetSize * targetSize; i++) {
    const r = resizedData[i * 4] / 255.0;
    const g = resizedData[i * 4 + 1] / 255.0;
    const b = resizedData[i * 4 + 2] / 255.0;

    float32Data[i] = (r - mean[0]) / std[0];
    float32Data[i + targetSize * targetSize] = (g - mean[1]) / std[1];
    float32Data[i + 2 * targetSize * targetSize] = (b - mean[2]) / std[2];
  }

  const tensor = new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
  return { tensor, scale, padding: { x: padX, y: padY } };
}

/**
 * CTC Greedy Decoder for Recognition
 */
export function decodeCTC(logits: Float32Array, shape: number[], vocab: string[]): string {
  const [batch, seqLen, numClasses] = shape;
  let decoded = "";
  let lastCharIdx = -1;

  for (let t = 0; lastCharIdx !== -2 && t < seqLen; t++) {
    let maxProb = -Infinity;
    let maxIdx = -1;

    for (let c = 0; c < numClasses; c++) {
      const prob = logits[t * numClasses + c];
      if (prob > maxProb) {
        maxProb = prob;
        maxIdx = c;
      }
    }

    // Blank token is usually the last one in doctr
    const blankIdx = numClasses - 1;

    if (maxIdx !== blankIdx && maxIdx !== lastCharIdx) {
      decoded += vocab[maxIdx];
    }
    lastCharIdx = maxIdx;
  }

  return decoded;
}
