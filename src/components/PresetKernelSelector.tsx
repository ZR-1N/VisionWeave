import React from 'react';
import { KERNEL_PRESETS } from '../core/filters/presets';
import { PresetKernel } from '../types/image';

interface Props {
  onSelect: (preset: PresetKernel) => void;
}

export const PresetKernelSelector: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <h3 className="font-semibold text-gray-800 mb-3">Presets</h3>
      <div className="flex flex-wrap gap-2">
        {KERNEL_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onSelect(preset)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded-md text-gray-700 transition-colors border border-gray-200"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};
