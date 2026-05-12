import React from 'react';
import { NonLinearFilterParams, NonLinearFilterType } from '../types/image';

interface Props {
  params: NonLinearFilterParams;
  onChange: (params: NonLinearFilterParams) => void;
  onApply: (params: NonLinearFilterParams) => void;
}

const filters: {
  type: NonLinearFilterType;
  name: string;
  description: string;
  defaultRadius: number;
  category: 'denoise' | 'document' | 'morphology' | 'style';
}[] = [
    {
      type: 'median',
      name: '椒盐去噪 (Median Filter)',
      description: '适合去除椒盐噪声和孤立亮点，常用于扫描预清理。',
      category: 'denoise',
      defaultRadius: 1
    },
    {
      type: 'bilateral',
      name: '保边平滑 (Bilateral Filter)',
      description: '平滑背景但尽量保留边缘，适合人像和文档底纹。',
      category: 'denoise',
      defaultRadius: 3
    },
    {
      type: 'dilation',
      name: '文字加粗 (Dilation)',
      description: '扩大亮区域，让文字或线条显得更粗。',
      category: 'morphology',
      defaultRadius: 1
    },
    {
      type: 'erosion',
      name: '细化结构 (Erosion)',
      description: '收缩亮区域，适合弱化粗线和分离粘连区域。',
      category: 'morphology',
      defaultRadius: 1
    },
    {
      type: 'opening',
      name: '去除小噪点 (Opening)',
      description: '先腐蚀再膨胀，适合去除散点和小块脏污。',
      category: 'morphology',
      defaultRadius: 1
    },
    {
      type: 'closing',
      name: '修复断裂文字 (Closing)',
      description: '先膨胀再腐蚀，适合连接断裂笔画、填补小孔。',
      category: 'morphology',
      defaultRadius: 1
    },
    {
      type: 'adaptive_threshold',
      name: '文档黑白扫描 (Adaptive Threshold)',
      description: '局部阈值二值化，适合光照不均的纸张和票据。',
      category: 'document',
      defaultRadius: 5
    },
    {
      type: 'detail_enhance',
      name: '局部清晰度增强 (Detail Enhance)',
      description: '增强局部对比度，让纹理、文字边缘更有存在感。',
      category: 'style',
      defaultRadius: 3
    }
  ];

export const NonLinearFilterSelector: React.FC<Props> = ({ params, onChange, onApply }) => {
  const categoryMeta = {
    denoise: { title: 'Filter / 去噪与平滑', accent: 'bg-sky-50 text-sky-700 border-sky-100' },
    document: { title: 'Document / 文档扫描', accent: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    morphology: { title: 'Edge & Structure / 结构修正', accent: 'bg-violet-50 text-violet-700 border-violet-100' },
    style: { title: 'Enhance / 局部增强', accent: 'bg-amber-50 text-amber-700 border-amber-100' },
  } as const;

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
      <h3 className="font-semibold text-gray-800 mb-1">非线性与结构处理</h3>
      <p className="text-xs text-gray-500 mb-3">把算法包装成功能场景，适合文档清理、边缘修复和局部增强。</p>

      <div className="space-y-3">
        {Object.entries(categoryMeta).map(([categoryKey, meta]) => {
          const categoryFilters = filters.filter((f) => f.category === categoryKey);
          return (
            <div key={categoryKey} className="rounded-lg border border-gray-200 p-3">
              <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border mb-2 ${meta.accent}`}>
                {meta.title}
              </div>
              <div className="space-y-2">
                {categoryFilters.map((f) => (
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
                          应用 {f.name}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
