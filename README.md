# VisionWeave

VisionWeave 是一个基于 WebGPU 的本地图像处理与卷积学习平台。它完全在浏览器端运行，无需后端服务器，旨在帮助开发者、学生和研究人员直观地理解和实验二维图像卷积（Convolution）操作。

## 🌟 核心特性 (Features)

*   **纯前端本地执行**: 核心图像处理计算完全基于 **WebGPU** 和 **WGSL (WebGPU Shading Language)**，利用本地 GPU 算力，速度极快且保护隐私。
*   **交互式卷积学习**: 
    *   支持自定义 `3x3`, `5x5`, `7x7` 卷积核。
    *   实时调整 `Stride`（步长）、`Padding`（填充）、`Bias`（偏置）等关键参数。
    *   一键开启 `Normalize`（归一化）、`Clip`（色彩裁剪）和 `Grayscale`（灰度化）处理。
*   **丰富的预设算子**: 内置了多种经典的图像处理卷积核，如 Gaussian Blur (高斯模糊)、Sobel (边缘检测)、Sharpen (锐化)、Emboss (浮雕) 等。
*   **模型引擎扩展 (Coming Soon)**: 架构已为未来接入轻量化端侧 AI 模型（如低光增强、超分辨率等，基于 ONNX Runtime Web）预留了接口。

## 🚀 快速开始 (Quick Start)

### 环境要求
*   现代浏览器（推荐最新版 Chrome 或 Edge），需支持并开启 WebGPU。
*   Node.js 环境 (v18+)。

### 本地运行

1. 克隆项目到本地：
   ```bash
   git clone https://github.com/ZR-1N/VisionWeave.git
   cd VisionWeave
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 在浏览器中打开 `http://localhost:5173`。

## 🛠 技术栈 (Tech Stack)

*   **UI 框架**: React + TypeScript + Vite
*   **样式方案**: Tailwind CSS
*   **图形 API**: WebGPU API
*   **Shader 语言**: WGSL
*   **图标库**: Lucide React

## 📁 核心架构 (Architecture)

项目采用了双引擎架构设计，确保传统图像处理与未来的 AI 模型推理职责分离：

*   `src/core/filters/`: **Filter Engine** - 负责使用 WebGPU 执行传统的基于算子的图像卷积处理。
*   `src/core/models/`: **Model Engine (预留)** - 预留用于未来集成轻量化机器学习模型的接口与逻辑。
*   `src/core/image/`: 统一的 `ImageTensor` 数据结构，作为不同引擎间传递图像数据的标准格式。

## 部署 (Deployment)

项目配置了 `vercel.json`，可直接一键部署到 Vercel 平台。

```bash
npm i -g vercel
vercel --prod
```

## 📄 协议 (License)

MIT License
