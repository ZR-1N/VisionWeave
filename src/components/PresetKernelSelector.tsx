import React from 'react';
import { KERNEL_PRESETS } from '../core/filters/presets';
import { PresetCategory, PresetKernel } from '../types/image';

interface Props {
  onSelect: (preset: PresetKernel) => void;
}

export const PresetKernelSelector: React.FC<Props> = ({ onSelect }) => {
  const categoryMeta: Record<PresetCategory, { title: string; accent: string }> = {
    enhance: { title: 'Enhance / 增强', accent: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    document: { title: 'Document / 文档', accent: 'bg-blue-50 text-blue-700 border-blue-100' },
    edge: { title: 'Edge / 结构', accent: 'bg-violet-50 text-violet-700 border-violet-100' },
    blur: { title: 'Blur / 柔化', accent: 'bg-amber-50 text-amber-700 border-amber-100' },
    artistic: { title: 'Artistic / 风格', accent: 'bg-rose-50 text-rose-700 border-rose-100' },
  };

  const groupedPresets = Object.entries(categoryMeta).map(([category, meta]) => ({
    category: category as PresetCategory,
    ...meta,
    presets: KERNEL_PRESETS.filter((preset) => preset.category === category),
  })).filter((group) => group.presets.length > 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <h3 className="font-semibold text-gray-800 mb-1">场景预设</h3>
      <p className="text-xs text-gray-500 mb-3">按视觉场景组织卷积核，让效果更容易理解和选择。</p>
      <div className="space-y-3">
        {groupedPresets.map((group) => (
          <div key={group.category} className="rounded-lg border border-gray-200 p-3">
            <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border mb-2 ${group.accent}`}>
              {group.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onSelect(preset)}
                  title={preset.description}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded-md text-gray-700 transition-colors border border-gray-200"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
