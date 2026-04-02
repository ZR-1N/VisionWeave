import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';

/**
 * Post-process: NCHW Float32 Tensor -> RGBA ImageTensor (0-255)
 */
export function postprocess(tensor: ort.Tensor, width: number, height: number): ImageTensor {
  const size = width * height;
  const float32Data = tensor.data as Float32Array;
  
  // Create RGBA Uint8ClampedArray
  const rgbaData = new Uint8ClampedArray(4 * size);
  
  // NCHW offsets
  const rOffset = 0;
  const gOffset = size;
  const bOffset = 2 * size;

  for (let i = 0; i < size; i++) {
    const rgbaIndex = i * 4;
    
    // Scale back to [0, 255] and clamp
    rgbaData[rgbaIndex] = Math.max(0, Math.min(255, float32Data[rOffset + i] * 255.0));
    rgbaData[rgbaIndex + 1] = Math.max(0, Math.min(255, float32Data[gOffset + i] * 255.0));
    rgbaData[rgbaIndex + 2] = Math.max(0, Math.min(255, float32Data[bOffset + i] * 255.0));
    rgbaData[rgbaIndex + 3] = 255; // Fully opaque Alpha
  }

  return {
    width,
    height,
    channels: 4,
    data: rgbaData,
  };
}
