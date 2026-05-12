import React from 'react';
import { ConvolutionParams, NonLinearFilterParams } from '../types/image';

interface Props {
  params: ConvolutionParams;
  nonLinearParams: NonLinearFilterParams;
  mode: 'convolution' | 'nonlinear' | 'model';
}

export const ProcessInfoPanel: React.FC<Props> = ({ params, nonLinearParams, mode }) => {
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
          <p><span className="font-medium text-gray-700">模型:</span> DocTR (DBNet + CRNN) 或 Zero-DCE++</p>
          <p><span className="font-medium text-gray-700">任务:</span> 文字识别与分析 / 低光增强</p>

          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-indigo-800 text-xs">
            <p className="font-medium mb-1">使用说明 (OCR):</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>在下拉菜单选择 <strong>DocTR</strong>。</li>
              <li>点击 <strong>Run DocTR OCR</strong> 开始本地识别。</li>
              <li>识别完成后，鼠标<strong>悬停</strong>在图片上的蓝色框。</li>
              <li>在工具条中选择：
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>复制</strong>: 将文字存入剪贴板。</li>
                  <li><strong>修改</strong>: 修正识别错误的文字。</li>
                  <li><strong>擦除</strong>: 黑色遮盖敏感信息 (隐私脱敏)。</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-gray-600 text-[10px]">
            <p className="font-medium mb-1">深度学习原理:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong>DBNet</strong>: 像素级预测文本概率图，提取文字区域。</li>
              <li><strong>CRNN</strong>: 结合 CNN 和 LSTM，对裁剪后的文字行进行序列识别。</li>
              <li><strong>隐私安全</strong>: 所有的推理过程完全在您的本地显卡上运行，图片不会上传服务器。</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
