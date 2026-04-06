import React from 'react';

interface Props {
  onApply: (modelType: 'zero-dce++' | 'ocr') => void;
  selectedModel: 'zero-dce++' | 'ocr';
  onModelChange: (modelType: 'zero-dce++' | 'ocr') => void;
  modelReady: {
    zeroDce: boolean;
    ocr: boolean;
  };
  isProcessing: boolean;
  active: boolean;
}

export const ModelSelector: React.FC<Props> = ({
  onApply,
  selectedModel,
  onModelChange,
  modelReady,
  isProcessing,
  active,
}) => {
  const selectedReady = selectedModel === 'ocr' ? modelReady.ocr : modelReady.zeroDce;

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border mt-4 transition-all ${active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">AI Model Engine</h3>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${selectedReady ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {selectedReady ? 'ONNX Ready' : 'Model Loading'}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Select a computer vision model to run locally.
      </p>

      <div className="space-y-3">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as 'zero-dce++' | 'ocr')}
          className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="zero-dce++">Zero-DCE++ (低光增强)</option>
          <option value="ocr">DocTR (OCR & 隐私擦除)</option>
          <option disabled>超分辨率 (开发中)</option>
          <option disabled>图像降噪 (开发中)</option>
        </select>

        <button
          onClick={() => onApply(selectedModel)}
          disabled={isProcessing || !selectedReady}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm py-2 rounded font-medium transition-colors"
        >
          {isProcessing ? '正在处理...' : `运行 ${selectedModel === 'ocr' ? 'OCR 识别' : '增强模型'}`}
        </button>
      </div>
    </div>
  );
};
