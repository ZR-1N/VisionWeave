import { PresetKernel } from '../../types/image';

export const KERNEL_PRESETS: PresetKernel[] = [
  {
    name: 'Identity',
    size: 3,
    kernel: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    normalize: false
  },
  {
    name: 'Blur',
    size: 3,
    kernel: [
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9
    ],
    normalize: false // Already normalized by fractions
  },
  {
    name: 'Gaussian Blur (3x3)',
    size: 3,
    kernel: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    normalize: true
  },
  {
    name: 'Gaussian Blur (5x5)',
    size: 5,
    kernel: [
      1,  4,  6,  4, 1,
      4, 16, 24, 16, 4,
      6, 24, 36, 24, 6,
      4, 16, 24, 16, 4,
      1,  4,  6,  4, 1
    ],
    normalize: true
  },
  {
    name: 'Sharpen',
    size: 3,
    kernel: [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ],
    normalize: false
  },
  {
    name: 'Edge Detection',
    size: 3,
    kernel: [
      -1, -1, -1,
      -1,  8, -1,
      -1, -1, -1
    ],
    normalize: false
  },
  {
    name: 'Emboss',
    size: 3,
    kernel: [
      -2, -1,  0,
      -1,  1,  1,
       0,  1,  2
    ],
    normalize: false
  },
  {
    name: 'Sobel X',
    size: 3,
    kernel: [
      -1,  0,  1,
      -2,  0,  2,
      -1,  0,  1
    ],
    normalize: false
  },
  {
    name: 'Sobel Y',
    size: 3,
    kernel: [
      -1, -2, -1,
       0,  0,  0,
       1,  2,  1
    ],
    normalize: false
  },
  {
    name: 'Laplacian',
    size: 3,
    kernel: [
       0,  1,  0,
       1, -4,  1,
       0,  1,  0
    ],
    normalize: false
  }
];
