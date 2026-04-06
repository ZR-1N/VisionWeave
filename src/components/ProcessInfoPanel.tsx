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
      <h3 className="font-semibold text-gray-800 mb-3">Process Details (Teaching Panel)</h3>

      {mode === 'convolution' && (
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-700">Kernel:</span> {params.kernelSize}x{params.kernelSize} matrix</p>
          <p><span className="font-medium text-gray-700">Stride:</span> {params.stride}</p>
          <p><span className="font-medium text-gray-700">Padding:</span> {params.padding}</p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-800 text-xs">
            <p className="font-medium mb-1">Linear Convolution:</p>
            Each pixel is a weighted sum of its neighbors. $Output = \sum (Input \times Kernel) + Bias$.
          </div>
        </div>
      )}

      {mode === 'nonlinear' && (
        <div className="text-sm text-gray-600 space-y-2">
          <p><span className="font-medium text-gray-700">Filter Type:</span> {nonLinearParams.type}</p>
          <p><span className="font-medium text-gray-700">Radius:</span> {nonLinearParams.radius} (Window size: {2 * nonLinearParams.radius + 1}x{2 * nonLinearParams.radius + 1})</p>
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded text-purple-800 text-xs">
            <p className="font-medium mb-1">Non-Linear Logic:</p>
            {nonLinearParams.type === 'median' && "Sorts neighbor pixels and picks the middle value. Great for noise removal."}
            {nonLinearParams.type === 'bilateral' && "Weights neighbors by both distance and color similarity. Preserves edges while smoothing."}
            {nonLinearParams.type === 'dilation' && "Picks the maximum value in the window. Expands bright areas."}
            {nonLinearParams.type === 'erosion' && "Picks the minimum value in the window. Expands dark areas."}
            {nonLinearParams.type === 'adaptive_threshold' && "Binarizes pixel based on local mean. Handles uneven lighting."}
            {nonLinearParams.type === 'detail_enhance' && "Amplifies the difference between pixel and local average."}
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
