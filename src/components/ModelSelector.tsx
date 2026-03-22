import React from 'react';

export const ModelSelector: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4 opacity-70">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">AI Model Engine</h3>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">Coming Soon</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Future integration for lightweight on-device ML models (ONNX Runtime Web).
      </p>
      <select disabled className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
        <option>Low-Light Enhancement (Placeholder)</option>
        <option>Super Resolution (Placeholder)</option>
        <option>Denoise (Placeholder)</option>
      </select>
    </div>
  );
};
