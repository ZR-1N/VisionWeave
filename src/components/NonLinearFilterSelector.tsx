import React from 'react';
import { NonLinearFilterParams, NonLinearFilterType } from '../types/image';

interface Props {
  params: NonLinearFilterParams;
  onChange: (params: NonLinearFilterParams) => void;
  onApply: (params: NonLinearFilterParams) => void;
}

const filters: { type: NonLinearFilterType; name: string; description: string; defaultRadius: number }[] = [
  {
    type: 'median',
    name: 'Median Filter',
    description: 'Perfect for removing salt-and-pepper noise.',
    defaultRadius: 1
  },
  {
    type: 'bilateral',
    name: 'Bilateral Filter',
    description: 'Smooths background while preserving edges.',
    defaultRadius: 3
  },
  {
    type: 'dilation',
    name: 'Dilation',
    description: 'Expands bright regions.',
    defaultRadius: 1
  },
  {
    type: 'erosion',
    name: 'Erosion',
    description: 'Expands dark regions.',
    defaultRadius: 1
  },
  {
    type: 'adaptive_threshold',
    name: 'Adaptive Threshold',
    description: 'Local binarization for uneven lighting.',
    defaultRadius: 5
  },
  {
    type: 'detail_enhance',
    name: 'Detail Enhance',
    description: 'Local contrast enhancement (Clarity).',
    defaultRadius: 3
  }
];

export const NonLinearFilterSelector: React.FC<Props> = ({ params, onChange, onApply }) => {
  const handleTypeChange = (type: NonLinearFilterType) => {
    const filter = filters.find(f => f.type === type)!;
    onChange({
      type,
      radius: filter.defaultRadius,
      sigmaS: 5.0,
      sigmaR: 25.0,
      constant: 10.0,
      amount: 1.0
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
      <h3 className="font-semibold text-gray-800 mb-3">Non-Linear Filters</h3>

      <div className="space-y-3">
        {filters.map((f) => (
          <div
            key={f.type}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${params.type === f.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            onClick={() => handleTypeChange(f.type)}
          >
            <div className="font-medium text-sm text-gray-800">{f.name}</div>
            <div className="text-xs text-gray-500 mt-1">{f.description}</div>

            {params.type === f.type && (
              <div className="mt-3 space-y-2 pt-2 border-t border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Radius</label>
                  <input
                    type="number"
                    min="1" max="10"
                    value={params.radius}
                    onChange={(e) => onChange({ ...params, radius: parseInt(e.target.value) || 1 })}
                    className="w-12 border border-gray-300 rounded p-0.5 text-xs text-center"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {f.type === 'bilateral' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">Spatial Sigma</label>
                      <input
                        type="number"
                        step="0.5"
                        value={params.sigmaS}
                        onChange={(e) => onChange({ ...params, sigmaS: parseFloat(e.target.value) || 1.0 })}
                        className="w-12 border border-gray-300 rounded p-0.5 text-xs text-center"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">Range Sigma</label>
                      <input
                        type="number"
                        step="1"
                        value={params.sigmaR}
                        onChange={(e) => onChange({ ...params, sigmaR: parseFloat(e.target.value) || 1.0 })}
                        className="w-12 border border-gray-300 rounded p-0.5 text-xs text-center"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </>
                )}

                {f.type === 'adaptive_threshold' && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600">Constant</label>
                    <input
                      type="number"
                      step="1"
                      value={params.constant}
                      onChange={(e) => onChange({ ...params, constant: parseFloat(e.target.value) || 0.0 })}
                      className="w-12 border border-gray-300 rounded p-0.5 text-xs text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {f.type === 'detail_enhance' && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600">Amount</label>
                    <input
                      type="number"
                      step="0.1"
                      value={params.amount}
                      onChange={(e) => onChange({ ...params, amount: parseFloat(e.target.value) || 0.0 })}
                      className="w-12 border border-gray-300 rounded p-0.5 text-xs text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(params);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded mt-2 font-medium"
                >
                  Apply {f.name}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
