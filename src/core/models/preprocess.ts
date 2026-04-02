import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';

/**
 * Preprocess: ImageData (RGBA) -> Float32 Tensor (NCHW, normalized to [0, 1], RGB)
 */
export function preprocess(input: ImageTensor): ort.Tensor {
  const { width, height, data } = input;
  const size = width * height;
  
  // Allocate memory for NCHW (1, 3, H, W)
  const float32Data = new Float32Array(3 * size);
  
  // R, G, B pointers
  const rOffset = 0;
  const gOffset = size;
  const bOffset = 2 * size;

  for (let i = 0; i < size; i++) {
    // RGBA index
    const rgbaIndex = i * 4;
    
    // Normalize and assign to NCHW slots
    float32Data[rOffset + i] = data[rgbaIndex] / 255.0;
    float32Data[gOffset + i] = data[rgbaIndex + 1] / 255.0;
    float32Data[bOffset + i] = data[rgbaIndex + 2] / 255.0;
    // Skip Alpha (rgbaIndex + 3)
  }

  // Create ONNX Tensor
  const tensor = new ort.Tensor('float32', float32Data, [1, 3, height, width]);
  return tensor;
}
