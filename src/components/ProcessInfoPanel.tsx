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
          <p><span className="font-medium text-gray-700">Models:</span> DocTR (DBNet + CRNN) or Zero-DCE++</p>
          <p><span className="font-medium text-gray-700">Task:</span> OCR & Text Analysis / Enhancement</p>
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-indigo-800 text-xs">
            <p className="font-medium mb-1">Deep Learning Inference:</p>
            Uses pre-trained neural networks to detect text regions and recognize characters.
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li><strong>DBNet</strong>: Detects text bounding boxes.</li>
              <li><strong>CRNN</strong>: Recognizes text inside boxes using CTC decoding.</li>
              <li><strong>Privacy</strong>: All processing happens locally on your GPU.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
