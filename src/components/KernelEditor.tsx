import React from 'react';
import { KernelSize } from '../types/image';

interface Props {
  kernel: number[];
  size: KernelSize;
  onChange: (kernel: number[]) => void;
  onSizeChange: (size: KernelSize) => void;
}

export const KernelEditor: React.FC<Props> = ({ kernel, size, onChange, onSizeChange }) => {
  const handleCellChange = (index: number, value: string) => {
    const newKernel = [...kernel];
    newKernel[index] = parseFloat(value) || 0;
    onChange(newKernel);
  };

  const handleSizeChange = (newSize: KernelSize) => {
    // Initialize new kernel with Identity
    const newKernel = new Array(newSize * newSize).fill(0);
    const center = Math.floor(newSize / 2);
    newKernel[center * newSize + center] = 1;
    onSizeChange(newSize);
    onChange(newKernel);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Kernel Matrix</h3>
        <select 
          className="border border-gray-300 rounded p-1 text-sm bg-gray-50"
          value={size}
          onChange={(e) => handleSizeChange(Number(e.target.value) as KernelSize)}
        >
          <option value={3}>3x3</option>
          <option value={5}>5x5</option>
          <option value={7}>7x7</option>
        </select>
      </div>

      <div 
        className="grid gap-1 mb-4" 
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {kernel.map((val, i) => (
          <input
            key={i}
            type="number"
            value={val}
            onChange={(e) => handleCellChange(i, e.target.value)}
            className="w-full text-center border border-gray-300 rounded py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            step="any"
          />
        ))}
      </div>
      
      <button 
        onClick={() => handleSizeChange(size)}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Reset to Identity
      </button>
    </div>
  );
};
