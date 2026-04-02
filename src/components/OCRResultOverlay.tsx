import React, { useState } from 'react';
import { OCRResult } from '../types/image';
import { Copy, Eraser, Edit2, Check, X } from 'lucide-react';

interface Props {
  results: OCRResult[];
  imageWidth: number;
  imageHeight: number;
  onRedact: (box: [number, number, number, number]) => void;
  onUpdateText: (index: number, newText: string) => void;
}

export const OCRResultOverlay: React.FC<Props> = ({ results, imageWidth, imageHeight, onRedact, onUpdateText }) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {results.map((res, i) => {
        const [x1, y1, x2, y2] = res.box;
        const left = (x1 / imageWidth) * 100;
        const top = (y1 / imageHeight) * 100;
        const width = ((x2 - x1) / imageWidth) * 100;
        const height = ((y2 - y1) / imageHeight) * 100;

        return (
          <div 
            key={i}
            className="absolute border border-blue-400 bg-blue-400/10 group pointer-events-auto transition-all hover:bg-blue-400/30 hover:border-blue-500 hover:z-10"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
          >
            {/* Action Tooltip */}
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex items-center gap-1 bg-gray-900 text-white p-1 rounded shadow-xl whitespace-nowrap z-20">
              {editingIdx === i ? (
                <div className="flex items-center gap-1 px-1">
                  <input 
                    type="text" 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button onClick={() => { onUpdateText(i, editText); setEditingIdx(null); }} className="p-1 hover:text-green-400"><Check size={12} /></button>
                  <button onClick={() => setEditingIdx(null)} className="p-1 hover:text-red-400"><X size={12} /></button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] px-2 font-medium max-w-[150px] truncate">{res.text}</span>
                  <div className="flex border-l border-gray-700 ml-1 pl-1">
                    <button onClick={() => copyToClipboard(res.text)} className="p-1 hover:bg-white/10 rounded" title="Copy Text"><Copy size={12} /></button>
                    <button onClick={() => { setEditingIdx(i); setEditText(res.text); }} className="p-1 hover:bg-white/10 rounded" title="Edit Text"><Edit2 size={12} /></button>
                    <button onClick={() => onRedact(res.box)} className="p-1 hover:bg-red-500/20 text-red-400 rounded" title="Redact (Privacy Erase)"><Eraser size={12} /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
