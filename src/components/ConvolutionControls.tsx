import React from 'react';
import { ConvolutionParams } from '../types/image';

interface Props {
  params: ConvolutionParams;
  onChange: (params: ConvolutionParams) => void;
}

export const ConvolutionControls: React.FC<Props> = ({ params, onChange }) => {
  const handleChange = (field: keyof ConvolutionParams, value: ConvolutionParams[keyof ConvolutionParams]) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4 space-y-4">
      <h3 className="font-semibold text-gray-800">Parameters</h3>
      
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Stride</label>
        <input 
          type="number" 
          min="1" 
          max="5"
          value={params.stride}
          onChange={(e) => handleChange('stride', parseInt(e.target.value) || 1)}
          className="w-16 border border-gray-300 rounded p-1 text-sm text-center"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Padding</label>
        <input 
          type="number" 
          min="0" 
          max="5"
          value={params.padding}
          onChange={(e) => handleChange('padding', parseInt(e.target.value) || 0)}
          className="w-16 border border-gray-300 rounded p-1 text-sm text-center"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Bias</label>
        <input 
          type="number" 
          step="0.1"
          value={params.bias}
          onChange={(e) => handleChange('bias', parseFloat(e.target.value) || 0)}
          className="w-16 border border-gray-300 rounded p-1 text-sm text-center"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={params.normalize}
            onChange={(e) => handleChange('normalize', e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">Normalize Kernel</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={params.clip}
            onChange={(e) => handleChange('clip', e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">Clip Output (0-255)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={params.grayscale}
            onChange={(e) => handleChange('grayscale', e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">Grayscale Output</span>
        </label>
      </div>
    </div>
  );
};
