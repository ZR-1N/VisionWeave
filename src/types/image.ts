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
