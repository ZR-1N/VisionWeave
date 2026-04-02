import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';

/**
 * Preprocess: ImageData (RGBA) -> Float32 Tensor (NCHW, normalized to [0, 1], RGB)
 */
export function preprocess(input: ImageTensor): ort.Tensor {
  const { width, height, data } = input;
  const size = width * height;

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

  return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
}

/**
 * Extracts a sub-region (tile) from an ImageTensor
 */
export function extractTile(input: ImageTensor, x: number, y: number, w: number, h: number): ImageTensor {
  const tileData = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcRow = y + row;
    const srcOffset = (srcRow * input.width + x) * 4;
    const destOffset = row * w * 4;

    // Boundary check for safety
    if (srcRow >= 0 && srcRow < input.height) {
      tileData.set(input.data.subarray(srcOffset, srcOffset + w * 4), destOffset);
    }
  }
  return { width: w, height: h, channels: 4, data: tileData };
}
