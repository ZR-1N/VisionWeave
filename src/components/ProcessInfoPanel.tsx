import React from 'react';
import { ConvolutionParams, NonLinearFilterParams } from '../types/image';
import { AIModelType } from '../core/models/modelEngine';

interface Props {
  params: ConvolutionParams;
  nonLinearParams: NonLinearFilterParams;
  mode: 'convolution' | 'nonlinear' | 'model';
  selectedModel: AIModelType;
}

export const ProcessInfoPanel: React.FC<Props> = ({ params, nonLinearParams, mode, selectedModel }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
      <h3 className="font-semibold text-gray-800 mb-3">处理说明面板</h3>

      {mode === 'convolution' && (
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-700">卷积核:</span> {params.kernelSize}x{params.kernelSize} 矩阵</p>
          <p><span className="font-medium text-gray-700">步幅:</span> {params.stride}</p>
          <p><span className="font-medium text-gray-700">Padding:</span> {params.padding}</p>
          <p><span className="font-medium text-gray-700">Bias:</span> {params.bias}</p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-800 text-xs">
            <p className="font-medium mb-1">线性卷积:</p>
            每个像素都由邻域像素的加权和决定。通过不同核权重与偏置，可以实现锐化、模糊、边缘提取和文档增强。
          </div>
        </div>
      )}

      {mode === 'nonlinear' && (
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-700">功能类型:</span> {nonLinearParams.type}</p>
          <p><span className="font-medium text-gray-700">半径:</span> {nonLinearParams.radius} (窗口: {2 * nonLinearParams.radius + 1}x{2 * nonLinearParams.radius + 1})</p>
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded text-purple-800 text-xs">
            <p className="font-medium mb-1">非线性处理逻辑:</p>
            {nonLinearParams.type === 'median' && "对邻域像素排序后取中值，特别适合去除椒盐噪点。"}
            {nonLinearParams.type === 'bilateral' && "同时考虑空间距离和颜色差异，做到平滑背景但尽量保边。"}
            {nonLinearParams.type === 'dilation' && "取邻域最大值，让亮区域和文字笔画变粗。"}
            {nonLinearParams.type === 'erosion' && "取邻域最小值，让亮区域收缩，可分离粘连结构。"}
            {nonLinearParams.type === 'opening' && "先腐蚀再膨胀，适合清掉细小脏点和孤立噪声。"}
            {nonLinearParams.type === 'closing' && "先膨胀再腐蚀，适合修复断裂文字和填补小孔洞。"}
            {nonLinearParams.type === 'adaptive_threshold' && "基于局部均值进行二值化，适合光照不均的文档扫描。"}
            {nonLinearParams.type === 'detail_enhance' && "放大像素与局部均值的差异，增强局部清晰度和纹理。"}
          </div>
        </div>
      )}

      {mode === 'model' && (
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-700">模型:</span> {selectedModel === 'animeganv2' ? 'AnimeGANv2' : 'Zero-DCE++'}</p>
          <p><span className="font-medium text-gray-700">任务:</span> {selectedModel === 'animeganv2' ? '本地动漫风格化' : '低光图像增强'}</p>

          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-indigo-800 text-xs">
            <p className="font-medium mb-1">当前 AI 功能:</p>
            {selectedModel === 'animeganv2' ? (
              <ol className="list-decimal ml-4 space-y-1">
                <li>在 AI Lab 中选择 <strong>AnimeGANv2</strong>。</li>
                <li>点击 <strong>运行动漫风格化</strong> 开始本地推理。</li>
                <li>处理完成后，可使用<strong>分屏对比</strong>观察照片与动漫化结果。</li>
                <li>当前接入的是 <strong>Shinkai</strong> 风格模型，后续可继续扩展更多风格。</li>
              </ol>
            ) : (
              <ol className="list-decimal ml-4 space-y-1">
                <li>在 AI Lab 中选择 <strong>Zero-DCE++</strong>。</li>
                <li>点击 <strong>运行增强模型</strong> 开始本地推理。</li>
                <li>处理完成后，可使用<strong>分屏对比</strong>观察增强前后的差异。</li>
                <li><strong>OCR</strong> 功能已临时下线，后续会在新模型接入后重新开放。</li>
              </ol>
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-gray-600 text-[10px]">
            <p className="font-medium mb-1">深度学习原理:</p>
            {selectedModel === 'animeganv2' ? (
              <ul className="list-disc ml-4 space-y-1">
                <li><strong>AnimeGANv2</strong>: 轻量风格迁移网络，将真实照片映射成动漫/插画风格。</li>
                <li><strong>输入输出</strong>: 模型使用归一化到 [-1, 1] 的 RGB 图像进行推理，再还原为彩色结果。</li>
                <li><strong>本地推理</strong>: 所有计算都在浏览器端完成，适合做一键动漫化和滑块对比。</li>
              </ul>
            ) : (
              <ul className="list-disc ml-4 space-y-1">
                <li><strong>Zero-DCE++</strong>: 通过轻量神经网络估计像素级增强曲线，提升暗部细节。</li>
                <li><strong>本地推理</strong>: 所有计算都在浏览器端完成，不依赖远程图像上传。</li>
                <li><strong>后续扩展</strong>: 这里会继续加入动漫风格化、人像抠图等本地 AI 模型。</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
