import React from 'react';

interface Props {
  onApply: (modelType: 'zero-dce++') => void;
  selectedModel: 'zero-dce++';
  onModelChange: (modelType: 'zero-dce++') => void;
  modelReady: {
    zeroDce: boolean;
  };
  modelLoading: {
    zeroDce: boolean;
  };
  modelInitError: {
    zeroDce: string | null;
  };
  isProcessing: boolean;
  active: boolean;
}

export const ModelSelector: React.FC<Props> = ({
  onApply,
  selectedModel,
  onModelChange,
  modelReady,
  modelLoading,
  modelInitError,
  isProcessing,
  active,
}) => {
  const selectedReady = modelReady.zeroDce;
  const selectedLoading = modelLoading.zeroDce;
  const selectedError = modelInitError.zeroDce;

  const statusClass = selectedReady
    ? 'bg-green-100 text-green-800'
    : selectedLoading
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-800';
  const statusLabel = selectedReady
    ? 'ONNX Ready'
    : selectedLoading
      ? 'Model Loading'
      : 'Model Failed';

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border mt-4 transition-all ${active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">AI Lab / 本地 AI 实验室</h3>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        运行本地图像模型。当前保留 Zero-DCE++ 低光增强，OCR 已临时下线。
      </p>

      <div className="space-y-3">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as 'zero-dce++')}
          className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="zero-dce++">Zero-DCE++ (低光增强)</option>
          <option disabled>DocTR OCR (临时下线)</option>
          <option disabled>超分辨率 (开发中)</option>
          <option disabled>图像降噪 (开发中)</option>
        </select>

        <button
          onClick={() => onApply(selectedModel)}
          disabled={isProcessing || !selectedReady}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm py-2 rounded font-medium transition-colors"
        >
          {isProcessing ? '正在处理...' : '运行增强模型'}
        </button>

        {!selectedReady && !selectedLoading && selectedError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
            {selectedError}
          </p>
        )}
      </div>
    </div>
  );
};
