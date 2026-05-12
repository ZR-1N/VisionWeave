import { PresetKernel } from '../../types/image';

export const KERNEL_PRESETS: PresetKernel[] = [
  {
    name: '原图保持 (Original)',
    size: 3,
    kernel: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    normalize: false
  },
  {
    name: '基础降噪 (Soft Blur)',
    size: 3,
    kernel: [
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9
    ],
    normalize: false // Already normalized by fractions
  },
  {
    name: '老照片柔化 (Soft Focus 3x3)',
    size: 3,
    kernel: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    normalize: true
  },
  {
    name: '降噪预处理 (Denoise Prep 5x5)',
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
    name: '锐利扫描 (Sharp Scan)',
    size: 3,
    kernel: [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ],
    normalize: false
  },
  {
    name: '漫画线稿 (Comic Line Art)',
    size: 3,
    kernel: [
      -1, -1, -1,
      -1,  8, -1,
      -1, -1, -1
    ],
    normalize: false
  },
  {
    name: '金属压花 (Emboss)',
    size: 3,
    kernel: [
      -2, -1,  0,
      -1,  1,  1,
       0,  1,  2
    ],
    normalize: false
  },
  {
    name: '文档边缘增强 (Document Edge X)',
    size: 3,
    kernel: [
      -1,  0,  1,
      -2,  0,  2,
      -1,  0,  1
    ],
    normalize: false
  },
  {
    name: '手绘轮廓 (Sketch Edge Y)',
    size: 3,
    kernel: [
      -1, -2, -1,
       0,  0,  0,
       1,  2,  1
    ],
    normalize: false
  },
  {
    name: '纹理增强 (Texture Boost)',
    size: 3,
    kernel: [
       0,  1,  0,
       1, -4,  1,
       0,  1,  0
    ],
    normalize: false
  }
];
