export interface ImageTensor {
  width: number;
  height: number;
  channels: number; // usually 4 for RGBA
  data: Uint8ClampedArray; // pixel data
}

export type KernelSize = 3 | 5 | 7;

export interface ConvolutionParams {
  kernel: number[]; // Flattened kernel matrix
  kernelSize: KernelSize;
  stride: number;
  padding: number;
  bias: number;
  normalize: boolean;
  clip: boolean;
  grayscale: boolean;
}

export interface PresetKernel {
  name: string;
  kernel: number[];
  size: KernelSize;
  normalize?: boolean;
}

export type NonLinearFilterType = 'median' | 'bilateral' | 'dilation' | 'erosion' | 'adaptive_threshold' | 'detail_enhance';

export interface NonLinearFilterParams {
  type: NonLinearFilterType;
  radius: number;
  sigmaS?: number; // Spatial sigma for Bilateral
  sigmaR?: number; // Range sigma for Bilateral
  constant?: number; // Constant for Adaptive Threshold
  amount?: number; // Amount for Detail Enhancement
}

export interface OCRResult {
  box: [number, number, number, number]; // [x1, y1, x2, y2] relative to original image
  text: string;
  confidence: number;
}
