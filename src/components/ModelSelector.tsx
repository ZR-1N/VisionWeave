import React from 'react';

interface Props {
  onApply: (modelType: string) => void;
  isProcessing: boolean;
  active: boolean;
}

export const ModelSelector: React.FC<Props> = ({ onApply, isProcessing, active }) => {
  const [selectedModel, setSelectedModel] = React.useState("zero-dce++");

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border mt-4 transition-all ${active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">AI Model Engine</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">ONNX Ready</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Select a computer vision model to run locally.
      </p>

      <div className="space-y-3">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="zero-dce++">Zero-DCE++ (Low-Light)</option>
          <option value="ocr">DocTR (OCR & Redaction)</option>
          <option disabled>Super Resolution (Coming Soon)</option>
          <option disabled>Denoise (Coming Soon)</option>
        </select>

        <button
          onClick={() => onApply(selectedModel)}
          disabled={isProcessing}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm py-2 rounded font-medium transition-colors"
        >
          {isProcessing ? 'Inference...' : `Run ${selectedModel === 'ocr' ? 'DocTR OCR' : 'Zero-DCE++'}`}
        </button>
      </div>
    </div>
  );
};
