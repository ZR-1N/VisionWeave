import { PresetKernel } from '../../types/image';

export const KERNEL_PRESETS: PresetKernel[] = [
  {
    name: '原图保持 (Original)',
    category: 'enhance',
    size: 3,
    kernel: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    normalize: false,
    description: '不改变画面，适合对照观察其他预设效果。'
  },
  {
    name: '基础降噪 (Soft Blur)',
    category: 'blur',
    size: 3,
    kernel: [
      1 / 9, 1 / 9, 1 / 9,
      1 / 9, 1 / 9, 1 / 9,
      1 / 9, 1 / 9, 1 / 9
    ],
    normalize: false,
    description: '轻微柔化噪点，适合做后续增强前的基础预处理。'
  },
  {
    name: '老照片柔化 (Soft Focus 3x3)',
    category: 'blur',
    size: 3,
    kernel: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    normalize: true,
    description: '制造轻微柔焦感，适合复古和人像氛围。'
  },
  {
    name: '降噪预处理 (Denoise Prep 5x5)',
    category: 'blur',
    size: 5,
    kernel: [
      1, 4, 6, 4, 1,
      4, 16, 24, 16, 4,
      6, 24, 36, 24, 6,
      4, 16, 24, 16, 4,
      1, 4, 6, 4, 1
    ],
    normalize: true,
    description: '比 3x3 更强的平滑，适合 OCR 或边缘检测前的预处理。'
  },
  {
    name: '强均值模糊 (Box Blur 5x5)',
    category: 'blur',
    size: 5,
    kernel: [
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1
    ],
    normalize: true,
    description: '更明显的大核模糊，适合弱化细小噪点和背景纹理。'
  },
  {
    name: '横向运动模糊 (Motion Blur X)',
    category: 'blur',
    size: 5,
    kernel: [
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      1, 1, 1, 1, 1,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0
    ],
    normalize: true,
    description: '模拟横向拖影，视觉变化明显，适合做运动感效果。'
  },
  {
    name: '对角运动模糊 (Motion Blur Diagonal)',
    category: 'blur',
    size: 5,
    kernel: [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
      0, 0, 0, 0, 1
    ],
    normalize: true,
    description: '模拟斜向运动拖影，适合做动态海报感。'
  },
  {
    name: '锐利扫描 (Sharp Scan)',
    category: 'enhance',
    size: 3,
    kernel: [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ],
    normalize: false,
    description: '让文字和边缘更清楚，适合扫描件和轻度模糊图片。'
  },
  {
    name: '强锐化 (Sharpen Strong)',
    category: 'enhance',
    size: 3,
    kernel: [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ],
    normalize: false,
    description: '经典锐化核，边缘更清晰，整体画面更硬朗。'
  },
  {
    name: '超锐化 (Extreme Sharpen)',
    category: 'enhance',
    size: 3,
    kernel: [
      -1, -1, -1,
      -1, 9, -1,
      -1, -1, -1
    ],
    normalize: false,
    description: '纹理和边缘更强，但也更容易出现噪点与白边。'
  },
  {
    name: '反遮罩锐化 (Unsharp Mask Approx)',
    category: 'enhance',
    size: 3,
    kernel: [
      0, -1, 0,
      -1, 6, -1,
      0, -1, 0
    ],
    normalize: true,
    description: '更接近图像增强的稳健锐化，通常比极端锐化自然。'
  },
  {
    name: '文档文字锐化 (Document Sharpen)',
    category: 'document',
    size: 3,
    kernel: [
      0, -1, 0,
      -1, 7, -1,
      0, -1, 0
    ],
    normalize: true,
    description: '专门针对扫描件和票据文字，让笔画更实更利落。'
  },
  {
    name: '高通纹理增强 (High-Pass Texture)',
    category: 'enhance',
    size: 3,
    kernel: [
      -1, -1, -1,
      -1, 8, -1,
      -1, -1, -1
    ],
    normalize: false,
    bias: 128,
    description: '强化高频细节和纹理层次，适合砖墙、布料、纸张纹理。'
  },
  {
    name: '漫画线稿 (Comic Line Art)',
    category: 'artistic',
    size: 3,
    kernel: [
      -1, -1, -1,
      -1, 8, -1,
      -1, -1, -1
    ],
    normalize: false,
    bias: 255,
    description: '强化轮廓线，适合做漫画稿和娱乐展示。'
  },
  {
    name: '金属压花 (Emboss)',
    category: 'artistic',
    size: 3,
    kernel: [
      -2, -1, 0,
      -1, 1, 1,
      0, 1, 2
    ],
    normalize: false,
    bias: 128,
    description: '让表面像金属浮雕一样凸起，适合纹理装饰。'
  },
  {
    name: '压花：右下光源 (Emboss SE)',
    category: 'artistic',
    size: 3,
    kernel: [
      -2, -1, 0,
      -1, 1, 1,
      0, 1, 2
    ],
    normalize: false,
    bias: 128,
    description: '模拟右下打光的压花效果，立体感更明显。'
  },
  {
    name: '压花：左上光源 (Emboss NW)',
    category: 'artistic',
    size: 3,
    kernel: [
      2, 1, 0,
      1, 1, -1,
      0, -1, -2
    ],
    normalize: false,
    bias: 128,
    description: '改变光源方向，让画面呈现另一种浮雕层次。'
  },
  {
    name: '文档边缘增强 (Sobel X)',
    category: 'document',
    size: 3,
    kernel: [
      -1, 0, 1,
      -2, 0, 2,
      -1, 0, 1
    ],
    normalize: false,
    bias: 128,
    description: '更强调垂直边界，适合纸张文字列和文档边缘。'
  },
  {
    name: '手绘轮廓 (Sobel Y)',
    category: 'edge',
    size: 3,
    kernel: [
      -1, -2, -1,
      0, 0, 0,
      1, 2, 1
    ],
    normalize: false,
    bias: 128,
    description: '强调水平边缘，适合屋檐、线条和素描感效果。'
  },
  {
    name: '水平边缘检测 (Horizontal Edge)',
    category: 'edge',
    size: 3,
    kernel: [
      -1, -1, -1,
      0, 0, 0,
      1, 1, 1
    ],
    normalize: false,
    bias: 128,
    description: '专注检测水平结构，适合横线、地平线和文本行。'
  },
  {
    name: '垂直边缘检测 (Vertical Edge)',
    category: 'edge',
    size: 3,
    kernel: [
      -1, 0, 1,
      -1, 0, 1,
      -1, 0, 1
    ],
    normalize: false,
    bias: 128,
    description: '专注检测垂直结构，适合建筑轮廓和票据边界。'
  },
  {
    name: 'Laplacian 边缘 (4-Neighbour)',
    category: 'edge',
    size: 3,
    kernel: [
      0, 1, 0,
      1, -4, 1,
      0, 1, 0
    ],
    normalize: false,
    bias: 128,
    description: '标准二阶边缘核，适合观察整体轮廓变化。'
  },
  {
    name: '强 Laplacian 边缘 (8-Neighbour)',
    category: 'edge',
    size: 3,
    kernel: [
      1, 1, 1,
      1, -8, 1,
      1, 1, 1
    ],
    normalize: false,
    bias: 128,
    description: '更强烈的二阶边缘增强，适合结构纹理提取。'
  },
  {
    name: 'Prewitt X (Vertical Structure)',
    category: 'edge',
    size: 3,
    kernel: [
      -1, 0, 1,
      -1, 0, 1,
      -1, 0, 1
    ],
    normalize: false,
    bias: 128,
    description: '更温和的竖向边缘检测，适合对比 Sobel 的变化。'
  },
  {
    name: 'Prewitt Y (Horizontal Structure)',
    category: 'edge',
    size: 3,
    kernel: [
      -1, -1, -1,
      0, 0, 0,
      1, 1, 1
    ],
    normalize: false,
    bias: 128,
    description: '更温和的横向边缘检测，适合做结构分析。'
  }
];
