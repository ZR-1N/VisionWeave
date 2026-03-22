import React from 'react';
import { ConvolutionParams } from '../types/image';

interface Props {
  params: ConvolutionParams;
}

export const ProcessInfoPanel: React.FC<Props> = ({ params }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
      <h3 className="font-semibold text-gray-800 mb-3">Convolution Details (Teaching Panel)</h3>
      
      <div className="text-sm text-gray-600 space-y-2">
        <p>
          <span className="font-medium text-gray-700">Kernel:</span> {params.kernelSize}x{params.kernelSize} matrix
        </p>
        <p>
          <span className="font-medium text-gray-700">Movement:</span> The window slides by <strong>{params.stride}</strong> pixel(s) at a time.
        </p>
        <p>
          <span className="font-medium text-gray-700">Padding:</span> Added <strong>{params.padding}</strong> pixel(s) of empty space around the image borders.
        </p>
        <p>
          <span className="font-medium text-gray-700">Normalization:</span> {params.normalize ? 'Enabled (sum of kernel weights is scaled to 1 to preserve brightness)' : 'Disabled'}
        </p>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-800">
          <p className="font-medium mb-1">How it works:</p>
          <p className="text-xs">
            For each pixel in the output, the kernel matrix is placed over the corresponding region in the input image. 
            Corresponding values are multiplied and then summed together (Dot Product). Finally, the Bias ({params.bias}) is added.
          </p>
          <p className="text-xs mt-2 italic text-blue-600/80">
            * Animated sliding window and formula breakdowns will be available in future updates.
          </p>
        </div>
      </div>
    </div>
  );
};
